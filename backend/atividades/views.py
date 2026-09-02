from django.db.models import Avg, Count, Sum
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from atividades.models import AtividadeEvento, Correcao, Entrega
from atividades.permissions import (
    PodeAvaliarEntrega,
    PodeGerenciarAtividade,
    usuario_pode_ver_entregas_do_grupo,
)
from atividades.serializers import (
    AtividadeEventoSerializer,
    CorrecaoCreateSerializer,
    CorrecaoSerializer,
    CorrecaoUpdateSerializer,
    EntregaCreateSerializer,
    EntregaSerializer,
)
from eventos.models import Evento
from grupos.models import Grupo
from identity.permissions import usuario_tem_permissao
from usuarios.services import notificar_membros_grupo


@extend_schema_view(
    get=extend_schema(tags=['Atividades'], summary='Listar atividades do evento'),
    post=extend_schema(tags=['Atividades'], summary='Criar atividade (admin)'),
)
class AtividadeListCreateView(generics.ListCreateAPIView):
    serializer_class = AtividadeEventoSerializer
    permission_classes = [PodeGerenciarAtividade]
    pagination_class = None

    def get_queryset(self):
        return AtividadeEvento.objects.filter(
            id_evento=self.kwargs['id_evento']
        ).select_related('id_evento')

    def perform_create(self, serializer):
        evento = get_object_or_404(Evento, pk=self.kwargs['id_evento'])
        serializer.save(id_evento=evento)


@extend_schema_view(
    get=extend_schema(tags=['Atividades'], summary='Detalhe da atividade'),
    put=extend_schema(tags=['Atividades'], summary='Atualizar atividade (admin)'),
    patch=extend_schema(tags=['Atividades'], summary='Atualizar parcialmente a atividade (admin)'),
    delete=extend_schema(tags=['Atividades'], summary='Excluir atividade (admin)'),
)
class AtividadeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AtividadeEvento.objects.select_related('id_evento').all()
    serializer_class = AtividadeEventoSerializer
    permission_classes = [PodeGerenciarAtividade]
    lookup_field = 'id_atividade'
    lookup_url_kwarg = 'id_atividade'

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        if self.request.method in ('PUT', 'PATCH'):
            serializer.fields['id_evento'].read_only = True
        return serializer


