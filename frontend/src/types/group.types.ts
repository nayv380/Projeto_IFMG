export type SolicitacaoEntradaStatus = 'pendente' | 'aprovada' | 'recusada' | string;

export interface Grupo {
  id_grupo: string;
  id_evento: string;
  id_lider: string | null;
  nome: string;
  codigo: string;
  link_whatsapp_grupo: string;
  origem: string;
  formado_algoritmo: boolean;
  max_membros: number;
  criado_em: string;
  descricao?: string;
  membros?: MembroGrupo[];
  membros_count?: number;
}

export interface GrupoPayload {
  id_evento: string;
  nome: string;
  link_whatsapp_grupo?: string;
}

export interface MembroGrupo {
  id: string;
  id_inscricao: string;
  id_usuario: string;
  nome: string;
  nome_usuario: string;
  is_lider: boolean;
  entrou_em: string;
  habilidade?: string;
}

export interface SolicitacaoEntrada {
  id: string;
  id_grupo: string;
  id_inscricao: string;
  status: SolicitacaoEntradaStatus;
  criado_em: string;
}
