import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../../components/Icon';
import AdminNav from '../../components/AdminNav';
import Spinner from '../../components/Spinner';
import CardBase from '../../components/CardBase';
import { adminService } from '../../services/adminService';
import { useEvent } from '../../context/EventContext';
import { useTranslation } from '../../i18n';
import { ApiError } from '../../services/apiClient';
import '../../styles/admin.css';

interface Shortcut {
  to: string;
  iconName: IconName;
  titleKey: string;
  descriptionKey: string;
}

interface GlobalMetrics {
  usuarios: number;
  eventos: number;
  inscricoes_pendentes: number;
  correcoes_pendentes: number;
  grupos: number;
  entregas: number;
}

/** Hub da área administrativa — Épico 7 */
const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { eventos, eventoAtual, listarEventos } = useEvent();
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const idEventoAtivo = useMemo(() => {
    if (eventoAtual?.id_evento) return eventoAtual.id_evento;
    const stored = localStorage.getItem('lt_evento_atual_id');
    if (stored && eventos.some((e) => e.id_evento === stored)) return stored;
    return eventos[0]?.id_evento ?? null;
  }, [eventoAtual, eventos]);

  useEffect(() => {
    void listarEventos();
  }, [listarEventos]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await adminService.obterDashboardGlobal();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.metricsError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const shortcuts: Shortcut[] = [
    {
      to: '/admin/usuarios',
      iconName: 'users',
      titleKey: 'admin.shortcut.usersTitle',
      descriptionKey: 'admin.shortcut.usersDesc',
    },
    {
      to: '/admin/eventos',
      iconName: 'calendar',
      titleKey: 'admin.shortcut.eventsTitle',
      descriptionKey: 'admin.shortcut.eventsDesc',
    },
    {
      to: '/admin/inscricoes',
      iconName: 'users',
      titleKey: 'admin.shortcut.inscriptionsTitle',
      descriptionKey: 'admin.shortcut.inscriptionsDesc',
    },
    {
      to: '/admin/atividades',
      iconName: 'calendar',
      titleKey: 'admin.shortcut.activitiesTitle',
      descriptionKey: 'admin.shortcut.activitiesDesc',
    },
    {
      to: '/admin/permissoes',
      iconName: 'shield',
      titleKey: 'admin.shortcut.permissionsTitle',
      descriptionKey: 'admin.shortcut.permissionsDesc',
    },
    {
      to: '/admin/configuracoes',
      iconName: 'settings',
      titleKey: 'admin.shortcut.settingsTitle',
      descriptionKey: 'admin.shortcut.settingsDesc',
    },
    {
      to: '/admin/correcoes',
      iconName: 'check-circle',
      titleKey: 'admin.shortcut.correctionsTitle',
      descriptionKey: 'admin.shortcut.correctionsDesc',
    },
  ];

  const eventShortcuts: Shortcut[] = idEventoAtivo
    ? [
        {
          to: `/eventos/${idEventoAtivo}`,
          iconName: 'calendar',
          titleKey: 'admin.shortcut.activeEventTitle',
          descriptionKey: 'admin.shortcut.activeEventDesc',
        },
        {
          to: `/eventos/${idEventoAtivo}/resultados`,
          iconName: 'check-circle',
          titleKey: 'admin.shortcut.eventResultsTitle',
          descriptionKey: 'admin.shortcut.eventResultsDesc',
        },
        {
          to: `/eventos/${idEventoAtivo}/avaliacao`,
          iconName: 'check-circle',
          titleKey: 'admin.shortcut.evaluationTitle',
          descriptionKey: 'admin.shortcut.evaluationDesc',
        },
        {
          to: `/eventos/${idEventoAtivo}/mural`,
          iconName: 'inbox',
          titleKey: 'admin.shortcut.muralTitle',
          descriptionKey: 'admin.shortcut.muralDesc',
        },
        {
          to: `/eventos/${idEventoAtivo}/comunidade`,
          iconName: 'users',
          titleKey: 'admin.shortcut.communityTitle',
          descriptionKey: 'admin.shortcut.communityDesc',
        },
      ]
    : [];

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="lt-page-title">{t('admin.title')}</h1>
        <p className="lt-muted">{t('admin.globalDashboard')}</p>
      </header>

      <AdminNav />

      {error && (
        <div className="admin-banner admin-banner-error">
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <Spinner label={t('common.loading')} />
      ) : (
        metrics && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            {(
              [
                ['admin.metric.users', metrics.usuarios],
                ['admin.metric.events', metrics.eventos],
                ['admin.metric.pendingInscriptions', metrics.inscricoes_pendentes],
                ['admin.metric.pendingCorrections', metrics.correcoes_pendentes],
                ['admin.metric.groups', metrics.grupos],
                ['admin.metric.submissions', metrics.entregas],
              ] as const
            ).map(([labelKey, value]) => (
              <CardBase key={labelKey} title={t(labelKey)} description={String(value)} />
            ))}
          </section>
        )
      )}

      {eventShortcuts.length > 0 && (
        <>
          <h2 className="lt-page-title" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
            {t('admin.eventShortcuts')}
          </h2>
          <div className="admin-dashboard-grid" style={{ marginBottom: '24px' }}>
            {eventShortcuts.map((shortcut) => (
              <Link key={shortcut.to} to={shortcut.to} className="admin-shortcut-card">
                <span className="admin-shortcut-icon">
                  <Icon name={shortcut.iconName} size={20} />
                </span>
                <h3>{t(shortcut.titleKey)}</h3>
                <p>{t(shortcut.descriptionKey)}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="lt-page-title" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
        {t('admin.sectionAdmin')}
      </h2>
      <div className="admin-dashboard-grid">
        {shortcuts.map((shortcut) => (
          <Link key={shortcut.to} to={shortcut.to} className="admin-shortcut-card">
            <span className="admin-shortcut-icon">
              <Icon name={shortcut.iconName} size={20} />
            </span>
            <h3>{t(shortcut.titleKey)}</h3>
            <p>{t(shortcut.descriptionKey)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
