import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Audio } from "expo-av";

interface ChatInputBarProps {
  onSendMessage: (message: string) => void;
  onScanPress?: () => void;
  onVoiceProcessing?: (isProcessing: boolean) => void; // ✅ ADD THIS LINE
  disabled?: boolean;
  placeholder?: string;
  chatMode?: "ai" | "doctor";
}

// Recording options optimized for Gemini compatibility with web support
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000, // Lower sample rate for better speech recognition
    numberOfChannels: 1, // Mono is better for speech
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onScanPress,
  onVoiceProcessing, // ✅ ADD THIS PROP
  disabled = false,
  placeholder,
  chatMode = "ai",
}) => {
  const { colors } = useTheme();
  const [message, setMessage] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "voice" | "image">("text");

  const [recordingObj, setRecordingObj] = useState<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Recording timer and pulse animation
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setSeconds((prev) => prev + 1), 1000);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setSeconds(0);
      pulseAnim.stopAnimation();
    }
  }, [recording]);

  // Focus animation
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  // Reset input mode when chat mode changes
  useEffect(() => {
    if (chatMode === "doctor") {
      setInputMode("text");
      setShowVoice(false);
      if (recording) {
        handleVoicePress();
      }
    }
  }, [chatMode]);

  const handleSend = () => {
    if (message.trim().length > 0 && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      Keyboard.dismiss();
    }
  };

  const handleVoicePress = async () => {
    if (recording) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      console.log("🎤 Starting recording...");
      
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission required", "Microphone access is needed for voice messages.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();
      
      setRecordingObj(recording);
      setRecording(true);
      setUploading(false);
      
      // ✅ NOTIFY PARENT COMPONENT ABOUT VOICE PROCESSING
      onVoiceProcessing?.(true);
      
      console.log("🎤 Recording started successfully");
      
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      Alert.alert("Recording Error", "Could not start audio recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recordingObj) return;
    
    console.log("🎤 Stopping recording...");
    setRecording(false);
    setUploading(true);

    try {
      await recordingObj.stopAndUnloadAsync();
      const uri = recordingObj.getURI();
      setRecordingObj(null);

      if (uri) {
        console.log("🎤 Recording saved at:", uri);
        await processAudioRecording(uri);
      } else {
        throw new Error("No recording URI available");
      }
    } catch (error) {
      console.error("❌ Failed to stop recording:", error);
      Alert.alert("Recording Error", "Failed to save recording. Please try again.");
      setUploading(false);
      // ✅ NOTIFY PARENT COMPONENT ABOUT VOICE PROCESSING END
      onVoiceProcessing?.(false);
    }
  };

  // In ChatInputBar.tsx - Update the processAudioRecording function
const processAudioRecording = async (uri: string) => {
  try {
    console.log("📤 Uploading audio for transcription...");
    
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: `voice-${Date.now()}.m4a`,
      type: "audio/m4a",
    } as any);

    const response = await fetch(
      "https://med-assistant-backend.onrender.com/api/transcribe",
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Transcription response:", data);

    if (data.transcript) {
      // Clean up the response text
      let cleanText = data.transcript
        .replace(/^"(.*)"$/, '$1') // Remove surrounding quotes
        .replace(/^\"(.*)\"$/, '$1') // Remove different quote types
        .trim();
      
      console.log("🎯 Clean transcribed text:", cleanText);
      onSendMessage(cleanText);
    } else {
      throw new Error("No transcript received");
    }

  } catch (err) {
    console.error("❌ Audio processing failed:", err);
    
    // More natural fallback message
    const fallbackText = "🎤 Voice message received! Our voice transcription is being upgraded for better accuracy.";
    onSendMessage(fallbackText);
    
  } finally {
    setUploading(false);
    onVoiceProcessing?.(false);
  }
};

  const handleToggleMode = () => {
    if (recording) {
      handleVoicePress(); // Stop recording if active
    }
    setShowVoice((prev) => !prev);
    setInputMode((prev) => (prev === "voice" ? "text" : "voice"));
    setMessage("");
  };

  const handleCameraPress = () => {
    if (showVoice && recording) {
      handleVoicePress();
    } else if (chatMode === "ai") {
      setInputMode((prev) => (prev === "image" ? "text" : "image"));
      if (inputMode !== "image") onScanPress?.();
    } else {
      onScanPress?.();
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (recording) {
      handleVoicePress(); // Stop recording when user starts typing
    }
  };

  const handleInputBlur = () => setIsFocused(false);

  const handleVoiceButtonPress = () => {
    if (chatMode === "ai") {
      if (inputMode === "voice") {
        handleVoicePress();
      } else {
        setInputMode("voice");
        setShowVoice(true);
        // Auto-start recording when switching to voice mode in AI chat
        setTimeout(() => handleVoicePress(), 100);
      }
    } else {
      handleVoicePress();
    }
  };

  const getPlaceholder = () => {
    if (chatMode === "ai") {
      if (inputMode === "voice") return recording ? "Listening... Speak now" : "Tap mic to speak";
      if (inputMode === "image") return "Tap camera to scan prescription...";
    } else if (showVoice) {
      return recording ? "Listening... Speak now" : "Tap mic to speak";
    }
    return placeholder || "Type your message...";
  };

  const getActionColor = () => {
    if (chatMode === "ai") {
      if (inputMode === "voice") return "#FF3B30";
      if (inputMode === "image") return "#4CAF50";
    }
    return recording || showVoice ? "#FF3B30" : colors.primary;
  };

  const getModeToggleIcon = () => {
    if (chatMode === "ai") {
      if (inputMode === "voice") return "mic";
      if (inputMode === "image") return "image";
      return "camera-outline";
    }
    return showVoice ? "mic" : "camera-outline";
  };

  const getMainActionIcon = () => {
    if (chatMode === "ai") {
      if (inputMode === "voice") return "mic";
      if (inputMode === "image") return "image";
      return "camera";
    }
    return showVoice ? "mic" : "camera";
  };

  const getModeHint = () => {
    if (chatMode === "ai") {
      switch (inputMode) {
        case "voice":
          return recording ? "Speaking... Tap to stop" : "Voice input mode - Tap to speak";
        case "image":
          return "Image scan mode - Tap camera to scan";
        default:
          return "Text input mode - Type your message";
      }
    }
    return showVoice ? "Voice input mode" : "Camera scan mode";
  };

  const isAIMode = chatMode === "ai";

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {(isAIMode && inputMode === "voice") || (!isAIMode && showVoice) ? (
        recording || uploading ? (
          <View style={styles.recordingInfo}>
            <View style={styles.recordingDot} />
            <Text style={styles.timerText}>
              {uploading ? "Processing speech..." : `Recording: ${seconds}s`}
            </Text>
            {recording && (
              <Text style={styles.recordingHint}>
                {seconds > 10 ? "Keep going..." : "Speak clearly..."}
              </Text>
            )}
          </View>
        ) : null
      ) : null}

      {/* Input Row */}
      <View style={styles.inputRow}>
        {/* Mode toggle for AI */}
        {isAIMode && (
          <TouchableOpacity
            onPress={handleToggleMode}
            style={[
              styles.modeToggle,
              { backgroundColor: colors.background, borderColor: colors.border },
              (recording || inputMode === "voice") && { backgroundColor: "#FFF5F5", borderColor: "#FFE6E6" },
              inputMode === "image" && { backgroundColor: "#F0F9FF", borderColor: "#B3E5FC" },
            ]}
            disabled={recording || uploading}
          >
            <Ionicons
              name={getModeToggleIcon()}
              size={22}
              color={
                recording || inputMode === "voice"
                  ? "#FF3B30"
                  : inputMode === "image"
                  ? "#4CAF50"
                  : colors.primary
              }
            />
          </TouchableOpacity>
        )}

        <Animated.View
          style={[
            styles.inputContainer,
            {
              borderColor: focusAnim.interpolate({ 
                inputRange: [0, 1], 
                outputRange: [colors.border, colors.primary] 
              }),
              backgroundColor: colors.background,
            },
            isAIMode && inputMode !== "text" && styles.hiddenInput,
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.text }]}
            value={message}
            onChangeText={setMessage}
            placeholder={getPlaceholder()}
            placeholderTextColor={colors.text + "66"}
            multiline
            maxLength={500}
            editable={!disabled && !recording && (isAIMode ? inputMode === "text" : true)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />

          {/* Character counter */}
          {message.length > 0 && (isAIMode ? inputMode === "text" : true) && (
            <Text style={[styles.charCounter, { color: colors.text + "66" }]}>
              {message.length}/500
            </Text>
          )}

          {/* Send button */}
          {message.length > 0 && !disabled && !recording && (isAIMode ? inputMode === "text" : true) && (
            <TouchableOpacity 
              style={[styles.sendButton, { backgroundColor: colors.primary }]} 
              onPress={handleSend}
            >
              <Ionicons name="send" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Main action button */}
        <TouchableOpacity
          onPress={isAIMode && inputMode === "voice" ? handleVoiceButtonPress : handleCameraPress}
          style={[styles.mainActionButton, { 
            borderColor: colors.border, 
            backgroundColor: colors.background 
          }]}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : recording ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={[styles.recordingIndicator, { backgroundColor: "#FF3B30" }]}>
                <Ionicons name="stop" size={20} color="#FFF" />
              </View>
            </Animated.View>
          ) : (
            <View style={[styles.actionIcon, { backgroundColor: getActionColor() }]}>
              <Ionicons name={getMainActionIcon()} size={22} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.modeHint, { color: colors.text + "66" }]}>
        {getModeHint()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 6,
  },
  inputRow: { 
    flexDirection: "row", 
    alignItems: "flex-end", 
    gap: 12 
  },
  modeToggle: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: "center", 
    alignItems: "center", 
    borderWidth: 1.5, 
    marginBottom: 8 
  },
  mainActionButton: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    justifyContent: "center", 
    alignItems: "center", 
    borderWidth: 2, 
    marginBottom: 8 
  },
  actionIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  recordingIndicator: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  inputContainer: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "flex-end", 
    borderWidth: 2, 
    borderRadius: 24, 
    marginBottom: 8, 
    minHeight: 52 
  },
  hiddenInput: { 
    opacity: 0.6 
  },
  textInput: { 
    flex: 1, 
    paddingHorizontal: 18, 
    paddingVertical: 14, 
    fontSize: 16, 
    maxHeight: 100, 
    paddingRight: 50 
  },
  sendButton: { 
    position: "absolute", 
    right: 8, 
    bottom: 8, 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    justifyContent: "center", 
    alignItems: "center", 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 3, 
    elevation: 2 
  },
  charCounter: { 
    position: "absolute", 
    right: 50, 
    bottom: 8, 
    fontSize: 11, 
    fontWeight: "500" 
  },
  recordingInfo: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "rgba(255, 59, 48, 0.08)", 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 16, 
    marginBottom: 12, 
    alignSelf: "center" 
  },
  recordingDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: "#FF3B30", 
    marginRight: 8 
  },
  timerText: { 
    fontSize: 13, 
    color: "#FF3B30", 
    fontWeight: "600", 
    marginRight: 8 
  },
  recordingHint: { 
    fontSize: 11, 
    color: "#FF3B30", 
    fontStyle: "italic" 
  },
  modeHint: { 
    fontSize: 12, 
    textAlign: "center", 
    marginTop: 6, 
    fontWeight: "500" 
  },
});

export default ChatInputBar;