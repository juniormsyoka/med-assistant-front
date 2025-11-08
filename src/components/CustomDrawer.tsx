// components/CustomDrawer.tsx - Updated with proper navigation
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';

const CustomDrawer = (props: DrawerContentComponentProps) => {
  const { colors } = useTheme();
  const { state, navigation } = props;
  const { user, hasRole, logout } = useAuth();

  // Base menu items for all users
  const baseMenuItems = [
    { name: 'Home', icon: 'home', label: 'Dashboard', roles: ['patient', 'doctor', 'admin', 'super_admin'] },
    { name: 'Refill', icon: 'refresh-circle', label: 'Medication Refill', roles: ['patient'] },
    { name: 'Diagnosis', icon: 'medkit', label: 'Health Check', roles: ['patient'] },
    { name: 'Chat', icon: 'chatbubble-ellipses', label: 'Get Assistance', roles: ['patient', 'doctor'] },
    { name: 'Analytics', icon: 'stats-chart', label: 'Health Analytics', roles: ['patient'] },
  ];

  // Admin-specific menu items
  const adminMenuItems = [
    { name: 'Admin', icon: 'shield-checkmark', label: 'Admin Panel', roles: ['admin'] },
  ];

  // Super Admin-specific menu items
  const superAdminMenuItems = [
    { name: 'SuperAdmin', icon: 'shield', label: 'Super Admin', roles: ['super_admin'] },
  ];

  // Doctor-specific menu items
  const doctorMenuItems = [
    { name: 'DoctorDashboard', icon: 'medical', label: 'Doctor Dashboard', roles: ['doctor'] },
  ];

  // Auth menu items - Updated to use proper navigation
  const authMenuItems = [
    { name: 'Auth', icon: 'person-add', label: 'Authentication', roles: [] }, // Changed from PatientAuth to Auth
    { name: 'Settings', icon: 'settings', label: 'Settings', roles: ['patient', 'doctor', 'admin', 'super_admin'] },
  ];

  // Combine all menu items based on user role
  const getAllMenuItems = () => {
    if (!user) {
      // Not logged in - show only auth items
      return authMenuItems.filter(item => item.name === 'Auth');
    }

    const allItems = [
      ...baseMenuItems,
      ...adminMenuItems,
      ...superAdminMenuItems,
      ...doctorMenuItems,
      ...authMenuItems,
    ];

    return allItems.filter(item => 
      item.roles.length === 0 || // Always show items with no role restriction
      (user && item.roles.includes(user.role))
    );
  };

  const menuItems = getAllMenuItems();

  // Add this helper function
  const getRoleDisplay = (role: string): string => {
    const roleDisplayMap: Record<string, string> = {
      'super_admin': 'Super Administrator',
      'admin': 'Hospital Administrator',
      'doctor': 'Doctor',
      'patient': 'Patient'
    };
    
    return roleDisplayMap[role] || role;
  };

  const getUserDisplayInfo = () => {
    if (!user) {
      return { name: 'Guest', role: 'Please sign in' };
    }
    
    return {
      name: user.full_name || user.email,
      role: getRoleDisplay(user.role)
    };
  };

  const userInfo = getUserDisplayInfo();

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will be handled by auth state change
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Helper function to handle navigation properly
  const handleNavigation = (itemName: string) => {
    // For Auth stack, navigate to the Auth stack (which will show PatientAuth by default)
    if (itemName === 'Auth') {
      navigation.navigate('Auth' as any);
    } else {
      navigation.navigate(itemName as any);
    }
  };

  // Check if a menu item is active
  const isItemActive = (itemName: string) => {
    const currentRoute = state.routes[state.index];
    
    // Special case for Auth stack - check if we're in any Auth screen
    if (itemName === 'Auth' && currentRoute?.name === 'Auth') {
      return true;
    }
    
    return currentRoute?.name === itemName;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4361EE', '#3A56E4']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatar}>
            <Ionicons 
              name={user ? "person" : "medical"} 
              size={32} 
              color="#4361EE" 
            />
          </View>
          <Text style={styles.appName}>MedAssistant</Text>
          <Text style={styles.userName}>{userInfo.name}</Text>
          <Text style={styles.userRole}>{userInfo.role}</Text>
        </View>
      </LinearGradient>

      <DrawerContentScrollView 
        {...props}
        contentContainerStyle={styles.drawerContent}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.map((item) => {
          const isFocused = isItemActive(item.name);
          
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.menuItem,
                isFocused && { backgroundColor: colors.primary + '15' }
              ]}
              onPress={() => handleNavigation(item.name)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={isFocused ? colors.primary : colors.text}
                  style={styles.menuIcon}
                />
                <Text
                  style={[
                    styles.menuText,
                    { color: isFocused ? colors.primary : colors.text }
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              
              {isFocused && (
                <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.version, { color: colors.text }]}>
          MedTrack v1.1.5
        </Text>
        {user && (
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={16} color="#FF6B6B" />
            <Text style={[styles.logoutText, { color: '#FF6B6B' }]}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  drawerContent: {
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 12,
    width: 24,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  version: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default CustomDrawer;