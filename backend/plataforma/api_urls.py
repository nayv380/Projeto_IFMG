from django.urls import include, path

urlpatterns = [
    path('', include('usuarios.urls')),
    path('', include('identity.urls')),
    path('', include('eventos.urls')),
    path('', include('atividades.urls')),
    path('', include('grupos.urls')),
    path('', include('mural.urls')),
]
