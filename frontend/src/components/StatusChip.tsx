import React from 'react';
import Icon, { type IconName } from './Icon';
import '../styles/statuschip.css';

export type StatusChipVariant = 'neutral' | 'pending' | 'success' | 'danger';

export interface StatusChipProps {
  label: string;
  iconName?: IconName;
  variant?: StatusChipVariant;
  className?: string;
}

/**
 * Pill pequena com ícone + texto, usada para status/prazo/nota.
 * Mapeia para os componentes "Data Block" / badges do design system
 * (ver COMPONENTES.pdf) — variantes de cor seguem os tokens LATINATON.
 */
const StatusChip: React.FC<StatusChipProps> = ({
  label,
  iconName,
  variant = 'neutral',
  className = '',
}) => {
  return (
    <span className={`status-chip status-chip-${variant} ${className}`.trim()}>
      {iconName && <Icon name={iconName} size={14} className="status-chip-icon" />}
      {label}
    </span>
  );
};

export default StatusChip;
