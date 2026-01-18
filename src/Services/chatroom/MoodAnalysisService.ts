// services/MoodAnalysisService.ts
import NetInfo from '@react-native-community/netinfo';
import { MoodAnalysisData, EmotionType } from '../../models/ChatMessage';
import { MoodAnalysisManager } from '../MoodAnalysisManager';

export interface MoodAnalysisConfig {
  API_BASE_URL: string;
  FALLBACK_URLS: string[];
  MOOD_ANALYSIS_TIMEOUT: number;
  USE_LOCAL_FALLBACK: boolean;
  BATCH_ANALYSIS_THRESHOLD: number;
}

export const DEFAULT_MOOD_CONFIG: MoodAnalysisConfig = {
  API_BASE_URL: "https://med-assistant-backend.onrender.com",
  FALLBACK_URLS: [
    "https://med-assistant-backend.onrender.com",
    "http://localhost:5000"
  ],
  MOOD_ANALYSIS_TIMEOUT: 5000,
  USE_LOCAL_FALLBACK: true,
  BATCH_ANALYSIS_THRESHOLD: 5,
};

// Local fallback sentiment analyzer
const localSentimentAnalyzer = {
  analyze: (text: string, analyzeFor: 'user' | 'ai' = 'user'): MoodAnalysisData => {
    const textLower = text.toLowerCase();
    
    // Simple keyword detection
    const positiveWords = ['good', 'great', 'better', 'thanks', 'thank', 'happy', 'well', 'okay'];
    const negativeWords = ['bad', 'terrible', 'worse', 'pain', 'hurt', 'anxious', 'worried', 'scared'];
    const crisisWords = ['suicide', 'kill myself', 'end my life', 'want to die'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (textLower.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (textLower.includes(word)) negativeCount++;
    });
    
    const hasCrisisWord = crisisWords.some(word => textLower.includes(word));
    
    // Calculate simple scores
    let moodScore = 0;
    if (positiveCount > negativeCount) {
      moodScore = 0.5;
    } else if (negativeCount > positiveCount) {
      moodScore = -0.5;
    }
    
    const stressScore = Math.min(1, negativeCount * 0.2);
    
    // Simple emotion detection
    let emotion: EmotionType = 'neutral';
    if (hasCrisisWord) emotion = 'crisis';
    else if (negativeCount > 0) emotion = 'stressed';
    else if (positiveCount > 0) emotion = 'positive';
    
    return {
      moodScore,
      stressScore,
      emotion,
      isCrisis: hasCrisisWord,
      confidence: 0.6,
      analyzedAt: new Date().toISOString(),
      source: 'local-fallback'
    };
  }
};

export class MoodAnalysisService {
  private static instance: MoodAnalysisService;
  private config: MoodAnalysisConfig;
  private isOnline: boolean = true;

  private constructor(config: MoodAnalysisConfig = DEFAULT_MOOD_CONFIG) {
    this.config = config;
    this.setupNetworkListener();
  }

