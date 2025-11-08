import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useMessagingStore } from '../../stores/messagingStore';

export const ConversationList = ({ userId }: { userId: string }) => {
  const { conversations, loading, loadConversations, setCurrentConversation } = useMessagingStore();

  useEffect(() => {
    loadConversations(userId);
  }, [userId]);

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => setCurrentConversation(item)}>
          <View style={{ padding: 15, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>
              {item.title || item.participants.map(p => p.full_name).join(', ')}
            </Text>
            {item.last_message && (
              <Text numberOfLines={1}>
                {item.last_message.sender?.full_name}: {item.last_message.text}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
};