from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from atividades.models import AtividadeEvento, Entrega
from eventos.models import Evento, Inscricao
from grupos.models import Grupo, MembroGrupo
from identity.models import Perfil, PerfilPermissao, Permissao
from usuarios.models import Usuario


class AtividadeApiTests(APITestCase):
    def setUp(self):
        self.perfil_admin = Perfil.objects.create(nome='admin', descricao='Admin')
        self.perfil_participante = Perfil.objects.create(
            nome='participante', descricao='Participante'
        )
        permissao = Permissao.objects.create(
            nome='Gerenciar evento',
            recurso='evento',
            acao='gerenciar',
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_admin,
            id_permissao=permissao,
        )

        self.admin = Usuario.objects.create_user(
            email='admin@example.com',
            password='senha-forte-123',
            nome='Administrador',
            id_perfil=self.perfil_admin,
        )
        self.participante = Usuario.objects.create_user(
            email='participante@example.com',
            password='senha-forte-123',
            nome='Participante',
            id_perfil=self.perfil_participante,
        )

        self.evento = Evento.objects.create(
            nome='Hackathon',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=5),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        self.payload = {
            'titulo': 'Pitch inicial',
            'descricao': 'Envie o pitch',
            'formatos_aceitos': ['pdf', 'pptx'],
            'prazo': (timezone.now() + timedelta(days=3)).isoformat(),
            'ativo': True,
        }

    def test_admin_pode_criar_atividade(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('atividades:atividade-list', args=[self.evento.id_evento]),
            self.payload,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['titulo'], 'Pitch inicial')
        self.assertEqual(response.data['formatos_aceitos'], ['pdf', 'pptx'])

    def test_participante_pode_listar_mas_nao_criar(self):
        AtividadeEvento.objects.create(
            id_evento=self.evento,
            titulo='Existente',
            prazo=timezone.now() + timedelta(days=2),
            formatos_aceitos=['pdf'],
        )
        self.client.force_authenticate(self.participante)

        lista = self.client.get(
            reverse('atividades:atividade-list', args=[self.evento.id_evento])
        )
        self.assertEqual(lista.status_code, status.HTTP_200_OK)
        self.assertEqual(lista.data['count'], 1)

        criar = self.client.post(
            reverse('atividades:atividade-list', args=[self.evento.id_evento]),
            self.payload,
            format='json',
        )
        self.assertEqual(criar.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_pode_atualizar_e_excluir(self):
        atividade = AtividadeEvento.objects.create(
            id_evento=self.evento,
            titulo='Temp',
            prazo=timezone.now() + timedelta(days=2),
            formatos_aceitos=['zip'],
        )
        self.client.force_authenticate(self.admin)

        patch = self.client.patch(
            reverse('atividades:atividade-detail', args=[atividade.id_atividade]),
            {'titulo': 'Atualizado', 'ativo': False},
            format='json',
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data['titulo'], 'Atualizado')
        self.assertFalse(patch.data['ativo'])

        delete = self.client.delete(
            reverse('atividades:atividade-detail', args=[atividade.id_atividade])
        )
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            AtividadeEvento.objects.filter(pk=atividade.id_atividade).exists()
        )


