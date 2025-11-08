// components/refill/SupplyTracker.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Medication } from '../../models/Medication';
import { Refill } from '../../models/Refill';

interface Props {
  medication: Medication;
  refill: Refill | null;
  onRefill: () => void;
  onUpdateSupply: (newSupply: number) => void;
}

export const SupplyTracker: React.FC<Props> = ({ medication, refill, onRefill, onUpdateSupply }) => {
  const { colors } = useTheme();
  const [editingSupply, setEditingSupply] = useState(false);
  const [tempSupply, setTempSupply] = useState(refill?.currentSupply?.toString() || '');

  if (!refill || !medication.supplyInfo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.medicationName, { color: colors.text }]}>{medication.name}</Text>
          <Text style={[styles.notTracking, { color: colors.text }]}>Not tracking supply</Text>
        </View>
        <TouchableOpacity 
          style={[styles.enableButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            // Navigate to edit medication to enable supply tracking
            // You can implement this later
            Alert.alert('Enable Supply Tracking', 'Edit medication to enable supply tracking');
          }}
        >
          <Text style={styles.enableButtonText}>Enable Tracking</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const calculateDaysRemaining = (): number => {
    const { dosagePerUse } = medication.supplyInfo!;
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

  const getProgressColor = (daysRemaining: number): string => {
    if (daysRemaining <= 3) return '#EF476F';
    if (daysRemaining <= 7) return '#FFD166';
    return '#06D6A0';
  };

  const getProgressPercentage = (): number => {
    const maxSupply = Math.max(refill.initialSupply, refill.currentSupply);
    return (refill.currentSupply / maxSupply) * 100;
  };

  const daysRemaining = calculateDaysRemaining();
  const progressColor = getProgressColor(daysRemaining);
  const progressPercentage = getProgressPercentage();

  const handleSaveSupply = () => {
    const newSupply = parseInt(tempSupply);
    if (isNaN(newSupply) || newSupply < 0) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }
    onUpdateSupply(newSupply);
    setEditingSupply(false);
  };

  const handleQuickAdjust = (change: number) => {
    const newSupply = Math.max(0, refill.currentSupply + change);
    onUpdateSupply(newSupply);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.medicationInfo}>
          <Text style={[styles.medicationName, { color: colors.text }]}>{medication.name}</Text>
          <Text style={[styles.dosage, { color: colors.text }]}>{medication.dosage}</Text>
        </View>
        <View style={[styles.daysBadge, { backgroundColor: progressColor }]}>
          <Text style={styles.daysText}>{daysRemaining} days</Text>
        </View>
      </View>

      {/* Supply Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.supplyText, { color: colors.text }]}>
            Current Supply: {refill.currentSupply} {medication.supplyInfo.units}
          </Text>
          {editingSupply ? (
            <TouchableOpacity onPress={handleSaveSupply}>
              <Text style={[styles.editButton, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditingSupply(true)}>
              <Text style={[styles.editButton, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: '#E0E0E0' }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(progressPercentage, 100)}%`,
                  backgroundColor: progressColor
                }
              ]} 
            />
          </View>
        </View>

        {/* Quick Adjust Buttons */}
        <View style={styles.quickAdjust}>
          <Text style={[styles.adjustLabel, { color: colors.text }]}>Quick adjust:</Text>
          <TouchableOpacity 
            style={[styles.adjustButton, { backgroundColor: colors.primary }]}
            onPress={() => handleQuickAdjust(-1)}
          >
            <Ionicons name="remove" size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.adjustButton, { backgroundColor: colors.primary }]}
            onPress={() => handleQuickAdjust(1)}
          >
            <Ionicons name="add" size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.adjustButton, { backgroundColor: colors.primary }]}
            onPress={() => handleQuickAdjust(-5)}
          >
            <Text style={styles.adjustButtonText}>-5</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.adjustButton, { backgroundColor: colors.primary }]}
            onPress={() => handleQuickAdjust(5)}
          >
            <Text style={styles.adjustButtonText}>+5</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Refill Action */}
      <TouchableOpacity 
        style={[styles.refillButton, { backgroundColor: progressColor }]}
        onPress={onRefill}
      >
        <Ionicons name="refresh" size={20} color="#FFF" />
        <Text style={styles.refillButtonText}>Quick Refill</Text>
      </TouchableOpacity>

      {/* Supply Info */}
      <View style={styles.supplyInfo}>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.text }]}>Initial Supply</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{refill.initialSupply}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.text }]}>Refill At</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{refill.refillThreshold} left</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.text }]}>Last Refill</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {new Date(refill.lastRefillDate).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dosage: {
    fontSize: 14,
    opacity: 0.8,
  },
  notTracking: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.6,
  },
  daysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  daysText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supplyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  quickAdjust: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustLabel: {
    fontSize: 12,
    marginRight: 8,
  },
  adjustButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  adjustButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  refillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  refillButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  supplyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  enableButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SupplyTracker;