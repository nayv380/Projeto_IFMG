/**
 * Serviço da área administrativa (Épico 7).
 * Usuários, perfis, permissões e configurações.
 */
import { apiClient } from './apiClient';
import type { Usuario } from '../types/auth-types';
import type {
  ConfiguracoesSistema,
  ConfiguracoesSistemaPayload,
  Perfil,
  PerfilPayload,
  Permissao,
} from '../types/identity.types';

function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export const adminService = {
  async listarUsuarios(params?: {
    busca?: string;
    perfil?: string;
    is_active?: string;
  }): Promise<Usuario[]> {
    const query = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '') as [
        string,
        string,
      ],
    ).toString();
    const data = await apiClient.get<Usuario[] | { results: Usuario[] }>(
      `/usuarios/${query ? `?${query}` : ''}`,
    );
    return unwrapList(data);
  },

  /** Avaliadores com conta ainda inativa (aguardando aprovação). */
  async listarAvaliadoresPendentes(): Promise<Usuario[]> {
    return this.listarUsuarios({ perfil: 'avaliador', is_active: 'false' });
  },

  async atualizarUsuario(
    idUsuario: string,
    payload: { is_active?: boolean; id_perfil?: string },
  ): Promise<Usuario> {
    return apiClient.patch<Usuario>(`/usuarios/${idUsuario}/`, payload);
  },

  async aprovarAvaliador(idUsuario: string): Promise<Usuario> {
    return this.atualizarUsuario(idUsuario, { is_active: true });
  },

  async listarPerfis(): Promise<Perfil[]> {
    const data = await apiClient.get<Perfil[] | { results: Perfil[] }>('/perfis/');
    return unwrapList(data);
  },

  async criarPerfil(payload: PerfilPayload): Promise<Perfil> {
    return apiClient.post<Perfil>('/admin/perfis/', payload);
  },

  async listarPermissoes(): Promise<Permissao[]> {
    const data = await apiClient.get<Permissao[] | { results: Permissao[] }>(
      '/admin/permissoes/',
    );
    return unwrapList(data);
  },

  async listarPermissoesDoPerfil(idPerfil: string): Promise<Permissao[]> {
    const data = await apiClient.get<Permissao[] | { results: Permissao[] }>(
      `/admin/perfis/${idPerfil}/permissoes/`,
    );
    return unwrapList(data);
  },

  async vincularPermissao(idPerfil: string, idPermissao: string): Promise<void> {
    return apiClient.post<void>(`/admin/perfis/${idPerfil}/permissoes/`, {
      id_permissao: idPermissao,
    });
  },

  async desvincularPermissao(idPerfil: string, idPermissao: string): Promise<void> {
    return apiClient.delete<void>(`/admin/perfis/${idPerfil}/permissoes/${idPermissao}/`);
  },

  async obterConfiguracoes(): Promise<ConfiguracoesSistema> {
    return apiClient.get<ConfiguracoesSistema>('/admin/configuracoes/');
  },

  async salvarConfiguracoes(payload: ConfiguracoesSistemaPayload): Promise<ConfiguracoesSistema> {
    return apiClient.patch<ConfiguracoesSistema>('/admin/configuracoes/', payload);
  },

  async obterDashboardGlobal(): Promise<{
    usuarios: number;
    eventos: number;
    inscricoes_pendentes: number;
    correcoes_pendentes: number;
    grupos: number;
    entregas: number;
  }> {
    return apiClient.get('/admin/dashboard/');
  },
};
