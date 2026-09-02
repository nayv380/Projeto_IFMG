from django.urls import path

from mural.views import (
    MuralDetailView,
    MuralListCreateView,
    MuralRespostaCreateView,
    MuralRespostaDeleteView,
)

app_name = 'mural'

urlpatterns = [
    path(
        'eventos/<uuid:id_evento>/mural/',
        MuralListCreateView.as_view(),
        name='mural-list',
    ),
    path('mural/<uuid:id_postagem>/', MuralDetailView.as_view(), name='mural-detail'),
    path(
        'mural/<uuid:id_postagem>/respostas/',
        MuralRespostaCreateView.as_view(),
        name='mural-resposta-create',
    ),
    path(
        'mural/respostas/<uuid:id_resposta>/',
        MuralRespostaDeleteView.as_view(),
        name='mural-resposta-delete',
    ),
]
