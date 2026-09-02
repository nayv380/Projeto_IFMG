import random
import string

from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import serializers

from eventos.models import Inscricao
from grupos.models import Grupo, MembroGrupo, SolicitacaoEntrada


def gerar_codigo_grupo(length: int = 6) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def serializar_membro(membro: MembroGrupo) -> dict:
    usuario = membro.id_inscricao.id_usuario
    avatar = getattr(usuario, 'avatar', None)
    return {
        'id': membro.id,
        'id_inscricao': membro.id_inscricao_id,
        'id_usuario': usuario.id_usuario,
        'nome': usuario.nome,
        'nome_usuario': avatar.nome_usuario if avatar else '',
        'is_lider': membro.is_lider,
        'entrou_em': membro.entrou_em,
    }


class MembroGrupoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembroGrupo
        fields = ('id', 'id_grupo', 'id_inscricao', 'is_lider', 'entrou_em')
        read_only_fields = ('id', 'id_grupo', 'id_inscricao', 'is_lider', 'entrou_em')


class GrupoSerializer(serializers.ModelSerializer):
    membros_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Grupo
        fields = (
            'id_grupo',
            'id_evento',
            'id_lider',
            'nome',
            'codigo',
            'link_whatsapp_grupo',
            'origem',
            'formado_algoritmo',
            'max_membros',
            'membros_count',
            'criado_em',
        )
        read_only_fields = (
            'id_grupo',
            'codigo',
            'id_lider',
            'formado_algoritmo',
            'max_membros',
            'membros_count',
            'criado_em',
        )

    def generate_unique_code(self, evento) -> str:
        for _ in range(20):
            codigo = gerar_codigo_grupo()
            if not Grupo.objects.filter(id_evento=evento, codigo=codigo).exists():
                return codigo
        raise serializers.ValidationError(
            'Não foi possível gerar um código único para o grupo.'
        )

    def validate_nome(self, value):
        nome = (value or '').strip()
        if not nome:
            raise serializers.ValidationError('Informe o nome do grupo.')
        if len(nome) > 40:
            raise serializers.ValidationError(
                'O nome do grupo deve ter no máximo 40 caracteres.'
            )
        return nome

    def validate(self, attrs):
        # max_membros vem do evento; ignore qualquer valor enviado pelo cliente.
        attrs.pop('max_membros', None)

        evento = attrs.get('id_evento', getattr(self.instance, 'id_evento', None))
        if evento and evento.prazo_formacao_grupo and timezone.now() > evento.prazo_formacao_grupo:
            raise serializers.ValidationError(
                'O prazo de formação de grupos deste evento já encerrou.'
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        evento = validated_data['id_evento']

        from identity.permissions import usuario_tem_permissao

        if not usuario_tem_permissao(user, 'grupo', 'criar') and not usuario_tem_permissao(
            user, 'evento', 'gerenciar'
        ):
            raise serializers.ValidationError(
                'Você não tem permissão para criar grupos.'
            )

        inscricao_aprovada = Inscricao.objects.filter(
            id_usuario=user,
            id_evento=evento,
            status=Inscricao.Status.APROVADA,
        ).first()

        if not inscricao_aprovada:
            raise serializers.ValidationError(
                'Apenas participantes com inscrição aprovada no evento podem criar grupos.'
            )

        if MembroGrupo.objects.filter(id_inscricao=inscricao_aprovada).exists():
            raise serializers.ValidationError(
                'Você já faz parte de um grupo neste evento.'
            )

        validated_data['id_lider'] = inscricao_aprovada
        validated_data['codigo'] = self.generate_unique_code(evento)
        validated_data['max_membros'] = evento.max_membros_grupo

        grupo = Grupo.objects.create(**validated_data)
        MembroGrupo.objects.create(
            id_grupo=grupo,
            id_inscricao=inscricao_aprovada,
            is_lider=True,
        )
        from grupos.services import cancelar_solicitacoes_pendentes

        cancelar_solicitacoes_pendentes(inscricao_aprovada)
        grupo.membros_count = 1
        return grupo


class GrupoDetailSerializer(GrupoSerializer):
    membros = serializers.SerializerMethodField()

    class Meta(GrupoSerializer.Meta):
        fields = GrupoSerializer.Meta.fields + ('membros',)
        read_only_fields = GrupoSerializer.Meta.read_only_fields + ('membros',)

    def get_membros(self, obj):
        # Usa cache do prefetch_related quando disponível (evita N+1).
        membros = getattr(obj, '_prefetched_objects_cache', {}).get('membros')
        if membros is None:
            membros = obj.membros.select_related(
                'id_inscricao__id_usuario__avatar',
            ).all()
        return [serializar_membro(membro) for membro in membros]


class SolicitacaoEntradaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitacaoEntrada
        fields = ('id', 'id_grupo', 'id_inscricao', 'status', 'criado_em')
        read_only_fields = ('id', 'id_inscricao', 'status', 'criado_em')

    def validate(self, attrs):
        request = self.context['request']
        grupo = attrs['id_grupo']
        user = request.user

        if grupo.id_evento.prazo_formacao_grupo and timezone.now() > grupo.id_evento.prazo_formacao_grupo:
            raise serializers.ValidationError(
                'O prazo de formação de grupos deste evento já encerrou.'
            )

        inscricao_aprovada = Inscricao.objects.filter(
            id_usuario=user,
            id_evento=grupo.id_evento,
            status=Inscricao.Status.APROVADA,
        ).first()

        if not inscricao_aprovada:
            raise serializers.ValidationError(
                'Apenas participantes com inscrição aprovada no evento podem solicitar entrada no grupo.'
            )

        if MembroGrupo.objects.filter(id_inscricao=inscricao_aprovada).exists():
            raise serializers.ValidationError(
                'Você já faz parte de um grupo neste evento.'
            )

        if MembroGrupo.objects.filter(
            id_grupo=grupo,
            id_inscricao=inscricao_aprovada,
        ).exists():
            raise serializers.ValidationError(
                'Você já é membro deste grupo.'
            )

        if grupo.id_lider_id == inscricao_aprovada.pk:
            raise serializers.ValidationError(
                'Você já é o líder deste grupo.'
            )

        if grupo.membros.count() >= grupo.max_membros:
            raise serializers.ValidationError(
                'O grupo já atingiu o número máximo de membros.'
            )

        if SolicitacaoEntrada.objects.filter(
            id_grupo=grupo,
            id_inscricao=inscricao_aprovada,
        ).exists():
            raise serializers.ValidationError(
                'Já existe uma solicitação para este grupo.'
            )

        attrs['id_inscricao'] = inscricao_aprovada
        return attrs

    def create(self, validated_data):
        return SolicitacaoEntrada.objects.create(**validated_data)


class SolicitacaoEntradaAprovarSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            SolicitacaoEntrada.Status.APROVADA,
            SolicitacaoEntrada.Status.RECUSADA,
        ]
    )


def queryset_grupos_com_contagem():
    return Grupo.objects.select_related('id_evento', 'id_lider').annotate(
        membros_count=Count('membros'),
    )
