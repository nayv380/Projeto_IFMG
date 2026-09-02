import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../i18n';
import '../styles/language-selector.css';

type Locale = 'pt-BR' | 'en-US' | 'es-ES';

const LOCALES: { value: Locale; labelKey: string; short: string }[] = [
  { value: 'pt-BR', labelKey: 'lang.pt', short: 'PT' },
  { value: 'es-ES', labelKey: 'lang.es', short: 'ES' },
  { value: 'en-US', labelKey: 'lang.en', short: 'EN' },
];

function TranslateIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3 12h18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Seletor PT / EN / ES — ícone de tradução + menu */
export default function LanguageSelector(): React.JSX.Element {
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectLocale = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  return (
    <div className="lang-selector" ref={rootRef}>
      <button
        type="button"
        className="lang-selector-trigger"
        aria-label={t('lang.label')}
        title={t('lang.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <TranslateIcon />
      </button>

      {open && (
        <div className="lang-selector-dropdown" id={menuId} role="menu">
          {LOCALES.map((item) => {
            const selected = locale === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`lang-selector-option${selected ? ' is-selected' : ''}`}
                onClick={() => selectLocale(item.value)}
              >
                <span className="lang-selector-option-short">{item.short}</span>
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
