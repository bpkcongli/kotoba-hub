import type { UserPreferences } from '@/shared/locale';
import type { AppSession } from './entities';

export interface FrontendBootstrapData {
  preferences?: UserPreferences;
  localizedSyllabus?: boolean;
  session?: AppSession;
}
