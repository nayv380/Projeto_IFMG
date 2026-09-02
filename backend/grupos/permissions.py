from rest_framework.permissions import BasePermission

from grupos.models import Grupo, SolicitacaoEntrada


class EhLiderDoGrupo(BasePermission):
    message = 'Você não tem permissão para gerenciar este grupo.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        grupo_id = view.kwargs.get('id_grupo')
        solicitacao_id = view.kwargs.get('id_solicitacao')
        require_leader = getattr(view, 'require_leader_for_read', False)

        if request.method in ('GET', 'HEAD', 'OPTIONS') and not require_leader:
            return True

        if grupo_id:
            return self._check_group_leader(user, grupo_id)

        if solicitacao_id:
            try:
                solicitacao = SolicitacaoEntrada.objects.select_related('id_grupo__id_lider').get(id=solicitacao_id)
            except SolicitacaoEntrada.DoesNotExist:
                return False
            return self._is_lider(user, solicitacao.id_grupo)

        return False

    def has_object_permission(self, request, view, obj):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        if isinstance(obj, Grupo):
            return self._is_lider(request.user, obj)
        if isinstance(obj, SolicitacaoEntrada):
            return self._is_lider(request.user, obj.id_grupo)
        return False

    def _check_group_leader(self, user, grupo_id):
        try:
            grupo = Grupo.objects.select_related('id_lider').get(id_grupo=grupo_id)
        except Grupo.DoesNotExist:
            return False
        return self._is_lider(user, grupo)

    def _is_lider(self, user, grupo: Grupo) -> bool:
        if not grupo.id_lider:
            return False
        return grupo.id_lider.id_usuario == user
