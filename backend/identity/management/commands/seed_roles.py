from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from eventos.models import Evento, Inscricao
from grupos.models import Grupo, MembroGrupo
from identity.models import Perfil, PerfilPermissao, Permissao
from usuarios.models import Avatar, Usuario

PERFIS = {
    'participante': 'Participante do hackathon',
    'avaliador': 'Avaliador / juiz das entregas',
    'admin': 'Administrador do sistema',
}

PERMISSOES = [
    ('Criar grupo', 'grupo', 'criar', ['participante', 'admin']),
    ('Submeter entrega', 'entrega', 'submeter', ['participante', 'admin']),
    ('Publicar no mural', 'mural', 'publicar', ['participante', 'avaliador', 'admin']),
    ('Responder no mural', 'mural', 'responder', ['participante', 'avaliador', 'admin']),
    ('Avaliar entrega', 'entrega', 'avaliar', ['avaliador', 'admin']),
    ('Gerenciar usuários', 'usuario', 'gerenciar', ['admin']),
    ('Gerenciar evento', 'evento', 'gerenciar', ['admin']),
]

EVENTO_DEMO_NOME = 'Desafio Jinkoni 2026'
DEMO_LIDER_EMAIL = 'demo.lider@jinkoni.test'
DEMO_MEMBRO_EMAIL = 'demo.membro@jinkoni.test'
DEMO_SENHA = 'demo123456'
DEMO_GRUPO_NOME = 'Time Demo LATINATON'


