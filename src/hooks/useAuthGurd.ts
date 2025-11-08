import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getCurrentSession, getUserRole } from '@/Services/authService';
import { Alert } from 'react-native';

type UserRole = 'super_admin' | 'admin' | 'doctor' | 'patient';

export const useAuthGuard = (requiredRole?: UserRole) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const session = await getCurrentSession();
      
      if (!session) {
        navigation.navigate('PatientAuth' as never);
        return;
      }

      const userRole = await getUserRole();
      
      if (requiredRole && userRole !== requiredRole) {
        Alert.alert('Access Denied', 'You do not have permission to access this page.');
        navigation.goBack();
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error('Auth guard error:', error);
      navigation.navigate('PatientAuth' as never);
    } finally {
      setLoading(false);
    }
  };

  return { isAuthorized, loading };
};