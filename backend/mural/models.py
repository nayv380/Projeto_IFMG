import uuid

from django.db import models

from eventos.models import Evento, Inscricao
from grupos.models import Grupo


class PostagemMural(models.Model):
    class Area(models.TextChoices):
        GERAL = 'geral', 'Geral'
        DUVIDAS = 'duvidas', 'Dúvidas'
        ANUNCIOS = 'anuncios', 'Anúncios'
        
    class Status(models.TextChoices):
        PUBLICADA = 'publicada', 'Publicada'
        OCULTA = 'oculta', 'Oculta'
        ARQUIVADA = 'arquivada', 'Arquivada'

    id_postagem = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        db_column='id_evento',
        related_name='postagens',
    )
    id_autor = models.ForeignKey(
        Inscricao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_autor',
        related_name='postagens',
    )
    id_grupo = models.ForeignKey(
        Grupo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_grupo',
        related_name='postagens',
    )
    titulo = models.CharField(max_length=255)
    conteudo = models.TextField()
    area = models.CharField(
        max_length=100,
        choices=Area.choices,
        default=Area.GERAL,
        blank=True,
    )
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PUBLICADA,
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'postagem_mural'
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo


class RespostaMural(models.Model):
    id_resposta = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_postagem = models.ForeignKey(
        PostagemMural,
        on_delete=models.CASCADE,
        db_column='id_postagem',
        related_name='respostas',
    )
    id_autor = models.ForeignKey(
        Inscricao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_autor',
        related_name='respostas',
    )
    conteudo = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'resposta_mural'
        ordering = ['criado_em']

    def __str__(self):
        return f'Resposta em {self.id_postagem.titulo}'
