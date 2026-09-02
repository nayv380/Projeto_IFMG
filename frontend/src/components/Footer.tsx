import { type ReactNode } from 'react';
import '../styles/footer.css'

interface FooterProps {
  languageSelectorSlot?: ReactNode;
  copyrightSlot?: ReactNode;
  termsSlot?: ReactNode;
  privacySlot?: ReactNode;
  supportSlot?: ReactNode;
  className?: string;
}


function Footer({
  languageSelectorSlot,
  copyrightSlot,
  termsSlot,
  privacySlot,
  supportSlot,
  className = '',
}: FooterProps) {
  return (
    <footer className={`footer-container ${className}`.trim()}>
      <nav 
        className="footer-nav">
        {languageSelectorSlot}
      </nav>

      {(termsSlot || privacySlot || supportSlot) && (
        <div className="footer-links-group">
          {termsSlot && <div className="footer-slot">{termsSlot}</div>}
          {privacySlot && <div className="footer-slot">{privacySlot}</div>}
          {supportSlot && <div className="footer-slot">{supportSlot}</div>}
        </div>
      )}


     {copyrightSlot && (
        <div className="footer-copyright">
          {copyrightSlot}
        </div>
      )}

    </footer>
  );
}

export default Footer;