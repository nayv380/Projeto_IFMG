export interface AtividadeEvento {
  id_atividade: string;
  id_evento: string;
  titulo: string;
  descricao: string;
  formatos_aceitos: string[];
  prazo: string;
  ativo: boolean;
}

export type EntregaStatus = 'enviada' | 'em_correcao' | 'corrigida' | string;

export interface Entrega {
  id_entrega: string;
  id_atividade: string;
  id_grupo: string;
  enviado_por: string | null;
  url_arquivo: string;
  status: EntregaStatus;
  enviado_em: string;
}

export interface EntregaPayload {
  id_atividade: string;
  id_grupo: string;
  url_arquivo: string;
}

export interface Correcao {
  id_correcao: string;
  id_entrega: string;
  id_avaliador: string | null;
  nota: number;
  feedback: string;
  validado_por_admin: boolean;
  corrigido_em: string;
  /** Campos enriquecidos pelo endpoint de listagem admin */
  grupo_nome?: string;
  atividade_titulo?: string;
  avaliador_nome?: string;
}
