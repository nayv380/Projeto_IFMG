import React, { useEffect, useId, useRef, useState } from 'react';
import { useUserData } from '../context/UserContext';
import { useTranslation } from '../i18n';
import '../styles/notification-bell.css';

function BellIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 3a5.5 5.5 0 0 0-5.5 5.5v1.7c0 .7-.2 1.4-.55 2L4.7 14.7a1.2 1.2 0 0 0 1 1.9h12.6a1.2 1.2 0 0 0 1-1.9l-1.25-2.5c-.35-.6-.55-1.3-.55-2V8.5A5.5 5.5 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 17.2a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function NotificationBell(): React.JSX.Element {
  const { t, locale } = useTranslation();
  const {
    notificacoes,
    notificacoesNaoLidas,
    carregarNotificacoes,
    marcarNotificacaoLida,
    isLoading,
  } = useUserData();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    void carregarNotificacoes();
  }, [carregarNotificacoes]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        void carregarNotificacoes({ force: true }).catch(() => undefined);
      }
      return next;
    });
  };

  const handleMarkRead = async (id: string, lida: boolean) => {
    if (lida) return;
    try {
      await marcarNotificacaoLida(id);
    } catch {
      /* error already in context */
    }
  };

  return (
    <div className="notif-bell" ref={rootRef}>
      <button
        type="button"
        className="notif-bell-trigger"
        aria-label={
          notificacoesNaoLidas > 0
            ? t('notifications.unread', { count: notificacoesNaoLidas })
            : t('notifications.title')
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={handleToggle}
      >
        <BellIcon />
        {notificacoesNaoLidas > 0 && (
          <span className="notif-bell-badge" aria-hidden>
            {notificacoesNaoLidas > 9 ? '9+' : notificacoesNaoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-bell-dropdown" id={menuId} role="menu">
          <div className="notif-bell-header">
            <strong>{t('notifications.title')}</strong>
          </div>
          <div className="notif-bell-list">
            {isLoading && notificacoes.length === 0 && (
              <p className="notif-bell-empty">{t('notifications.loading')}</p>
            )}
            {!isLoading && notificacoes.length === 0 && (
              <p className="notif-bell-empty">{t('notifications.empty')}</p>
            )}
            {notificacoes.map((n) => (
              <button
                key={n.id}
                type="button"
                role="menuitem"
                className={`notif-bell-item ${n.lida ? '' : 'is-unread'}`.trim()}
                onClick={() => void handleMarkRead(n.id, n.lida)}
              >
                <span className="notif-bell-item-msg">{n.mensagem}</span>
                <span className="notif-bell-item-meta">
                  {new Date(n.criado_em).toLocaleString(locale, {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
