import React, { useId } from 'react';
import  Icon, { type IconName } from './Icon';
import '../styles/input.css'

// 1. TIPAGEM ESTÁTICA (TypeScript)
// Estendemos os atributos nativos do HTML para que o input aceite propriedades como 'type', 'disabled', 'value', etc.
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;      
  description?: string;   
  iconName?: IconName;  
  error?: string | undefined;        
}

const Input: React.FC<InputProps> = ({
  label,
  description,
  placeholder,
  iconName,
  error,
  className = '',
  ...rest // Captura todas as outras propriedades padrão do HTML (ex: onChange, value, type)
}) => {
  // Gera um ID único automático e seguro para conectar o <label> ao <input> para acessibilidade (A11y)
  const inputId = useId();
  const errorId = useId();
  const descriptionId = useId();

  return (
    // WRAPPER PRINCIPAL: Uma DIV que funciona para o "Auto Layout Vertical" do Figma (alinha label, input e subtextos);
    <div className="input-container">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}

      {/* WRAPPER DO INPUT: Div para encapsular o campo e o ícone na horizontal */}
      <div className="input-field-wrapper">
        
        {/* MAPA SEMÂNTICO: Tag nativa de Input */}
        <input
          id={inputId}
          placeholder={placeholder}
          className={`input-element ${error ? 'input-error' : ''} ${iconName ? 'input-has-icon' : ''} ${className}`.trim()}
          // Atributos de acessibilidade que conectam o input às suas descrições/erros se eles existirem
          aria-describedby={`${description ? descriptionId : ''} ${error ? errorId : ''}`.trim() || undefined}
          aria-invalid={!!error}
          {...rest}
        />

        {/* SLOT: Ícone posicionado no interior do input */}
        {iconName && (
          <div className="input-icon-container">
              <Icon name={iconName} />
          </div>
          
        )}
        
      </div>

      {/* MAPA SEMÂNTICO: Descrição auxiliar */}
      {description && !error && (
        <p id={descriptionId} className="input-description">
          {description}
        </p>
      )}

      {/* MAPA SEMÂNTICO: Mensagem de erro (Substitui a descrição visualmente quando há erro) */}
      {error && (
        <p id={errorId} className="input-error-message">
          {error}
        </p>
      )}

    </div>
  );
};

export default Input;