import React, { useRef, useEffect } from "react";
import { 
  Animated, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Easing,
  TouchableWithoutFeedback 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as Notifications from 'expo-notifications';
import { Medication } from "../../models/Medication";
import { generateNotificationId } from "../../Services/notifications";
import { Platform } from "react-native";
interface Props {
  visible: boolean;
  medication: Medication | null;
  onClose: () => void;
  onTaken: () => void;
  onSnooze?: (minutes: number) => void; // optional, fallback if not provided
  onMissed: () => void;
}

const { height: screenHeight } = Dimensions.get("window");
const DEFAULT_SOUND = 'default';
export const ReminderPanel: React.FC<Props> = ({
  visible,
  medication,
  onClose,
  onTaken,
  onSnooze,
  onMissed,
}) => {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !medication) return null;

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeString;
    }
  };

  const handleSnooze = async (minutes: number) => {
    if (!medication?.id) return;

    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: generateNotificationId('medication', medication.id.toString(), `snooze_${Date.now()}`),
        content: {
          title: `💊 ${medication.name}`,
          body: `Reminder after ${minutes} minute(s) snooze.`,
          data: { medicationId: medication.id, type: 'medication-snooze' },
          sound: DEFAULT_SOUND,
          ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
        },
        trigger: {
    seconds: 15 * 60, // 15 minutes snooze
    repeats: false,
  } as Notifications.TimeIntervalTriggerInput,
      });
      onClose(); // close panel after scheduling snooze
    } catch (error) {
      console.error("Failed to schedule snooze notification:", error);
    }
  };

  const dynamicStyles = {
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: colors.text },
    title: { color: colors.text },
    medicationName: { color: colors.text },
    subtitle: { color: colors.text },
    detailText: { color: colors.text },
    actionButtonText: { color: colors.text },
    actionButtonSubtext: { color: colors.text },
    quickSnoozeTitle: { color: colors.text },
    quickSnoozeButton: { backgroundColor: colors.border },
    quickSnoozeText: { color: colors.text },
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
        <View style={[styles.sheet, dynamicStyles.sheet]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.medicationInfo}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="medical" size={24} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.title, dynamicStyles.title]}>Time for Medication</Text>
                <Text style={[styles.medicationName, dynamicStyles.medicationName]}>{medication.name}</Text>
                <View style={styles.details}>
                  <Text style={[styles.detailText, dynamicStyles.detailText]}>{medication.dosage}</Text>
                  <Text style={[styles.detailSeparator, { color: colors.text }]}>•</Text>
                  <Text style={[styles.detailText, dynamicStyles.detailText]}>{formatTime(medication.time)}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>What would you like to do?</Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
              onPress={onTaken}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <View style={styles.buttonTextContainer}>
                  <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText]}>Taken</Text>
                  <Text style={[styles.actionButtonSubtext, dynamicStyles.actionButtonSubtext]}>Mark as completed</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.notification + '15', borderColor: colors.notification }]}
              onPress={() => handleSnooze(15)}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="time" size={24} color={colors.notification} />
                <View style={styles.buttonTextContainer}>
                  <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText]}>Snooze</Text>
                  <Text style={[styles.actionButtonSubtext, dynamicStyles.actionButtonSubtext]}>Remind me in 15 min</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.notification} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}
              onPress={onMissed}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
                <View style={styles.buttonTextContainer}>
                  <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText]}>Skip</Text>
                  <Text style={[styles.actionButtonSubtext, dynamicStyles.actionButtonSubtext]}>I won't take it now</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Quick Snooze Options */}
          <View style={[styles.quickSnooze, { borderTopColor: colors.border }]}>
            <Text style={[styles.quickSnoozeTitle, dynamicStyles.quickSnoozeTitle]}>Quick Snooze</Text>
            <View style={styles.quickSnoozeButtons}>
              {[5, 10, 30].map(min => (
                <TouchableOpacity key={min} style={[styles.quickSnoozeButton, dynamicStyles.quickSnoozeButton]} onPress={() => handleSnooze(min)}>
                  <Text style={[styles.quickSnoozeText, dynamicStyles.quickSnoozeText]}>{min} min</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.6)" },
  container: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "70%", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  medicationInfo: { flexDirection: "row", flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 12 },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 4, opacity: 0.8 },
  medicationName: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  details: { flexDirection: "row", alignItems: "center" },
  detailText: { fontSize: 14, fontWeight: "500", opacity: 0.8 },
  detailSeparator: { fontSize: 14, marginHorizontal: 8, opacity: 0.8 },
  closeButton: { padding: 4, marginLeft: 8 },
  subtitle: { fontSize: 16, fontWeight: "600", marginBottom: 16 },
  actions: { gap: 12, marginBottom: 24 },
  actionButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 12, borderWidth: 1 },
  buttonContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  buttonTextContainer: { marginLeft: 12 },
  actionButtonText: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  actionButtonSubtext: { fontSize: 12, opacity: 0.8 },
  quickSnooze: { borderTopWidth: 1, paddingTop: 16 },
  quickSnoozeTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12, opacity: 0.8 },
  quickSnoozeButtons: { flexDirection: "row", gap: 8 },
  quickSnoozeButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: "center" },
  quickSnoozeText: { fontSize: 14, fontWeight: "500" },
});
