from django.urls import path

from atividades.views import (
    AtividadeDetailView,
    AtividadeListCreateView,
    EntregaCorrecaoView,
    EntregaCreateView,
    EntregaDetailView,
    EventoCorrecoesListView,
    EventoDashboardView,
    EventoEntregasPendentesView,
    EventoRankingView,
    GrupoEntregasListView,
)

app_name = 'atividades'

urlpatterns = [
    path(
        'eventos/<uuid:id_evento>/atividades/',
        AtividadeListCreateView.as_view(),
        name='atividade-list',
    ),
    path(
        'atividades/<uuid:id_atividade>/',
        AtividadeDetailView.as_view(),
        name='atividade-detail',
    ),
    path('entregas/', EntregaCreateView.as_view(), name='entrega-create'),
    path(
        'entregas/<uuid:id_entrega>/',
        EntregaDetailView.as_view(),
        name='entrega-detail',
    ),
    path(
        'entregas/<uuid:id_entrega>/correcao/',
        EntregaCorrecaoView.as_view(),
        name='entrega-correcao',
    ),
    path(
        'grupos/<uuid:id_grupo>/entregas/',
        GrupoEntregasListView.as_view(),
        name='grupo-entregas',
    ),
    path(
        'eventos/<uuid:id_evento>/entregas-pendentes/',
        EventoEntregasPendentesView.as_view(),
        name='evento-entregas-pendentes',
    ),
    path(
        'eventos/<uuid:id_evento>/correcoes/',
        EventoCorrecoesListView.as_view(),
        name='evento-correcoes',
    ),
    path(
        'eventos/<uuid:id_evento>/ranking/',
        EventoRankingView.as_view(),
        name='evento-ranking',
    ),
    path(
        'eventos/<uuid:id_evento>/dashboard/',
        EventoDashboardView.as_view(),
        name='evento-dashboard',
    ),
]
