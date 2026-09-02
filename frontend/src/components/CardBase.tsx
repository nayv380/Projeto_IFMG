import React, { type ReactNode } from 'react';
import '../styles/card.css'

export interface CardProps {
  // Textos (Strings)
  title?: string;
  description?: string;
  headerSlot?: ReactNode;
  contentSlot?: ReactNode;
  footerSlot?: ReactNode;
  className?: string;
}

const CardBase: React.FC<CardProps> = ({
  title,
  description,
  headerSlot,
  contentSlot,
  footerSlot,
  className = "",
}) => {
  return (
      <article className={`card-container ${className}`.trim()}>
        {/* Cabeçalho do Card */}

        {headerSlot && (
          <header className="card-header">
            {headerSlot}
        </header>)}

        {(title || description || contentSlot) && (
        <div className="card-body">
            {title && <h2 className="card-title">{title}</h2>}
            {description && <p className="card-description">{description}</p>}
            {contentSlot && (
              <div className="card-content-slot">
                {contentSlot}
              </div>
            )}
        </div>
        )}

        {footerSlot && (
            <footer className="card-footer">
                {footerSlot}
            </footer>
        )}
      </article>
  );
};

export default CardBase;
