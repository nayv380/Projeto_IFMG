import React, { type ReactNode } from 'react';
import '../styles/sidebar.css'

// TIPAGEM ESTÁTICA
export interface SideBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Slot superior (Ex: Logo da empresa, botão de colapsar) */
  headerSlot?: ReactNode;
  
  /** Slot central (Ex: Links de navegação principais) */
  contentSlot?: ReactNode;
  
  /** Slot inferior (Ex: Botão de sair, mini perfil do usuário) */
  footerSlot?: ReactNode;
}

const SideBar: React.FC<SideBarProps> = ({
  headerSlot,
  contentSlot,
  footerSlot,
  ...rest
}) => {
  return (
    // MAPA SEMÂNTICO: <aside> é a tag correta para conteúdos laterais ou auxiliares
    <aside className='sidebar-container' {...rest}>
      
      {/* AGRUPAMENTO: Div para manter header e menu juntos na estilização do flexbox */}
      <div className='sidebar-main-group'>
        
        {headerSlot && (
          <header className='sidebar-header'>
            {headerSlot}
          </header>
        )}

        {/* MAPA SEMÂNTICO: <nav> indica que é uma área de navegação */}
        <nav className='sidebar-content'>
          {contentSlot}
        </nav>

      </div>

      {/* FOOTER: Fica fora do grupo principal para ser "empurrado" para baixo via CSS */}
      {footerSlot && (
        <footer className='sidebar-footer'>
          {footerSlot}
        </footer>
      )}

    </aside>
  );
};

export default SideBar;