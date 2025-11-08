// Services/speechService.ts
export class SpeechService {
  private onSpeechResultsCallback?: (text: string) => void;
  private onErrorCallback?: (error: string) => void;
  private isRecording = false;
  private recordingTimeout: NodeJS.Timeout | null = null;

  constructor(
    onSpeechResults: (text: string) => void,
    onError?: (error: string) => void
  ) {
    this.onSpeechResultsCallback = onSpeechResults;
    this.onErrorCallback = onError;
  }

  async startRecording(): Promise<boolean> {
    if (this.isRecording) {
      this.onErrorCallback?.("Already recording");
      return false;
    }

    try {
      this.isRecording = true;
     // console.log("🎤 Recording started (simulation)");
      
      // Simulate recording with random results after 2-4 seconds
      const delay = 2000 + Math.random() * 2000;
      
      this.recordingTimeout = setTimeout(() => {
        if (this.isRecording) {
          this.simulateSpeechResult();
        }
      }, delay);

      return true;
    } catch (error) {
      console.error("SpeechService startRecording error:", error);
      this.onErrorCallback?.((error as Error).message || "Failed to start recording");
      this.isRecording = false;
      return false;
    }
  }

  async stopRecording() {
   // console.log("⏹️ Recording stopped (simulation)");
    this.isRecording = false;
    
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
  }

  private simulateSpeechResult() {
    const samplePhrases = [
      "Hello how can I help you today",
      "I need information about my medication",
      "What are the side effects of this drug",
      "When should I take this medicine",
      "Can you remind me about my prescription",
      "I have a question about dosage",
      "Is this medication safe during pregnancy",
      "What foods should I avoid with this medicine",
      "Can you explain the instructions for this prescription",
      "I think I missed a dose what should I do",
      "Are there any interactions with other medications",
      "How long until this medicine starts working",
      "What should I do if I experience side effects",
      "Can this medication be taken with alcohol",
      "I'm having trouble swallowing the pills",
      "Is there a generic version available",
      "Do I need to take this with food",
      "What is the proper storage for this medication",
      "Can I cut the pill in half",
      "How often should I get refills"
    ];
    
    const randomPhrase = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
    //console.log("🗣️ Simulated speech result:", randomPhrase);
    this.onSpeechResultsCallback?.(randomPhrase);
    this.isRecording = false;
  }

  destroy() {
    //console.log("🧹 Speech service destroyed");
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    this.isRecording = false;
  }
}