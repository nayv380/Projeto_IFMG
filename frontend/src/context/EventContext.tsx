import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { eventService } from '../services/eventService';
import { activityService } from '../services/activityService';
import { useAuth } from './AuthContext';
import type { Evento, Inscricao, InscricaoPayload } from '../types/event.types';
import type { AtividadeEvento, Entrega, EntregaPayload } from '../types/activity.types';

export interface EventContextValue {
  eventos: Evento[];
  eventoAtual: Evento | null;
  minhasInscricoes: Inscricao[];
  atividades: AtividadeEvento[];
  entregas: Entrega[];
  /** Compat: true se qualquer carga de eventos/evento estiver em andamento */
  isLoading: boolean;
  isLoadingEventos: boolean;
  isLoadingEvento: boolean;
  error: string | null;

  listarEventos: (options?: { force?: boolean; status?: string; busca?: string }) => Promise<void>;
  selecionarEvento: (idEvento: string, options?: { force?: boolean }) => Promise<void>;
  inscrever: (payload: InscricaoPayload) => Promise<Inscricao>;
  cancelarInscricao: (idInscricao: string) => Promise<void>;
  carregarMinhasInscricoes: (options?: { force?: boolean }) => Promise<void>;
  enviarEntrega: (payload: EntregaPayload) => Promise<Entrega>;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoAtual, setEventoAtual] = useState<Evento | null>(null);
  const [minhasInscricoes, setMinhasInscricoes] = useState<Inscricao[]>([]);
  const [atividades] = useState<AtividadeEvento[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [isLoadingEventos, setIsLoadingEventos] = useState(false);
  const [isLoadingEvento, setIsLoadingEvento] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventosRef = useRef<Evento[]>([]);
  // Cache de listas por status (chave '__all__' para todos)
  const eventosCacheRef = useRef<Map<string, Evento[]>>(new Map());
  const inscricoesCarregadasRef = useRef(false);
  const listarPromiseRef = useRef<Promise<void> | null>(null);
  const inscricoesPromiseRef = useRef<Promise<void> | null>(null);
  const selecionarPromisesRef = useRef<Map<string, Promise<void>>>(new Map());

  const syncEventos = useCallback((lista: Evento[]) => {
    eventosRef.current = lista;
    setEventos(lista);
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;
    eventosCacheRef.current.clear();
    inscricoesCarregadasRef.current = false;
    listarPromiseRef.current = null;
    inscricoesPromiseRef.current = null;
    selecionarPromisesRef.current.clear();
    syncEventos([]);
    setEventoAtual(null);
    setMinhasInscricoes([]);
    setEntregas([]);
    setError(null);
  }, [isAuthenticated, syncEventos]);

  const listarEventos = useCallback(
    async (options?: { force?: boolean; status?: string; busca?: string }) => {
      const statusKey = options?.status ?? '__all__';
      if (!options?.force && eventosCacheRef.current.has(statusKey)) {
        // usa cache
        const cached = eventosCacheRef.current.get(statusKey) ?? [];
        syncEventos(cached);
        return;
      }
      if (listarPromiseRef.current) {
        return listarPromiseRef.current;
      }

      const run = (async () => {
        setIsLoadingEventos(true);
        setError(null);
        try {
          const params: { status?: string; busca?: string } = {};
          if (options?.status) params.status = options.status;
          if (options?.busca) params.busca = options.busca;
          const lista = await eventService.listarEventos(
            Object.keys(params).length ? params : undefined,
          );
          // armazena no cache por status (busca não altera a cache principal)
          eventosCacheRef.current.set(statusKey, lista);
          syncEventos(lista);
        } catch {
          setError('Não foi possível carregar os eventos.');
        } finally {
          setIsLoadingEventos(false);
          listarPromiseRef.current = null;
        }
      })();

      listarPromiseRef.current = run;
      return run;
    },
    [syncEventos],
  );

  const selecionarEvento = useCallback(
    async (idEvento: string, options?: { force?: boolean }) => {
      const cached = eventosRef.current.find((e) => e.id_evento === idEvento);
      if (cached) {
        setEventoAtual(cached);
      }

      if (!options?.force && cached) {
        // Já temos o evento em cache: atualiza em background sem bloquear a UI
        const existing = selecionarPromisesRef.current.get(idEvento);
        if (existing) return existing;

        const background = (async () => {
          try {
            const evento = await eventService.obterEvento(idEvento);
            setEventoAtual(evento);
            syncEventos(
              eventosRef.current.map((e) => (e.id_evento === idEvento ? evento : e)),
            );
          } catch {
            /* mantém o cache se o refresh falhar */
          } finally {
            selecionarPromisesRef.current.delete(idEvento);
          }
        })();
        selecionarPromisesRef.current.set(idEvento, background);
        return background;
      }

      const existing = selecionarPromisesRef.current.get(idEvento);
      if (existing) return existing;

      const run = (async () => {
        if (!cached) setIsLoadingEvento(true);
        setError(null);
        try {
          const evento = await eventService.obterEvento(idEvento);
          setEventoAtual(evento);
          const jaNaLista = eventosRef.current.some((e) => e.id_evento === idEvento);
          syncEventos(
            jaNaLista
              ? eventosRef.current.map((e) => (e.id_evento === idEvento ? evento : e))
              : [...eventosRef.current, evento],
          );
        } catch {
          if (!cached) setEventoAtual(null);
          setError('Não foi possível carregar o evento selecionado.');
        } finally {
          setIsLoadingEvento(false);
          selecionarPromisesRef.current.delete(idEvento);
        }
      })();

      selecionarPromisesRef.current.set(idEvento, run);
      return run;
    },
    [syncEventos],
  );

  const inscrever = useCallback(async (payload: InscricaoPayload) => {
    setError(null);
    try {
      const inscricao = await eventService.inscrever(payload);
      setMinhasInscricoes((atual) => [inscricao, ...atual]);
      return inscricao;
    } catch (err) {
      setError('Não foi possível concluir a inscrição.');
      throw err;
    }
  }, []);

  const cancelarInscricao = useCallback(async (idInscricao: string) => {
    setError(null);
    try {
      await eventService.cancelarInscricao(idInscricao);
      setMinhasInscricoes((atual) => atual.filter((i) => i.id_inscricao !== idInscricao));
    } catch (err) {
      setError('Não foi possível cancelar a inscrição.');
      throw err;
    }
  }, []);

  const carregarMinhasInscricoes = useCallback(async (options?: { force?: boolean }) => {
    if (!options?.force && inscricoesCarregadasRef.current) {
      return;
    }
    if (inscricoesPromiseRef.current) {
      return inscricoesPromiseRef.current;
    }

    const run = (async () => {
      setError(null);
      try {
        const lista = await eventService.minhasInscricoes();
        setMinhasInscricoes(lista);
        inscricoesCarregadasRef.current = true;
      } catch {
        setError('Não foi possível carregar suas inscrições.');
      } finally {
        inscricoesPromiseRef.current = null;
      }
    })();

    inscricoesPromiseRef.current = run;
    return run;
  }, []);

  const enviarEntrega = useCallback(async (payload: EntregaPayload) => {
    setError(null);
    try {
      const entrega = await activityService.enviarEntrega(payload);
      setEntregas((atual) => [entrega, ...atual]);
      return entrega;
    } catch (err) {
      setError('Não foi possível enviar a entrega.');
      throw err;
    }
  }, []);

  const isLoading = isLoadingEventos || isLoadingEvento;

  const value = useMemo<EventContextValue>(
    () => ({
      eventos,
      eventoAtual,
      minhasInscricoes,
      atividades,
      entregas,
      isLoading,
      isLoadingEventos,
      isLoadingEvento,
      error,
      listarEventos,
      selecionarEvento,
      inscrever,
      cancelarInscricao,
      carregarMinhasInscricoes,
      enviarEntrega,
    }),
    [
      eventos,
      eventoAtual,
      minhasInscricoes,
      atividades,
      entregas,
      isLoading,
      isLoadingEventos,
      isLoadingEvento,
      error,
      listarEventos,
      selecionarEvento,
      inscrever,
      cancelarInscricao,
      carregarMinhasInscricoes,
      enviarEntrega,
    ],
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent(): EventContextValue {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEvent deve ser usado dentro de um <EventProvider>.');
  return context;
}
