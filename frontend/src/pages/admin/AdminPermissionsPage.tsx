import React, { useEffect, useMemo, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import Spinner from '../../components/Spinner';
import Icon from '../../components/Icon';
import { adminService } from '../../services/adminService';
import { ApiError } from '../../services/apiClient';
import { useTranslation } from '../../i18n';
import type { Perfil, Permissao } from '../../types/identity.types';
import '../../styles/admin.css';

/**
 * Controle de permissões — critério "Controle de permissões disponível" (Épico 7).
 * Mostra a matriz Perfil x Permissão (models `identity.Perfil`, `identity.Permissao`
 * e `identity.PerfilPermissao` do ERD) e permite vincular/desvincular clicando na célula.
 */
const AdminPermissionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  // Guarda vínculos como um Set de "idPerfil::idPermissao" para lookup O(1) na matriz
  const [vinculos, setVinculos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alternando, setAlternando] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      setIsLoading(true);
      setError(null);
      try {
        const [perfisData, permissoesData] = await Promise.all([
          adminService.listarPerfis(),
          adminService.listarPermissoes(),
        ]);
        setPerfis(perfisData);
        setPermissoes(permissoesData);

        const vinculosCarregados = new Set<string>();
        await Promise.all(
          perfisData.map(async (perfil) => {
            const vinculadas = await adminService.listarPermissoesDoPerfil(perfil.id_perfil);
            vinculadas.forEach((p) => {
              vinculosCarregados.add(`${perfil.id_perfil}::${p.id_permissao}`);
            });
          }),
        );
        setVinculos(vinculosCarregados);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.permissions.loadError'));
      } finally {
        setIsLoading(false);
      }
    }
    void carregar();
  }, [t]);

  const chave = (idPerfil: string, idPermissao: string) => `${idPerfil}::${idPermissao}`;

  const alternarVinculo = async (idPerfil: string, idPermissao: string) => {
    const key = chave(idPerfil, idPermissao);
    setAlternando(key);
    setError(null);
    const jaVinculado = vinculos.has(key);
    try {
      if (jaVinculado) {
        await adminService.desvincularPermissao(idPerfil, idPermissao);
      } else {
        await adminService.vincularPermissao(idPerfil, idPermissao);
      }
      setVinculos((atual) => {
        const novo = new Set(atual);
        if (jaVinculado) novo.delete(key);
        else novo.add(key);
        return novo;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.permissions.updateError'));
    } finally {
      setAlternando(null);
    }
  };

  const semDados = useMemo(() => perfis.length === 0 || permissoes.length === 0, [perfis, permissoes]);

  const perfisOrdenados = useMemo(() => {
    const ordem = ['admin', 'avaliador', 'participante'];
    return [...perfis].sort((a, b) => {
      const ia = ordem.indexOf(a.nome.toLowerCase());
      const ib = ordem.indexOf(b.nome.toLowerCase());
      const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
      const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
      if (ra !== rb) return ra - rb;
      return a.nome.localeCompare(b.nome);
    });
  }, [perfis]);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="lt-page-title">{t('admin.title')}</h1>
        <p className="lt-muted">{t('admin.permissions.subtitle')}</p>
      </header>

      <AdminNav />

      {error && (
        <div className="admin-banner admin-banner-error">
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="admin-empty">
          <Spinner label={t('admin.permissions.loading')} />
        </div>
      )}

      {!isLoading && semDados && (
        <div className="admin-empty">
          <Icon name="shield" size={32} />
          <p>{t('admin.permissions.empty')}</p>
        </div>
      )}

      {!isLoading && !semDados && (
        <div className="permission-matrix">
          <table>
            <colgroup>
              <col className="permission-matrix-col-label" />
              {perfisOrdenados.map((perfil) => (
                <col key={perfil.id_perfil} className="permission-matrix-col-role" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{t('admin.permissions.colPermission')}</th>
                {perfisOrdenados.map((perfil) => (
                  <th key={perfil.id_perfil} scope="col">
                    {perfil.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissoes.map((permissao) => (
                <tr key={permissao.id_permissao}>
                  <th scope="row">
                    <strong>{permissao.nome}</strong>
                    <br />
                    <span className="permission-matrix-key">
                      {permissao.recurso} · {permissao.acao}
                    </span>
                  </th>
                  {perfisOrdenados.map((perfil) => {
                    const key = chave(perfil.id_perfil, permissao.id_permissao);
                    const marcado = vinculos.has(key);
                    return (
                      <td key={key} className="check-cell">
                        <button
                          type="button"
                          aria-label={
                            marcado
                              ? t('admin.permissions.revokeAria', {
                                  permission: permissao.nome,
                                  role: perfil.nome,
                                })
                              : t('admin.permissions.grantAria', {
                                  permission: permissao.nome,
                                  role: perfil.nome,
                                })
                          }
                          disabled={alternando === key}
                          onClick={() => void alternarVinculo(perfil.id_perfil, permissao.id_permissao)}
                          className={marcado ? 'is-granted' : 'is-denied'}
                        >
                          <Icon name={marcado ? 'check-circle' : 'x'} size={20} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPermissionsPage;
