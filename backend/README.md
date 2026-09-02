# Jinkoni 2026 — Backend

Plataforma web do Desafio Jinkoni.
Stack: **Django 6** + **MySQL**.

## Pré-requisitos

- Python 3.11+
- MySQL 8 instalado e **em execução**
- MySQL Workbench 

## 1. Conectar ao MySQL (Workbench)

### Erro comum: "Unable to connect to 127.0.0.1:3306"

Significa que o **servidor MySQL não está rodando** ou não está instalado.

**Windows — verificar o serviço:**

1. Abra `services.msc` (Win + R → digite `services.msc`)
2. Procure **MySQL80** ou **MySQL** na lista
3. Se estiver **Parado** → clique direito → **Iniciar**
4. Se não existir → instale o [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)

**Criar a base de dados** (aba SQL no Workbench):

```sql
CREATE DATABASE IF NOT EXISTS plataforma_eventos_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

## 2. Setup do projeto

```bash
cd Desafio-1-Hackaton---BackEnd
python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

Copie o ficheiro de ambiente:

```bash
cp .env.example .env
```

Edite `.env` com a sua password do MySQL:

```env
DB_PASSWORD=sua_password_aqui
```

## 3. Migrações (base de dados)

> Se já tinhas tabelas antigas, apaga a BD e recria-a com o SQL acima antes de migrar.

```bash
python manage.py makemigrations identity usuarios eventos grupos atividades mural
python manage.py migrate
python manage.py seed_roles
python manage.py createsuperuser
```

## 4. Correr o servidor

```bash
python manage.py runserver
```

Admin: http://127.0.0.1:8000/admin/

## 5. API REST 

Documentação Swagger: http://127.0.0.1:8000/api/docs/

### Endpoints disponíveis

| Método | URL | Descrição | Auth |
|--------|-----|-----------|------|
| `POST` | `/api/v1/auth/registro/` | Criar conta (`tipo_perfil`: `participante` \| `avaliador`) | Não |
| `POST` | `/api/v1/auth/login/` | Login → retorna `access` + `refresh` JWT | Não |
| `POST` | `/api/v1/auth/refresh/` | Renovar token de acesso | Não |
| `GET` | `/api/v1/auth/me/` | Dados do usuário logado | Sim |
| `PATCH` | `/api/v1/auth/me/` | Atualizar dados pessoais | Sim |
| `GET` | `/api/v1/avatar/me/` | Meu avatar | Sim |
| `PUT/PATCH` | `/api/v1/avatar/me/` | Criar ou editar avatar | Sim |
| `GET` | `/api/v1/notificacoes/` | Minhas notificações | Sim |
| `PATCH` | `/api/v1/notificacoes/{id}/marcar-lida/` | Marcar como lida | Sim |
| `GET` | `/api/v1/eventos/` | Listar eventos (`?status=&busca=`) | Sim |
| `POST` | `/api/v1/eventos/` | Criar evento | Admin |
| `GET` | `/api/v1/eventos/{id}/` | Detalhe do evento | Sim |
| `PUT/PATCH` | `/api/v1/eventos/{id}/` | Editar evento | Admin |
| `DELETE` | `/api/v1/eventos/{id}/` | Excluir evento | Admin |
| `GET` | `/api/v1/eventos/{id}/inscricoes/` | Listar inscrições do evento (`?status=`) | Admin |
| `POST` | `/api/v1/inscricoes/` | Inscrever-se (`{ id_evento }`) | Sim |
| `GET` | `/api/v1/inscricoes/minhas/` | Minhas inscrições | Sim |
| `PATCH` | `/api/v1/inscricoes/{id}/aprovar/` | Aprovar/recusar | Admin |
| `GET` | `/api/v1/eventos/{id}/atividades/` | Listar atividades do evento | Sim |
| `POST` | `/api/v1/eventos/{id}/atividades/` | Criar atividade | Admin |
| `GET` | `/api/v1/atividades/{id}/` | Detalhe da atividade | Sim |
| `PUT/PATCH` | `/api/v1/atividades/{id}/` | Editar atividade | Admin |
| `DELETE` | `/api/v1/atividades/{id}/` | Excluir atividade | Admin |
| `POST` | `/api/v1/entregas/` | Enviar entrega (1 por atividade/grupo) | Membro do grupo |
| `GET` | `/api/v1/entregas/{id}/` | Detalhe da entrega | Membro / avaliador inscrito / admin |
| `GET` | `/api/v1/grupos/{id}/entregas/` | Listar entregas do grupo | Membro / avaliador inscrito / admin |
| `GET` | `/api/v1/entregas/{id}/correcao/` | Obter correção (404 se não houver) | Membro / avaliador / admin |
| `POST` | `/api/v1/entregas/{id}/correcao/` | Criar correção | Avaliador com inscrição aprovada |
| `PATCH` | `/api/v1/entregas/{id}/correcao/` | Atualizar correção | Autor ou admin |
| `GET` | `/api/v1/usuarios/` | Listar usuários (`?busca=&perfil=&is_active=`) | Admin |
| `POST` | `/api/v1/usuarios/` | Criar usuário | Admin |
| `GET` | `/api/v1/usuarios/{id}/` | Detalhe do usuário | Admin |
| `PUT/PATCH` | `/api/v1/usuarios/{id}/` | Editar usuário (perfil, ativo, senha…) | Admin |
| `DELETE` | `/api/v1/usuarios/{id}/` | Desativar usuário (`is_active=false`) | Admin |
| `GET` | `/api/v1/perfis/` | Listar perfis RBAC | Admin |
| `GET` | `/api/v1/grupos/` | Listar grupos (`?evento=`) | Sim |
| `GET` | `/api/v1/grupos/meu-grupo/` | Meu grupo no evento (`?evento=`) | Sim (inscrição aprovada) |
| `POST` | `/api/v1/grupos/` | Criar grupo (inscrição aprovada) | Sim |
| `GET` | `/api/v1/grupos/{id}/` | Detalhe do grupo + membros | Sim |
| `POST` | `/api/v1/solicitacoes/` | Solicitar entrada (`{ id_grupo }`) | Sim |
| `GET` | `/api/v1/grupos/{id}/solicitacoes/` | Solicitações pendentes | Líder |
| `PATCH` | `/api/v1/solicitacoes/{id}/aprovar/` | Aprovar/recusar (`aprovada`/`recusada`) | Líder |
| `GET` | `/api/v1/eventos/{id}/participantes/` | Participantes do evento (`?busca=&status=`) | Inscrito aprovado ou admin |

