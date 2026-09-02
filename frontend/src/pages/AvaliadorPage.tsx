import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import CardBase from '../components/CardBase';
import Button from '../components/Button';
import Input from '../components/Input';
import Icon from '../components/Icon';
import StatusChip from '../components/StatusChip';
import { useActivity } from '../context/ActivityContext';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import '../styles/activities-page.css';

type FiltroStatus = 'todas' | 'pendentes' | 'em_correcao' | 'corrigidas';

const PAGE_SIZE = 6;

const AvaliadorPage: React.FC = () => {
  const { idEvento } = useParams<{ idEvento: string }>();
  const { t, locale } = useTranslation();
  const { usuario } = useAuth();
  const {
    atividades,
    entregasPendentes,
    correcoes,
    isLoading,
    error,
    carregarAtividades,
    carregarEntregasPendentes,
    carregarCorrecao,
    criarCorrecao,
  } = useActivity();
  const { grupos, listarGrupos } = useGroup();

  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroStatus>('pendentes');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);

  const podeAvaliar =
    usuario?.id_perfil?.nome === 'avaliador' || usuario?.id_perfil?.nome === 'admin';

  useEffect(() => {
    if (!idEvento) return;
    void carregarAtividades(idEvento);
    void listarGrupos({ idEvento });
    void carregarEntregasPendentes(idEvento);
  }, [idEvento, carregarAtividades, listarGrupos, carregarEntregasPendentes]);

  useEffect(() => {
    const corrigidasSemDados = entregasPendentes.filter(
      (e) => e.status === 'corrigida' && !correcoes[e.id_entrega],
    );
    corrigidasSemDados.forEach((e) => {
      void carregarCorrecao(e.id_entrega);
    });
  }, [entregasPendentes, correcoes, carregarCorrecao]);

  useEffect(() => {
    setPage(1);
  }, [filtro, busca]);

  const nomeGrupo = (idGrupo: string) =>
    grupos.find((g) => g.id_grupo === idGrupo)?.nome ?? idGrupo;

  const nomeAtividade = (idAtividade: string) =>
    atividades.find((a) => a.id_atividade === idAtividade)?.titulo ?? idAtividade;

  const formatarData = (dataIso: string) =>
    new Date(dataIso).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return entregasPendentes.filter((e) => {
      if (filtro === 'pendentes' && e.status === 'corrigida') return false;
      if (filtro === 'em_correcao' && e.status !== 'em_correcao') return false;
      if (filtro === 'corrigidas' && e.status !== 'corrigida') return false;
      if (!termo) return true;
      const texto = `${nomeAtividade(e.id_atividade)} ${nomeGrupo(e.id_grupo)}`.toLowerCase();
      return texto.includes(termo);
    });
  }, [entregasPendentes, filtro, busca, atividades, grupos]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaAtual = filtradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendentesCount = entregasPendentes.filter((e) => e.status !== 'corrigida').length;
  const emCorrecaoCount = entregasPendentes.filter((e) => e.status === 'em_correcao').length;
  const corrigidasCount = entregasPendentes.filter((e) => e.status === 'corrigida').length;

  const abrirCorrecao = (idEntrega: string) => {
    setIdEmEdicao(idEntrega);
    setNota('');
    setFeedback('');
    setFormError(null);
  };

  const cancelarCorrecao = () => {
    setIdEmEdicao(null);
    setFormError(null);
  };

  const salvarCorrecao = async (idEntrega: string) => {
    const notaNum = Number(nota);
    if (!nota.trim() || Number.isNaN(notaNum) || notaNum < 0 || notaNum > 100) {
      setFormError(t('avaliacao.invalidGrade'));
      return;
    }
    if (!feedback.trim()) {
      setFormError(t('avaliacao.feedbackRequired'));
      return;
    }

    try {
      await criarCorrecao(idEntrega, { nota: notaNum, feedback: feedback.trim() });
      setIdEmEdicao(null);
    } catch {
      setFormError(t('avaliacao.saveError'));
    }
  };

  if (!idEvento) {
    return <div>{t('event.notFound')}</div>;
  }

  if (!podeAvaliar) {
    return (
      <CardBase
        title={t('avaliacao.restrictedTitle')}
        description={t('avaliacao.restrictedDesc')}
      />
    );
  }

  const filtros: { id: FiltroStatus; label: string; count: number }[] = [
    { id: 'todas', label: t('avaliacao.filterAll'), count: entregasPendentes.length },
    { id: 'pendentes', label: t('avaliacao.filterPending'), count: pendentesCount },
    { id: 'em_correcao', label: t('avaliacao.filterInReview'), count: emCorrecaoCount },
    { id: 'corrigidas', label: t('avaliacao.filterDone'), count: corrigidasCount },
  ];

  return (
    <div className="activities-page">
      <header className="activities-page-header">
        <h1 className="lt-page-title">{t('avaliacao.title')}</h1>
        <p className="lt-muted">{t('avaliacao.subtitle')}</p>
        {error && (
          <div className="activities-page-banner activities-page-banner-error">
            <Icon name="alert-circle" size={18} />
            <span>{error}</span>
          </div>
        )}
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {filtros.map((f) => (
          <Button
            key={f.id}
            label={`${f.label} (${f.count})`}
            variant={filtro === f.id ? 'primary' : 'ghost'}
            onClick={() => setFiltro(f.id)}
          />
        ))}
      </div>

      <Input
        label={t('avaliacao.search')}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={t('avaliacao.search')}
      />

      {isLoading && entregasPendentes.length === 0 ? (
        <div className="activities-page-loading">
          <p>{t('common.loading')}</p>
        </div>
      ) : paginaAtual.length === 0 ? (
        <div className="activities-page-empty">
          <Icon name="inbox" size={32} />
          <p>
            {filtro === 'corrigidas'
              ? t('avaliacao.emptyDone')
              : t('avaliacao.emptyPending')}
          </p>
        </div>
      ) : (
        <>
          <div className="activities-grid" style={{ marginTop: '16px' }}>
            {paginaAtual.map((entrega) => {
              const correcao = correcoes[entrega.id_entrega];
              const isCorrigida = entrega.status === 'corrigida';

              return (
                <CardBase
                  key={entrega.id_entrega}
                  title={nomeAtividade(entrega.id_atividade)}
                  description={nomeGrupo(entrega.id_grupo)}
                  contentSlot={
                    <>
                      <StatusChip
                        label={
                          isCorrigida
                            ? t('avaliacao.filterDone')
                            : entrega.status === 'em_correcao'
                              ? t('avaliacao.filterInReview')
                              : t('avaliacao.filterPending')
                        }
                        iconName={isCorrigida ? 'check-circle' : 'clock'}
                        variant={isCorrigida ? 'success' : 'pending'}
                      />
                      {!isCorrigida && (
                        <>
                          <p style={{ marginTop: '8px' }}>
                            <a href={entrega.url_arquivo} target="_blank" rel="noreferrer">
                              {entrega.url_arquivo}
                            </a>
                          </p>
                          <p className="lt-muted" style={{ fontSize: '0.85rem' }}>
                            {formatarData(entrega.enviado_em)}
                          </p>
                        </>
                      )}

                      {isCorrigida &&
                        (correcao ? (
                          <div style={{ marginTop: '8px' }}>
                            <strong>{correcao.nota} pts</strong>
                            {correcao.feedback && <p>{correcao.feedback}</p>}
                            {!correcao.validado_por_admin && (
                              <StatusChip
                                label={t('avaliacao.waitingAdmin')}
                                iconName="clock"
                                variant="pending"
                              />
                            )}
                          </div>
                        ) : (
                          <p className="lt-muted" style={{ fontSize: '0.85rem' }}>
                            {t('common.loading')}
                          </p>
                        ))}

                      {idEmEdicao === entrega.id_entrega && (
                        <div
                          style={{
                            marginTop: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          <Input
                            label={t('avaliacao.gradeLabel')}
                            type="number"
                            min={0}
                            max={100}
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                          />
                          <div className="input-container">
                            <label className="input-label">{t('avaliacao.feedbackLabel')}</label>
                            <textarea
                              className="input-element"
                              rows={3}
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                            />
                          </div>
                          {formError && <p className="input-error-message">{formError}</p>}
                        </div>
                      )}
                    </>
                  }
                  footerSlot={
                    isCorrigida ? undefined : idEmEdicao === entrega.id_entrega ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          label={t('avaliacao.save')}
                          variant="primary"
                          onClick={() => void salvarCorrecao(entrega.id_entrega)}
                          disabled={isLoading}
                        />
                        <Button
                          label={t('common.cancel')}
                          variant="ghost"
                          onClick={cancelarCorrecao}
                          disabled={isLoading}
                        />
                      </div>
                    ) : (
                      <Button
                        label={t('avaliacao.correct')}
                        variant="primary"
                        onClick={() => abrirCorrecao(entrega.id_entrega)}
                      />
                    )
                  }
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                marginTop: '20px',
                alignItems: 'center',
              }}
            >
              <Button
                label="‹"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              <span className="lt-muted">
                {page} / {totalPages}
              </span>
              <Button
                label="›"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AvaliadorPage;
