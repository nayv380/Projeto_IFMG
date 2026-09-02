from identity.permissions import usuario_tem_permissao
from rest_framework.permissions import SAFE_METHODS, BasePermission

from atividades.permissions import inscricao_aprovada


class PodeUsarMural(BasePermission):
    """
    Leitura: autenticado com inscrição aprovada no evento (ou admin).
    Escrita: mural.publicar / mural.responder + inscrição aprovada.
    """

    message = 'Você não tem permissão para usar o mural deste evento.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if usuario_tem_permissao(user, 'evento', 'gerenciar'):
            return True

        evento_id = view.kwargs.get('id_evento')
        if evento_id is None and hasattr(view, 'get_evento_id'):
            evento_id = view.get_evento_id()

        if request.method in SAFE_METHODS:
            return True

        acao = getattr(view, 'mural_acao', 'publicar')
        if not usuario_tem_permissao(user, 'mural', acao):
            return False

        if evento_id and inscricao_aprovada(user, evento_id) is None:
            self.message = 'É necessária inscrição aprovada no evento.'
            return False
        return True
