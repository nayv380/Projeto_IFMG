import uuid

from django.db import models
from django.db.models import UniqueConstraint

from usuarios.models import Usuario


class Evento(models.Model):
    class Status(models.TextChoices):
        PLANEJADO = 'planejado', 'Planejado'
        INSCRICOES_ABERTAS = 'inscricoes_abertas', 'Inscrições abertas'
        EM_ANDAMENTO = 'em_andamento', 'Em andamento'
        FINALIZADO = 'finalizado', 'Finalizado'

    id_evento = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    link_whatsapp_geral = models.CharField(max_length=255, blank=True)
    data_inicio = models.DateTimeField(db_index=True)
    data_fim = models.DateTimeField()
    prazo_formacao_grupo = models.DateTimeField(null=True, blank=True)
    max_membros_grupo = models.PositiveIntegerField(
        default=5,
        help_text='Tamanho máximo de cada grupo neste evento (definido pelo admin).',
    )
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PLANEJADO,
        db_index=True,
    )

    class Meta:
        db_table = 'evento'
        ordering = ['-data_inicio']

    def __str__(self):
        return self.nome


class Inscricao(models.Model):
    class Status(models.TextChoices):
        PENDENTE = 'pendente', 'Pendente'
        APROVADA = 'aprovada', 'Aprovada'
        RECUSADA = 'recusada', 'Recusada'

    id_inscricao = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='inscricoes',
    )
    id_evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        db_column='id_evento',
        related_name='inscricoes',
    )
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PENDENTE,
    )
    aprovado_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='aprovado_por',
        related_name='inscricoes_aprovadas',
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inscricao'
        ordering = ['-criado_em']
        constraints = [
            UniqueConstraint(
                fields=['id_usuario', 'id_evento'],
                name='uniq_inscricao_usuario_evento',
            ),
        ]

    def __str__(self):
        return f'{self.id_usuario.nome} - {self.id_evento.nome}'
