/**
 * Endpoints reais, já implementados no backend (`usuarios/urls.py`):
 *   GET|PUT|PATCH /avatar/me/
 *   GET /notificacoes/
 *   PATCH /notificacoes/<uuid:pk>/marcar-lida/
 *
 * `listarUsuarios` (tela "Users List") ainda não tem endpoint no backend.
 * Path sugerido abaixo (`GET /usuarios/`) — ajuste quando a rota existir.
 */
import { apiClient } from './apiClient';
import type { Avatar, AvatarPayload, Notificacao, UsuarioResumo } from '../types/user.types';

export const userService = {
  async getMeuAvatar(): Promise<Avatar> {
    return apiClient.get<Avatar>('/avatar/me/');
  },

  async salvarMeuAvatar(payload: AvatarPayload): Promise<Avatar> {
    return apiClient.put<Avatar>('/avatar/me/', payload);
  },

  async listarNotificacoes(): Promise<Notificacao[]> {
    const data = await apiClient.get<Notificacao[] | { results: Notificacao[] }>('/notificacoes/');
    return Array.isArray(data) ? data : (data.results ?? []);
  },

  async marcarNotificacaoLida(id: string): Promise<Notificacao> {
    return apiClient.patch<Notificacao>(`/notificacoes/${id}/marcar-lida/`);
  },

  // --- Bônus: endpoint ainda não existe no backend ---
  async listarUsuarios(params?: { busca?: string; habilidade?: string }): Promise<UsuarioResumo[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiClient.get<UsuarioResumo[]>(`/usuarios/${query ? `?${query}` : ''}`);
  },
};
