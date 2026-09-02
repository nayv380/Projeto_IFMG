# API Auth, Usuários, Atividades e Grupos — guia para o Frontend

Base URL: `http://127.0.0.1:8000/api/v1`  
Auth: header `Authorization: Bearer <access_token>` (JWT do login).

Swagger: [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)

> Eventos e inscrições (fluxo principal): ver [`API_EVENTOS.md`](./API_EVENTOS.md).  
> Este documento cobre o **restante** da API já disponível no backend.

---

## Índice

1. [Auth, perfil e avatar](#1-auth-perfil-e-avatar)
2. [Notificações](#2-notificações)
3. [Admin: usuários e perfis](#3-admin-usuários-e-perfis)
4. [Eventos — extras](#4-eventos--extras)
5. [Atividades](#5-atividades)
6. [Grupos e solicitações](#6-grupos-e-solicitações)
7. [Paginação](#7-paginação)
8. [Fluxos sugeridos](#8-fluxos-sugeridos)

---

## 1. Auth, perfil e avatar

### 1.1 Registro

`POST /auth/registro/`

**Auth:** não  
Atribui o perfil RBAC pedido em `tipo_perfil` (`participante` | `avaliador`).  
Default: `participante`. **Não** permite `admin` (use `POST /usuarios/` como admin).  
Requer `python manage.py seed_roles`.

- `participante` → conta **ativa** imediatamente (pode fazer login).
- `avaliador` → conta criada com `is_active: false` até um admin aprovar (`PATCH /usuarios/{id}/` com `{ "is_active": true }`).
  Listar pendentes: `GET /usuarios/?perfil=avaliador&is_active=false`.

```json
{
  "email": "ana@test.com",
  "password": "senha1234",
  "nome": "Ana Silva",
  "pais": "BR",
  "instituicao": "IFMG",
  "curso": "ADS",
  "data_nascimento": "2002-05-10",
  "tipo_perfil": "participante"
}
```

`password` mínimo 8 caracteres. Campos opcionais: `pais`, `instituicao`, `curso`, `data_nascimento`, `tipo_perfil`.

Resposta inclui `is_active` e `id_perfil`. Para avaliador pendente, `is_active` será `false`.

```ts
await apiClient.post('/auth/registro/', {
  ...payload,
  tipo_perfil: 'avaliador', // ou 'participante'
});
```

---

### 1.2 Login

`POST /auth/login/`

**Auth:** não

```json
{ "email": "ana@test.com", "password": "senha1234" }
```

Resposta:

```json
{
  "access": "<jwt>",
  "refresh": "<jwt>"
}
```

O `access` inclui claims: `email`, `nome`, `perfil` (nome do perfil RBAC).

```ts
const { access, refresh } = await apiClient.post<TokenPair>('/auth/login/', {
  email,
  password,
});
// Guardar access (e refresh) no storage / AuthContext
```

---

### 1.3 Refresh do token

`POST /auth/refresh/`

**Auth:** não

```json
{ "refresh": "<refresh_token>" }
```

Resposta: `{ "access": "<novo_jwt>" }`.

---

### 1.4 Meu usuário (`/auth/me/`)

| Método | Uso |
|--------|-----|
| `GET /auth/me/` | Dados do usuário logado |
| `PATCH /auth/me/` | Atualizar `nome`, `pais`, `instituicao`, `curso`, `data_nascimento` |

**Auth:** sim

Resposta `GET`:

```json
{
  "id_usuario": "...",
  "email": "ana@test.com",
  "nome": "Ana Silva",
  "pais": "BR",
  "instituicao": "IFMG",
  "curso": "ADS",
  "data_nascimento": "2002-05-10",
  "email_verificado": false,
  "is_active": true,
  "id_perfil": {
    "id_perfil": "...",
    "nome": "participante",
    "descricao": "..."
  },
  "criado_em": "2026-07-17T14:00:00-03:00"
}
```

Tipos: `frontend/src/types/auth.types.ts` (`Usuario`, `UsuarioUpdatePayload`).

---

### 1.5 Avatar (`/avatar/me/`)

| Método | Uso |
|--------|-----|
| `GET` | Buscar avatar (404 se ainda não criou) |
| `PUT` / `PATCH` | Criar (1ª vez) ou atualizar |

**Auth:** sim

```json
{
  "nome_usuario": "ana_dev",
  "biografia": "Full-stack",
  "whatsapp": "+5531999999999",
  "config_avatar": { "cor_fundo": "#FFCC00", "estilo": "pixel" }
}
```

`nome_usuario` é único. Tipos: `frontend/src/types/user.types.ts` (`Avatar`).

---

## 2. Notificações

### 2.1 Listar

`GET /notificacoes/`

**Auth:** sim — só as do usuário logado.  
**Paginação:** sim (`results`).

| Campo | Valores |
|-------|---------|
| `tipo` | `email`, `plataforma`, `prazo` |
| `lida` | `true` / `false` |

```ts
const data = await apiClient.get<{ results: Notificacao[] }>('/notificacoes/');
const lista = data.results;
```

### 2.2 Marcar como lida

`PATCH /notificacoes/{id}/marcar-lida/`

Sem body. Resposta: notificação com `lida: true`.

---

## 3. Admin: usuários e perfis

Requer permissão RBAC `usuario.gerenciar` (perfil `admin`). Caso contrário → **403**.

### 3.1 Listar usuários

`GET /usuarios/`

**Query opcional:**

| Param | Exemplo | Descrição |
|-------|---------|-----------|
| `busca` | `ana` | Filtra por nome ou email |
| `perfil` | `participante` | Nome do perfil RBAC |
| `is_active` | `true` / `false` | Ativos / desativados |
| `page` | `1` | Página |

### 3.2 Criar usuário (admin)

`POST /usuarios/`

```json
{
  "email": "juiz@test.com",
  "password": "senha1234",
  "nome": "Avaliador",
  "id_perfil": "UUID-DO-PERFIL",
  "is_active": true
}
```

Se omitir `id_perfil`, usa `participante`.

### 3.3 Detalhe / editar / desativar

| Método | URL | Efeito |
|--------|-----|--------|
| `GET` | `/usuarios/{id_usuario}/` | Detalhe |
| `PATCH` / `PUT` | `/usuarios/{id_usuario}/` | Editar dados, `id_perfil`, `is_active`, `password` (opcional) |
| `DELETE` | `/usuarios/{id_usuario}/` | Soft delete → `is_active=false` (204) |

Não é possível desativar a própria conta por este endpoint (**400**).

### 3.4 Listar perfis RBAC

`GET /perfis/`

**Auth:** admin  
**Paginação:** não (array direto).

```json
[
  { "id_perfil": "...", "nome": "participante", "descricao": "..." },
  { "id_perfil": "...", "nome": "avaliador", "descricao": "..." },
  { "id_perfil": "...", "nome": "admin", "descricao": "..." }
]
```

Útil para selects na tela admin ao criar/editar usuário.

---

## 4. Eventos — extras

Complemento de [`API_EVENTOS.md`](./API_EVENTOS.md):

### 4.1 Excluir evento (admin)

`DELETE /eventos/{id_evento}/`

Requer `evento.gerenciar`. Resposta **204**.

### 4.2 Listar inscrições de um evento (admin)

`GET /eventos/{id_evento}/inscricoes/`

**Query:** `?status=pendente|aprovada|recusada`  
**Paginação:** sim.

```ts
const data = await apiClient.get<{ results: Inscricao[] }>(
  `/eventos/${idEvento}/inscricoes/?status=pendente`,
);
```

### 4.3 Listar participantes do evento (CommunityPage — tab Membros)

`GET /eventos/{id_evento}/participantes/`

**Auth:** inscrição aprovada no evento **ou** admin (`evento.gerenciar`).  
**Paginação:** não (array direto).

**Query:** `?busca=texto` (filtra por nome, `@nome_usuario`, instituição ou curso)  
**Query:** `?status=aprovada` (default; use `pendente`/`recusada` se necessário)

```json
[
  {
    "id_inscricao": "...",
    "id_usuario": "...",
    "nome": "Maria Silva",
    "nome_usuario": "maria.s",
    "instituicao": "UFPR",
    "curso": "Engenharia de Software",
    "status": "aprovada"
  }
]
```

**Não usar** `GET /usuarios/` para a tab Membros — esse endpoint é admin global e retorna paginação DRF.

```ts
const participantes = await apiClient.get<ParticipanteEvento[]>(
  `/eventos/${idEvento}/participantes/`,
);
```

---

## 5. Atividades

CRUD de atividades de um evento. Escrita exige `evento.gerenciar` (admin). Leitura: qualquer autenticado.

### Status / campos

| Campo | Tipo | Notas |
|-------|------|-------|
| `titulo` | string | obrigatório |
| `descricao` | string | opcional |
| `formatos_aceitos` | `string[]` | ex.: `["pdf","zip","pptx"]` (normalizados em minúsculas) |
| `prazo` | ISO datetime | ≤ `data_fim` do evento |
| `ativo` | boolean | default `true` |

> Entregas / correções: ver §5.3.

### 5.1 Listar / criar atividades do evento

`GET /eventos/{id_evento}/atividades/`  
`POST /eventos/{id_evento}/atividades/`

**Paginação no GET:** sim (`results`).

```json
{
  "titulo": "Pitch inicial",
  "descricao": "Envie o deck",
  "formatos_aceitos": ["pdf", "pptx"],
  "prazo": "2026-08-02T23:59:00-03:00",
  "ativo": true
}
```

`id_evento` vem da URL (não precisa no body).

```ts
const data = await apiClient.get<{ results: AtividadeEvento[] }>(
  `/eventos/${idEvento}/atividades/`,
);
const atividades = data.results;

await apiClient.post(`/eventos/${idEvento}/atividades/`, payload);
```

### 5.2 Detalhe / editar / excluir

| Método | URL |
|--------|-----|
| `GET` | `/atividades/{id_atividade}/` |
| `PATCH` / `PUT` | `/atividades/{id_atividade}/` |
| `DELETE` | `/atividades/{id_atividade}/` → **204** |

No update, `id_evento` é read-only.

Tipos: `frontend/src/types/activity.types.ts` (`AtividadeEvento`).

### 5.3 Entregas e correções (Épico 4)

**Regra:** 1 entrega por par `(atividade, grupo)`.  
**Avaliador:** precisa de inscrição **aprovada** no evento + permissão `entrega.avaliar`.

#### Enviar entrega

`POST /entregas/`

```json
{
  "id_atividade": "UUID",
  "id_grupo": "UUID",
  "url_arquivo": "https://github.com/equipe/projeto"
}
```

Requer: membro do grupo, inscrição aprovada, atividade ativa, prazo válido.  
Resposta inclui `status: enviada` e `enviado_por` (id da inscrição).

```ts
await apiClient.post<Entrega>('/entregas/', payload);
```

#### Listar / detalhe

`GET /grupos/{id_grupo}/entregas/` — array direto (sem paginação)  
`GET /entregas/{id_entrega}/`

#### Correção

`GET /entregas/{id}/correcao/` — **404** se ainda não houver  
`POST /entregas/{id}/correcao/` — avaliador inscrito no evento

```json
{ "nota": 8.5, "feedback": "Bom trabalho" }
```

Ao criar, a entrega passa a `status: corrigida`.  
`PATCH /entregas/{id}/correcao/` — autor ou admin (`validado_por_admin` só admin).

```ts
const entregas = await apiClient.get<Entrega[]>(`/grupos/${idGrupo}/entregas/`);
const correcao = await apiClient.get<Correcao>(`/entregas/${idEntrega}/correcao/`);
```

---

## 6. Grupos e solicitações

Pré-requisito: inscrição **`aprovada`** no evento.  
Uma inscrição só pode estar em **um** grupo.

### Status / origem

#### Solicitação (`status`)

| Valor | Significado |
|-------|-------------|
| `pendente` | Aguardando o líder |
| `aprovada` | Entrou no grupo |
| `recusada` | Negada pelo líder |

> No FE antigo pode aparecer `aceita` — o backend usa **`aprovada`**.

#### Grupo (`origem`)

| Valor |
|-------|
| `manual` |
| `algoritmo` |

`codigo` é gerado pelo backend (não enviar no create).  
`max_membros` default `5`.

### 6.1 Listar / criar grupos

`GET /grupos/?evento={id_evento}`  
`POST /grupos/`

**Paginação:** não (array direto no list).

```json
{
  "id_evento": "UUID-DO-EVENTO",
  "nome": "Time Verde",
  "link_whatsapp_grupo": "https://chat.whatsapp.com/...",
  "max_membros": 4,
  "origem": "manual"
}
```

Regras no create:
- Inscrição aprovada no evento
- Ainda não ser membro de outro grupo
- Dentro do `prazo_formacao_grupo` (se o evento tiver prazo)
- Cria o grupo + adiciona o usuário como líder (`is_lider: true`)

Resposta do create inclui `membros_count` e `membros` com dados do usuário:

```json
{
  "id_grupo": "...",
  "nome": "Time Verde",
  "codigo": "A1B2C3",
  "id_lider": "UUID-INSCRICAO",
  "membros_count": 1,
  "membros": [
    {
      "id": "...",
      "id_inscricao": "...",
      "id_usuario": "...",
      "nome": "Maria Silva",
      "nome_usuario": "maria.s",
      "is_lider": true,
      "entrou_em": "..."
    }
  ]
}
```

Cada item em `GET /grupos/` também traz `membros_count`.

```ts
const grupos = await apiClient.get<Grupo[]>(`/grupos/?evento=${idEvento}`);
const criado = await apiClient.post<GrupoDetail>('/grupos/', payload);
```

### 6.2 Meu grupo no evento

`GET /grupos/meu-grupo/?evento={id_evento}`

**Auth:** inscrição aprovada no evento. Sem grupo → resposta `null` (**200**). Sem inscrição → **403**.

Retorna `GrupoDetail` (igual ao detalhe) ou `null`.

```ts
const meuGrupo = await apiClient.get<GrupoDetail | null>(
  `/grupos/meu-grupo/?evento=${idEvento}`,
);
```

### 6.3 Detalhe do grupo

`GET /grupos/{id_grupo}/`

Inclui `membros_count` e lista `membros` com `id_usuario`, `nome`, `nome_usuario`, `is_lider`, `entrou_em`.

### 6.4 Solicitar entrada

`POST /solicitacoes/`

```json
{ "id_grupo": "UUID-DO-GRUPO" }
```

Backend define `id_inscricao` e `status: pendente`.

Erros comuns (**400**):
- Sem inscrição aprovada
- Já está em um grupo
- Grupo cheio (`max_membros`)
- Já existe solicitação para esse grupo
- Prazo de formação encerrado

### 6.5 Listar solicitações pendentes (líder)

`GET /grupos/{id_grupo}/solicitacoes/`

**Auth:** líder do grupo. Outros → **403**.

```json
[
  {
    "id": "...",
    "id_inscricao": "...",
    "nome_usuario": "Maria",
    "status": "pendente",
    "criado_em": "..."
  }
]
```

### 6.6 Aprovar / recusar solicitação (líder)

`PATCH /solicitacoes/{id_solicitacao}/aprovar/`

```json
{ "status": "aprovada" }
```

ou `"recusada"`.

Se `aprovada`: cria `MembroGrupo` (respeita cupo).  
Se já processada → **400**.

Tipos: `frontend/src/types/group.types.ts` — alinhar `SolicitacaoEntradaStatus` para `'pendente' | 'aprovada' | 'recusada'`.

---

## 7. Paginação

Endpoints **com** paginação DRF (`count` / `next` / `previous` / `results`):

- `GET /usuarios/`
- `GET /notificacoes/`
- `GET /eventos/.../atividades/`
- `GET /eventos/.../inscricoes/`
- (e as listagens de eventos/inscrições em `API_EVENTOS.md`)

Endpoints **sem** paginação (array direto):

- `GET /perfis/`
- `GET /grupos/`
- `GET /grupos/meu-grupo/` (objeto ou `null`)
- `GET /eventos/{id}/participantes/`
- `GET /grupos/{id}/entregas/`
- `GET /grupos/{id}/solicitacoes/`

Helper sugerido:

```ts
function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}
```

---

## 8. Fluxos sugeridos

### Auth + perfil

```
1. POST /auth/registro/
2. POST /auth/login/ → guardar access (+ refresh)
3. GET /auth/me/
4. PUT/PATCH /avatar/me/ (opcional)
5. GET /notificacoes/ → badge no sino
```

### Atividades (admin + participante)

```
1. Admin: POST /eventos/{id}/atividades/
2. Participante: GET /eventos/{id}/atividades/ → tela Activities & Score
3. POST /entregas/ → enviar link
4. GET /grupos/{id}/entregas/
5. Avaliador (inscrito no evento): POST /entregas/{id}/correcao/
```

### Grupos (comunidade)

```
1. Inscrição aprovada no evento (API_EVENTOS)
2. POST /grupos/  OU  GET /grupos/?evento=... → escolher
3. POST /solicitacoes/ { id_grupo }
4. Líder: GET /grupos/{id}/solicitacoes/
5. Líder: PATCH /solicitacoes/{id}/aprovar/ { status: "aprovada" | "recusada" }
6. GET /grupos/{id}/ → membros atualizados
```

Checklist UI:
- [ ] Só mostrar “Criar / entrar em grupo” se inscrição `aprovada`
- [ ] Desabilitar ações se passou `prazo_formacao_grupo`
- [ ] Badge de líder vs membro
- [ ] Usar `aprovada`/`recusada` (não `aceita`)
- [ ] Unwrap `results` onde houver paginação
- [ ] Tratar 401 (token), 403 (permissão), 400 (`detail` / campos)

---

## Permissões (RBAC) — resumo

| Ação | Quem |
|------|------|
| Registro / login | Público |
| Me / avatar / notificações | Autenticado (próprios dados) |
| CRUD usuários / listar perfis | Admin (`usuario.gerenciar`) |
| CRUD eventos / atividades / aprovar inscrição | Admin (`evento.gerenciar`) |
| Criar grupo / solicitar entrada | Autenticado com inscrição `aprovada` |
| Ver/aprovar solicitações do grupo | Líder do grupo |

Garantir `python manage.py seed_roles` no ambiente.

---

## Documentação relacionada

| Arquivo | Conteúdo |
|---------|----------|
| [`API_EVENTOS.md`](./API_EVENTOS.md) | Eventos + inscrições (fluxo base) |
| Este arquivo | Auth, usuários, atividades, grupos |
| Swagger | `/api/docs/` — contrato vivo |
| Backend README | Tabela completa de endpoints |
