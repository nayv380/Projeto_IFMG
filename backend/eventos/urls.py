from django.urls import path

from eventos.views import (
    EventoDetailView,
    EventoInscricoesListView,
    EventoListCreateView,
    EventoParticipantesListView,
    InscricaoAprovarView,
    InscricaoCancelarView,
    InscricaoCreateView,
    MinhasInscricoesView,
)

app_name = 'eventos'

urlpatterns = [
    path('eventos/', EventoListCreateView.as_view(), name='evento-list'),
    path('eventos/<uuid:id_evento>/', EventoDetailView.as_view(), name='evento-detail'),
    path(
        'eventos/<uuid:id_evento>/inscricoes/',
        EventoInscricoesListView.as_view(),
        name='evento-inscricoes',
    ),
    path(
        'eventos/<uuid:id_evento>/participantes/',
        EventoParticipantesListView.as_view(),
        name='evento-participantes',
    ),
    path('inscricoes/', InscricaoCreateView.as_view(), name='inscricao-create'),
    path('inscricoes/minhas/', MinhasInscricoesView.as_view(), name='inscricao-minhas'),
    path(
        'inscricoes/<uuid:id_inscricao>/aprovar/',
        InscricaoAprovarView.as_view(),
        name='inscricao-aprovar',
    ),
    path(
        'inscricoes/<uuid:id_inscricao>/cancelar/',
        InscricaoCancelarView.as_view(),
        name='inscricao-cancelar',
    ),
]
