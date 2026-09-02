from rest_framework.permissions import SAFE_METHODS, BasePermission

from identity.permissions import usuario_tem_permissao


class PodeGerenciarUsuario(BasePermission):
    """CRUD de usuários e listagem de perfis: apenas usuario.gerenciar (admin)."""

    message = 'Você não tem permissão para gerenciar usuários.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return usuario_tem_permissao(user, 'usuario', 'gerenciar')

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class PodeListarPerfis(BasePermission):
    """Listar perfis: admin. Leitura autenticada não expõe RBAC completo."""

    message = 'Você não tem permissão para listar perfis.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method not in SAFE_METHODS:
            return False
        return usuario_tem_permissao(user, 'usuario', 'gerenciar')
