/**
 * Tipos referentes a Autenticação e Usuário.
 * Espelham os serializers do app `usuarios` (backend Django).
 */

/** Perfil resumido (identity.Perfil) retornado dentro do Usuário */
export interface PerfilResumo {
  id_perfil: string;
  nome: string;
  descricao: string;
}

/** Usuário autenticado (UsuarioSerializer) */
export interface Usuario {
  id_usuario: string;
  email: string;
  nome: string;
  pais: string;
  instituicao: string;
  curso: string;
  data_nascimento: string | null; // ISO date (YYYY-MM-DD)
  email_verificado: boolean;
  is_active: boolean;
  id_perfil: PerfilResumo | null;
  criado_em: string; // ISO datetime
}

/** Payload aceito pelo endpoint de atualização (UsuarioUpdateSerializer) */
export type UsuarioUpdatePayload = Partial<
  Pick<Usuario, 'nome' | 'pais' | 'instituicao' | 'curso' | 'data_nascimento'>
>;

/** Payload de login (LoginTokenSerializer usa email como username_field) */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Resposta do endpoint de login/refresh (JWT - simplejwt) */
export interface TokenPair {
  access: string;
  refresh: string;
}

export interface RefreshTokenPayload {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
}

/** Payload de cadastro (RegistroSerializer) */
export interface RegistroPayload {
  email: string;
  password: string;
  nome: string;
  /** Perfil público: participante (default) ou avaliador. Nunca admin. */
  tipo_perfil?: 'participante' | 'avaliador';
  pais?: string;
  instituicao?: string;
  curso?: string;
  data_nascimento?: string | null;
}

/** Claims customizadas embutidas no access token (ver LoginTokenSerializer.get_token) */
export interface AccessTokenClaims {
  email: string;
  nome: string;
  perfil?: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}
