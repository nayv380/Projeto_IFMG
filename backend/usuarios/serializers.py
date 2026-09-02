from django.contrib.auth import get_user_model
from rest_framework import serializers

from identity.models import Perfil
from identity.services import (
    PERFIS_REGISTRO_PUBLICO,
    PERFIL_AVALIADOR,
    PERFIL_PARTICIPANTE,
    obter_perfil_participante,
    obter_perfil_registro,
)
from usuarios.models import Avatar, Notificacao

Usuario = get_user_model()


class PerfilResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Perfil
        fields = ('id_perfil', 'nome', 'descricao')
        read_only_fields = fields


class RegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    tipo_perfil = serializers.ChoiceField(
        choices=PERFIS_REGISTRO_PUBLICO,
        default=PERFIL_PARTICIPANTE,
        required=False,
        write_only=True,
        help_text='Perfil público no registro: participante ou avaliador.',
    )

    class Meta:
        model = Usuario
        fields = (
            'email',
            'password',
            'nome',
            'pais',
            'instituicao',
            'curso',
            'data_nascimento',
            'tipo_perfil',
        )

    def create(self, validated_data):
        password = validated_data.pop('password')
        tipo_perfil = validated_data.pop('tipo_perfil', PERFIL_PARTICIPANTE)

        try:
            perfil = obter_perfil_registro(tipo_perfil)
        except ValueError:
            raise serializers.ValidationError(
                {
                    'tipo_perfil': (
                        'Tipo de perfil inválido. Use participante ou avaliador.'
                    )
                }
            )
        except Perfil.DoesNotExist as exc:
            raise serializers.ValidationError(
                {
                    'detail': (
                        f"Perfil '{tipo_perfil}' não encontrado. "
                        'Execute: python manage.py seed_roles'
                    )
                }
            ) from exc

        return Usuario.objects.create_user(
            password=password,
            id_perfil=perfil,
            is_active=tipo_perfil != PERFIL_AVALIADOR,
            **validated_data,
        )


class UsuarioSerializer(serializers.ModelSerializer):
    id_perfil = PerfilResumoSerializer(read_only=True)

    class Meta:
        model = Usuario
        fields = (
            'id_usuario',
            'email',
            'nome',
            'pais',
            'instituicao',
            'curso',
            'data_nascimento',
            'email_verificado',
            'is_active',
            'id_perfil',
            'criado_em',
        )
        read_only_fields = (
            'id_usuario',
            'email_verificado',
            'is_active',
            'id_perfil',
            'criado_em',
        )


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ('nome', 'pais', 'instituicao', 'curso', 'data_nascimento')


class AdminUsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    id_perfil = serializers.PrimaryKeyRelatedField(
        queryset=Perfil.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Usuario
        fields = (
            'email',
            'password',
            'nome',
            'pais',
            'instituicao',
            'curso',
            'data_nascimento',
            'id_perfil',
            'is_active',
            'email_verificado',
        )

    def create(self, validated_data):
        password = validated_data.pop('password')
        id_perfil = validated_data.pop('id_perfil', None)
        if id_perfil is None:
            try:
                id_perfil = obter_perfil_participante()
            except Perfil.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {
                        'detail': (
                            "Perfil 'participante' não encontrado. "
                            'Execute: python manage.py seed_roles'
                        )
                    }
                ) from exc
        return Usuario.objects.create_user(
            password=password,
            id_perfil=id_perfil,
            **validated_data,
        )


class AdminUsuarioUpdateSerializer(serializers.ModelSerializer):
    id_perfil = serializers.PrimaryKeyRelatedField(
        queryset=Perfil.objects.all(),
        required=False,
        allow_null=True,
    )
    password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = Usuario
        fields = (
            'nome',
            'pais',
            'instituicao',
            'curso',
            'data_nascimento',
            'id_perfil',
            'is_active',
            'email_verificado',
            'password',
        )

    def validate(self, attrs):
        request = self.context.get('request')
        instance = getattr(self, 'instance', None)
        if (
            request
            and instance is not None
            and instance.pk == request.user.pk
            and 'is_active' in attrs
            and attrs['is_active'] is False
        ):
            raise serializers.ValidationError(
                {
                    'is_active': 'Você não pode desativar a própria conta.',
                }
            )
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avatar
        fields = (
            'id_avatar',
            'nome_usuario',
            'biografia',
            'whatsapp',
            'config_avatar',
        )
        read_only_fields = ('id_avatar',)


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = (
            'id',
            'tipo',
            'mensagem',
            'link_extra',
            'lida',
            'criado_em',
        )
        read_only_fields = ('id', 'tipo', 'mensagem', 'link_extra', 'criado_em')
