// src/Services/toastService.ts - SIMPLER VERSION
import Toast from 'react-native-toast-message';

export const toast = {
  success: (message: string, options?: { undoAction?: () => void }) => {
    Toast.show({
      type: 'success',
      text1: message,
      position: 'top',
      visibilityTime: 4000,
      props: options
    });
  },

  error: (message: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      position: 'top',
      visibilityTime: 5000,
    });
  },

  info: (message: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },
};