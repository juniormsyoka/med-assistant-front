// services/MoodAnalysisManager.ts
export class MoodAnalysisManager {
  private static instance: MoodAnalysisManager;
  private analysisQueue: Array<{text: string, messageId: string, conversationId: string}> = [];
  private lastAnalysisTime = 0;
  private messageCount = 0;
  private currentMoodState: 'calm' | 'stressed' | 'crisis' = 'calm';
  
  // Lightweight keyword detection (client-side)
  private crisisKeywords = [
    'suicide', 'kill myself', 'want to die', 'end it all',
    'helpless', 'hopeless', 'cant take it', 'emergency',
    '911', 'hospital', 'pain', 'chest pain', 'bleeding'
  ];
  
  private stressKeywords = [
    'anxious', 'worried', 'scared', 'afraid', 'nervous',
    'stress', 'overwhelmed', 'cant sleep', 'panic'
  ];
  
  private constructor() {}
  
  static getInstance(): MoodAnalysisManager {
    if (!MoodAnalysisManager.instance) {
      MoodAnalysisManager.instance = new MoodAnalysisManager();
    }
    return MoodAnalysisManager.instance;
  }
  
  shouldAnalyzeMessage(text: string, isUser: boolean): {
    shouldAnalyze: boolean;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  } {
    // Only analyze user messages
    if (!isUser) return { shouldAnalyze: false, priority: 'low', reason: 'ai_message' };
    
    this.messageCount++;
    
    // HIGH PRIORITY: Crisis detection
    if (this.containsKeywords(text, this.crisisKeywords)) {
      this.currentMoodState = 'crisis';
      return { 
        shouldAnalyze: true, 
        priority: 'high', 
        reason: 'crisis_keywords' 
      };
    }
    
    // MEDIUM PRIORITY: Stress indicators
    if (this.containsKeywords(text, this.stressKeywords)) {
      this.currentMoodState = 'stressed';
      return { 
        shouldAnalyze: true, 
        priority: 'medium', 
        reason: 'stress_keywords' 
      };
    }
    
    // Adaptive sampling based on current state
    const sampleRate = this.getSampleRate();
    if (this.messageCount >= sampleRate) {
      this.messageCount = 0;
      return { 
        shouldAnalyze: true, 
        priority: 'low', 
        reason: 'periodic_sampling' 
      };
    }
    
    // Time-based sampling (every 3 minutes)
    const now = Date.now();
    if (now - this.lastAnalysisTime > 3 * 60 * 1000) {
      this.lastAnalysisTime = now;
      return { 
        shouldAnalyze: true, 
        priority: 'low', 
        reason: 'time_based' 
      };
    }
    
    return { shouldAnalyze: false, priority: 'low', reason: 'sampled_out' };
  }
  
  queueForAnalysis(text: string, messageId: string, conversationId: string): void {
    this.analysisQueue.push({ text, messageId, conversationId });
    
    // Process queue when it reaches a certain size
    if (this.analysisQueue.length >= 5) {
      this.processBatch();
    }
  }
  
  private async processBatch(): Promise<void> {
    if (this.analysisQueue.length === 0) return;
    
    const batch = this.analysisQueue.splice(0, 5); // Take first 5 items
    
    try {
      const API_BASE_URL = "https://med-assistant-backend.onrender.com";
      const response = await fetch(`${API_BASE_URL}/api/mood/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: batch.map(item => ({
            text: item.text,
            id: item.messageId,
            isUser: true
          })),
          conversationId: batch[0].conversationId,
          analysisType: 'comprehensive'
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Batch analysis completed:', result);
      }
    } catch (error) {
      console.error('❌ Batch analysis failed:', error);
    }
  }
  
  private getSampleRate(): number {
    switch(this.currentMoodState) {
      case 'crisis': return 1;    // Every message
      case 'stressed': return 3;  // Every 3 messages
      case 'calm': return 7;      // Every 7 messages
      default: return 5;
    }
  }
  
  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
  }
}