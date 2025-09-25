import React, { useEffect, useState, createContext, useContext, useRef } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

import { initDatabase, getMedications } from './src/Services/storage';
import { requestPermissions, scheduleMedicationReminder } from './src/Services/notifications';
import { settingsService } from './src/Services/Settings';
import { RESET_TASK } from "./src/Services/resetTasks"; // ✅ import our defined task

import HomeScreen from './src/screens/HomeScreen';
import AddMedScreen from './src/screens/AddMedScreen';
import ChatScreen from './src/screens/ChatScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// --- Theme Context ---
type ThemeType = 'light' | 'dark' | 'system';
export const ThemeContext = createContext<{
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
}>({ theme: 'system', setTheme: () => {} });
export const useAppTheme = () => useContext(ThemeContext);

const Tab = createBottomTabNavigator();

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('system');
  const [medications, setMedications] = useState<any[]>([]);
  const medsRef = useRef<any[]>([]);

  const systemTheme = useColorScheme();
  const appTheme =
    theme === 'system'
      ? systemTheme === 'dark'
        ? DarkTheme
        : DefaultTheme
      : theme === 'dark'
      ? DarkTheme
      : DefaultTheme;

  // ✅ Background reset registration
  async function registerResetTask() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(RESET_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(RESET_TASK, {
          minimumInterval: 60 * 60 * 24, // run ~once per 24h
          stopOnTerminate: false, // Android: continue after app is killed
          startOnBoot: true, // Android: continue after device restart
        });
        console.log("✅ Reset task registered");
      } else {
        console.log("ℹ️ Reset task already registered");
      }
    } catch (err) {
      console.error("❌ Failed to register reset task:", err);
    }
  }

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDatabase();

        const granted = await requestPermissions();
        if (!granted) {
          alert('⚠️ Please enable notifications in settings to receive medication reminders.');
        }

        const prefs = await settingsService.getPreferences();
        setTheme(prefs.theme ?? 'system');

        // Cancel all old notifications
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Load medications and schedule reminders
        const meds = await getMedications();
        setMedications(meds);
        medsRef.current = meds;

        for (const med of meds) {
          if (med.enabled) {
            await scheduleMedicationReminder(med);
          }
        }

        // ✅ Register reset background task after DB + meds loaded
        await registerResetTask();

        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  if (!dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4361EE" />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <NavigationContainer theme={appTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'home';
              if (route.name === 'Home') iconName = 'home';
              else if (route.name === 'Add') iconName = 'add-circle';
              else if (route.name === 'Chat') iconName = 'chatbubble';
              else if (route.name === 'Analytics') iconName = 'stats-chart';
              else if (route.name === 'Settings') iconName = 'settings';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#4361EE',
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
          })}
        >
          <Tab.Screen name="Home">
            {(props) => <HomeScreen {...props} medications={medications} medsRef={medsRef} />}
          </Tab.Screen>
          <Tab.Screen name="Add" component={AddMedScreen} />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="Analytics" component={AnalyticsScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}
