from django.contrib import admin

from identity.models import ConfiguracoesSistema, Perfil, PerfilPermissao, Permissao


@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display = ('nome', 'descricao')
    search_fields = ('nome',)


@admin.register(Permissao)
class PermissaoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'recurso', 'acao')
    list_filter = ('recurso',)
    search_fields = ('nome', 'recurso', 'acao')


@admin.register(PerfilPermissao)
class PerfilPermissaoAdmin(admin.ModelAdmin):
    list_display = ('id_perfil', 'id_permissao')
    list_filter = ('id_perfil',)


@admin.register(ConfiguracoesSistema)
class ConfiguracoesSistemaAdmin(admin.ModelAdmin):
    list_display = ('nome_plataforma', 'email_suporte', 'modo_manutencao', 'atualizado_em')

