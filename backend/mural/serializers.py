from rest_framework import serializers

from atividades.permissions import inscricao_aprovada
from mural.models import PostagemMural, RespostaMural


class RespostaMuralSerializer(serializers.ModelSerializer):
    autor_nome = serializers.SerializerMethodField()
    autor_id_usuario = serializers.SerializerMethodField()

    class Meta:
        model = RespostaMural
        fields = (
            'id_resposta',
            'id_postagem',
            'id_autor',
            'autor_nome',
            'autor_id_usuario',
            'conteudo',
            'criado_em',
        )
        read_only_fields = (
            'id_resposta',
            'id_postagem',
            'id_autor',
            'autor_nome',
            'autor_id_usuario',
            'criado_em',
        )

    def get_autor_nome(self, obj):
        if obj.id_autor_id and obj.id_autor.id_usuario_id:
            return obj.id_autor.id_usuario.nome
        return None

    def get_autor_id_usuario(self, obj):
        if obj.id_autor_id:
            return obj.id_autor.id_usuario_id
        return None


class PostagemMuralSerializer(serializers.ModelSerializer):
    autor_nome = serializers.SerializerMethodField()
    autor_id_usuario = serializers.SerializerMethodField()
    respostas = RespostaMuralSerializer(many=True, read_only=True)

    class Meta:
        model = PostagemMural
        fields = (
            'id_postagem',
            'id_evento',
            'id_autor',
            'autor_nome',
            'autor_id_usuario',
            'id_grupo',
            'titulo',
            'conteudo',
            'area',
            'status',
            'criado_em',
            'atualizado_em',
            'respostas',
        )
        read_only_fields = (
            'id_postagem',
            'id_evento',
            'id_autor',
            'autor_nome',
            'autor_id_usuario',
            'criado_em',
            'atualizado_em',
            'respostas',
        )

    def get_autor_nome(self, obj):
        if obj.id_autor_id and obj.id_autor.id_usuario_id:
            return obj.id_autor.id_usuario.nome
        return None

    def get_autor_id_usuario(self, obj):
        if obj.id_autor_id:
            return obj.id_autor.id_usuario_id
        return None


class PostagemMuralCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostagemMural
        fields = ('titulo', 'conteudo', 'area', 'id_grupo')

    def create(self, validated_data):
        request = self.context['request']
        evento = self.context['evento']
        from identity.permissions import usuario_tem_permissao

        insc = inscricao_aprovada(request.user, evento.id_evento)
        if insc is None and not usuario_tem_permissao(request.user, 'evento', 'gerenciar'):
            raise serializers.ValidationError(
                'É necessária inscrição aprovada no evento.'
            )
        return PostagemMural.objects.create(
            id_evento=evento,
            id_autor=insc,
            status=PostagemMural.Status.PUBLICADA,
            **validated_data,
        )


class RespostaMuralCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RespostaMural
        fields = ('conteudo',)

    def create(self, validated_data):
        request = self.context['request']
        postagem = self.context['postagem']
        insc = inscricao_aprovada(request.user, postagem.id_evento_id)
        return RespostaMural.objects.create(
            id_postagem=postagem,
            id_autor=insc,
            **validated_data,
        )
