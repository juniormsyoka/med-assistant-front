// components/homescreen/RefillAlertBanner.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface RefillAlert {
  medication: any;
  refill: any;
  daysRemaining?: number;
}

interface Props {
  alerts: RefillAlert[];
  onDismiss: (medicationId: string) => void;
  onRefill: (medicationId: string) => void;
}

export const RefillAlertBanner: React.FC<Props> = ({ alerts, onDismiss, onRefill }) => {
  const { colors } = useTheme();

  if (alerts.length === 0) return null;

  const calculateDaysRemaining = (medication: any, refill: any): number => {
    if (!medication.supplyInfo || !refill.currentSupply) return 0;
    
    const { dosagePerUse } = medication.supplyInfo;
    const dailyUsage = dosagePerUse * getFrequencyMultiplier(medication.repeatType);
    const daysRemaining = Math.floor(refill.currentSupply / dailyUsage);
    
    return daysRemaining;
  };

  const getFrequencyMultiplier = (repeatType: string): number => {
    switch (repeatType) {
      case 'daily': return 1;
      case 'weekly': return 1/7;
      case 'monthly': return 1/30;
      default: return 1;
    }
  };

  const getAlertColor = (daysRemaining: number): string => {
    if (daysRemaining <= 3) return '#EF476F'; // Red for critical
    if (daysRemaining <= 7) return '#FFD166'; // Yellow for warning
    return '#4361EE'; // Blue for info
  };

  const handleRefillPress = (medicationId: string, medicationName: string) => {
    Alert.alert(
      'Mark as Refilled',
      `Have you refilled ${medicationName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Refilled',
          onPress: () => onRefill(medicationId),
        },
      ]
    );
  };

  const handleDismissPress = (medicationId: string, medicationName: string) => {
    Alert.alert(
      'Dismiss Alert',
      `Dismiss refill alert for ${medicationName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Dismiss',
          onPress: () => onDismiss(medicationId),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#FFECB3', borderLeftColor: '#FFA000' }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="warning" size={20} color="#FF6B35" />
          <Text style={styles.title}>Low Medication Supply</Text>
        </View>
        <Text style={styles.alertCount}>{alerts.length} alert{alerts.length > 1 ? 's' : ''}</Text>
      </View>

      {alerts.map((alert, index) => {
        const daysRemaining = calculateDaysRemaining(alert.medication, alert.refill);
        const alertColor = getAlertColor(daysRemaining);
        
        return (
          <View key={alert.medication.id} style={[styles.alertItem, index < alerts.length - 1 && styles.alertDivider]}>
            <View style={styles.medicationInfo}>
              <Text style={[styles.medicationName, { color: colors.text }]}>
                {alert.medication.name}
              </Text>
              <View style={styles.supplyInfo}>
                <View style={[styles.daysBadge, { backgroundColor: alertColor }]}>
                  <Text style={styles.daysText}>
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                  </Text>
                </View>
                <Text style={[styles.supplyText, { color: colors.text }]}>
                  Current: {alert.refill.currentSupply} {alert.medication.supplyInfo?.units || 'units'}
                </Text>
              </View>
            </View>
            
            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.refillButton, { backgroundColor: alertColor }]}
                onPress={() => handleRefillPress(alert.medication.id.toString(), alert.medication.name)}
              >
                <Ionicons name="refresh" size={16} color="#FFF" />
                <Text style={styles.refillText}>Refill</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dismissButton}
                onPress={() => handleDismissPress(alert.medication.id.toString(), alert.medication.name)}
              >
                <Ionicons name="close" size={16} color="#6C757D" />
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#FF6B35',
  },
  alertCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertItem: {
    paddingVertical: 8,
  },
  alertDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 53, 0.2)',
  },
  medicationInfo: {
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  supplyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  daysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  daysText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  supplyText: {
    fontSize: 12,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  refillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  refillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    minWidth: 80,
    justifyContent: 'center',
  },
  dismissText: {
    color: '#6C757D',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});