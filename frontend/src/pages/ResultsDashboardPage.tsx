import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import CardBase from '../components/CardBase';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import { eventService } from '../services/eventService';
import { ApiError } from '../services/apiClient';
import { useTranslation } from '../i18n';
import { downloadTextFile, rankingToCsv } from '../utils/rankingExport';
import '../styles/admin.css';
import '../styles/activities-page.css';

interface RankingItem {
  posicao: number;
  id_grupo: string;
  nome: string;
  total_nota: number;
  media_nota: number;
  entregas_corrigidas: number;
}

const ResultsDashboardPage: React.FC = () => {
  const { idEvento } = useParams<{ idEvento: string }>();
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<Record<string, number | string> | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idEvento) return;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [dash, rank] = await Promise.all([
          eventService.obterDashboard(idEvento),
          eventService.obterRanking(idEvento),
        ]);
        setDashboard(dash);
        setRanking(rank);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('results.loadError'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [idEvento, t]);

  const maxNota = useMemo(
    () => Math.max(1, ...ranking.map((r) => r.total_nota)),
    [ranking],
  );

  const exportar = () => {
    const csv = rankingToCsv(ranking);
    downloadTextFile(`ranking-evento-${idEvento}.csv`, csv);
  };

  if (!idEvento) return <p>{t('event.notFound')}</p>;

  return (
    <div className="activities-page">
      <header className="activities-page-header">
        <h1 className="lt-page-title">{t('nav.results')}</h1>
        <p className="lt-muted">{t('results.subtitle')}</p>
        {ranking.length > 0 && (
          <Button label={t('results.exportCsv')} variant="secondary" onClick={exportar} />
        )}
      </header>

      {error && (
        <div className="activities-page-banner activities-page-banner-error">
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <>
          {dashboard && (
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              {(
                [
                  ['results.metric.groups', dashboard.total_grupos],
                  ['results.metric.activities', dashboard.total_atividades],
                  ['results.metric.submissions', dashboard.total_entregas],
                  ['results.metric.pending', dashboard.entregas_pendentes],
                  ['results.metric.publishedScores', dashboard.correcoes_validadas],
                ] as const
              ).map(([labelKey, value]) => (
                <CardBase key={labelKey} title={t(labelKey)} description={String(value ?? 0)} />
              ))}
            </section>
          )}

          {ranking.length > 0 && (
            <section style={{ marginBottom: '24px' }}>
              <h2 className="lt-page-title" style={{ fontSize: '1.1rem' }}>
                {t('results.chartTitle')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {ranking.slice(0, 10).map((item) => {
                  const pct = Math.round((item.total_nota / maxNota) * 100);
                  return (
                    <div key={item.id_grupo}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          marginBottom: '4px',
                        }}
                      >
                        <span>
                          #{item.posicao} {item.nome}
                        </span>
                        <strong>{item.total_nota.toFixed(1)}</strong>
                      </div>
                      <div
                        style={{
                          height: '10px',
                          borderRadius: '999px',
                          background: '#e5e7eb',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #2563eb, #0ea5e9)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="lt-page-title" style={{ fontSize: '1.1rem' }}>
              {t('results.ranking')}
            </h2>
            {ranking.length === 0 ? (
              <p className="lt-muted">{t('results.rankingEmpty')}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('results.col.group')}</th>
                      <th>{t('results.col.total')}</th>
                      <th>{t('results.col.average')}</th>
                      <th>{t('results.col.submissions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((item) => (
                      <tr key={item.id_grupo}>
                        <td>{item.posicao}</td>
                        <td>{item.nome}</td>
                        <td>{item.total_nota.toFixed(1)}</td>
                        <td>{item.media_nota.toFixed(1)}</td>
                        <td>{item.entregas_corrigidas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default ResultsDashboardPage;
