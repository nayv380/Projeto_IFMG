import React from 'react';
import CardBase from './CardBase';
import Button from './Button';
import Input from './Input';
import Icon from './Icon';
import StatusChip, { type StatusChipVariant } from './StatusChip';
import type { AtividadeEvento, Correcao, Entrega } from '../types/activity.types';
import { useTranslation } from '../i18n';
import '../styles/activitycard.css';

export interface ActivityCardProps {
  atividade: AtividadeEvento;
  /** Todas as entregas desta atividade feitas pelo grupo do usuário (já vem escopado por grupo do contexto) */
  entregas: Entrega[];
  /** Mapa de correções, indexado por id_entrega — cada entrega do histórico pode ter a sua */
  correcoes: Record<string, Correcao>;
  /** false quando o usuário ainda não está em nenhum grupo do evento */
  temGrupo: boolean;
  /** valor atual do campo de link/URL de entrega deste card */
  valorEntrega: string;
  onChangeValorEntrega: (valor: string) => void;
  onEnviar: () => void;
  isLoading?: boolean;
  formatarData: (dataIso: string) => string;
}

const statusChipInfo = (
  status: Entrega['status'],
  temCorrecao: boolean,
  labels: { done: string; inReview: string; sent: string },
): { label: string; variant: StatusChipVariant; icon: 'clock' | 'check-circle' | 'alert-circle' } => {
  if (status === 'corrigida' && temCorrecao) {
    return { label: labels.done, variant: 'success', icon: 'check-circle' };
  }
  if (status === 'em_correcao') {
    return { label: labels.inReview, variant: 'pending', icon: 'clock' };
  }
  return { label: labels.sent, variant: 'pending', icon: 'clock' };
};

/**
 * Card de uma atividade dentro da tela "Activities & Score" (Épico 4).
 *
 * Cobre os 4 critérios de aceite do épico:
 *  - Cadastro de submissões  -> formulário de link + botão "Enviar Entrega"
 *  - Registro de link do projeto -> campo `url_arquivo` (Entrega)
 *  - Histórico de submissões -> bloco <details> com TODAS as entregas já
 *    feitas para esta atividade (não só a mais recente), cada uma com
 *    data, link, status e nota/feedback quando já corrigida
 *  - Vínculo com a equipe -> `entregas` já chega escopada ao grupo do
 *    usuário (ver `carregarEntregasDoGrupo` no ActivityContext)
 */
const ActivityCard: React.FC<ActivityCardProps> = ({
  atividade,
  entregas,
  correcoes,
  temGrupo,
  valorEntrega,
  onChangeValorEntrega,
  onEnviar,
  isLoading = false,
  formatarData,
}) => {
  const { t } = useTranslation();
  const encerrada = !atividade.ativo;

  // Mais recente primeiro — é o que define o status "atual" mostrado no cabeçalho do card
  const historico = [...entregas].sort(
    (a, b) => new Date(b.enviado_em).getTime() - new Date(a.enviado_em).getTime(),
  );
  const ultimaEntrega = historico[0];
  const jaEnviou = Boolean(ultimaEntrega);
  const correcaoAtual = ultimaEntrega ? correcoes[ultimaEntrega.id_entrega] : undefined;
  const corrigida = ultimaEntrega?.status === 'corrigida' && Boolean(correcaoAtual);

  const statusLabels = {
    done: t('avaliacao.filterDone'),
    inReview: t('avaliacao.filterInReview'),
    sent: t('avaliacao.filterPending'),
  };

  let chipLabel = t('activities.statusPending');
  let chipVariant: StatusChipVariant = 'neutral';
  let chipIcon: 'clock' | 'check-circle' | 'alert-circle' = 'clock';

  if (corrigida) {
    chipLabel = t('avaliacao.filterDone');
    chipVariant = 'success';
    chipIcon = 'check-circle';
  } else if (jaEnviou) {
    chipLabel = t('avaliacao.filterInReview');
    chipVariant = 'pending';
    chipIcon = 'clock';
  } else if (encerrada) {
    chipLabel = t('activities.statusClosed');
    chipVariant = 'danger';
    chipIcon = 'alert-circle';
  }

  // Regra atual: uma submissão "vale" por atividade. O histórico já fica pronto
  // para o dia em que reenvio for liberado — é só essa condição mudar.
  const podeEnviar = temGrupo && !encerrada && !jaEnviou;

  return (
    <CardBase
      className="activity-card"
      headerSlot={
        <div className="activity-card-header">
          <h3 className="activity-card-title">{atividade.titulo}</h3>
          <StatusChip label={chipLabel} iconName={chipIcon} variant={chipVariant} />
        </div>
      }
      contentSlot={
        <>
          <p className="activity-card-description">{atividade.descricao}</p>

          <div className="activity-card-meta">
            <StatusChip
              label={`${t('common.deadline')}: ${formatarData(atividade.prazo)}`}
              iconName="clock"
              variant="neutral"
            />
            {atividade.formatos_aceitos.length > 0 && (
              <StatusChip
                label={atividade.formatos_aceitos.join(' · ')}
                iconName="paperclip"
                variant="neutral"
              />
            )}
          </div>

          {corrigida && correcaoAtual && (
            <div className="activity-card-result">
              <span className="activity-card-result-label">{t('activities.finalScore')}</span>
              <span className="activity-card-result-score">
                {t('activities.points', { value: correcaoAtual.nota })}
              </span>
            </div>
          )}

          {podeEnviar && (
            <div className="activity-card-form">
              <Input
                label={t('activities.sendButton')}
                description={t('activities.linkPlaceholder')}
                placeholder="https://..."
                iconName="link"
                value={valorEntrega}
                onChange={(e) => onChangeValorEntrega(e.target.value)}
              />
            </div>
          )}

          {!temGrupo && !encerrada && (
            <p className="activity-card-warning">{t('activities.sendRequired')}</p>
          )}

          {historico.length > 0 && (
            <details className="activity-history">
              <summary className="activity-history-summary">
                <Icon name="inbox" size={16} />
                {t('activities.detailsButton')} ({historico.length})
              </summary>
              <ul className="activity-history-list">
                {historico.map((item) => {
                  const correcaoItem = correcoes[item.id_entrega];
                  const info = statusChipInfo(item.status, Boolean(correcaoItem), statusLabels);
                  return (
                    <li key={item.id_entrega} className="activity-history-item">
                      <div className="activity-history-item-top">
                        <StatusChip label={info.label} iconName={info.icon} variant={info.variant} />
                        <time className="activity-history-date" dateTime={item.enviado_em}>
                          {formatarData(item.enviado_em)}
                        </time>
                      </div>
                      <a
                        href={item.url_arquivo}
                        target="_blank"
                        rel="noreferrer"
                        className="activity-history-link"
                      >
                        {item.url_arquivo}
                      </a>
                      {correcaoItem && (
                        <div className="activity-history-feedback">
                          <strong>{t('activities.points', { value: correcaoItem.nota })}</strong>
                          {correcaoItem.feedback && ` — ${correcaoItem.feedback}`}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </>
      }
      footerSlot={
        podeEnviar ? (
          <Button
            variant="primary"
            label={t('activities.sendButton')}
            iconName="send"
            disabled={isLoading || !valorEntrega.trim()}
            onClick={onEnviar}
          />
        ) : undefined
      }
    />
  );
};

export default ActivityCard;
