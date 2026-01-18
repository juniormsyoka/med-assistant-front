// models/ChatMessage.ts

// All allowed message types used across the app
export type MessageType =
  | 'text'
  | 'suggestion'
  | 'quick_reply'
  | 'medication_info'
  | 'reminder_set'
  | 'error';

// 🔥 UPDATED: Emotion type for mood analysis
export type EmotionType =
  | 'neutral'
  | 'positive'
  | 'negative'
  | 'anxious'
  | 'depressed'
  | 'stressed'
  | 'crisis'
  | 'health-concern'
  | 'empathetic'
  | 'reassuring'
  | 'concerned'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'frustrated'
  | 'calm'
  | 'excited'
  | 'slightly-positive'
  | 'slightly-negative'
  | 'very-positive'
  | 'very-negative'
  | 'high-stress'
  | 'distressed'
  | 'worried'
  | 'mild-concern'
  | 'urgent'
  | 'supportive'
  | 'encouraging';

// 🔥 NEW: Analysis decision interface
export interface AnalysisDecision {
  shouldAnalyze: boolean;
  priority: 'high' | 'medium' | 'low';
  reason?: string;
  skipReason?: string;
}

// 🔥 NEW: Suggested response tone interface
export interface SuggestedResponseTone {
  tone: string;
  priority: string;
  action: string;
  empathyLevel: string;
  responseSpeed: string;
  responseLength?: string;
  focus?: string;
}

// 🔥 NEW: Healthcare context interface
export interface HealthcareContext {
  hasCrisisKeyword?: boolean;
  hasUrgency?: boolean;
  mentionsPain?: boolean;
  mentionsMedication?: boolean;
  wordCount?: number;
  hasQuestion?: boolean;
  hasExclamation?: boolean;
  allCapsRatio?: number;
  exclamationCount?: number;
  questionCount?: number;
  emotionalIntensity?: number;
  keywordDetectedEmotion?: string | null;
  containsPositiveKeywords?: boolean;
  containsNegativeKeywords?: boolean;
  [key: string]: any; // Allow additional healthcare context properties
}

// 🔥 UPDATED: Mood analysis data structure
export interface MoodAnalysisData {
  // Core analysis metrics
  moodScore?: number;          // -1 (very negative) to 1 (very positive)
  stressScore?: number;        // 0 (no stress) to 1 (high stress)
  emotion?: EmotionType;       // Primary emotion detected
  confidence?: number;        // Confidence level of analysis (0-1)
  isCrisis?: boolean;         // Whether message indicates crisis
  analyzedAt?: string;        // When analysis was performed (ISO string)
  rawData?: any;              // Raw analysis data from backend
  
  // 🔥 NEW: Source and decision properties
  source?: string;            // Source of analysis ('api', 'local-fallback', 'batch-api', 'timeout', 'skipped', etc.)
  analysisDecision?: AnalysisDecision; // Decision about whether/how to analyze
  suggestedResponseTone?: SuggestedResponseTone; // Suggested tone for response
  
  // Batch analysis properties
  isBatchAnalyzed?: boolean;  // Whether analysis was done in batch
  batchId?: string;           // Batch identifier
  modelUsed?: string;         // Which model was used ('distilbert', 'simple', 'distilbert-batch', etc.)
  isFallback?: boolean;       // Whether this is a fallback analysis
  priority?: 'high' | 'medium' | 'low'; // Analysis priority
  
  // Healthcare context
  healthcareContext?: HealthcareContext;
}

export interface StrictMoodAnalysisData {
  moodScore: number;          
  stressScore: number;        
  emotion: EmotionType;       
  confidence: number;         
  isCrisis: boolean;          
  analyzedAt: string;         
  rawData?: any;

  source?: string;
  analysisDecision?: AnalysisDecision;
  suggestedResponseTone?: SuggestedResponseTone;
  
  isBatchAnalyzed?: boolean;
  batchId?: string;
  modelUsed?: string;
  isFallback?: boolean;
  priority?: 'high' | 'medium' | 'low';
  healthcareContext?: HealthcareContext;
}

// 🔥 NEW: Conversation insights interface
export interface ConversationInsights {
  moodTrend?: string;
  averageMood?: number;
  averageStress?: number;
  dominantEmotions?: Array<{emotion: string, count: number, percentage: string}>;
  crisisProbability?: number;
  crisisCount?: number;
  messageCount?: number;
  recommendations?: Array<{
    priority: string;
    action: string;
    description: string;
    resources?: string[];
    suggestions?: string[];
  }>;
  summary?: string;
  keyMetrics?: {
    veryPositiveMessages?: number;
    veryNegativeMessages?: number;
    highStressMessages?: number;
    questionsAsked?: number;
    averageMessageLength?: number;
  };
}

// Core message type (non-generic — simpler and easier to use)
export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'image' | 'audio' | 'status' | 'scan_result' | 'system';
  conversationId: string; // ✅ ESSENTIAL: For filtering messages by conversation
  
  // 🔥 NEW: Mood analysis properties
  moodScore?: number;          // -1 to 1 (negative to positive sentiment)
  stressScore?: number;       // 0 to 1 (low to high stress)
  emotion?: EmotionType;      // Primary emotion label
  isAnalyzing?: boolean;      // Whether mood analysis is in progress
  isCrisis?: boolean;         // Crisis detection flag
  isEdited?: boolean;         // Whether message was edited
  isDeleted?: boolean;       // Soft delete flag
  mode: 'ai' | 'doctor';
  sender?: {
    id: string;
    name: string;
    role: string;
  };
  // Quick reply suggestions
  suggestions?: string[];
  
  // Extended metadata
  metadata?: {
    // Existing properties
    medicationId?: number;
    intent?: string;
    confidence?: number;
    
    // 🔥 UPDATED: Mood analysis metadata
    moodAnalysis?: MoodAnalysisData;
    analyzedAt?: string;

    awaitingAnalysis?: boolean;       // Waiting for batch analysis
    analysisStatus?: 'queued' | 'processing' | 'completed' | 'failed';
    analysisPriority?: 'high' | 'medium' | 'low';
    analysisReason?: string;          // Why analysis was triggered
    queuedAt?: string;                // When queued for batch analysis

    // 🔥 NEW: Conversation insights
    conversationInsights?: ConversationInsights;
    
    isSummary?: boolean;    

    // User mood context (when message was sent)
    userMoodContext?: {
      moodScore?: number;    
      stressScore?: number;  
      emotion?: EmotionType; 
      timestamp?: Date;
      source?: string;
    };
    
    // AI response tone (for AI messages)
    aiTone?: {
      tone: 'empathetic' | 'clinical' | 'reassuring' | 'informative' | 'crisis_intervention' | 'calm_reassuring' | 'positive_engaging' | 'professional_careful';
      empathyLevel: number; // 0-1
      responseStrategy: string;
      priority?: string;
      action?: string;
      responseSpeed?: string;
    };
    
    // Scan data (for prescription scans)
    scanData?: {
      extractedText?: string;
      analysis?: string;
      confidence?: number;
      modelUsed?: string;
      fileSize?: number;
      mimeType?: string;
    };
    
    // Voice message data
    voiceData?: {
      duration?: number;
      transcription?: string;
      confidence?: number;
      method?: string;
      note?: string;
      audioDetails?: {
        size?: number;
        mimeType?: string;
        duration?: string;
        detected?: string;
      };
    };
    
    // Fallback data
    isFallback?: boolean;
    error?: string;
    originalText?: string;
    
    // Source tracking
    source?: string;
    modelUsed?: string;
    conversationType?: 'ai' | 'doctor';
    
    editedAt?: string;
    // Allow any additional metadata
    [key: string]: any;
  };
}

// For creation (omit id + timestamp)
export type CreateChatMessage = Omit<ChatMessage, 'id' | 'timestamp'> & {
  timestamp?: Date;
};

