/**
 * Tipos de Eventos e Inscrições
 */

export type EventoStatus = 'planejado' | 'inscricoes_abertas' | 'em_andamento' | 'finalizado';

export interface Evento {
  id_evento: string;
  nome: string;
  descricao: string;
  link_whatsapp_geral: string;
  data_inicio: string; // ISO datetime
  data_fim: string; // ISO datetime
  prazo_formacao_grupo: string | null;
  max_membros_grupo: number;
  status: EventoStatus;
}

export type InscricaoStatus = 'pendente' | 'aprovada' | 'recusada';

export interface Inscricao {
  id_inscricao: string;
  id_usuario: string;
  usuario_nome?: string;
  usuario_email?: string;
  pais?: string;
  instituicao?: string;
  curso?: string;
  id_evento: string;
  status: InscricaoStatus;
  aprovado_por: string | null;
  criado_em: string;
}

export interface InscricaoPayload {
  id_evento: string;
}

export type EventoPayload = Omit<Evento, 'id_evento'>;
