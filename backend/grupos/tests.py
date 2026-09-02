from datetime import timedelta

from django.db import IntegrityError, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from eventos.models import Evento, Inscricao
from grupos.models import Grupo, MembroGrupo, SolicitacaoEntrada
from mural.models import PostagemMural
from usuarios.models import Usuario


class ConstraintsSmokeTests(APITestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            email='u@test.com',
            password='senha-forte-123',
            nome='User',
        )
        self.evento = Evento.objects.create(
            nome='Evento Constraints',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=3),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        self.inscricao = Inscricao.objects.create(
            id_usuario=self.user,
            id_evento=self.evento,
            status=Inscricao.Status.APROVADA,
        )
        self.grupo_a = Grupo.objects.create(
            id_evento=self.evento,
            nome='Alpha',
            codigo='ALP01',
            max_membros=4,
            origem=Grupo.Origem.MANUAL,
        )
        self.grupo_b = Grupo.objects.create(
            id_evento=self.evento,
            nome='Beta',
            codigo='BET01',
            max_membros=4,
            origem=Grupo.Origem.MANUAL,
        )

    def test_membro_unica_inscricao(self):
        MembroGrupo.objects.create(
            id_grupo=self.grupo_a,
            id_inscricao=self.inscricao,
            is_lider=True,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MembroGrupo.objects.create(
                    id_grupo=self.grupo_b,
                    id_inscricao=self.inscricao,
                    is_lider=False,
                )

    def test_grupo_nome_unico_por_evento(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Grupo.objects.create(
                    id_evento=self.evento,
                    nome='Alpha',
                    codigo='ALP02',
                    max_membros=3,
                )

    def test_solicitacao_unica_grupo_inscricao(self):
        SolicitacaoEntrada.objects.create(
            id_grupo=self.grupo_a,
            id_inscricao=self.inscricao,
            status=SolicitacaoEntrada.Status.PENDENTE,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SolicitacaoEntrada.objects.create(
                    id_grupo=self.grupo_a,
                    id_inscricao=self.inscricao,
                    status=SolicitacaoEntrada.Status.PENDENTE,
                )

    def test_mural_defaults_choices(self):
        post = PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.inscricao,
            titulo='Olá',
            conteudo='Bem-vindos',
        )
        self.assertEqual(post.status, PostagemMural.Status.PUBLICADA)
        self.assertEqual(post.area, PostagemMural.Area.GERAL)


class GrupoApiTests(APITestCase):
    def setUp(self):
        self.lider = Usuario.objects.create_user(
            email='lider@test.com',
            password='senha-forte-123',
            nome='Líder',
        )
        self.membro = Usuario.objects.create_user(
            email='membro@test.com',
            password='senha-forte-123',
            nome='Membro',
        )
        self.outro = Usuario.objects.create_user(
            email='outro@test.com',
            password='senha-forte-123',
            nome='Outro',
        )
        self.evento = Evento.objects.create(
            nome='Hackathon Grupos',
            data_inicio=timezone.now() + timedelta(days=5),
            data_fim=timezone.now() + timedelta(days=7),
            prazo_formacao_grupo=timezone.now() + timedelta(days=3),
            status=Evento.Status.INSCRICOES_ABERTAS,
        )
        self.insc_lider = Inscricao.objects.create(
            id_usuario=self.lider,
            id_evento=self.evento,
            status=Inscricao.Status.APROVADA,
        )
        self.insc_membro = Inscricao.objects.create(
            id_usuario=self.membro,
            id_evento=self.evento,
            status=Inscricao.Status.APROVADA,
        )
        Inscricao.objects.create(
            id_usuario=self.outro,
            id_evento=self.evento,
            status=Inscricao.Status.PENDENTE,
        )

    def test_criar_grupo_com_inscricao_aprovada(self):
        self.client.force_authenticate(self.lider)
        response = self.client.post(
            reverse('grupos:grupo-list'),
            {
                'id_evento': str(self.evento.id_evento),
                'nome': 'Time Verde',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nome'], 'Time Verde')
        self.assertEqual(response.data['max_membros'], self.evento.max_membros_grupo)
        self.assertTrue(response.data['codigo'])
        self.assertEqual(len(response.data['membros']), 1)
        self.assertTrue(response.data['membros'][0]['is_lider'])

    def test_pendente_nao_cria_grupo(self):
        self.client.force_authenticate(self.outro)
        response = self.client.post(
            reverse('grupos:grupo-list'),
            {
                'id_evento': str(self.evento.id_evento),
                'nome': 'Sem Aprovação',
                'max_membros': 3,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_solicitar_e_aprovar_entrada(self):
        grupo = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_lider,
            nome='Time Azul',
            codigo='AZU01',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=grupo,
            id_inscricao=self.insc_lider,
            is_lider=True,
        )

        self.client.force_authenticate(self.membro)
        solicitacao = self.client.post(
            reverse('grupos:solicitacao-create'),
            {'id_grupo': str(grupo.id_grupo)},
            format='json',
        )
        self.assertEqual(solicitacao.status_code, status.HTTP_201_CREATED)
        id_solicitacao = solicitacao.data['id']

        self.client.force_authenticate(self.lider)
        aprovar = self.client.patch(
            reverse('grupos:solicitacao-aprovar', args=[id_solicitacao]),
            {'status': SolicitacaoEntrada.Status.APROVADA},
            format='json',
        )
        self.assertEqual(aprovar.status_code, status.HTTP_200_OK)
        self.assertEqual(aprovar.data['status'], SolicitacaoEntrada.Status.APROVADA)
        self.assertTrue(
            MembroGrupo.objects.filter(
                id_grupo=grupo, id_inscricao=self.insc_membro
            ).exists()
        )

    def test_lider_pode_recusar_solicitacao(self):
        grupo = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_lider,
            nome='Time Vermelho',
            codigo='VER01',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=grupo,
            id_inscricao=self.insc_lider,
            is_lider=True,
        )
        solicitacao = SolicitacaoEntrada.objects.create(
            id_grupo=grupo,
            id_inscricao=self.insc_membro,
            status=SolicitacaoEntrada.Status.PENDENTE,
        )

        self.client.force_authenticate(self.lider)
        response = self.client.patch(
            reverse('grupos:solicitacao-aprovar', args=[solicitacao.id]),
            {'status': SolicitacaoEntrada.Status.RECUSADA},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], SolicitacaoEntrada.Status.RECUSADA)
        self.assertFalse(
            MembroGrupo.objects.filter(id_inscricao=self.insc_membro).exists()
        )

    def test_nao_lider_nao_lista_solicitacoes(self):
        grupo = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_lider,
            nome='Time Amarelo',
            codigo='AMA01',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=grupo,
            id_inscricao=self.insc_lider,
            is_lider=True,
        )
        self.client.force_authenticate(self.membro)
        response = self.client.get(
            reverse('grupos:solicitacao-list', args=[grupo.id_grupo])
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_listar_grupos_inclui_membros_count(self):
        grupo = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_lider,
            nome='Com contagem',
            codigo='CNT01',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=grupo,
            id_inscricao=self.insc_lider,
            is_lider=True,
        )

        self.client.force_authenticate(self.membro)
        response = self.client.get(
            reverse('grupos:grupo-list'),
            {'evento': str(self.evento.id_evento)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['membros_count'], 1)
        self.assertNotIn('membros', response.data[0])

    def test_admin_listar_grupos_inclui_membros(self):
        from identity.models import Perfil, PerfilPermissao, Permissao

        perfil_admin = Perfil.objects.create(nome='admin', descricao='Admin')
        perm = Permissao.objects.create(
            nome='Gerenciar evento',
            recurso='evento',
            acao='gerenciar',
        )
        PerfilPermissao.objects.create(id_perfil=perfil_admin, id_permissao=perm)
        admin = Usuario.objects.create_user(
            email='admin@test.com',
            password='senha-forte-123',
            nome='Admin',
            id_perfil=perfil_admin,
        )

        grupo = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_lider,
            nome='Com membros',
            codigo='ADM01',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=grupo,
            id_inscricao=self.insc_lider,
            is_lider=True,
        )

        self.client.force_authenticate(admin)
        response = self.client.get(
            reverse('grupos:grupo-list'),
            {'evento': str(self.evento.id_evento)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertIn('membros', response.data[0])
        self.assertEqual(len(response.data[0]['membros']), 1)
        self.assertTrue(response.data[0]['membros'][0]['is_lider'])

    def test_meu_grupo_retorna_detalhe_com_membros(self):
        grupo = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_lider,
            nome='Meu Time',
            codigo='MEU01',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=grupo,
            id_inscricao=self.insc_lider,
            is_lider=True,
        )

        self.client.force_authenticate(self.lider)
        response = self.client.get(
            reverse('grupos:grupo-meu'),
            {'evento': str(self.evento.id_evento)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nome'], 'Meu Time')
        self.assertEqual(response.data['membros_count'], 1)
        self.assertEqual(response.data['membros'][0]['nome'], 'Líder')
        self.assertTrue(response.data['membros'][0]['is_lider'])

    def test_meu_grupo_null_sem_grupo(self):
        self.client.force_authenticate(self.membro)
        response = self.client.get(
            reverse('grupos:grupo-meu'),
            {'evento': str(self.evento.id_evento)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data)

    def test_aprovar_cancela_outras_solicitacoes_pendentes(self):
        g1 = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_lider,
            nome='G1',
            codigo='G1001',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=g1, id_inscricao=self.insc_lider, is_lider=True
        )

        lider2 = Usuario.objects.create_user(
            email='lider2@test.com',
            password='senha-forte-123',
            nome='Líder 2',
            id_perfil=self.lider.id_perfil,
        )
        insc_lider2 = Inscricao.objects.create(
            id_usuario=lider2,
            id_evento=self.evento,
            status=Inscricao.Status.APROVADA,
        )
        g2 = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=insc_lider2,
            nome='G2',
            codigo='G2001',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=g2, id_inscricao=insc_lider2, is_lider=True
        )

        s1 = SolicitacaoEntrada.objects.create(
            id_grupo=g1,
            id_inscricao=self.insc_membro,
            status=SolicitacaoEntrada.Status.PENDENTE,
        )
        s2 = SolicitacaoEntrada.objects.create(
            id_grupo=g2,
            id_inscricao=self.insc_membro,
            status=SolicitacaoEntrada.Status.PENDENTE,
        )

        self.client.force_authenticate(self.lider)
        response = self.client.patch(
            reverse('grupos:solicitacao-aprovar', args=[s1.id]),
            {'status': SolicitacaoEntrada.Status.APROVADA},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(SolicitacaoEntrada.objects.filter(pk=s2.pk).exists())
        self.assertTrue(
            MembroGrupo.objects.filter(
                id_grupo=g1, id_inscricao=self.insc_membro
            ).exists()
        )

    def test_sair_unico_membro_exclui_grupo(self):
        grupo = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_lider,
            nome='Solo',
            codigo='SOL01',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=grupo, id_inscricao=self.insc_lider, is_lider=True
        )
        self.client.force_authenticate(self.lider)
        response = self.client.post(reverse('grupos:grupo-sair', args=[grupo.id_grupo]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['acao'], 'grupo_excluido')
        self.assertFalse(Grupo.objects.filter(pk=grupo.id_grupo).exists())

    def test_lider_precisa_indicar_novo_lider_para_sair(self):
        grupo = Grupo.objects.create(
            id_evento=self.evento,
            id_lider=self.insc_lider,
            nome='Dupla',
            codigo='DUP01',
            max_membros=4,
        )
        MembroGrupo.objects.create(
            id_grupo=grupo, id_inscricao=self.insc_lider, is_lider=True
        )
        MembroGrupo.objects.create(
            id_grupo=grupo, id_inscricao=self.insc_membro, is_lider=False
        )
        self.client.force_authenticate(self.lider)
        sem_lider = self.client.post(reverse('grupos:grupo-sair', args=[grupo.id_grupo]))
        self.assertEqual(sem_lider.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(sem_lider.data['code'], 'novo_lider_obrigatorio')

        com_lider = self.client.post(
            reverse('grupos:grupo-sair', args=[grupo.id_grupo]),
            {'id_novo_lider': str(self.insc_membro.id_inscricao)},
            format='json',
        )
        self.assertEqual(com_lider.status_code, status.HTTP_200_OK)
        grupo.refresh_from_db()
        self.assertEqual(grupo.id_lider_id, self.insc_membro.id_inscricao)
        self.assertFalse(
            MembroGrupo.objects.filter(id_inscricao=self.insc_lider).exists()
        )
        self.assertTrue(
            MembroGrupo.objects.get(id_inscricao=self.insc_membro).is_lider
        )
