import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AvaliadorRoute: React.FC = () => {
  const { usuario, isLoading, isAdmin } = useAuth();

  // Enquanto estiver validando se o token da sessão existe, mostra um aviso para não dar "flash" de tela
  if (isLoading) {
    return <div>Verificando permissões de avaliador...</div>;
  }

  // Verifica se o nome do perfil do usuário logado é "avaliador" (convertido para letras minúsculas por segurança)
  const isAvaliador = usuario?.id_perfil?.nome?.toLowerCase() === 'avaliador';

  // Se for avaliador OU for o admin da plataforma, dá sinal verde para a rota avançar (usando o Outlet da arquitetura)
  if (isAvaliador || isAdmin) {
    return <Outlet />;
  }

  // Caso contrário, bloqueia e expulsa o usuário de volta para o perfil inicial seguro
  return <Navigate to="/perfil" replace />;
};

export default AvaliadorRoute;
