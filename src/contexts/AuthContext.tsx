// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole } from '@/types/auth';
import { fetchUserProfile, signOutUser } from '@/Services/authService';
import { supabase } from '@/Services/supabaseClient';
import { toast } from '@/Services/toastService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsService } from '../Services/Settings';
interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkCurrentUser();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await fetchUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      await signOutUser();
    }
  };

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      console.log('🔄 Starting logout process...');
      
      // 1. Clear user data from settings/preferences
      try {
        await settingsService.clearCache();
        console.log('✅ Cleared user data from settings');
      } catch (error) {
        console.error('Error clearing settings data:', error);
      }
      
      // 2. Clear AsyncStorage user-specific data
      try {
        await AsyncStorage.multiRemove([
          '@user_profile',
          '@user_preferences', // Your settings might be using different keys
          '@compliance_records', // If you want to clear compliance data too
          '@reminder_schedules',
          '@last_user_id',
          // Add any other user-specific keys
        ]);
        console.log('✅ Cleared AsyncStorage user data');
      } catch (error) {
        console.error('Error clearing AsyncStorage:', error);
      }
      
      // 3. Sign out from Supabase
      await signOutUser();
      console.log('✅ Signed out from Supabase');
      
      // 4. Clear local state
      setUser(null);
      toast.success('Logged out successfully');
      console.log('✅ Logout completed successfully');
    } catch (error) {
      toast.error('Logout failed. Please try again.');
      console.error('❌ Logout error:', error);
      // Still clear local state even if there's an error
      setUser(null);
      throw error;
    }
  
  };

  const hasRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const refreshUser = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      hasRole, 
      isLoading,
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};