// 🔥 UPDATED: Type-safe mood data creation
export interface CreateMoodData {
  text: string;
  moodScore?: number;
  stressScore?: number;
  emotion?: EmotionType;
  isCrisis?: boolean;
  source?: string;
  analysisDecision?: AnalysisDecision;
  healthcareContext?: HealthcareContext;
  metadata?: {
    moodAnalysis?: Partial<MoodAnalysisData>;
    [key: string]: any;
  };
}

// Factory to create consistent ChatMessage objects with mood support
export const createChatMessage = (
  text: string,
  isUser: boolean,
  conversationId: string,
  options?: Partial<CreateChatMessage>
): ChatMessage => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
  text,
  isUser,
  conversationId,
  timestamp: options?.timestamp ?? new Date(),
  type: options?.type ?? 'text',
  mode: options?.mode ?? (isUser ? 'doctor' : 'ai'),
  
  // Mood properties (if provided)
  moodScore: options?.moodScore,
  stressScore: options?.stressScore,
  emotion: options?.emotion,
  isAnalyzing: options?.isAnalyzing,
  isCrisis: options?.isCrisis,
  
  // Other properties
  suggestions: options?.suggestions,
  metadata: options?.metadata,
  
  // Default values
  ...(options ?? {}),
});

export const createMoodAwareMessage = (
  text: string,
  isUser: boolean,
  conversationId: string,
  moodData?: Partial<MoodAnalysisData>, // Accept partial data
  options?: Partial<CreateChatMessage>
): ChatMessage => {
  const message = createChatMessage(text, isUser, conversationId, options);
  
  if (moodData) {
    // Assign only the properties that exist
    if (moodData.moodScore !== undefined) message.moodScore = moodData.moodScore;
    if (moodData.stressScore !== undefined) message.stressScore = moodData.stressScore;
    if (moodData.emotion !== undefined) message.emotion = moodData.emotion;
    if (moodData.isCrisis !== undefined) message.isCrisis = moodData.isCrisis;
    
    if (!message.metadata) {
      message.metadata = {};
    }
    
    // Create mood analysis object with only provided fields
    message.metadata.moodAnalysis = {
      ...moodData,
      analyzedAt: moodData.analyzedAt || new Date().toISOString(),
    };
    
    // Only add confidence if provided
    if (moodData.confidence !== undefined) {
      message.metadata.moodAnalysis.confidence = moodData.confidence;
    }
    
    // Add source and healthcare context if provided
    if (moodData.source !== undefined) {
      message.metadata.moodAnalysis.source = moodData.source;
    }
    
    if (moodData.healthcareContext !== undefined) {
      message.metadata.moodAnalysis.healthcareContext = moodData.healthcareContext;
    }
    
    if (moodData.analysisDecision !== undefined) {
      message.metadata.moodAnalysis.analysisDecision = moodData.analysisDecision;
    }
  }
  
  return message;
};

export const createAIResponseWithMood = (
  text: string,
  conversationId: string,
  userMoodContext?: Partial<MoodAnalysisData>, // Accept partial
  options?: {
    moodData?: Partial<MoodAnalysisData>; // Accept partial
    tone?: 'empathetic' | 'clinical' | 'reassuring' | 'informative' | 'crisis_intervention' | 'calm_reassuring' | 'positive_engaging' | 'professional_careful';
    suggestions?: string[];
    suggestedResponseTone?: SuggestedResponseTone;
  }
): ChatMessage => {
  const aiMessage = createChatMessage(text, false, conversationId, {
    type: 'text',
    suggestions: options?.suggestions,
    isAnalyzing: !options?.moodData, // Show analyzing if no mood data yet
  });
  
  if (options?.moodData) {
    if (options.moodData.moodScore !== undefined) aiMessage.moodScore = options.moodData.moodScore;
    if (options.moodData.stressScore !== undefined) aiMessage.stressScore = options.moodData.stressScore;
    if (options.moodData.emotion !== undefined) aiMessage.emotion = options.moodData.emotion;
    aiMessage.isAnalyzing = false;
  }
  
  aiMessage.metadata = {
    ...aiMessage.metadata,
    userMoodContext: userMoodContext ? {
      moodScore: userMoodContext.moodScore,
      stressScore: userMoodContext.stressScore,
      emotion: userMoodContext.emotion,
      timestamp: new Date(),
      source: userMoodContext.source,
    } : undefined,
    aiTone: options?.tone ? {
      tone: options.tone,
      empathyLevel: userMoodContext?.isCrisis ? 0.9 : 0.7,
      responseStrategy: getResponseStrategy(userMoodContext, options.tone),
      priority: options.suggestedResponseTone?.priority,
      action: options.suggestedResponseTone?.action,
      responseSpeed: options.suggestedResponseTone?.responseSpeed,
    } : undefined,
    moodAnalysis: options?.moodData ? {
      ...options.moodData,
      analyzedAt: new Date().toISOString(),
      suggestedResponseTone: options.suggestedResponseTone,
    } : undefined,
  };
  
  return aiMessage;
};

