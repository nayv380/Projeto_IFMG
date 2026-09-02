import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import SideBar from '../components/SideBar';
import Button from '../components/Button';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import LanguageSelector from '../components/LanguageSelector';
import { useTranslation } from '../i18n';
import '../styles/landingpage.css';

type SectionId = 'solucoes' | 'comunidade' | 'sobre';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('solucoes');

  const sections = useMemo(
    () =>
      [
        { id: 'solucoes' as const, label: t('landing.nav.challenge') },
        { id: 'comunidade' as const, label: t('landing.nav.community') },
        { id: 'sobre' as const, label: t('landing.nav.about') },
      ] as const,
    [t],
  );

  const handleAuthRedirect = () => navigate('/auth');
  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  useEffect(() => {
    const root = document.querySelector('.landing-content');
    const targets = sections
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (top?.target?.id) {
          setActiveSection(top.target.id as SectionId);
        }
      },
      {
        root: root instanceof Element ? root : null,
        threshold: [0.35, 0.55, 0.7],
        rootMargin: '-10% 0px -35% 0px',
      },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = useCallback((id: SectionId) => {
    setActiveSection(id);
    setIsMenuOpen(false);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const navLinks = useMemo(
    () => (
      <nav className="landing-nav" aria-label="Seções da página">
        {sections.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className={`landing-nav-link landing-nav-link--${id} ${activeSection === id ? 'is-active' : ''}`.trim()}
            aria-current={activeSection === id ? 'true' : undefined}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(id);
            }}
          >
            {label}
          </a>
        ))}
      </nav>
    ),
    [activeSection, scrollToSection, sections],
  );

  return (
    <div className="landing-wrapper">
      <div className="landing-navbar-wrapper">
        <NavBar
          accessibilityLabel="Navegação da Landing Page Mobile"
          left={<BrandLogo size="sm" />}
          right={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <LanguageSelector />
              <Button variant="primary" label={t('landing.authButton')} onClick={handleAuthRedirect} />
              <Button
                variant="ghost"
                label={isMenuOpen ? t('common.close') : t('common.menu')}
                onClick={toggleMenu}
              />
            </div>
          }
        />
      </div>

      {isMenuOpen && <div className="landing-mobile-menu">{navLinks}</div>}

      <div className="landing-sidebar-wrapper">
        <SideBar
          headerSlot={
            <div style={{ padding: '24px 16px' }}>
              <BrandLogo showTagline />
            </div>
          }
          contentSlot={<div style={{ padding: '0 16px' }}>{navLinks}</div>}
          footerSlot={
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <LanguageSelector />
              <Button variant="primary" label={t('landing.authButton')} onClick={handleAuthRedirect} />
            </div>
          }
        />
      </div>

      <main className="landing-content">
        <section id="solucoes" className="landing-section landing-section--yellow">
          <div>
            <h1>{t('landing.hero.title')}</h1>
            <p>{t('landing.hero.subtitle')}</p>
          </div>
        </section>

        <section id="comunidade" className="landing-section landing-section--red">
          <div>
            <h2>{t('landing.community.title')}</h2>
            <p>{t('landing.community.subtitle')}</p>
          </div>
        </section>

        <section id="sobre" className="landing-section landing-section--green">
          <div>
            <h2>{t('landing.about.title')}</h2>
            <p>{t('landing.about.subtitle')}</p>
          </div>
        </section>

        <Footer
          copyrightSlot={<p>{t('landing.footerCopyright')}</p>}
          termsSlot={<a href="#termos">{t('landing.footerTerms')}</a>}
          privacySlot={<a href="#privacidade">{t('landing.footerPrivacy')}</a>}
          supportSlot={<a href="#suporte">{t('landing.footerSupport')}</a>}
        />
      </main>
    </div>
  );
};

export default LandingPage;
