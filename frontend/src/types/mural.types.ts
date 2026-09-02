export interface RespostaMural {
  id_resposta: string;
  id_postagem: string;
  id_autor: string | null;
  autor_nome?: string | null;
  autor_id_usuario?: string | null;
  conteudo: string;
  criado_em: string;
}

export interface PostagemMural {
  id_postagem: string;
  id_evento: string;
  id_autor: string | null;
  autor_nome?: string | null;
  autor_id_usuario?: string | null;
  id_grupo?: string | null;
  titulo: string;
  conteudo: string;
  area?: string;
  status: string;
  criado_em: string;
  atualizado_em: string;
  respostas: RespostaMural[];
}

export interface PostagemPayload {
  titulo: string;
  conteudo: string;
  area?: string;
}

export interface RespostaPayload {
  conteudo: string;
}
