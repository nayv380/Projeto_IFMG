from collections import defaultdict

from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from eventos.models import Evento, Inscricao
from eventos.permissions import PodeGerenciarEvento
from grupos.models import Grupo, MembroGrupo, SolicitacaoEntrada
from grupos.permissions import EhLiderDoGrupo
from grupos.serializers import (
    GrupoDetailSerializer,
    GrupoSerializer,
    SolicitacaoEntradaAprovarSerializer,
    SolicitacaoEntradaSerializer,
    gerar_codigo_grupo,
    queryset_grupos_com_contagem,
)
from grupos.services import (
    EntrarPorCodigoError,
    cancelar_solicitacoes_pendentes,
    entrar_por_codigo,
    sair_do_grupo,
)
from identity.permissions import usuario_tem_permissao
from usuarios.services import criar_notificacao


def _ordenar_inscritos_para_diversidade(inscritos):
    """
    Intercala inscritos por (pais, instituicao, curso) para evitar grupos
    homogêneos — round-robin entre buckets, priorizando os maiores primeiro.
    """
    buckets = defaultdict(list)
    for insc in inscritos:
        usuario = insc.id_usuario
        chave = (usuario.pais or '', usuario.instituicao or '', usuario.curso or '')
        buckets[chave].append(insc)

    for lista in buckets.values():
        lista.sort(key=lambda i: i.criado_em)

    chaves = sorted(buckets.keys(), key=lambda k: (-len(buckets[k]), k))
    ordenados = []
    while chaves:
        proximas = []
        for chave in chaves:
            if buckets[chave]:
                ordenados.append(buckets[chave].pop(0))
            if buckets[chave]:
                proximas.append(chave)
        chaves = proximas
    return ordenados


@extend_schema_view(
    get=extend_schema(tags=['Grupos'], summary='Listar grupos'),
    post=extend_schema(tags=['Grupos'], summary='Criar grupo'),
)
class GrupoListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        evento_id = request.query_params.get('evento')
        grupos = queryset_grupos_com_contagem()
        if evento_id:
            grupos = grupos.filter(id_evento_id=evento_id)

        if usuario_tem_permissao(request.user, 'evento', 'gerenciar'):
            grupos = grupos.prefetch_related(
                'membros__id_inscricao__id_usuario__avatar',
            )
            return Response(GrupoDetailSerializer(grupos, many=True).data)

        return Response(GrupoSerializer(grupos, many=True).data)

    def post(self, request):
        serializer = GrupoSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        grupo = serializer.save()
        grupo = (
            queryset_grupos_com_contagem()
            .prefetch_related('membros__id_inscricao__id_usuario__avatar')
            .get(pk=grupo.pk)
        )
        return Response(GrupoDetailSerializer(grupo).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(tags=['Grupos'], summary='Detalhar grupo'),
)
class GrupoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id_grupo):
        grupo = get_object_or_404(
            queryset_grupos_com_contagem()
            .prefetch_related('membros__id_inscricao__id_usuario__avatar'),
            id_grupo=id_grupo,
        )

        # Roster completo só para admin, líder do grupo ou membro do próprio grupo.
        if usuario_tem_permissao(request.user, 'evento', 'gerenciar'):
            return Response(GrupoDetailSerializer(grupo).data)

        inscricao = Inscricao.objects.filter(
            id_usuario=request.user,
            id_evento_id=grupo.id_evento_id,
            status=Inscricao.Status.APROVADA,
        ).first()
        eh_membro = bool(
            inscricao
            and MembroGrupo.objects.filter(
                id_grupo=grupo,
                id_inscricao=inscricao,
            ).exists()
        )
        if eh_membro:
            return Response(GrupoDetailSerializer(grupo).data)

        return Response(GrupoSerializer(grupo).data)


