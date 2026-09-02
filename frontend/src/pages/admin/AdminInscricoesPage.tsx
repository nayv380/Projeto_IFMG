import React, { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import Icon from '../../components/Icon';
import StatusChip from '../../components/StatusChip';
import { eventService } from '../../services/eventService';
import { ApiError } from '../../services/apiClient';
import { useTranslation } from '../../i18n';
import type { Evento, Inscricao } from '../../types/event.types';
import '../../styles/admin.css';

const AdminInscricoesPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [idEvento, setIdEvento] = useState('');
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const lista = await eventService.listarEventos();
        setEventos(lista);
        if (lista[0]) setIdEvento(lista[0].id_evento);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.inscriptions.loadEventsError'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [t]);

  const carregar = async (eventoId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const lista = await eventService.listarInscricoesDoEvento(eventoId, { status: 'pendente' });
      setInscricoes(lista);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.inscriptions.loadError'));
      setInscricoes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (idEvento) void carregar(idEvento);
  }, [idEvento]);

  const responder = async (idInscricao: string, status: 'aprovada' | 'recusada') => {
    setAtualizandoId(idInscricao);
    try {
      await eventService.aprovarInscricao(idInscricao, status);
      setInscricoes((atual) => atual.filter((i) => i.id_inscricao !== idInscricao));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.inscriptions.updateError'));
    } finally {
      setAtualizandoId(null);
    }
  };

  const statusLabel = (status: string) => {
    const key = `status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="lt-page-title">{t('admin.inscriptions.title')}</h1>
        <p className="lt-muted">{t('admin.inscriptions.subtitle')}</p>
      </header>

      <AdminNav />

      <div className="admin-filter-field">
        <label className="input-label" htmlFor="inscricoes-evento">
          {t('common.event')}
        </label>
        <select
          id="inscricoes-evento"
          className="input-element"
          value={idEvento}
          onChange={(e) => setIdEvento(e.target.value)}
        >
          {eventos.map((evento) => (
            <option key={evento.id_evento} value={evento.id_evento}>
              {evento.nome}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="admin-banner admin-banner-error">
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="admin-empty">
          <Spinner label={t('admin.inscriptions.loading')} />
        </div>
      ) : inscricoes.length === 0 ? (
        <div className="admin-empty">
          <Icon name="inbox" size={32} />
          <p>{t('admin.inscriptions.empty')}</p>
        </div>
      ) : (
        <div className="admin-list admin-list--inscricoes">
          <div className="admin-row-header admin-row--inscricao">
            <span>{t('common.user')}</span>
            <span>{t('common.country')}</span>
            <span>{t('common.institution')}</span>
            <span>{t('common.course')}</span>
            <span>{t('common.status')}</span>
            <span>{t('common.createdAt')}</span>
            <span>{t('common.actions')}</span>
          </div>
          {inscricoes.map((inscricao) => {
            const busy = atualizandoId === inscricao.id_inscricao;
            return (
              <div className="admin-row admin-row--inscricao" key={inscricao.id_inscricao}>
                <div className="admin-row-primary">
                  <strong>{inscricao.usuario_nome || inscricao.id_usuario}</strong>
                  {inscricao.usuario_email && <span>{inscricao.usuario_email}</span>}
                </div>
                <div className="admin-row-cell">{inscricao.pais || '—'}</div>
                <div className="admin-row-cell">{inscricao.instituicao || '—'}</div>
                <div className="admin-row-cell">{inscricao.curso || '—'}</div>
                <div className="admin-row-cell">
                  <StatusChip label={statusLabel(inscricao.status)} variant="pending" />
                </div>
                <div className="admin-row-cell admin-row-cell--muted">
                  {new Date(inscricao.criado_em).toLocaleString(locale, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="admin-row-actions">
                  <Button
                    variant="primary"
                    iconName="check-circle"
                    aria-label={t('common.approve')}
                    title={t('common.approve')}
                    disabled={busy}
                    onClick={() => void responder(inscricao.id_inscricao, 'aprovada')}
                  />
                  <Button
                    variant="ghost"
                    iconName="x"
                    aria-label={t('common.reject')}
                    title={t('common.reject')}
                    disabled={busy}
                    onClick={() => void responder(inscricao.id_inscricao, 'recusada')}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminInscricoesPage;
