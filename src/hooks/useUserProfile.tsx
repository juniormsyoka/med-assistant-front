// hooks/useUserProfile.ts
import { useEffect, useState } from "react";
import { settingsService } from "../Services/Settings";
import { UserProfile } from "../models/User"; // Import your full UserProfile type

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await settingsService.initialize();
        
        setProfile(data);
      } catch (err) {
        console.error('useUserProfile: Error loading profile:', err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  return { profile, loading, error };
};