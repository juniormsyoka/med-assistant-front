import { getUserProfile, saveUserProfile } from './storage';
import { UserProfile, UserPreferences, defaultPreferences } from '../models/User';

class SettingsService {
  private currentProfile: UserProfile | null = null;

  async initialize(): Promise<UserProfile> {
    try {
      let profile = await getUserProfile();

      if (!profile) {
        // Create default profile
        const now = new Date().toISOString();
        const defaultProfile: UserProfile = {
          id: 1,
          name: 'User',
          email: undefined,
          phone: undefined,
          preferences: defaultPreferences,
          createdAt: now,
          updatedAt: now,
        };
        await saveUserProfile(defaultProfile);
        profile = defaultProfile;
      }

      this.currentProfile = profile;
      return profile;
    } catch (error) {
      console.error('Error initializing settings:', error);
      throw error;
    }
  }

  async getPreferences(): Promise<UserPreferences> {
    if (!this.currentProfile) {
      await this.initialize();
    }
    return this.currentProfile!.preferences;
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.currentProfile) {
      await this.initialize();
    }
    const updated = {
      ...this.currentProfile!,
      preferences: {
        ...this.currentProfile!.preferences,
        ...preferences,
      },
      updatedAt: new Date().toISOString(),
    };
    await saveUserProfile(updated);
    this.currentProfile = updated;
  }

  async updateProfile(profile: Partial<UserProfile>): Promise<void> {
    if (!this.currentProfile) {
      await this.initialize();
    }
    const updated = {
      ...this.currentProfile!,
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    await saveUserProfile(updated);
    this.currentProfile = updated;
  }

  getReminderSound(): string {
    return this.currentProfile?.preferences.reminderSound ?? 'default';
  }

  shouldShowDailySummary(): boolean {
    return this.currentProfile?.preferences.enableDailySummary ?? true;
  }

  getReminderLeadTime(): number {
    return this.currentProfile?.preferences.reminderLeadTime ?? 5;
  }

  isVibrationEnabled(): boolean {
    return this.currentProfile?.preferences.vibrationEnabled ?? true;
  }
}

export const settingsService = new SettingsService();
