from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from identity.models import Perfil, PerfilPermissao, Permissao
from usuarios.models import Usuario


class AuthApiTests(APITestCase):
    def setUp(self):
        self.perfil_participante = Perfil.objects.create(
            nome='participante', descricao='Participante'
        )
        self.perfil_avaliador = Perfil.objects.create(
            nome='avaliador', descricao='Avaliador'
        )
        self.perfil_admin = Perfil.objects.create(nome='admin', descricao='Admin')
        perm = Permissao.objects.create(
            nome='Gerenciar usuários',
            recurso='usuario',
            acao='gerenciar',
        )
        PerfilPermissao.objects.create(id_perfil=self.perfil_admin, id_permissao=perm)

        self.admin = Usuario.objects.create_user(
            email='admin@example.com',
            password='senha-forte-123',
            nome='Administrador',
            id_perfil=self.perfil_admin,
        )

    def test_registro_e_login(self):
        response = self.client.post(
            reverse('usuarios:registro'),
            {
                'email': 'nova@example.com',
                'password': 'senha-forte-123',
                'nome': 'Nova Usuária',
                'pais': 'BR',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        login = self.client.post(
            reverse('usuarios:login'),
            {'email': 'nova@example.com', 'password': 'senha-forte-123'},
            format='json',
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn('access', login.data)
        self.assertIn('refresh', login.data)
        usuario = Usuario.objects.get(email='nova@example.com')
        self.assertEqual(usuario.id_perfil.nome, 'participante')

    def test_registro_como_avaliador(self):
        response = self.client.post(
            reverse('usuarios:registro'),
            {
                'email': 'avaliador@example.com',
                'password': 'senha-forte-123',
                'nome': 'Avaliador Demo',
                'tipo_perfil': 'avaliador',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        usuario = Usuario.objects.get(email='avaliador@example.com')
        self.assertEqual(usuario.id_perfil.nome, 'avaliador')
        self.assertFalse(usuario.is_active)

        login = self.client.post(
            reverse('usuarios:login'),
            {'email': 'avaliador@example.com', 'password': 'senha-forte-123'},
            format='json',
        )
        self.assertEqual(login.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(self.admin)
        aprovar = self.client.patch(
            reverse('usuarios:usuario-detail', args=[usuario.id_usuario]),
            {'is_active': True},
            format='json',
        )
        self.assertEqual(aprovar.status_code, status.HTTP_200_OK)
        self.assertTrue(aprovar.data['is_active'])

        self.client.force_authenticate(user=None)
        login_ok = self.client.post(
            reverse('usuarios:login'),
            {'email': 'avaliador@example.com', 'password': 'senha-forte-123'},
            format='json',
        )
        self.assertEqual(login_ok.status_code, status.HTTP_200_OK)

    def test_admin_lista_avaliadores_pendentes(self):
        Usuario.objects.create_user(
            email='pendente@example.com',
            password='senha-forte-123',
            nome='Pendente',
            id_perfil=self.perfil_avaliador,
            is_active=False,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(
            reverse('usuarios:usuario-list'),
            {'perfil': 'avaliador', 'is_active': 'false'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        emails = {item['email'] for item in results}
        self.assertIn('pendente@example.com', emails)

    def test_registro_nao_permite_admin(self):
        response = self.client.post(
            reverse('usuarios:registro'),
            {
                'email': 'fake-admin@example.com',
                'password': 'senha-forte-123',
                'nome': 'Fake Admin',
                'tipo_perfil': 'admin',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Usuario.objects.filter(email='fake-admin@example.com').exists())

    def test_me_requer_autenticacao(self):
        response = self.client.get(reverse('usuarios:me'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_retorna_usuario_logado(self):
        user = Usuario.objects.create_user(
            email='me@example.com',
            password='senha-forte-123',
            nome='Me User',
            id_perfil=self.perfil_participante,
        )
        self.client.force_authenticate(user)
        response = self.client.get(reverse('usuarios:me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'me@example.com')
        self.assertEqual(response.data['id_perfil']['nome'], 'participante')

    def test_me_atualiza_dados(self):
        user = Usuario.objects.create_user(
            email='patch@example.com',
            password='senha-forte-123',
            nome='Antes',
            id_perfil=self.perfil_participante,
        )
        self.client.force_authenticate(user)
        response = self.client.patch(
            reverse('usuarios:me'),
            {'nome': 'Depois', 'pais': 'AR'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.nome, 'Depois')
        self.assertEqual(user.pais, 'AR')

    def test_admin_lista_usuarios_e_perfis(self):
        self.client.force_authenticate(self.admin)
        usuarios = self.client.get(reverse('usuarios:usuario-list'))
        self.assertEqual(usuarios.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(usuarios.data['count'], 1)

        perfis = self.client.get(reverse('usuarios:perfil-list'))
        self.assertEqual(perfis.status_code, status.HTTP_200_OK)
        nomes = {p['nome'] for p in perfis.data}
        self.assertIn('admin', nomes)
        self.assertIn('participante', nomes)

    def test_participante_nao_lista_usuarios(self):
        participante = Usuario.objects.create_user(
            email='part@example.com',
            password='senha-forte-123',
            nome='Participante',
            id_perfil=self.perfil_participante,
        )
        self.client.force_authenticate(participante)
        response = self.client.get(reverse('usuarios:usuario-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cria_e_desativa_usuario(self):
        self.client.force_authenticate(self.admin)
        create = self.client.post(
            reverse('usuarios:usuario-list'),
            {
                'email': 'criado@example.com',
                'password': 'senha-forte-123',
                'nome': 'Criado Admin',
                'id_perfil': str(self.perfil_participante.id_perfil),
            },
            format='json',
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        id_usuario = create.data['id_usuario']

        delete = self.client.delete(
            reverse('usuarios:usuario-detail', args=[id_usuario])
        )
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)
        user = Usuario.objects.get(pk=id_usuario)
        self.assertFalse(user.is_active)

    def test_admin_nao_pode_desativar_a_si_mesmo(self):
        self.client.force_authenticate(self.admin)

        patch = self.client.patch(
            reverse('usuarios:usuario-detail', args=[self.admin.id_usuario]),
            {'is_active': False},
            format='json',
        )
        self.assertEqual(patch.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

        delete = self.client.delete(
            reverse('usuarios:usuario-detail', args=[self.admin.id_usuario])
        )
        self.assertEqual(delete.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)
