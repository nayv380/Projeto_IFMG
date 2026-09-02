import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { UserProvider } from './UserContext';
import { GroupProvider } from './GroupContext';
import { EventProvider } from './EventContext';
import { ActivityProvider } from './ActivityContext';
import { FeedbackProvider } from './FeedbackContext';
import { LanguageProvider } from '../i18n';

/**
 * Composição de todos os Contextos globais da aplicação.
 * LanguageProvider no topo para `useTranslation` em qualquer tela.
 */
export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <FeedbackProvider>
        <AuthProvider>
          <UserProvider>
            <GroupProvider>
              <EventProvider>
                <ActivityProvider>{children}</ActivityProvider>
              </EventProvider>
            </GroupProvider>
          </UserProvider>
        </AuthProvider>
      </FeedbackProvider>
    </LanguageProvider>
  );
}
