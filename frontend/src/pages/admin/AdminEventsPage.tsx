import React, { useEffect, useMemo, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Spinner from '../../components/Spinner';
import Icon from '../../components/Icon';
import StatusChip, { type StatusChipVariant } from '../../components/StatusChip';
import { eventService } from '../../services/eventService';
import { ApiError } from '../../services/apiClient';
import { useTranslation } from '../../i18n';
import type { Evento, EventoPayload, EventoStatus } from '../../types/event.types';
import '../../styles/admin.css';

const FORM_VAZIO: EventoPayload = {
  nome: '',
  descricao: '',
  link_whatsapp_geral: '',
  data_inicio: '',
  data_fim: '',
  prazo_formacao_grupo: '',
  max_membros_grupo: 5,
  status: 'planejado',
};

/** Converte um ISO datetime (ou null) para o formato aceito por <input type="datetime-local"> */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

const STATUS_VARIANTS: Record<EventoStatus, StatusChipVariant> = {
  planejado: 'neutral',
  inscricoes_abertas: 'pending',
  em_andamento: 'success',
  finalizado: 'danger',
};

/**
 * Gerenciamento de eventos — critério "Gerenciamento de eventos implementado" (Épico 7).
 *
 * Usa `eventService` (não um serviço próprio de admin): o backend de Eventos já
 * está implementado em `/eventos/` com permissão RBAC `evento.gerenciar` — quem
 * não tiver essa permissão só enxerga leitura (ver PodeGerenciarEvento no backend
 * e `frontend/docs/API_EVENTOS.md`). Não existe endpoint de exclusão (DELETE) —
 * por design, eventos são "encerrados" (status = finalizado) em vez de apagados,
 * o que evita perder o histórico de inscrições/grupos/entregas em cascata.
 */
const AdminEventsPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<EventoPayload>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [encerrandoId, setEncerrandoId] = useState<string | null>(null);

  const statusOptions = useMemo(
    () =>
      (Object.keys(STATUS_VARIANTS) as EventoStatus[]).map((status) => ({
        value: status,
        label: t(`event.status.${status}`),
        variant: STATUS_VARIANTS[status],
      })),
    [t],
  );

  const carregar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await eventService.listarEventos();
      setEventos(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.events.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setFormAberto(true);
  };

  const abrirEdicao = (evento: Evento) => {
    setEditandoId(evento.id_evento);
    setForm({
      nome: evento.nome,
      descricao: evento.descricao,
      link_whatsapp_geral: evento.link_whatsapp_geral,
      data_inicio: toDatetimeLocal(evento.data_inicio),
      data_fim: toDatetimeLocal(evento.data_fim),
      prazo_formacao_grupo: toDatetimeLocal(evento.prazo_formacao_grupo),
      max_membros_grupo: evento.max_membros_grupo ?? 5,
      status: evento.status,
    });
    setFormAberto(true);
  };

  const fecharForm = () => {
    setFormAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  };

  const handleSalvar = async () => {
    setSalvando(true);
    setError(null);
    setSucesso(null);
    try {
      // O campo é opcional no backend (null=True); string vazia falha a validação de datetime do DRF.
      const payload: EventoPayload = {
        ...form,
        prazo_formacao_grupo: form.prazo_formacao_grupo?.trim() ? form.prazo_formacao_grupo : null,
      };

      if (editandoId) {
        const atualizado = await eventService.atualizarEvento(editandoId, payload);
        setEventos((atual) => atual.map((e) => (e.id_evento === editandoId ? atualizado : e)));
        setSucesso(t('admin.events.updateSuccess'));
      } else {
        const criado = await eventService.criarEvento(payload);
        setEventos((atual) => [criado, ...atual]);
        setSucesso(t('admin.events.createSuccess'));
      }
      fecharForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.events.saveError'));
    } finally {
      setSalvando(false);
    }
  };

  /** Não existe DELETE no backend — "excluir" um evento vira "encerrar" (status = finalizado) */
  const handleEncerrar = async (idEvento: string) => {
    setEncerrandoId(idEvento);
    setError(null);
    try {
      const atualizado = await eventService.atualizarEvento(idEvento, { status: 'finalizado' });
      setEventos((atual) => atual.map((e) => (e.id_evento === idEvento ? atualizado : e)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.events.closeError'));
    } finally {
      setEncerrandoId(null);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="lt-page-title">{t('admin.title')}</h1>
        <p className="lt-muted">{t('admin.events.subtitle')}</p>
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

      <div className="admin-toolbar">
        <Button
          variant="primary"
          label={formAberto ? t('common.closeForm') : t('admin.events.new')}
          iconName={formAberto ? 'x' : 'plus'}
          onClick={() => (formAberto ? fecharForm() : abrirNovo())}
        />
      </div>

      {formAberto && (
        <div className="admin-form">
          <div className="admin-form-grid">
            <Input
              label={t('admin.events.name')}
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
            <Input
              label={t('admin.events.whatsapp')}
              value={form.link_whatsapp_geral}
              onChange={(e) => setForm((f) => ({ ...f, link_whatsapp_geral: e.target.value }))}
            />
          </div>
          <Input
            label={t('common.description')}
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
          />
          <div className="admin-form-grid cols-2">
            <Input
              label={t('common.start')}
              type="datetime-local"
              value={form.data_inicio}
              onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
            />
            <Input
              label={t('common.end')}
              type="datetime-local"
              value={form.data_fim}
              onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
            />
          </div>
          <div className="admin-form-grid cols-2">
            <Input
              label={t('admin.events.groupDeadline')}
              type="datetime-local"
              value={form.prazo_formacao_grupo ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, prazo_formacao_grupo: e.target.value }))}
            />
            <Input
              label={t('admin.events.maxMembers')}
              type="number"
              min={2}
              max={50}
              value={String(form.max_membros_grupo ?? 5)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  max_membros_grupo: Math.max(2, Number(e.target.value) || 5),
                }))
              }
            />
          </div>
          <div className="admin-form-grid cols-2">
            <div className="input-container">
              <label className="input-label" htmlFor="evento-status">
                {t('common.status')}
              </label>
              <select
                id="evento-status"
                className="input-element"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EventoStatus }))}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="admin-form-actions">
            <Button
              variant="primary"
              label={editandoId ? t('admin.events.saveChanges') : t('admin.events.create')}
              disabled={salvando || !form.nome.trim()}
              onClick={() => void handleSalvar()}
            />
            <Button variant="ghost" label={t('common.cancel')} onClick={fecharForm} />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="admin-empty">
          <Spinner label={t('admin.events.loading')} />
        </div>
      )}

      {!isLoading && eventos.length === 0 && !formAberto && (
        <div className="admin-empty">
          <Icon name="calendar" size={32} />
          <p>{t('admin.events.empty')}</p>
        </div>
      )}

      {!isLoading && eventos.length > 0 && (
        <div className="admin-list">
          <div className="admin-row-header">
            <span>{t('common.event')}</span>
            <span>{t('admin.events.colPeriod')}</span>
            <span>{t('common.status')}</span>
            <span>{t('common.actions')}</span>
          </div>
          {eventos.map((evento) => {
            const label = t(`event.status.${evento.status}`);
            const variant = STATUS_VARIANTS[evento.status] ?? 'neutral';
            const jaFinalizado = evento.status === 'finalizado';
            return (
              <div className="admin-row" key={evento.id_evento}>
                <div className="admin-row-primary">
                  <strong>{evento.nome}</strong>
                  <span>{evento.descricao}</span>
                </div>
                <div className="admin-row-primary">
                  <span>
                    {new Date(evento.data_inicio).toLocaleDateString(locale)}
                    {' — '}
                    {new Date(evento.data_fim).toLocaleDateString(locale)}
                  </span>
                </div>
                <div>
                  <StatusChip label={label} variant={variant} />
                </div>
                <div className="admin-row-actions">
                  <Button
                    variant="ghost"
                    iconName="edit"
                    aria-label={t('common.edit')}
                    title={t('common.edit')}
                    onClick={() => abrirEdicao(evento)}
                  />
                  <Button
                    variant="danger"
                    iconName="trash"
                    aria-label={t('admin.events.close')}
                    title={t('admin.events.close')}
                    disabled={jaFinalizado || encerrandoId === evento.id_evento}
                    onClick={() => void handleEncerrar(evento.id_evento)}
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

export default AdminEventsPage;
