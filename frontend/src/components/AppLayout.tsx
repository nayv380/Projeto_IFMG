import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation, useMatch } from 'react-router-dom';
import SideBar from './SideBar';
import Navbar from './NavBar';
import BrandLogo from './BrandLogo';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '../i18n';
import '../styles/app-layout.css';

const EVENTO_STORAGE_KEY = 'lt_evento_atual_id';

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const eventoMatch = useMatch('/eventos/:idEvento/*');
  const eventoExactMatch = useMatch('/eventos/:idEvento');
  const idEventoParam =
    eventoMatch?.params.idEvento ?? eventoExactMatch?.params.idEvento;
    
  const { usuario, isAdmin } = useAuth();
  const { eventos, eventoAtual, listarEventos } = useEvent();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void listarEventos();
  }, [listarEventos]);

  useEffect(() => {
    if (idEventoParam) {
      localStorage.setItem(EVENTO_STORAGE_KEY, idEventoParam);
    }
  }, [idEventoParam]);

  const idEventoAtivo = useMemo(() => {
    if (idEventoParam) return idEventoParam;
    if (eventoAtual?.id_evento) return eventoAtual.id_evento;

    const stored = localStorage.getItem(EVENTO_STORAGE_KEY);
    if (stored && eventos.some((e) => e.id_evento === stored)) {
      return stored;
    }
    return eventos[0]?.id_evento ?? null;
  }, [idEventoParam, eventoAtual, eventos]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const goEventoSection = (suffix = '') => {
    if (!idEventoAtivo) {
      return;
    }
    localStorage.setItem(EVENTO_STORAGE_KEY, idEventoAtivo);
    go(`/eventos/${idEventoAtivo}${suffix}`);
  };

  const isEventSection = (suffix: string) => {
    if (!idEventoAtivo) return false;
    const base = `/eventos/${idEventoAtivo}${suffix}`;
    if (suffix === '') {
      return location.pathname === base;
    }
    return location.pathname === base || location.pathname.startsWith(`${base}/`);
  };

  // CONSTANTE DE SEGURANÇA: Verifica se o perfil do usuário logado é "avaliador" ou se ele é "admin"
  const isAvaliadorOrAdmin = useMemo(() => {
    const isAvaliador = usuario?.id_perfil?.nome?.toLowerCase() === 'avaliador';
    return isAvaliador || isAdmin;
  }, [usuario, isAdmin]);

  const noEventTitle = t('nav.noEvent');

  const navItems = (onNavigate?: () => void) => (
    <>
      <button
        type="button"
        className={`lt-nav-link ${location.pathname === '/perfil' ? 'is-active' : ''}`}
        onClick={() => {
          onNavigate?.();
          go('/perfil');
        }}
      >
        {t('nav.profile')}
      </button>
      <button
        type="button"
        className={`lt-nav-link ${
          location.pathname === '/eventos' || Boolean(eventoExactMatch) ? 'is-active' : ''
        }`}
        onClick={() => {
          onNavigate?.();
          go('/eventos');
        }}
      >
        {t('events.pageTitle')}
      </button>
      <button
        type="button"
        className={`lt-nav-link ${isEventSection('/comunidade') ? 'is-active' : ''}`}
        disabled={!idEventoAtivo}
        title={idEventoAtivo ? undefined : noEventTitle}
        onClick={() => {
          onNavigate?.();
          goEventoSection('/comunidade');
        }}
      >
        {t('nav.community')}
      </button>
      {/* Avaliador usa Avaliação; evita tela de entregas pensada para participantes. */}
      {(!isAvaliadorOrAdmin || isAdmin) && (
        <button
          type="button"
          className={`lt-nav-link ${isEventSection('/atividades') ? 'is-active' : ''}`}
          disabled={!idEventoAtivo}
          title={idEventoAtivo ? undefined : noEventTitle}
          onClick={() => {
            onNavigate?.();
            goEventoSection('/atividades');
          }}
        >
          {t('nav.activities')}
        </button>
      )}

      <button
        type="button"
        className={`lt-nav-link ${isEventSection('/resultados') ? 'is-active' : ''}`}
        disabled={!idEventoAtivo}
        title={idEventoAtivo ? undefined : noEventTitle}
        onClick={() => {
          onNavigate?.();
          goEventoSection('/resultados');
        }}
      >
        {t('nav.results')}
      </button>

      {isAvaliadorOrAdmin && (
        <button
          type="button"
          className={`lt-nav-link ${isEventSection('/avaliacao') ? 'is-active' : ''}`}
          disabled={!idEventoAtivo}
          title={idEventoAtivo ? undefined : noEventTitle}
          onClick={() => {
            onNavigate?.();
            goEventoSection('/avaliacao');
          }}
        >
          {t('nav.evaluation')}
        </button>
      )}

      <button
        type="button"
        className={`lt-nav-link ${isEventSection('/mural') ? 'is-active' : ''}`}
        disabled={!idEventoAtivo}
        title={idEventoAtivo ? undefined : noEventTitle}
        onClick={() => {
          onNavigate?.();
          goEventoSection('/mural');
        }}
      >
        {t('nav.mural')}
      </button>

      {isAdmin && (
        <button
          type="button"
          className={`lt-nav-link ${location.pathname.startsWith('/admin') ? 'is-active' : ''}`}
          onClick={() => {
            onNavigate?.();
            go('/admin');
          }}
        >
          {t('nav.admin')}
        </button>
      )}
    </>
  );

  const topRight = (
    <div className="app-topbar-actions">
      <LanguageSelector />
      <NotificationBell />
      <UserMenu />
    </div>
  );

  return (
    <div className="app-layout">
      <div className="desktop-logo-bar">
        <BrandLogo to="/perfil" size="sm" showTagline />
      </div>

      <div className="desktop-only-sidebar">
        <SideBar contentSlot={<div className="app-sidebar-nav">{navItems()}</div>} />
      </div>

      <div className="desktop-only-navbar">
        <Navbar right={topRight} />
      </div>

      <div className="mobile-only-navbars">
        <Navbar
          left={
            <div className="mobile-nav-left">
              <button
                type="button"
                className="hamburger-btn"
                aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-drawer"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <HamburgerIcon open={menuOpen} />
              </button>
              <BrandLogo to="/perfil" size="sm" />
            </div>
          }
          right={topRight}
        />
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="mobile-drawer-backdrop"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside id="mobile-drawer" className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="mobile-drawer-header">
              <BrandLogo to="/perfil" size="sm" showTagline />
            </div>
            <nav className="app-sidebar-nav">{navItems(() => setMenuOpen(false))}</nav>
          </aside>
        </>
      )}

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
