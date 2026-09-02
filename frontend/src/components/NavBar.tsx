import React, { type ReactNode } from 'react';
import '../styles/navbar.css'

export interface NavBarProps {
  /** Rótulo de acessibilidade para a região de navegação */
  accessibilityLabel?: string;
  /** Slot para composição de elementos da área esquerda */
  left?: ReactNode;
  /** Slot para composição de elementos centralizados a navbar */
  center?: ReactNode;
  /** Slot para composição de elementos da área direita (ex: Right Area e User Actions) */
  right?: ReactNode;
}

const NavBar = ({
  accessibilityLabel = 'Navegação Principal',
  left,
  center,
  right,
}: NavBarProps): React.JSX.Element => {
  return (
    <>
      <nav
        aria-label={accessibilityLabel}
        className="navbar-container"
      >
        {left && (
          <div className="navbar-left">
            {left}
          </div>
        )}

        {center && (
          <div className="navbar-center">
            {center}
          </div>
        )}

        {right && (
          <div className="navbar-right">
            {right}
          </div>
        )}

      </nav>
    </>
  );
};

export default NavBar;