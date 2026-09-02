from rest_framework import serializers

from eventos.models import Evento, Inscricao


class EventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evento
        fields = (
            'id_evento',
            'nome',
            'descricao',
            'link_whatsapp_geral',
            'data_inicio',
            'data_fim',
            'prazo_formacao_grupo',
            'max_membros_grupo',
            'status',
        )
        read_only_fields = ('id_evento',)

    def validate_max_membros_grupo(self, value):
        if value is None or value < 2:
            raise serializers.ValidationError(
                'O máximo de membros por grupo deve ser pelo menos 2.'
            )
        if value > 50:
            raise serializers.ValidationError(
                'O máximo de membros por grupo não pode ser maior que 50.'
            )
        return value

    def validate(self, attrs):
        data_inicio = attrs.get('data_inicio', getattr(self.instance, 'data_inicio', None))
        data_fim = attrs.get('data_fim', getattr(self.instance, 'data_fim', None))
        prazo = attrs.get(
            'prazo_formacao_grupo',
            getattr(self.instance, 'prazo_formacao_grupo', None),
        )

        if data_inicio and data_fim and data_fim <= data_inicio:
            raise serializers.ValidationError(
                {'data_fim': 'A data de término deve ser posterior à data de início.'}
            )

        if prazo and data_inicio and prazo > data_inicio:
            raise serializers.ValidationError(
                {
                    'prazo_formacao_grupo': (
                        'O prazo de formação de grupos deve ser anterior ou igual ao início do evento.'
                    )
                }
            )

        return attrs


class InscricaoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='id_usuario.nome', read_only=True)
    usuario_email = serializers.EmailField(source='id_usuario.email', read_only=True)
    pais = serializers.CharField(source='id_usuario.pais', read_only=True)
    instituicao = serializers.CharField(source='id_usuario.instituicao', read_only=True)
    curso = serializers.CharField(source='id_usuario.curso', read_only=True)

    class Meta:
        model = Inscricao
        fields = (
            'id_inscricao',
            'id_usuario',
            'usuario_nome',
            'usuario_email',
            'pais',
            'instituicao',
            'curso',
            'id_evento',
            'status',
            'aprovado_por',
            'criado_em',
        )
        read_only_fields = (
            'id_inscricao',
            'id_usuario',
            'usuario_nome',
            'usuario_email',
            'pais',
            'instituicao',
            'curso',
            'status',
            'aprovado_por',
            'criado_em',
        )

    def validate_id_evento(self, evento):
        if evento.status != Evento.Status.INSCRICOES_ABERTAS:
            raise serializers.ValidationError(
                'As inscrições neste evento não estão abertas.'
            )
        return evento

    def validate(self, attrs):
        request = self.context['request']
        evento = attrs.get('id_evento')
        if evento and Inscricao.objects.filter(id_usuario=request.user, id_evento=evento).exists():
            raise serializers.ValidationError(
                {'id_evento': 'Você já possui inscrição neste evento.'}
            )
        return attrs


class InscricaoAprovarSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[Inscricao.Status.APROVADA, Inscricao.Status.RECUSADA]
    )


class ParticipanteEventoSerializer(serializers.Serializer):
    id_inscricao = serializers.UUIDField()
    id_usuario = serializers.UUIDField()
    nome = serializers.CharField()
    nome_usuario = serializers.CharField()
    pais = serializers.CharField()
    instituicao = serializers.CharField()
    curso = serializers.CharField()
    status = serializers.CharField()

    @staticmethod
    def from_inscricao(inscricao: Inscricao) -> dict:
        usuario = inscricao.id_usuario
        avatar = getattr(usuario, 'avatar', None)
        return {
            'id_inscricao': inscricao.id_inscricao,
            'id_usuario': usuario.id_usuario,
            'nome': usuario.nome,
            'nome_usuario': avatar.nome_usuario if avatar else '',
            'pais': usuario.pais,
            'instituicao': usuario.instituicao,
            'curso': usuario.curso,
            'status': inscricao.status,
        }
