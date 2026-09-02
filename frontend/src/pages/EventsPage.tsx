import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useEvent } from '../context/EventContext';
import { useTranslation } from '../i18n';
import type { Evento, EventoStatus } from '../types/event.types';
import '../styles/event-page.css';

type StatusFilter = 'todos' | EventoStatus;

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EventCard({
  evento,
  locale,
  t,
  onOpen,
}: {
  evento: Evento;
  locale: string;
  t: (key: string) => string;
  onOpen: () => void;
}) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const statusLabel = t(`event.status.${evento.status}`);

  return (
    <button
      type="button"
      className="event-card"
      onClick={onOpen}
      aria-label={`${evento.nome}. ${statusLabel}. ${t('events.viewEvent')}`}
    >
      <div className={`event-card-band event-card-band--${evento.status}`} aria-hidden />
      <div className="event-card-body">
        <p className={`event-card-status event-card-status--${evento.status}`}>{statusLabel}</p>
        <h2 className="event-card-title">{evento.nome}</h2>
        {evento.descricao && <p className="event-card-desc">{evento.descricao}</p>}
        <div className="event-card-footer">
          <div className="event-card-dates">
            <span className="event-card-date" title={t('common.start')}>
              <Icon name="calendar" size={15} aria-hidden />
              <time dateTime={evento.data_inicio}>{formatDate(evento.data_inicio)}</time>
            </span>
            <span className="event-card-date" title={t('common.end')}>
              <Icon name="clock" size={15} aria-hidden />
              <time dateTime={evento.data_fim}>{formatDate(evento.data_fim)}</time>
            </span>
          </div>
          <span className="event-card-cta" title={t('events.viewEvent')} aria-hidden>
            <Icon name="eye" size={18} />
          </span>
        </div>
      </div>
    </button>
  );
}

export default function EventsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const { eventos, listarEventos, isLoadingEventos, error } = useEvent();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<StatusFilter>('todos');

  useEffect(() => {
    void listarEventos();
  }, [listarEventos]);

  useEffect(() => {
    const status = filtro === 'todos' ? undefined : filtro;
    void listarEventos({ status });
  }, [filtro, listarEventos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return eventos.filter((evento) => {
      if (filtro !== 'todos' && evento.status !== filtro) return false;
      if (!termo) return true;
      return (
        evento.nome.toLowerCase().includes(termo) ||
        evento.descricao.toLowerCase().includes(termo)
      );
    });
  }, [eventos, busca, filtro]);

  const filtros: { id: StatusFilter; label: string }[] = [
    { id: 'todos', label: t('events.filterAll') },
    { id: 'inscricoes_abertas', label: t('event.status.inscricoes_abertas') },
    { id: 'em_andamento', label: t('event.status.em_andamento') },
    { id: 'planejado', label: t('event.status.planejado') },
    { id: 'finalizado', label: t('event.status.finalizado') },
  ];

  return (
    <div className="events-catalog">
      <header className="events-catalog-header">
        <h1>{t('events.pageTitle')}</h1>
        <p>{t('events.pageSubtitle')}</p>
      </header>

      <div className="events-toolbar">
        <label className="events-search">
          <span className="events-search-icon">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t('events.searchPlaceholder')}
            aria-label={t('events.searchPlaceholder')}
          />
        </label>

        <div className="events-filters" role="group" aria-label={t('common.status')}>
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`events-filter-chip${filtro === f.id ? ' is-active' : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="event-page-error" role="alert">{error}</p>}

      {isLoadingEventos && eventos.length === 0 ? (
        <p className="events-empty">{t('events.loading')}</p>
      ) : filtrados.length === 0 ? (
        <p className="events-empty">{t('events.empty')}</p>
      ) : (
        <div className="events-grid">
          {filtrados.map((evento) => (
            <EventCard
              key={evento.id_evento}
              evento={evento}
              locale={locale}
              t={t}
              onOpen={() => {
                localStorage.setItem('lt_evento_atual_id', evento.id_evento);
                navigate(`/eventos/${evento.id_evento}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
