from django.urls import path

from usuarios.views import (
    AdminUsuarioDetailView,
    AdminUsuarioListCreateView,
    AvatarMeView,
    LoginView,
    MeView,
    NotificacaoListView,
    NotificacaoMarcarLidaView,
    PerfilListView,
    RefreshTokenView,
    RegistroView,
)

app_name = 'usuarios'

urlpatterns = [
    path('auth/registro/', RegistroView.as_view(), name='registro'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('avatar/me/', AvatarMeView.as_view(), name='avatar-me'),
    path('notificacoes/', NotificacaoListView.as_view(), name='notificacoes-list'),
    path(
        'notificacoes/<uuid:pk>/marcar-lida/',
        NotificacaoMarcarLidaView.as_view(),
        name='notificacao-marcar-lida',
    ),
    path('usuarios/', AdminUsuarioListCreateView.as_view(), name='usuario-list'),
    path(
        'usuarios/<uuid:id_usuario>/',
        AdminUsuarioDetailView.as_view(),
        name='usuario-detail',
    ),
    path('perfis/', PerfilListView.as_view(), name='perfil-list'),
]
