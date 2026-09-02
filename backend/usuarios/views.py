from django.contrib.auth import get_user_model
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from identity.models import Perfil
from identity.services import PERFIL_AVALIADOR
from usuarios.models import Avatar, Notificacao
from usuarios.permissions import PodeGerenciarUsuario, PodeListarPerfis
from usuarios.serializers import (
    AdminUsuarioCreateSerializer,
    AdminUsuarioUpdateSerializer,
    AvatarSerializer,
    NotificacaoSerializer,
    PerfilResumoSerializer,
    RegistroSerializer,
    UsuarioSerializer,
    UsuarioUpdateSerializer,
)

Usuario = get_user_model()


class LoginTokenSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        email = attrs.get(self.username_field)
        password = attrs.get('password')

        if email and password:
            user = (
                Usuario.objects.select_related('id_perfil')
                .filter(email=email)
                .first()
            )
            if user is not None and user.check_password(password) and not user.is_active:
                perfil = user.id_perfil.nome if user.id_perfil_id else ''
                if perfil == PERFIL_AVALIADOR:
                    raise serializers.ValidationError(
                        {
                            'detail': (
                                'Sua conta de avaliador aguarda aprovação '
                                'do administrador.'
                            )
                        }
                    )
                raise serializers.ValidationError(
                    {
                        'detail': (
                            'Esta conta está desativada. Contate o administrador.'
                        )
                    }
                )

        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['nome'] = user.nome
        if user.id_perfil_id:
            token['perfil'] = user.id_perfil.nome
        return token


@extend_schema(tags=['Auth'])
class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginTokenSerializer


@extend_schema(tags=['Auth'])
class RefreshTokenView(TokenRefreshView):
    permission_classes = [AllowAny]


@extend_schema(tags=['Auth'])
class RegistroView(generics.CreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = RegistroSerializer
    permission_classes = [AllowAny]


@extend_schema(tags=['Auth'])
class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UsuarioUpdateSerializer
        return UsuarioSerializer

    def get_object(self):
        return self.request.user


@extend_schema(tags=['Avatar'])
class AvatarMeView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_avatar(self, user):
        return Avatar.objects.filter(id_usuario=user).first()

    @extend_schema(responses=AvatarSerializer)
    def get(self, request):
        avatar = self._get_avatar(request.user)
        if avatar is None:
            return Response(
                {'detail': 'Avatar ainda não configurado.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(AvatarSerializer(avatar).data)

    @extend_schema(request=AvatarSerializer, responses=AvatarSerializer)
    def put(self, request):
        return self._save(request, partial=False)

    @extend_schema(request=AvatarSerializer, responses=AvatarSerializer)
    def patch(self, request):
        return self._save(request, partial=True)

    def _save(self, request, partial):
        avatar = self._get_avatar(request.user)
        if avatar is None:
            serializer = AvatarSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            avatar = serializer.save(id_usuario=request.user)
            return Response(AvatarSerializer(avatar).data, status=status.HTTP_201_CREATED)

        serializer = AvatarSerializer(avatar, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(tags=['Notificações']),
)
class NotificacaoListView(generics.ListAPIView):
    serializer_class = NotificacaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notificacao.objects.filter(id_usuario=self.request.user)


@extend_schema(tags=['Notificações'])
class NotificacaoMarcarLidaView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=NotificacaoSerializer)
    def patch(self, request, pk):
        try:
            notificacao = Notificacao.objects.get(pk=pk, id_usuario=request.user)
        except Notificacao.DoesNotExist:
            return Response({'detail': 'Notificação não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        notificacao.lida = True
        notificacao.save(update_fields=['lida'])
        return Response(NotificacaoSerializer(notificacao).data)


@extend_schema_view(
    get=extend_schema(tags=['Usuários'], summary='Listar usuários (admin)'),
    post=extend_schema(tags=['Usuários'], summary='Criar usuário (admin)'),
)
class AdminUsuarioListCreateView(generics.ListCreateAPIView):
    permission_classes = [PodeGerenciarUsuario]
    queryset = Usuario.objects.select_related('id_perfil').all().order_by('-criado_em')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminUsuarioCreateSerializer
        return UsuarioSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        busca = self.request.query_params.get('busca')
        perfil = self.request.query_params.get('perfil')
        ativo = self.request.query_params.get('is_active')

        if busca:
            queryset = queryset.filter(
                Q(nome__icontains=busca) | Q(email__icontains=busca)
            )
        if perfil:
            queryset = queryset.filter(id_perfil__nome=perfil)
        if ativo is not None:
            if ativo.lower() in ('1', 'true', 'yes'):
                queryset = queryset.filter(is_active=True)
            elif ativo.lower() in ('0', 'false', 'no'):
                queryset = queryset.filter(is_active=False)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        usuario = Usuario.objects.select_related('id_perfil').get(pk=usuario.pk)
        return Response(
            UsuarioSerializer(usuario).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(tags=['Usuários'], summary='Detalhe do usuário (admin)'),
    put=extend_schema(tags=['Usuários'], summary='Atualizar usuário (admin)'),
    patch=extend_schema(tags=['Usuários'], summary='Atualizar parcialmente o usuário (admin)'),
    delete=extend_schema(
        tags=['Usuários'],
        summary='Desativar usuário (admin) — soft delete via is_active=False',
    ),
)
class AdminUsuarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [PodeGerenciarUsuario]
    queryset = Usuario.objects.select_related('id_perfil').all()
    lookup_field = 'id_usuario'
    lookup_url_kwarg = 'id_usuario'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AdminUsuarioUpdateSerializer
        return UsuarioSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        usuario = Usuario.objects.select_related('id_perfil').get(pk=usuario.pk)
        return Response(UsuarioSerializer(usuario).data)

    def destroy(self, request, *args, **kwargs):
        usuario = self.get_object()
        if usuario.pk == request.user.pk:
            return Response(
                {'detail': 'Você não pode desativar a própria conta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        usuario.is_active = False
        usuario.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(tags=['Perfis'], summary='Listar perfis RBAC (admin)'),
)
class PerfilListView(generics.ListAPIView):
    serializer_class = PerfilResumoSerializer
    permission_classes = [PodeListarPerfis]
    queryset = Perfil.objects.all().order_by('nome')
    pagination_class = None
