// services/muralService.ts
import { apiClient } from './apiClient';
import type { PostagemMural, PostagemPayload, RespostaMural, RespostaPayload } from '../types/mural.types';

export const muralService = {
  // READ
  async listarPostagens(idEvento: string, params?: { area?: string }): Promise<PostagemMural[]> {
    const query = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString();
    return apiClient.get<PostagemMural[]>(
      `/eventos/${idEvento}/mural/${query ? `?${query}` : ''}`,
    );
  },

  // CREATE (Postagem)
  async criarPostagem(idEvento: string, payload: PostagemPayload): Promise<PostagemMural> {
    return apiClient.post<PostagemMural>(`/eventos/${idEvento}/mural/`, payload);
  },

  // UPDATE (Postagem)
  async atualizarPostagem(
    idPostagem: string,
    payload: PostagemPayload | { status?: string; area?: string; titulo?: string; conteudo?: string },
  ): Promise<PostagemMural> {
    return apiClient.patch<PostagemMural>(`/mural/${idPostagem}/`, payload);
  },

  async moderarPostagem(idPostagem: string, status: 'oculta' | 'arquivada'): Promise<PostagemMural> {
    return this.atualizarPostagem(idPostagem, { status });
  },

  // DELETE (Postagem)
  async deletarPostagem(idPostagem: string): Promise<void> {
    return apiClient.delete(`/mural/${idPostagem}/`);
  },

  // CREATE (Resposta)
  async responderPostagem(idPostagem: string, payload: RespostaPayload): Promise<RespostaMural> {
    return apiClient.post<RespostaMural>(`/mural/${idPostagem}/respostas/`, payload);
  },

  // DELETE (Resposta)
  async deletarResposta(idResposta: string): Promise<void> {
    return apiClient.delete(`/mural/respostas/${idResposta}/`);
  }
};