// src/components/ConversationList.tsx
import React, { useEffect, useMemo, useCallback, useRef } from 'react'; 
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  StyleSheet,
  Platform,
  ListRenderItemInfo
} from 'react-native';
import { useMessagingStore } from '../../stores/messagingStore';
import { Conversation } from '../../models/Conversation';

interface ConversationItemProps {
  item: Conversation;
  onPress: (item: Conversation) => void;
}

const ConversationItem = React.memo(({ item, onPress }: ConversationItemProps) => {
  const title = useMemo(() => 
    item.title || item.participants?.map((p) => p.full_name).join(', ') || 'Untitled Conversation',
    [item.title, item.participants]
  );

  const lastMessageText = useMemo(() => {
    if (!item.last_message) return 'No messages yet';
    const prefix = item.last_message.sender ? `${item.last_message.sender.full_name}: ` : '';
    return `${prefix}${item.last_message.text}`;
  }, [item.last_message]);

  const handlePress = useCallback(() => {
    onPress(item);
  }, [onPress, item]);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }, []);

  // Get unread count with default value
  const unreadCount = item.unread_count || 0;
  
  // Get time for display
  const displayTime = item.last_message?.created_at || item.updated_at;

  return (
    <TouchableOpacity 
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.itemTouchable}
    >
      <View style={[
        styles.itemContainer,
        unreadCount > 0 && styles.itemContainerUnread // Now safe
      ]}>
        {/* Left: Avatar/Icon */}
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {title.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        {/* Center: Content */}
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={[
              styles.itemTitle,
              unreadCount > 0 && styles.itemTitleUnread // Now safe
            ]} numberOfLines={1}>
              {title}
            </Text>
            {displayTime && (
              <Text style={styles.timeText}>
                {formatTime(displayTime)}
              </Text>
            )}
          </View>
          
          <Text 
            style={[
              styles.lastMessage,
              unreadCount > 0 && styles.lastMessageUnread // Now safe
            ]} 
            numberOfLines={2}
          >
            {lastMessageText}
          </Text>
        </View>
        
        {/* Right: Unread badge */}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Add default values for comparison
  const prevUnread = prevProps.item.unread_count || 0;
  const nextUnread = nextProps.item.unread_count || 0;
  
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.last_message?.text === nextProps.item.last_message?.text &&
    prevProps.item.last_message?.sender?.full_name === nextProps.item.last_message?.sender?.full_name &&
    prevUnread === nextUnread &&
    prevProps.item.updated_at === nextProps.item.updated_at
  );
});

export const ConversationList = ({ userId }: { userId: string }) => {
  const { 
    conversations, 
    loading, 
    loadConversations, 
    setCurrentConversation,
    loadingMore,
    hasMore,
    loadMoreConversations
  } = useMessagingStore();

  const flatListRef = useRef<FlatList<Conversation>>(null);

  // Initial load
  useEffect(() => {
    loadConversations(userId);
  }, [userId, loadConversations]);

  // Refresh conversations when component gains focus (you can add this with navigation focus listener)
  // useEffect(() => {
  //   const unsubscribe = navigation.addListener('focus', () => {
  //     loadConversations(userId, true); // refresh = true
  //   });
  //   return unsubscribe;
  // }, [navigation, userId]);

  // Memoize the conversation press handler
  const handleConversationPress = useCallback((item: Conversation) => {
    setCurrentConversation(item);
    // You might want to mark as read here
    // markConversationAsRead(item.id, userId);
  }, [setCurrentConversation, userId]);

  // Memoize the render item function
  const renderItem = useCallback(({ item }: ListRenderItemInfo<Conversation>) => (
    <ConversationItem 
      item={item} 
      onPress={handleConversationPress} 
    />
  ), [handleConversationPress]);

  // Memoize the key extractor
  const keyExtractor = useCallback((item: Conversation) => `conversation-${item.id}`, []);

  // Get item layout for performance (consistent height)
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && conversations.length > 0) {
      loadMoreConversations(userId);
    }
  }, [loadingMore, hasMore, conversations.length, loadMoreConversations, userId]);

  // Loading indicator component
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }, [loadingMore]);

  // Empty state component
  const renderEmptyList = useCallback(() => {
    if (loading) return null; // Don't show empty while loading
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
        </View>
        <Text style={styles.emptyTitle}>No Conversations</Text>
        <Text style={styles.emptyDescription}>
          Start a conversation with your doctor or patient to begin messaging.
        </Text>
      </View>
    );
  }, [loading]);

  // Loading state (initial load)
  if (loading && conversations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361EE" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={conversations}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      initialNumToRender={12}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={7}
      removeClippedSubviews={Platform.OS === 'android'}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={renderEmptyList}
      ListFooterComponent={renderFooter}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      // For pull-to-refresh (if you add refresh functionality)
      // refreshing={refreshing}
      // onRefresh={handleRefresh}
    />
  );
};

// Constants
const ITEM_HEIGHT = 88; // Height of each conversation item

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemTouchable: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    minHeight: ITEM_HEIGHT - 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContainerUnread: {
    backgroundColor: '#F0F7FF',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4361EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  itemTitleUnread: {
    fontWeight: '700',
    color: '#000',
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    flexShrink: 0,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  lastMessageUnread: {
    color: '#333',
    fontWeight: '500',
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4361EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  footerContainer: {
    padding: 16,
    alignItems: 'center',
  },
});