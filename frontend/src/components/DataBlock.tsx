import React, { type ReactNode } from 'react';
import '../styles/datablock.css'; // Importação do estilo

export interface DataBlockProps {
  /** O título do dado (Ex: 'E-mail', 'Local', 'Data') */
  label: string;
  
  /** A informação em si. Pode ser texto puro ou outro componente */
  info: ReactNode;
  
  /** Ícone opcional para acompanhar a label na esquerda */
  iconSlot?: ReactNode;
  
  /** Classe extra para flexibilidade externa */
  className?: string;
}

const DataBlock: React.FC<DataBlockProps> = ({
  label,
  info,
  iconSlot,
  className = '',
}) => {
  return (
    // MAPA SEMÂNTICO: <dl> para "Description List"
    <div className={`data-block-container ${className}`.trim()}>
      
      {/* MAPA SEMÂNTICO: <dt> para "Description Term" (A Label) */}
      <div className="data-block-label">
        {iconSlot && (
          <span className="data-block-icon" aria-hidden="true">
            {iconSlot}
          </span>
        )}
        <span>{label}</span>
      </div>

      {/* MAPA SEMÂNTICO: <dd> para "Description Details" (A Informação) */}
      <div className="data-block-info">
        {info}
      </div>
      
    </div>
  );
};

export default DataBlock;