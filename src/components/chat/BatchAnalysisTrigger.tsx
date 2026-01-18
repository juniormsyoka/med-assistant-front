import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface BatchAnalysisTriggerProps {
  messageCount: number;
  conversationId: string;
  onAnalyzeBatch: () => Promise<void>;
}

const BatchAnalysisTrigger: React.FC<BatchAnalysisTriggerProps> = ({
  messageCount,
  conversationId,
  onAnalyzeBatch
}) => {
  const [showTrigger, setShowTrigger] = useState(false);
  
  useEffect(() => {
    // Show trigger after 10 unanalyzed messages
    if (messageCount >= 10 && !showTrigger) {
      setShowTrigger(true);
    }
  }, [messageCount]);
  
  if (!showTrigger) return null;
  
  return (
    <TouchableOpacity 
      style={styles.triggerContainer}
      onPress={async () => {
        await onAnalyzeBatch();
        setShowTrigger(false);
      }}
    >
      <Text style={styles.triggerText}>
        📊 Analyze conversation mood ({messageCount} messages)
      </Text>
      <Text style={styles.triggerSubtext}>
        Click to analyze emotional patterns
      </Text>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  triggerContainer: {
    backgroundColor: '#E0F7FA', // light blue
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  triggerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00796B', // dark teal  
  },
  triggerSubtext: {
    fontSize: 12,
    color: '#00796B', // dark teal
  },
});

export default BatchAnalysisTrigger;
  