@extend_schema_view(
    post=extend_schema(tags=['Entregas'], summary='Enviar entrega (membro do grupo)'),
)
class EntregaCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EntregaCreateSerializer
    queryset = Entrega.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entrega = serializer.save()
        return Response(
            EntregaSerializer(entrega).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(tags=['Entregas'], summary='Detalhe da entrega'),
)
class EntregaDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EntregaSerializer
    queryset = Entrega.objects.select_related(
        'id_atividade',
        'id_grupo',
        'enviado_por',
    )
    lookup_field = 'id_entrega'
    lookup_url_kwarg = 'id_entrega'

    def retrieve(self, request, *args, **kwargs):
        entrega = self.get_object()
        if not usuario_pode_ver_entregas_do_grupo(request.user, entrega.id_grupo):
            return Response(
                {'detail': 'Você não tem permissão para ver esta entrega.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(EntregaSerializer(entrega).data)


@extend_schema_view(
    get=extend_schema(tags=['Entregas'], summary='Listar entregas do grupo'),
)
class GrupoEntregasListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EntregaSerializer
    pagination_class = None

    def list(self, request, *args, **kwargs):
        grupo = get_object_or_404(Grupo, pk=self.kwargs['id_grupo'])
        if not usuario_pode_ver_entregas_do_grupo(request.user, grupo):
            return Response(
                {'detail': 'Você não tem permissão para ver as entregas deste grupo.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = Entrega.objects.filter(id_grupo=grupo).select_related(
            'id_atividade',
            'enviado_por',
        )
        return Response(EntregaSerializer(qs, many=True).data)


@extend_schema(tags=['Correções'])
class EntregaCorrecaoView(APIView):
    """
    GET  — obter correção da entrega (404 se ainda não houver)
    POST — criar correção (avaliador com inscrição aprovada no evento)
    PATCH — atualizar correção existente
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [PodeAvaliarEntrega()]

    def _get_entrega(self):
        return get_object_or_404(
            Entrega.objects.select_related('id_atividade', 'id_grupo'),
            pk=self.kwargs['id_entrega'],
        )

    @extend_schema(responses=CorrecaoSerializer, summary='Obter correção da entrega')
    def get(self, request, id_entrega):
        entrega = self._get_entrega()
        if not usuario_pode_ver_entregas_do_grupo(request.user, entrega.id_grupo):
            return Response(
                {'detail': 'Você não tem permissão para ver esta correção.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        correcao = Correcao.objects.filter(id_entrega=entrega).first()
        if correcao is None:
            return Response(
                {'detail': 'Correção ainda não realizada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(CorrecaoSerializer(correcao).data)

    @extend_schema(
        request=CorrecaoCreateSerializer,
        responses=CorrecaoSerializer,
        summary='Criar correção (avaliador inscrito no evento)',
    )
    def post(self, request, id_entrega):
        entrega = self._get_entrega()
        serializer = CorrecaoCreateSerializer(
            data=request.data,
            context={'request': request, 'entrega': entrega},
        )
        serializer.is_valid(raise_exception=True)
        correcao = serializer.save()
        notificar_membros_grupo(
            entrega.id_grupo,
            (
                f'A entrega da atividade "{entrega.id_atividade.titulo}" '
                f'recebeu correção (aguardando validação do admin).'
            ),
            link_extra=f'/eventos/{entrega.id_atividade.id_evento_id}/atividades',
        )
        return Response(CorrecaoSerializer(correcao).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=CorrecaoUpdateSerializer,
        responses=CorrecaoSerializer,
        summary='Atualizar correção',
    )
    def patch(self, request, id_entrega):
        entrega = self._get_entrega()
        correcao = Correcao.objects.filter(id_entrega=entrega).first()
        if correcao is None:
            return Response(
                {'detail': 'Correção ainda não realizada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Admin pode validar; avaliador só edita a própria correção.
        from identity.permissions import usuario_tem_permissao

        is_admin = usuario_tem_permissao(request.user, 'evento', 'gerenciar')
        is_author = (
            correcao.id_avaliador_id
            and correcao.id_avaliador.id_usuario_id == request.user.id_usuario
        )
        if not is_admin and not is_author:
            return Response(
                {'detail': 'Você não pode editar esta correção.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = dict(request.data)
        if not is_admin:
            data.pop('validado_por_admin', None)

        was_validated = correcao.validado_por_admin
        serializer = CorrecaoUpdateSerializer(correcao, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        correcao.refresh_from_db()

        # Publicação da nota: quando admin valida pela primeira vez
        if is_admin and correcao.validado_por_admin and not was_validated:
            notificar_membros_grupo(
                entrega.id_grupo,
                (
                    f'Nota publicada: {correcao.nota} pts na atividade '
                    f'"{entrega.id_atividade.titulo}".'
                ),
                link_extra=f'/eventos/{entrega.id_atividade.id_evento_id}/atividades',
            )

        return Response(CorrecaoSerializer(correcao).data)


@extend_schema_view(
    get=extend_schema(
        tags=['Entregas'],
        summary='Listar entregas do evento (avaliador/admin)',
    ),
)
class EventoEntregasPendentesView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EntregaSerializer
    pagination_class = None

    def list(self, request, *args, **kwargs):
        evento = get_object_or_404(Evento, pk=self.kwargs['id_evento'])
        is_admin = usuario_tem_permissao(request.user, 'evento', 'gerenciar')
        is_avaliador = usuario_tem_permissao(request.user, 'entrega', 'avaliar')
        if not is_admin and not is_avaliador:
            return Response(
                {'detail': 'Você não tem permissão para listar entregas do evento.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if is_avaliador and not is_admin:
            from atividades.permissions import inscricao_aprovada

            if inscricao_aprovada(request.user, evento.id_evento) is None:
                return Response(
                    {'detail': 'É necessária inscrição aprovada no evento.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        status_filtro = request.query_params.get('status')
        qs = Entrega.objects.filter(
            id_atividade__id_evento=evento,
        ).select_related('id_atividade', 'id_grupo', 'enviado_por')
        if status_filtro:
            qs = qs.filter(status=status_filtro)
        else:
            qs = qs.exclude(status=Entrega.Status.CORRIGIDA)

        return Response(EntregaSerializer(qs, many=True).data)


@extend_schema_view(
    get=extend_schema(
        tags=['Correções'],
        summary='Listar correções do evento (admin)',
    ),
)
class EventoCorrecoesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id_evento):
        if not usuario_tem_permissao(request.user, 'evento', 'gerenciar'):
            return Response(
                {'detail': 'Apenas administradores podem listar correções do evento.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        evento = get_object_or_404(Evento, pk=id_evento)
        qs = (
            Correcao.objects.filter(id_entrega__id_atividade__id_evento=evento)
            .select_related(
                'id_entrega__id_grupo',
                'id_entrega__id_atividade',
                'id_avaliador__id_usuario',
            )
            .order_by('-corrigido_em')
        )
        data = []
        for correcao in qs:
            item = CorrecaoSerializer(correcao).data
            item['grupo_nome'] = correcao.id_entrega.id_grupo.nome
            item['atividade_titulo'] = correcao.id_entrega.id_atividade.titulo
            item['avaliador_nome'] = (
                correcao.id_avaliador.id_usuario.nome
                if correcao.id_avaliador_id
                else None
            )
            data.append(item)
        return Response(data)


@extend_schema_view(
    get=extend_schema(
        tags=['Dashboard'],
        summary='Ranking de grupos do evento (notas validadas)',
    ),
)
class EventoRankingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id_evento):
        from django.db.models import Q
        from atividades.permissions import inscricao_aprovada

        evento = get_object_or_404(Evento, pk=id_evento)
        is_staff = (
            usuario_tem_permissao(request.user, 'evento', 'gerenciar')
            or usuario_tem_permissao(request.user, 'entrega', 'avaliar')
        )
        if not is_staff and inscricao_aprovada(request.user, evento.id_evento) is None:
            return Response(
                {'detail': 'É necessária inscrição aprovada no evento.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        filtro_validado = Q(entregas__correcao__validado_por_admin=True)
        grupos = (
            Grupo.objects.filter(id_evento=evento)
            .annotate(
                total_nota=Sum('entregas__correcao__nota', filter=filtro_validado),
                media_nota=Avg('entregas__correcao__nota', filter=filtro_validado),
                entregas_corrigidas=Count('entregas__correcao', filter=filtro_validado),
            )
            .order_by('-total_nota', '-media_nota', 'nome')
        )

        ranking = []
        for posicao, grupo in enumerate(grupos, start=1):
            ranking.append(
                {
                    'posicao': posicao,
                    'id_grupo': grupo.id_grupo,
                    'nome': grupo.nome,
                    'total_nota': float(grupo.total_nota or 0),
                    'media_nota': float(grupo.media_nota or 0),
                    'entregas_corrigidas': grupo.entregas_corrigidas,
                }
            )
        return Response(ranking)


@extend_schema_view(
    get=extend_schema(
        tags=['Dashboard'],
        summary='Resumo estatístico do evento',
    ),
)
class EventoDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id_evento):
        from atividades.permissions import inscricao_aprovada
        from eventos.models import Inscricao

        evento = get_object_or_404(Evento, pk=id_evento)
        is_admin = usuario_tem_permissao(request.user, 'evento', 'gerenciar')
        is_avaliador = usuario_tem_permissao(request.user, 'entrega', 'avaliar')
        if (
            not is_admin
            and not is_avaliador
            and inscricao_aprovada(request.user, evento.id_evento) is None
        ):
            return Response(
                {'detail': 'É necessária inscrição aprovada no evento.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        inscricoes = Inscricao.objects.filter(id_evento=evento)
        entregas = Entrega.objects.filter(id_atividade__id_evento=evento)
        correcoes = Correcao.objects.filter(id_entrega__id_atividade__id_evento=evento)

        data = {
            'id_evento': evento.id_evento,
            'nome': evento.nome,
            'total_grupos': Grupo.objects.filter(id_evento=evento).count(),
            'total_atividades': AtividadeEvento.objects.filter(id_evento=evento).count(),
            'total_entregas': entregas.count(),
            'entregas_pendentes': entregas.filter(status=Entrega.Status.ENVIADA).count(),
            'correcoes_total': correcoes.count(),
            'correcoes_validadas': correcoes.filter(validado_por_admin=True).count(),
            'correcoes_aguardando_validacao': correcoes.filter(
                validado_por_admin=False
            ).count(),
        }
        if is_admin:
            data.update(
                {
                    'inscricoes_pendentes': inscricoes.filter(
                        status=Inscricao.Status.PENDENTE
                    ).count(),
                    'inscricoes_aprovadas': inscricoes.filter(
                        status=Inscricao.Status.APROVADA
                    ).count(),
                    'inscricoes_recusadas': inscricoes.filter(
                        status=Inscricao.Status.RECUSADA
                    ).count(),
                }
            )
        return Response(data)
