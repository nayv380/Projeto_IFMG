import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserContext';
import { useTranslation } from '../i18n';
import Button from './Button';
import '../styles/user-menu.css';

function initials(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function UserMenu(): React.JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { usuario, logout } = useAuth();
  const { meuAvatar } = useUserData();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!usuario) return <></>;

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/auth', { replace: true });
  };

  const handle = meuAvatar?.nome_usuario ? `@${meuAvatar.nome_usuario}` : null;

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={usuario.nome}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="user-menu-avatar" aria-hidden>
          {initials(usuario.nome || '?')}
        </span>
        <span className="user-menu-name">{usuario.nome.split(/\s+/)[0]}</span>
      </button>

      {open && (
        <div className="user-menu-dropdown" id={menuId} role="menu">
          <div className="user-menu-header">
            <p className="user-menu-header-name">{usuario.nome}</p>
            {handle && <p className="user-menu-header-handle">{handle}</p>}
            <p className="user-menu-header-email">{usuario.email}</p>
            <p className="user-menu-header-meta">
              {usuario.instituicao || t('userMenu.institutionFallback')}
              {usuario.pais ? ` · ${usuario.pais}` : ''}
            </p>
          </div>
          <div className="user-menu-actions">
            <Button type="button" variant="danger" label={t('common.logout')} onClick={handleLogout} />
          </div>
        </div>
      )}
    </div>
  );
}
