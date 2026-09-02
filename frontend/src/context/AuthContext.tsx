import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
import { ApiError, tokenStorage } from '../services/apiClient';
import type { LoginPayload, RegistroPayload, Usuario, UsuarioUpdatePayload } from '../types/auth-types';

export interface AuthContextValue {
  /** Usuário autenticado, ou null se não estiver logado */
  usuario: Usuario | null;
  /** true enquanto a sessão inicial está sendo verificada (evita "flash" de tela de login) */
  isLoading: boolean;
  /** true enquanto login / registro está em andamento */
  isSubmitting: boolean;
  /** Erro da última operação de auth (login/registro), em texto pronto para exibir */
  error: string | null;
  isAuthenticated: boolean;
  /**
   * true se o perfil do usuário logado dá acesso à área administrativa (Épico 7).
   * Perfil "admin" confirmado em `backend/identity/management/commands/seed_roles.py`
   * (único perfil com a permissão `usuario.gerenciar` / `evento.gerenciar` no seed).
   */
  isAdmin: boolean;
  /** true se o perfil é avaliador (juízes de entregas). */
  isAvaliador: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  registrar: (payload: RegistroPayload) => Promise<{ pendingApproval: boolean }>;
  logout: () => void;
  atualizarPerfil: (payload: UsuarioUpdatePayload) => Promise<void>;
  limparErro: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Único perfil administrativo seedado hoje (ver services.PERFIL_PARTICIPANTE e seed_roles.py) */
const PERFIL_ADMIN = 'admin';
const PERFIL_AVALIADOR = 'avaliador';

function extractMensagemErro(err: unknown): string {
  if (err instanceof ApiError) {
    if (typeof err.data === 'object' && err.data !== null) {
      const data = err.data as Record<string, unknown>;
      const primeiraChave = Object.keys(data)[0];
      const valor = primeiraChave ? data[primeiraChave] : undefined;
      if (Array.isArray(valor) && typeof valor[0] === 'string') return valor[0];
      if (typeof data.detail === 'string') return data.detail;
    }
    return err.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarSessao() {
      if (!tokenStorage.getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const usuarioAtual = await authService.me();
        if (ativo) setUsuario(usuarioAtual);
      } catch {
        tokenStorage.clear();
        if (ativo) setUsuario(null);
      } finally {
        if (ativo) setIsLoading(false);
      }
    }

    void carregarSessao();
    return () => {
      ativo = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await authService.login(payload);
      const usuarioAtual = await authService.me();
      setUsuario(usuarioAtual);
    } catch (err) {
      setError(extractMensagemErro(err));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const registrar = useCallback(async (payload: RegistroPayload) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const criado = await authService.registrar(payload);
      const pendingApproval =
        payload.tipo_perfil === 'avaliador' || criado.is_active === false;

      if (pendingApproval) {
        return { pendingApproval: true };
      }

      await authService.login({ email: payload.email, password: payload.password });
      const usuarioAtual = await authService.me();
      setUsuario(usuarioAtual);
      return { pendingApproval: false };
    } catch (err) {
      setError(extractMensagemErro(err));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUsuario(null);
  }, []);

  const atualizarPerfil = useCallback(async (payload: UsuarioUpdatePayload) => {
    setError(null);
    try {
      const usuarioAtualizado = await authService.atualizarMe(payload);
      setUsuario(usuarioAtualizado);
    } catch (err) {
      setError(extractMensagemErro(err));
      throw err;
    }
  }, []);

  const limparErro = useCallback(() => setError(null), []);

  const isAdmin = useMemo(
    () => usuario?.id_perfil?.nome?.toLowerCase() === PERFIL_ADMIN,
    [usuario],
  );

  const isAvaliador = useMemo(
    () => usuario?.id_perfil?.nome?.toLowerCase() === PERFIL_AVALIADOR,
    [usuario],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      isLoading,
      isSubmitting,
      error,
      isAuthenticated: usuario !== null,
      isAdmin,
      isAvaliador,
      login,
      registrar,
      logout,
      atualizarPerfil,
      limparErro,
    }),
    [
      usuario,
      isLoading,
      isSubmitting,
      error,
      isAdmin,
      isAvaliador,
      login,
      registrar,
      logout,
      atualizarPerfil,
      limparErro,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um <AuthProvider>.');
  return context;
}
