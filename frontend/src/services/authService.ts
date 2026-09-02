/**
 * Endpoints reais, já implementados no backend (`usuarios/urls.py`):
 *   POST /auth/registro/
 *   POST /auth/login/
 *   POST /auth/refresh/
 *   GET|PUT|PATCH /auth/me/
 */
import { apiClient, tokenStorage } from './apiClient';
import type {
  LoginPayload,
  RegistroPayload,
  TokenPair,
  Usuario,
  UsuarioUpdatePayload,
} from '../types/auth-types';

export const authService = {
  async login(payload: LoginPayload): Promise<TokenPair> {
    const tokens = await apiClient.post<TokenPair>('/auth/login/', payload, { skipAuth: true });
    tokenStorage.setTokens(tokens.access, tokens.refresh);
    return tokens;
  },

  async registrar(payload: RegistroPayload): Promise<Usuario> {
    return apiClient.post<Usuario>('/auth/registro/', payload, { skipAuth: true });
  },

  async me(): Promise<Usuario> {
    return apiClient.get<Usuario>('/auth/me/');
  },

  async atualizarMe(payload: UsuarioUpdatePayload): Promise<Usuario> {
    return apiClient.patch<Usuario>('/auth/me/', payload);
  },

  logout(): void {
    tokenStorage.clear();
  },
};
