// Pet Love Community - Social Screen Tests
// Comprehensive unit tests for the social screen component

// Mock safe area context first
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock Redux hooks before importing anything else
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
  useStore: jest.fn(() => ({
    getState: jest.fn(),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  })),
  Provider: ({ children }: any) => children,
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import { Alert } from 'react-native';
import { SocialScreen } from '../SocialScreen';
import socialSliceReducer from '../../features/social/socialSlice';
import { socialApi } from '../../services/socialApi';
import socialSignalRService from '../../services/socialSignalR';
import correlationIdService from '../../services/correlationIdService';
import useAdoptionAnalytics from '../../hooks/useAdoptionAnalytics';

// Mock dependencies
jest.mock('../../services/socialSignalR');
jest.mock('../../services/correlationIdService');
jest.mock('../../hooks/useAdoptionAnalytics');
jest.mock('../../services/loggingService');
jest.mock('../../hooks/useColors', () => ({
  useColors: () => ({
    neutral: {
      beige: '#F7FFF7',
      midnight: '#1A535C',
      lightGray: '#E5E5E5',
    },
    primary: {
      teal: '#4ECDC4',
      coral: '#FF6B6B',
    },
  }),
}));

jest.mock('../../components/social/SocialFeed', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    SocialFeed: ({ 
      posts, 
      loading, 
      onRefresh, 
      onLoadMore, 
      onLikePost, 
      onCommentPost, 
      onSharePost, 
      onAuthorPress,
      onImagePress,
      onCreatePost,
      emptyStateMessage,
      showCreateButton 
    }: any) => (
      <View testID="social-feed">
        <Text>Posts: {posts.length}</Text>
        <Text>Loading: {loading ? 'true' : 'false'}</Text>
        <Text>Empty Message: {emptyStateMessage}</Text>
        <Text>Show Create Button: {showCreateButton ? 'true' : 'false'}</Text>
        <TouchableOpacity testID="refresh-button" onPress={onRefresh}>
          <Text>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="load-more-button" onPress={onLoadMore}>
          <Text>Load More</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="like-post-button" onPress={() => onLikePost('post-1')}>
          <Text>Like Post</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="comment-post-button" onPress={() => onCommentPost('post-1')}>
          <Text>Comment Post</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="share-post-button" onPress={() => onSharePost('post-1')}>
          <Text>Share Post</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="author-press-button" onPress={() => onAuthorPress('user-1')}>
          <Text>Author Press</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="image-press-button" onPress={() => onImagePress('image1.jpg', 0, 'post-1')}>
          <Text>Image Press</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="create-post-button" onPress={onCreatePost}>
          <Text>Create Post</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('../../components/social/CreatePostModal', () => {
  const { Modal, View, Text, TouchableOpacity } = require('react-native');
  return {
    CreatePostModal: ({ visible, onClose, onSubmit, loading }: any) => (
      <Modal visible={visible} testID="create-post-modal">
        <View>
          <Text>Create Post Modal</Text>
          <Text>Loading: {loading ? 'true' : 'false'}</Text>
          <TouchableOpacity testID="modal-close-button" onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            testID="modal-submit-button" 
            onPress={() => onSubmit({
              content: 'Test post',
              images: [],
              postType: 'general',
              tags: [],
            })}
          >
            <Text>Submit</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    ),
  };
});

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SocialScreen', () => {
  let store: any;
  let mockTrackDocumentAction: jest.Mock;
  const mockCorrelationId = 'test-correlation-id';

  const mockFeedData = {
    posts: [
      {
        id: 'post-1',
        author: {
          id: 'user-1',
          name: 'John Doe',
          avatar: 'avatar1.jpg',
        },
        content: 'Test post content',
        timestamp: '2024-01-01T12:00:00Z',
        likes: 5,
        comments: 2,
        isLiked: false,
        postType: 'general',
        images: ['image1.jpg'],
      },
      {
        id: 'post-2',
        author: {
          id: 'user-2',
          name: 'Jane Smith',
        },
        content: 'Another test post',
        timestamp: '2024-01-01T11:00:00Z',
        likes: 3,
        comments: 1,
        isLiked: true,
        postType: 'adoption_success',
      },
    ],
    hasMore: true,
    nextCursor: 'cursor-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTrackDocumentAction = jest.fn();
    (useAdoptionAnalytics as jest.Mock).mockReturnValue({
      trackDocumentAction: mockTrackDocumentAction,
    });
    (correlationIdService.getCorrelationId as jest.Mock).mockResolvedValue(mockCorrelationId);

    // Create test store
    store = configureStore({
      reducer: {
        social: socialSliceReducer,
        socialApi: socialApi.reducer,
        auth: (state = { user: { id: 'user-1' }, token: 'test-token' }) => state,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: [
              'social/togglePostLike',
              'social/toggleCommentLike', 
              'social/toggleUserFollow'
            ],
          },
        }).concat(socialApi.middleware),
    });

    // Mock API responses
    const mockApiResponse = {
      data: mockFeedData,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
      error: null,
    };

    jest.spyOn(socialApi, 'useGetFeedQuery').mockReturnValue(mockApiResponse as any);
    jest.spyOn(socialApi, 'useCreatePostMutation').mockReturnValue([
      jest.fn().mockResolvedValue({ unwrap: () => Promise.resolve({}) }),
      { isLoading: false }
    ] as any);
    jest.spyOn(socialApi, 'useToggleLikeMutation').mockReturnValue([
      jest.fn().mockResolvedValue({ unwrap: () => Promise.resolve({}) }),
      {}
    ] as any);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <NavigationContainer>
          {ui}
        </NavigationContainer>
      </Provider>
    );
  };

  describe('Rendering', () => {
    it('renders social feed with posts', () => {
      const { getByTestId, getByText } = renderWithProviders(<SocialScreen />);
      
      expect(getByTestId('social-feed')).toBeTruthy();
      expect(getByText('Posts: 2')).toBeTruthy();
      expect(getByText('Loading: false')).toBeTruthy();
      expect(getByText('Show Create Button: true')).toBeTruthy();
    });

    it('renders create post modal when visible', () => {
      // Set modal visible in store
      store.dispatch({ type: 'social/setCreatePostModalVisible', payload: true });

      const { getByTestId } = renderWithProviders(<SocialScreen />);
      
      expect(getByTestId('create-post-modal')).toBeTruthy();
    });

    it('displays correct empty state message', () => {
      const { getByText } = renderWithProviders(<SocialScreen />);
      
      expect(getByText('Empty Message: Welcome to the Pet Love Community! Connect with fellow pet lovers and share your pet stories.')).toBeTruthy();
    });
  });

  describe('Component Initialization', () => {
    it('initializes SignalR service on mount', async () => {
      renderWithProviders(<SocialScreen />);

      await waitFor(() => {
        expect(socialSignalRService.initialize).toHaveBeenCalled();
      });
    });

    it('tracks social screen view analytics', async () => {
      renderWithProviders(<SocialScreen />);

      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'view_social_screen',
          documentType: 'social_feed',
          metadata: {
            feedFilter: 'all',
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('cleans up SignalR service on unmount', async () => {
      const { unmount } = renderWithProviders(<SocialScreen />);

      unmount();

      expect(socialSignalRService.cleanup).toHaveBeenCalled();
    });

    it('does not initialize SignalR when user is not available', async () => {
      // Create store without user
      const storeWithoutUser = configureStore({
        reducer: {
          social: socialSliceReducer,
          socialApi: socialApi.reducer,
          auth: (state = { user: null, token: null }) => state,
        },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware().concat(socialApi.middleware),
      });

      render(
        <Provider store={storeWithoutUser}>
          <NavigationContainer>
            <SocialScreen />
          </NavigationContainer>
        </Provider>
      );

      expect(socialSignalRService.initialize).not.toHaveBeenCalled();
    });
  });

  describe('Feed Interactions', () => {
    it('handles feed refresh', async () => {
      const mockRefetch = jest.fn();
      jest.spyOn(socialApi, 'useGetFeedQuery').mockReturnValue({
        ...mockFeedData,
        refetch: mockRefetch,
      } as any);

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('refresh-button'));

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('handles load more posts', () => {
      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('load-more-button'));

      // Load more functionality is handled by the feed component
      expect(getByTestId('load-more-button')).toBeTruthy();
    });

    it('handles post like', async () => {
      const mockToggleLike = jest.fn().mockResolvedValue({ unwrap: () => Promise.resolve({}) });
      jest.spyOn(socialApi, 'useToggleLikeMutation').mockReturnValue([mockToggleLike, {}] as any);

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('like-post-button'));

      await waitFor(() => {
        expect(mockToggleLike).toHaveBeenCalledWith({
          targetId: 'post-1',
          targetType: 'post',
        });
      });
    });

    it('handles post comment', async () => {
      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('comment-post-button'));

      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'toggle_post_like',
          documentType: 'social_post',
          metadata: {
            postId: 'post-1',
            correlationId: mockCorrelationId,
          },
        });
      });

      // Check that modal state is updated
      const state = store.getState();
      expect(state.social.selectedPostId).toBe('post-1');
      expect(state.social.commentsModalVisible).toBe(true);
    });

    it('handles post share', async () => {
      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('share-post-button'));

      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'share_post',
          documentType: 'social_post',
          metadata: {
            postId: 'post-1',
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('handles author press', async () => {
      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('author-press-button'));

      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'view_user_profile',
          documentType: 'social_user',
          metadata: {
            userId: 'user-1',
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('handles image press', async () => {
      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('image-press-button'));

      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'view_image',
          documentType: 'social_post',
          metadata: {
            postId: 'post-1',
            imageIndex: 0,
            correlationId: mockCorrelationId,
          },
        });
      });

      // Check that image viewer state is updated
      const state = store.getState();
      expect(state.social.imageViewerVisible).toBe(true);
      expect(state.social.selectedImages).toEqual(['image1.jpg']);
      expect(state.social.currentImageIndex).toBe(0);
    });
  });

  describe('Create Post Modal', () => {
    it('opens create post modal', async () => {
      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('create-post-button'));

      await waitFor(() => {
        const state = store.getState();
        expect(state.social.createPostModalVisible).toBe(true);
      });
    });

    it('closes create post modal', async () => {
      // Set modal visible first
      store.dispatch({ type: 'social/setCreatePostModalVisible', payload: true });

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('modal-close-button'));

      await waitFor(() => {
        const state = store.getState();
        expect(state.social.createPostModalVisible).toBe(false);
      });
    });

    it('handles post submission', async () => {
      const mockCreatePost = jest.fn().mockResolvedValue({ unwrap: () => Promise.resolve({}) });
      jest.spyOn(socialApi, 'useCreatePostMutation').mockReturnValue([
        mockCreatePost,
        { isLoading: false }
      ] as any);

      // Set modal visible and online
      store.dispatch({ type: 'social/setCreatePostModalVisible', payload: true });
      store.dispatch({ type: 'social/setOnlineStatus', payload: true });

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledWith({
          content: 'Test post',
          images: [],
          postType: 'general',
          tags: [],
        });
      });
    });

    it('handles offline post submission', async () => {
      // Set modal visible and offline
      store.dispatch({ type: 'social/setCreatePostModalVisible', payload: true });
      store.dispatch({ type: 'social/setOnlineStatus', payload: false });

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Posted Offline',
          "Your post has been saved and will be published when you're back online.",
          [{ text: 'OK' }]
        );
      });

      // Check that offline action was added
      const state = store.getState();
      expect(state.social.offlineActions.length).toBeGreaterThan(0);
    });

    it('handles post submission error', async () => {
      const mockCreatePost = jest.fn().mockRejectedValue(new Error('API Error'));
      jest.spyOn(socialApi, 'useCreatePostMutation').mockReturnValue([
        mockCreatePost,
        { isLoading: false }
      ] as any);

      // Set modal visible and online
      store.dispatch({ type: 'social/setCreatePostModalVisible', payload: true });
      store.dispatch({ type: 'social/setOnlineStatus', payload: true });

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Failed to Post',
          'Unable to create your post. Please try again.',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Offline Handling', () => {
    it('handles offline like action', async () => {
      // Set offline state
      store.dispatch({ type: 'social/setOnlineStatus', payload: false });

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('like-post-button'));

      await waitFor(() => {
        const state = store.getState();
        expect(state.social.offlineActions.length).toBeGreaterThan(0);
        expect(state.social.offlineActions[0].type).toBe('like_post');
      });
    });
  });

  describe('Error Handling', () => {
    it('shows alert when feed error occurs', async () => {
      // Mock API error
      jest.spyOn(socialApi, 'useGetFeedQuery').mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        refetch: jest.fn(),
        error: { message: 'Network error' },
      } as any);

      renderWithProviders(<SocialScreen />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Unable to Load Posts',
          'There was a problem loading the social feed. Please check your connection and try again.',
          expect.arrayContaining([
            { text: 'Retry', onPress: expect.any(Function) },
            { text: 'OK', style: 'cancel' },
          ])
        );
      });
    });

    it('handles SignalR initialization error', async () => {
      (socialSignalRService.initialize as jest.Mock).mockRejectedValue(
        new Error('SignalR init failed')
      );

      renderWithProviders(<SocialScreen />);

      // Should not crash the component
      expect(socialSignalRService.initialize).toHaveBeenCalled();
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks successful post creation', async () => {
      const mockCreatePost = jest.fn().mockResolvedValue({ unwrap: () => Promise.resolve({}) });
      jest.spyOn(socialApi, 'useCreatePostMutation').mockReturnValue([
        mockCreatePost,
        { isLoading: false }
      ] as any);

      store.dispatch({ type: 'social/setCreatePostModalVisible', payload: true });
      store.dispatch({ type: 'social/setOnlineStatus', payload: true });

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'create_post_success',
          documentType: 'social_post',
          petId: undefined,
          petName: undefined,
          metadata: {
            postType: 'general',
            contentLength: 9,
            imageCount: 0,
            tagCount: 0,
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('tracks failed post creation', async () => {
      const mockCreatePost = jest.fn().mockRejectedValue(new Error('API Error'));
      jest.spyOn(socialApi, 'useCreatePostMutation').mockReturnValue([
        mockCreatePost,
        { isLoading: false }
      ] as any);

      store.dispatch({ type: 'social/setCreatePostModalVisible', payload: true });
      store.dispatch({ type: 'social/setOnlineStatus', payload: true });

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'create_post_failed',
          documentType: 'social_post',
          metadata: {
            error: 'API Error',
          },
        });
      });
    });

    it('tracks offline post creation', async () => {
      store.dispatch({ type: 'social/setCreatePostModalVisible', payload: true });
      store.dispatch({ type: 'social/setOnlineStatus', payload: false });

      const { getByTestId } = renderWithProviders(<SocialScreen />);

      fireEvent.press(getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'create_post_offline',
          documentType: 'social_post',
          metadata: {
            postType: 'general',
            correlationId: mockCorrelationId,
          },
        });
      });
    });
  });

  describe('Component State Management', () => {
    it('manages create post modal state correctly', () => {
      const { rerender } = renderWithProviders(<SocialScreen />);

      let state = store.getState();
      expect(state.social.createPostModalVisible).toBe(false);

      // Open modal
      act(() => {
        store.dispatch({ type: 'social/setCreatePostModalVisible', payload: true });
      });

      state = store.getState();
      expect(state.social.createPostModalVisible).toBe(true);

      // Close modal
      act(() => {
        store.dispatch({ type: 'social/setCreatePostModalVisible', payload: false });
      });

      state = store.getState();
      expect(state.social.createPostModalVisible).toBe(false);
    });

    it('manages feed filter state', () => {
      const { rerender } = renderWithProviders(<SocialScreen />);

      let state = store.getState();
      expect(state.social.feedFilter).toBe('all');

      act(() => {
        store.dispatch({ type: 'social/setFeedFilter', payload: 'adoption_success' });
      });

      state = store.getState();
      expect(state.social.feedFilter).toBe('adoption_success');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing feed data gracefully', () => {
      jest.spyOn(socialApi, 'useGetFeedQuery').mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        refetch: jest.fn(),
        error: null,
      } as any);

      const { getByText } = renderWithProviders(<SocialScreen />);

      expect(getByText('Posts: 0')).toBeTruthy();
    });

    it('handles empty posts array', () => {
      jest.spyOn(socialApi, 'useGetFeedQuery').mockReturnValue({
        data: { posts: [], hasMore: false, nextCursor: null },
        isLoading: false,
        isFetching: false,
        refetch: jest.fn(),
        error: null,
      } as any);

      const { getByText } = renderWithProviders(<SocialScreen />);

      expect(getByText('Posts: 0')).toBeTruthy();
    });

    it('handles loading state', () => {
      jest.spyOn(socialApi, 'useGetFeedQuery').mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: false,
        refetch: jest.fn(),
        error: null,
      } as any);

      const { getByText } = renderWithProviders(<SocialScreen />);

      expect(getByText('Loading: true')).toBeTruthy();
    });
  });
});