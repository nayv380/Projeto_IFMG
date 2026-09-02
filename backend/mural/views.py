from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from atividades.permissions import inscricao_aprovada
from eventos.models import Evento
from identity.permissions import usuario_tem_permissao
from mural.models import PostagemMural, RespostaMural
from mural.permissions import PodeUsarMural
from mural.serializers import (
    PostagemMuralCreateSerializer,
    PostagemMuralSerializer,
    RespostaMuralCreateSerializer,
    RespostaMuralSerializer,
)


@extend_schema_view(
    get=extend_schema(tags=['Mural'], summary='Listar postagens do mural'),
    post=extend_schema(tags=['Mural'], summary='Criar postagem no mural'),
)
class MuralListCreateView(APIView):
    permission_classes = [IsAuthenticated, PodeUsarMural]
    mural_acao = 'publicar'

    def get(self, request, id_evento):
        evento = get_object_or_404(Evento, pk=id_evento)
        qs = (
            PostagemMural.objects.filter(
                id_evento=evento,
                status=PostagemMural.Status.PUBLICADA,
            )
            .select_related('id_autor__id_usuario')
            .prefetch_related('respostas__id_autor__id_usuario')
            .order_by('-criado_em')
        )
        area = request.query_params.get('area')
        if area in {choice.value for choice in PostagemMural.Area}:
            qs = qs.filter(area=area)
        return Response(PostagemMuralSerializer(qs, many=True).data)

    def post(self, request, id_evento):
        evento = get_object_or_404(Evento, pk=id_evento)
        if (
            not usuario_tem_permissao(request.user, 'evento', 'gerenciar')
            and inscricao_aprovada(request.user, evento.id_evento) is None
        ):
            return Response(
                {'detail': 'É necessária inscrição aprovada no evento.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = PostagemMuralCreateSerializer(
            data=request.data,
            context={'request': request, 'evento': evento},
        )
        serializer.is_valid(raise_exception=True)
        postagem = serializer.save()
        postagem = (
            PostagemMural.objects.select_related('id_autor__id_usuario')
            .prefetch_related('respostas__id_autor__id_usuario')
            .get(pk=postagem.pk)
        )
        return Response(
            PostagemMuralSerializer(postagem).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=['Mural'])
class MuralDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_postagem(self, id_postagem):
        return get_object_or_404(
            PostagemMural.objects.select_related('id_autor__id_usuario').prefetch_related(
                'respostas__id_autor__id_usuario'
            ),
            pk=id_postagem,
        )

    def _eh_autor(self, user, postagem):
        return (
            postagem.id_autor_id
            and postagem.id_autor.id_usuario_id == user.id_usuario
        )

    def _pode_editar(self, user, postagem):
        if usuario_tem_permissao(user, 'evento', 'gerenciar'):
            return True
        return self._eh_autor(user, postagem)

    def _pode_ver(self, user, postagem):
        if usuario_tem_permissao(user, 'evento', 'gerenciar'):
            return True
        if self._eh_autor(user, postagem):
            return True
        return postagem.status == PostagemMural.Status.PUBLICADA

    @extend_schema(responses=PostagemMuralSerializer, summary='Detalhe da postagem')
    def get(self, request, id_postagem):
        postagem = self._get_postagem(id_postagem)
        if not self._pode_ver(request.user, postagem):
            return Response(
                {'detail': 'Postagem não encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(PostagemMuralSerializer(postagem).data)

    @extend_schema(request=PostagemMuralCreateSerializer, responses=PostagemMuralSerializer)
    def patch(self, request, id_postagem):
        postagem = self._get_postagem(id_postagem)
        if not self._pode_editar(request.user, postagem):
            return Response(
                {'detail': 'Você não pode editar esta postagem.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        is_admin = usuario_tem_permissao(request.user, 'evento', 'gerenciar')
        allowed = ('titulo', 'conteudo', 'area')
        if is_admin:
            allowed = allowed + ('status',)
        for field in allowed:
            if field in request.data:
                setattr(postagem, field, request.data[field])
        postagem.save()
        return Response(PostagemMuralSerializer(postagem).data)

    def delete(self, request, id_postagem):
        postagem = self._get_postagem(id_postagem)
        if not self._pode_editar(request.user, postagem):
            return Response(
                {'detail': 'Você não pode excluir esta postagem.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        postagem.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    post=extend_schema(tags=['Mural'], summary='Responder postagem do mural'),
)
class MuralRespostaCreateView(APIView):
    permission_classes = [IsAuthenticated]
    mural_acao = 'responder'

    def post(self, request, id_postagem):
        postagem = get_object_or_404(PostagemMural, pk=id_postagem)
        if (
            not usuario_tem_permissao(request.user, 'evento', 'gerenciar')
            and inscricao_aprovada(request.user, postagem.id_evento_id) is None
        ):
            return Response(
                {'detail': 'É necessária inscrição aprovada no evento.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not usuario_tem_permissao(request.user, 'mural', 'responder') and not usuario_tem_permissao(
            request.user, 'evento', 'gerenciar'
        ):
            return Response(
                {'detail': 'Você não tem permissão para responder no mural.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = RespostaMuralCreateSerializer(
            data=request.data,
            context={'request': request, 'postagem': postagem},
        )
        serializer.is_valid(raise_exception=True)
        resposta = serializer.save()
        resposta = RespostaMural.objects.select_related('id_autor__id_usuario').get(pk=resposta.pk)
        return Response(
            RespostaMuralSerializer(resposta).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=['Mural'], summary='Excluir resposta do mural')
class MuralRespostaDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, id_resposta):
        resposta = get_object_or_404(
            RespostaMural.objects.select_related('id_autor', 'id_postagem'),
            pk=id_resposta,
        )
        is_admin = usuario_tem_permissao(request.user, 'evento', 'gerenciar')
        is_author = (
            resposta.id_autor_id
            and resposta.id_autor.id_usuario_id == request.user.id_usuario
        )
        if not is_admin and not is_author:
            return Response(
                {'detail': 'Você não pode excluir esta resposta.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        resposta.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
