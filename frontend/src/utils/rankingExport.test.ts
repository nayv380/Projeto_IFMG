import { describe, expect, it } from 'vitest';
import { rankingToCsv } from './rankingExport';
import { EVENT_STATUS_FLOW, nextStepKey, statusFlowIndex } from './eventStatusFlow';

describe('rankingToCsv', () => {
  it('gera CSV com cabeçalho e linhas', () => {
    const csv = rankingToCsv([
      {
        posicao: 1,
        nome: 'Equipe Alpha',
        total_nota: 90.5,
        media_nota: 45.25,
        entregas_corrigidas: 2,
      },
    ]);
    expect(csv).toContain('posicao,grupo,total,media,entregas');
    expect(csv).toContain('"Equipe Alpha"');
    expect(csv).toContain('90.5');
  });

  it('escapa aspas no nome do grupo', () => {
    const csv = rankingToCsv([
      {
        posicao: 1,
        nome: 'Time "X"',
        total_nota: 10,
        media_nota: 10,
        entregas_corrigidas: 1,
      },
    ]);
    expect(csv).toContain('"Time ""X"""');
  });
});

describe('eventStatusFlow', () => {
  it('ordena o fluxo planejado → finalizado', () => {
    expect(EVENT_STATUS_FLOW[0]).toBe('planejado');
    expect(EVENT_STATUS_FLOW.at(-1)).toBe('finalizado');
  });

  it('calcula índice e próxima dica', () => {
    expect(statusFlowIndex('em_andamento')).toBe(2);
    expect(nextStepKey('inscricoes_abertas')).toBe('event.next.inscricoes_abertas');
  });
});
