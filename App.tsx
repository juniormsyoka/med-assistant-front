// App.tsx
import React, { useEffect, useState, useRef } from "react";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator, Alert, BackHandler } from "react-native";

import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

import { initDatabase, getMedications, resetMessagesTable } from "./src/Services/storage";
import { NotificationService } from "./src/Services/notifications";
import { settingsService } from "./src/Services/Settings";
import { RESET_TASK } from "./src/Services/resetTasks";

import HomeScreen from "./src/screens/HomeScreen";
import AddMedScreen from "./src/screens/AddMedScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import DiagnosisScreen from "./src/screens/DiagnosisScreen";
import AddAppointmentScreen from "./src/screens/AddAppointmentScreen";
import RefillManagementScreen from "./src/screens/RefillManagementScreen";

import PatientAuthScreen from "./src/screens/PatientAuth";
import ChatScreen from "./src/screens/ChatScreen";
import ChatRoom from "./src/screens/ChatRoom";
import DoctorDashboard from "./src/screens/doctor/DoctorDashboard";
import OnboardingScreen from "./src/screens/OnboardingScreen";

import DoctorInvitesignup from "./src/screens/auth/DoctorInviteSignUp";
import VerifyPatientsScreen from "./src/screens/doctor/VerifyPatientsScreen";

import PatientAppointmentsScreen from "./src/screens/PatientAppointmentsScreen";

// Super Admin Screens
import SuperAdminDashboard from "./src/screens/superAdmin/SuperAdminDashboard";
import HospitalManagement from "./src/screens/superAdmin/HospitalManagement";
import VerifyAdminsScreen from "./src/screens/superAdmin/VerifyAdminsScreen";

// Admin Screens
import AdminDashboard from "./src/screens/admin/AdminDashboard";
import PatientAssignments from "./src/screens/admin/PatientAssignments";
import DoctorManagement from "./src/screens/admin/DoctorManagement";
import DoctorInvitationList from "./src/screens/admin/DoctorInvitationList";
import VerifyDoctorScreen from "./src/screens/admin/VerifyDoctorScreen";
import InviteDoctorScreen from "./src/screens/admin/InviteDoctorScreen";

import { AuthStackParamList, ChatStackParamList } from "./src/types/navigation";

import { Themes } from "./src/themes/theme";
import { ThemeProvider, useAppTheme } from "./src/contexts/ThemeContext";
import { FeedbackProvider } from "./src/contexts/FeedbackContext";
import CustomDrawer from "./src/components/CustomDrawer";
import AnimatedFloatingButton from "./src/components/AnimatedFloatingButton";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";

import DoctorChatList from "./src/components/DoctorChatList";

import Toast from 'react-native-toast-message';
import { toastConfig } from './src/config/toastConfig';

import { AnalyticsProvider } from './src/contexts/AnalyticsContext';

import { ReminderPanel } from './src/components/homescreen/ReminderPanel';
import { PastMedicationListener } from './src/components/homescreen/PastMedicationListener';
import { MedicationActionService } from './src/Services/centalizedMedicalStatus/MedicationActionService';
import { useMedicationStore } from './src/stores/medicationStore';

import 'react-native-get-random-values';

import * as Linking from "expo-linking";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// Define the root param list type for proper typing
type RootParamList = {
  Home: undefined;
  Auth: undefined;
  Admin: undefined;
  SuperAdmin: undefined;
  Doctor: undefined;
  Chat: undefined;
  Settings: undefined;
  Refill: undefined;
  Diagnosis: undefined;
  Analytics: undefined;
  Onboarding: undefined;
  PatientAppointments: undefined;
};

const linking: LinkingOptions<RootParamList> = {
  prefixes: [Linking.createURL("/"), "medassistant://"],
  config: {
    screens: {
      Auth: {
        path: "auth",
      },
      Home: "home",
      Settings: "settings",
      Refill: "refill",
      Diagnosis: "diagnosis",
      Analytics: "analytics",
      Onboarding: "onboarding",
      Admin: "admin",
      Doctor: "doctor",
      SuperAdmin: "superadmin",
      Chat: "chat",
      PatientAppointments: "appointments",
    },
  },
};

