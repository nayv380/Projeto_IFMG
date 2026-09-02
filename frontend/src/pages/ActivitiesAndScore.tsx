import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import { useActivity } from '../context/ActivityContext';
import { groupService } from '../services/groupService'; // Usado para descobrir o id do grupo atual do usuário
import type { Grupo } from '../types/group.types';
import { useTranslation } from '../i18n';
import '../styles/activities-page.css';

const ActivitiesAndScorePage: React.FC = () => {
  const { idEvento } = useParams<{ idEvento: string }>();
  const { t, locale } = useTranslation();

  // Contexto de Atividades
  const {
    atividades,
    entregas,
    correcoes,
    carregarAtividades,
    carregarEntregasDoGrupo,
    enviarEntrega,
    carregarCorrecao,
    isLoading,
    error,
  } = useActivity();

  // Estados Locais
  const [meuGrupo, setMeuGrupo] = useState<Grupo | null>(null);
  const [carregandoGrupo, setCarregandoGrupo] = useState(true);
  const [linksEntrega, setLinksEntrega] = useState<Record<string, string>>({});
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  // 1. Carrega as atividades do evento e descobre qual é o grupo do usuário
  useEffect(() => {
    if (idEvento) {
      void carregarAtividades(idEvento);
      setCarregandoGrupo(true);
      groupService
        .meuGrupo(idEvento)
        .then(setMeuGrupo)
        .catch((err) => {
          console.error(err);
          setMeuGrupo(null);
        })
        .finally(() => setCarregandoGrupo(false));
    }
  }, [idEvento, carregarAtividades]);

  // 2. Se o usuário tem um grupo, carrega as entregas feitas por ele
  useEffect(() => {
    if (meuGrupo?.id_grupo) {
      void carregarEntregasDoGrupo(meuGrupo.id_grupo);
    }
  }, [meuGrupo, carregarEntregasDoGrupo]);

  // 3. Verifica automaticamente as notas/correções para entregas que já foram corrigidas
  useEffect(() => {
    entregas.forEach((entrega) => {
      if (entrega.status === 'corrigida' && !correcoes[entrega.id_entrega]) {
        void carregarCorrecao(entrega.id_entrega);
      }
    });
  }, [entregas, correcoes, carregarCorrecao]);

  // Envio de uma nova entrega para uma atividade específica
  const handleEnviar = async (idAtividade: string) => {
    if (!meuGrupo) return;
    const url = linksEntrega[idAtividade];
    if (!url?.trim()) return;

    setEnviandoId(idAtividade);
    try {
      await enviarEntrega({
        id_atividade: idAtividade,
        id_grupo: meuGrupo.id_grupo,
        url_arquivo: url.trim(),
      });
    } catch (err) {
      console.error(err);
      // O banner de erro do contexto (`error`) já cobre o feedback visual.
    } finally {
      setEnviandoId(null);
    }
  };

  // Formata datas ISO (prazo, envio) no locale ativo
  const formatarData = (dataIso: string) =>
    new Date(dataIso).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const carregandoInicial = (isLoading || carregandoGrupo) && atividades.length === 0;

  return (
    <div className="activities-page">
      <header className="activities-page-header">
        <h1 className="lt-page-title">{t('activities.pageTitle')}</h1>
        <p className="lt-muted">{t('activities.pageSubtitle')}</p>

        {!carregandoGrupo && !meuGrupo && (
          <div className="activities-page-banner activities-page-banner-warning">
            <Icon name="alert-circle" size={18} />
            <span>{t('activities.groupRequired')}</span>
          </div>
        )}

        {error && (
          <div className="activities-page-banner activities-page-banner-error">
            <Icon name="alert-circle" size={18} />
            <span>{error}</span>
          </div>
        )}
      </header>

      {carregandoInicial && (
        <div className="activities-page-loading">
          <Spinner label={t('activities.loading')} />
        </div>
      )}

      {!carregandoInicial && atividades.length === 0 && (
        <div className="activities-page-empty">
          <Icon name="inbox" size={32} />
          <p>{t('activities.noActivities')}</p>
        </div>
      )}

      {atividades.length > 0 && (
        <div className="activities-grid">
          {atividades.map((atividade) => {
            // Todas as entregas desta atividade (histórico completo, não só a mais recente)
            const entregasDaAtividade = entregas.filter((e) => e.id_atividade === atividade.id_atividade);

            return (
              <ActivityCard
                key={atividade.id_atividade}
                atividade={atividade}
                entregas={entregasDaAtividade}
                correcoes={correcoes}
                temGrupo={Boolean(meuGrupo)}
                valorEntrega={linksEntrega[atividade.id_atividade] || ''}
                onChangeValorEntrega={(valor) =>
                  setLinksEntrega((atual) => ({ ...atual, [atividade.id_atividade]: valor }))
                }
                onEnviar={() => void handleEnviar(atividade.id_atividade)}
                isLoading={enviandoId === atividade.id_atividade}
                formatarData={formatarData}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivitiesAndScorePage;
