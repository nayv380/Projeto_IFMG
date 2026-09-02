import React from 'react';
import '../styles/spinner.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  /** Si true, ocupa el contenedor padre con fondo semitransparente */
  overlay?: boolean;
}

export default function Spinner({
  size = 'md',
  label,
  overlay = false,
}: SpinnerProps): React.JSX.Element {
  const content = (
    <div className={`lt-spinner-wrap lt-spinner-${size}`} role="status" aria-live="polite">
      <span className="lt-spinner" aria-hidden />
      {label && <span className="lt-spinner-label">{label}</span>}
      <span className="lt-sr-only">{label || 'Carregando...'}</span>
    </div>
  );

  if (overlay) {
    return <div className="lt-spinner-overlay">{content}</div>;
  }

  return content;
}