// 🔥 UPDATED: Helper to get appropriate response strategy
const getResponseStrategy = (
  userMood?: MoodAnalysisData,
  tone?: 'empathetic' | 'clinical' | 'reassuring' | 'informative' | 'crisis_intervention' | 'calm_reassuring' | 'positive_engaging' | 'professional_careful'
): string => {
  if (userMood?.isCrisis) {
    return 'CRISIS_INTERVENTION';
  }
  
  if (userMood?.stressScore && userMood.stressScore > 0.8) {
    return 'HIGH_STRESS_SUPPORT';
  }
  
  if (userMood?.moodScore && userMood.moodScore < -0.5) {
    return 'EMOTIONAL_SUPPORT';
  }
  
  if (userMood?.healthcareContext?.mentionsPain) {
    return 'PAIN_MANAGEMENT_FOCUS';
  }
  
  if (userMood?.healthcareContext?.mentionsMedication) {
    return 'MEDICATION_SAFETY_FOCUS';
  }
  
  if (tone === 'empathetic' || tone === 'crisis_intervention') {
    return 'EMPATHY_FOCUSED';
  }
  
  if (tone === 'clinical' || tone === 'professional_careful') {
    return 'FACT_BASED';
  }
  
  if (tone === 'reassuring' || tone === 'calm_reassuring') {
    return 'REASSURANCE_FOCUSED';
  }
  
  if (tone === 'positive_engaging') {
    return 'POSITIVE_REINFORCEMENT';
  }
  
  return 'STANDARD_RESPONSE';
};

// Convenience factories
export const isUserMessage = (m: ChatMessage) => m.isUser;
export const isBotMessage = (m: ChatMessage) => !m.isUser;

// 🔥 UPDATED: Check if message has mood analysis
export const hasMoodAnalysis = (m: ChatMessage): boolean => {
  return m.moodScore !== undefined || 
         m.metadata?.moodAnalysis !== undefined;
};

// 🔥 UPDATED: Get mood color for UI (based on moodScore)
export const getMoodColor = (moodScore?: number): string => {
  if (moodScore === undefined) return '#CCCCCC'; // Gray for unknown
  
  if (moodScore > 0.7) return '#4CAF50'; // Green for very positive
  if (moodScore > 0.3) return '#8BC34A'; // Light green for positive
  if (moodScore > -0.3) return '#FFC107'; // Yellow for neutral
  if (moodScore > -0.7) return '#FF9800'; // Orange for negative
  return '#F44336'; // Red for very negative
};

