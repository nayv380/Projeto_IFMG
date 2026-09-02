from django.urls import path

from identity.views import (
    AdminConfiguracoesView,
    AdminDashboardView,
    AdminPerfilCreateView,
    AdminPerfilPermissaoDeleteView,
    AdminPerfilPermissoesView,
    AdminPermissaoListView,
)

app_name = 'identity'

urlpatterns = [
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/permissoes/', AdminPermissaoListView.as_view(), name='admin-permissoes'),
    path('admin/perfis/', AdminPerfilCreateView.as_view(), name='admin-perfis-create'),
    path(
        'admin/perfis/<uuid:id_perfil>/permissoes/',
        AdminPerfilPermissoesView.as_view(),
        name='admin-perfil-permissoes',
    ),
    path(
        'admin/perfis/<uuid:id_perfil>/permissoes/<uuid:id_permissao>/',
        AdminPerfilPermissaoDeleteView.as_view(),
        name='admin-perfil-permissao-delete',
    ),
    path(
        'admin/configuracoes/',
        AdminConfiguracoesView.as_view(),
        name='admin-configuracoes',
    ),
]
