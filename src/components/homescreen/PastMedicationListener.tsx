import Toast from 'react-native-toast-message';
import { EventBus } from '../../Services/notifications/EventBus';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

export function PastMedicationListener({ onOpenPanel }: { onOpenPanel: (payload: any) => void }) {
  useEffect(() => {
    return EventBus.on('PAST_MEDICATION_REMINDER', async (payload) => {
      // Check if this notification is still scheduled
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        
        // Check if any notification for this medication exists
        const exists = scheduled.some(n => 
          n.content.data?.medicationId === payload.medication.id.toString()
        );
        
        // If no notification exists, it was probably already handled
        if (!exists) {
          console.log(`✅ No scheduled notification found for ${payload.medication.name}, skipping`);
          return;
        }
      } catch (error) {
        console.error('Could not check scheduled notifications:', error);
      }
      
      // Only show if medication hasn't been marked yet
      if (payload.status && payload.status !== 'pending') return;

      Toast.show({
        type: 'info',
        text1: '⏰ Medication reminder missed',
        text2: `${payload.medication.name} was scheduled earlier`,
        props: {
          onPress: () => {
            Toast.hide();
            onOpenPanel(payload);
          },
        },
        position: 'top',
        visibilityTime: 5000,
      });
    });
  }, []);

  return null;
}