@extend_schema(
    tags=['Grupos'],
    summary='Sair do grupo (líder com outros membros deve indicar novo líder)',
)
class SairDoGrupoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id_grupo):
        id_novo_lider = request.data.get('id_novo_lider') or request.data.get(
            'id_inscricao_novo_lider'
        )
        try:
            resultado = sair_do_grupo(
                usuario=request.user,
                id_grupo=id_grupo,
                id_novo_lider=id_novo_lider,
            )
        except ValueError as exc:
            codigo = str(exc)
            mensagens = {
                'grupo_nao_encontrado': (
                    'Grupo não encontrado.',
                    status.HTTP_404_NOT_FOUND,
                ),
                'nao_e_membro': (
                    'Você não faz parte deste grupo.',
                    status.HTTP_403_FORBIDDEN,
                ),
                'novo_lider_obrigatorio': (
                    'Como líder, escolha outro membro para assumir a liderança antes de sair.',
                    status.HTTP_400_BAD_REQUEST,
                ),
                'novo_lider_invalido': (
                    'O novo líder deve ser outro membro do mesmo grupo.',
                    status.HTTP_400_BAD_REQUEST,
                ),
            }
            detail, code = mensagens.get(
                codigo,
                ('Não foi possível sair do grupo.', status.HTTP_400_BAD_REQUEST),
            )
            return Response({'detail': detail, 'code': codigo}, status=code)

        return Response(resultado, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(tags=['Grupos'], summary='Meu grupo no evento'),
)
class MeuGrupoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        evento_id = request.query_params.get('evento') or request.query_params.get('id_evento')
        if not evento_id:
            return Response(
                {'detail': 'Informe o parâmetro evento (UUID do evento).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inscricao = Inscricao.objects.filter(
            id_usuario=request.user,
            id_evento_id=evento_id,
            status=Inscricao.Status.APROVADA,
        ).first()
        if not inscricao:
            # Sem inscrição: resposta neutra (não é erro de autorização).
            return Response(None)

        membro = (
            MembroGrupo.objects.filter(id_inscricao=inscricao)
            .select_related('id_grupo')
            .first()
        )
        if not membro:
            return Response(None)

        grupo = get_object_or_404(
            queryset_grupos_com_contagem()
            .prefetch_related('membros__id_inscricao__id_usuario__avatar'),
            pk=membro.id_grupo_id,
        )
        return Response(GrupoDetailSerializer(grupo).data)


@extend_schema(
    tags=['Grupos'],
    summary='Entrar em um grupo usando o código de convite',
)
class EntrarPorCodigoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        id_evento = request.data.get('id_evento')
        codigo = request.data.get('codigo')
        if not id_evento:
            return Response(
                {'detail': 'Informe o evento.', 'code': 'evento_obrigatorio'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            grupo = entrar_por_codigo(
                usuario=request.user,
                id_evento=id_evento,
                codigo=codigo or '',
            )
        except EntrarPorCodigoError as exc:
            http_status = (
                status.HTTP_404_NOT_FOUND
                if exc.code in {'evento_nao_encontrado', 'codigo_invalido'}
                else status.HTTP_400_BAD_REQUEST
            )
            return Response(
                {'detail': exc.message, 'code': exc.code},
                status=http_status,
            )

        return Response(
            GrupoDetailSerializer(grupo).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(tags=['Grupos'], summary='Solicitar entrada em grupo'),
)
class SolicitacaoEntradaCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SolicitacaoEntradaSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        solicitacao = serializer.save()

        lider = solicitacao.id_grupo.id_lider
        if lider and lider.id_usuario_id:
            criar_notificacao(
                lider.id_usuario,
                (
                    f'{request.user.nome} solicitou entrada no grupo '
                    f'"{solicitacao.id_grupo.nome}".'
                ),
                link_extra=f'/eventos/{solicitacao.id_grupo.id_evento_id}/comunidade',
            )

        return Response(
            SolicitacaoEntradaSerializer(solicitacao).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(tags=['Grupos'], summary='Listar solicitações de entrada do grupo'),
)
class SolicitacaoEntradaListView(APIView):
    permission_classes = [IsAuthenticated, EhLiderDoGrupo]
    require_leader_for_read = True

    def get(self, request, id_grupo):
        grupo = get_object_or_404(Grupo, id_grupo=id_grupo)
        solicitacoes = SolicitacaoEntrada.objects.filter(
            id_grupo=grupo,
            status=SolicitacaoEntrada.Status.PENDENTE,
        ).select_related('id_inscricao__id_usuario')

        data = [
            {
                'id': solicitacao.id,
                'id_inscricao': solicitacao.id_inscricao_id,
                'nome_usuario': solicitacao.id_inscricao.id_usuario.nome,
                'status': solicitacao.status,
                'criado_em': solicitacao.criado_em,
            }
            for solicitacao in solicitacoes
        ]
        return Response(data)


@extend_schema(tags=['Grupos'], summary='Aprovar ou recusar solicitação de entrada')
class SolicitacaoEntradaAprovarView(APIView):
    permission_classes = [IsAuthenticated, EhLiderDoGrupo]

    def patch(self, request, id_solicitacao):
        serializer = SolicitacaoEntradaAprovarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        status_escolhido = serializer.validated_data['status']

        with transaction.atomic():
            try:
                solicitacao = (
                    SolicitacaoEntrada.objects.select_for_update()
                    .select_related('id_grupo', 'id_inscricao__id_usuario')
                    .get(id=id_solicitacao)
                )
            except SolicitacaoEntrada.DoesNotExist:
                return Response(
                    {'detail': 'Solicitação não encontrada.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if solicitacao.status != SolicitacaoEntrada.Status.PENDENTE:
                return Response(
                    {'detail': 'Esta solicitação já foi processada.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            grupo = solicitacao.id_grupo

            if status_escolhido == SolicitacaoEntrada.Status.APROVADA:
                membros_qs = MembroGrupo.objects.select_for_update().filter(id_grupo=grupo)
                if membros_qs.count() >= grupo.max_membros:
                    return Response(
                        {'detail': 'O grupo já atingiu o número máximo de membros.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if MembroGrupo.objects.filter(id_inscricao=solicitacao.id_inscricao).exists():
                    return Response(
                        {'detail': 'O solicitante já faz parte de um grupo.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                MembroGrupo.objects.create(
                    id_grupo=grupo,
                    id_inscricao=solicitacao.id_inscricao,
                    is_lider=False,
                )
                # Ao ser aceito, some as demais solicitações pendentes.
                cancelar_solicitacoes_pendentes(
                    solicitacao.id_inscricao,
                    excluir_id=solicitacao.id,
                )

            solicitacao.status = status_escolhido
            solicitacao.save(update_fields=['status'])

        criar_notificacao(
            solicitacao.id_inscricao.id_usuario,
            (
                f'Sua solicitação para o grupo "{solicitacao.id_grupo.nome}" '
                f'foi {status_escolhido}.'
            ),
            link_extra=f'/eventos/{solicitacao.id_grupo.id_evento_id}/comunidade',
        )

        return Response(SolicitacaoEntradaSerializer(solicitacao).data)


@extend_schema_view(
    get=extend_schema(
        tags=['Grupos'],
        summary='Solicitações pendentes dos grupos que o usuário lidera',
    ),
)
class SolicitacoesPendentesLiderView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        evento_id = request.query_params.get('evento')
        qs = SolicitacaoEntrada.objects.filter(
            id_grupo__id_lider__id_usuario=request.user,
            status=SolicitacaoEntrada.Status.PENDENTE,
        ).select_related(
            'id_grupo',
            'id_inscricao__id_usuario',
        )
        if evento_id:
            qs = qs.filter(id_grupo__id_evento_id=evento_id)

        data = [
            {
                'id': s.id,
                'id_grupo': s.id_grupo_id,
                'grupo_nome': s.id_grupo.nome,
                'id_inscricao': s.id_inscricao_id,
                'nome_usuario': s.id_inscricao.id_usuario.nome,
                'status': s.status,
                'criado_em': s.criado_em,
            }
            for s in qs.order_by('-criado_em')
        ]
        return Response(data)


@extend_schema(
    tags=['Grupos'],
    summary='Formar grupos automaticamente com inscritos sem equipe',
)
class FormarGruposAlgoritmoView(APIView):
    permission_classes = [PodeGerenciarEvento]

    @transaction.atomic
    def post(self, request, id_evento):
        evento = get_object_or_404(Evento, pk=id_evento)
        raw_max = request.data.get('max_membros', evento.max_membros_grupo)
        try:
            max_membros = int(raw_max)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'max_membros deve ser um número inteiro.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if max_membros <= 0:
            return Response(
                {'detail': 'max_membros deve ser maior que zero.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inscritos = _ordenar_inscritos_para_diversidade(
            list(
                Inscricao.objects.filter(
                    id_evento=evento,
                    status=Inscricao.Status.APROVADA,
                    participacoes_grupo__isnull=True,
                ).select_related('id_usuario')
            )
        )

        if not inscritos:
            return Response(
                {'detail': 'Não há inscritos sem grupo para formar equipes.', 'grupos': []},
            )

        criados = []
        idx = 0
        grupo_num = Grupo.objects.filter(id_evento=evento, origem=Grupo.Origem.ALGORITMO).count() + 1

        while idx < len(inscritos):
            lote = inscritos[idx : idx + max_membros]
            lider = lote[0]
            codigo = None
            for _ in range(20):
                candidato = gerar_codigo_grupo()
                if not Grupo.objects.filter(id_evento=evento, codigo=candidato).exists():
                    codigo = candidato
                    break
            if codigo is None:
                return Response(
                    {'detail': 'Não foi possível gerar código único para o grupo.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            grupo = Grupo.objects.create(
                id_evento=evento,
                id_lider=lider,
                nome=f'Equipe {grupo_num}',
                codigo=codigo,
                origem=Grupo.Origem.ALGORITMO,
                formado_algoritmo=True,
                max_membros=max_membros,
            )
            for i, insc in enumerate(lote):
                MembroGrupo.objects.create(
                    id_grupo=grupo,
                    id_inscricao=insc,
                    is_lider=(i == 0),
                )
                cancelar_solicitacoes_pendentes(insc)
                criar_notificacao(
                    insc.id_usuario,
                    f'Você foi alocado(a) automaticamente no grupo "{grupo.nome}".',
                    link_extra=f'/eventos/{evento.id_evento}/comunidade',
                )
            criados.append(GrupoSerializer(grupo).data)
            grupo_num += 1
            idx += max_membros

        return Response(
            {'grupos_criados': len(criados), 'grupos': criados},
            status=status.HTTP_201_CREATED,
        )
