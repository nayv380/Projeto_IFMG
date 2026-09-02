import React, { type ReactNode } from 'react';
import '../styles/userblock.css'

interface UserBlockProps {
  username: string;
  skill: string;
  action?: ReactNode;
  avatar: ReactNode;
  variant?: 'row' | 'column';
  className?: string;
}

const UserBlock = ({
  username,
  skill,
  action,
  avatar,
  className = '',
  variant = 'row',
}: UserBlockProps): React.JSX.Element => {
  return (
    <>
      <section aria-label="Bloco de identificação de usuário"
      className={`user-block-container user-block--${variant} ${className}`.trim()}
      >
        <div className="user-block-main">

          <div className="user-block-avatar">
            {avatar}
          </div>

          <div className="user-block-info">
            <strong className="user-block-username">{username}</strong>
            <span className="user-block-skill">{skill}</span>
          </div>
        
        </div>

        {action && (
          <div className="user-block-action">
            {action}
          </div>)}
      </section>
    </>
  );
};

export default UserBlock;

