// src/screens/ChatScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import ChatLauncher from '../screens/ChatLauncher';
import DoctorChatList from '@/components/DoctorChatList';

const ChatScreen = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      {user?.role === 'doctor' ? (
        <DoctorChatList />
      ) : (
        <ChatLauncher />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChatScreen;