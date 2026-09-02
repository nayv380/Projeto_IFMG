import uuid

from django.db import models


class Perfil(models.Model):
    id_perfil = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=50, unique=True)
    descricao = models.TextField(blank=True)

    class Meta:
        db_table = 'perfil'
        verbose_name = 'Perfil'
        verbose_name_plural = 'Perfis'

    def __str__(self):
        return self.nome


class Permissao(models.Model):
    id_permissao = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=100, unique=True)
    recurso = models.CharField(max_length=50)
    acao = models.CharField(max_length=50)

    class Meta:
        db_table = 'permissao'
        verbose_name = 'Permissão'
        verbose_name_plural = 'Permissões'
        unique_together = [('recurso', 'acao')]

    def __str__(self):
        return f'{self.recurso}.{self.acao}'


class PerfilPermissao(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_perfil = models.ForeignKey(
        Perfil,
        on_delete=models.CASCADE,
        db_column='id_perfil',
        related_name='permissoes',
    )
    id_permissao = models.ForeignKey(
        Permissao,
        on_delete=models.CASCADE,
        db_column='id_permissao',
        related_name='perfis',
    )

    class Meta:
        db_table = 'perfil_permissao'
        verbose_name = 'Permissão do Perfil'
        verbose_name_plural = 'Permissões dos Perfis'
        unique_together = [('id_perfil', 'id_permissao')]

    def __str__(self):
        return f'{self.id_perfil.nome} → {self.id_permissao.nome}'


class ConfiguracoesSistema(models.Model):
    """Singleton de configurações básicas da plataforma (Épico 7)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome_plataforma = models.CharField(max_length=120, default='Jinkoni 2026')
    email_suporte = models.EmailField(blank=True, default='')
    paises_participantes = models.JSONField(default=list, blank=True)
    modo_manutencao = models.BooleanField(default=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'configuracoes_sistema'
        verbose_name = 'Configurações do Sistema'
        verbose_name_plural = 'Configurações do Sistema'

    def __str__(self):
        return self.nome_plataforma

    @classmethod
    def get_solo(cls):
        obj = cls.objects.first()
        if obj is None:
            obj = cls.objects.create(
                paises_participantes=['BR', 'PE', 'CO'],
            )
        return obj
