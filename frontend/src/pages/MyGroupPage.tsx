import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/** Rota legada: a UI de "meu grupo" vive em Comunidade. */
const MyGroupPage: React.FC = () => {
  const { idEvento } = useParams<{ idEvento: string }>();
  if (!idEvento) {
    return <Navigate to="/eventos" replace />;
  }
  return <Navigate to={`/eventos/${idEvento}/comunidade`} replace />;
};

export default MyGroupPage;
