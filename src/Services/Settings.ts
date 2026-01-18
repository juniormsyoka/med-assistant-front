// Services/Settings.ts
import { getUserProfile, saveUserProfile } from './storage';
import { UserProfile, UserPreferences, defaultPreferences } from '../models/User';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/Services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SettingsService {
  private currentProfile: UserProfile | null = null;
  private isOnline: boolean = true;

  async initialize(): Promise<UserProfile> {
    try {
      // Try to sync with Supabase first if user is authenticated
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data.user;
      
      if (user) {
        try {
          // Fetch profile from Supabase
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error && profile) {
            const supabaseProfile: UserProfile = {
              id: profile.id,
              name: profile.full_name || 'User',
              email: user.email || undefined,
              phone: profile.phone || undefined,
              profilePicture: profile.avatar_url || undefined,
              preferences: profile.preferences || defaultPreferences,
              createdAt: profile.created_at,
              updatedAt: profile.updated_at,
            };

            // Save to local storage for offline access
            await saveUserProfile(supabaseProfile);
            this.currentProfile = supabaseProfile;
            this.isOnline = true;
            return supabaseProfile;
          }
        } catch (supabaseError) {
          console.warn('Supabase sync failed, using local storage:', supabaseError);
          this.isOnline = false;
        }
      }

      // Fallback to local storage
      let profile = await getUserProfile();

      if (!profile) {
        // Create default profile
        const now = new Date().toISOString();
        const defaultProfile: UserProfile = {
          id: user?.id || 'local-user',
          name: 'User',
          email: user?.email || undefined,
          phone: undefined,
          profilePicture: undefined,
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

  async updateProfilePicture(imageUri: string): Promise<void> {
    try {
      if (!this.currentProfile) {
        await this.initialize();
      }

      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data.user;
      
      if (user && this.isOnline) {
        try {
          // Upload to Supabase Storage
          const formData = new FormData();
          const filename = `avatar-${user.id}-${Date.now()}.jpg`;
          
          formData.append('file', {
            uri: imageUri,
            type: 'image/jpeg',
            name: filename,
          } as any);

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filename, formData);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filename);

          // Update profile in Supabase
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              avatar_url: publicUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) throw updateError;

          // Update local storage with Supabase URL
          const updated = {
            ...this.currentProfile!,
            profilePicture: publicUrl,
            updatedAt: new Date().toISOString(),
          };

          await saveUserProfile(updated);
          this.currentProfile = updated;
          return;

        } catch (supabaseError) {
          console.warn('Supabase upload failed, using local storage:', supabaseError);
          this.isOnline = false;
        }
      }

      // Fallback to local storage
      const fileName = `profile-picture-${Date.now()}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.copyAsync({
        from: imageUri,
        to: permanentUri
      });

      const updated = {
        ...this.currentProfile!,
        profilePicture: permanentUri,
        updatedAt: new Date().toISOString(),
      };

      await saveUserProfile(updated);
      this.currentProfile = updated;

    } catch (error) {
      console.error('Error updating profile picture:', error);
      throw error;
    }
  }

  async removeProfilePicture(): Promise<void> {
    try {
      if (!this.currentProfile) {
        await this.initialize();
      }

      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data.user;
      
      if (user && this.isOnline) {
        try {
          // Remove from Supabase
          await supabase
            .from('profiles')
            .update({ 
              avatar_url: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        } catch (supabaseError) {
          console.warn('Supabase update failed:', supabaseError);
          this.isOnline = false;
        }
      }

      // Delete local file if it exists and is a local file
      if (
        this.currentProfile?.profilePicture &&
        typeof this.currentProfile.profilePicture === "string" &&
        this.currentProfile.profilePicture.startsWith(FileSystem.documentDirectory!)
      ) {
        try {
          await FileSystem.deleteAsync(this.currentProfile.profilePicture);
        } catch (fileError) {
          console.warn('Error deleting profile picture file:', fileError);
        }
      }

      const updated = {
        ...this.currentProfile!,
        profilePicture: undefined,
        updatedAt: new Date().toISOString(),
      };
      
      await saveUserProfile(updated);
      this.currentProfile = updated;
    } catch (error) {
      console.error('Error removing profile picture:', error);
      throw error;
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.currentProfile) {
      await this.initialize();
    }

    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;
    
    if (user && this.isOnline) {
      try {
        // Update in Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ 
            preferences: { ...this.currentProfile!.preferences, ...preferences },
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) throw error;
      } catch (supabaseError) {
        console.warn('Supabase update failed, using local storage:', supabaseError);
        this.isOnline = false;
      }
    }

    // Update local storage
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

    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;
    
    if (user && this.isOnline) {
      try {
        // Update in Supabase
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (profile.name) updateData.full_name = profile.name;
        if (profile.phone) updateData.phone = profile.phone;
        if (profile.email && user.email !== profile.email) {
          // Note: Changing email requires auth update
          console.warn('Email changes require auth update');
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);

        if (error) throw error;
      } catch (supabaseError) {
        console.warn('Supabase update failed, using local storage:', supabaseError);
        this.isOnline = false;
      }
    }

    // Update local storage
    const updated = {
      ...this.currentProfile!,
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    
    await saveUserProfile(updated);
    this.currentProfile = updated;
  }

  async syncWithSupabase(): Promise<void> {
    try {
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data.user;
      
      if (!user) {
        console.log('No user logged in, skipping sync');
        return;
      }

      if (!this.currentProfile) {
        await this.initialize();
      }

      // Check if Supabase profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
        throw fetchError;
      }

      if (existingProfile) {
        // Supabase has newer data? Compare timestamps
        const localUpdated = new Date(this.currentProfile!.updatedAt);
        const supabaseUpdated = new Date(existingProfile.updated_at);
        
        if (supabaseUpdated > localUpdated) {
          // Supabase has newer data, update local
          const updatedProfile: UserProfile = {
            id: existingProfile.id,
            name: existingProfile.full_name || this.currentProfile!.name,
            email: user.email || this.currentProfile!.email,
            phone: existingProfile.phone || this.currentProfile!.phone,
            profilePicture: existingProfile.avatar_url || this.currentProfile!.profilePicture,
            preferences: existingProfile.preferences || this.currentProfile!.preferences,
            createdAt: existingProfile.created_at,
            updatedAt: existingProfile.updated_at,
          };
          
          await saveUserProfile(updatedProfile);
          this.currentProfile = updatedProfile;
        } else if (localUpdated > supabaseUpdated) {
          // Local has newer data, update Supabase
          await this.updateProfileToSupabase();
        }
      } else {
        // No Supabase profile exists, create one
        await this.updateProfileToSupabase();
      }

      this.isOnline = true;
      console.log('Settings sync completed');
      
    } catch (error) {
      console.error('Error syncing with Supabase:', error);
      this.isOnline = false;
    }
  }

  private async updateProfileToSupabase(): Promise<void> {
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;
    
    if (!user || !this.currentProfile) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: this.currentProfile.name,
        phone: this.currentProfile.phone,
        avatar_url: this.currentProfile.profilePicture,
        preferences: this.currentProfile.preferences,
        created_at: this.currentProfile.createdAt,
        updated_at: this.currentProfile.updatedAt,
      });

    if (error) throw error;
  }

  // Check if user is authenticated and online
  async isUserAuthenticated(): Promise<boolean> {
    const userResponse = await supabase.auth.getUser();
    return !!userResponse.data.user;
  }

  async getSyncStatus(): Promise<{ isOnline: boolean; isAuthenticated: boolean }> {
    const userResponse = await supabase.auth.getUser();
    return {
      isOnline: this.isOnline,
      isAuthenticated: !!userResponse.data.user
    };
  }

  // Keep all your existing methods below unchanged...
  async verifyProfilePicture(): Promise<string | undefined> {
    if (!this.currentProfile?.profilePicture) {
      return undefined;
    }

    // Check if it's a Supabase URL (starts with http) or local file
    if (this.currentProfile.profilePicture.startsWith('http')) {
      // For Supabase URLs, we assume they're valid
      return this.currentProfile.profilePicture;
    } else {
      // For local files, verify they exist
      try {
        const fileInfo = await FileSystem.getInfoAsync(this.currentProfile.profilePicture);
        if (fileInfo.exists) {
          return this.currentProfile.profilePicture;
        } else {
          await this.removeProfilePicture();
          return undefined;
        }
      } catch (error) {
        console.error('Error verifying profile picture:', error);
        return undefined;
      }
    }
  }

  async getPreferences(): Promise<UserPreferences> {
    if (!this.currentProfile) {
      await this.initialize();
    }
    return this.currentProfile!.preferences;
  }

  async getProfilePicture(): Promise<string | undefined> {
    if (!this.currentProfile) {
      await this.initialize();
    }
    return await this.verifyProfilePicture();
  }

  async getProfile(): Promise<UserProfile> {
    if (!this.currentProfile) {
      await this.initialize();
    }
    
    // Verify profile picture exists before returning
    const verifiedProfilePicture = await this.verifyProfilePicture();
    if (verifiedProfilePicture !== this.currentProfile!.profilePicture) {
      this.currentProfile!.profilePicture = verifiedProfilePicture;
    }
    
    return this.currentProfile!;
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

  hasProfilePicture(): boolean {
    return !!this.currentProfile?.profilePicture;
  }

 /* clearCache(): void {
    this.currentProfile = null;
    this.isOnline = true;
  }*/

 async clearCache(): Promise<void> {
  try {
    // Save profile picture path before clearing
    const profilePicturePath = this.currentProfile?.profilePicture;
    
    // Clear persistent storage
    await AsyncStorage.removeItem('userProfile');
    
    // Delete local profile picture file if exists
    if (
      profilePicturePath &&
      typeof profilePicturePath === "string" &&
      profilePicturePath.startsWith(FileSystem.documentDirectory!)
    ) {
      try {
        await FileSystem.deleteAsync(profilePicturePath);
      } catch (fileError) {
        console.warn('Error deleting profile picture file:', fileError);
      }
    }
    
    // Clear in-memory cache
    this.currentProfile = null;
    this.isOnline = true;
    
    console.log('All user data cleared successfully');
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
}
}

export const settingsService = new SettingsService();