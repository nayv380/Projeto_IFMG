import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CardBase from '../components/CardBase';
import Button from '../components/Button';
import Icon from '../components/Icon';
import UserBlock from '../components/UserBlock';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { muralService } from '../services/muralService';
import type { PostagemMural } from '../types/mural.types';
import { useTranslation } from '../i18n';
import '../styles/mural-page.css';

type AreaFiltro = '' | 'geral' | 'duvidas' | 'anuncios';

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

const MuralPage: React.FC = () => {
  const { idEvento } = useParams<{ idEvento: string }>();
  const { usuario, isAdmin } = useAuth();
  const { t } = useTranslation();
  const { alert, confirm } = useFeedback();

  const [postagens, setPostagens] = useState<PostagemMural[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [areaFiltro, setAreaFiltro] = useState<AreaFiltro>('');

  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoConteudo, setNovoConteudo] = useState('');
  const [novaArea, setNovaArea] = useState<'geral' | 'duvidas' | 'anuncios'>('duvidas');

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null);
  const [respostaConteudo, setRespostaConteudo] = useState('');

  const carregar = async (area?: AreaFiltro) => {
    if (!idEvento) return;
    setIsLoading(true);
    try {
      const data = await muralService.listarPostagens(
        idEvento,
        area ? { area } : undefined,
      );
      setPostagens(data);
    } catch (error) {
      console.error(error);
      await alert({ message: t('mural.errorList'), variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void carregar(areaFiltro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEvento, areaFiltro]);

  const handleCriarPostagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idEvento || !novoTitulo || !novoConteudo) return;

    try {
      const novaPostagem = await muralService.criarPostagem(idEvento, {
        titulo: novoTitulo,
        conteudo: novoConteudo,
        area: novaArea,
      });
      if (!areaFiltro || areaFiltro === novaArea) {
        setPostagens([novaPostagem, ...postagens]);
      }
      setNovoTitulo('');
      setNovoConteudo('');
      setNovaArea('duvidas');
    } catch {
      await alert({ message: t('mural.errorCreate'), variant: 'error' });
    }
  };

  const handleAtualizarPostagem = async (idPostagem: string) => {
    try {
      const postagemAtualizada = await muralService.atualizarPostagem(idPostagem, {
        titulo: novoTitulo,
        conteudo: novoConteudo,
      });
      setPostagens(postagens.map((p) => (p.id_postagem === idPostagem ? postagemAtualizada : p)));
      setEditingPostId(null);
      setNovoTitulo('');
      setNovoConteudo('');
    } catch {
      await alert({ message: t('mural.errorUpdate'), variant: 'error' });
    }
  };

  const handleDeletarPostagem = async (idPostagem: string) => {
    const ok = await confirm({ message: t('common.confirmDelete') });
    if (!ok) return;
    try {
      await muralService.deletarPostagem(idPostagem);
      setPostagens(postagens.filter((p) => p.id_postagem !== idPostagem));
    } catch {
      await alert({ message: t('mural.errorDelete'), variant: 'error' });
    }
  };

  const handleModerar = async (idPostagem: string, status: 'oculta' | 'arquivada') => {
    try {
      await muralService.moderarPostagem(idPostagem, status);
      setPostagens((atual) => atual.filter((p) => p.id_postagem !== idPostagem));
    } catch {
      await alert({ message: t('mural.errorUpdate'), variant: 'error' });
    }
  };

  const handleResponder = async (idPostagem: string) => {
    if (!respostaConteudo) return;
    try {
      const novaResposta = await muralService.responderPostagem(idPostagem, {
        conteudo: respostaConteudo,
      });

      setPostagens(
        postagens.map((p) => {
          if (p.id_postagem === idPostagem) {
            return { ...p, respostas: [...(p.respostas || []), novaResposta] };
          }
          return p;
        }),
      );
      setReplyingPostId(null);
      setRespostaConteudo('');
    } catch {
      await alert({ message: t('mural.errorReply'), variant: 'error' });
    }
  };

  const areaLabel = (area?: string) => {
    if (area === 'anuncios') return t('mural.filterAnuncios');
    if (area === 'duvidas') return t('mural.filterDuvidas');
    if (area === 'geral') return t('mural.filterGeral');
    return t('mural.memberFallback');
  };

  const filtros: { id: AreaFiltro; label: string }[] = [
    { id: '', label: t('mural.filterAll') },
    { id: 'geral', label: t('mural.filterGeral') },
    { id: 'duvidas', label: t('mural.filterDuvidas') },
    { id: 'anuncios', label: t('mural.filterAnuncios') },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{t('mural.pageTitle')}</h1>
        <p style={{ color: '#6b7280' }}>{t('mural.pageSubtitle')}</p>
      </header>

      <nav className="mural-toolbar" aria-label={t('mural.pageTitle')}>
        <div className="mural-filters">
          {filtros.map((f) => (
            <Button
              key={f.id || 'all'}
              label={f.label}
              variant={areaFiltro === f.id ? 'primary' : 'ghost'}
              onClick={() => setAreaFiltro(f.id)}
            />
          ))}
        </div>
        <button
          type="button"
          className="mural-refresh-btn"
          aria-label={t('mural.refresh')}
          title={t('mural.refresh')}
          disabled={isLoading}
          onClick={() => void carregar(areaFiltro)}
        >
          <Icon name="refresh" size={22} aria-hidden />
        </button>
      </nav>

      <section style={{ marginBottom: '40px' }}>
        <CardBase
          title={t('mural.askTitle')}
          contentSlot={
            <form
              onSubmit={(e) => void handleCriarPostagem(e)}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}
            >
              <label className="input-label">{t('mural.area')}</label>
              <select
                className="input-element"
                value={novaArea}
                onChange={(e) => setNovaArea(e.target.value as typeof novaArea)}
                disabled={isLoading}
              >
                <option value="geral">{t('mural.filterGeral')}</option>
                <option value="duvidas">{t('mural.filterDuvidas')}</option>
                <option value="anuncios">{t('mural.filterAnuncios')}</option>
              </select>
              <Input
                placeholder={t('mural.askPlaceholder')}
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                disabled={isLoading}
                required
              />
              <textarea
                placeholder={t('mural.contentPlaceholder')}
                value={novoConteudo}
                onChange={(e) => setNovoConteudo(e.target.value)}
                disabled={isLoading}
                required
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  minHeight: '100px',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ alignSelf: 'flex-end' }}>
                <Button
                  type="submit"
                  label={t('mural.publishButton')}
                  variant="primary"
                  disabled={isLoading}
                />
              </div>
            </form>
          }
        />
      </section>

      <section aria-label="Perguntas publicadas" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {isLoading && postagens.length === 0 ? (
          <p>{t('common.loadingWall')}</p>
        ) : postagens.length === 0 ? (
          <p>{t('common.noQuestionsFound')}</p>
        ) : (
          postagens.map((post) => {
            const isAuthor = usuario?.id_usuario === post.autor_id_usuario;
            const isEditingThis = editingPostId === post.id_postagem;

            return (
              <CardBase
                key={post.id_postagem}
                headerSlot={
                  <UserBlock
                    username={post.autor_nome || 'Participante'}
                    skill={areaLabel(post.area)}
                    avatar={
                      <span
                        className={`mural-author-avatar mural-author-avatar--${avatarTone(post.autor_nome || post.id_postagem)}`}
                        aria-hidden
                      >
                        {getInitials(post.autor_nome || 'Participante')}
                      </span>
                    }
                  />
                }
                contentSlot={
                  <div style={{ marginTop: '16px' }}>
                    {isEditingThis ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} />
                        <textarea
                          value={novoConteudo}
                          onChange={(e) => setNovoConteudo(e.target.value)}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            minHeight: '80px',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            label={t('mural.save')}
                            variant="primary"
                            onClick={() => void handleAtualizarPostagem(post.id_postagem)}
                          />
                          <Button
                            label={t('mural.cancel')}
                            variant="ghost"
                            onClick={() => setEditingPostId(null)}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                          {post.titulo}
                        </h3>
                        <p style={{ color: '#4b5563', lineHeight: '1.6' }}>{post.conteudo}</p>
                      </>
                    )}

                    {post.respostas && post.respostas.length > 0 && (
                      <div
                        style={{
                          marginTop: '24px',
                          paddingLeft: '16px',
                          borderLeft: '3px solid #e5e7eb',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                        }}
                      >
                        {post.respostas.map((resposta) => (
                          <div key={resposta.id_resposta}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '4px',
                              }}
                            >
                              <strong>{resposta.autor_nome || 'Participante'}</strong>
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                {new Date(resposta.criado_em).toLocaleDateString()}
                              </span>
                            </div>
                            <p style={{ color: '#374151', fontSize: '14px' }}>{resposta.conteudo}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyingPostId === post.id_postagem && (
                      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                        <Input
                          placeholder={t('mural.replyPlaceholder')}
                          value={respostaConteudo}
                          onChange={(e) => setRespostaConteudo(e.target.value)}
                        />
                        <Button
                          label={t('mural.sendButton')}
                          variant="primary"
                          onClick={() => void handleResponder(post.id_postagem)}
                        />
                        <Button
                          label={t('mural.cancel')}
                          variant="ghost"
                          onClick={() => setReplyingPostId(null)}
                        />
                      </div>
                    )}
                  </div>
                }
                footerSlot={
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Button
                      label={t('mural.replyButton')}
                      variant="secondary"
                      onClick={() => setReplyingPostId(post.id_postagem)}
                    />

                    {isAuthor && !isEditingThis && (
                      <>
                        <Button
                          label={t('mural.editButton')}
                          variant="ghost"
                          onClick={() => {
                            setEditingPostId(post.id_postagem);
                            setNovoTitulo(post.titulo);
                            setNovoConteudo(post.conteudo);
                          }}
                        />
                        <Button
                          label={t('mural.deleteButton')}
                          variant="ghost"
                          onClick={() => void handleDeletarPostagem(post.id_postagem)}
                          style={{ color: '#dc2626' }}
                        />
                      </>
                    )}

                    {isAdmin && (
                      <>
                        <Button
                          label={t('mural.hide')}
                          variant="ghost"
                          onClick={() => void handleModerar(post.id_postagem, 'oculta')}
                        />
                        <Button
                          label={t('mural.archive')}
                          variant="ghost"
                          onClick={() => void handleModerar(post.id_postagem, 'arquivada')}
                        />
                      </>
                    )}
                  </div>
                }
              />
            );
          })
        )}
      </section>
    </div>
  );
};

export default MuralPage;
