from rest_framework.permissions import SAFE_METHODS, BasePermission

from identity.permissions import usuario_tem_permissao


class PodeGerenciarEvento(BasePermission):
    """
    Leitura (GET/HEAD/OPTIONS): qualquer usuário autenticado.
    Escrita (POST/PUT/PATCH/DELETE): perfil com permissão evento.gerenciar (admin).
    """

    message = 'Você não tem permissão para gerenciar eventos.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return usuario_tem_permissao(user, 'evento', 'gerenciar')

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class PodeAprovarInscricao(BasePermission):
    """Apenas quem gerencia eventos pode aprovar/recusar inscrições."""

    message = 'Você não tem permissão para aprovar inscrições.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return usuario_tem_permissao(user, 'evento', 'gerenciar')


class PodeVerParticipantesEvento(BasePermission):
    """
    Listar participantes: admin (evento.gerenciar) ou inscrição aprovada no evento.
    """

    message = 'Você não tem permissão para ver os participantes deste evento.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if usuario_tem_permissao(user, 'evento', 'gerenciar'):
            return True
        id_evento = view.kwargs.get('id_evento')
        if not id_evento:
            return False
        from eventos.models import Inscricao

        return Inscricao.objects.filter(
            id_usuario=user,
            id_evento_id=id_evento,
            status=Inscricao.Status.APROVADA,
        ).exists()
