import uuid

from django.db import models
from django.db.models import UniqueConstraint

from eventos.models import Evento, Inscricao


class Grupo(models.Model):
    class Origem(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        ALGORITMO = 'algoritmo', 'Algoritmo'

    id_grupo = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        db_column='id_evento',
        related_name='grupos',
    )
    id_lider = models.ForeignKey(
        Inscricao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_lider',
        related_name='grupos_liderados',
    )
    nome = models.CharField(max_length=40)
    codigo = models.CharField(max_length=50)
    link_whatsapp_grupo = models.CharField(max_length=255, blank=True)
    origem = models.CharField(
        max_length=50,
        choices=Origem.choices,
        default=Origem.MANUAL,
        blank=True,
    )
    formado_algoritmo = models.BooleanField(default=False)
    max_membros = models.IntegerField(default=5)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'grupo'
        constraints = [
            UniqueConstraint(
                fields=['id_evento', 'nome'],
                name='uniq_grupo_nome_por_evento',
            ),
            UniqueConstraint(
                fields=['id_evento', 'codigo'],
                name='uniq_grupo_codigo_por_evento',
            ),
        ]

    def __str__(self):
        return self.nome


class MembroGrupo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_grupo = models.ForeignKey(
        Grupo,
        on_delete=models.CASCADE,
        db_column='id_grupo',
        related_name='membros',
    )
    id_inscricao = models.ForeignKey(
        Inscricao,
        on_delete=models.CASCADE,
        db_column='id_inscricao',
        related_name='participacoes_grupo',
    )
    is_lider = models.BooleanField(default=False)
    entrou_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'membro_grupo'
        constraints = [
            # Uma inscrição (já única por evento) só pode estar em um grupo.
            UniqueConstraint(
                fields=['id_inscricao'],
                name='uniq_membro_inscricao',
            ),
        ]

    def __str__(self):
        return f'{self.id_inscricao} em {self.id_grupo.nome}'


class SolicitacaoEntrada(models.Model):
    class Status(models.TextChoices):
        PENDENTE = 'pendente', 'Pendente'
        APROVADA = 'aprovada', 'Aprovada'
        RECUSADA = 'recusada', 'Recusada'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_grupo = models.ForeignKey(
        Grupo,
        on_delete=models.CASCADE,
        db_column='id_grupo',
        related_name='solicitacoes',
    )
    id_inscricao = models.ForeignKey(
        Inscricao,
        on_delete=models.CASCADE,
        db_column='id_inscricao',
        related_name='solicitacoes_entrada',
    )
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PENDENTE,
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'solicitacao_entrada'
        constraints = [
            UniqueConstraint(
                fields=['id_grupo', 'id_inscricao'],
                name='uniq_solicitacao_grupo_inscricao',
            ),
        ]

    def __str__(self):
        return f'{self.id_inscricao} -> {self.id_grupo.nome} ({self.status})'
