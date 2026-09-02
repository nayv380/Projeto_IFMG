from identity.models import Perfil

PERFIL_PARTICIPANTE = 'participante'
PERFIL_AVALIADOR = 'avaliador'

PERFIS_REGISTRO_PUBLICO = (PERFIL_PARTICIPANTE, PERFIL_AVALIADOR)


def obter_perfil_participante() -> Perfil:
    """
    Retorna o perfil padrão atribuído a novos usuários no registro.
    """
    return Perfil.objects.get(nome=PERFIL_PARTICIPANTE)


def obter_perfil_registro(tipo_perfil: str) -> Perfil:
    """
    Resolve o perfil RBAC para o registro público.
    Aceita apenas participante | avaliador.
    """
    nome = (tipo_perfil or PERFIL_PARTICIPANTE).strip().lower()
    if nome not in PERFIS_REGISTRO_PUBLICO:
        raise ValueError(nome)
    return Perfil.objects.get(nome=nome)
