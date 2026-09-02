from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from eventos.models import Evento, Inscricao
from identity.models import Perfil, PerfilPermissao, Permissao
from usuarios.models import Usuario


class EventoApiTests(APITestCase):
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

        inicio = timezone.now() + timedelta(days=10)
        self.payload = {
            'nome': 'Hackathon Sustentável',
            'descricao': 'Soluções para sustentabilidade.',
            'link_whatsapp_geral': '',
            'data_inicio': inicio.isoformat(),
            'data_fim': (inicio + timedelta(days=2)).isoformat(),
            'prazo_formacao_grupo': (inicio - timedelta(days=2)).isoformat(),
            'status': Evento.Status.PLANEJADO,
        }

    def test_admin_pode_criar_evento(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(reverse('eventos:evento-list'), self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nome'], self.payload['nome'])

    def test_participante_nao_pode_criar_evento(self):
        self.client.force_authenticate(self.participante)
        response = self.client.post(reverse('eventos:evento-list'), self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_participante_pode_listar_eventos(self):
        Evento.objects.create(
            nome='Evento público',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        self.client.force_authenticate(self.participante)
        response = self.client.get(reverse('eventos:evento-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_data_fim_deve_ser_posterior(self):
        self.client.force_authenticate(self.admin)
        inicio = timezone.now() + timedelta(days=5)
        payload = {
            **self.payload,
            'data_inicio': inicio.isoformat(),
            'data_fim': (inicio - timedelta(days=1)).isoformat(),
        }
        response = self.client.post(reverse('eventos:evento-list'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('data_fim', response.data)

    def test_participante_pode_se_inscrever(self):
        evento = Evento.objects.create(
            nome='Com inscrições',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        self.client.force_authenticate(self.participante)
        response = self.client.post(
            reverse('eventos:inscricao-create'),
            {'id_evento': str(evento.id_evento)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Inscricao.Status.PENDENTE)

        minhas = self.client.get(reverse('eventos:inscricao-minhas'))
        self.assertEqual(minhas.status_code, status.HTTP_200_OK)
        self.assertEqual(minhas.data['count'], 1)

    def test_nao_inscreve_se_evento_fechado(self):
        evento = Evento.objects.create(
            nome='Fechado',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.PLANEJADO,
        )
        self.client.force_authenticate(self.participante)
        response = self.client.post(
            reverse('eventos:inscricao-create'),
            {'id_evento': str(evento.id_evento)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_pode_aprovar_inscricao(self):
        evento = Evento.objects.create(
            nome='Aprovar',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        inscricao = Inscricao.objects.create(
            id_usuario=self.participante,
            id_evento=evento,
            status=Inscricao.Status.PENDENTE,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            reverse('eventos:inscricao-aprovar', args=[inscricao.id_inscricao]),
            {'status': Inscricao.Status.APROVADA},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inscricao.refresh_from_db()
        self.assertEqual(inscricao.status, Inscricao.Status.APROVADA)
        self.assertEqual(inscricao.aprovado_por, self.admin)

    def test_admin_pode_excluir_evento(self):
        self.client.force_authenticate(self.admin)
        create = self.client.post(
            reverse('eventos:evento-list'), self.payload, format='json'
        )
        id_evento = create.data['id_evento']
        delete = self.client.delete(
            reverse('eventos:evento-detail', args=[id_evento])
        )
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Evento.objects.filter(pk=id_evento).exists())

    def test_admin_lista_inscricoes_do_evento(self):
        evento = Evento.objects.create(
            nome='Com inscritos',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        Inscricao.objects.create(
            id_usuario=self.participante,
            id_evento=evento,
            status=Inscricao.Status.PENDENTE,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(
            reverse('eventos:evento-inscricoes', args=[evento.id_evento])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_participante_nao_lista_inscricoes_do_evento(self):
        evento = Evento.objects.create(
            nome='Privado',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        self.client.force_authenticate(self.participante)
        response = self.client.get(
            reverse('eventos:evento-inscricoes', args=[evento.id_evento])
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_participante_aprovado_lista_participantes(self):
        evento = Evento.objects.create(
            nome='Com participantes',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        Inscricao.objects.create(
            id_usuario=self.participante,
            id_evento=evento,
            status=Inscricao.Status.APROVADA,
        )
        outro = Usuario.objects.create_user(
            email='outro@example.com',
            password='senha-forte-123',
            nome='Outro Participante',
            id_perfil=self.perfil_participante,
        )
        Inscricao.objects.create(
            id_usuario=outro,
            id_evento=evento,
            status=Inscricao.Status.APROVADA,
        )

        self.client.force_authenticate(self.participante)
        response = self.client.get(
            reverse('eventos:evento-participantes', args=[evento.id_evento])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        nomes = {item['nome'] for item in response.data}
        self.assertIn('Participante', nomes)
        self.assertIn('Outro Participante', nomes)

    def test_participante_sem_inscricao_nao_lista_participantes(self):
        evento = Evento.objects.create(
            nome='Fechado para visitantes',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        self.client.force_authenticate(self.participante)
        response = self.client.get(
            reverse('eventos:evento-participantes', args=[evento.id_evento])
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_participante_cancela_inscricao_com_inscricoes_abertas(self):
        evento = Evento.objects.create(
            nome='Cancelável',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        inscricao = Inscricao.objects.create(
            id_usuario=self.participante,
            id_evento=evento,
            status=Inscricao.Status.APROVADA,
        )
        self.client.force_authenticate(self.participante)
        response = self.client.delete(
            reverse('eventos:inscricao-cancelar', args=[inscricao.id_inscricao])
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Inscricao.objects.filter(id_inscricao=inscricao.id_inscricao).exists()
        )

    def test_nao_cancela_se_evento_em_andamento(self):
        evento = Evento.objects.create(
            nome='Já começou',
            data_inicio=timezone.now() - timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=2),
            status=Evento.Status.EM_ANDAMENTO,
        )
        inscricao = Inscricao.objects.create(
            id_usuario=self.participante,
            id_evento=evento,
            status=Inscricao.Status.APROVADA,
        )
        self.client.force_authenticate(self.participante)
        response = self.client.delete(
            reverse('eventos:inscricao-cancelar', args=[inscricao.id_inscricao])
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            Inscricao.objects.filter(id_inscricao=inscricao.id_inscricao).exists()
        )
