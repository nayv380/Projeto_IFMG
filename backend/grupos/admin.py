from django.contrib import admin

from grupos.models import Grupo, MembroGrupo, SolicitacaoEntrada


@admin.register(Grupo)
class GrupoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'codigo', 'id_evento', 'formado_algoritmo', 'max_membros')
    list_filter = ('formado_algoritmo', 'origem')
    search_fields = ('nome', 'codigo')


@admin.register(MembroGrupo)
class MembroGrupoAdmin(admin.ModelAdmin):
    list_display = ('id_grupo', 'id_inscricao', 'is_lider', 'entrou_em')
    list_filter = ('is_lider',)


@admin.register(SolicitacaoEntrada)
class SolicitacaoEntradaAdmin(admin.ModelAdmin):
    list_display = ('id_grupo', 'id_inscricao', 'status', 'criado_em')
    list_filter = ('status',)
