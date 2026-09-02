from django.utils import timezone
from rest_framework import serializers

from atividades.models import AtividadeEvento, Correcao, Entrega
from atividades.permissions import inscricao_aprovada, usuario_eh_membro_do_grupo


class AtividadeEventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AtividadeEvento
        fields = (
            'id_atividade',
            'id_evento',
            'titulo',
            'descricao',
            'formatos_aceitos',
            'prazo',
            'ativo',
        )
        read_only_fields = ('id_atividade',)
        extra_kwargs = {
            'id_evento': {'required': False},
        }

    def validate_formatos_aceitos(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Deve ser uma lista de formatos (ex.: ["pdf", "zip"]).')
        if not all(isinstance(item, str) and item.strip() for item in value):
            raise serializers.ValidationError('Cada formato deve ser uma string não vazia.')
        return [item.strip().lower() for item in value]

    def validate(self, attrs):
        evento = attrs.get('id_evento', getattr(self.instance, 'id_evento', None))
        prazo = attrs.get('prazo', getattr(self.instance, 'prazo', None))

        if evento and prazo and prazo > evento.data_fim:
            raise serializers.ValidationError(
                {'prazo': 'O prazo da atividade deve ser anterior ou igual ao fim do evento.'}
            )
        return attrs


class EntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entrega
        fields = (
            'id_entrega',
            'id_atividade',
            'id_grupo',
            'enviado_por',
            'url_arquivo',
            'status',
            'enviado_em',
        )
        read_only_fields = fields


class EntregaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entrega
        fields = ('id_atividade', 'id_grupo', 'url_arquivo')

    def validate(self, attrs):
        request = self.context['request']
        user = request.user
        atividade = attrs['id_atividade']
        grupo = attrs['id_grupo']
        url = (attrs.get('url_arquivo') or '').strip()

        if not url:
            raise serializers.ValidationError(
                {'url_arquivo': 'Informe o link da entrega.'}
            )
        attrs['url_arquivo'] = url

        if not atividade.ativo:
            raise serializers.ValidationError(
                'Esta atividade não está ativa para envios.'
            )

        if timezone.now() > atividade.prazo:
            raise serializers.ValidationError(
                'O prazo desta atividade já encerrou.'
            )

        if grupo.id_evento_id != atividade.id_evento_id:
            raise serializers.ValidationError(
                'O grupo não pertence ao mesmo evento desta atividade.'
            )

        from identity.permissions import usuario_tem_permissao

        if not usuario_tem_permissao(user, 'entrega', 'submeter') and not usuario_tem_permissao(
            user, 'evento', 'gerenciar'
        ):
            raise serializers.ValidationError(
                'Você não tem permissão para submeter entregas.'
            )

        if not usuario_eh_membro_do_grupo(user, grupo):
            raise serializers.ValidationError(
                'Você precisa ser membro do grupo para enviar a entrega.'
            )

        insc = inscricao_aprovada(user, atividade.id_evento_id)
        if not insc:
            raise serializers.ValidationError(
                'É necessária inscrição aprovada no evento para enviar entregas.'
            )

        if Entrega.objects.filter(id_atividade=atividade, id_grupo=grupo).exists():
            raise serializers.ValidationError(
                'Este grupo já possui uma entrega para esta atividade.'
            )

        attrs['enviado_por'] = insc
        return attrs

    def create(self, validated_data):
        return Entrega.objects.create(
            status=Entrega.Status.ENVIADA,
            **validated_data,
        )


class CorrecaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Correcao
        fields = (
            'id_correcao',
            'id_entrega',
            'id_avaliador',
            'nota',
            'feedback',
            'validado_por_admin',
            'corrigido_em',
        )
        read_only_fields = (
            'id_correcao',
            'id_entrega',
            'id_avaliador',
            'validado_por_admin',
            'corrigido_em',
        )


class CorrecaoCreateSerializer(serializers.Serializer):
    nota = serializers.DecimalField(max_digits=5, decimal_places=2)
    feedback = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_nota(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError('A nota deve estar entre 0 e 100.')
        return value

    def validate(self, attrs):
        request = self.context['request']
        entrega: Entrega = self.context['entrega']
        user = request.user

        if Correcao.objects.filter(id_entrega=entrega).exists():
            raise serializers.ValidationError(
                'Esta entrega já possui uma correção.'
            )

        from identity.permissions import usuario_tem_permissao

        is_admin = usuario_tem_permissao(user, 'evento', 'gerenciar')
        is_avaliador = usuario_tem_permissao(user, 'entrega', 'avaliar')
        if not is_admin and not is_avaliador:
            raise serializers.ValidationError(
                'Você não tem permissão para avaliar entregas.'
            )

        insc = inscricao_aprovada(user, entrega.id_atividade.id_evento_id)
        if not insc and not is_admin:
            raise serializers.ValidationError(
                'É necessária inscrição aprovada no evento para avaliar entregas.'
            )

        attrs['id_avaliador'] = insc  # admin pode avaliar sem inscrição (null)
        attrs['id_entrega'] = entrega
        return attrs

    def create(self, validated_data):
        correcao = Correcao.objects.create(
            id_entrega=validated_data['id_entrega'],
            id_avaliador=validated_data.get('id_avaliador'),
            nota=validated_data['nota'],
            feedback=validated_data.get('feedback', ''),
            validado_por_admin=False,
        )
        entrega = validated_data['id_entrega']
        entrega.status = Entrega.Status.CORRIGIDA
        entrega.save(update_fields=['status'])
        return correcao


class CorrecaoUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Correcao
        fields = ('nota', 'feedback', 'validado_por_admin')

    def validate_nota(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError('A nota deve estar entre 0 e 100.')
        return value
