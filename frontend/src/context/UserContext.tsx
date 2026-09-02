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
import { userService } from '../services/userService';
import { ApiError } from '../services/apiClient';
import { useAuth } from './AuthContext';
import type { Avatar, AvatarPayload, Notificacao, UsuarioResumo } from '../types/user.types';

export interface UserContextValue {
  meuAvatar: Avatar | null;
  notificacoes: Notificacao[];
  notificacoesNaoLidas: number;
  usuarios: UsuarioResumo[];
  isLoading: boolean;
  error: string | null;

  carregarMeuAvatar: (options?: { force?: boolean }) => Promise<void>;
  salvarMeuAvatar: (payload: AvatarPayload) => Promise<void>;
  carregarNotificacoes: (options?: { force?: boolean }) => Promise<void>;
  marcarNotificacaoLida: (id: string) => Promise<void>;
  buscarUsuarios: (busca?: string) => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [meuAvatar, setMeuAvatar] = useState<Avatar | null>(null);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notificacoesCarregadasRef = useRef(false);
  const avatarCarregadoRef = useRef(false);
  const notifPromiseRef = useRef<Promise<void> | null>(null);
  const avatarPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (isAuthenticated) return;
    notificacoesCarregadasRef.current = false;
    avatarCarregadoRef.current = false;
    notifPromiseRef.current = null;
    avatarPromiseRef.current = null;
    setMeuAvatar(null);
    setNotificacoes([]);
    setUsuarios([]);
    setError(null);
  }, [isAuthenticated]);

  const carregarMeuAvatar = useCallback(
    async (options?: { force?: boolean }) => {
      if (!isAuthenticated) return;
      if (!options?.force && avatarCarregadoRef.current) return;
      if (avatarPromiseRef.current) return avatarPromiseRef.current;

      const run = (async () => {
        setIsLoading(true);
        setError(null);
        try {
          const avatar = await userService.getMeuAvatar();
          setMeuAvatar(avatar);
          avatarCarregadoRef.current = true;
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            setMeuAvatar(null);
            avatarCarregadoRef.current = true;
            return;
          }
          setError('Não foi possível completar a operação. Tente novamente.');
          throw err;
        } finally {
          setIsLoading(false);
          avatarPromiseRef.current = null;
        }
      })();

      avatarPromiseRef.current = run;
      return run;
    },
    [isAuthenticated],
  );

  const salvarMeuAvatar = useCallback(
    async (payload: AvatarPayload) => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      setError(null);
      try {
        const avatar = await userService.salvarMeuAvatar(payload);
        setMeuAvatar(avatar);
        avatarCarregadoRef.current = true;
      } catch (err) {
        setError('Não foi possível completar a operação. Tente novamente.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated],
  );

  const carregarNotificacoes = useCallback(
    async (options?: { force?: boolean }) => {
      if (!isAuthenticated) return;
      if (!options?.force && notificacoesCarregadasRef.current) return;
      if (notifPromiseRef.current) return notifPromiseRef.current;

      const run = (async () => {
        setIsLoading(true);
        setError(null);
        try {
          const lista = await userService.listarNotificacoes();
          setNotificacoes(lista);
          notificacoesCarregadasRef.current = true;
        } catch (err) {
          setError('Não foi possível completar a operação. Tente novamente.');
          throw err;
        } finally {
          setIsLoading(false);
          notifPromiseRef.current = null;
        }
      })();

      notifPromiseRef.current = run;
      return run;
    },
    [isAuthenticated],
  );

  const marcarNotificacaoLida = useCallback(
    async (id: string) => {
      if (!isAuthenticated) return;
      try {
        const atualizada = await userService.marcarNotificacaoLida(id);
        setNotificacoes((atual) =>
          atual.map((n) => (n.id === atualizada.id ? atualizada : n)),
        );
      } catch (err) {
        setError('Não foi possível completar a operação. Tente novamente.');
        throw err;
      }
    },
    [isAuthenticated],
  );

  const buscarUsuarios = useCallback(
    async (busca?: string) => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      setError(null);
      try {
        const lista = await userService.listarUsuarios(busca ? { busca } : undefined);
        setUsuarios(lista);
      } catch (err) {
        setError('Não foi possível completar a operação. Tente novamente.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated],
  );

  const notificacoesNaoLidas = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes],
  );

  const value = useMemo<UserContextValue>(
    () => ({
      meuAvatar,
      notificacoes,
      notificacoesNaoLidas,
      usuarios,
      isLoading,
      error,
      carregarMeuAvatar,
      salvarMeuAvatar,
      carregarNotificacoes,
      marcarNotificacaoLida,
      buscarUsuarios,
    }),
    [
      meuAvatar,
      notificacoes,
      notificacoesNaoLidas,
      usuarios,
      isLoading,
      error,
      carregarMeuAvatar,
      salvarMeuAvatar,
      carregarNotificacoes,
      marcarNotificacaoLida,
      buscarUsuarios,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserData(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUserData deve ser usado dentro de um <UserProvider>.');
  return context;
}
