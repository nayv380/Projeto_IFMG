# API Eventos e Inscrições — guia para o Frontend

Base URL: `http://127.0.0.1:8000/api/v1`  
Auth: header `Authorization: Bearer <access_token>` (JWT do login).

Swagger: [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)

> Auth, usuários, atividades e grupos: ver [`API_FRONTEND.md`](./API_FRONTEND.md).

---

## Status possíveis

### Evento (`status`)

| Valor | Significado |
|-------|-------------|
| `planejado` | Criado, ainda sem inscrição |
| `inscricoes_abertas` | Participantes podem se inscrever |
| `em_andamento` | Evento em curso |
| `finalizado` | Encerrado |

### Inscrição (`status`)

| Valor | Significado |
|-------|-------------|
| `pendente` | Aguardando aprovação do admin |
| `aprovada` | Aceita |
| `recusada` | Negada |

> Só é possível se inscrever se o evento estiver em `inscricoes_abertas`.

---

## Paginação

Listagens DRF devolvem:

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [ /* itens */ ]
}
```

No frontend, use `data.results` (não o objeto inteiro).

---

## Endpoints

### 1. Listar eventos

`GET /eventos/`

**Auth:** sim (qualquer perfil autenticado)  
**Query opcional:**

| Param | Exemplo | Descrição |
|-------|---------|-----------|
| `status` | `inscricoes_abertas` | Filtra por status |
| `busca` | `jinkoni` | Busca no nome (`icontains`) |
| `page` | `1` | Página |

```bash
curl http://127.0.0.1:8000/api/v1/eventos/ \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

```ts
const data = await apiClient.get<{ results: Evento[] }>('/eventos/');
const eventos = data.results;
```

---

### 2. Detalhe do evento

`GET /eventos/{id_evento}/`

```bash
curl http://127.0.0.1:8000/api/v1/eventos/UUID/ \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

```ts
const evento = await apiClient.get<Evento>(`/eventos/${idEvento}/`);
```

---

### 3. Criar evento (só admin)

`POST /eventos/`

Requer permissão RBAC `evento.gerenciar`.

```json
{
  "nome": "Desafio Jinkoni 2026",
  "descricao": "Hackathon internacional",
  "link_whatsapp_geral": "https://chat.whatsapp.com/...",
  "data_inicio": "2026-08-01T09:00:00-03:00",
  "data_fim": "2026-08-03T18:00:00-03:00",
  "prazo_formacao_grupo": "2026-07-28T23:59:00-03:00",
  "status": "inscricoes_abertas"
}
```

Regras:
- `data_fim` > `data_inicio`
- `prazo_formacao_grupo` ≤ `data_inicio` (se enviado)

Participante recebe **403**.

---

### 4. Atualizar evento (só admin)

`PATCH /eventos/{id_evento}/` ou `PUT /eventos/{id_evento}/`

```json
{ "status": "em_andamento" }
```

---

### 5. Inscrever-se

`POST /inscricoes/`

**Auth:** participante (ou qualquer autenticado)  
**Body:**

```json
{ "id_evento": "UUID-DO-EVENTO" }
```

O backend define automaticamente:
- `id_usuario` = usuário logado
- `status` = `pendente`

```ts
await apiClient.post<Inscricao>('/inscricoes/', { id_evento: idEvento });
```

Erros comuns:
- `400` — evento sem `inscricoes_abertas`
- `400` — já inscrito (`uniq_inscricao_usuario_evento`)

---

### 6. Minhas inscrições

`GET /inscricoes/minhas/`

```ts
const data = await apiClient.get<{ results: Inscricao[] }>('/inscricoes/minhas/');
const minhas = data.results;
```

Resposta (item):

```json
{
  "id_inscricao": "...",
  "id_usuario": "...",
  "id_evento": "...",
  "status": "pendente",
  "aprovado_por": null,
  "criado_em": "2026-07-17T14:00:00-03:00"
}
```

---

### 7. Aprovar / recusar inscrição (só admin)

`PATCH /inscricoes/{id_inscricao}/aprovar/`

```json
{ "status": "aprovada" }
```

ou `"recusada"`. Preenche `aprovado_por` com o admin.

---

## Fluxo sugerido no Frontend

```
1. Login → guardar JWT
2. GET /eventos/?status=inscricoes_abertas
3. Usuário escolhe evento → GET /eventos/:id/
4. POST /inscricoes/ { id_evento }
5. GET /inscricoes/minhas/ → mostrar status (pendente/aprovada)
6. (Admin) PATCH /inscricoes/:id/aprovar/ { status: "aprovada" }
```

Checklist UI:
- [ ] Desabilitar botão “Inscrever” se `status !== 'inscricoes_abertas'`
- [ ] Desabilitar se já existe inscrição em `minhas`
- [ ] Mostrar badge de status da inscrição
- [ ] Tratar `results` da paginação
- [ ] Spinner + mensagem de erro da API (`detail` ou campo)

---

## Tipos TypeScript (já no projeto)

Alinhados com o backend em `frontend/src/types/event.types.ts`:

```ts
export type EventoStatus =
  | 'planejado'
  | 'inscricoes_abertas'
  | 'em_andamento'
  | 'finalizado';

export type InscricaoStatus = 'pendente' | 'aprovada' | 'recusada';
```

Atualize o `eventService` para unwrap de `results`:

```ts
async listarEventos(): Promise<Evento[]> {
  const data = await apiClient.get<Evento[] | { results: Evento[] }>('/eventos/');
  return Array.isArray(data) ? data : (data.results ?? []);
},

async minhasInscricoes(): Promise<Inscricao[]> {
  const data = await apiClient.get<Inscricao[] | { results: Inscricao[] }>('/inscricoes/minhas/');
  return Array.isArray(data) ? data : (data.results ?? []);
},
```

---

## Permissões (RBAC)

| Ação | Quem |
|------|------|
| Listar / ver evento | Qualquer autenticado |
| Criar / editar evento | Admin (`evento.gerenciar`) |
| Inscrever-se | Qualquer autenticado |
| Aprovar inscrição | Admin (`evento.gerenciar`) |

Garantir `python manage.py seed_roles` no ambiente.

---

## Exemplo completo (curl)

```bash
# Login
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@test.com","password":"senha1234"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access'])")

# Listar
curl -s http://127.0.0.1:8000/api/v1/eventos/ -H "Authorization: Bearer $TOKEN"

# Inscrever
curl -s -X POST http://127.0.0.1:8000/api/v1/inscricoes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id_evento":"UUID-AQUI"}'

# Minhas
curl -s http://127.0.0.1:8000/api/v1/inscricoes/minhas/ \
  -H "Authorization: Bearer $TOKEN"
```
