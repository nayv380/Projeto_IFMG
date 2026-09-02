import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Icon, { type IconName } from '../components/Icon';
import { useEvent } from '../context/EventContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTranslation } from '../i18n';
import { ApiError } from '../services/apiClient';
import '../styles/event-page.css';

const EventPage: React.FC = () => {
  const { idEvento } = useParams<{ idEvento: string }>();
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const { confirm } = useFeedback();
  const {
    eventoAtual,
    selecionarEvento,
    inscrever,
    cancelarInscricao,
    minhasInscricoes,
    carregarMinhasInscricoes,
    isLoadingEvento,
    error,
  } = useEvent();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  useEffect(() => {
    if (!idEvento) return;
    void Promise.all([selecionarEvento(idEvento), carregarMinhasInscricoes()]);
  }, [idEvento, selecionarEvento, carregarMinhasInscricoes]);

  const minhaInscricao = useMemo(
    () => minhasInscricoes.find((i) => i.id_evento === eventoAtual?.id_evento) ?? null,
    [minhasInscricoes, eventoAtual?.id_evento],
  );

  const formatarData = (dataIso: string | null) => {
    if (!dataIso) return t('event.undefined');
    return new Date(dataIso).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleInscricao = async () => {
    if (!eventoAtual) return;
    setBusy(true);
    setActionError(null);
    setActionOk(null);
    try {
      await inscrever({ id_evento: eventoAtual.id_evento });
      setActionOk(t('event.successSubscription'));
      void carregarMinhasInscricoes({ force: true });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('event.errorSubscription'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelar = async () => {
    if (!minhaInscricao) return;
    const ok = await confirm({ message: t('event.cancelConfirm') });
    if (!ok) return;

    setBusy(true);
    setActionError(null);
    setActionOk(null);
    try {
      await cancelarInscricao(minhaInscricao.id_inscricao);
      setActionOk(t('event.cancelSuccess'));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('event.cancelError'));
    } finally {
      setBusy(false);
    }
  };

  if (isLoadingEvento && !eventoAtual) {
    return <div className="event-page-loading">{t('event.loading')}</div>;
  }

  if (error && !eventoAtual) {
    return <div className="event-page-error">{t('event.error', { value: error })}</div>;
  }

  if (!eventoAtual) {
    return <div className="event-page-error">{t('event.notFound')}</div>;
  }

  const inscricoesAbertas = eventoAtual.status === 'inscricoes_abertas';
  const podeInscrever = !minhaInscricao && inscricoesAbertas;
  const podeCancelar = Boolean(minhaInscricao) && inscricoesAbertas;
  const inscricaoAprovada = minhaInscricao?.status === 'aprovada';
  const inscricaoPendente = minhaInscricao?.status === 'pendente';

  const inscricaoLabel = inscricaoAprovada
    ? t('event.subscriptionApproved')
    : inscricaoPendente
      ? t('event.subscriptionPending')
      : t('event.subscriptionConfirmed');

  const scheduleItems: { icon: IconName; label: string; value: string }[] = [
    {
      icon: 'calendar',
      label: t('common.start'),
      value: formatarData(eventoAtual.data_inicio),
    },
    {
      icon: 'calendar',
      label: t('common.end'),
      value: formatarData(eventoAtual.data_fim),
    },
  ];

  if (eventoAtual.prazo_formacao_grupo) {
    scheduleItems.push({
      icon: 'clock',
      label: t('common.groupDeadline'),
      value: formatarData(eventoAtual.prazo_formacao_grupo),
    });
  }

  return (
    <div className="event-page">
      <button type="button" className="event-back" onClick={() => navigate('/eventos')}>
        ← {t('events.backToList')}
      </button>

      <article className="event-hero" aria-labelledby="event-hero-title">
        <div className="event-hero-band" aria-hidden />
        <div className="event-hero-inner">
          <header className="event-hero-header">
            <p className="event-hero-kicker">{t(`event.status.${eventoAtual.status}`)}</p>
            <h1 id="event-hero-title" className="event-hero-title">
              {eventoAtual.nome}
            </h1>
            {eventoAtual.descricao && (
              <p className="event-hero-desc">{eventoAtual.descricao}</p>
            )}
          </header>

          <section className="event-schedule" aria-label={t('event.scheduleLabel')}>
            {scheduleItems.map((item) => (
              <div key={item.label} className="event-schedule-item">
                <span className="event-schedule-icon" aria-hidden>
                  <Icon name={item.icon} size={18} />
                </span>
                <div className="event-schedule-copy">
                  <span className="event-schedule-label">{item.label}</span>
                  <span className="event-schedule-value">{item.value}</span>
                </div>
              </div>
            ))}
          </section>

          <footer className="event-footer">
            <div className="event-footer-row">
              {minhaInscricao ? (
                <div className="event-registration">
                  <span className="event-registration-icon" aria-hidden>
                    <Icon
                      name={inscricaoAprovada ? 'check-circle' : 'clock'}
                      size={18}
                    />
                  </span>
                  <div>
                    <p className="event-registration-label">{t('event.yourRegistration')}</p>
                    <p className="event-registration-value">{inscricaoLabel}</p>
                  </div>
                </div>
              ) : (
                <div />
              )}

              <div className="event-actions">
                {podeInscrever && (
                  <Button
                    label={busy ? t('common.loading') : t('event.subscribe')}
                    variant="primary"
                    onClick={() => void handleInscricao()}
                    disabled={busy}
                  />
                )}

                {podeCancelar && (
                  <Button
                    label={t('event.cancelSubscription')}
                    variant="danger"
                    onClick={() => void handleCancelar()}
                    disabled={busy}
                  />
                )}
              </div>
            </div>

            {podeCancelar && <p className="event-actions-hint">{t('event.cancelHint')}</p>}

            {!minhaInscricao && !inscricoesAbertas && (
              <p className="event-actions-hint">{t('event.subscribeUnavailable')}</p>
            )}

            {(actionError || actionOk) && (
              <p
                className="event-actions-hint"
                role={actionError ? 'alert' : 'status'}
                style={{ color: actionError ? 'var(--lt-danger)' : 'var(--lt-success)' }}
              >
                {actionError || actionOk}
              </p>
            )}
          </footer>
        </div>
      </article>

      {eventoAtual.link_whatsapp_geral && (
        <div className="event-whatsapp">
          <span>{t('common.community')}</span>
          <a href={eventoAtual.link_whatsapp_geral} target="_blank" rel="noreferrer">
            {t('event.communityLink')}
          </a>
        </div>
      )}
    </div>
  );
};

export default EventPage;
