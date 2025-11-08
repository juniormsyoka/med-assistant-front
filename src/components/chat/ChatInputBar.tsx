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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { SpeechService } from "../../Services/speechService";

interface ChatInputBarProps {
  onSendMessage: (message: string) => void;
  onScanPress?: () => void;
  disabled?: boolean;
  placeholder?: string,
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onScanPress,
  disabled = false,
  
}) => {
  const { colors } = useTheme();
  const [message, setMessage] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const speechServiceRef = useRef<SpeechService | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // --- Initialize SpeechService ---
  useEffect(() => {
    speechServiceRef.current = new SpeechService(
      (text: string) => setMessage(prev => (prev ? prev + " " : "") + text),
      (error: string) => {
        console.error("Speech recognition error:", error);
        setRecording(false);
        setUploading(false);
      }
    );
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      speechServiceRef.current?.destroy();
    };
  }, []);

  // --- Recording Timer and Pulse Animation ---
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000);
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

  // --- Focus Animation ---
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  // --- Actions ---
  const handleSend = () => {
    if (message.trim().length > 0 && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      Keyboard.dismiss();
    }
  };

  const handleVoicePress = async () => {
    if (!recording) {
      const success = await speechServiceRef.current?.startRecording();
      if (success) {
        setRecording(true);
        setUploading(false);
        Keyboard.dismiss();
      }
    } else {
      setRecording(false);
      setUploading(true);
      setTimeout(() => {
        speechServiceRef.current?.stopRecording();
        setUploading(false);
        if (message.trim().length > 0) handleSend();
      }, 500);
    }
  };

  const handleToggleMode = () => {
    if (recording) handleVoicePress();
    setShowVoice(prev => !prev);
    setMessage("");
  };

  const handleCameraPress = () => {
    if (showVoice && recording) handleVoicePress();
    else onScanPress?.();
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (recording) handleVoicePress();
  };
  const handleInputBlur = () => setIsFocused(false);

  const getPlaceholder = () => {
    if (showVoice) return recording ? "Listening... Speak now" : "Tap mic to speak";
    return "Type your message...";
  };

  const getActionColor = () => (recording || showVoice ? "#FF3B30" : colors.primary);

  // --- Render ---
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Recording info */}
      {showVoice && (recording || uploading) && (
        <View style={styles.recordingInfo}>
          <View style={styles.recordingDot} />
          <Text style={styles.timerText}>{uploading ? "Processing speech..." : `Recording: ${seconds}s`}</Text>
          {recording && <Text style={styles.recordingHint}>Tap stop or start typing to end</Text>}
        </View>
      )}

      <View style={styles.inputRow}>
        {/* Mode Toggle */}
        <TouchableOpacity
          onPress={handleToggleMode}
          style={[
            styles.modeToggle,
            { backgroundColor: colors.background, borderColor: colors.border },
            recording && { backgroundColor: "#FFF5F5", borderColor: "#FFE6E6" },
          ]}
          disabled={recording || uploading}
        >
          <Ionicons name={showVoice ? "mic" : "camera-outline"} size={22} color={recording ? "#FF3B30" : colors.primary} />
        </TouchableOpacity>

        {/* Input */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              borderColor: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] }),
              backgroundColor: colors.background,
            },
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
            editable={!disabled && !recording}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />

          {/* Character counter */}
          {message.length > 0 && <Text style={[styles.charCounter, { color: colors.text + "66" }]}>{message.length}/500</Text>}

          {/* Send button */}
          {message.length > 0 && !disabled && !recording && (
            <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={handleSend}>
              <Ionicons name="send" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Main action button */}
        <TouchableOpacity
          onPress={handleCameraPress}
          style={[styles.mainActionButton, { borderColor: colors.border, backgroundColor: colors.background }]}
          disabled={uploading || (showVoice && !recording && message.length > 0)}
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
              <Ionicons name={showVoice ? "mic" : "camera"} size={22} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Mode hint */}
      <Text style={[styles.modeHint, { color: colors.text + "66" }]}>{showVoice ? "Voice input mode" : "Camera scan mode"}</Text>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    marginBottom:0,
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
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  modeToggle: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 1.5, marginBottom: 8 },
  mainActionButton: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center", borderWidth: 2, marginBottom: 8 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  recordingIndicator: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  inputContainer: { flex: 1, flexDirection: "row", alignItems: "flex-end", borderWidth: 2, borderRadius: 24, marginBottom: 8, minHeight: 52 },
  textInput: { flex: 1, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, maxHeight: 100, paddingRight: 50 },
  textInputDisabled: { opacity: 0.6 },
  sendButton: { position: "absolute", right: 8, bottom: 8, width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 },
  charCounter: { position: "absolute", right: 50, bottom: 8, fontSize: 11, fontWeight: "500" },
  recordingInfo: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 59, 48, 0.08)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, marginBottom: 12, alignSelf: "center" },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30", marginRight: 8 },
  timerText: { fontSize: 13, color: "#FF3B30", fontWeight: "600", marginRight: 8 },
  recordingHint: { fontSize: 11, color: "#FF3B30", fontStyle: "italic" },
  modeHint: { fontSize: 12, textAlign: "center", marginTop: 6, fontWeight: "500" },
});

export default ChatInputBar;
