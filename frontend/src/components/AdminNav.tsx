import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon, { type IconName } from './Icon';
import { useTranslation } from '../i18n';
import '../styles/admin.css';

interface AdminNavItem {
  to: string;
  labelKey: string;
  iconName: IconName;
}

const items: AdminNavItem[] = [
  { to: '/admin', labelKey: 'admin.nav.overview', iconName: 'shield' },
  { to: '/admin/usuarios', labelKey: 'admin.nav.users', iconName: 'users' },
  { to: '/admin/eventos', labelKey: 'admin.nav.events', iconName: 'calendar' },
  { to: '/admin/inscricoes', labelKey: 'admin.nav.inscriptions', iconName: 'users' },
  { to: '/admin/atividades', labelKey: 'admin.nav.activities', iconName: 'calendar' },
  { to: '/admin/permissoes', labelKey: 'admin.nav.permissions', iconName: 'shield' },
  { to: '/admin/configuracoes', labelKey: 'admin.nav.settings', iconName: 'settings' },
  { to: '/admin/correcoes', labelKey: 'admin.nav.corrections', iconName: 'check-circle' },
];

const AdminNav: React.FC = () => {
  const { t } = useTranslation();

  return (
    <nav className="admin-nav" aria-label={t('admin.navLabel')}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/admin'}
          className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}
        >
          <Icon name={item.iconName} size={18} />
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
};

export default AdminNav;