// 🔥 UPDATED: Get emotion emoji for UI
export const getEmotionEmoji = (emotion?: EmotionType): string => {
  switch (emotion) {
    case 'positive': return '😊';
    case 'happy': return '😄';
    case 'neutral': return '😐';
    case 'negative': return '😔';
    case 'sad': return '😢';
    case 'anxious': return '😰';
    case 'stressed': return '😫';
    case 'depressed': return '😞';
    case 'crisis': return '🚨';
    case 'health-concern': return '🏥';
    case 'empathetic': return '🤗';
    case 'reassuring': return '🫂';
    case 'concerned': return '😟';
    case 'angry': return '😠';
    case 'frustrated': return '😤';
    case 'calm': return '😌';
    case 'excited': return '🤩';
    case 'slightly-positive': return '🙂';
    case 'slightly-negative': return '🙁';
    case 'very-positive': return '😁';
    case 'very-negative': return '😭';
    case 'high-stress': return '😓';
    case 'distressed': return '😥';
    case 'worried': return '😟';
    case 'mild-concern': return '😕';
    case 'urgent': return '⚠️';
    case 'supportive': return '🤝';
    case 'encouraging': return '💪';
    default: return '💬';
  }
};

// 🔥 NEW: Get emotion icon name for MaterialIcons
export const getEmotionIcon = (emotion?: EmotionType): string => {
  switch (emotion) {
    case 'positive': return 'sentiment-very-satisfied';
    case 'happy': return 'sentiment-very-satisfied';
    case 'neutral': return 'sentiment-neutral';
    case 'negative': return 'sentiment-dissatisfied';
    case 'sad': return 'sentiment-very-dissatisfied';
    case 'anxious': return 'sentiment-very-dissatisfied';
    case 'stressed': return 'nervous';
    case 'depressed': return 'sentiment-very-dissatisfied';
    case 'crisis': return 'warning';
    case 'health-concern': return 'medical-services';
    case 'empathetic': return 'emoji-emotions';
    case 'reassuring': return 'self-improvement';
    case 'concerned': return 'sentiment-dissatisfied';
    case 'angry': return 'sentiment-very-dissatisfied';
    case 'frustrated': return 'mood-bad';
    case 'calm': return 'self-improvement';
    case 'excited': return 'celebration';
    case 'slightly-positive': return 'sentiment-satisfied';
    case 'slightly-negative': return 'sentiment-slightly-dissatisfied';
    case 'very-positive': return 'sentiment-very-satisfied';
    case 'very-negative': return 'sentiment-very-dissatisfied';
    case 'high-stress': return 'nervous';
    case 'distressed': return 'sentiment-very-dissatisfied';
    case 'worried': return 'sentiment-dissatisfied';
    case 'mild-concern': return 'sentiment-slightly-dissatisfied';
    case 'urgent': return 'warning';
    case 'supportive': return 'support';
    case 'encouraging': return 'thumb-up';
    default: return 'chat';
  }
};

// Format message time
export const formatMessageTime = (ts: Date) =>
  ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Filter messages by conversation
export const filterMessagesByConversation = (
  messages: ChatMessage[], 
  conversationId: string
): ChatMessage[] => {
  return messages.filter(msg => msg.conversationId === conversationId);
};