Documentação detalhada para o frontend:
- Eventos/inscrições: `frontend/docs/API_EVENTOS.md`
- Auth, usuários, atividades, grupos: `frontend/docs/API_FRONTEND.md`

### Exemplo: registro + login

```bash
# 1. Registro (antes: python manage.py seed_roles)
# tipo_perfil opcional: participante (default) ou avaliador — nunca admin
curl -X POST http://127.0.0.1:8000/api/v1/auth/registro/ \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@test.com","password":"senha1234","nome":"Ana Silva","pais":"BR","tipo_perfil":"participante"}'

# Registro como avaliador
curl -X POST http://127.0.0.1:8000/api/v1/auth/registro/ \
  -H "Content-Type: application/json" \
  -d '{"email":"juiz@test.com","password":"senha1234","nome":"Juiz","tipo_perfil":"avaliador"}'

# 2. Login
curl -X POST http://127.0.0.1:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@test.com","password":"senha1234"}'

# 3. Usar o access token
curl http://127.0.0.1:8000/api/v1/auth/me/ \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

> **Importante:** execute `seed_roles` antes do primeiro registro.  
> No registro público, `tipo_perfil` pode ser `participante` (ativo na hora) ou `avaliador` (`is_active=false` até o admin aprovar via `PATCH /usuarios/{id}/`). Contas `admin` só via painel admin.  
> Pendentes: `GET /usuarios/?perfil=avaliador&is_active=false`.

## Estrutura das apps

| App | Responsabilidade |
|-----|------------------|
| `identity` | RBAC: Perfil, Permissao, PerfilPermissao |
| `usuarios` | User custom (AbstractUser), Avatar, Notificacao |
| `eventos` | Evento, Inscricao |
| `grupos` | Grupo, MembroGrupo, SolicitacaoEntrada |
| `atividades` | AtividadeEvento, Entrega, Correcao |
| `mural` | PostagemMural, RespostaMural |

## Permissões RBAC

```python
from identity.permissions import usuario_tem_permissao

if usuario_tem_permissao(request.user, 'entrega', 'avaliar'):
    # usuário pode avaliar
    ...
```

## Comandos úteis

```bash
python manage.py seed_roles          # perfis, permissões + evento demo
python manage.py seed_roles --demo-data   # + usuários/grupo demo para testes
python manage.py createsuperuser     # admin do Django
python manage.py runserver           # servidor de desenvolvimento
```

## Perfis padrão (seed_roles)

- `participante` — criar grupo, submeter entrega, publicar no mural
- `avaliador` — avaliar entregas, responder no mural
- `admin` — gestão completa

Também cria (se não existir) o evento demo **Desafio Jinkoni 2026** com status `inscricoes_abertas`.

Com `--demo-data`:
- `demo.lider@jinkoni.test` / `demo123456` (líder do grupo demo)
- `demo.membro@jinkoni.test` / `demo123456` (membro do Time Demo)
- Grupo **Time Demo LATINATON** no evento demo