import  Icon, { type IconName } from './Icon';
import '../styles/button.css'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  label?: string;
  iconName?: IconName;
  onClick?: () => void;
}

const Button = ({
  onClick,
  label,
  variant = 'primary',
  iconName,
  ...rest
}: ButtonProps) => {

  const buttonClasses = `btn-global btn-${variant}`.trim();
  return (
    <>
      <button
        onClick={onClick}
        className={buttonClasses}
        {...rest}
      >
        {variant === 'secondary' && iconName && ( // Renderiza se button variant secondary
            <Icon name={iconName} className='btn-icon'/>
            )}

        {label && <span>{label}</span>} 

        {(variant === 'primary' || variant === 'ghost' || variant === 'danger') && iconName && (
            <Icon name={iconName} className='btn-icon'/>
        )}
      </button>
    </>
  );
};

export default Button;