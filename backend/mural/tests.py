from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from eventos.models import Evento, Inscricao
from identity.models import Perfil, PerfilPermissao, Permissao
from mural.models import PostagemMural, RespostaMural
from usuarios.models import Usuario


class MuralApiTests(APITestCase):
    def setUp(self):
        self.perfil_participante = Perfil.objects.create(
            nome='participante', descricao='Participante'
        )
        self.perfil_admin = Perfil.objects.create(nome='admin', descricao='Admin')

        perm_publicar = Permissao.objects.create(
            nome='Publicar no mural', recurso='mural', acao='publicar'
        )
        perm_responder = Permissao.objects.create(
            nome='Responder no mural', recurso='mural', acao='responder'
        )
        perm_evento = Permissao.objects.create(
            nome='Gerenciar evento', recurso='evento', acao='gerenciar'
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_participante, id_permissao=perm_publicar
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_participante, id_permissao=perm_responder
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_admin, id_permissao=perm_evento
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_admin, id_permissao=perm_publicar
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_admin, id_permissao=perm_responder
        )

        self.autor = Usuario.objects.create_user(
            email='autor@example.com',
            password='senha-forte-123',
            nome='Autor',
            id_perfil=self.perfil_participante,
        )
        self.outro = Usuario.objects.create_user(
            email='outro@example.com',
            password='senha-forte-123',
            nome='Outro',
            id_perfil=self.perfil_participante,
        )
        self.admin = Usuario.objects.create_user(
            email='admin@example.com',
            password='senha-forte-123',
            nome='Admin',
            id_perfil=self.perfil_admin,
        )
        self.sem_inscricao = Usuario.objects.create_user(
            email='sem@example.com',
            password='senha-forte-123',
            nome='Sem Inscrição',
            id_perfil=self.perfil_participante,
        )

        self.evento = Evento.objects.create(
            nome='Evento Mural',
            data_inicio=timezone.now() + timedelta(days=1),
            data_fim=timezone.now() + timedelta(days=5),
            status=Evento.Status.EM_ANDAMENTO,
        )
        self.insc_autor = Inscricao.objects.create(
            id_usuario=self.autor,
            id_evento=self.evento,
            status=Inscricao.Status.APROVADA,
        )
        self.insc_outro = Inscricao.objects.create(
            id_usuario=self.outro,
            id_evento=self.evento,
            status=Inscricao.Status.APROVADA,
        )

    def test_criar_postagem_com_inscricao_aprovada(self):
        self.client.force_authenticate(self.autor)
        response = self.client.post(
            reverse('mural:mural-list', args=[self.evento.id_evento]),
            {
                'titulo': 'Dúvida sobre o desafio',
                'conteudo': 'Como funciona a entrega?',
                'area': PostagemMural.Area.DUVIDAS,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['titulo'], 'Dúvida sobre o desafio')
        self.assertEqual(response.data['autor_nome'], 'Autor')
        self.assertEqual(response.data['status'], PostagemMural.Status.PUBLICADA)

    def test_listar_mural(self):
        PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.insc_autor,
            titulo='Anúncio',
            conteudo='Bem-vindos',
            status=PostagemMural.Status.PUBLICADA,
        )
        PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.insc_autor,
            titulo='Oculta',
            conteudo='Não deve aparecer',
            status=PostagemMural.Status.OCULTA,
        )

        self.client.force_authenticate(self.outro)
        response = self.client.get(
            reverse('mural:mural-list', args=[self.evento.id_evento])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['titulo'], 'Anúncio')

    def test_responder_postagem(self):
        postagem = PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.insc_autor,
            titulo='Pergunta',
            conteudo='Alguém sabe?',
        )
        self.client.force_authenticate(self.outro)
        response = self.client.post(
            reverse('mural:mural-resposta-create', args=[postagem.id_postagem]),
            {'conteudo': 'Eu sei!'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['conteudo'], 'Eu sei!')
        self.assertEqual(response.data['autor_nome'], 'Outro')

    def test_autor_pode_patch_e_delete(self):
        postagem = PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.insc_autor,
            titulo='Original',
            conteudo='Texto original',
        )
        self.client.force_authenticate(self.autor)

        patch = self.client.patch(
            reverse('mural:mural-detail', args=[postagem.id_postagem]),
            {'titulo': 'Atualizado', 'conteudo': 'Novo texto'},
            format='json',
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data['titulo'], 'Atualizado')

        delete = self.client.delete(
            reverse('mural:mural-detail', args=[postagem.id_postagem])
        )
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            PostagemMural.objects.filter(pk=postagem.id_postagem).exists()
        )

    def test_nao_autor_nao_edita(self):
        postagem = PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.insc_autor,
            titulo='Protegida',
            conteudo='Conteúdo',
        )
        self.client.force_authenticate(self.outro)
        response = self.client.patch(
            reverse('mural:mural-detail', args=[postagem.id_postagem]),
            {'titulo': 'Tentativa'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_listar_mural_filtra_por_area(self):
        PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.insc_autor,
            titulo='Geral',
            conteudo='Oi',
            area=PostagemMural.Area.GERAL,
            status=PostagemMural.Status.PUBLICADA,
        )
        PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.insc_autor,
            titulo='Dúvida',
            conteudo='Ajuda',
            area=PostagemMural.Area.DUVIDAS,
            status=PostagemMural.Status.PUBLICADA,
        )

        self.client.force_authenticate(self.outro)
        response = self.client.get(
            reverse('mural:mural-list', args=[self.evento.id_evento]),
            {'area': PostagemMural.Area.DUVIDAS},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['titulo'], 'Dúvida')

    def test_admin_pode_alterar_status_oculta_ou_arquivada(self):
        postagem = PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.insc_autor,
            titulo='Moderação',
            conteudo='Conteúdo sensível',
        )
        self.client.force_authenticate(self.admin)

        oculta = self.client.patch(
            reverse('mural:mural-detail', args=[postagem.id_postagem]),
            {'status': PostagemMural.Status.OCULTA},
            format='json',
        )
        self.assertEqual(oculta.status_code, status.HTTP_200_OK)
        self.assertEqual(oculta.data['status'], PostagemMural.Status.OCULTA)

        arquivada = self.client.patch(
            reverse('mural:mural-detail', args=[postagem.id_postagem]),
            {'status': PostagemMural.Status.ARQUIVADA},
            format='json',
        )
        self.assertEqual(arquivada.status_code, status.HTTP_200_OK)
        self.assertEqual(arquivada.data['status'], PostagemMural.Status.ARQUIVADA)

    def test_autor_exclui_propria_resposta(self):
        postagem = PostagemMural.objects.create(
            id_evento=self.evento,
            id_autor=self.insc_autor,
            titulo='Thread',
            conteudo='Discussão',
        )
        resposta = RespostaMural.objects.create(
            id_postagem=postagem,
            id_autor=self.insc_outro,
            conteudo='Minha resposta',
        )
        self.client.force_authenticate(self.outro)
        response = self.client.delete(
            reverse('mural:mural-resposta-delete', args=[resposta.id_resposta])
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
