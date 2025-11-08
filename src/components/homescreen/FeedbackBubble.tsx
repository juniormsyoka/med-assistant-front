// components/FeedbackBubble.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface FeedbackBubbleProps {
  message: string;
  visible: boolean;
  duration?: number;
  onHide: () => void;
  type?: 'success' | 'warning' | 'info';
}

const FeedbackBubble: React.FC<FeedbackBubbleProps> = ({
  message,
  visible,
  duration = 3000,
  onHide,
  type = 'info'
}) => {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }
  }, [visible, duration]);

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#333';
    }
  };

  return (
    <Animated.View style={[
      styles.container,
      { opacity: fadeAnim, backgroundColor: getBackgroundColor() }
    ]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default FeedbackBubble;