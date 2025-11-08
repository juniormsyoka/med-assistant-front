import React from 'react';
import { View, Text, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from './PrimaryButton';
import { BlurView } from 'expo-blur';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'delete' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const { width } = Dimensions.get('window');

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'delete',
  onConfirm,
  onCancel,
}) => {
  const getIconConfig = () => {
    switch (type) {
      case 'delete':
        return { icon: 'trash-outline', color: '#FF3B30' };
      case 'warning':
        return { icon: 'warning-outline', color: '#FF9800' };
      case 'info':
        return { icon: 'information-circle-outline', color: '#2196F3' };
      default:
        return { icon: 'help-circle-outline', color: '#666' };
    }
  };

  const { icon, color } = getIconConfig();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.centeredView}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <Ionicons name={icon as any} size={32} color={color} />
            </View>

            {/* Content */}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <PrimaryButton
                title={cancelText}
                onPress={onCancel}
                style={[styles.button, styles.cancelButton]}
                textStyle={styles.cancelButtonText}
                variant="outline"
                size="medium"
              />

              <PrimaryButton
                title={confirmText}
                onPress={onConfirm}
                style={[styles.button, type === 'delete' && styles.deleteButton]}
                variant={type === 'delete' ? 'danger' : 'primary'}
                size="medium"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 400,
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FFF',
  },
});

export default ConfirmDialog;