class Command(BaseCommand):
    help = 'Cria perfis, permissões e um evento de demonstração do Jinkoni'

    def add_arguments(self, parser):
        parser.add_argument(
            '--demo-data',
            action='store_true',
            help='Cria usuários demo, inscrições aprovadas e um grupo de exemplo',
        )

    def handle(self, *args, **options):
        perfis = {}
        for nome, descricao in PERFIS.items():
            perfis[nome], _ = Perfil.objects.get_or_create(
                nome=nome,
                defaults={'descricao': descricao},
            )

        for nome, recurso, acao, perfis_nomes in PERMISSOES:
            permissao, _ = Permissao.objects.get_or_create(
                recurso=recurso,
                acao=acao,
                defaults={'nome': nome},
            )
            for perfil_nome in perfis_nomes:
                PerfilPermissao.objects.get_or_create(
                    id_perfil=perfis[perfil_nome],
                    id_permissao=permissao,
                )

        self.stdout.write(self.style.SUCCESS('Perfis e permissões criados com sucesso.'))
        self._prune_orphan_profiles(set(PERFIS.keys()))
        evento = self._seed_evento_demo()

        if options['demo_data']:
            self._seed_demo_data(evento, perfis['participante'])

    def _prune_orphan_profiles(self, oficiais: set[str]) -> None:
        """Remove perfis fora do seed oficial que não tenham usuários vinculados."""
        for perfil in Perfil.objects.exclude(nome__in=oficiais):
            if Usuario.objects.filter(id_perfil=perfil).exists():
                self.stdout.write(
                    self.style.WARNING(
                        f'Perfil órfão mantido (tem usuários): "{perfil.nome}"'
                    )
                )
                continue
            nome = perfil.nome
            PerfilPermissao.objects.filter(id_perfil=perfil).delete()
            perfil.delete()
            self.stdout.write(self.style.WARNING(f'Perfil órfão removido: "{nome}"'))

    def _seed_evento_demo(self):
        inicio = timezone.now() + timedelta(days=30)
        evento, created = Evento.objects.get_or_create(
            nome=EVENTO_DEMO_NOME,
            defaults={
                'descricao': (
                    'Hackathon oficial LATINATON / Jinkoni 2026. '
                    'Formación de equipos e innovación entre Brasil, Perú y Colombia.'
                ),
                'link_whatsapp_geral': '',
                'data_inicio': inicio,
                'data_fim': inicio + timedelta(days=3),
                'prazo_formacao_grupo': inicio - timedelta(days=5),
                'status': Evento.Status.INSCRICOES_ABERTAS,
            },
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Evento demo criado: "{evento.nome}" ({evento.id_evento})'
                )
            )
        else:
            updated_fields = []
            nova_desc = (
                'Hackathon oficial LATINATON / Jinkoni 2026. '
                'Formación de equipos e innovación entre Brasil, Perú y Colombia.'
            )
            if 'inscrições' in (evento.descricao or '') or not evento.descricao:
                evento.descricao = nova_desc
                updated_fields.append('descricao')
            if evento.status != Evento.Status.INSCRICOES_ABERTAS:
                evento.status = Evento.Status.INSCRICOES_ABERTAS
                updated_fields.append('status')
            if updated_fields:
                evento.save(update_fields=updated_fields)
            self.stdout.write(
                self.style.WARNING(
                    f'Evento demo já existia: "{evento.nome}" ({evento.id_evento})'
                )
            )
        return evento

    def _seed_demo_data(self, evento: Evento, perfil_participante: Perfil):
        lider, lider_created = self._get_or_create_demo_user(
            DEMO_LIDER_EMAIL,
            'Demo Líder',
            perfil_participante,
            'demo_lider',
        )
        membro, membro_created = self._get_or_create_demo_user(
            DEMO_MEMBRO_EMAIL,
            'Demo Membro',
            perfil_participante,
            'demo_membro',
        )

        insc_lider, _ = Inscricao.objects.get_or_create(
            id_usuario=lider,
            id_evento=evento,
            defaults={'status': Inscricao.Status.APROVADA},
        )
        if insc_lider.status != Inscricao.Status.APROVADA:
            insc_lider.status = Inscricao.Status.APROVADA
            insc_lider.save(update_fields=['status'])

        insc_membro, _ = Inscricao.objects.get_or_create(
            id_usuario=membro,
            id_evento=evento,
            defaults={'status': Inscricao.Status.APROVADA},
        )
        if insc_membro.status != Inscricao.Status.APROVADA:
            insc_membro.status = Inscricao.Status.APROVADA
            insc_membro.save(update_fields=['status'])

        grupo = Grupo.objects.filter(id_evento=evento, nome=DEMO_GRUPO_NOME).first()
        if grupo is None:
            grupo = Grupo.objects.create(
                id_evento=evento,
                id_lider=insc_lider,
                nome=DEMO_GRUPO_NOME,
                codigo='DEMO01',
                max_membros=5,
                origem=Grupo.Origem.MANUAL,
            )
            MembroGrupo.objects.create(
                id_grupo=grupo,
                id_inscricao=insc_lider,
                is_lider=True,
            )
            grupo_created = True
        else:
            grupo_created = False

        # Garante que o membro demo está no grupo (idempotente).
        MembroGrupo.objects.get_or_create(
            id_inscricao=insc_membro,
            defaults={'id_grupo': grupo, 'is_lider': False},
        )

        self.stdout.write(self.style.SUCCESS('Dados demo prontos:'))
        self.stdout.write(f'  Evento: {evento.id_evento}')
        self.stdout.write(f'  Líder: {DEMO_LIDER_EMAIL} / senha: {DEMO_SENHA}' + (' (novo)' if lider_created else ''))
        self.stdout.write(f'  Membro: {DEMO_MEMBRO_EMAIL} / senha: {DEMO_SENHA}' + (' (novo)' if membro_created else ''))
        self.stdout.write(f'  Grupo: {grupo.nome} ({grupo.id_grupo})' + (' (novo)' if grupo_created else ''))

    def _get_or_create_demo_user(self, email, nome, perfil, avatar_username):
        user, created = Usuario.objects.get_or_create(
            email=email,
            defaults={
                'nome': nome,
                'id_perfil': perfil,
                'pais': 'BR',
            },
        )
        if created:
            user.set_password(DEMO_SENHA)
            user.save(update_fields=['password'])

        if not Avatar.objects.filter(id_usuario=user).exists():
            username = avatar_username
            if Avatar.objects.filter(nome_usuario=username).exists():
                username = f'{avatar_username}_{str(user.id_usuario)[:8]}'
            Avatar.objects.create(
                id_usuario=user,
                nome_usuario=username,
                biografia='Conta demo do seed',
            )
        return user, created
