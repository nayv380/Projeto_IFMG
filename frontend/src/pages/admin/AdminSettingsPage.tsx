import React, { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import Icon from '../../components/Icon';
import { adminService } from '../../services/adminService';
import { ApiError } from '../../services/apiClient';
import { useTranslation } from '../../i18n';
import type { ConfiguracoesSistema } from '../../types/identity.types';
import '../../styles/admin.css';

const PADRAO: ConfiguracoesSistema = {
  nome_plataforma: '',
  email_suporte: '',
  paises_participantes: [],
  modo_manutencao: false,
};

/**
 * Configurações básicas do sistema — critério "Configurações básicas do
 * sistema disponíveis" (Épico 7). Ver nota em `identity.types.ts`: essa
 * entidade não existe ainda no ERD/backend, campos são uma proposta inicial.
 */
const AdminSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ConfiguracoesSistema>(PADRAO);
  const [paisesTexto, setPaisesTexto] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await adminService.obterConfiguracoes();
        setConfig(data);
        setPaisesTexto(data.paises_participantes.join(', '));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.settings.loadError'));
      } finally {
        setIsLoading(false);
      }
    }
    void carregar();
  }, [t]);

  const handleSalvar = async () => {
    setSalvando(true);
    setError(null);
    setSucesso(null);
    try {
      const payload: ConfiguracoesSistema = {
        ...config,
        paises_participantes: paisesTexto
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
      };
      const atualizado = await adminService.salvarConfiguracoes(payload);
      setConfig(atualizado);
      setSucesso(t('admin.settings.saveSuccess'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.settings.saveError'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="lt-page-title">{t('admin.title')}</h1>
        <p className="lt-muted">{t('admin.settings.subtitle')}</p>
      </header>

      <AdminNav />

      {error && (
        <div className="admin-banner admin-banner-error">
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </div>
      )}
      {sucesso && !error && (
        <div className="admin-banner admin-banner-success">
          <Icon name="check-circle" size={18} />
          <span>{sucesso}</span>
        </div>
      )}

      {isLoading ? (
        <div className="admin-empty">
          <Spinner label={t('admin.settings.loading')} />
        </div>
      ) : (
        <div className="admin-form">
          <Input
            label={t('admin.settings.platformName')}
            value={config.nome_plataforma}
            onChange={(e) => setConfig((c) => ({ ...c, nome_plataforma: e.target.value }))}
          />
          <Input
            label={t('admin.settings.supportEmail')}
            type="email"
            value={config.email_suporte}
            onChange={(e) => setConfig((c) => ({ ...c, email_suporte: e.target.value }))}
          />
          <Input
            label={t('admin.settings.countries')}
            description={t('admin.settings.countriesHint')}
            value={paisesTexto}
            onChange={(e) => setPaisesTexto(e.target.value)}
          />
          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={config.modo_manutencao}
              onChange={(e) => setConfig((c) => ({ ...c, modo_manutencao: e.target.checked }))}
            />
            {t('admin.settings.maintenance')}
          </label>

          <div className="admin-form-actions">
            <Button
              variant="primary"
              label={t('admin.settings.save')}
              disabled={salvando}
              onClick={() => void handleSalvar()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
