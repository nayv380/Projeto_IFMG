from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from eventos.models import Evento, Inscricao
from eventos.permissions import (
    PodeAprovarInscricao,
    PodeGerenciarEvento,
    PodeVerParticipantesEvento,
)
from eventos.serializers import (
    EventoSerializer,
    InscricaoAprovarSerializer,
    InscricaoSerializer,
    ParticipanteEventoSerializer,
)


@extend_schema_view(
    get=extend_schema(tags=['Eventos'], summary='Listar eventos'),
    post=extend_schema(tags=['Eventos'], summary='Criar evento (admin)'),
)
class EventoListCreateView(generics.ListCreateAPIView):
    serializer_class = EventoSerializer
    permission_classes = [PodeGerenciarEvento]

    def get_queryset(self):
        queryset = Evento.objects.all()
        status_evento = self.request.query_params.get('status')
        busca = self.request.query_params.get('busca')

        if status_evento:
            queryset = queryset.filter(status=status_evento)
        if busca:
            queryset = queryset.filter(nome__icontains=busca)

        return queryset


@extend_schema_view(
    get=extend_schema(tags=['Eventos'], summary='Detalhe do evento'),
    put=extend_schema(tags=['Eventos'], summary='Atualizar evento (admin)'),
    patch=extend_schema(tags=['Eventos'], summary='Atualizar parcialmente o evento (admin)'),
    delete=extend_schema(tags=['Eventos'], summary='Excluir evento (admin)'),
)
class EventoDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Evento.objects.all()
    serializer_class = EventoSerializer
    permission_classes = [PodeGerenciarEvento]
    lookup_field = 'id_evento'
    lookup_url_kwarg = 'id_evento'


@extend_schema_view(
    post=extend_schema(tags=['Inscrições'], summary='Inscrever-se em um evento'),
)
class InscricaoCreateView(generics.CreateAPIView):
    serializer_class = InscricaoSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(
            id_usuario=self.request.user,
            status=Inscricao.Status.PENDENTE,
        )


@extend_schema_view(
    get=extend_schema(tags=['Inscrições'], summary='Minhas inscrições'),
)
class MinhasInscricoesView(generics.ListAPIView):
    serializer_class = InscricaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Inscricao.objects.filter(id_usuario=self.request.user).select_related(
            'id_evento', 'aprovado_por'
        )


@extend_schema_view(
    get=extend_schema(
        tags=['Inscrições'],
        summary='Listar inscrições de um evento (admin)',
    ),
)
class EventoInscricoesListView(generics.ListAPIView):
    serializer_class = InscricaoSerializer
    permission_classes = [PodeAprovarInscricao]
    pagination_class = None

    def get_queryset(self):
        queryset = Inscricao.objects.filter(
            id_evento=self.kwargs['id_evento']
        ).select_related('id_evento', 'id_usuario', 'aprovado_por')

        status_inscricao = self.request.query_params.get('status')
        if status_inscricao:
            queryset = queryset.filter(status=status_inscricao)
        return queryset


@extend_schema_view(
    get=extend_schema(
        tags=['Eventos'],
        summary='Listar participantes do evento (inscrições aprovadas)',
    ),
)
class EventoParticipantesListView(generics.ListAPIView):
    permission_classes = [PodeVerParticipantesEvento]
    pagination_class = None

    def get_queryset(self):
        queryset = Inscricao.objects.filter(
            id_evento=self.kwargs['id_evento'],
        ).select_related('id_usuario__avatar')

        from identity.permissions import usuario_tem_permissao

        is_admin = usuario_tem_permissao(self.request.user, 'evento', 'gerenciar')
        status_inscricao = self.request.query_params.get('status')

        if is_admin:
            if status_inscricao:
                queryset = queryset.filter(status=status_inscricao)
            else:
                queryset = queryset.filter(status=Inscricao.Status.APROVADA)
        else:
            queryset = queryset.filter(status=Inscricao.Status.APROVADA)

        busca = self.request.query_params.get('busca')
        if busca:
            queryset = queryset.filter(id_usuario__nome__icontains=busca)

        return queryset.order_by('id_usuario__nome')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = [
            ParticipanteEventoSerializer.from_inscricao(inscricao)
            for inscricao in queryset
        ]
        return Response(data)


@extend_schema(tags=['Inscrições'], summary='Aprovar ou recusar inscrição (admin)')
class InscricaoAprovarView(APIView):
    permission_classes = [PodeAprovarInscricao]

    def patch(self, request, id_inscricao):
        try:
            inscricao = Inscricao.objects.select_related('id_evento').get(
                pk=id_inscricao
            )
        except Inscricao.DoesNotExist:
            return Response(
                {'detail': 'Inscrição não encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = InscricaoAprovarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        inscricao.status = serializer.validated_data['status']
        inscricao.aprovado_por = request.user
        inscricao.save(update_fields=['status', 'aprovado_por'])

        from usuarios.services import criar_notificacao

        criar_notificacao(
            inscricao.id_usuario,
            (
                f'Sua inscrição no evento "{inscricao.id_evento.nome}" '
                f'foi {inscricao.status}.'
            ),
            link_extra=f'/eventos/{inscricao.id_evento_id}',
        )

        return Response(InscricaoSerializer(inscricao).data)


@extend_schema(
    tags=['Inscrições'],
    summary='Cancelar a própria inscrição (enquanto inscrições estiverem abertas)',
)
class InscricaoCancelarView(APIView):
    """
    Regra de negócio:
    - Só o dono da inscrição pode cancelar.
    - Só é permitido com o evento em `inscricoes_abertas`.
    - A inscrição é removida (CASCADE tira o usuário de grupos do evento).
    - Com evento em andamento/finalizado, não há cancelamento pelo participante.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, id_inscricao):
        try:
            inscricao = Inscricao.objects.select_related('id_evento').get(
                pk=id_inscricao
            )
        except Inscricao.DoesNotExist:
            return Response(
                {'detail': 'Inscrição não encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if inscricao.id_usuario_id != request.user.id_usuario:
            return Response(
                {'detail': 'Você só pode cancelar a sua própria inscrição.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if inscricao.id_evento.status != Evento.Status.INSCRICOES_ABERTAS:
            return Response(
                {
                    'detail': (
                        'Só é possível cancelar a inscrição enquanto o evento '
                        'estiver com inscrições abertas.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        inscricao.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
