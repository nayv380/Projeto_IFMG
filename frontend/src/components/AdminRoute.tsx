import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Bloqueia rotas administrativas (Épico 7): exige sessão válida E perfil
 * com permissão de administração (ver `isAdmin` em AuthContext).
 * Usar sempre dentro de <ProtectedRoute> (esta rota não checa sessão sozinha
 * quanto ao "carregando", pressupõe que ProtectedRoute já tratou isso).
 */
export default function AdminRoute(): React.JSX.Element {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
