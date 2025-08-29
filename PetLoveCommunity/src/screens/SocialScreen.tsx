// Pet Love Community - Social Screen
// Main social platform screen integrating feed, posting, and real-time features

import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../hooks/useColors';
import { SocialFeed } from '../components/social/SocialFeed';
import { CreatePostModal } from '../components/social/CreatePostModal';
import {
  useGetFeedQuery,
  useCreatePostMutation,
  useToggleLikeMutation,
  CreatePostRequest,
} from '../services/socialApi';
import {
  selectCreatePostModalVisible,
  selectFeedFilter,
  selectIsOnline,
  setCreatePostModalVisible,
  setSelectedPostId,
  setCommentsModalVisible,
  openImageViewer,
  addOfflineAction,
  incrementAnalytic,
} from '../features/social/socialSlice';
import socialSignalRService from '../services/socialSignalR';
import correlationIdService from '../services/correlationIdService';
import useAdoptionAnalytics from '../hooks/useAdoptionAnalytics';
import { loggingService } from '../services/loggingService';
import { RootState } from '../store';

export const SocialScreen: React.FC = () => {
  const colors = useColors();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { trackDocumentAction } = useAdoptionAnalytics();

  // Redux selectors
  const createPostModalVisible = useSelector(selectCreatePostModalVisible);
  const feedFilter = useSelector(selectFeedFilter);
  const isOnline = useSelector(selectIsOnline);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Local state
  const [feedCursor, setFeedCursor] = useState<string | undefined>();

  // API hooks
  const {
    data: feedData,
    isLoading: feedLoading,
    isFetching: feedFetching,
    refetch: refetchFeed,
    error: feedError,
  } = useGetFeedQuery({
    type: feedFilter,
    limit: 20,
    cursor: feedCursor,
  });

  const [createPost, { isLoading: createPostLoading }] = useCreatePostMutation();
  const [toggleLike] = useToggleLikeMutation();

  // Initialize SignalR on mount
  useEffect(() => {
    const initializeSignalR = async () => {
      try {
        if (currentUser && isOnline) {
          await socialSignalRService.initialize();
          
          // Track social screen view
          const correlationId = await correlationIdService.getCorrelationId();
          trackDocumentAction({
            action: 'view_social_screen',
            documentType: 'social_feed',
            metadata: {
              feedFilter,
              correlationId,
            },
          });
        }
      } catch (error) {
        loggingService.error('Failed to initialize social SignalR', { error });
      }
    };

    initializeSignalR();

    // Cleanup on unmount
    return () => {
      socialSignalRService.cleanup();
    };
  }, [currentUser, isOnline, feedFilter, trackDocumentAction]);

  // Handle create post
  const handleCreatePost = useCallback(() => {
    dispatch(setCreatePostModalVisible(true));
  }, [dispatch]);

  // Handle close create post modal
  const handleCloseCreatePost = useCallback(() => {
    dispatch(setCreatePostModalVisible(false));
  }, [dispatch]);

  // Handle submit post
  const handleSubmitPost = useCallback(async (postData: CreatePostRequest) => {
    try {
      const correlationId = await correlationIdService.getCorrelationId();

      if (isOnline) {
        // Online: create post immediately
        await createPost(postData).unwrap();
        
        // Track successful post creation
        dispatch(incrementAnalytic('postsCreated'));
        
        trackDocumentAction({
          action: 'create_post_success',
          documentType: 'social_post',
          petId: postData.petId,
          petName: postData.petName,
          metadata: {
            postType: postData.postType,
            contentLength: postData.content.length,
            imageCount: postData.images?.length || 0,
            tagCount: postData.tags?.length || 0,
            correlationId,
          },
        });

        loggingService.info('Post created successfully', {
          postType: postData.postType,
          contentLength: postData.content.length,
          imageCount: postData.images?.length || 0,
        });
      } else {
        // Offline: queue for later
        dispatch(addOfflineAction({
          type: 'create_post',
          payload: postData,
          maxRetries: 3,
          correlationId,
        }));

        Alert.alert(
          'Posted Offline',
          'Your post has been saved and will be published when you\'re back online.',
          [{ text: 'OK' }]
        );

        trackDocumentAction({
          action: 'create_post_offline',
          documentType: 'social_post',
          metadata: {
            postType: postData.postType,
            correlationId,
          },
        });
      }
    } catch (error) {
      loggingService.error('Failed to create post', { error, postData });
      
      trackDocumentAction({
        action: 'create_post_failed',
        documentType: 'social_post',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      Alert.alert(
        'Failed to Post',
        'Unable to create your post. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [isOnline, createPost, dispatch, trackDocumentAction]);

  // Handle refresh feed
  const handleRefresh = useCallback(async () => {
    try {
      setFeedCursor(undefined);
      await refetchFeed();
    } catch (error) {
      loggingService.error('Failed to refresh social feed', { error });
    }
  }, [refetchFeed]);

  // Handle load more posts
  const handleLoadMore = useCallback(() => {
    if (feedData?.hasMore && feedData?.nextCursor) {
      setFeedCursor(feedData.nextCursor);
    }
  }, [feedData]);

  // Handle like post
  const handleLikePost = useCallback(async (postId: string) => {
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      if (isOnline) {
        await toggleLike({
          targetId: postId,
          targetType: 'post',
        }).unwrap();

        trackDocumentAction({
          action: 'toggle_post_like',
          documentType: 'social_post',
          metadata: {
            postId,
            correlationId,
          },
        });
      } else {
        dispatch(addOfflineAction({
          type: 'like_post',
          payload: { targetId: postId, targetType: 'post' },
          maxRetries: 3,
          correlationId,
        }));

        trackDocumentAction({
          action: 'toggle_post_like_offline',
          documentType: 'social_post',
          metadata: {
            postId,
            correlationId,
          },
        });
      }
    } catch (error) {
      loggingService.error('Failed to toggle post like', { error, postId });
      Alert.alert('Error', 'Unable to update like. Please try again.');
    }
  }, [isOnline, toggleLike, dispatch, trackDocumentAction]);

  // Handle comment on post
  const handleCommentPost = useCallback(async (postId: string) => {
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      dispatch(setSelectedPostId(postId));
      dispatch(setCommentsModalVisible(true));

      trackDocumentAction({
        action: 'open_comments',
        documentType: 'social_post',
        metadata: {
          postId,
          correlationId,
        },
      });
    } catch (error) {
      loggingService.error('Failed to open comments', { error, postId });
    }
  }, [dispatch, trackDocumentAction]);

  // Handle share post
  const handleSharePost = useCallback(async (postId: string) => {
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      trackDocumentAction({
        action: 'share_post',
        documentType: 'social_post',
        metadata: {
          postId,
          correlationId,
        },
      });
    } catch (error) {
      loggingService.error('Failed to share post', { error, postId });
    }
  }, [trackDocumentAction]);

  // Handle author press
  const handleAuthorPress = useCallback(async (authorId: string) => {
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      // Navigate to user profile (when implemented)
      // navigation.navigate('UserProfile', { userId: authorId });

      trackDocumentAction({
        action: 'view_user_profile',
        documentType: 'social_user',
        metadata: {
          userId: authorId,
          correlationId,
        },
      });
    } catch (error) {
      loggingService.error('Failed to navigate to user profile', { error, authorId });
    }
  }, [trackDocumentAction]);

  // Handle image press
  const handleImagePress = useCallback(async (imageUrl: string, index: number, postId: string) => {
    try {
      const post = feedData?.posts.find(p => p.id === postId);
      if (post?.images) {
        dispatch(openImageViewer({ images: post.images, index }));
      }

      const correlationId = await correlationIdService.getCorrelationId();
      trackDocumentAction({
        action: 'view_image',
        documentType: 'social_post',
        metadata: {
          postId,
          imageIndex: index,
          correlationId,
        },
      });
    } catch (error) {
      loggingService.error('Failed to open image viewer', { error, imageUrl, postId });
    }
  }, [feedData, dispatch, trackDocumentAction]);

  // Handle feed error
  useEffect(() => {
    if (feedError) {
      loggingService.error('Social feed error', { error: feedError });
      Alert.alert(
        'Unable to Load Posts',
        'There was a problem loading the social feed. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: handleRefresh },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  }, [feedError, handleRefresh]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.neutral.beige,
    },
    content: {
      flex: 1,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <SocialFeed
          posts={feedData?.posts || []}
          loading={feedLoading}
          refreshing={feedFetching && !feedLoading}
          hasMorePosts={feedData?.hasMore || false}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          onLikePost={handleLikePost}
          onCommentPost={handleCommentPost}
          onSharePost={handleSharePost}
          onAuthorPress={handleAuthorPress}
          onImagePress={handleImagePress}
          onCreatePost={handleCreatePost}
          emptyStateMessage="Welcome to the Pet Love Community! Connect with fellow pet lovers and share your pet stories."
          emptyStateAction="Share Your Story"
          showCreateButton={true}
          filterType={feedFilter}
        />

        <CreatePostModal
          visible={createPostModalVisible}
          onClose={handleCloseCreatePost}
          onSubmit={handleSubmitPost}
          loading={createPostLoading}
          maxImages={4}
          maxContentLength={500}
        />
      </View>
    </SafeAreaView>
  );
};

export default SocialScreen;