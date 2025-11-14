// src/config/toastConfig.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const toastConfig = {
  success: ({ text1, props }: any) => (
    <View style={[styles.toast, styles.successToast]}>
      <Ionicons name="checkmark-circle" size={24} color="white" />
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  ),
  error: ({ text1, props }: any) => (
    <View style={[styles.toast, styles.errorToast]}>
      <Ionicons name="alert-circle" size={24} color="white" />
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  ),
  info: ({ text1, props }: any) => (
    <View style={[styles.toast, styles.infoToast]}>
      <Ionicons name="information-circle" size={24} color="white" />
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  ),
};

const styles = StyleSheet.create({
  toast: {
    height: 60,
    width: '90%',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successToast: {
    backgroundColor: '#4CAF50',
  },
  errorToast: {
    backgroundColor: '#f44336',
  },
  infoToast: {
    backgroundColor: '#2196F3',
  },
  toastText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
});