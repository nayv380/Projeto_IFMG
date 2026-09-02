import React, { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import CardBase from '../../components/CardBase';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Spinner from '../../components/Spinner';
import Icon from '../../components/Icon';
import { activityService } from '../../services/activityService';
import { eventService } from '../../services/eventService';
import { ApiError } from '../../services/apiClient';
import { useTranslation } from '../../i18n';
import type { Correcao } from '../../types/activity.types';
import type { Evento } from '../../types/event.types';
import '../../styles/admin.css';

const AdminCorrectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [idEvento, setIdEvento] = useState('');
  const [correcoes, setCorrecoes] = useState<Correcao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const lista = await eventService.listarEventos();
        setEventos(lista);
        if (lista[0]) setIdEvento(lista[0].id_evento);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.corrections.loadEventsError'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [t]);

  useEffect(() => {
    if (!idEvento) return;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const lista = await activityService.listarCorrecoesDoEvento(idEvento);
        setCorrecoes(lista);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.corrections.loadError'));
        setCorrecoes([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [idEvento, t]);

  const alterarCampo = (idEntrega: string, campo: 'nota' | 'feedback', valor: string | number) => {
    setCorrecoes((prev) =>
      prev.map((item) =>
        item.id_entrega === idEntrega ? { ...item, [campo]: valor } : item,
      ),
    );
  };

  const salvarAlteracoes = async (correcao: Correcao) => {
    setSalvandoId(correcao.id_entrega);
    setError(null);
    try {
      const atualizada = await activityService.atualizarCorrecao(correcao.id_entrega, {
        nota: Number(correcao.nota),
        feedback: correcao.feedback,
      });
      setCorrecoes((prev) =>
        prev.map((item) => (item.id_entrega === correcao.id_entrega ? { ...item, ...atualizada } : item)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.corrections.saveError'));
    } finally {
      setSalvandoId(null);
    }
  };

  const validarCorrecao = async (correcao: Correcao) => {
    setSalvandoId(correcao.id_entrega);
    setError(null);
    try {
      const atualizada = await activityService.atualizarCorrecao(correcao.id_entrega, {
        nota: Number(correcao.nota),
        feedback: correcao.feedback,
        validado_por_admin: true,
      });
      setCorrecoes((prev) =>
        prev.map((item) => (item.id_entrega === correcao.id_entrega ? { ...item, ...atualizada } : item)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.corrections.validateError'));
    } finally {
      setSalvandoId(null);
    }
  };

  const pendentes = correcoes.filter((item) => !item.validado_por_admin);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="lt-page-title">{t('admin.corrections.title')}</h1>
        <p className="lt-muted">{t('admin.corrections.subtitle')}</p>
      </header>

      <AdminNav />

      <div style={{ marginBottom: '16px' }}>
        <label className="input-label">{t('common.event')}</label>
        <select
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
          <Spinner label={t('admin.corrections.loading')} />
        </div>
      ) : pendentes.length === 0 ? (
        <div className="admin-empty">
          <Icon name="check-circle" size={32} />
          <p>{t('admin.corrections.empty')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pendentes.map((correcao) => (
            <CardBase
              key={correcao.id_correcao}
              title={correcao.atividade_titulo || t('admin.corrections.activityFallback')}
              description={t('admin.corrections.cardDescription', {
                group: correcao.grupo_nome || t('admin.corrections.groupFallback'),
                evaluator: correcao.avaliador_nome || '—',
              })}
              contentSlot={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Input
                    label={t('admin.corrections.grade')}
                    type="number"
                    min={0}
                    max={100}
                    value={String(correcao.nota)}
                    onChange={(e) => alterarCampo(correcao.id_entrega, 'nota', Number(e.target.value))}
                  />
                  <div className="input-container">
                    <label className="input-label">{t('admin.corrections.feedback')}</label>
                    <textarea
                      className="input-element"
                      rows={3}
                      value={correcao.feedback}
                      onChange={(e) => alterarCampo(correcao.id_entrega, 'feedback', e.target.value)}
                    />
                  </div>
                </div>
              }
              footerSlot={
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    label={t('common.save')}
                    variant="ghost"
                    disabled={salvandoId === correcao.id_entrega}
                    onClick={() => void salvarAlteracoes(correcao)}
                  />
                  <Button
                    label={t('admin.corrections.validate')}
                    variant="primary"
                    disabled={salvandoId === correcao.id_entrega}
                    onClick={() => void validarCorrecao(correcao)}
                  />
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCorrectionsPage;
