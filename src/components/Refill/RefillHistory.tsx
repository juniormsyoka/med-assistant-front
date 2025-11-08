// components/refill/RefillHistory.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface RefillHistoryItem {
  id: string;
  date: string;
  quantityAdded: number;
  previousSupply: number;
  newSupply: number;
  type: 'manual' | 'quick-refill' | 'auto-detected';
}

interface Props {
  medicationId: number;
  medicationName: string;
  history?: RefillHistoryItem[];
  maxItems?: number;
}

// Mock data - you'll replace this with actual data from your database
const mockRefillHistory: RefillHistoryItem[] = [
  {
    id: '1',
    date: '2024-01-15T10:30:00Z',
    quantityAdded: 30,
    previousSupply: 5,
    newSupply: 35,
    type: 'quick-refill'
  },
  {
    id: '2',
    date: '2023-12-20T14:15:00Z',
    quantityAdded: 30,
    previousSupply: 8,
    newSupply: 38,
    type: 'quick-refill'
  },
  {
    id: '3',
    date: '2023-11-25T09:45:00Z',
    quantityAdded: 30,
    previousSupply: 12,
    newSupply: 42,
    type: 'manual'
  },
  {
    id: '4',
    date: '2023-10-30T16:20:00Z',
    quantityAdded: -7, // Usage detected
    previousSupply: 49,
    newSupply: 42,
    type: 'auto-detected'
  }
];

export const RefillHistory: React.FC<Props> = ({ 
  medicationId, 
  medicationName, 
  history = mockRefillHistory,
  maxItems = 10 
}) => {
  const { colors } = useTheme();

  const displayedHistory = history.slice(0, maxItems);

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'quick-refill':
        return 'refresh';
      case 'manual':
        return 'create';
      case 'auto-detected':
        return 'analytics';
      default:
        return 'time';
    }
  };

  const getHistoryColor = (type: string) => {
    switch (type) {
      case 'quick-refill':
        return '#4361EE';
      case 'manual':
        return '#06D6A0';
      case 'auto-detected':
        return '#7209B7';
      default:
        return '#6C757D';
    }
  };

  const getHistoryLabel = (type: string) => {
    switch (type) {
      case 'quick-refill':
        return 'Quick Refill';
      case 'manual':
        return 'Manual Update';
      case 'auto-detected':
        return 'Usage Detected';
      default:
        return 'Update';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  if (displayedHistory.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Refill History</Text>
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons name="time" size={32} color={colors.text} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No refill history yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.text }]}>
            Refill history will appear here after your first refill
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Refill History</Text>
      
      <ScrollView 
        style={styles.historyList}
        showsVerticalScrollIndicator={false}
      >
        {displayedHistory.map((item, index) => (
          <View 
            key={item.id} 
            style={[
              styles.historyItem,
              { backgroundColor: colors.card },
              index < displayedHistory.length - 1 && styles.historyItemWithBorder
            ]}
          >
            {/* Timeline connector */}
            {index < displayedHistory.length - 1 && (
              <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />
            )}
            
            <View style={styles.historyContent}>
              <View style={styles.historyHeader}>
                <View style={styles.typeContainer}>
                  <View 
                    style={[
                      styles.typeIcon, 
                      { backgroundColor: getHistoryColor(item.type) }
                    ]}
                  >
                    <Ionicons 
                      name={getHistoryIcon(item.type)} 
                      size={12} 
                      color="#FFF" 
                    />
                  </View>
                  <Text style={[styles.typeLabel, { color: colors.text }]}>
                    {getHistoryLabel(item.type)}
                  </Text>
                </View>
                <Text style={[styles.date, { color: colors.text }]}>
                  {formatDate(item.date)}
                </Text>
              </View>

              <View style={styles.supplyChange}>
                <View style={styles.supplyChangeItem}>
                  <Text style={[styles.supplyLabel, { color: colors.text }]}>Previous:</Text>
                  <Text style={[styles.supplyValue, { color: colors.text }]}>
                    {item.previousSupply}
                  </Text>
                </View>
                
                <View style={styles.changeArrow}>
                  <Ionicons 
                    name={item.quantityAdded > 0 ? "arrow-forward" : "arrow-back"} 
                    size={16} 
                    color={colors.text} 
                    style={{ opacity: 0.6 }}
                  />
                </View>

                <View style={styles.supplyChangeItem}>
                  <Text style={[styles.supplyLabel, { color: colors.text }]}>
                    {item.quantityAdded > 0 ? 'Added:' : 'Used:'}
                  </Text>
                  <Text 
                    style={[
                      styles.quantityChange, 
                      { 
                        color: item.quantityAdded > 0 ? '#06D6A0' : '#EF476F',
                        fontWeight: 'bold'
                      }
                    ]}
                  >
                    {item.quantityAdded > 0 ? '+' : ''}{item.quantityAdded}
                  </Text>
                </View>

                <View style={styles.changeArrow}>
                  <Ionicons 
                    name="arrow-forward" 
                    size={16} 
                    color={colors.text} 
                    style={{ opacity: 0.6 }}
                  />
                </View>

                <View style={styles.supplyChangeItem}>
                  <Text style={[styles.supplyLabel, { color: colors.text }]}>New:</Text>
                  <Text style={[styles.supplyValue, { color: colors.text }]}>
                    {item.newSupply}
                  </Text>
                </View>
              </View>

              {item.type === 'auto-detected' && (
                <View style={[styles.autoDetectedNote, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="information-circle" size={14} color={colors.primary} />
                  <Text style={[styles.autoDetectedText, { color: colors.primary }]}>
                    Automatically detected from usage pattern
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {history.length > maxItems && (
        <View style={styles.moreItems}>
          <Text style={[styles.moreItemsText, { color: colors.text }]}>
            +{history.length - maxItems} more refills
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  emptyState: {
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
  historyList: {
    maxHeight: 300,
  },
  historyItem: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    position: 'relative',
  },
  historyItemWithBorder: {
    marginBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  timelineConnector: {
    position: 'absolute',
    bottom: -8,
    left: 24,
    right: 24,
    height: 8,
    zIndex: -1,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    opacity: 0.7,
  },
  supplyChange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supplyChangeItem: {
    alignItems: 'center',
    flex: 1,
  },
  supplyLabel: {
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 2,
  },
  supplyValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  quantityChange: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  changeArrow: {
    paddingHorizontal: 4,
  },
  autoDetectedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  autoDetectedText: {
    fontSize: 10,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  moreItems: {
    padding: 12,
    alignItems: 'center',
  },
  moreItemsText: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
  },
});