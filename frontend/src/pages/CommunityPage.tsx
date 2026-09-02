import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CardBase from '../components/CardBase';
import Button from '../components/Button';
import Input from '../components/Input';
import UserBlock from '../components/UserBlock';
import Icon from '../components/Icon';

import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { useFeedback } from '../context/FeedbackContext';
import { groupService, type SolicitacaoPendenteLider } from '../services/groupService';
import { eventService, type ParticipanteEvento } from '../services/eventService';
import { ApiError } from '../services/apiClient';
import type { Grupo } from '../types/group.types';
import type { Evento } from '../types/event.types';
import { useTranslation } from '../i18n';
import '../styles/community-page.css';

const GROUP_NAME_MAX = 40;

type TabView = 'users' | 'groups' | 'my-group' | 'solicitacoes' | 'create';

function getInitials(name: string): string {
  const [first = '', second = ''] = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (!first) return '?';
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

function avatarTone(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 4;
  }
  return hash + 1;
}

const CommunityPage: React.FC = () => {
  const { idEvento } = useParams<{ idEvento: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { alert, confirm } = useFeedback();
  const { usuario, isAdmin, isAvaliador } = useAuth();
  // Staff (admin/avaliador): sem fluxo de participante (meu grupo / solicitações / criar).
  const isStaff = isAdmin || isAvaliador;
  const {
    eventoAtual,
    eventos,
    minhasInscricoes,
    selecionarEvento,
    listarEventos,
    carregarMinhasInscricoes,
  } = useEvent();
  const {
    grupos,
    listarGrupos,
    solicitarEntrada,
    criarGrupo,
    isLoading: isLoadingGroups,
  } = useGroup();

  const [activeTab, setActiveTab] = useState<TabView>('groups');
  const [buscaGrupos, setBuscaGrupos] = useState('');
  const [buscaMembros, setBuscaMembros] = useState('');
  const [meuGrupo, setMeuGrupo] = useState<Grupo | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteEvento[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPendenteLider[]>([]);
  const [isLoadingSolicitacoes, setIsLoadingSolicitacoes] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoWhatsapp, setNovoWhatsapp] = useState('');
  const [criando, setCriando] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [novoLiderId, setNovoLiderId] = useState('');
  const [codigoConvite, setCodigoConvite] = useState('');
  const [entrandoCodigo, setEntrandoCodigo] = useState(false);

  useEffect(() => {
    void listarEventos();
    if (!isStaff) void carregarMinhasInscricoes();
  }, [listarEventos, carregarMinhasInscricoes, isStaff]);

  useEffect(() => {
    if (idEvento) void selecionarEvento(idEvento);
  }, [idEvento, selecionarEvento]);

  const eventoAtivo = useMemo((): Evento | null => {
    if (eventoAtual?.id_evento === idEvento) return eventoAtual;
    return eventos.find((e) => e.id_evento === idEvento) ?? null;
  }, [eventoAtual, eventos, idEvento]);

  const eventosDisponiveis = useMemo(() => {
    if (isStaff) return eventos;
    const idsInscritos = new Set(minhasInscricoes.map((i) => i.id_evento));
    const inscritos = eventos.filter((e) => idsInscritos.has(e.id_evento));
    if (eventoAtivo && !inscritos.some((e) => e.id_evento === eventoAtivo.id_evento)) {
      return [eventoAtivo, ...inscritos];
    }
    return inscritos.length > 0 ? inscritos : eventoAtivo ? [eventoAtivo] : [];
  }, [isStaff, eventos, minhasInscricoes, eventoAtivo]);

  const maxMembrosEvento = useMemo(() => {
    if (eventoAtivo?.max_membros_grupo) return eventoAtivo.max_membros_grupo;
    return 5;
  }, [eventoAtivo]);

  const handleTrocarEvento = (novoId: string) => {
    if (!novoId || novoId === idEvento) return;
    localStorage.setItem('lt_evento_atual_id', novoId);
    void navigate(`/eventos/${novoId}/comunidade`);
  };

  const souLider = useMemo(() => {
    if (!meuGrupo || !usuario) return false;
    return Boolean(
      (meuGrupo.membros ?? []).some(
        (m) => m.id_usuario === usuario.id_usuario && m.is_lider,
      ),
    );
  }, [meuGrupo, usuario]);

  const outrosMembros = useMemo(() => {
    if (!meuGrupo || !usuario) return [];
    return (meuGrupo.membros ?? []).filter((m) => m.id_usuario !== usuario.id_usuario);
  }, [meuGrupo, usuario]);

  const carregarParticipantes = useCallback(async () => {
    if (!idEvento) return;
    setIsLoadingUsers(true);
    try {
      const lista = await eventService.listarParticipantes(idEvento);
      setParticipantes(lista);
    } catch (err) {
      console.error(err);
      setParticipantes([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [idEvento]);

  const carregarSolicitacoes = useCallback(async () => {
    if (!idEvento) return;
    setIsLoadingSolicitacoes(true);
    try {
      const lista = await groupService.listarSolicitacoesPendentes(idEvento);
      setSolicitacoes(lista);
    } catch (err) {
      console.error(err);
      setSolicitacoes([]);
    } finally {
      setIsLoadingSolicitacoes(false);
    }
  }, [idEvento]);

  const carregarMeuGrupo = useCallback(async () => {
    if (!idEvento || isStaff) {
      setMeuGrupo(null);
      return;
    }
    try {
      const grupo = await groupService.meuGrupo(idEvento);
      setMeuGrupo(grupo);
    } catch {
      setMeuGrupo(null);
    }
  }, [idEvento, isStaff]);

  useEffect(() => {
    if (!idEvento || isStaff) {
      setSolicitacoes([]);
      return;
    }
    void carregarSolicitacoes();
  }, [idEvento, isStaff, carregarSolicitacoes]);

  useEffect(() => {
    if (!idEvento) return;

    if (activeTab === 'users') {
      void carregarParticipantes();
    } else if (activeTab === 'groups' || activeTab === 'create') {
      void listarGrupos({ idEvento });
      void carregarMeuGrupo();
    } else if (activeTab === 'my-group') {
      void carregarMeuGrupo();
    } else if (activeTab === 'solicitacoes') {
      void carregarSolicitacoes();
    }
  }, [
    activeTab,
    idEvento,
    listarGrupos,
    carregarParticipantes,
    carregarSolicitacoes,
    carregarMeuGrupo,
  ]);

  const gruposFiltrados = useMemo(() => {
    const termo = buscaGrupos.trim().toLowerCase();
    if (!termo) return grupos;
    return grupos.filter(
      (grupo) =>
        grupo.nome.toLowerCase().includes(termo) ||
        (grupo.origem || '').toLowerCase().includes(termo),
    );
  }, [grupos, buscaGrupos]);

  const participantesFiltrados = useMemo(() => {
    const termo = buscaMembros.trim().toLowerCase();
    if (!termo) return participantes;
    return participantes.filter((p) => {
      const nome = `${p.nome_usuario || ''} ${p.nome || ''}`.toLowerCase();
      return nome.includes(termo);
    });
  }, [participantes, buscaMembros]);
  const handleSolicitarEntrada = async (idGrupo: string) => {
    try {
      await solicitarEntrada(idGrupo);
      await alert({ message: t('community.requestSent'), variant: 'success' });
      void carregarMeuGrupo();
    } catch (err) {
      console.error(err);
      const mensagem =
        err instanceof ApiError ? err.message : t('community.requestError');
      await alert({ message: mensagem, variant: 'error' });
    }
  };

  const handleEntrarPorCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idEvento || !codigoConvite.trim() || meuGrupo) return;
    setEntrandoCodigo(true);
    try {
      const grupo = await groupService.entrarPorCodigo(idEvento, codigoConvite);
      setMeuGrupo(grupo);
      setCodigoConvite('');
      setActiveTab('my-group');
      void listarGrupos({ idEvento });
      await alert({ message: t('community.joinByCodeSuccess'), variant: 'success' });
    } catch (err) {
      console.error(err);
      const mensagem =
        err instanceof ApiError ? err.message : t('community.joinByCodeError');
      await alert({ message: mensagem, variant: 'error' });
    } finally {
      setEntrandoCodigo(false);
    }
  };

  const podeSolicitarEntrada = (grupo: Grupo) => {
    if (isStaff || meuGrupo) return false;
    const membrosAtuais = grupo.membros_count ?? grupo.membros?.length ?? 0;
    return membrosAtuais < grupo.max_membros;
  };

  const labelSolicitacao = (grupo: Grupo) => {
    if (meuGrupo?.id_grupo === grupo.id_grupo) return t('community.yourGroup');
    if (meuGrupo) return t('community.alreadyInGroup');
    const membrosAtuais = grupo.membros_count ?? grupo.membros?.length ?? 0;
    if (membrosAtuais >= grupo.max_membros) return t('common.groupFull');
    return t('common.joinRequest');
  };

  const handleResponderSolicitacao = async (
    idSolicitacao: string,
    status: 'aprovada' | 'recusada',
  ) => {
    try {
      await groupService.responderSolicitacao(idSolicitacao, status);
      setSolicitacoes((atual) => atual.filter((s) => s.id !== idSolicitacao));
    } catch (err) {
      console.error(err);
      await alert({ message: t('community.requestError'), variant: 'error' });
    }
  };

  const handleSairDoGrupo = async () => {
    if (!meuGrupo) return;
    const total = meuGrupo.membros_count ?? meuGrupo.membros?.length ?? 0;
    const liderComEquipe = souLider && total > 1;

    if (liderComEquipe && !novoLiderId) {
      await alert({ message: t('community.leavePickLeader'), variant: 'info' });
      return;
    }

    const ok = await confirm({
      message:
        total <= 1 ? t('community.leaveConfirmSolo') : t('community.leaveConfirm'),
      confirmLabel: t('community.leaveGroup'),
    });
    if (!ok) return;

    setSaindo(true);
    try {
      const result = await groupService.sairDoGrupo(
        meuGrupo.id_grupo,
        liderComEquipe ? { id_novo_lider: novoLiderId } : undefined,
      );
      setMeuGrupo(null);
      setNovoLiderId('');
      if (idEvento) void listarGrupos({ idEvento });
      await alert({
        message:
          result.acao === 'grupo_excluido'
            ? t('community.leaveGroupDeleted')
            : t('community.leaveSuccess'),
        variant: 'success',
      });
      setActiveTab('groups');
    } catch (err) {
      console.error(err);
      const mensagem =
        err instanceof ApiError ? err.message : t('community.leaveError');
      await alert({ message: mensagem, variant: 'error' });
    } finally {
      setSaindo(false);
    }
  };

  const handleCriarGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idEvento || !novoNome.trim()) return;
    if (meuGrupo) {
      await alert({ message: t('community.alreadyInGroup'), variant: 'info' });
      return;
    }
    setCriando(true);
    try {
      const payload: {
        id_evento: string;
        nome: string;
        link_whatsapp_grupo?: string;
      } = {
        id_evento: idEvento,
        nome: novoNome.trim().slice(0, GROUP_NAME_MAX),
      };
      if (novoWhatsapp.trim()) {
        payload.link_whatsapp_grupo = novoWhatsapp.trim();
      }
      await criarGrupo(payload);
      await alert({ message: t('community.createSuccess'), variant: 'success' });
      setNovoNome('');
      setNovoWhatsapp('');
      setActiveTab('my-group');
      void carregarMeuGrupo();
      void listarGrupos({ idEvento });
    } catch (err) {
      console.error(err);
      await alert({
        message: err instanceof ApiError ? err.message : t('community.createError'),
        variant: 'error',
      });
    } finally {
      setCriando(false);
    }
  };

  useEffect(() => {
    if (!isStaff) return;
    if (activeTab === 'my-group' || activeTab === 'solicitacoes' || activeTab === 'create') {
      setActiveTab('groups');
    }
  }, [isStaff, activeTab]);

  return (
    <div className="community-page">
      <header className="community-page-header">
        <h1 className="lt-page-title">{t('nav.community')}</h1>

        {eventosDisponiveis.length > 1 ? (
          <label className="community-event-line">
            <select
              className="community-event-native"
              value={idEvento ?? ''}
              onChange={(e) => handleTrocarEvento(e.target.value)}
              aria-label={t('community.switchEvent')}
            >
              {eventosDisponiveis.map((evento) => (
                <option key={evento.id_evento} value={evento.id_evento}>
                  {evento.nome}
                </option>
              ))}
            </select>
          </label>
        ) : (
          eventoAtivo && (
            <p className="community-event-line">
              <span className="community-event-name">{eventoAtivo.nome}</span>
            </p>
          )
        )}
      </header>

      <nav className="community-tabs" aria-label={t('community.navigationLabel')}>
        <Button
          label={t('community.groupsTab')}
          variant={activeTab === 'groups' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('groups')}
        />
        <Button
          label={t('community.membersTab')}
          variant={activeTab === 'users' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('users')}
        />
        {!isStaff && (
          <>
            <Button
              label={t('community.myGroupTab')}
              variant={activeTab === 'my-group' ? 'primary' : 'ghost'}
              onClick={() => setActiveTab('my-group')}
            />
            <button
              type="button"
              className={`community-tab-btn btn-global btn-${activeTab === 'solicitacoes' ? 'primary' : 'ghost'}${
                solicitacoes.length > 0 ? ' has-badge' : ''
              }`}
              onClick={() => setActiveTab('solicitacoes')}
              aria-label={
                solicitacoes.length > 0
                  ? `${t('community.requestsTab')} (${solicitacoes.length})`
                  : t('community.requestsTab')
              }
            >
              <span>{t('community.requestsTab')}</span>
              {solicitacoes.length > 0 && (
                <span className="community-tab-badge" aria-hidden>
                  {solicitacoes.length > 99 ? '99+' : solicitacoes.length}
                </span>
              )}
            </button>
            <div className="community-tabs-create">
              <Button
                label={t('community.createGroup')}
                variant={activeTab === 'create' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('create')}
                disabled={Boolean(meuGrupo)}
              />
            </div>
          </>
        )}
      </nav>

      {activeTab === 'create' && (
        <CardBase
          title={t('community.createGroupTitle')}
          description={
            meuGrupo
              ? t('community.alreadyInGroup')
              : t('community.emptyGroupDescription')
          }
          contentSlot={
            <form
              onSubmit={(e) => void handleCriarGrupo(e)}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}
            >
              <Input
                label={t('community.groupName')}
                value={novoNome}
                maxLength={GROUP_NAME_MAX}
                onChange={(e) => setNovoNome(e.target.value.slice(0, GROUP_NAME_MAX))}
                required
                disabled={Boolean(meuGrupo) || criando}
                description={t('community.groupNameLimit', { max: GROUP_NAME_MAX })}
              />
              <p className="lt-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                {t('community.maxMembersFromEvent', { count: maxMembrosEvento })}
              </p>
              <Input
                label={t('community.whatsappOptional')}
                value={novoWhatsapp}
                onChange={(e) => setNovoWhatsapp(e.target.value)}
                disabled={Boolean(meuGrupo) || criando}
              />
              <div style={{ alignSelf: 'flex-end' }}>
                <Button
                  type="submit"
                  label={t('community.createGroup')}
                  variant="primary"
                  disabled={Boolean(meuGrupo) || criando || !novoNome.trim()}
                />
              </div>
            </form>
          }
        />
      )}

      {activeTab === 'groups' && (
        <div>
          {!isStaff && !meuGrupo && (
            <form
              className="community-join-code"
              onSubmit={(e) => void handleEntrarPorCodigo(e)}
            >
              <div className="community-join-code-text">
                <strong>{t('community.joinByCodeTitle')}</strong>
                <span className="lt-muted">{t('community.joinByCodeHint')}</span>
              </div>
              <div className="community-join-code-actions">
                <Input
                  label={t('community.inviteCode')}
                  value={codigoConvite}
                  onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                  placeholder={t('community.joinByCodePlaceholder')}
                  maxLength={12}
                  disabled={entrandoCodigo}
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  label={
                    entrandoCodigo
                      ? t('community.joinByCodeSubmitting')
                      : t('community.joinByCode')
                  }
                  variant="primary"
                  disabled={entrandoCodigo || !codigoConvite.trim()}
                />
              </div>
            </form>
          )}

          <div className="community-search-wrap">
            <label className="community-search">
              <span className="community-search-label">{t('common.searchGroups')}</span>
              <span className="community-search-field">
                <span className="community-search-icon" aria-hidden>
                  <Icon name="search" size={18} />
                </span>
                <input
                  type="search"
                  name="buscar-grupos"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={buscaGrupos}
                  onChange={(e) => setBuscaGrupos(e.target.value)}
                  placeholder={t('community.searchGroupsPlaceholder')}
                  aria-label={t('common.searchGroups')}
                />
              </span>
            </label>
          </div>

          <div className="community-groups-list">
            {gruposFiltrados.length === 0 && !isLoadingGroups && (
              <p className="community-empty">{t('common.noGroupsFound')}</p>
            )}

            {gruposFiltrados.map((grupo) => {
              const membrosAtuais = grupo.membros_count ?? grupo.membros?.length ?? 0;
              const podeSolicitar = podeSolicitarEntrada(grupo);
              const esMio = meuGrupo?.id_grupo === grupo.id_grupo;
              const categoria = grupo.origem || 'Geral';
              const membros = grupo.membros ?? [];

              return (
                <article
                  key={grupo.id_grupo}
                  className={`community-group-card${esMio ? ' is-mine' : ''}`}
                >
                  <div className="community-group-card-top">
                    <h3 className="community-group-card-title">{grupo.nome}</h3>
                    {esMio && (
                      <p className="community-group-owned">{t('community.yourGroup')}</p>
                    )}
                  </div>

                  <div className="community-group-card-meta">
                    <span className="community-group-meta-item" title={t('common.vacancies')}>
                      <Icon name="users" size={15} aria-hidden />
                      <span>
                        {membrosAtuais} / {grupo.max_membros}
                      </span>
                    </span>
                    <span className="community-group-meta-item" title={t('common.category')}>
                      <Icon name="tag" size={15} aria-hidden />
                      <span>{categoria}</span>
                    </span>
                  </div>

                  {isAdmin ? (
                    <div className="community-group-members-preview">
                      <p className="community-group-members-label">{t('community.teamMembers')}</p>
                      {membros.length === 0 ? (
                        <p className="community-group-members-empty">{t('community.noMembersYet')}</p>
                      ) : (
                        <ul className="community-group-members-chips">
                          {membros.map((membro) => {
                            const displayName = membro.nome_usuario || membro.nome;
                            return (
                              <li key={membro.id || membro.id_usuario} className="community-group-member-chip">
                                <span
                                  className={`community-member-avatar community-member-avatar--${avatarTone(displayName)}`}
                                  aria-hidden
                                >
                                  {getInitials(displayName)}
                                </span>
                                <span className="community-group-member-chip-text">
                                  <strong>{displayName}</strong>
                                  <span>
                                    {membro.is_lider
                                      ? t('community.leader')
                                      : t('community.groupMemberFallback')}
                                  </span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    !esMio && (
                      <div className="community-group-card-footer">
                        <Button
                          label={labelSolicitacao(grupo)}
                          variant={podeSolicitar ? 'primary' : 'ghost'}
                          disabled={!podeSolicitar}
                          onClick={() => void handleSolicitarEntrada(grupo.id_grupo)}
                        />
                      </div>
                    )
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div className="community-search-wrap">
            <label className="community-search">
              <span className="community-search-label">{t('common.searchMembers')}</span>
              <span className="community-search-field">
                <span className="community-search-icon" aria-hidden>
                  <Icon name="search" size={18} />
                </span>
                <input
                  type="search"
                  name="buscar-membros"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={buscaMembros}
                  onChange={(e) => setBuscaMembros(e.target.value)}
                  placeholder={t('community.searchMembersPlaceholder')}
                  aria-label={t('common.searchMembers')}
                />
              </span>
            </label>
          </div>

          <div className="community-member-results">
            {participantesFiltrados.length === 0 && !isLoadingUsers && (
              <p className="community-empty">{t('common.noUsersFound')}</p>
            )}

            {participantesFiltrados.map((participante) => {
              const displayName = participante.nome_usuario || participante.nome;
              return (
                <CardBase
                  key={participante.id_inscricao}
                  contentSlot={
                    <UserBlock
                      username={displayName}
                      skill={
                        [participante.pais, participante.curso || participante.instituicao]
                          .filter(Boolean)
                          .join(' · ') || t('community.memberFallback')
                      }
                      avatar={
                        <span
                          className={`community-member-avatar community-member-avatar--${avatarTone(displayName)}`}
                          aria-hidden
                        >
                          {getInitials(displayName)}
                        </span>
                      }
                    />
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'my-group' && (
        <div>
          {!meuGrupo ? (
            <CardBase
              title={t('community.emptyGroupState')}
              description={t('community.emptyGroupDescription')}
              footerSlot={
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    label={t('community.findGroups')}
                    variant="primary"
                    onClick={() => setActiveTab('groups')}
                  />
                  <Button
                    label={t('community.createGroup')}
                    variant="secondary"
                    onClick={() => setActiveTab('create')}
                  />
                </div>
              }
            />
          ) : (
            <section className="community-my-group" aria-label={t('community.myGroupTab')}>
              <header className="community-my-group-header">
                <h2 className="community-my-group-title">{meuGrupo.nome}</h2>
                <div className="community-my-group-meta">
                  <span className="community-my-group-chip" title={t('community.inviteCode')}>
                    <Icon name="tag" size={14} aria-hidden />
                    <span className="community-my-group-chip-label">{t('community.inviteCode')}</span>
                    <strong>{meuGrupo.codigo}</strong>
                  </span>
                  <span className="community-my-group-chip" title={t('common.vacancies')}>
                    <Icon name="users" size={14} aria-hidden />
                    <span>
                      {meuGrupo.membros_count ?? meuGrupo.membros?.length ?? 0} / {meuGrupo.max_membros}
                    </span>
                  </span>
                  {meuGrupo.link_whatsapp_grupo && (
                    <a
                      className="community-my-group-chip"
                      href={meuGrupo.link_whatsapp_grupo}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="link" size={14} aria-hidden />
                      <span>{t('community.whatsappGroup')}</span>
                    </a>
                  )}
                </div>
              </header>

              <div className="community-my-group-members">
                <h3 className="community-my-group-members-title">{t('community.teamMembers')}</h3>
                <ul className="community-member-list">
                  {(meuGrupo.membros ?? []).map((membro) => {
                    const displayName = membro.nome_usuario || membro.nome;
                    return (
                      <li key={membro.id_usuario} className="community-member-row">
                        <span
                          className={`community-member-avatar community-member-avatar--${avatarTone(displayName)}`}
                          aria-hidden
                        >
                          {getInitials(displayName)}
                        </span>
                        <div className="community-member-info">
                          <p className="community-member-name">{displayName}</p>
                        </div>
                        <p
                          className={`community-member-role${membro.is_lider ? ' is-leader' : ''}`}
                        >
                          {membro.is_lider ? t('community.leader') : t('community.groupMemberFallback')}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="community-my-group-leave">
                {souLider && outrosMembros.length > 0 && (
                  <div className="input-container">
                    <label className="input-label" htmlFor="novo-lider">
                      {t('community.newLeader')}
                    </label>
                    <select
                      id="novo-lider"
                      className="input-element"
                      value={novoLiderId}
                      onChange={(e) => setNovoLiderId(e.target.value)}
                      disabled={saindo}
                    >
                      <option value="">{t('community.leavePickLeader')}</option>
                      {outrosMembros.map((m) => (
                        <option key={m.id_inscricao} value={m.id_inscricao}>
                          {m.nome_usuario || m.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Button
                  label={t('community.leaveGroup')}
                  variant="danger"
                  disabled={saindo || (souLider && outrosMembros.length > 0 && !novoLiderId)}
                  onClick={() => void handleSairDoGrupo()}
                />
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'solicitacoes' && (
        <div>
          {isLoadingSolicitacoes && <p>{t('common.loading')}</p>}
          {!isLoadingSolicitacoes && solicitacoes.length === 0 && (
            <p className="community-empty">{t('community.noRequests')}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {solicitacoes.map((solicitacao) => (
              <CardBase
                key={solicitacao.id}
                title={solicitacao.nome_usuario}
                description={`${solicitacao.grupo_nome}`}
                footerSlot={
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      label={t('community.approve')}
                      variant="primary"
                      onClick={() => void handleResponderSolicitacao(solicitacao.id, 'aprovada')}
                    />
                    <Button
                      label={t('community.reject')}
                      variant="ghost"
                      onClick={() => void handleResponderSolicitacao(solicitacao.id, 'recusada')}
                    />
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
