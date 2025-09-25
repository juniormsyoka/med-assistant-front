export interface UserPreferences {
  reminderSound: string;
  enableDailySummary: boolean;
  reminderLeadTime: number; // minutes before reminder
  vibrationEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontScale: number;

  inAppAlertsEnabled: boolean,    
  soundEnabled: boolean,          
  badgeEnabled: boolean,          
}

export interface UserProfile {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export const defaultPreferences: UserPreferences = {
  reminderSound: 'default',
  enableDailySummary: true,
  reminderLeadTime: 5, // 5 minutes before
  vibrationEnabled: true,
  theme: 'system',
  language: 'en',
  fontScale:2,

  //added later on
  inAppAlertsEnabled: true,    // Controls shouldShowAlert
  soundEnabled: true,          // Controls shouldPlaySound  
  badgeEnabled: true,          // Controls shouldSetBadge
};

export type CreateUserProfile = Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>;