// 🔥 UPDATED: Get average mood for a conversation
export const getConversationMoodTrend = (
  messages: ChatMessage[]
): {
  averageMood: number;
  averageStress: number;
  dominantEmotion: EmotionType;
  moodTrend: 'improving' | 'worsening' | 'stable';
  crisisCount: number;
  insights?: ConversationInsights;
} => {
  const userMessages = messages.filter(isUserMessage);
  const aiMessages = messages.filter(isBotMessage);
  
  const userMoods = userMessages
    .filter(m => m.moodScore !== undefined)
    .map(m => m.moodScore!);
  
  const userStresses = userMessages
    .filter(m => m.stressScore !== undefined)
    .map(m => m.stressScore!);
  
  // Calculate averages
  const averageMood = userMoods.length > 0 
    ? userMoods.reduce((a, b) => a + b, 0) / userMoods.length 
    : 0;
    
  const averageStress = userStresses.length > 0
    ? userStresses.reduce((a, b) => a + b, 0) / userStresses.length
    : 0;
  
  // Determine dominant emotion
  const emotionCounts = new Map<EmotionType, number>();
  userMessages.forEach(m => {
    if (m.emotion) {
      emotionCounts.set(m.emotion, (emotionCounts.get(m.emotion) || 0) + 1);
    }
  });
  
  let dominantEmotion: EmotionType = 'neutral';
  let maxCount = 0;
  emotionCounts.forEach((count, emotion) => {
    if (count > maxCount) {
      maxCount = count;
      dominantEmotion = emotion;
    }
  });
  
  // Determine mood trend (compare first half vs second half)
  let moodTrend: 'improving' | 'worsening' | 'stable' = 'stable';
  if (userMoods.length >= 4) {
    const half = Math.floor(userMoods.length / 2);
    const firstHalfAvg = userMoods.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalfAvg = userMoods.slice(half).reduce((a, b) => a + b, 0) / (userMoods.length - half);
    
    if (secondHalfAvg - firstHalfAvg > 0.2) moodTrend = 'improving';
    else if (firstHalfAvg - secondHalfAvg > 0.2) moodTrend = 'worsening';
  }
  
  // Generate insights
  const insights: ConversationInsights = {
    moodTrend,
    averageMood: parseFloat(averageMood.toFixed(3)),
    averageStress: parseFloat(averageStress.toFixed(3)),
    dominantEmotions: Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage: ((count / userMessages.length) * 100).toFixed(1)
      })),
    crisisCount: userMessages.filter(m => m.isCrisis).length,
    messageCount: userMessages.length,
    summary: generateConversationSummary(averageMood, averageStress, moodTrend, userMessages.filter(m => m.isCrisis).length, userMessages.length),
    keyMetrics: {
      veryPositiveMessages: userMoods.filter(score => score > 0.7).length,
      veryNegativeMessages: userMoods.filter(score => score < -0.7).length,
      highStressMessages: userStresses.filter(score => score > 0.8).length,
      questionsAsked: userMessages.filter(m => m.text.includes('?')).length,
      averageMessageLength: Math.round(userMessages.reduce((sum, m) => sum + m.text.length, 0) / userMessages.length) || 0,
    }
  };
  
  return {
    averageMood,
    averageStress,
    dominantEmotion,
    moodTrend,
    crisisCount: userMessages.filter(m => m.isCrisis).length,
    insights
  };
};

// 🔥 NEW: Generate conversation summary
const generateConversationSummary = (
  avgMood: number,
  avgStress: number,
  moodTrend: string,
  crisisCount: number,
  totalMessages: number
): string => {
  const moodLevel = avgMood > 0.7 ? 'very positive' :
                   avgMood > 0.3 ? 'positive' :
                   avgMood > -0.3 ? 'neutral' :
                   avgMood > -0.7 ? 'negative' : 'very negative';

  const stressLevel = avgStress < 0.3 ? 'low' : 
                     avgStress < 0.6 ? 'moderate' : 
                     avgStress < 0.8 ? 'high' : 'very high';

  let summary = `Analysis of ${totalMessages} messages shows ${moodLevel} mood with ${stressLevel} stress levels. `;
  summary += `Overall emotional tone is ${moodTrend}. `;
  
  if (crisisCount > 0) {
    summary += `⚠️ ${crisisCount} crisis ${crisisCount === 1 ? 'message was' : 'messages were'} detected. `;
  }
  
  if (avgStress > 0.7) {
    summary += `High stress indicators suggest benefit from stress management support. `;
  }
  
  if (avgMood < -0.5) {
    summary += `Negative mood patterns indicate potential need for increased emotional support.`;
  }

  return summary.trim();
};

// A typed message helper (if you want an explicit typed object)
export const createTypedMessage = (
  text: string,
  conversationId: string,
  type: MessageType = 'text',
  data?: any
): ChatMessage => createChatMessage(text, false, conversationId, { 
  type: type as any, 
  metadata: data 
});

