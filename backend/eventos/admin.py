from django.contrib import admin

from eventos.models import Evento, Inscricao


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'data_inicio', 'data_fim', 'max_membros_grupo', 'status')
    list_filter = ('status',)
    search_fields = ('nome',)
    ordering = ('-data_inicio',)


@admin.register(Inscricao)
class InscricaoAdmin(admin.ModelAdmin):
    list_display = ('id_usuario', 'id_evento', 'status', 'aprovado_por', 'criado_em')
    list_filter = ('status',)
    search_fields = ('id_usuario__nome', 'id_usuario__email', 'id_evento__nome')
    autocomplete_fields = ('id_usuario', 'id_evento', 'aprovado_por')
