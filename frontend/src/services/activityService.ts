import { apiClient } from './apiClient';
import type { AtividadeEvento, Correcao, Entrega, EntregaPayload } from '../types/activity.types';

export interface CorrecaoPayload {
  nota: number;
  feedback: string;
}

function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export const activityService = {
  async listarAtividades(idEvento: string): Promise<AtividadeEvento[]> {
    const data = await apiClient.get<AtividadeEvento[] | { results: AtividadeEvento[] }>(
      `/eventos/${idEvento}/atividades/`,
    );
    return unwrapList(data);
  },

  async criarAtividade(
    idEvento: string,
    payload: Omit<AtividadeEvento, 'id_atividade' | 'id_evento'>,
  ): Promise<AtividadeEvento> {
    return apiClient.post<AtividadeEvento>(`/eventos/${idEvento}/atividades/`, payload);
  },

  async atualizarAtividade(
    idAtividade: string,
    payload: Partial<Omit<AtividadeEvento, 'id_atividade' | 'id_evento'>>,
  ): Promise<AtividadeEvento> {
    return apiClient.patch<AtividadeEvento>(`/atividades/${idAtividade}/`, payload);
  },

  async excluirAtividade(idAtividade: string): Promise<void> {
    return apiClient.delete(`/atividades/${idAtividade}/`);
  },

  async enviarEntrega(payload: EntregaPayload): Promise<Entrega> {
    return apiClient.post<Entrega>('/entregas/', payload);
  },

  async listarEntregasDoGrupo(idGrupo: string): Promise<Entrega[]> {
    const data = await apiClient.get<Entrega[] | { results: Entrega[] }>(
      `/grupos/${idGrupo}/entregas/`,
    );
    return unwrapList(data);
  },

  async listarEntregasPendentes(idEvento: string): Promise<Entrega[]> {
    const data = await apiClient.get<Entrega[] | { results: Entrega[] }>(
      `/eventos/${idEvento}/entregas-pendentes/`,
    );
    return unwrapList(data);
  },

  async obterCorrecao(idEntrega: string): Promise<Correcao> {
    return apiClient.get<Correcao>(`/entregas/${idEntrega}/correcao/`);
  },

  async criarCorrecao(idEntrega: string, payload: CorrecaoPayload): Promise<Correcao> {
    return apiClient.post<Correcao>(`/entregas/${idEntrega}/correcao/`, payload);
  },

  async atualizarCorrecao(
    idEntrega: string,
    payload: Partial<CorrecaoPayload & { validado_por_admin: boolean }>,
  ): Promise<Correcao> {
    return apiClient.patch<Correcao>(`/entregas/${idEntrega}/correcao/`, payload);
  },

  async listarCorrecoesDoEvento(idEvento: string): Promise<Correcao[]> {
    const data = await apiClient.get<Correcao[] | { results: Correcao[] }>(
      `/eventos/${idEvento}/correcoes/`,
    );
    return unwrapList(data);
  },
};