// 🔥 UPDATED: Update message with mood data
export const updateMessageWithMood = (
  message: ChatMessage,
  moodData: MoodAnalysisData
): ChatMessage => {
  return {
    ...message,
    moodScore: moodData.moodScore,
    stressScore: moodData.stressScore,
    emotion: moodData.emotion,
    isCrisis: moodData.isCrisis,
    isAnalyzing: false,
    metadata: {
      ...message.metadata,
      moodAnalysis: {
        ...moodData,
        analyzedAt: moodData.analyzedAt || new Date().toISOString(),
      },
    },
  };
};

// 🔥 NEW: Check if message needs mood analysis
export const needsMoodAnalysis = (message: ChatMessage): boolean => {
  // Only analyze text messages that don't already have mood data
  return (!message.isUser && 
          !message.isAnalyzing && 
          message.moodScore === undefined && 
          message.type === 'text');
};

// 🔥 UPDATED: Validate mood data
export const isValidMoodData = (data: any): data is MoodAnalysisData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.moodScore === 'number' &&
    typeof data.stressScore === 'number' &&
    typeof data.emotion === 'string' &&
    data.moodScore >= -1 && data.moodScore <= 1 &&
    data.stressScore >= 0 && data.stressScore <= 1
  );
};

// 🔥 NEW: Get suggested response tone based on mood
export const getSuggestedToneFromMood = (moodData: MoodAnalysisData): SuggestedResponseTone => {
  if (moodData.suggestedResponseTone) {
    return moodData.suggestedResponseTone;
  }
  
  // Fallback logic if suggestedResponseTone is not provided
  if (moodData.isCrisis) {
    return {
      tone: 'CRISIS_INTERVENTION',
      priority: 'HIGHEST',
      action: 'PROVIDE_EMERGENCY_RESOURCES',
      empathyLevel: 'VERY_HIGH',
      responseSpeed: 'IMMEDIATE',
      responseLength: 'SHORT_DIRECT',
      focus: 'SAFETY_AND_SUPPORT'
    };
  }
  
  if (moodData.stressScore && moodData.stressScore > 0.8) {
    return {
      tone: 'CALM_REASSURING',
      priority: 'HIGH',
      action: 'REASSURE_AND_SUPPORT',
      empathyLevel: 'HIGH',
      responseSpeed: 'FAST',
      responseLength: 'MODERATE',
      focus: 'EMOTIONAL_SUPPORT'
    };
  }
  
  if (moodData.moodScore && moodData.moodScore < -0.5) {
    return {
      tone: 'EMPATHETIC_VALIDATING',
      priority: 'MEDIUM_HIGH',
      action: 'VALIDATE_EMOTIONS',
      empathyLevel: 'HIGH',
      responseSpeed: 'NORMAL',
      responseLength: 'MODERATE',
      focus: 'EMOTIONAL_VALIDATION'
    };
  }
  
  // Default tone
  return {
    tone: 'NEUTRAL_HELPFUL',
    priority: 'LOW',
    action: 'PROVIDE_INFORMATION',
    empathyLevel: 'MEDIUM',
    responseSpeed: 'NORMAL',
    responseLength: 'VARIABLE',
    focus: 'INFORMATION_PROVISION'
  };
};

// 🔥 NEW: Extract healthcare context from message
export const extractHealthcareContext = (message: ChatMessage): HealthcareContext | undefined => {
  if (message.metadata?.moodAnalysis?.healthcareContext) {
    return message.metadata.moodAnalysis.healthcareContext;
  }
  
  // Fallback: simple keyword detection
  const text = message.text.toLowerCase();
  return {
    hasCrisisKeyword: false,
    hasUrgency: text.includes('urgent') || text.includes('emergency'),
    mentionsPain: text.includes('pain') || text.includes('hurt'),
    mentionsMedication: text.includes('medication') || text.includes('pill'),
    wordCount: message.text.split(' ').length,
    hasQuestion: message.text.includes('?'),
    hasExclamation: message.text.includes('!'),
    allCapsRatio: (message.text.match(/[A-Z]/g)?.length || 0) / message.text.length || 0,
    exclamationCount: (message.text.match(/!/g) || []).length,
    questionCount: (message.text.match(/\?/g) || []).length,
  };
};