/**
 * Tipos de Perfis, Permissões (RBAC) e configurações do sistema.
 */
export interface Perfil {
  id_perfil: string;
  nome: string;
  descricao: string;
}

export type PerfilPayload = Partial<Omit<Perfil, 'id_perfil'>>;

export interface Permissao {
  id_permissao: string;
  nome: string;
  recurso: string;
  acao: string;
}

export interface PerfilPermissao {
  id: string;
  id_perfil: string;
  id_permissao: string;
}

export interface ConfiguracoesSistema {
  nome_plataforma: string;
  email_suporte: string;
  paises_participantes: string[];
  modo_manutencao: boolean;
  atualizado_em?: string;
}

export type ConfiguracoesSistemaPayload = Partial<ConfiguracoesSistema>;
