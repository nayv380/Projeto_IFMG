import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n';

interface BrandLogoProps {
  to?: string;
  size?: 'sm' | 'md';
  showTagline?: boolean;
}

const LETTERS = ['L', 'A', 'T', 'I', 'N', 'A', 'T', 'O', 'N'];

export default function BrandLogo({
  to = '/',
  size = 'md',
  showTagline = false,
}: BrandLogoProps): React.JSX.Element {
  const { t } = useTranslation();

  const content = (
    <div>
      <div className={`lt-logo ${size === 'sm' ? 'lt-logo-sm' : ''}`.trim()} aria-label="LATINATON">
        {LETTERS.map((letter, i) => (
          <span key={`${letter}-${i}`}>{letter}</span>
        ))}
      </div>
      {showTagline && <p className="lt-tagline">{t('brand.tagline')}</p>}
    </div>
  );

  if (!to) return content;
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  );
}
