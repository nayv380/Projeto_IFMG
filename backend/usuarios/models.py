import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from usuarios.managers import UsuarioManager


class Usuario(AbstractUser):
    id_usuario = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    # AbstractUser traz first_name/last_name; o projeto usa só `nome`.
    first_name = None
    last_name = None

    nome = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    pais = models.CharField(max_length=100, blank=True)
    instituicao = models.CharField(max_length=255, blank=True)
    curso = models.CharField(max_length=255, blank=True)
    data_nascimento = models.DateField(null=True, blank=True)
    email_verificado = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    id_perfil = models.ForeignKey(
        'identity.Perfil',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='id_perfil',
        related_name='usuarios',
    )

    objects = UsuarioManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    class Meta:
        db_table = 'usuario'
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return self.nome or self.email


class Avatar(models.Model):
    id_avatar = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='avatar',
    )
    nome_usuario = models.CharField(max_length=100, unique=True)
    biografia = models.TextField(blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    config_avatar = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'avatar'

    def __str__(self):
        return self.nome_usuario


class Notificacao(models.Model):
    class Tipo(models.TextChoices):
        EMAIL = 'email', 'E-mail'
        PLATAFORMA = 'plataforma', 'Plataforma'
        PRAZO = 'prazo', 'Prazo'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='notificacoes',
    )
    tipo = models.CharField(max_length=50, choices=Tipo.choices)
    mensagem = models.TextField()
    link_extra = models.URLField(max_length=500, blank=True)
    lida = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificacao'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.tipo} - {self.id_usuario.nome}'
