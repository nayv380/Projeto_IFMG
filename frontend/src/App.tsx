import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import AdminRoute from './components/AdminRoute';
import AvaliadorRoute from './components/AvaliadorRoute';

import AppProviders from './context';

import AvatarPage from './pages/AvatarPage';
import EventPage from './pages/EventPage';
import EventsPage from './pages/EventsPage';
import CommunityPage from './pages/CommunityPage';
import MyGroupPage from './pages/MyGroupPage';
import ActivitiesAndScorePage from './pages/ActivitiesAndScore';
import MuralPage from './pages/FrequentlyAskedQuestionsPage';
import AvaliadorPage from './pages/AvaliadorPage';
import ResultsDashboardPage from './pages/ResultsDashboardPage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminEventsPage from './pages/admin/AdminEventsPage';
import AdminInscricoesPage from './pages/admin/AdminInscricoesPage';
import AdminActivitiesPage from './pages/admin/AdminActivitiesPage';
import AdminPermissionsPage from './pages/admin/AdminPermissionsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminCorrectionsPage from './pages/admin/AdminCorrectionsPage';

export default function App(): React.JSX.Element {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route element={<GuestRoute />}>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/perfil" element={<AvatarPage />} />
              <Route path="/eventos" element={<EventsPage />} />
              <Route path="/eventos/:idEvento" element={<EventPage />} />
              <Route path="/eventos/:idEvento/comunidade" element={<CommunityPage />} />
              <Route path="/eventos/:idEvento/grupos" element={<CommunityPage />} />
              <Route path="/eventos/:idEvento/meu-grupo" element={<MyGroupPage />} />
              <Route path="/eventos/:idEvento/atividades" element={<ActivitiesAndScorePage />} />
              <Route path="/eventos/:idEvento/mural" element={<MuralPage />} />
              <Route path="/eventos/:idEvento/resultados" element={<ResultsDashboardPage />} />

              <Route element={<AvaliadorRoute />}>
                <Route path="/eventos/:idEvento/avaliacao" element={<AvaliadorPage />} />
              </Route>

              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/usuarios" element={<AdminUsersPage />} />
                <Route path="/admin/eventos" element={<AdminEventsPage />} />
                <Route path="/admin/inscricoes" element={<AdminInscricoesPage />} />
                <Route path="/admin/atividades" element={<AdminActivitiesPage />} />
                <Route path="/admin/permissoes" element={<AdminPermissionsPage />} />
                <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />
                <Route path="/admin/correcoes" element={<AdminCorrectionsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}
