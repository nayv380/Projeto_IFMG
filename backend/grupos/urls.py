from django.urls import path

from grupos.views import (
    EntrarPorCodigoView,
    FormarGruposAlgoritmoView,
    GrupoDetailView,
    GrupoListCreateView,
    MeuGrupoView,
    SairDoGrupoView,
    SolicitacaoEntradaAprovarView,
    SolicitacaoEntradaCreateView,
    SolicitacaoEntradaListView,
    SolicitacoesPendentesLiderView,
)

app_name = 'grupos'

urlpatterns = [
    path('grupos/', GrupoListCreateView.as_view(), name='grupo-list'),
    path('grupos/meu-grupo/', MeuGrupoView.as_view(), name='grupo-meu'),
    path(
        'grupos/entrar-por-codigo/',
        EntrarPorCodigoView.as_view(),
        name='grupo-entrar-codigo',
    ),
    path('grupos/<uuid:id_grupo>/', GrupoDetailView.as_view(), name='grupo-detail'),
    path(
        'grupos/<uuid:id_grupo>/sair/',
        SairDoGrupoView.as_view(),
        name='grupo-sair',
    ),
    path(
        'grupos/<uuid:id_grupo>/solicitacoes/',
        SolicitacaoEntradaListView.as_view(),
        name='solicitacao-list',
    ),
    path('solicitacoes/', SolicitacaoEntradaCreateView.as_view(), name='solicitacao-create'),
    path(
        'solicitacoes/pendentes/',
        SolicitacoesPendentesLiderView.as_view(),
        name='solicitacoes-pendentes-lider',
    ),
    path(
        'solicitacoes/<uuid:id_solicitacao>/aprovar/',
        SolicitacaoEntradaAprovarView.as_view(),
        name='solicitacao-aprovar',
    ),
    path(
        'eventos/<uuid:id_evento>/formar-grupos/',
        FormarGruposAlgoritmoView.as_view(),
        name='formar-grupos',
    ),
]
