import type { EventoStatus } from '../types/event.types';

export const EVENT_STATUS_FLOW: EventoStatus[] = [
  'planejado',
  'inscricoes_abertas',
  'em_andamento',
  'finalizado',
];

export function statusFlowIndex(status: EventoStatus): number {
  const idx = EVENT_STATUS_FLOW.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export function nextStepKey(status: EventoStatus): string {
  return `event.next.${status}`;
}
