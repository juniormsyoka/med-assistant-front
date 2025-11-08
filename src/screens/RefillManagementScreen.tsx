// screens/RefillManagementScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

//import { getMedications, getRefillByMedicationId, markRefillCompleted, updateRefillSupply } from '../Services/storage';
import { Medication } from '../models/Medication';
import { Refill } from '../models/Refill';
import { SupplyTracker } from '../components/Refill/SupplyTracker';
import { RefillHistory } from '../components/Refill/RefillHistory';
import { dataService } from '../Services/dataService';

import { getRefillByMedicationId, markRefillCompleted, updateRefillSupply } from '../Services/storage';

const RefillManagementScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [medications, setMedications] = useState<Array<{medication: Medication, refill: Refill | null}>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'normal'>('all');

  const loadMedicationsWithRefills = async () => {
  try {
    // Use hybrid data service instead of direct storage
    const meds = await dataService.getMedications();

    // Load corresponding refills (still from local DB)
    const medsWithRefills = await Promise.all(
      meds.map(async (medication) => {
        const refill = await getRefillByMedicationId(medication.id!);
        return { medication, refill };
      })
    );

    setMedications(medsWithRefills);
  } catch (error) {
    console.error('Error loading medications with refills:', error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadMedicationsWithRefills();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadMedicationsWithRefills();
    });

    return unsubscribe;
  }, [navigation]);

  const filteredMedications = medications.filter(({ medication, refill }) => {
    if (!refill) return filter === 'all';
    
    const daysRemaining = calculateDaysRemaining(medication, refill);
    if (filter === 'low') return daysRemaining <= 7;
    if (filter === 'normal') return daysRemaining > 7;
    return true;
  });

  const calculateDaysRemaining = (medication: Medication, refill: Refill): number => {
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

  const handleQuickRefill = async (medication: Medication, refill: Refill) => {
    if (!refill) return;

    Alert.alert(
      'Quick Refill',
      `How many ${medication.supplyInfo?.units || 'units'} of ${medication.name} are you adding?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Standard Refill', 
          onPress: () => handleStandardRefill(medication.id!, refill.refillQuantity) 
        },
        { 
          text: 'Custom Amount', 
          onPress: () => showCustomRefillDialog(medication, refill) 
        },
      ]
    );
  };

  const handleStandardRefill = async (medicationId: number, refillQuantity: number) => {
    try {
      await markRefillCompleted(medicationId, refillQuantity);
      loadMedicationsWithRefills();
      Alert.alert('Success', 'Medication refilled successfully!');
    } catch (error) {
      console.error('Error refilling medication:', error);
      Alert.alert('Error', 'Failed to update refill');
    }
  };

  const showCustomRefillDialog = (medication: Medication, refill: Refill) => {
    // For now, use standard refill - you can implement a custom input modal later
    handleStandardRefill(medication.id!, refill.refillQuantity);
  };

  const handleUpdateSupply = async (medicationId: number, newSupply: number) => {
    try {
      await updateRefillSupply(medicationId, newSupply);
      loadMedicationsWithRefills();
    } catch (error) {
      console.error('Error updating supply:', error);
      Alert.alert('Error', 'Failed to update supply count');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text }}>Loading medications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Refill Management</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Add')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {medications.filter(({ refill }) => refill).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Tracked</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#EF476F' }]}>
            {medications.filter(({ medication, refill }) => 
              refill && calculateDaysRemaining(medication, refill) <= 3
            ).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Critical</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#FFD166' }]}>
            {medications.filter(({ medication, refill }) => 
              refill && calculateDaysRemaining(medication, refill) <= 7
            ).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Low</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'low', 'normal'] as const).map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterTab,
              filter === filterType && [styles.activeFilterTab, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[
              styles.filterText,
              filter === filterType && styles.activeFilterText
            ]}>
              {filterType === 'all' ? 'All' : filterType === 'low' ? 'Low Supply' : 'Normal'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Medications List */}
      <ScrollView style={styles.list}>
        {filteredMedications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical" size={64} color={colors.text} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {filter === 'all' 
                ? 'No medications with supply tracking' 
                : `No medications with ${filter} supply`
              }
            </Text>
            <TouchableOpacity 
              style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Add')}
            >
              <Text style={styles.addFirstText}>Add Medication with Supply Tracking</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredMedications.map(({ medication, refill }) => (
            <SupplyTracker
              key={medication.id}
              medication={medication}
              refill={refill}
              onRefill={() => refill && handleQuickRefill(medication, refill)}
              onUpdateSupply={(newSupply) => handleUpdateSupply(medication.id!, newSupply)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  activeFilterTab: {
    backgroundColor: '#4361EE',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: '#FFF',
  },
  list: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  addFirstButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addFirstText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RefillManagementScreen;