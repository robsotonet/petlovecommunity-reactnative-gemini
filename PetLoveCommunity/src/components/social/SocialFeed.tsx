// Pet Love Community - Social Feed Component
// Main social feed displaying community posts with refresh and pagination

import React, { useState, useCallback, useRef } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { PostCard, PostContent } from './PostCard';
import Button from '../Button';
import correlationIdService from '../../services/correlationIdService';
import useAdoptionAnalytics from '../../hooks/useAdoptionAnalytics';

export interface SocialFeedProps {
  posts: PostContent[];
  loading?: boolean;
  refreshing?: boolean;
  hasMorePosts?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onLikePost?: (postId: string) => void;
  onCommentPost?: (postId: string) => void;
  onSharePost?: (postId: string) => void;
  onAuthorPress?: (authorId: string) => void;
  onImagePress?: (imageUrl: string, index: number, postId: string) => void;
  onCreatePost?: () => void;
  emptyStateMessage?: string;
  emptyStateAction?: string;
  showCreateButton?: boolean;
  filterType?: 'all' | 'adoption_success' | 'pet_spotlight' | 'shelter_update';
}

export const SocialFeed: React.FC<SocialFeedProps> = ({
  posts,
  loading = false,
  refreshing = false,
  hasMorePosts = false,
  onRefresh,
  onLoadMore,
  onLikePost,
  onCommentPost,
  onSharePost,
  onAuthorPress,
  onImagePress,
  onCreatePost,
  emptyStateMessage = "Welcome to the Pet Love Community! Share your pet stories and connect with fellow pet lovers.",
  emptyStateAction = "Create First Post",
  showCreateButton = true,
  filterType = 'all',
}) => {
  const colors = useColors();
  const { trackDocumentAction } = useAdoptionAnalytics();
  const flatListRef = useRef<FlatList>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Handle end reached for pagination
  const handleEndReached = useCallback(async () => {
    if (loadingMore || !hasMorePosts) return;

    setLoadingMore(true);
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      // Track analytics for pagination
      trackDocumentAction({
        action: 'load_more_posts',
        documentType: 'social_feed',
        metadata: {
          currentPostCount: posts.length,
          filterType,
          correlationId,
        },
      });

      onLoadMore?.();
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMorePosts, posts.length, filterType, onLoadMore, trackDocumentAction]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      // Track analytics for refresh
      trackDocumentAction({
        action: 'refresh_feed',
        documentType: 'social_feed',
        metadata: {
          filterType,
          correlationId,
        },
      });

      onRefresh?.();
    } catch (error) {
      Alert.alert('Error', 'Unable to refresh feed. Please try again.');
    }
  }, [filterType, onRefresh, trackDocumentAction]);

  // Handle create post
  const handleCreatePost = useCallback(async () => {
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      // Track analytics for create post
      trackDocumentAction({
        action: 'open_create_post',
        documentType: 'social_feed',
        metadata: {
          correlationId,
        },
      });

      onCreatePost?.();
    } catch (error) {
      Alert.alert('Error', 'Unable to open create post. Please try again.');
    }
  }, [onCreatePost, trackDocumentAction]);

  // Handle image press with post context
  const handleImagePress = useCallback((imageUrl: string, index: number, post: PostContent) => {
    onImagePress?.(imageUrl, index, post.id);
  }, [onImagePress]);

  // Render individual post
  const renderPost = useCallback(({ item }: { item: PostContent }) => (
    <PostCard
      post={item}
      onLike={onLikePost}
      onComment={onCommentPost}
      onShare={onSharePost}
      onAuthorPress={onAuthorPress}
      onImagePress={(imageUrl, index) => handleImagePress(imageUrl, index, item)}
    />
  ), [onLikePost, onCommentPost, onSharePost, onAuthorPress, handleImagePress]);

  // Render loading footer
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary.teal} />
        <Text style={styles.loadingText}>Loading more posts...</Text>
      </View>
    );
  }, [loadingMore, colors.primary.teal]);

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer} testID="loading-state">
          <ActivityIndicator size="large" color={colors.primary.teal} />
          <Text style={styles.emptyText}>Loading posts...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer} testID="empty-state">
        <Text style={styles.emptyIcon}>🐾</Text>
        <Text style={styles.emptyTitle}>No Posts Yet</Text>
        <Text style={styles.emptyMessage}>{emptyStateMessage}</Text>
        {showCreateButton && onCreatePost && (
          <Button
            title={emptyStateAction}
            onPress={handleCreatePost}
            type="primary"
            style={styles.createButton}
            testID="empty-state-create-button"
          />
        )}
      </View>
    );
  }, [loading, colors.primary.teal, emptyStateMessage, emptyStateAction, showCreateButton, onCreatePost, handleCreatePost]);

  // Render header with create post button
  const renderHeader = useCallback(() => {
    if (!showCreateButton || !onCreatePost) return null;

    return (
      <View style={styles.header} testID="social-feed-header">
        <TouchableOpacity 
          style={styles.createPostButton} 
          onPress={handleCreatePost}
          testID="create-post-header-button"
        >
          <Text style={styles.createPostIcon}>📝</Text>
          <Text style={styles.createPostText}>Share your pet story...</Text>
        </TouchableOpacity>
      </View>
    );
  }, [showCreateButton, onCreatePost, handleCreatePost]);

  // Get key extractor
  const keyExtractor = useCallback((item: PostContent) => item.id, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.neutral.beige,
    },
    header: {
      padding: 16,
      paddingBottom: 8,
    },
    createPostButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral.beige,
      borderWidth: 1,
      borderColor: colors.neutral.lightGray,
      borderRadius: 24,
      padding: 16,
      shadowColor: colors.neutral.midnight,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    createPostIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    createPostText: {
      flex: 1,
      fontSize: 16,
      color: colors.extended.textVariations.tertiary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      minHeight: Dimensions.get('window').height * 0.6,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.neutral.midnight,
      marginBottom: 12,
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: 16,
      color: colors.extended.textVariations.secondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    emptyText: {
      fontSize: 16,
      color: colors.extended.textVariations.secondary,
      marginTop: 12,
    },
    createButton: {
      marginTop: 16,
      minWidth: 200,
    },
    footerLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: colors.extended.textVariations.secondary,
      marginTop: 8,
    },
    list: {
      paddingBottom: 16,
    },
  });

  return (
    <View style={styles.container} testID="social-feed-container">
      <FlatList
        ref={flatListRef}
        testID="social-feed-flatlist"
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            testID="social-feed-refresh-control"
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.teal]}
            tintColor={colors.primary.teal}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={posts.length === 0 ? { flex: 1 } : styles.list}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={100}
        windowSize={10}
      />
    </View>
  );
};

export default SocialFeed;