from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from usuarios.models import Avatar, Notificacao, Usuario


class UsuarioCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = Usuario
        fields = ('email', 'nome')


class UsuarioChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = Usuario
        fields = '__all__'


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    add_form = UsuarioCreationForm
    form = UsuarioChangeForm
    list_display = ('email', 'nome', 'id_perfil', 'pais', 'is_active', 'is_staff')
    list_filter = ('id_perfil', 'pais', 'is_active', 'is_staff')
    search_fields = ('email', 'nome')
    ordering = ('email',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Dados pessoais', {'fields': ('nome', 'pais', 'instituicao', 'curso', 'data_nascimento')}),
        ('Jinkoni', {'fields': ('id_perfil', 'email_verificado', 'criado_em')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Datas', {'fields': ('last_login', 'date_joined')}),
    )
    readonly_fields = ('criado_em', 'date_joined', 'last_login')

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nome', 'password1', 'password2', 'id_perfil', 'is_staff', 'is_active'),
        }),
    )


@admin.register(Avatar)
class AvatarAdmin(admin.ModelAdmin):
    list_display = ('nome_usuario', 'id_usuario', 'whatsapp')
    search_fields = ('nome_usuario',)


@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = ('id_usuario', 'tipo', 'lida', 'criado_em')
    list_filter = ('tipo', 'lida')
    search_fields = ('mensagem',)
