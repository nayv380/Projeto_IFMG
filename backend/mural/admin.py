from django.contrib import admin

from mural.models import PostagemMural, RespostaMural


@admin.register(PostagemMural)
class PostagemMuralAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'id_evento', 'id_autor', 'area', 'status', 'criado_em')
    list_filter = ('status', 'area')
    search_fields = ('titulo', 'conteudo')


@admin.register(RespostaMural)
class RespostaMuralAdmin(admin.ModelAdmin):
    list_display = ('id_postagem', 'id_autor', 'criado_em')
    search_fields = ('conteudo',)
