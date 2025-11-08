// src/hooks/useRoleNavigation.ts
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getUserRole } from '@/Services/authService';

export const useRoleNavigation = () => {
  const navigation = useNavigation();

  const navigateByRole = async () => {
    try {
      const role = await getUserRole();
      
      switch (role) {
        case 'super_admin':
          navigation.navigate('SuperAdmin' as never);
          break;
        case 'admin':
          navigation.navigate('Admin' as never);
          break;
        case 'doctor':
          navigation.navigate('DoctorDashboard' as never);
          break;
        case 'patient':
            navigation.navigate('Home' as never);
          //navigation.navigate('HomeScreen' as never);
          break;
        default:
          navigation.navigate('Onboarding' as never);
      }
    } catch (error) {
      console.error('Error navigating by role:', error);
      navigation.navigate('Onboarding' as never);
    }
  };

  return { navigateByRole };
};