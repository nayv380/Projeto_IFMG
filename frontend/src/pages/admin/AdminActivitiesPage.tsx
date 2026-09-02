import React, { useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Spinner from '../../components/Spinner';
import Icon from '../../components/Icon';
import { activityService } from '../../services/activityService';
import { eventService } from '../../services/eventService';
import { ApiError } from '../../services/apiClient';
import { useFeedback } from '../../context/FeedbackContext';
import { useTranslation } from '../../i18n';
import type { AtividadeEvento } from '../../types/activity.types';
import type { Evento } from '../../types/event.types';
import '../../styles/admin.css';

const FORM_VAZIO = {
  titulo: '',
  descricao: '',
  formatos_aceitos: 'link',
  prazo: '',
  ativo: true,
};

const AdminActivitiesPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const { alert, confirm } = useFeedback();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [idEvento, setIdEvento] = useState('');
  const [atividades, setAtividades] = useState<AtividadeEvento[]>([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const lista = await eventService.listarEventos();
        setEventos(lista);
        if (lista[0]) setIdEvento(lista[0].id_evento);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.activities.loadEventsError'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [t]);

  const carregar = async (eventoId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const lista = await activityService.listarAtividades(eventoId);
      setAtividades(lista);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.activities.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (idEvento) void carregar(idEvento);
  }, [idEvento]);

  const salvar = async () => {
    if (!idEvento || !form.titulo.trim()) return;
    setSalvando(true);
    setError(null);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      formatos_aceitos: form.formatos_aceitos
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      prazo: form.prazo ? new Date(form.prazo).toISOString() : new Date().toISOString(),
      ativo: form.ativo,
    };
    try {
      if (editandoId) {
        await activityService.atualizarAtividade(editandoId, payload);
      } else {
        await activityService.criarAtividade(idEvento, payload);
      }
      setForm(FORM_VAZIO);
      setEditandoId(null);
      await carregar(idEvento);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.activities.saveError'));
    } finally {
      setSalvando(false);
    }
  };

  const editar = (atividade: AtividadeEvento) => {
    setEditandoId(atividade.id_atividade);
    setForm({
      titulo: atividade.titulo,
      descricao: atividade.descricao,
      formatos_aceitos: (atividade.formatos_aceitos || []).join(', '),
      prazo: atividade.prazo?.slice(0, 16) || '',
      ativo: atividade.ativo,
    });
  };

  const excluir = async (idAtividade: string) => {
    const ok = await confirm({ message: t('admin.deleteActivityConfirm') });
    if (!ok) return;
    try {
      await activityService.excluirAtividade(idAtividade);
      await carregar(idEvento);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.activities.deleteError'));
    }
  };

  const formarGrupos = async () => {
    if (!idEvento) return;
    try {
      const result = await eventService.formarGrupos(idEvento);
      const criados =
        result.grupos_criados ??
        (Array.isArray(result.grupos) ? result.grupos.length : undefined);

      if (typeof criados === 'number' && criados > 0) {
        await alert({
          message: t('admin.groupsFormed', { count: criados }),
          variant: 'success',
        });
        return;
      }

      await alert({
        message: result.detail || t('admin.groupsFormedNone'),
        variant: 'info',
      });
    } catch (err) {
      const mensagem =
        err instanceof ApiError ? err.message : t('admin.groupsFormedError');
      await alert({ message: mensagem, variant: 'error' });
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="lt-page-title">{t('admin.activities.title')}</h1>
        <p className="lt-muted">{t('admin.activities.subtitle')}</p>
      </header>

      <AdminNav />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label className="input-label">{t('common.event')}</label>
          <select className="input-element" value={idEvento} onChange={(e) => setIdEvento(e.target.value)}>
            {eventos.map((evento) => (
              <option key={evento.id_evento} value={evento.id_evento}>
                {evento.nome}
              </option>
            ))}
          </select>
        </div>
        <div style={{ alignSelf: 'end' }}>
          <Button
            label={t('admin.activities.formGroups')}
            variant="secondary"
            onClick={() => void formarGrupos()}
          />
        </div>
      </div>

      {error && (
        <div className="admin-banner admin-banner-error">
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className="admin-form-card" style={{ marginBottom: '24px' }}>
        <h2 className="lt-page-title" style={{ fontSize: '1.05rem' }}>
          {editandoId ? t('admin.activities.edit') : t('admin.activities.new')}
        </h2>
        <Input
          label={t('common.title')}
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
        />
        <Input
          label={t('common.description')}
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        />
        <Input
          label={t('admin.activities.formats')}
          value={form.formatos_aceitos}
          onChange={(e) => setForm({ ...form, formatos_aceitos: e.target.value })}
        />
        <Input
          label={t('common.deadline')}
          type="datetime-local"
          value={form.prazo}
          onChange={(e) => setForm({ ...form, prazo: e.target.value })}
        />
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
          />
          {t('admin.activities.active')}
        </label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <Button
            label={editandoId ? t('common.save') : t('common.create')}
            variant="primary"
            disabled={salvando}
            onClick={() => void salvar()}
          />
          {editandoId && (
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onClick={() => {
                setEditandoId(null);
                setForm(FORM_VAZIO);
              }}
            />
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="admin-empty">
          <Spinner label={t('admin.activities.loading')} />
        </div>
      ) : atividades.length === 0 ? (
        <div className="admin-empty">
          <Icon name="calendar" size={32} />
          <p>{t('admin.activities.empty')}</p>
        </div>
      ) : (
        <div className="admin-list">
          <div className="admin-row-header">
            <span>{t('common.title')}</span>
            <span>{t('common.deadline')}</span>
            <span>{t('admin.activities.active')}</span>
            <span>{t('common.actions')}</span>
          </div>
          {atividades.map((atividade) => (
            <div className="admin-row" key={atividade.id_atividade}>
              <div className="admin-row-primary">
                <strong>{atividade.titulo}</strong>
                <span>{atividade.descricao}</span>
              </div>
              <div className="admin-row-cell">
                {new Date(atividade.prazo).toLocaleString(locale)}
              </div>
              <div className="admin-row-cell">
                {atividade.ativo ? t('common.yes') : t('common.no')}
              </div>
              <div className="admin-row-actions">
                <Button
                  variant="ghost"
                  iconName="edit"
                  aria-label={t('common.edit')}
                  title={t('common.edit')}
                  onClick={() => editar(atividade)}
                />
                <Button
                  variant="danger"
                  iconName="trash"
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                  onClick={() => void excluir(atividade.id_atividade)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminActivitiesPage;
