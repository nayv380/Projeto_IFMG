def usuario_tem_permissao(usuario, recurso: str, acao: str) -> bool:
    """Verifica se o usuário possui uma permissão RBAC pelo seu perfil."""
    if not usuario.is_authenticated:
        return False
    if usuario.is_superuser:
        return True
    if not usuario.id_perfil_id:
        return False
    return usuario.id_perfil.permissoes.filter(
        id_permissao__recurso=recurso,
        id_permissao__acao=acao,
    ).exists()
