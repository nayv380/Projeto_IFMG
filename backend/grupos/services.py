"""Regras de negócio de grupos / solicitações."""

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from eventos.models import Evento, Inscricao
from grupos.models import Grupo, MembroGrupo, SolicitacaoEntrada
from usuarios.services import criar_notificacao


def cancelar_solicitacoes_pendentes(id_inscricao, *, excluir_id=None) -> int:
    """
    Remove solicitações pendentes do inscrito (ex.: ao entrar/criar um grupo).
    Retorna quantas foram removidas.
    """
    qs = SolicitacaoEntrada.objects.filter(
        id_inscricao=id_inscricao,
        status=SolicitacaoEntrada.Status.PENDENTE,
    )
    if excluir_id is not None:
        qs = qs.exclude(pk=excluir_id)
    deleted, _ = qs.delete()
    return deleted


class EntrarPorCodigoError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


@transaction.atomic
def entrar_por_codigo(*, usuario, id_evento, codigo: str) -> Grupo:
    """
    Entra imediatamente em um grupo usando o código de convite
    (sem passar por solicitação/aprovação do líder).
    """
    codigo_norm = (codigo or '').strip().upper()
    if not codigo_norm:
        raise EntrarPorCodigoError('codigo_obrigatorio', 'Informe o código do grupo.')

    evento = Evento.objects.filter(pk=id_evento).first()
    if evento is None:
        raise EntrarPorCodigoError('evento_nao_encontrado', 'Evento não encontrado.')

    if evento.prazo_formacao_grupo and timezone.now() > evento.prazo_formacao_grupo:
        raise EntrarPorCodigoError(
            'prazo_encerrado',
            'O prazo de formação de grupos deste evento já encerrou.',
        )

    inscricao = (
        Inscricao.objects.select_for_update()
        .filter(
            id_usuario=usuario,
            id_evento=evento,
            status=Inscricao.Status.APROVADA,
        )
        .first()
    )
    if inscricao is None:
        raise EntrarPorCodigoError(
            'sem_inscricao',
            'Apenas participantes com inscrição aprovada no evento podem entrar em um grupo.',
        )

    if MembroGrupo.objects.filter(id_inscricao=inscricao).exists():
        raise EntrarPorCodigoError(
            'ja_em_grupo',
            'Você já faz parte de um grupo neste evento.',
        )

    grupo = (
        Grupo.objects.select_for_update()
        .annotate(membros_count=Count('membros'))
        .filter(id_evento=evento, codigo__iexact=codigo_norm)
        .first()
    )
    if grupo is None:
        raise EntrarPorCodigoError('codigo_invalido', 'Código de grupo inválido.')

    if grupo.membros_count >= grupo.max_membros:
        raise EntrarPorCodigoError(
            'grupo_cheio',
            'O grupo já atingiu o número máximo de membros.',
        )

    MembroGrupo.objects.create(
        id_grupo=grupo,
        id_inscricao=inscricao,
        is_lider=False,
    )
    cancelar_solicitacoes_pendentes(inscricao)

    lider = grupo.id_lider
    if lider and lider.id_usuario_id:
        criar_notificacao(
            lider.id_usuario,
            f'{usuario.nome} entrou no grupo "{grupo.nome}" com o código de convite.',
            link_extra=f'/eventos/{evento.id_evento}/comunidade',
        )

    return _grupo_com_detalhe(grupo.id_grupo)


def _grupo_com_detalhe(id_grupo) -> Grupo:
    return (
        Grupo.objects.select_related('id_evento', 'id_lider')
        .annotate(membros_count=Count('membros'))
        .prefetch_related('membros__id_inscricao__id_usuario__avatar')
        .get(pk=id_grupo)
    )


@transaction.atomic
def sair_do_grupo(*, usuario, id_grupo, id_novo_lider=None) -> dict:
    """
    Remove o usuário do grupo.

    - Único membro (ou líder sozinho): apaga o grupo.
    - Membro comum: só sai.
    - Líder com outros membros: exige id_novo_lider (id_inscricao) e transfere
      a liderança antes de sair.
    """
    grupo = (
        Grupo.objects.select_for_update()
        .annotate(membros_count=Count('membros'))
        .filter(pk=id_grupo)
        .first()
    )
    if grupo is None:
        raise ValueError('grupo_nao_encontrado')

    membro = (
        MembroGrupo.objects.select_for_update()
        .select_related('id_inscricao')
        .filter(id_grupo=grupo, id_inscricao__id_usuario=usuario)
        .first()
    )
    if membro is None:
        raise ValueError('nao_e_membro')

    total_membros = grupo.membros_count
    eh_lider = bool(membro.is_lider) or grupo.id_lider_id == membro.id_inscricao_id

    if total_membros <= 1:
        grupo_id = grupo.id_grupo
        grupo.delete()
        return {'acao': 'grupo_excluido', 'id_grupo': str(grupo_id)}

    if eh_lider:
        if not id_novo_lider:
            raise ValueError('novo_lider_obrigatorio')

        novo = (
            MembroGrupo.objects.select_for_update()
            .filter(id_grupo=grupo, id_inscricao_id=id_novo_lider)
            .exclude(pk=membro.pk)
            .first()
        )
        if novo is None:
            raise ValueError('novo_lider_invalido')

        MembroGrupo.objects.filter(id_grupo=grupo, is_lider=True).update(is_lider=False)
        novo.is_lider = True
        novo.save(update_fields=['is_lider'])
        grupo.id_lider_id = novo.id_inscricao_id
        grupo.save(update_fields=['id_lider'])

    membro.delete()
    return {
        'acao': 'saiu',
        'id_grupo': str(grupo.id_grupo),
        'foi_lider': eh_lider,
    }
