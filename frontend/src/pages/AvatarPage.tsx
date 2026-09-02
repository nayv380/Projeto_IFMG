import React, { useEffect, useState } from 'react';
import CardBase from '../components/CardBase';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { useUserData } from '../context/UserContext';
import { useTranslation } from '../i18n';
import '../styles/profile.css';

function initials(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const AvatarPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const { usuario, atualizarPerfil } = useAuth();
  const { meuAvatar, carregarMeuAvatar, salvarMeuAvatar, isLoading, error } = useUserData();

  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    nomeUsuario: '',
    whatsapp: '',
    pais: '',
    instituicao: '',
    curso: '',
  });

  useEffect(() => {
    void carregarMeuAvatar();
  }, [carregarMeuAvatar]);

  useEffect(() => {
    if (isEditing && usuario) {
      setFormData({
        nome: usuario.nome || '',
        nomeUsuario: meuAvatar?.nome_usuario || '',
        whatsapp: meuAvatar?.whatsapp || '',
        pais: usuario.pais || '',
        instituicao: usuario.instituicao || '',
        curso: usuario.curso || '',
      });
      setSaveError(null);
      setSaveOk(false);
    }
  }, [isEditing, usuario, meuAvatar]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveOk(false);
    try {
      await atualizarPerfil({
        nome: formData.nome,
        pais: formData.pais,
        instituicao: formData.instituicao,
        curso: formData.curso,
      });

      if (formData.nomeUsuario.trim()) {
        await salvarMeuAvatar({
          nome_usuario: formData.nomeUsuario.trim(),
          whatsapp: formData.whatsapp,
        });
      }

      setSaveOk(true);
      setIsEditing(false);
      void carregarMeuAvatar();
    } catch {
      setSaveError(t('profile.saveError'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!usuario) {
    return <div className="profile-loading">{t('profile.loading')}</div>;
  }

  const displayName = meuAvatar?.nome_usuario ? `@${meuAvatar.nome_usuario}` : usuario.nome;

  return (
    <div className="profile-page">
      <h1 className="lt-page-title">{t('profile.pageTitle')}</h1>

      {(saveError || error) && (
        <div className="profile-status is-error" role="alert">
          {saveError || error}
        </div>
      )}
      {saveOk && !isEditing && (
        <div className="profile-status is-ok" role="status">
          {t('profile.saveSuccess')}
        </div>
      )}

      <CardBase
        headerSlot={
          <div className="profile-hero">
            <div className="profile-avatar" aria-hidden>
              {initials(usuario.nome || '?')}
            </div>
            <div className="profile-hero-text">
              <h2>{displayName}</h2>
              <p>
                {usuario.curso || t('profile.courseUnknown')} ·{' '}
                {usuario.id_perfil?.nome ?? t('profile.roleUnknown')}
              </p>
            </div>
          </div>
        }
        contentSlot={
          isEditing ? (
            <form id="edit-profile-form" className="profile-form" onSubmit={(e) => void handleSave(e)}>
              <Input
                label={t('profile.nameLabel')}
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
              />
              <Input
                label={t('profile.usernameLabel')}
                name="nomeUsuario"
                value={formData.nomeUsuario}
                onChange={handleChange}
                description={t('profile.usernameDescription')}
                required
              />
              <Input
                label={t('profile.whatsappLabel')}
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
              />
              <Input
                label={t('profile.countryLabel')}
                name="pais"
                value={formData.pais}
                onChange={handleChange}
                placeholder={t('profile.countryPlaceholder')}
              />
              <Input
                label={t('profile.institutionLabel')}
                name="instituicao"
                value={formData.instituicao}
                onChange={handleChange}
              />
              <Input
                label={t('profile.courseLabel')}
                name="curso"
                value={formData.curso}
                onChange={handleChange}
              />
            </form>
          ) : (
            <dl className="profile-fields">
              <div className="profile-field">
                <dt>{t('profile.emailLabel')}</dt>
                <dd>{usuario.email}</dd>
              </div>
              <div className="profile-field">
                <dt>{t('profile.whatsappLabel')}</dt>
                <dd>{meuAvatar?.whatsapp || t('profile.notProvided')}</dd>
              </div>
              <div className="profile-field">
                <dt>{t('profile.countryLabel')}</dt>
                <dd>{usuario.pais || t('profile.notProvided')}</dd>
              </div>
              <div className="profile-field">
                <dt>{t('profile.institutionLabel')}</dt>
                <dd>{usuario.instituicao || t('profile.notProvidedFemale')}</dd>
              </div>
              <div className="profile-field">
                <dt>{t('profile.courseLabel')}</dt>
                <dd>{usuario.curso || t('profile.notProvided')}</dd>
              </div>
              <div className="profile-field">
                <dt>{t('profile.joinedOn')}</dt>
                <dd>{new Date(usuario.criado_em).toLocaleDateString(locale)}</dd>
              </div>
            </dl>
          )
        }
        footerSlot={
          <div className="lt-actions">
            {isEditing ? (
              <>
                <Button
                  type="submit"
                  form="edit-profile-form"
                  variant="primary"
                  label={isLoading ? t('profile.saving') : t('profile.saveChanges')}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  label={t('profile.cancel')}
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                />
              </>
            ) : (
              <Button
                type="button"
                variant="primary"
                label={t('profile.editProfile')}
                onClick={() => setIsEditing(true)}
              />
            )}
          </div>
        }
      />
    </div>
  );
};

export default AvatarPage;