// Drawer context
const DrawerContext = React.createContext({
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
});

function AppContent() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const { theme, setTheme } = useAppTheme();
  const { user } = useAuth();
  const [medications, setMedications] = useState<any[]>([]);
  const medsRef = useRef<any[]>([]);
  const navigationRef = useRef<any>(null);

  const [panelVisible, setPanelVisible] = useState(false);
  const [panelMedication, setPanelMedication] = useState<any | null>(null);
  const [panelScheduledTime, setPanelScheduledTime] = useState<Date | null>(null);

  // Get store refresh function
  const refreshStore = useMedicationStore(state => state.refresh);

  const openPastMedicationPanel = ({ medication, scheduledTime }: any) => {
    setPanelMedication(medication);
    setPanelScheduledTime(scheduledTime);
    setPanelVisible(true);
  };

  // register background reset task
  const registerResetTask = async () => {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(RESET_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(RESET_TASK, {
          minimumInterval: 60 * 60 * 24,
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log("✅ Reset task registered");
      }
    } catch (err) {
      console.error("❌ Failed to register reset task:", err);
    }
  };

  // back handler
  useEffect(() => {
    const backAction = () => {
      Alert.alert("Exit MedTrack", "Are you sure you want to exit the app?", [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  // init DB, notifications, settings
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDatabase();
        await resetMessagesTable();
        
        // Configure notifications using NotificationService
        await NotificationService.configureNotificationHandler();
        const granted = await NotificationService.requestPermissions();
        if (!granted) {
          Alert.alert("Notifications Disabled", "⚠️ Please enable notifications in settings to receive medication reminders.");
        }
        
        const userProfile = await settingsService.initialize();
        const selectedTheme =
          Themes.find((t) => t.name === userProfile.preferences.theme) || Themes[0];
        setTheme(selectedTheme);

        // Clear and reschedule notifications
        await Notifications.cancelAllScheduledNotificationsAsync();
        const meds = await getMedications();
        setMedications(meds);
        medsRef.current = meds;

        // Schedule reminders for enabled medications
        for (const med of meds) {
          if (med.enabled) {
            await NotificationService.scheduleMedicationReminder(med);
          }
        }
        
        await registerResetTask();
        setDbInitialized(true);
      } catch (error) {
        console.error("❌ Initialization error:", error);
      }
    };
    initializeApp();
  }, []);

  const drawerControls = {
    openDrawer: () => navigationRef.current?.dispatch({ type: "OPEN_DRAWER" }),
    closeDrawer: () => navigationRef.current?.dispatch({ type: "CLOSE_DRAWER" }),
    toggleDrawer: () => navigationRef.current?.dispatch({ type: "TOGGLE_DRAWER" }),
  };

  if (!dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4361EE" />
      </View>
    );
  }

  // Small wrapper to include FAB
  const ScreenWithFAB = ({ component: Component, ...props }: any) => (
    <View style={{ flex: 1 }}>
      <Component {...props} />
      <AnimatedFloatingButton onPress={drawerControls.toggleDrawer} />
    </View>
  );

  // Reusable stack for home and related screens
  const HomeStack = createNativeStackNavigator();
  const HomeStackScreen = ({ medications, medsRef }: any) => (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen
        name="HomeMain"
        children={(props) => (
          <View style={{ flex: 1 }}>
            <HomeScreen {...props} />
            <AnimatedFloatingButton onPress={drawerControls.toggleDrawer} />
          </View>
        )}
      />
      <HomeStack.Screen name="Add" component={AddMedScreen} />
      <HomeStack.Screen name="AddAppointment" component={AddAppointmentScreen} />
      <HomeStack.Screen name="PatientAppointments" component={PatientAppointmentsScreen} />
    </HomeStack.Navigator>
  );

  // Stack for Refill flow
  const RefillStack = createNativeStackNavigator();
  const RefillStackScreen = ({ medications, medsRef }: any) => (
    <RefillStack.Navigator screenOptions={{ headerShown: false }}>
      <RefillStack.Screen
        name="RefillMain"
        children={(props) => (
          <View style={{ flex: 1 }}>
            <RefillManagementScreen {...props} medications={medications} medsRef={medsRef} />
            <AnimatedFloatingButton onPress={drawerControls.toggleDrawer} />
          </View>
        )}
      />
      <RefillStack.Screen name="Add" component={AddMedScreen} />
    </RefillStack.Navigator>
  );

  // Chat Stack - Updated to use ChatScreen (conditional doctor/patient view)
  const ChatStack = createNativeStackNavigator<ChatStackParamList>();
  const ChatStackScreen = () => (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatLauncher" component={ChatScreen} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoom} />
      <ChatStack.Screen name="DoctorDashboard" component={DoctorDashboard} />
    </ChatStack.Navigator>
  );

  // Super Admin Stack
  type SuperAdminStackParamList = {
    SuperAdminDashboard: undefined;
    HospitalManagement: undefined;
    AdminManagement: undefined;
    PlatformAnalytics: undefined;
    VerifyAdmins: undefined;
    SystemSettings: undefined;
  };

  const SuperAdminStack = createNativeStackNavigator<SuperAdminStackParamList>();

  const SuperAdminStackScreen = () => (
    <SuperAdminStack.Navigator screenOptions={{ headerShown: false }}>
      <SuperAdminStack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
      <SuperAdminStack.Screen name="HospitalManagement" component={HospitalManagement} />
      <SuperAdminStack.Screen name="VerifyAdmins" component={VerifyAdminsScreen} />
    </SuperAdminStack.Navigator>
  );

  // Admin Stack
  type AdminStackParamList = {
    AdminDashboard: undefined;
    DoctorManagement: undefined;
    PatientAssignments: undefined;
    DoctorInvitations: undefined;
    VerifyDoctors: undefined;
    InviteDoctor: undefined;
    AppointmentManagement: undefined;
  };

  const AdminStack = createNativeStackNavigator<AdminStackParamList>();

  const AdminStackScreen = () => (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminDashboard" component={AdminDashboard} />
      <AdminStack.Screen name="DoctorManagement" component={DoctorManagement} />
      <AdminStack.Screen name="PatientAssignments" component={PatientAssignments} />
      <AdminStack.Screen name="DoctorInvitations" component={DoctorInvitationList} />
      <AdminStack.Screen name="VerifyDoctors" component={VerifyDoctorScreen} />
      <AdminStack.Screen name="InviteDoctor" component={InviteDoctorScreen} />
    </AdminStack.Navigator>
  );

  // Doctor Stack
  type DoctorStackParamList = {
    DoctorDashboard: undefined;
    PatientDetail: { patientId: string };
    ChatRoom: {
      mode: 'doctor';
      adapter: string;
      conversationId: string;
      userRole: string;
      userId: string;
      patientId: string;
      patientName: string;
      assignedDoctorId?: string;
    };
    AppointmentSchedule: undefined;
    DoctorChatList: undefined;
    AddAppointment: undefined;
    VerifyPatients: undefined;
  };

  const DoctorStack = createNativeStackNavigator<DoctorStackParamList>();

  const DoctorStackScreen = () => (
    <DoctorStack.Navigator screenOptions={{ headerShown: false }}>
      <DoctorStack.Screen name="DoctorDashboard" component={DoctorDashboard} />
      <DoctorStack.Screen 
        name="ChatRoom" 
        component={ChatRoom} 
        options={{ 
          headerShown: true, 
          title: 'Chat with Patient',
          headerBackTitle: 'Back' 
        }}
      />
      <DoctorStack.Screen name="DoctorChatList" component={DoctorChatList} />
      <DoctorStack.Screen 
        name="AddAppointment" 
        component={AddAppointmentScreen}
        options={{
          headerShown: true,
          title: 'Schedule Appointment',
          headerBackTitle: 'Back'
        }}
      />
      <DoctorStack.Screen 
        name="VerifyPatients" 
        component={VerifyPatientsScreen} 
        options={{ 
          headerShown: true, 
          title: 'Verify Patients',
          headerBackTitle: 'Back' 
        }}
      />
    </DoctorStack.Navigator>
  );

  // Auth Stack
  const AuthStack = createNativeStackNavigator<AuthStackParamList>();

  const AuthStackScreen = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="PatientAuth" component={PatientAuthScreen} />
      <AuthStack.Screen name="DoctorInviteSignup" component={DoctorInvitesignup} />
    </AuthStack.Navigator>
  );

  // Conditionally render drawer items based on user role
  const getDrawerScreens = () => {
    const baseScreens = [
      // Common screens for all authenticated users
      <Drawer.Screen
        key="Home"
        name="Home"
        options={{
          drawerLabel: "Dashboard",
          drawerIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      >
        {(props) => <HomeStackScreen {...props} medications={medications} medsRef={medsRef} />}
      </Drawer.Screen>,

      <Drawer.Screen
        key="Settings"
        name="Settings"
        options={{
          drawerLabel: "Settings",
          drawerIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      >
        {(props) => <ScreenWithFAB component={SettingsScreen} {...props} />}
      </Drawer.Screen>
    ];

    if (!user) {
      return [
        ...baseScreens,
        <Drawer.Screen
          key="Auth"
          name="Auth"
          component={AuthStackScreen}
          options={{
            drawerLabel: "Authentication",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="person-add" size={size} color={color} />
            ),
          }}
        />
      ];
    }

    const roleSpecificScreens = [];

    // Patient-specific screens
    if (user.role === 'patient') {
      roleSpecificScreens.push(
        <Drawer.Screen
          key="Refill"
          name="Refill"
          options={{
            drawerLabel: "Medication Refill",
            drawerIcon: ({ color, size }) => <Ionicons name="refresh-circle" size={size} color={color} />,
          }}
        >
          {(props) => <RefillStackScreen {...props} medications={medications} medsRef={medsRef} />}
        </Drawer.Screen>,

        <Drawer.Screen
          key="Diagnosis"
          name="Diagnosis"
          options={{
            drawerLabel: "Health Check",
            drawerIcon: ({ color, size }) => <Ionicons name="medkit" size={size} color={color} />,
          }}
        >
          {(props) => <ScreenWithFAB component={DiagnosisScreen} {...props} />}
        </Drawer.Screen>,

        <Drawer.Screen
          key="Chat"
          name="Chat"
          options={{
            drawerLabel: "Get Assistance",
            drawerIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
          }}
        >
          {(props) => <ScreenWithFAB component={ChatStackScreen} {...props} />}
        </Drawer.Screen>,

        <Drawer.Screen
          key="Analytics"
          name="Analytics"
          options={{
            drawerLabel: "Health Analytics",
            drawerIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
          }}
        >
          {(props) => <ScreenWithFAB component={AnalyticsScreen} {...props} />}
        </Drawer.Screen>,

        <Drawer.Screen
          key="Onboarding"
          name="Onboarding"
          options={{
            drawerLabel: "Complete Profile",
            drawerIcon: ({ color, size }) => <Ionicons name="walk" size={size} color={color} />,
          }}
        >
          {(props) => <ScreenWithFAB component={OnboardingScreen} {...props} />}
        </Drawer.Screen>,

        <Drawer.Screen
          key="PatientAppointments"
          name="PatientAppointments"
          options={{
            drawerLabel: "My Appointments",
            drawerIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          }}
        >
          {(props) => <ScreenWithFAB component={PatientAppointmentsScreen} {...props} />}
        </Drawer.Screen>
      );
    }

    // Doctor-specific screens
    if (user.role === 'doctor') {
      roleSpecificScreens.push(
        <Drawer.Screen
          key="DoctorDashboard"
          name="DoctorDashboard"
          options={{
            drawerLabel: "Doctor Dashboard",
            drawerIcon: ({ color, size }) => <Ionicons name="medical" size={size} color={color} />,
          }}
        >
          {(props) => <ScreenWithFAB component={DoctorStackScreen} {...props} />}
        </Drawer.Screen>,

        <Drawer.Screen
          key="Chat"
          name="Chat"
          options={{
            drawerLabel: "Patient Chats",
            drawerIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
          }}
        >
          {(props) => <ScreenWithFAB component={ChatStackScreen} {...props} />}
        </Drawer.Screen>
      );
    }

    // Admin-specific screens
    if (user.role === 'admin') {
      roleSpecificScreens.push(
        <Drawer.Screen
          key="Admin"
          name="Admin"
          options={{
            drawerLabel: "Admin Panel",
            drawerIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
          }}
        >
          {(props) => <ScreenWithFAB component={AdminStackScreen} {...props} />}
        </Drawer.Screen>
      );
    }

    // Super Admin-specific screens
    if (user.role === 'super_admin') {
      roleSpecificScreens.push(
        <Drawer.Screen
          key="SuperAdmin"
          name="SuperAdmin"
          options={{
            drawerLabel: "Super Admin",
            drawerIcon: ({ color, size }) => <Ionicons name="shield" size={size} color={color} />,
          }}
        >
          {(props) => <ScreenWithFAB component={SuperAdminStackScreen} {...props} />}
        </Drawer.Screen>
      );
    }

    return [...baseScreens, ...roleSpecificScreens];
  };

  // Handler for past medication actions
  const handlePastMedicationAction = async (
    actionType: "take" | "miss" | "snooze",
    minutes?: number
  ) => {
    if (!panelMedication) return;

    try {
      const result = await MedicationActionService.handleAction(
        panelMedication,
        actionType,
        minutes ? { minutes } : {}
      );

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: result.message || 'Action completed',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: result.message || 'Action failed',
        });
      }
      
      // Refresh store to update UI
      await refreshStore();
    } catch (error) {
      console.error('❌ Past medication action failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to record action',
      });
    }
  };

  return (
    <DrawerContext.Provider value={drawerControls}>
      <NavigationContainer theme={theme} ref={navigationRef} linking={linking}>
        <Drawer.Navigator
          drawerContent={(props) => <CustomDrawer {...props} />}
          screenOptions={{
            headerShown: false,
            drawerStyle: { width: 280 },
            drawerType: "slide",
            overlayColor: "rgba(0,0,0,0.3)",
            swipeEnabled: false,
          }}
        >
          {getDrawerScreens()}
        </Drawer.Navigator>
      </NavigationContainer>

      {/* 🔔 LISTENS FOR PAST MED EVENTS */}
      <PastMedicationListener onOpenPanel={openPastMedicationPanel} />

      {/* ⬆️ GLOBAL REMINDER PANEL */}
      <ReminderPanel
        visible={panelVisible}
        medication={panelMedication}
        onClose={() => setPanelVisible(false)}
        onTaken={async () => {
          await handlePastMedicationAction("take");
          setPanelVisible(false);
        }}
        onMissed={async () => {
          await handlePastMedicationAction("miss");
          setPanelVisible(false);
        }}
        onSnooze={async (minutes: number) => {
          await handlePastMedicationAction("snooze", minutes);
          setPanelVisible(false);
        }}
      />
      
      <Toast config={toastConfig} />
    </DrawerContext.Provider>
  );
}

// Root with providers
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeedbackProvider>
          <AnalyticsProvider>
            <AppContent />
          </AnalyticsProvider>
        </FeedbackProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}