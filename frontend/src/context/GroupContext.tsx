import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { groupService } from '../services/groupService';
import type { Grupo, GrupoPayload, MembroGrupo, SolicitacaoEntrada } from '../types/group.types';

export interface GroupContextValue {
  /** Resultado da última listagem (tela "Groups List") */
  grupos: Grupo[];
  /** Grupo atualmente selecionado/visualizado (tela "My Group Page") */
  grupoAtual: Grupo | null;
  membros: MembroGrupo[];
  isLoading: boolean;
  error: string | null;

  listarGrupos: (params?: { busca?: string; idEvento?: string }) => Promise<void>;
  selecionarGrupo: (idGrupo: string) => Promise<void>;
  criarGrupo: (payload: GrupoPayload) => Promise<Grupo>;
  solicitarEntrada: (idGrupo: string) => Promise<SolicitacaoEntrada>;
  limparGrupoAtual: () => void;
}

const GroupContext = createContext<GroupContextValue | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoAtual, setGrupoAtual] = useState<Grupo | null>(null);
  const [membros, setMembros] = useState<MembroGrupo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listarGrupos = useCallback(async (params?: { busca?: string; idEvento?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const lista = await groupService.listarGrupos(params);
      setGrupos(lista);
    } catch {
      setError('Não foi possível carregar os grupos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selecionarGrupo = useCallback(async (idGrupo: string) => {
  setIsLoading(true);
  setError(null);

  try {
    const grupo = await groupService.obterGrupo(idGrupo);

    setGrupoAtual(grupo);

    setMembros(grupo.membros ?? []);

  } catch {
    setError('Não foi possível carregar o grupo selecionado.');
  } finally {
    setIsLoading(false);
  }
}, []);

  const criarGrupo = useCallback(async (payload: GrupoPayload) => {
    setError(null);
    try {
      const novoGrupo = await groupService.criarGrupo(payload);
      setGrupos((atual) => [novoGrupo, ...atual]);
      setGrupoAtual(novoGrupo);
      return novoGrupo;
    } catch (err) {
      setError('Não foi possível criar o grupo.');
      throw err;
    }
  }, []);

  const solicitarEntrada = useCallback(async (idGrupo: string) => {
    setError(null);
    try {
      return await groupService.solicitarEntrada(idGrupo);
    } catch (err) {
      setError('Não foi possível enviar a solicitação de entrada.');
      throw err;
    }
  }, []);

  const limparGrupoAtual = useCallback(() => {
    setGrupoAtual(null);
    setMembros([]);
  }, []);

  const value = useMemo<GroupContextValue>(
    () => ({
      grupos,
      grupoAtual,
      membros,
      isLoading,
      error,
      listarGrupos,
      selecionarGrupo,
      criarGrupo,
      solicitarEntrada,
      limparGrupoAtual,
    }),
    [grupos, grupoAtual, membros, isLoading, error, listarGrupos, selecionarGrupo, criarGrupo, solicitarEntrada, limparGrupoAtual],
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

/** Hook de acesso ao GroupContext. Deve ser usado dentro de <GroupProvider>. */
export function useGroup(): GroupContextValue {
  const context = useContext(GroupContext);
  if (!context) throw new Error('useGroup deve ser usado dentro de um <GroupProvider>.');
  return context;
}