class EntregaApiTests(APITestCase):
    def setUp(self):
        self.perfil_participante = Perfil.objects.create(
            nome='participante', descricao='Participante'
        )
        self.perfil_avaliador = Perfil.objects.create(
            nome='avaliador', descricao='Avaliador'
        )
        self.perfil_admin = Perfil.objects.create(nome='admin', descricao='Admin')

        perm_submeter = Permissao.objects.create(
            nome='Submeter entrega', recurso='entrega', acao='submeter'
        )
        perm_avaliar = Permissao.objects.create(
            nome='Avaliar entrega', recurso='entrega', acao='avaliar'
        )
        perm_evento = Permissao.objects.create(
            nome='Gerenciar evento', recurso='evento', acao='gerenciar'
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_participante, id_permissao=perm_submeter
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_avaliador, id_permissao=perm_avaliar
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_admin, id_permissao=perm_evento
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_admin, id_permissao=perm_avaliar
        )

        self.participante = Usuario.objects.create_user(
            email='p@example.com',
            password='senha-forte-123',
            nome='Participante',
            id_perfil=self.perfil_participante,
        )
        self.outro = Usuario.objects.create_user(
            email='outro@example.com',
            password='senha-forte-123',
            nome='Outro',
            id_perfil=self.perfil_participante,
        )
        self.avaliador = Usuario.objects.create_user(
            email='av@example.com',
            password='senha-forte-123',
            nome='Avaliador',
            id_perfil=self.perfil_avaliador,
        )
        self.admin = Usuario.objects.create_user(
            email='admin2@example.com',
            password='senha-forte-123',
            nome='Admin',
            id_perfil=self.perfil_admin,
        )

        self.evento = Evento.objects.create(
            nome='Evento Entregas',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=10),
            status=Evento.Status.EM_ANDAMENTO,
        )
        self.insc_p = Inscricao.objects.create(
            id_usuario=self.participante,
            id_evento=self.evento,
            status=Inscricao.Status.APROVADA,
        )
        self.insc_av = Inscricao.objects.create(
            id_usuario=self.avaliador,
            id_evento=self.evento,
            status=Inscricao.Status.APROVADA,
        )
        Inscricao.objects.create(
            id_usuario=self.outro,
            id_evento=self.evento,
            status=Inscricao.Status.APROVADA,
        )

        self.grupo = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_p,
            nome='Time Alpha',
            codigo='ALP01',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=self.grupo,
            id_inscricao=self.insc_p,
            is_lider=True,
        )

        self.atividade = AtividadeEvento.objects.create(
            id_evento=self.evento,
            titulo='Entrega 1',
            descricao='Link do protótipo',
            formatos_aceitos=['link'],
            prazo=timezone.now() + timedelta(days=5),
            ativo=True,
        )

    def test_membro_envia_entrega(self):
        self.client.force_authenticate(self.participante)
        response = self.client.post(
            reverse('atividades:entrega-create'),
            {
                'id_atividade': str(self.atividade.id_atividade),
                'id_grupo': str(self.grupo.id_grupo),
                'url_arquivo': 'https://github.com/demo/repo',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Entrega.Status.ENVIADA)
        self.assertEqual(str(response.data['enviado_por']), str(self.insc_p.id_inscricao))

    def test_nao_membro_nao_envia(self):
        self.client.force_authenticate(self.outro)
        response = self.client.post(
            reverse('atividades:entrega-create'),
            {
                'id_atividade': str(self.atividade.id_atividade),
                'id_grupo': str(self.grupo.id_grupo),
                'url_arquivo': 'https://example.com',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_segunda_entrega_rejeitada(self):
        Entrega.objects.create(
            id_atividade=self.atividade,
            id_grupo=self.grupo,
            enviado_por=self.insc_p,
            url_arquivo='https://first.com',
        )
        self.client.force_authenticate(self.participante)
        response = self.client.post(
            reverse('atividades:entrega-create'),
            {
                'id_atividade': str(self.atividade.id_atividade),
                'id_grupo': str(self.grupo.id_grupo),
                'url_arquivo': 'https://second.com',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_listar_entregas_do_grupo(self):
        Entrega.objects.create(
            id_atividade=self.atividade,
            id_grupo=self.grupo,
            enviado_por=self.insc_p,
            url_arquivo='https://first.com',
        )
        self.client.force_authenticate(self.participante)
        response = self.client.get(
            reverse('atividades:grupo-entregas', args=[self.grupo.id_grupo])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_correcao_404_sem_nota(self):
        entrega = Entrega.objects.create(
            id_atividade=self.atividade,
            id_grupo=self.grupo,
            enviado_por=self.insc_p,
            url_arquivo='https://first.com',
        )
        self.client.force_authenticate(self.participante)
        response = self.client.get(
            reverse('atividades:entrega-correcao', args=[entrega.id_entrega])
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_avaliador_inscrito_corrige(self):
        entrega = Entrega.objects.create(
            id_atividade=self.atividade,
            id_grupo=self.grupo,
            enviado_por=self.insc_p,
            url_arquivo='https://first.com',
        )
        self.client.force_authenticate(self.avaliador)
        response = self.client.post(
            reverse('atividades:entrega-correcao', args=[entrega.id_entrega]),
            {'nota': '8.50', 'feedback': 'Bom trabalho'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nota'], '8.50')
        entrega.refresh_from_db()
        self.assertEqual(entrega.status, Entrega.Status.CORRIGIDA)

        get_resp = self.client.get(
            reverse('atividades:entrega-correcao', args=[entrega.id_entrega])
        )
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)

    def test_avaliador_sem_inscricao_nao_corrige(self):
        av_sem_insc = Usuario.objects.create_user(
            email='av2@example.com',
            password='senha-forte-123',
            nome='Av Sem Insc',
            id_perfil=self.perfil_avaliador,
        )
        entrega = Entrega.objects.create(
            id_atividade=self.atividade,
            id_grupo=self.grupo,
            enviado_por=self.insc_p,
            url_arquivo='https://first.com',
        )
        self.client.force_authenticate(av_sem_insc)
        response = self.client.post(
            reverse('atividades:entrega-correcao', args=[entrega.id_entrega]),
            {'nota': '7.00', 'feedback': 'ok'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
