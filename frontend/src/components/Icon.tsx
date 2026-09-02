import React from 'react';
import IconTest from '../assets/icon.svg?react';

// 1. Tipagem Estrita: Nomes dos ícones
export type IconName =
  | 'IconTest'
  | 'send'
  | 'clock'
  | 'link'
  | 'check-circle'
  | 'alert-circle'
  | 'inbox'
  | 'paperclip'
  | 'users'
  | 'calendar'
  | 'shield'
  | 'settings'
  | 'edit'
  | 'trash'
  | 'plus'
  | 'search'
  | 'x'
  | 'eye'
  | 'tag'
  | 'refresh'
  | 'user-check'
  | 'user-x';
// 2. Estendemos as propriedades nativas de SVG (para aceitar onClick, className, aria-labels, etc.)
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number | string;
}

// Estilo padrão dos ícones adicionados abaixo: outline/stroke (mesma linguagem visual
// usada nos ícones do design system — ver COMPONENTES.pdf, bloco "Icon").
const strokeProps = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Icon = ({ name, size = 24 }: IconProps) => {
  // Dicionário de Ícones
  const iconRegistry: Record<IconName, React.JSX.Element> = {
    'IconTest': (
      <IconTest />
    ),
    'send': (
      <svg {...strokeProps}>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
      </svg>
    ),
    'clock': (
      <svg {...strokeProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    ),
    'link': (
      <svg {...strokeProps}>
        <path d="M9 17H7a5 5 0 0 1 0-10h2" />
        <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
        <path d="M8 12h8" />
      </svg>
    ),
    'check-circle': (
      <svg {...strokeProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.5 2.5 5-5" />
      </svg>
    ),
    'alert-circle': (
      <svg {...strokeProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
    ),
    'inbox': (
      <svg {...strokeProps}>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
      </svg>
    ),
    'paperclip': (
      <svg {...strokeProps}>
        <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.94 18.12a2 2 0 0 1-2.83-2.83l8.49-8.49" />
      </svg>
    ),
    'users': (
      <svg {...strokeProps}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    'calendar': (
      <svg {...strokeProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    'shield': (
      <svg {...strokeProps}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </svg>
    ),
    'settings': (
      <svg {...strokeProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
    'edit': (
      <svg {...strokeProps}>
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
    'trash': (
      <svg {...strokeProps}>
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
      </svg>
    ),
    'plus': (
      <svg {...strokeProps}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    'search': (
      <svg {...strokeProps}>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
    'x': (
      <svg {...strokeProps}>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    ),
    eye: (
      <svg {...strokeProps}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    tag: (
      <svg {...strokeProps}>
        <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l8.59-8.59a1 1 0 0 0 0-1.41L12 2Z" />
        <circle cx="7" cy="7" r="1.25" fill="currentColor" stroke="none" />
      </svg>
    ),
    refresh: (
      <svg {...strokeProps}>
        <path d="M3 12a9 9 0 0 1 15.5-6.36L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.5 6.36L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    ),
    'user-check': (
      <svg {...strokeProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="m16 11 2 2 4-4" />
      </svg>
    ),
    'user-x': (
      <svg {...strokeProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="m17 8 5 5" />
        <path d="m22 8-5 5" />
      </svg>
    ),
  };

  const SelectedIcon = iconRegistry[name];

  // Fallback de segurança caso o ícone não seja encontrado
  if (!SelectedIcon) {
    console.warn(`Ícone "${name}" não mapeado no componente Icon.`);
    return null; 
  }

  // React.cloneElement permite injetar dinamicamente as props (como size e classes) direto na tag <svg> definida no registry acima.
  return React.cloneElement(SelectedIcon, {
    width: size,
    height: size,
  });
};

export default Icon;