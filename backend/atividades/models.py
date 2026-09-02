import uuid

from django.db import models
from django.db.models import UniqueConstraint

from eventos.models import Evento, Inscricao
from grupos.models import Grupo


class AtividadeEvento(models.Model):
    id_atividade = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        db_column='id_evento',
        related_name='atividades',
    )
    titulo = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    formatos_aceitos = models.JSONField(default=list, blank=True)
    prazo = models.DateTimeField()
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = 'atividade_evento'
        ordering = ['prazo']

    def __str__(self):
        return self.titulo


class Entrega(models.Model):
    class Status(models.TextChoices):
        ENVIADA = 'enviada', 'Enviada'
        EM_CORRECAO = 'em_correcao', 'Em correção'
        CORRIGIDA = 'corrigida', 'Corrigida'

    id_entrega = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_atividade = models.ForeignKey(
        AtividadeEvento,
        on_delete=models.CASCADE,
        db_column='id_atividade',
        related_name='entregas',
    )
    id_grupo = models.ForeignKey(
        Grupo,
        on_delete=models.CASCADE,
        db_column='id_grupo',
        related_name='entregas',
    )
    enviado_por = models.ForeignKey(
        Inscricao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='enviado_por',
        related_name='entregas_enviadas',
    )
    url_arquivo = models.CharField(max_length=500)
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.ENVIADA,
    )
    enviado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'entrega'
        ordering = ['-enviado_em']
        constraints = [
            UniqueConstraint(
                fields=['id_atividade', 'id_grupo'],
                name='uniq_entrega_atividade_grupo',
            ),
        ]

    def __str__(self):
        return f'Entrega de {self.id_grupo.nome} - {self.id_atividade.titulo}'


class Correcao(models.Model):
    id_correcao = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_entrega = models.OneToOneField(
        Entrega,
        on_delete=models.CASCADE,
        db_column='id_entrega',
        related_name='correcao',
    )
    id_avaliador = models.ForeignKey(
        Inscricao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_avaliador',
        related_name='correcoes_feitas',
    )
    nota = models.DecimalField(max_digits=5, decimal_places=2)
    feedback = models.TextField(blank=True)
    validado_por_admin = models.BooleanField(default=False)
    corrigido_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'correcao'

    def __str__(self):
        return f'Correção de {self.id_entrega}'
