import { apiClient } from './apiClient';
import type {
  Grupo,
  GrupoPayload,
  SolicitacaoEntrada,
} from '../types/group.types';

function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export interface SolicitacaoPendenteLider extends SolicitacaoEntrada {
  grupo_nome: string;
  nome_usuario: string;
}

export const groupService = {
  async listarGrupos(params?: { busca?: string; idEvento?: string }): Promise<Grupo[]> {
    const query = new URLSearchParams();
    if (params?.busca) query.append('busca', params.busca);
    if (params?.idEvento) query.append('evento', params.idEvento);
    const queryString = query.toString();
    const data = await apiClient.get<Grupo[] | { results: Grupo[] }>(
      `/grupos/${queryString ? `?${queryString}` : ''}`,
    );
    return unwrapList(data);
  },

  async obterGrupo(idGrupo: string): Promise<Grupo> {
    return apiClient.get<Grupo>(`/grupos/${idGrupo}/`);
  },

  async meuGrupo(idEvento: string): Promise<Grupo | null> {
    return apiClient.get<Grupo | null>(`/grupos/meu-grupo/?evento=${idEvento}`);
  },

  async criarGrupo(payload: GrupoPayload): Promise<Grupo> {
    return apiClient.post<Grupo>('/grupos/', payload);
  },

  async solicitarEntrada(idGrupo: string): Promise<SolicitacaoEntrada> {
    return apiClient.post<SolicitacaoEntrada>('/solicitacoes/', {
      id_grupo: idGrupo,
    });
  },

  async entrarPorCodigo(idEvento: string, codigo: string): Promise<Grupo> {
    return apiClient.post<Grupo>('/grupos/entrar-por-codigo/', {
      id_evento: idEvento,
      codigo: codigo.trim().toUpperCase(),
    });
  },

  async listarSolicitacoesPendentes(idEvento?: string): Promise<SolicitacaoPendenteLider[]> {
    const query = idEvento ? `?evento=${idEvento}` : '';
    const data = await apiClient.get<
      SolicitacaoPendenteLider[] | { results: SolicitacaoPendenteLider[] }
    >(`/solicitacoes/pendentes/${query}`);
    return unwrapList(data);
  },

  async listarSolicitacoesDoGrupo(idGrupo: string): Promise<SolicitacaoPendenteLider[]> {
    const data = await apiClient.get<
      SolicitacaoPendenteLider[] | { results: SolicitacaoPendenteLider[] }
    >(`/grupos/${idGrupo}/solicitacoes/`);
    return unwrapList(data);
  },

  async responderSolicitacao(
    idSolicitacao: string,
    status: 'aprovada' | 'recusada',
  ): Promise<SolicitacaoEntrada> {
    return apiClient.patch<SolicitacaoEntrada>(`/solicitacoes/${idSolicitacao}/aprovar/`, {
      status,
    });
  },

  async sairDoGrupo(
    idGrupo: string,
    payload?: { id_novo_lider?: string },
  ): Promise<{ acao: string; id_grupo: string; foi_lider?: boolean }> {
    return apiClient.post(`/grupos/${idGrupo}/sair/`, payload ?? {});
  },
};
