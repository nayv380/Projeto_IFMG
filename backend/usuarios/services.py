from usuarios.models import Notificacao


def criar_notificacao(usuario, mensagem, *, tipo=Notificacao.Tipo.PLATAFORMA, link_extra=''):
    """Cria notificação in-app para um usuário. Falhas silenciosas não bloqueiam o fluxo principal."""
    if usuario is None:
        return None
    return Notificacao.objects.create(
        id_usuario=usuario,
        tipo=tipo,
        mensagem=mensagem,
        link_extra=link_extra or '',
    )


def notificar_membros_grupo(grupo, mensagem, *, link_extra='', excluir_usuario_id=None):
    from grupos.models import MembroGrupo

    membros = MembroGrupo.objects.filter(id_grupo=grupo).select_related(
        'id_inscricao__id_usuario'
    )
    for membro in membros:
        usuario = membro.id_inscricao.id_usuario
        if excluir_usuario_id and usuario.id_usuario == excluir_usuario_id:
            continue
        criar_notificacao(usuario, mensagem, link_extra=link_extra)
