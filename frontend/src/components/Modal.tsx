import React, { useEffect, useId } from 'react';
import Button from './Button';
import { useTranslation } from '../i18n';
import '../styles/modal.css';

export type ModalVariant = 'info' | 'success' | 'error' | 'confirm';

export interface ModalProps {
  open: boolean;
  title?: string;
  message: string;
  variant?: ModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const Modal: React.FC<ModalProps> = ({
  open,
  title,
  message,
  variant = 'info',
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const descId = useId();
  const resolvedConfirm = confirmLabel ?? t('common.ok');
  const resolvedCancel = cancelLabel ?? t('common.cancel');

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (variant === 'confirm' && onCancel) onCancel();
        else onConfirm();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, variant, onCancel, onConfirm]);

  if (!open) return null;

  const confirmVariant = variant === 'confirm' || variant === 'error' ? 'danger' : 'primary';

  return (
    <div className="lt-modal-root" role="presentation">
      <button
        type="button"
        className="lt-modal-backdrop"
        aria-label={t('common.close')}
        onClick={() => {
          if (variant === 'confirm' && onCancel) onCancel();
          else onConfirm();
        }}
      />
      <div
        className={`lt-modal lt-modal--${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={descId}
      >
        {title && (
          <h2 id={titleId} className="lt-modal-title">
            {title}
          </h2>
        )}
        <p id={descId} className="lt-modal-message">
          {message}
        </p>
        <div className="lt-modal-actions">
          {variant === 'confirm' && onCancel && (
            <Button label={resolvedCancel} variant="ghost" onClick={onCancel} />
          )}
          <Button label={resolvedConfirm} variant={confirmVariant} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
};

export default Modal;
