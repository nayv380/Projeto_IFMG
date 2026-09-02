from rest_framework import serializers

from identity.models import ConfiguracoesSistema, Perfil, PerfilPermissao, Permissao


class PermissaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permissao
        fields = ('id_permissao', 'nome', 'recurso', 'acao')
        read_only_fields = fields


class PerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Perfil
        fields = ('id_perfil', 'nome', 'descricao')
        read_only_fields = ('id_perfil',)


class PerfilPermissaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilPermissao
        fields = ('id', 'id_perfil', 'id_permissao')
        read_only_fields = ('id',)


class VincularPermissaoSerializer(serializers.Serializer):
    id_permissao = serializers.UUIDField()


class ConfiguracoesSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracoesSistema
        fields = (
            'nome_plataforma',
            'email_suporte',
            'paises_participantes',
            'modo_manutencao',
            'atualizado_em',
        )
        read_only_fields = ('atualizado_em',)

    def validate_paises_participantes(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Deve ser uma lista de códigos de país.')
        return [str(item).strip().upper() for item in value if str(item).strip()]
