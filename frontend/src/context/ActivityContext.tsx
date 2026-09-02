import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { activityService, type CorrecaoPayload } from '../services/activityService';
import type { AtividadeEvento, Correcao, Entrega, EntregaPayload } from '../types/activity.types';

export interface ActivityContextValue {
  atividades: AtividadeEvento[];
  entregas: Entrega[];
  entregasPendentes: Entrega[];
  correcoes: Record<string, Correcao>;
  isLoading: boolean;
  error: string | null;

  carregarAtividades: (idEvento: string) => Promise<void>;
  carregarEntregasDoGrupo: (idGrupo: string) => Promise<void>;
  carregarEntregasPendentes: (idEvento: string) => Promise<void>;
  enviarEntrega: (payload: EntregaPayload) => Promise<Entrega>;
  carregarCorrecao: (idEntrega: string) => Promise<void>;
  criarCorrecao: (idEntrega: string, payload: CorrecaoPayload) => Promise<Correcao>;
  atualizarCorrecao: (
    idEntrega: string,
    payload: Partial<CorrecaoPayload & { validado_por_admin: boolean }>,
  ) => Promise<Correcao>;
}

const ActivityContext = createContext<ActivityContextValue | undefined>(undefined);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [atividades, setAtividades] = useState<AtividadeEvento[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [entregasPendentes, setEntregasPendentes] = useState<Entrega[]>([]);
  const [correcoes, setCorrecoes] = useState<Record<string, Correcao>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atividadesCacheRef = useRef<Map<string, AtividadeEvento[]>>(new Map());
  const atividadesPromiseRef = useRef<Map<string, Promise<void>>>(new Map());
  const entregasPromiseRef = useRef<Map<string, Promise<void>>>(new Map());
  const pendentesPromiseRef = useRef<Map<string, Promise<void>>>(new Map());

  const carregarAtividades = useCallback(async (idEvento: string) => {
    const cached = atividadesCacheRef.current.get(idEvento);
    if (cached) {
      setAtividades(cached);
      return;
    }

    const existing = atividadesPromiseRef.current.get(idEvento);
    if (existing) return existing;

    const run = (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const lista = await activityService.listarAtividades(idEvento);
        atividadesCacheRef.current.set(idEvento, lista);
        setAtividades(lista);
      } catch {
        setError('Não foi possível carregar as atividades deste evento.');
      } finally {
        setIsLoading(false);
        atividadesPromiseRef.current.delete(idEvento);
      }
    })();

    atividadesPromiseRef.current.set(idEvento, run);
    return run;
  }, []);

  const carregarEntregasDoGrupo = useCallback(async (idGrupo: string) => {
    const existing = entregasPromiseRef.current.get(idGrupo);
    if (existing) return existing;

    const run = (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const lista = await activityService.listarEntregasDoGrupo(idGrupo);
        setEntregas(lista);
      } catch {
        setError('Não foi possível carregar as entregas do grupo.');
      } finally {
        setIsLoading(false);
        entregasPromiseRef.current.delete(idGrupo);
      }
    })();

    entregasPromiseRef.current.set(idGrupo, run);
    return run;
  }, []);

  const enviarEntrega = useCallback(async (payload: EntregaPayload) => {
    setError(null);
    setIsLoading(true);
    try {
      const novaEntrega = await activityService.enviarEntrega(payload);
      setEntregas((atual) => [novaEntrega, ...atual]);
      return novaEntrega;
    } catch (err) {
      setError('Não foi possível enviar a entrega. Verifique o link e tente novamente.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const carregarCorrecao = useCallback(async (idEntrega: string) => {
    try {
      const correcao = await activityService.obterCorrecao(idEntrega);
      setCorrecoes((prev) => ({ ...prev, [idEntrega]: correcao }));
    } catch {
      console.error(`Não foi possível carregar a correção da entrega ${idEntrega}`);
    }
  }, []);

  const carregarEntregasPendentes = useCallback(async (idEvento: string) => {
    const existing = pendentesPromiseRef.current.get(idEvento);
    if (existing) return existing;

    const run = (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const lista = await activityService.listarEntregasPendentes(idEvento);
        setEntregasPendentes(lista);
      } catch {
        setError('Não foi possível carregar as entregas do evento.');
      } finally {
        setIsLoading(false);
        pendentesPromiseRef.current.delete(idEvento);
      }
    })();

    pendentesPromiseRef.current.set(idEvento, run);
    return run;
  }, []);

  const criarCorrecao = useCallback(async (idEntrega: string, payload: CorrecaoPayload) => {
    setError(null);
    try {
      const correcao = await activityService.criarCorrecao(idEntrega, payload);
      setCorrecoes((prev) => ({ ...prev, [idEntrega]: correcao }));
      setEntregasPendentes((atual) =>
        atual.map((e) => (e.id_entrega === idEntrega ? { ...e, status: 'corrigida' } : e)),
      );
      return correcao;
    } catch (err) {
      setError('Não foi possível salvar a correção.');
      throw err;
    }
  }, []);

  const atualizarCorrecao = useCallback(
    async (
      idEntrega: string,
      payload: Partial<CorrecaoPayload & { validado_por_admin: boolean }>,
    ) => {
      setError(null);
      try {
        const correcao = await activityService.atualizarCorrecao(idEntrega, payload);
        setCorrecoes((prev) => ({ ...prev, [idEntrega]: correcao }));
        return correcao;
      } catch (err) {
        setError('Não foi possível atualizar a correção.');
        throw err;
      }
    },
    [],
  );

  const value = useMemo<ActivityContextValue>(
    () => ({
      atividades,
      entregas,
      entregasPendentes,
      correcoes,
      isLoading,
      error,
      carregarAtividades,
      carregarEntregasDoGrupo,
      carregarEntregasPendentes,
      enviarEntrega,
      carregarCorrecao,
      criarCorrecao,
      atualizarCorrecao,
    }),
    [
      atividades,
      entregas,
      entregasPendentes,
      correcoes,
      isLoading,
      error,
      carregarAtividades,
      carregarEntregasDoGrupo,
      carregarEntregasPendentes,
      enviarEntrega,
      carregarCorrecao,
      criarCorrecao,
      atualizarCorrecao,
    ],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity(): ActivityContextValue {
  const context = useContext(ActivityContext);
  if (!context) throw new Error('useActivity deve ser usado dentro de um <ActivityProvider>.');
  return context;
}
