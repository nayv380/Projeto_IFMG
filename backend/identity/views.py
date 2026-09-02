from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from atividades.models import Entrega
from eventos.models import Evento, Inscricao
from grupos.models import Grupo
from identity.models import ConfiguracoesSistema, Perfil, PerfilPermissao, Permissao
from identity.permissions import usuario_tem_permissao
from usuarios.models import Usuario
from identity.serializers import (
    ConfiguracoesSistemaSerializer,
    PerfilPermissaoSerializer,
    PerfilSerializer,
    PermissaoSerializer,
    VincularPermissaoSerializer,
)
from rest_framework.permissions import BasePermission

from usuarios.permissions import PodeGerenciarUsuario


class PodeAcessarAdminDashboard(BasePermission):
    message = 'Você não tem permissão para acessar o painel administrativo.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return usuario_tem_permissao(user, 'usuario', 'gerenciar') or usuario_tem_permissao(
            user, 'evento', 'gerenciar'
        )


@extend_schema_view(
    get=extend_schema(tags=['Admin RBAC'], summary='Listar todas as permissões'),
)
class AdminPermissaoListView(generics.ListAPIView):
    queryset = Permissao.objects.all().order_by('recurso', 'acao')
    serializer_class = PermissaoSerializer
    permission_classes = [PodeGerenciarUsuario]
    pagination_class = None


@extend_schema_view(
    post=extend_schema(tags=['Admin RBAC'], summary='Criar perfil'),
)
class AdminPerfilCreateView(generics.CreateAPIView):
    queryset = Perfil.objects.all()
    serializer_class = PerfilSerializer
    permission_classes = [PodeGerenciarUsuario]


@extend_schema(tags=['Admin RBAC'])
class AdminPerfilPermissoesView(APIView):
    permission_classes = [PodeGerenciarUsuario]

    @extend_schema(responses=PermissaoSerializer(many=True), summary='Listar permissões do perfil')
    def get(self, request, id_perfil):
        perfil = get_object_or_404(Perfil, pk=id_perfil)
        permissoes = Permissao.objects.filter(
            perfis__id_perfil=perfil
        ).order_by('recurso', 'acao')
        return Response(PermissaoSerializer(permissoes, many=True).data)

    @extend_schema(
        request=VincularPermissaoSerializer,
        responses=PerfilPermissaoSerializer,
        summary='Vincular permissão ao perfil',
    )
    def post(self, request, id_perfil):
        perfil = get_object_or_404(Perfil, pk=id_perfil)
        serializer = VincularPermissaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        permissao = get_object_or_404(
            Permissao, pk=serializer.validated_data['id_permissao']
        )
        vinculo, created = PerfilPermissao.objects.get_or_create(
            id_perfil=perfil,
            id_permissao=permissao,
        )
        return Response(
            PerfilPermissaoSerializer(vinculo).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


@extend_schema(tags=['Admin RBAC'], summary='Desvincular permissão do perfil')
class AdminPerfilPermissaoDeleteView(APIView):
    permission_classes = [PodeGerenciarUsuario]

    def delete(self, request, id_perfil, id_permissao):
        deleted, _ = PerfilPermissao.objects.filter(
            id_perfil_id=id_perfil,
            id_permissao_id=id_permissao,
        ).delete()
        if not deleted:
            return Response(
                {'detail': 'Vínculo não encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['Admin RBAC'])
class AdminConfiguracoesView(APIView):
    permission_classes = [PodeGerenciarUsuario]

    @extend_schema(responses=ConfiguracoesSistemaSerializer, summary='Obter configurações')
    def get(self, request):
        config = ConfiguracoesSistema.get_solo()
        return Response(ConfiguracoesSistemaSerializer(config).data)

    @extend_schema(
        request=ConfiguracoesSistemaSerializer,
        responses=ConfiguracoesSistemaSerializer,
        summary='Atualizar configurações',
    )
    def patch(self, request):
        config = ConfiguracoesSistema.get_solo()
        serializer = ConfiguracoesSistemaSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@extend_schema(tags=['Admin'], summary='Resumo global do painel administrativo')
class AdminDashboardView(APIView):
    permission_classes = [PodeAcessarAdminDashboard]

    def get(self, request):
        return Response(
            {
                'usuarios': Usuario.objects.count(),
                'eventos': Evento.objects.count(),
                'inscricoes_pendentes': Inscricao.objects.filter(
                    status=Inscricao.Status.PENDENTE
                ).count(),
                'correcoes_pendentes': Entrega.objects.filter(
                    status=Entrega.Status.ENVIADA
                ).count(),
                'grupos': Grupo.objects.count(),
                'entregas': Entrega.objects.count(),
            }
        )
