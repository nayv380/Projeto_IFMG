import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import Icon from '../../components/Icon';
import { adminService } from '../../services/adminService';
import { ApiError } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import type { Usuario } from '../../types/auth-types';
import '../../styles/admin.css';

/** Gerenciamento de usuários — critério "Gerenciamento de usuários implementado" (Épico 7) */
const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { usuario: me } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pendentes, setPendentes] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [lista, aguardando] = await Promise.all([
        adminService.listarUsuarios(),
        adminService.listarAvaliadoresPendentes(),
      ]);
      setUsuarios(lista);
      setPendentes(aguardando);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.users.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const idsPendentes = new Set(pendentes.map((p) => p.id_usuario));
    const base = usuarios.filter((u) => !idsPendentes.has(u.id_usuario));
    if (!termo) return base;
    return base.filter(
      (u) => u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo),
    );
  }, [usuarios, busca, pendentes]);

  const aprovarAvaliador = async (usuario: Usuario) => {
    setAtualizandoId(usuario.id_usuario);
    setSucesso(null);
    setError(null);
    try {
      const atualizado = await adminService.aprovarAvaliador(usuario.id_usuario);
      setPendentes((atual) => atual.filter((u) => u.id_usuario !== atualizado.id_usuario));
      setUsuarios((atual) => {
        const existe = atual.some((u) => u.id_usuario === atualizado.id_usuario);
        if (existe) {
          return atual.map((u) => (u.id_usuario === atualizado.id_usuario ? atualizado : u));
        }
        return [atualizado, ...atual];
      });
      setSucesso(t('admin.users.approveSuccess', { name: atualizado.nome }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.users.approveError'));
    } finally {
      setAtualizandoId(null);
    }
  };

  const alternarAtivo = async (usuario: Usuario) => {
    const isSelf = usuario.id_usuario === me?.id_usuario;
    if (isSelf && usuario.is_active) {
      setError(t('admin.users.cannotDeactivateSelf'));
      return;
    }
    setAtualizandoId(usuario.id_usuario);
    setError(null);
    try {
      const atualizado = await adminService.atualizarUsuario(usuario.id_usuario, {
        is_active: !usuario.is_active,
      });
      setUsuarios((atual) =>
        atual.map((u) => (u.id_usuario === atualizado.id_usuario ? atualizado : u)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.users.updateError'));
    } finally {
      setAtualizandoId(null);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="lt-page-title">{t('admin.title')}</h1>
        <p className="lt-muted">{t('admin.users.subtitle')}</p>
      </header>

      <AdminNav />

      {error && (
        <div className="admin-banner admin-banner-error">
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </div>
      )}

      {sucesso && (
        <div className="admin-banner admin-banner-success">
          <Icon name="check-circle" size={18} />
          <span>{sucesso}</span>
        </div>
      )}

      {isLoading && (
        <div className="admin-empty">
          <Spinner label={t('admin.users.loading')} />
        </div>
      )}

      {!isLoading && (
        <>
          <section className="admin-section">
            <h2 className="admin-section-title">
              {t('admin.users.pendingTitle')}
              {pendentes.length > 0 ? ` (${pendentes.length})` : ''}
            </h2>
            <p className="lt-muted">{t('admin.users.pendingDesc')}</p>

            {pendentes.length === 0 ? (
              <div className="admin-empty admin-empty-compact">
                <p>{t('admin.users.pendingEmpty')}</p>
              </div>
            ) : (
              <div className="admin-list">
                <div className="admin-row-header">
                  <span>{t('common.user')}</span>
                  <span>{t('admin.users.colCountryInstitution')}</span>
                  <span>{t('common.profile')}</span>
                  <span>{t('common.actions')}</span>
                </div>
                {pendentes.map((usuario) => (
                  <div className="admin-row" key={usuario.id_usuario}>
                    <div className="admin-row-primary">
                      <strong>{usuario.nome}</strong>
                      <span>{usuario.email}</span>
                    </div>
                    <div className="admin-row-primary">
                      <span>{usuario.pais || '—'}</span>
                      <span>{usuario.instituicao || '—'}</span>
                    </div>
                    <div className="admin-row-primary">
                      <span>{usuario.id_perfil?.nome ?? t('admin.users.roleEvaluator')}</span>
                      <span className="admin-status-pending">{t('status.pendente')}</span>
                    </div>
                    <div className="admin-row-actions">
                      <Button
                        variant="primary"
                        label={t('common.approve')}
                        disabled={atualizandoId === usuario.id_usuario}
                        onClick={() => void aprovarAvaliador(usuario)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">{t('admin.users.allTitle')}</h2>

            <div className="admin-toolbar">
              <Input
                label={t('admin.users.searchLabel')}
                placeholder={t('admin.users.searchPlaceholder')}
                iconName="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            {usuariosFiltrados.length === 0 ? (
              <div className="admin-empty">
                <Icon name="users" size={32} />
                <p>{t('admin.users.empty')}</p>
              </div>
            ) : (
              <div className="admin-list">
                <div className="admin-row-header">
                  <span>{t('common.user')}</span>
                  <span>{t('admin.users.colCountryInstitution')}</span>
                  <span>{t('common.profile')}</span>
                  <span>{t('common.actions')}</span>
                </div>
                {usuariosFiltrados.map((usuario) => {
                  const isSelf = usuario.id_usuario === me?.id_usuario;
                  const cannotDeactivateSelf = isSelf && usuario.is_active;
                  return (
                  <div className="admin-row" key={usuario.id_usuario}>
                    <div className="admin-row-primary">
                      <strong>{usuario.nome}</strong>
                      <span>{usuario.email}</span>
                    </div>
                    <div className="admin-row-primary">
                      <span>{usuario.pais || '—'}</span>
                      <span>{usuario.instituicao || '—'}</span>
                    </div>
                    <div className="admin-row-primary">
                      <span>{usuario.id_perfil?.nome ?? t('admin.users.noProfile')}</span>
                      <span>{usuario.is_active ? t('common.active') : t('common.inactive')}</span>
                    </div>
                    <div className="admin-row-actions">
                      <Button
                        variant={usuario.is_active ? 'danger' : 'primary'}
                        iconName={usuario.is_active ? 'user-x' : 'user-check'}
                        aria-label={
                          cannotDeactivateSelf
                            ? t('admin.users.cannotDeactivateSelf')
                            : usuario.is_active
                              ? t('admin.users.deactivate')
                              : t('admin.users.activate')
                        }
                        title={
                          cannotDeactivateSelf
                            ? t('admin.users.cannotDeactivateSelf')
                            : usuario.is_active
                              ? t('admin.users.deactivate')
                              : t('admin.users.activate')
                        }
                        disabled={
                          atualizandoId === usuario.id_usuario || cannotDeactivateSelf
                        }
                        onClick={() => void alternarAtivo(usuario)}
                      />
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminUsersPage;
