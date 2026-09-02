from rest_framework.permissions import SAFE_METHODS, BasePermission

from identity.permissions import usuario_tem_permissao
from eventos.models import Inscricao
from grupos.models import Grupo, MembroGrupo


class PodeGerenciarAtividade(BasePermission):
    """
    Leitura: qualquer usuário autenticado.
    Escrita: perfil com permissão evento.gerenciar (admin).
    """

    message = 'Você não tem permissão para gerenciar atividades.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return usuario_tem_permissao(user, 'evento', 'gerenciar')

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


def inscricao_aprovada(user, evento_id) -> Inscricao | None:
    return Inscricao.objects.filter(
        id_usuario=user,
        id_evento_id=evento_id,
        status=Inscricao.Status.APROVADA,
    ).first()


def usuario_eh_membro_do_grupo(user, grupo: Grupo) -> bool:
    return MembroGrupo.objects.filter(
        id_grupo=grupo,
        id_inscricao__id_usuario=user,
    ).exists()


def usuario_pode_ver_entregas_do_grupo(user, grupo: Grupo) -> bool:
    if usuario_tem_permissao(user, 'evento', 'gerenciar'):
        return True
    if usuario_eh_membro_do_grupo(user, grupo):
        return True
    if usuario_tem_permissao(user, 'entrega', 'avaliar'):
        return inscricao_aprovada(user, grupo.id_evento_id) is not None
    return False


class PodeAvaliarEntrega(BasePermission):
    """Criar/editar correção exige permissão entrega.avaliar."""

    message = 'Você não tem permissão para avaliar entregas.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return usuario_tem_permissao(user, 'entrega', 'avaliar')
