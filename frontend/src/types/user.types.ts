/**
 * Tipos referentes a Avatar/Perfil público e Notificações.
 * Espelham AvatarSerializer e NotificacaoSerializer (backend `usuarios`).
 * Usados nas telas "Avatar Page", "User Panel" e sino de notificações do NavBar.
 */

/** Configurações livres de customização visual do avatar (JSONField no backend) */
export interface ConfigAvatar {
  cor_fundo?: string;
  estilo?: string;
  [key: string]: unknown;
}

export interface Avatar {
  id_avatar: string;
  nome_usuario: string; // @username exibido nos protótipos
  biografia: string;
  whatsapp: string;
  config_avatar: ConfigAvatar;
}

export type AvatarPayload = Partial<Omit<Avatar, 'id_avatar'>>;

/** Card de "Usuário" resumido usado em listagens (Users List / membros de grupo) */
export interface UsuarioResumo {
  id_usuario: string;
  nome_usuario: string;
  habilidade?: string;
  avatarUrl?: string;
}

export type NotificacaoTipo = 'email' | 'plataforma' | 'prazo';

export interface Notificacao {
  id: string;
  tipo: NotificacaoTipo;
  mensagem: string;
  link_extra: string;
  lida: boolean;
  criado_em: string;
}
