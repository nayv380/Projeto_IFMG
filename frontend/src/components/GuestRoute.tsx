import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * Rotas só para visitantes (login/registro).
 * Se já houver sessão válida, redireciona para o perfil.
 */
export default function GuestRoute(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Spinner label="Verificando sessão..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
