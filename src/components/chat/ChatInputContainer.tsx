// components/chat/ChatInputContainer.tsx
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import ChatInputBar from './ChatInputBar';
import * as ImagePicker from 'expo-image-picker';

interface ChatInputContainerProps {
  onSendMessage: (text: string) => Promise<void>;
  onScanPress?: () => Promise<void>;
  onVoiceProcessing?: (isProcessing: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  chatMode?: 'ai' | 'doctor';
  showScanButton?: boolean;
  showVoiceButton?: boolean;
}

const ChatInputContainer: React.FC<ChatInputContainerProps> = ({
  onSendMessage,
  onScanPress,
  onVoiceProcessing,
  disabled = false,
  placeholder = 'Type a message...',
  chatMode = 'ai',
  showScanButton = true,
  showVoiceButton = true,
}) => {
  const { colors } = useTheme();

  const handleScanPress = async () => {
    if (chatMode !== "ai") {
      console.log("Doctor mode camera action");
      return;
    }

    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Camera permission is needed to scan prescriptions.",
          [{ text: "OK", style: "default" }]
        );
        return;
      }

      console.log("✅ Camera permission granted");

      // Capture image
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
        base64: true,
        exif: false,
      });

      if (result.canceled) {
        console.log("❌ Camera canceled by user");
        return;
      }

      if (onScanPress) {
        await onScanPress();
      }

    } catch (error) {
      console.error("❌ Scan failed:", error);
      Alert.alert(
        "Scan Error",
        "Failed to access camera. Please check permissions and try again."
      );
    }
  };

  const handleVoiceProcessing = (isProcessing: boolean) => {
    if (onVoiceProcessing) {
      onVoiceProcessing(isProcessing);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <ChatInputBar
        onSendMessage={onSendMessage}
        onScanPress={handleScanPress}
        onVoiceProcessing={handleVoiceProcessing}
        disabled={disabled}
        placeholder={placeholder}
        chatMode={chatMode}
        showScanButton={showScanButton && chatMode === 'ai'}
        showVoiceButton={showVoiceButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});

export default ChatInputContainer;