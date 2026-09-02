from django.test import TestCase

from identity.models import Perfil, PerfilPermissao, Permissao
from identity.permissions import usuario_tem_permissao
from identity.services import obter_perfil_participante
from usuarios.models import Usuario


class IdentitySmokeTests(TestCase):
    def setUp(self):
        self.perfil_admin = Perfil.objects.create(nome='admin', descricao='Admin')
        self.perfil_participante = Perfil.objects.create(
            nome='participante', descricao='Participante'
        )
        self.perm_evento = Permissao.objects.create(
            nome='Gerenciar evento',
            recurso='evento',
            acao='gerenciar',
        )
        self.perm_usuario = Permissao.objects.create(
            nome='Gerenciar usuários',
            recurso='usuario',
            acao='gerenciar',
        )
        self.perm_grupo = Permissao.objects.create(
            nome='Criar grupo',
            recurso='grupo',
            acao='criar',
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_admin, id_permissao=self.perm_evento
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_admin, id_permissao=self.perm_usuario
        )
        PerfilPermissao.objects.create(
            id_perfil=self.perfil_participante, id_permissao=self.perm_grupo
        )

        self.admin = Usuario.objects.create_user(
            email='admin@test.com',
            password='senha-forte-123',
            nome='Admin',
            id_perfil=self.perfil_admin,
        )
        self.participante = Usuario.objects.create_user(
            email='part@test.com',
            password='senha-forte-123',
            nome='Participante',
            id_perfil=self.perfil_participante,
        )

    def test_obter_perfil_participante(self):
        perfil = obter_perfil_participante()
        self.assertEqual(perfil.nome, 'participante')

    def test_admin_tem_permissao_evento_e_usuario(self):
        self.assertTrue(usuario_tem_permissao(self.admin, 'evento', 'gerenciar'))
        self.assertTrue(usuario_tem_permissao(self.admin, 'usuario', 'gerenciar'))
        self.assertFalse(usuario_tem_permissao(self.admin, 'grupo', 'criar'))

    def test_participante_tem_permissao_grupo(self):
        self.assertTrue(usuario_tem_permissao(self.participante, 'grupo', 'criar'))
        self.assertFalse(usuario_tem_permissao(self.participante, 'evento', 'gerenciar'))

    def test_usuario_sem_perfil_nao_tem_permissao(self):
        user = Usuario.objects.create_user(
            email='semperfil@test.com',
            password='senha-forte-123',
            nome='Sem Perfil',
        )
        self.assertFalse(usuario_tem_permissao(user, 'evento', 'gerenciar'))

    def test_unique_recurso_acao_permissao(self):
        with self.assertRaises(Exception):
            Permissao.objects.create(
                nome='Duplicada',
                recurso='evento',
                acao='gerenciar',
            )
