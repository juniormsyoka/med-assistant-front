// src/config/toastConfig.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const toastConfig = {
  success: ({ text1, text2, props }: any) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={props?.onPress}
    >
      <View style={[styles.toast, styles.successToast]}>
        <Ionicons name="checkmark-circle" size={24} color="white" />
        <View style={styles.textContainer}>
          <Text style={styles.toastText}>{text1}</Text>
          {text2 ? <Text style={styles.toastSubText}>{text2}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  ),

  error: ({ text1, text2, props }: any) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={props?.onPress}
    >
      <View style={[styles.toast, styles.errorToast]}>
        <Ionicons name="alert-circle" size={24} color="white" />
        <View style={styles.textContainer}>
          <Text style={styles.toastText}>{text1}</Text>
          {text2 ? <Text style={styles.toastSubText}>{text2}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  ),

  info: ({ text1, text2, props }: any) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={props?.onPress}   // ✅ THIS IS CRITICAL
    >
      <View style={[styles.toast, styles.infoToast]}>
        <Ionicons name="information-circle" size={24} color="white" />
        <View style={styles.textContainer}>
          <Text style={styles.toastText}>{text1}</Text>
          {text2 ? <Text style={styles.toastSubText}>{text2}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  ),
};

const styles = StyleSheet.create({
  toast: {
    minHeight: 70,
    width: '90%',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toastText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  toastSubText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
  },
  successToast: { backgroundColor: '#4CAF50' },
  errorToast: { backgroundColor: '#f44336' },
  infoToast: { backgroundColor: '#2196F3' },
});
