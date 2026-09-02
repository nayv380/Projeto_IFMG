import { apiClient } from './apiClient';
import type { Evento, Inscricao, InscricaoPayload } from '../types/event.types';

export interface ParticipanteEvento {
  id_inscricao: string;
  id_usuario: string;
  nome: string;
  nome_usuario: string;
  pais?: string;
  instituicao: string;
  curso: string;
  status: string;
}

function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export const eventService = {
  async listarEventos(params?: { status?: string; busca?: string }): Promise<Evento[]> {
    const query = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString();
    const data = await apiClient.get<Evento[] | { results: Evento[] }>(
      `/eventos/${query ? `?${query}` : ''}`,
    );
    return unwrapList(data);
  },

  async obterEvento(idEvento: string): Promise<Evento> {
    return apiClient.get<Evento>(`/eventos/${idEvento}/`);
  },

  async criarEvento(payload: Omit<Evento, 'id_evento'>): Promise<Evento> {
    return apiClient.post<Evento>('/eventos/', payload);
  },

  async atualizarEvento(idEvento: string, payload: Partial<Evento>): Promise<Evento> {
    return apiClient.patch<Evento>(`/eventos/${idEvento}/`, payload);
  },

  async inscrever(payload: InscricaoPayload): Promise<Inscricao> {
    return apiClient.post<Inscricao>('/inscricoes/', payload);
  },

  async minhasInscricoes(): Promise<Inscricao[]> {
    const data = await apiClient.get<Inscricao[] | { results: Inscricao[] }>('/inscricoes/minhas/');
    return unwrapList(data);
  },

  async listarInscricoesDoEvento(
    idEvento: string,
    params?: { status?: string },
  ): Promise<Inscricao[]> {
    const query = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString();
    const data = await apiClient.get<Inscricao[] | { results: Inscricao[] }>(
      `/eventos/${idEvento}/inscricoes/${query ? `?${query}` : ''}`,
    );
    return unwrapList(data);
  },

  async listarParticipantes(
    idEvento: string,
    params?: { busca?: string; status?: string },
  ): Promise<ParticipanteEvento[]> {
    const query = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString();
    const data = await apiClient.get<ParticipanteEvento[] | { results: ParticipanteEvento[] }>(
      `/eventos/${idEvento}/participantes/${query ? `?${query}` : ''}`,
    );
    return unwrapList(data);
  },

  async aprovarInscricao(
    idInscricao: string,
    status: 'aprovada' | 'recusada',
  ): Promise<Inscricao> {
    return apiClient.patch<Inscricao>(`/inscricoes/${idInscricao}/aprovar/`, { status });
  },

  async cancelarInscricao(idInscricao: string): Promise<void> {
    return apiClient.delete(`/inscricoes/${idInscricao}/cancelar/`);
  },

  async formarGrupos(
    idEvento: string,
    maxMembros = 5,
  ): Promise<{
    grupos_criados?: number;
    grupos?: unknown[];
    detail?: string;
  }> {
    return apiClient.post(`/eventos/${idEvento}/formar-grupos/`, { max_membros: maxMembros });
  },

  async obterDashboard(idEvento: string): Promise<Record<string, number | string>> {
    return apiClient.get(`/eventos/${idEvento}/dashboard/`);
  },

  async obterRanking(idEvento: string): Promise<
    Array<{
      posicao: number;
      id_grupo: string;
      nome: string;
      total_nota: number;
      media_nota: number;
      entregas_corrigidas: number;
    }>
  > {
    return apiClient.get(`/eventos/${idEvento}/ranking/`);
  },
};