  static getInstance(config?: MoodAnalysisConfig): MoodAnalysisService {
    if (!MoodAnalysisService.instance) {
      MoodAnalysisService.instance = new MoodAnalysisService(config);
    }
    return MoodAnalysisService.instance;
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      console.log('🌐 MoodService Network status:', this.isOnline ? 'Online' : 'Offline');
    });
  }

  async analyzeMood(
    text: string, 
    analyzeFor: 'user' | 'ai' = 'user',
    retries: number = 2
  ): Promise<MoodAnalysisData> {
    
    // Check if we should analyze this message
    const moodManager = MoodAnalysisManager.getInstance();
    const analysisDecision = moodManager.shouldAnalyzeMessage(text, true);
    
    if (!analysisDecision.shouldAnalyze) {
      return {
        moodScore: 0.5,
        stressScore: 0.5,
        emotion: 'neutral',
        isCrisis: false,
        confidence: 0.5,
        analyzedAt: new Date().toISOString(),
        source: 'skipped',
        analysisDecision
      };
    }

    // If offline, use local fallback immediately
    if (!this.isOnline) {
      console.log('📴 Offline - using local sentiment analysis');
      const localResult = localSentimentAnalyzer.analyze(text, analyzeFor);
      return { ...localResult, analysisDecision };
    }

    // Try each URL with retries
    for (let urlIndex = 0; urlIndex < this.config.FALLBACK_URLS.length; urlIndex++) {
      const baseUrl = this.config.FALLBACK_URLS[urlIndex];
      
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          console.log(`🔍 Analyzing mood (attempt ${attempt + 1}) with ${baseUrl}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(), 
            this.config.MOOD_ANALYSIS_TIMEOUT
          );

          const response = await fetch(`${baseUrl}/api/mood`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: text,
              analyzeFor: analyzeFor
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const rawMoodData = await response.json();
          
          if (!rawMoodData.success) {
            throw new Error('API returned unsuccessful response');
          }

          console.log('✅ Mood analysis successful from:', baseUrl);
          
          return {
            moodScore: rawMoodData.moodScore ?? 0.5,
            stressScore: rawMoodData.stressScore ?? 0.5,
            emotion: (rawMoodData.emotion as EmotionType) ?? 'neutral',
            isCrisis: rawMoodData.isCrisis ?? false,
            confidence: rawMoodData.confidence ?? 0.7,
            analyzedAt: new Date().toISOString(),
            source: 'api',
            rawData: rawMoodData,
            suggestedResponseTone: rawMoodData.suggestedResponseTone,
            analysisDecision
          };
          
        } catch (error) {
          console.warn(`⚠️ Mood analysis attempt ${attempt + 1} failed for ${baseUrl}:`, error);
          
          // Wait before retry (exponential backoff)
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
    }

    // All API attempts failed, use local fallback if enabled
    if (this.config.USE_LOCAL_FALLBACK) {
      console.log('🔄 All API attempts failed, using local fallback');
      const localResult = localSentimentAnalyzer.analyze(text, analyzeFor);
      return { ...localResult, analysisDecision };
    }

    // Return neutral if all else fails
    return {
      moodScore: 0.5,
      stressScore: 0.5,
      emotion: 'neutral',
      isCrisis: false,
      confidence: 0.3,
      analyzedAt: new Date().toISOString(),
      source: 'fallback-neutral',
      analysisDecision
    };
  }

  async analyzeBatch(
    messages: Array<{ text: string; analyzeFor: 'user' | 'ai' }>,
    conversationId: string
  ): Promise<MoodAnalysisData[]> {
    if (messages.length < this.config.BATCH_ANALYSIS_THRESHOLD) {
      // Analyze individually
      const results = await Promise.all(
        messages.map(msg => this.analyzeMood(msg.text, msg.analyzeFor, 1))
      );
      return results;
    }

    // Use batch endpoint for efficiency
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(), 
        this.config.MOOD_ANALYSIS_TIMEOUT * 2
      );

      const response = await fetch(`${this.config.API_BASE_URL}/api/mood/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((msg, index) => ({
            text: msg.text,
            analyzeFor: msg.analyzeFor,
            id: `batch-${conversationId}-${index}`
          })),
          conversationId,
          analysisType: 'comprehensive'
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Batch analysis failed: ${response.status}`);
      }

      const batchData = await response.json();
      
      if (!batchData.success) {
        throw new Error('Batch API returned unsuccessful response');
      }

      return batchData.individualResults.map((result: any) => ({
        moodScore: result.analysis?.moodScore ?? 0.5,
        stressScore: result.analysis?.stressScore ?? 0.5,
        emotion: (result.analysis?.emotion as EmotionType) ?? 'neutral',
        isCrisis: result.analysis?.isCrisis ?? false,
        confidence: result.analysis?.confidence ?? 0.7,
        analyzedAt: new Date().toISOString(),
        source: 'batch-api',
        rawData: result
      }));

    } catch (error) {
      console.error('❌ Batch analysis failed, falling back to individual:', error);
      // Fallback to individual analysis
      const results = await Promise.all(
        messages.map(msg => this.analyzeMood(msg.text, msg.analyzeFor, 1))
      );
      return results;
    }
  }

  checkForCrisis(moodData: MoodAnalysisData, text: string): boolean {
    return moodData.isCrisis || (moodData.stressScore ?? 0) > 0.85;
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  updateConfig(newConfig: Partial<MoodAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}