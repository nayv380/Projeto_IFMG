import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Modal, { type ModalVariant } from '../components/Modal';
import { useTranslation } from '../i18n';

interface AlertOptions {
  message: string;
  title?: string;
  variant?: Exclude<ModalVariant, 'confirm'>;
  confirmLabel?: string;
}

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface FeedbackContextValue {
  alert: (options: AlertOptions | string) => Promise<void>;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

type DialogState =
  | {
      mode: 'alert';
      title?: string;
      message: string;
      variant: Exclude<ModalVariant, 'confirm'>;
      confirmLabel: string;
      resolve: () => void;
    }
  | {
      mode: 'confirm';
      title?: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      resolve: (value: boolean) => void;
    }
  | null;

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<DialogState>(null);

  const alert = useCallback(
    (options: AlertOptions | string) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      return new Promise<void>((resolve) => {
        setDialog({
          mode: 'alert',
          title: opts.title,
          message: opts.message,
          variant: opts.variant ?? 'info',
          confirmLabel: opts.confirmLabel ?? t('common.ok'),
          resolve,
        });
      });
    },
    [t],
  );

  const confirm = useCallback(
    (options: ConfirmOptions | string) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      return new Promise<boolean>((resolve) => {
        setDialog({
          mode: 'confirm',
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? t('common.confirm'),
          cancelLabel: opts.cancelLabel ?? t('common.cancel'),
          resolve,
        });
      });
    },
    [t],
  );

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(dialog)}
        title={dialog?.title}
        message={dialog?.message ?? ''}
        variant={dialog?.mode === 'confirm' ? 'confirm' : dialog?.variant ?? 'info'}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.mode === 'confirm' ? dialog.cancelLabel : undefined}
        onConfirm={() => {
          if (!dialog) return;
          if (dialog.mode === 'confirm') {
            const { resolve } = dialog;
            setDialog(null);
            resolve(true);
            return;
          }
          const { resolve } = dialog;
          setDialog(null);
          resolve();
        }}
        onCancel={
          dialog?.mode === 'confirm'
            ? () => {
                const { resolve } = dialog;
                setDialog(null);
                resolve(false);
              }
            : undefined
        }
      />
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback deve ser usado dentro de um FeedbackProvider.');
  }
  return context;
}
