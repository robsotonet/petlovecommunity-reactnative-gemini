// Pet Love Community - Social Feed Component Tests
// Comprehensive unit tests for the social feed component

import React from 'react';
import { renderWithScreen as render, fireEvent, waitFor, act } from '../../../__mocks__/testUtils';
import { Alert } from 'react-native';
import { SocialFeed, SocialFeedProps } from '../SocialFeed';
import { PostContent } from '../PostCard';
import correlationIdService from '../../../services/correlationIdService';

// Setup mocks
jest.mock('../../../services/correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-123')),
  generateCorrelationId: jest.fn(() => 'test-correlation-123'),
}));

const mockTrackDocumentAction = jest.fn(() => Promise.resolve());

jest.mock('../../../hooks/useAdoptionAnalytics', () => ({
  __esModule: true,
  default: () => ({
    trackDocumentAction: mockTrackDocumentAction,
    trackUserAction: jest.fn(() => Promise.resolve()),
    trackScreenView: jest.fn(() => Promise.resolve()),
    trackError: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock('../../../hooks/useColors', () => ({
  useColors: () => ({
    primary: { coral: '#FF6B6B', teal: '#4ECDC4' },
    neutral: { beige: '#F7FFF7', midnight: '#1A535C', lightGray: '#CCCCCC' },
    extended: { textVariations: { secondary: '#2C6B73', tertiary: '#6C757D' } },
  }),
}));

jest.mock('../PostCard', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    PostCard: ({ post, onLike, onComment, onShare, onAuthorPress, onImagePress }: any) => {
      const React = require('react');
      return React.createElement(View, {
        testID: `post-card-${post?.id || 'unknown'}`,
      }, [
        React.createElement(View, { testID: 'post-content', key: 'content' }, 
          React.createElement(Text, {}, post?.content || 'Post content')
        ),
        React.createElement(TouchableOpacity, { 
          testID: `like-button-${post?.id}`, 
          onPress: () => onLike?.(post?.id), 
          key: 'like' 
        }, React.createElement(Text, {}, 'Like')),
        React.createElement(TouchableOpacity, { 
          testID: `comment-button-${post?.id}`, 
          onPress: () => onComment?.(post?.id), 
          key: 'comment' 
        }, React.createElement(Text, {}, 'Comment')),
        React.createElement(TouchableOpacity, { 
          testID: `share-button-${post?.id}`, 
          onPress: () => onShare?.(post?.id), 
          key: 'share' 
        }, React.createElement(Text, {}, 'Share')),
        React.createElement(TouchableOpacity, { 
          testID: `author-button-${post?.id}`, 
          onPress: () => onAuthorPress?.(post?.author?.id), 
          key: 'author' 
        }, React.createElement(Text, {}, post?.author?.name || 'Author')),
        ...(post?.images || []).map((image: any, index: number) =>
          React.createElement(TouchableOpacity, { 
            testID: `image-${post?.id}-${index}`, 
            onPress: () => onImagePress?.(image, index), 
            key: `image-${index}` 
          }, React.createElement(Text, {}, `Image ${index}`))
        )
      ]);
    },
    PostContent: {}
  };
});

jest.mock('../../Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title, onPress, testID, ...props }: any) => {
      const React = require('react');
      return React.createElement(TouchableOpacity, {
        ...props,
        testID: testID || `button-${title?.toLowerCase().replace(/\s+/g, '-') || 'button'}`,
        onPress,
      }, React.createElement(Text, {}, title || 'Button'));
    }
  };
});

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SocialFeed', () => {
  const mockCorrelationId = 'test-correlation-id';

  const mockPosts: PostContent[] = [
    {
      id: 'post-1',
      author: {
        id: 'user-1',
        name: 'John Doe',
        avatar: 'https://example.com/avatar1.jpg',
        isVerified: true,
      },
      content: 'This is a test post about my dog Max!',
      images: ['https://example.com/image1.jpg'],
      timestamp: '2024-01-01T12:00:00Z',
      likes: 5,
      comments: 2,
      isLiked: false,
      petId: 'pet-1',
      petName: 'Max',
      postType: 'pet_spotlight',
      tags: ['dogs', 'cute'],
    },
    {
      id: 'post-2',
      author: {
        id: 'user-2',
        name: 'Jane Smith',
        shelterName: 'Happy Paws Shelter',
      },
      content: 'Great news! Bella found her forever home!',
      timestamp: '2024-01-01T11:00:00Z',
      likes: 12,
      comments: 5,
      isLiked: true,
      postType: 'adoption_success',
    },
  ];

  const defaultProps: SocialFeedProps = {
    posts: mockPosts,
    loading: false,
    refreshing: false,
    hasMorePosts: true,
    onRefresh: jest.fn(),
    onLoadMore: jest.fn(),
    onLikePost: jest.fn(),
    onCommentPost: jest.fn(),
    onSharePost: jest.fn(),
    onAuthorPress: jest.fn(),
    onImagePress: jest.fn(),
    onCreatePost: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    const correlationIdService = require('../../../services/correlationIdService');
    correlationIdService.getCorrelationId.mockResolvedValue(mockCorrelationId);
  });

  describe('Rendering', () => {
    it('renders posts correctly', () => {
      const { getByTestId, getByText } = render(<SocialFeed {...defaultProps} />);
      
      expect(getByTestId('post-card-post-1')).toBeTruthy();
      expect(getByTestId('post-card-post-2')).toBeTruthy();
      expect(getByText('This is a test post about my dog Max!')).toBeTruthy();
      expect(getByText('Great news! Bella found her forever home!')).toBeTruthy();
    });

    it('renders create post header when showCreateButton is true', () => {
      const { getByText } = render(
        <SocialFeed {...defaultProps} showCreateButton={true} />
      );
      
      expect(getByText('Share your pet story...')).toBeTruthy();
    });

    it('does not render create post header when showCreateButton is false', () => {
      const { queryByText } = render(
        <SocialFeed {...defaultProps} showCreateButton={false} />
      );
      
      expect(queryByText('Share your pet story...')).toBeNull();
    });

    it('renders loading state correctly', () => {
      const { getByText } = render(
        <SocialFeed {...defaultProps} posts={[]} loading={true} />
      );
      
      expect(getByText('Loading posts...')).toBeTruthy();
    });

    it('renders empty state correctly', () => {
      const { getByText } = render(
        <SocialFeed {...defaultProps} posts={[]} loading={false} />
      );
      
      expect(getByText('No Posts Yet')).toBeTruthy();
      expect(getByText('Welcome to the Pet Love Community! Share your pet stories and connect with fellow pet lovers.')).toBeTruthy();
    });

    it('renders custom empty state message', () => {
      const customMessage = 'Custom empty message';
      const { getByText } = render(
        <SocialFeed 
          {...defaultProps} 
          posts={[]} 
          loading={false}
          emptyStateMessage={customMessage}
        />
      );
      
      expect(getByText(customMessage)).toBeTruthy();
    });

    it('renders loading more indicator when loadingMore is true', async () => {
      const { getByTestId, getByText } = render(
        <SocialFeed {...defaultProps} hasMorePosts={true} />
      );
      
      // Trigger end reached
      const flatList = getByTestId('social-feed-flatlist');
      fireEvent(flatList, 'endReached');
      
      await waitFor(() => {
        expect(getByText('Loading more posts...')).toBeTruthy();
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onLikePost when like button is pressed', () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      fireEvent.press(getByTestId('like-button-post-1'));
      
      expect(defaultProps.onLikePost).toHaveBeenCalledWith('post-1');
    });

    it('calls onCommentPost when comment button is pressed', () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      fireEvent.press(getByTestId('comment-button-post-1'));
      
      expect(defaultProps.onCommentPost).toHaveBeenCalledWith('post-1');
    });

    it('calls onSharePost when share button is pressed', () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      fireEvent.press(getByTestId('share-button-post-1'));
      
      expect(defaultProps.onSharePost).toHaveBeenCalledWith('post-1');
    });

    it('calls onAuthorPress when author is pressed', () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      fireEvent.press(getByTestId('author-button-post-1'));
      
      expect(defaultProps.onAuthorPress).toHaveBeenCalledWith('user-1');
    });

    it('calls onImagePress when image is pressed', () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      fireEvent.press(getByTestId('image-post-1-0'));
      
      expect(defaultProps.onImagePress).toHaveBeenCalledWith(
        'https://example.com/image1.jpg',
        0,
        'post-1'
      );
    });

    it('calls onCreatePost when create post button is pressed', async () => {
      const { getByTestId } = render(
        <SocialFeed {...defaultProps} showCreateButton={true} />
      );
      
      fireEvent.press(getByTestId('create-post-header-button'));
      
      await waitFor(() => {
        expect(defaultProps.onCreatePost).toHaveBeenCalled();
      });
    });

    it('calls onCreatePost when empty state create button is pressed', async () => {
      const { getByTestId } = render(
        <SocialFeed 
          {...defaultProps} 
          posts={[]} 
          loading={false} 
          showCreateButton={true} 
        />
      );
      
      fireEvent.press(getByTestId('empty-state-create-button'));
      
      await waitFor(() => {
        expect(defaultProps.onCreatePost).toHaveBeenCalled();
      });
    });
  });

  describe('Refresh and Pagination', () => {
    it('calls onRefresh when pull to refresh is triggered', async () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      const refreshControl = getByTestId('social-feed-refresh-control');
      fireEvent(refreshControl, 'refresh');
      
      await waitFor(() => {
        expect(defaultProps.onRefresh).toHaveBeenCalled();
      });
    });

    it('calls onLoadMore when end is reached and hasMorePosts is true', async () => {
      const { getByTestId } = render(
        <SocialFeed {...defaultProps} hasMorePosts={true} />
      );
      
      const flatList = getByTestId('social-feed-flatlist');
      fireEvent(flatList, 'endReached');
      
      await waitFor(() => {
        expect(defaultProps.onLoadMore).toHaveBeenCalled();
      });
    });

    it('does not call onLoadMore when hasMorePosts is false', async () => {
      const { getByTestId } = render(
        <SocialFeed {...defaultProps} hasMorePosts={false} />
      );
      
      const flatList = getByTestId('social-feed-flatlist');
      fireEvent(flatList, 'endReached');
      
      await waitFor(() => {
        expect(defaultProps.onLoadMore).not.toHaveBeenCalled();
      });
    });

    it('does not call onLoadMore when already loading more', async () => {
      const { getByTestId } = render(
        <SocialFeed {...defaultProps} hasMorePosts={true} />
      );
      
      const flatList = getByTestId('social-feed-flatlist');
      
      // First call should work
      fireEvent(flatList, 'endReached');
      
      // Second call should be ignored while loading
      fireEvent(flatList, 'endReached');
      
      await waitFor(() => {
        expect(defaultProps.onLoadMore).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks analytics when refresh is triggered', async () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      const refreshControl = getByTestId('social-feed-refresh-control');
      fireEvent(refreshControl, 'refresh');
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'refresh_feed',
          documentType: 'social_feed',
          metadata: {
            filterType: 'all',
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('tracks analytics when load more is triggered', async () => {
      const { getByTestId } = render(
        <SocialFeed {...defaultProps} hasMorePosts={true} filterType="pet_spotlight" />
      );
      
      const flatList = getByTestId('social-feed-flatlist');
      fireEvent(flatList, 'endReached');
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'load_more_posts',
          documentType: 'social_feed',
          metadata: {
            currentPostCount: 2,
            filterType: 'pet_spotlight',
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('tracks analytics when create post is opened', async () => {
      const { getByTestId } = render(
        <SocialFeed {...defaultProps} showCreateButton={true} />
      );
      
      fireEvent.press(getByTestId('create-post-header-button'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'open_create_post',
          documentType: 'social_feed',
          metadata: {
            correlationId: mockCorrelationId,
          },
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('shows alert when refresh fails', async () => {
      (correlationIdService.getCorrelationId as jest.Mock).mockRejectedValue(
        new Error('Correlation ID error')
      );
      
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      const refreshControl = getByTestId('social-feed-refresh-control');
      fireEvent(refreshControl, 'refresh');
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Unable to refresh feed. Please try again.'
        );
      });
    });

    it('shows alert when create post fails to open', async () => {
      (correlationIdService.getCorrelationId as jest.Mock).mockRejectedValue(
        new Error('Correlation ID error')
      );
      
      const { getByTestId } = render(
        <SocialFeed {...defaultProps} showCreateButton={true} />
      );
      
      fireEvent.press(getByTestId('create-post-header-button'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Unable to open create post. Please try again.'
        );
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('has proper FlatList optimizations', () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      const flatList = getByTestId('social-feed-flatlist');
      expect(flatList.props.removeClippedSubviews).toBe(true);
      expect(flatList.props.maxToRenderPerBatch).toBe(5);
      expect(flatList.props.updateCellsBatchingPeriod).toBe(100);
      expect(flatList.props.windowSize).toBe(10);
    });

    it('uses proper key extractor', () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      const flatList = getByTestId('social-feed-flatlist');
      expect(flatList.props.keyExtractor(mockPosts[0])).toBe('post-1');
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility properties', () => {
      const { getByTestId } = render(<SocialFeed {...defaultProps} />);
      
      const flatList = getByTestId('social-feed-flatlist');
      expect(flatList.props.showsVerticalScrollIndicator).toBe(false);
    });

    it('renders empty state with proper accessibility', () => {
      const { getByText } = render(
        <SocialFeed {...defaultProps} posts={[]} loading={false} />
      );
      
      expect(getByText('🐾')).toBeTruthy();
      expect(getByText('No Posts Yet')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing onRefresh callback gracefully', async () => {
      const { getByTestId } = render(
        <SocialFeed {...defaultProps} onRefresh={undefined} />
      );
      
      const refreshControl = getByTestId('social-feed-refresh-control');
      
      expect(() => {
        fireEvent(refreshControl, 'refresh');
      }).not.toThrow();
    });

    it('handles missing onLoadMore callback gracefully', async () => {
      const { getByTestId } = render(
        <SocialFeed {...defaultProps} onLoadMore={undefined} hasMorePosts={true} />
      );
      
      const flatList = getByTestId('social-feed-flatlist');
      
      expect(() => {
        fireEvent(flatList, 'endReached');
      }).not.toThrow();
    });

    it('handles missing onCreatePost callback gracefully', () => {
      const { queryByText } = render(
        <SocialFeed 
          {...defaultProps} 
          onCreatePost={undefined}
          showCreateButton={true}
        />
      );
      
      expect(queryByText('Share your pet story...')).toBeNull();
    });

    it('handles empty posts array', () => {
      const { getByText } = render(
        <SocialFeed {...defaultProps} posts={[]} loading={false} />
      );
      
      expect(getByText('No Posts Yet')).toBeTruthy();
    });
  });
});