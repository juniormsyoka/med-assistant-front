import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  TouchableWithoutFeedback 
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { 
  ChatMessage, 
  EmotionType, 
  getEmotionEmoji, 
  getMoodColor 
} from '../../models/ChatMessage';

interface ChatBubbleProps {
  message: ChatMessage;
  isFirst: boolean;
  isStreaming?: boolean;
  streamingText?: string;

  // --- NEW FOR MULTI-SELECT ---
  isSelecting: boolean;
  isSelected: boolean;
  onSelectToggle: (id: string) => void;
  onLongPressSelect: (id: string) => void;

  // existing
  onAnalyzeBatch?: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  isFirst, 
  isStreaming = false, 
  streamingText,
  onAnalyzeBatch,

  // --- NEW ---
  isSelecting,
  isSelected,
  onSelectToggle,
  onLongPressSelect,
}) => {

  const { colors } = useTheme();
  const displayText = isStreaming && streamingText ? streamingText : message.text;

  // Mood analysis + metadata
  const moodScore = message.moodScore;
  const stressScore = message.stressScore;
  const emotion = message.emotion;
  const isAnalyzing = message.isAnalyzing;
  const isCrisis = message.isCrisis;
  const hasMoodData = moodScore !== undefined || isAnalyzing;

  const awaitingAnalysis = message.metadata?.awaitingAnalysis;
  const analysisStatus = message.metadata?.analysisStatus;
  const analysisPriority = message.metadata?.analysisPriority;
  const analysisReason = message.metadata?.analysisReason;
  const isBatchAnalyzed = message.metadata?.moodAnalysis?.isBatchAnalyzed;
  const queuedAt = message.metadata?.queuedAt;

  const conversationInsights = message.metadata?.conversationInsights;
  const isSummaryMessage = message.metadata?.isSummary;
  const batchId = message.metadata?.batchId;

  const getEmotionIcon = (emotion?: string) => {
    if (!emotion) return '📊';
    return getEmotionEmoji(emotion as EmotionType);
  };

  const getMoodColorForDisplay = (score: number) => getMoodColor(score);

  const getPriorityColor = (priority?: string): string => {
    switch(priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F97316';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getAnalysisReasonText = (reason?: string): string => {
    switch(reason) {
      case 'crisis_keywords': return '🚨 Crisis detected';
      case 'stress_keywords': return '😰 Stress indicators';
      case 'periodic_sampling': return '📊 Periodic check';
      case 'time_based': return '⏰ Time-based';
      case 'user_requested': return '👤 User requested';
      case 'sampled_out': return '⏭️ Not analyzed';
      default: return '📝 Analysis';
    }
  };

  const formatQueuedTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStressLevel = (score: number): string => {
    if (score < 0.3) return 'Low';
    if (score < 0.6) return 'Medium';
    if (score < 0.8) return 'High';
    return 'Very High';
  };

  const formatMoodScore = (score: number): string => {
    if (score > 0) return `+${score.toFixed(2)}`;
    return score.toFixed(2);
  };

  // --- MULTI-SELECT PRESS HANDLERS ---
  const handlePress = () => {
    if (isSelecting) {
      onSelectToggle(message.id);
    }
  };

  const handleLongPress = () => {
    if (!isSelecting) {
      onLongPressSelect(message.id);
    }
  };

  return (
    <TouchableWithoutFeedback 
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      <View style={[
        styles.container,
        message.isUser ? styles.userContainer : styles.aiContainer,
        isSelected && styles.selectedContainer   // highlight when selected
      ]}>

        <View style={[
          styles.bubble,
          message.isUser 
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [
                styles.aiBubble,
                { 
                  backgroundColor: colors.card,
                  borderWidth: isCrisis ? 2 : 
                    awaitingAnalysis && analysisPriority === 'high' ? 1.5 : 1,
                  borderColor: isCrisis
                    ? '#EF4444'
                    : awaitingAnalysis && analysisPriority === 'high'
                      ? '#F97316'
                      : colors.border
                }
              ]
        ]}>

          {/* --- MULTI-SELECT CHECKBOX --- */}
          {isSelecting && (
            <View style={styles.checkboxContainer}>
              <View style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected
              ]}>
                {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
            </View>
          )}

          <Text style={[
            styles.text,
            message.isUser ? styles.userText : { color: colors.text }
          ]}>
            {displayText}
            {isStreaming && <Text style={styles.streamingCursor}>▊</Text>}
          </Text>

          {/* --- (ALL YOUR ANALYTICS UI BELOW — UNCHANGED) --- */}
          {message.isUser && awaitingAnalysis && !isAnalyzing && (
            <View style={[
              styles.analysisStatusContainer,
              { backgroundColor: colors.background + '20' }
            ]}>
              <Text style={[styles.analysisStatusText, { color: colors.text + '80' }]}>
                ⏳ Queued for {analysisPriority} priority analysis
              </Text>
              {analysisReason && (
                <Text style={[styles.analysisReasonText, { color: colors.text + '60' }]}>
                  {getAnalysisReasonText(analysisReason)}
                </Text>
              )}
              {queuedAt && (
                <Text style={[styles.queuedTimeText, { color: colors.text + '40' }]}>
                  Queued at {formatQueuedTime(queuedAt)}
                </Text>
              )}
            </View>
          )}

          {message.isUser && isBatchAnalyzed && (
            <View style={[
              styles.batchIndicator,
              { backgroundColor: colors.primary + '20' }
            ]}>
              <Text style={[styles.batchIndicatorText, { color: colors.primary }]}>
                📊 Batch analyzed
              </Text>
              <Text style={[styles.batchIdText, { color: colors.text + '60' }]}>
                Batch #{batchId}
              </Text>
            </View>
          )}

          {/* --- Mood Data --- */}
          {hasMoodData && !isAnalyzing && (
            <View style={[
              styles.moodContainer,
              { backgroundColor: colors.background + '40' }
            ]}>
              <View style={styles.moodHeader}>
                <Text style={[styles.emotionText, { color: colors.text }]}>
                  {getEmotionIcon(emotion)} {emotion || 'Neutral'}
                </Text>

                {moodScore !== undefined && (
                  <Text 
                    style={[
                      styles.moodScoreText,
                      { color: getMoodColorForDisplay(moodScore) }
                    ]}
                  >
                    {formatMoodScore(moodScore)}
                  </Text>
                )}

                {isBatchAnalyzed && (
                  <View style={styles.batchBadge}>
                    <Text style={styles.batchBadgeText}>BATCH</Text>
                  </View>
                )}
              </View>

              {moodScore !== undefined && (
                <View style={styles.moodBarContainer}>
                  <View style={styles.moodBarBackground}>
                    <View 
                      style={[
                        styles.moodBarFill,
                        { 
                          width: `${((moodScore + 1) / 2) * 100}%`,
                          backgroundColor: getMoodColorForDisplay(moodScore)
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.moodBarLabels}>
                    <Text style={[styles.moodBarLabel, { color: colors.text + '80' }]}>
                      Negative
                    </Text>
                    <Text style={[styles.moodBarLabel, { color: colors.text + '80' }]}>
                      Positive
                    </Text>
                  </View>
                </View>
              )}

              {stressScore !== undefined && (
                <View style={styles.stressContainer}>
                  <Text style={[styles.stressLabel, { color: colors.text + '80' }]}>
                    Stress: {getStressLevel(stressScore)}
                  </Text>
                  <View style={styles.stressBarBackground}>
                    <View 
                      style={[
                        styles.stressBarFill,
                        { 
                          width: `${stressScore * 100}%`,
                          backgroundColor:
                            stressScore > 0.7 ? '#EF4444'
                            : stressScore > 0.4 ? '#F97316'
                            : '#10B981'
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.stressScore, { color: colors.text + '80' }]}>
                    {stressScore.toFixed(2)}
                  </Text>
                </View>
              )}

              {conversationInsights && (
                <View style={styles.insightsContainer}>
                  <Text style={[styles.insightsTitle, { color: colors.text }]}>
                    📈 Conversation Insights
                  </Text>
                  <Text style={[styles.insightsText, { color: colors.text + '80' }]}>
                    Mood: {conversationInsights.moodTrend || 'stable'} • 
                    Stress: {conversationInsights.averageStress?.toFixed(2) || 'N/A'} • 
                    Crisis risk: {((conversationInsights.crisisProbability || 0) * 100).toFixed(0)}%
                  </Text>

                  {conversationInsights?.dominantEmotions?.length ? (
                    <View style={styles.emotionsContainer}>
                      {conversationInsights.dominantEmotions
                        .slice(0, 3)
                        .map((e: any, idx: any) => (
                          <View key={idx} style={styles.emotionBadge}>
                            <Text style={styles.emotionBadgeText}>
                              {getEmotionIcon(e.emotion)} {e.emotion} ({e.percentage}%)
                            </Text>
                          </View>
                        ))}
                    </View>
                  ) : null}

                </View>
              )}

              {isSummaryMessage && (
                <TouchableOpacity 
                  onPress={onAnalyzeBatch}
                  style={[styles.summaryContainer, { backgroundColor: colors.primary + '20' }]}
                >
                  <Text style={[styles.summaryTitle, { color: colors.primary }]}>
                    📊 View Full Analysis
                  </Text>
                  <Text style={[styles.summaryText, { color: colors.text + '80' }]}>
                    Tap to see detailed conversation insights and recommendations
                  </Text>
                </TouchableOpacity>
              )}

              {message.metadata?.moodAnalysis?.modelUsed && (
                <View style={styles.modelInfoContainer}>
                  <Text style={[styles.modelInfoText, { color: colors.text + '60' }]}>
                    Analyzed with {message.metadata.moodAnalysis.modelUsed}
                    {isBatchAnalyzed && ' • Batch processed'}
                  </Text>
                </View>
              )}

              {isCrisis && (
                <View style={styles.crisisContainer}>
                  <Text style={styles.crisisIcon}>🚨</Text>
                  <View style={styles.crisisTextContainer}>
                    <Text style={styles.crisisTitle}>Crisis Detected</Text>
                    <Text style={styles.crisisSubtitle}>
                      {message.isUser 
                        ? 'Crisis support resources have been offered.'
                        : 'This response contains crisis language.'
                      }
                    </Text>
                  </View>
                </View>
              )}

              {message.metadata?.healthcareContext && (
                <View style={styles.contextContainer}>
                  {message.metadata.healthcareContext.hasCrisisKeyword && (
                    <View style={[styles.contextBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.contextBadgeText, { color: '#991B1B' }]}>🚨 Crisis</Text>
                    </View>
                  )}
                  {message.metadata.healthcareContext.mentionsPain && (
                    <View style={[styles.contextBadge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.contextBadgeText, { color: '#92400E' }]}>💊 Pain</Text>
                    </View>
                  )}
                  {message.metadata.healthcareContext.mentionsMedication && (
                    <View style={[styles.contextBadge, { backgroundColor: '#D1FAE5' }]}>
                      <Text style={[styles.contextBadgeText, { color: '#065F46' }]}>🩺 Medication</Text>
                    </View>
                  )}
                  {message.metadata.healthcareContext.hasUrgency && (
                    <View style={[styles.contextBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.contextBadgeText, { color: '#991B1B' }]}>⚠️ Urgent</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {message.isUser && isCrisis && !message.isAnalyzing && (
            <View style={styles.userCrisisContainer}>
              <Text style={styles.userCrisisIcon}>🚨</Text>
              <Text style={styles.userCrisisText}>
                Crisis support offered
              </Text>
            </View>
          )}

        </View>

        <Text style={[styles.timestamp, { color: colors.text + '80' }]}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {hasMoodData && !isAnalyzing && (
            <Text style={[styles.moodTimestamp, { color: colors.primary }]}>
              {isBatchAnalyzed ? ' • 📊 Batch' : ' • 🧠 Analyzed'}
            </Text>
          )}
          {awaitingAnalysis && (
            <Text style={[styles.queuedTimestamp, { color: getPriorityColor(analysisPriority) }]}>
              • ⏳ {analysisPriority?.toUpperCase()} PRIORITY
            </Text>
          )}
        </Text>

      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },

  selectedContainer: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 14,
  },

  // CHECKBOX (MULTI-SELECT)
  checkboxContainer: {
    position: 'absolute',
    left: -28,
    top: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
  },
  checkboxCheck: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '85%',
    minWidth: '30%',
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  streamingCursor: {
    color: '#666',
    fontWeight: 'bold',
  },

  // --- all styles below this line are unchanged from your original ---
  analysisStatusContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  analysisStatusText: { fontSize: 12, fontWeight: '500' },
  analysisReasonText: { fontSize: 10, marginTop: 2, fontStyle: 'italic' },
  queuedTimeText: { fontSize: 9, marginTop: 1 },

  batchIndicator: {
    marginTop: 8,
    padding: 6,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchIndicatorText: { fontSize: 10, fontWeight: '600' },
  batchIdText: { fontSize: 9 },

  batchBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  batchBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },

  insightsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  insightsTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightsText: {
    fontSize: 11,
    marginBottom: 6,
  },
  emotionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emotionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  emotionBadgeText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },

  summaryContainer: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  summaryText: { fontSize: 11 },

  modelInfoContainer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modelInfoText: {
    fontSize: 9,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  moodContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  analyzingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyzingText: { fontSize: 12, fontStyle: 'italic' },

  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  emotionText: { fontSize: 14, fontWeight: '600', flex: 1 },

  moodScoreText: { fontSize: 14, fontWeight: '700', marginRight: 6 },

  moodBarContainer: { marginBottom: 10 },
  moodBarBackground: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  moodBarFill: { height: '100%', borderRadius: 3 },
  moodBarLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBarLabel: { fontSize: 10 },

  stressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stressLabel: { fontSize: 12, minWidth: 70 },
  stressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stressBarFill: { height: '100%', borderRadius: 2 },
  stressScore: { fontSize: 10, width: 30, textAlign: 'right' },

  moodTimestamp: { fontSize: 10, marginLeft: 4 },
  queuedTimestamp: { fontSize: 9, marginLeft: 4, fontWeight: '600' },

  crisisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginTop: 8,
  },
  crisisIcon: { fontSize: 16, marginRight: 8 },
  crisisTextContainer: { flex: 1 },
  crisisTitle: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  crisisSubtitle: { fontSize: 10, color: '#EF4444', opacity: 0.8 },

  userCrisisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  userCrisisIcon: { fontSize: 12, marginRight: 4 },
  userCrisisText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
  },

  contextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  contextBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  contextBadgeText: { fontSize: 10, fontWeight: '600' },
});

export default ChatBubble;
