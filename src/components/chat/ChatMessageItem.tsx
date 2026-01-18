import React, { useMemo, memo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ChatMessage } from '../../models/ChatMessage';
import { useTheme } from '@react-navigation/native';

interface ChatMessageItemProps {
  message: ChatMessage;
  showTimestamp?: boolean;
  showMoodIndicator?: boolean;
  onLongPress?: (message: ChatMessage) => void;
}

// Memoized helper functions to prevent recreation
const getMoodEmoji = (moodScore?: number): string => {
  if (moodScore === undefined) return '';
  if (moodScore > 0.7) return '😊';
  if (moodScore > 0.3) return '🙂';
  if (moodScore > -0.3) return '😐';
  if (moodScore > -0.7) return '😟';
  return '😢';
};

const getMoodColor = (moodScore?: number, textColor?: string): string => {
  if (moodScore === undefined) return textColor || '#000000';
  if (moodScore > 0.5) return '#4CAF50';
  if (moodScore > 0) return '#8BC34A';
  if (moodScore > -0.5) return '#FF9800';
  return '#F44336';
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  showTimestamp = true,
  showMoodIndicator = true,
  onLongPress
}) => {
  const { colors } = useTheme();
  const isUser = message.isUser;

  // Memoize derived values
  const bubbleStyle = useMemo(() => ({
    backgroundColor: isUser ? colors.primary : colors.card,
    borderColor: isUser ? colors.primary : colors.border
  }), [isUser, colors.primary, colors.card, colors.border]);

  const textStyle = useMemo(() => ({
    color: isUser ? 'white' : colors.text
  }), [isUser, colors.text]);

  const timestampStyle = useMemo(() => ({
    color: isUser ? 'rgba(255,255,255,0.7)' : colors.text + '80'
  }), [isUser, colors.text]);

  const analyzingTextStyle = useMemo(() => ({
    color: isUser ? 'white' : colors.text
  }), [isUser, colors.text]);

  const moodColor = useMemo(() => 
    showMoodIndicator ? getMoodColor(message.moodScore, colors.text) : undefined,
    [showMoodIndicator, message.moodScore, colors.text]
  );

  const moodEmoji = useMemo(() => 
    showMoodIndicator ? getMoodEmoji(message.moodScore) : '',
    [showMoodIndicator, message.moodScore]
  );

  const formattedTime = useMemo(() => 
    showTimestamp ? formatTime(message.timestamp) : '',
    [showTimestamp, message.timestamp]
  );

  const handleLongPress = () => {
    onLongPress?.(message);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer
      ]}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      <View style={[styles.bubble, bubbleStyle]}>
        {message.isAnalyzing && (
          <View style={styles.analyzingIndicator}>
            <ActivityIndicator 
              size="small" 
              color={isUser ? 'white' : colors.primary} 
            />
            <Text style={[styles.analyzingText, analyzingTextStyle]}>
              Analyzing mood...
            </Text>
          </View>
        )}
        
        <Text style={[styles.text, textStyle]}>
          {message.text}
        </Text>

        {showMoodIndicator && message.moodScore !== undefined && (
          <View style={styles.moodIndicator}>
            <Text style={[styles.moodEmoji, { color: moodColor }]}>
              {moodEmoji}
            </Text>
            {message.emotion && (
              <Text style={[styles.emotionText, { color: moodColor }]}>
                {message.emotion}
              </Text>
            )}
          </View>
        )}

        {message.isCrisis && (
          <View style={styles.crisisIndicator}>
            <Text style={styles.crisisText}>⚠️ Crisis detected</Text>
          </View>
        )}

        {showTimestamp && (
          <Text style={[styles.timestamp, timestampStyle]}>
            {formattedTime}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  analyzingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  analyzingText: {
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  moodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  moodEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  emotionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  crisisIndicator: {
    marginTop: 8,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  crisisText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
});

// Memoize the component and implement custom comparison
export default memo(ChatMessageItem, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.moodScore === nextProps.message.moodScore &&
    prevProps.message.isAnalyzing === nextProps.message.isAnalyzing &&
    prevProps.message.isCrisis === nextProps.message.isCrisis &&
    prevProps.showTimestamp === nextProps.showTimestamp &&
    prevProps.showMoodIndicator === nextProps.showMoodIndicator
  );
});