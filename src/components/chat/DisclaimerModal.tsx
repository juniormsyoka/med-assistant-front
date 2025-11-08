// components/DisclaimerModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface DisclaimerModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  title?: string;
  content: string;
  type?: 'info' | 'warning' | 'critical';
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  visible,
  onAccept,
  onDecline,
  title = "Important Notice",
  content,
  type = 'info'
}) => {
  const { colors } = useTheme();

  const getIconAndColor = () => {
    switch (type) {
      case 'warning':
        return { icon: 'warning', color: '#FFA000' };
      case 'critical':
        return { icon: 'alert-circle', color: '#D32F2F' };
      default:
        return { icon: 'information-circle', color: colors.primary };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.titleContainer}>
              <Ionicons name={icon as any} size={24} color={color} />
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.contentText, { color: colors.text }]}>
              {content}
            </Text>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
              onPress={onDecline}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={onAccept}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width * 0.9,
    maxHeight: height * 0.7,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  content: {
    maxHeight: height * 0.4,
    padding: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  secondaryButton: {
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DisclaimerModal;