from django.contrib import admin

from atividades.models import AtividadeEvento, Correcao, Entrega


@admin.register(AtividadeEvento)
class AtividadeEventoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'id_evento', 'prazo', 'ativo')
    list_filter = ('ativo',)
    search_fields = ('titulo',)


@admin.register(Entrega)
class EntregaAdmin(admin.ModelAdmin):
    list_display = ('id_grupo', 'id_atividade', 'status', 'enviado_em')
    list_filter = ('status',)


@admin.register(Correcao)
class CorrecaoAdmin(admin.ModelAdmin):
    list_display = ('id_entrega', 'id_avaliador', 'nota', 'validado_por_admin', 'corrigido_em')
    list_filter = ('validado_por_admin',)
