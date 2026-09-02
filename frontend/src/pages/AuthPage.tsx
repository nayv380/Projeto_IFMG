import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthForm from '../components/AuthForm';
import Input from '../components/Input';
import Button from '../components/Button';
import BrandLogo from '../components/BrandLogo';
import Spinner from '../components/Spinner';
import LanguageSelector from '../components/LanguageSelector';
import { useTranslation } from '../i18n';
import { type LoginPayload, type RegistroPayload } from '../types/auth-types';
import '../styles/authpage.css';

export default function AuthPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, registrar, isSubmitting, error, limparErro } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    limparErro();
  }, [isLoginTab, limparErro]);

  const handleLoginSubmit = async (data: LoginPayload) => {
    setSuccessMessage(null);
    try {
      await login(data);
      navigate('/perfil', { replace: true });
    } catch {
      /* error already in context */
    }
  };

  const handleRegistroSubmit = async (data: RegistroPayload) => {
    setSuccessMessage(null);
    try {
      const { pendingApproval } = await registrar(data);
      if (pendingApproval) {
        setSuccessMessage(t('auth.evaluatorPending'));
        setIsLoginTab(true);
        return;
      }
      navigate('/perfil', { replace: true });
    } catch {
      /* error already in context */
    }
  };

  const loadingLabel = isLoginTab ? t('auth.loginLoading') : t('auth.registerLoading');

  return (
    <div className="auth-page">
      <aside className="auth-brand-panel" aria-hidden="false">
        <BrandLogo to="/" showTagline />
        <div className="auth-brand-copy">
          <h1>{t('auth.brandTitle')}</h1>
          <p>{t('auth.brandSubtitle')}</p>
        </div>
        <p className="auth-brand-meta">IFMG · Campus Ibirité</p>
      </aside>

      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-top">
            <div className="auth-brand-mobile">
              <BrandLogo to="/" showTagline />
            </div>
            <LanguageSelector />
          </div>

          <div className={`auth-card ${isSubmitting ? 'is-loading' : ''}`.trim()}>
            {isSubmitting && <Spinner overlay label={loadingLabel} />}

            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={isLoginTab}
                className={`auth-tab-btn ${isLoginTab ? 'active' : ''}`}
                onClick={() => setIsLoginTab(true)}
                disabled={isSubmitting}
              >
                {t('auth.loginTab')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isLoginTab}
                className={`auth-tab-btn ${!isLoginTab ? 'active' : ''}`}
                onClick={() => setIsLoginTab(false)}
                disabled={isSubmitting}
              >
                {t('auth.registerTab')}
              </button>
            </div>

            <div className="auth-card-body">
              {error && (
                <div className="auth-error-banner" role="alert">
                  <span aria-hidden>⚠</span>
                  <p>{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="auth-success-banner" role="status">
                  <p>{successMessage}</p>
                </div>
              )}

              {isLoginTab ? (
                <AuthForm<LoginPayload>
                  onSubmit={handleLoginSubmit}
                  actionSlot={
                    <Button
                      type="submit"
                      variant="primary"
                      label={isSubmitting ? t('auth.loginSubmitting') : t('auth.loginButton')}
                      disabled={isSubmitting}
                    />
                  }
                >
                  {(methods) => (
                    <>
                      <Input
                        type="email"
                        label={t('auth.emailLabel')}
                        placeholder={t('auth.emailPlaceholder')}
                        autoComplete="email"
                        disabled={isSubmitting}
                        {...methods.register('email', {
                          required: t('auth.validation.requiredEmail'),
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: t('auth.validation.invalidEmail'),
                          },
                        })}
                        error={methods.formState.errors.email?.message}
                      />
                      <Input
                        type="password"
                        label={t('auth.passwordLabel')}
                        placeholder={t('auth.passwordPlaceholder')}
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        {...methods.register('password', {
                          required: t('auth.validation.requiredPassword'),
                          minLength: { value: 6, message: t('auth.validation.minPassword') },
                        })}
                        error={methods.formState.errors.password?.message}
                      />
                    </>
                  )}
                </AuthForm>
              ) : (
                <AuthForm<RegistroPayload>
                  onSubmit={handleRegistroSubmit}
                  formOptions={{
                    defaultValues: {
                      tipo_perfil: 'participante',
                    },
                  }}
                  actionSlot={
                    <Button
                      type="submit"
                      variant="primary"
                      label={isSubmitting ? t('auth.registerSubmitting') : t('auth.registerButton')}
                      disabled={isSubmitting}
                    />
                  }
                >
                  {(methods) => (
                    <>
                      <Input
                        type="text"
                        label={t('auth.nameLabel')}
                        placeholder={t('auth.namePlaceholder')}
                        autoComplete="name"
                        disabled={isSubmitting}
                        {...methods.register('nome', { required: t('auth.validation.requiredName') })}
                        error={methods.formState.errors.nome?.message}
                      />
                      <Input
                        type="email"
                        label={t('auth.emailLabel')}
                        placeholder={t('auth.emailPlaceholder')}
                        autoComplete="email"
                        disabled={isSubmitting}
                        {...methods.register('email', {
                          required: t('auth.validation.requiredEmail'),
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: t('auth.validation.invalidEmail'),
                          },
                        })}
                        error={methods.formState.errors.email?.message}
                      />
                      <Input
                        type="password"
                        label={t('auth.passwordLabel')}
                        placeholder={t('auth.passwordRegisterPlaceholder')}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        {...methods.register('password', {
                          required: t('auth.validation.requiredRegisterPassword'),
                          minLength: { value: 6, message: t('auth.validation.minPassword') },
                        })}
                        error={methods.formState.errors.password?.message}
                      />
                      <fieldset className="auth-role-fieldset" disabled={isSubmitting}>
                        <legend className="auth-role-legend">{t('auth.roleLegend')}</legend>
                        <label className="auth-role-option">
                          <input
                            type="radio"
                            value="participante"
                            {...methods.register('tipo_perfil')}
                          />
                          <span>
                            <strong>{t('auth.roleParticipant')}</strong>
                            <small>{t('auth.roleParticipantDesc')}</small>
                          </span>
                        </label>
                        <label className="auth-role-option">
                          <input
                            type="radio"
                            value="avaliador"
                            {...methods.register('tipo_perfil')}
                          />
                          <span>
                            <strong>{t('auth.roleEvaluator')}</strong>
                            <small>{t('auth.roleEvaluatorDesc')}</small>
                          </span>
                        </label>
                      </fieldset>
                    </>
                  )}
                </AuthForm>
              )}
            </div>
          </div>

          <p className="auth-footer-link">
            <Link to="/">{t('common.backHome')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
