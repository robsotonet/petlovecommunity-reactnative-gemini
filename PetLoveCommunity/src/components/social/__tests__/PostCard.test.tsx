// Pet Love Community - Post Card Component Tests
// Comprehensive unit tests for the post card component

import React from 'react';
import { renderWithScreen as render, fireEvent, waitFor } from '../../../__mocks__/testUtils';
const act = (fn: () => void) => fn(); // Simple act implementation for our custom utilities
import { Alert } from 'react-native';
import { PostCard, PostCardProps, PostContent } from '../PostCard';
import correlationIdService from '../../../services/correlationIdService';
import useAdoptionAnalytics from '../../../hooks/useAdoptionAnalytics';

// Setup mocks
const mockTrackDocumentAction = jest.fn(() => Promise.resolve());

jest.mock('../../../services/correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-123')),
  generateCorrelationId: jest.fn(() => 'test-correlation-123'),
}));

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
    neutral: {
      beige: '#F7FFF7',
      midnight: '#1A535C',
      lightGray: '#E5E5E5',
    },
    primary: {
      teal: '#4ECDC4',
      coral: '#FF6B6B',
    },
    extended: {
      textVariations: {
        secondary: '#666666',
        tertiary: '#999999',
      },
      tealVariations: {
        background: '#E8F5F5',
      },
      coralVariations: {
        light: '#FFE5E5',
      },
    },
    semantic: {
      info: '#17a2b8',
    },
  }),
}));

jest.mock('../../Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress, testID }: any) => (
    <TouchableOpacity testID={testID} onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../../ui/ShareButton', () => ({
  ShareButton: ({ content, onShareSuccess, title }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity 
        testID="share-button"
        onPress={() => onShareSuccess?.('system_share')}
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('PostCard', () => {
  const mockCorrelationId = 'test-correlation-id';

  const basePost: PostContent = {
    id: 'post-1',
    author: {
      id: 'user-1',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      isVerified: true,
    },
    content: 'This is a test post about my dog Max!',
    images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    timestamp: '2024-01-01T12:00:00Z',
    likes: 5,
    comments: 2,
    isLiked: false,
    petId: 'pet-1',
    petName: 'Max',
    postType: 'pet_spotlight',
    tags: ['dogs', 'cute'],
  };

  const defaultProps: PostCardProps = {
    post: basePost,
    onLike: jest.fn(),
    onComment: jest.fn(),
    onShare: jest.fn(),
    onAuthorPress: jest.fn(),
    onImagePress: jest.fn(),
    showActions: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (correlationIdService.getCorrelationId as jest.Mock).mockResolvedValue(mockCorrelationId);
  });

  describe('Rendering', () => {
    it('renders post content correctly', () => {
      const { getByTestId, getByText } = render(<PostCard {...defaultProps} />);
      
      expect(getByTestId(`post-card-${basePost.id}`)).toBeTruthy();
      expect(getByTestId('post-content')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('This is a test post about my dog Max!')).toBeTruthy();
    });

    it('renders author avatar when provided', () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      const avatar = getByTestId('author-avatar');
      expect(avatar.props.source).toEqual({ uri: 'https://example.com/avatar.jpg' });
    });

    it('renders placeholder avatar when not provided', () => {
      const postWithoutAvatar = {
        ...basePost,
        author: { ...basePost.author, avatar: undefined },
      };
      
      const { getByTestId } = render(
        <PostCard {...defaultProps} post={postWithoutAvatar} />
      );
      
      expect(getByTestId('author-avatar-placeholder')).toBeTruthy();
    });

    it('renders verification badge for verified users', () => {
      const { getByText } = render(<PostCard {...defaultProps} />);
      
      expect(getByText('✓')).toBeTruthy();
    });

    it('does not render verification badge for non-verified users', () => {
      const postWithoutVerification = {
        ...basePost,
        author: { ...basePost.author, isVerified: false },
      };
      
      const { queryByText } = render(
        <PostCard {...defaultProps} post={postWithoutVerification} />
      );
      
      expect(queryByText('✓')).toBeNull();
    });

    it('renders shelter name when provided', () => {
      const postWithShelter = {
        ...basePost,
        author: { ...basePost.author, shelterName: 'Happy Paws Shelter' },
      };
      
      const { getByText } = render(
        <PostCard {...defaultProps} post={postWithShelter} />
      );
      
      expect(getByText('Happy Paws Shelter')).toBeTruthy();
    });

    it('renders post type badge with correct icon and text', () => {
      const { getByText } = render(<PostCard {...defaultProps} />);
      
      expect(getByText('🐾')).toBeTruthy(); // Pet spotlight icon
      expect(getByText('PET SPOTLIGHT')).toBeTruthy();
    });

    it('renders tags when provided', () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      const tag0Text = Array.isArray(getByTestId('tag-text-0').props.children) 
        ? getByTestId('tag-text-0').props.children.join('') 
        : getByTestId('tag-text-0').props.children;
      const tag1Text = Array.isArray(getByTestId('tag-text-1').props.children) 
        ? getByTestId('tag-text-1').props.children.join('') 
        : getByTestId('tag-text-1').props.children;
      
      expect(tag0Text).toBe('#dogs');
      expect(tag1Text).toBe('#cute');
    });

    it('does not render tags section when no tags provided', () => {
      const postWithoutTags = { ...basePost, tags: undefined };
      
      const { queryByText } = render(
        <PostCard {...defaultProps} post={postWithoutTags} />
      );
      
      expect(queryByText('#dogs')).toBeNull();
    });

    it('renders single image correctly', () => {
      const postWithSingleImage = {
        ...basePost,
        images: ['https://example.com/image1.jpg'],
      };
      
      const { getByTestId } = render(
        <PostCard {...defaultProps} post={postWithSingleImage} />
      );
      
      expect(getByTestId('single-image-0')).toBeTruthy();
    });

    it('renders multiple images correctly', () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      expect(getByTestId('multiple-image-0')).toBeTruthy();
      expect(getByTestId('multiple-image-1')).toBeTruthy();
    });

    it('shows more images overlay when more than 4 images', () => {
      const postWithManyImages = {
        ...basePost,
        images: Array.from({ length: 6 }, (_, i) => `https://example.com/image${i + 1}.jpg`),
      };
      
      const { getByTestId } = render(
        <PostCard {...defaultProps} post={postWithManyImages} />
      );
      
      const moreImagesText = Array.isArray(getByTestId('more-images-text').props.children) 
        ? getByTestId('more-images-text').props.children.join('') 
        : getByTestId('more-images-text').props.children;
      expect(moreImagesText).toBe('+2');
      expect(getByTestId('more-images-overlay')).toBeTruthy();
    });

    it('does not render actions when showActions is false', () => {
      const { queryByTestId } = render(
        <PostCard {...defaultProps} showActions={false} />
      );
      
      expect(queryByTestId('like-button')).toBeNull();
      expect(queryByTestId('comment-button')).toBeNull();
      expect(queryByTestId('share-button')).toBeNull();
    });
  });

  describe('Timestamp Formatting', () => {
    it('shows "Just now" for very recent posts', () => {
      const recentPost = {
        ...basePost,
        timestamp: new Date().toISOString(),
      };
      
      const { getByText } = render(<PostCard {...defaultProps} post={recentPost} />);
      
      expect(getByText('Just now')).toBeTruthy();
    });

    it('shows minutes ago for posts within an hour', () => {
      const minutesAgo = new Date();
      minutesAgo.setMinutes(minutesAgo.getMinutes() - 30);
      
      const recentPost = {
        ...basePost,
        timestamp: minutesAgo.toISOString(),
      };
      
      const { getByText } = render(<PostCard {...defaultProps} post={recentPost} />);
      
      expect(getByText('30m ago')).toBeTruthy();
    });

    it('shows hours ago for posts within a day', () => {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - 5);
      
      const oldPost = {
        ...basePost,
        timestamp: hoursAgo.toISOString(),
      };
      
      const { getByText } = render(<PostCard {...defaultProps} post={oldPost} />);
      
      expect(getByText('5h ago')).toBeTruthy();
    });

    it('shows days ago for older posts', () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - 3);
      
      const oldPost = {
        ...basePost,
        timestamp: daysAgo.toISOString(),
      };
      
      const { getByText } = render(<PostCard {...defaultProps} post={oldPost} />);
      
      expect(getByText('3 days ago')).toBeTruthy();
    });
  });

  describe('Post Type Styling', () => {
    it('renders adoption success post correctly', () => {
      const adoptionPost = { ...basePost, postType: 'adoption_success' as const };
      
      const { getByText } = render(<PostCard {...defaultProps} post={adoptionPost} />);
      
      expect(getByText('🎉')).toBeTruthy();
      expect(getByText('ADOPTION SUCCESS')).toBeTruthy();
    });

    it('renders shelter update post correctly', () => {
      const shelterPost = { ...basePost, postType: 'shelter_update' as const };
      
      const { getByText } = render(<PostCard {...defaultProps} post={shelterPost} />);
      
      expect(getByText('📢')).toBeTruthy();
      expect(getByText('SHELTER UPDATE')).toBeTruthy();
    });

    it('renders general post correctly', () => {
      const generalPost = { ...basePost, postType: 'general' as const };
      
      const { getByTestId, getByText } = render(<PostCard {...defaultProps} post={generalPost} />);
      
      const postTypeIcon = Array.isArray(getByTestId('post-type-icon').props.children) 
        ? getByTestId('post-type-icon').props.children.join('') 
        : getByTestId('post-type-icon').props.children;
      expect(postTypeIcon).toBe('💬');
      expect(getByText('GENERAL')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onLike when like button is pressed', async () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(defaultProps.onLike).toHaveBeenCalledWith('post-1');
      });
    });

    it('calls onComment when comment button is pressed', async () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('comment-button'));
      
      await waitFor(() => {
        expect(defaultProps.onComment).toHaveBeenCalledWith('post-1');
      });
    });

    it('calls onShare when share button is pressed', async () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('share-button'));
      
      await waitFor(() => {
        expect(defaultProps.onShare).toHaveBeenCalledWith('post-1');
      });
    });

    it('calls onAuthorPress when author is pressed', () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId(`author-button-${basePost.id}`));
      
      expect(defaultProps.onAuthorPress).toHaveBeenCalledWith('user-1');
    });

    it('calls onImagePress when image is pressed', () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId(`image-${basePost.id}-0`));
      
      expect(defaultProps.onImagePress).toHaveBeenCalledWith(
        'https://example.com/image1.jpg',
        0
      );
    });

    it('does not trigger actions when disabled', async () => {
      const { getByTestId } = render(<PostCard {...defaultProps} disabled={true} />);
      
      fireEvent.press(getByTestId('like-button'));
      fireEvent.press(getByTestId('comment-button'));
      fireEvent.press(getByTestId(`author-button-${basePost.id}`));
      
      await waitFor(() => {
        expect(defaultProps.onLike).not.toHaveBeenCalled();
        expect(defaultProps.onComment).not.toHaveBeenCalled();
        expect(defaultProps.onAuthorPress).not.toHaveBeenCalled();
      });
    });
  });

  describe('Like State', () => {
    it('shows liked state correctly', () => {
      const likedPost = { ...basePost, isLiked: true };
      
      const { getByText } = render(<PostCard {...defaultProps} post={likedPost} />);
      
      expect(getByText('❤️')).toBeTruthy();
    });

    it('shows unliked state correctly', () => {
      const { getByText } = render(<PostCard {...defaultProps} />);
      
      expect(getByText('🤍')).toBeTruthy();
    });

    it('prevents multiple like actions when isLiking', async () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      // First press
      fireEvent.press(getByTestId('like-button'));
      
      // Second press should be ignored
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(defaultProps.onLike).toHaveBeenCalledTimes(1);
      });
    });

    it('prevents multiple comment actions when isCommenting', async () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      // First press
      fireEvent.press(getByTestId('comment-button'));
      
      // Second press should be ignored
      fireEvent.press(getByTestId('comment-button'));
      
      await waitFor(() => {
        expect(defaultProps.onComment).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks like action analytics', async () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'like_post',
          documentType: 'social_post',
          petId: 'pet-1',
          petName: 'Max',
          metadata: {
            postId: 'post-1',
            postType: 'pet_spotlight',
            authorId: 'user-1',
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('tracks unlike action analytics for liked posts', async () => {
      const likedPost = { ...basePost, isLiked: true };
      
      const { getByTestId } = render(<PostCard {...defaultProps} post={likedPost} />);
      
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'unlike_post',
          documentType: 'social_post',
          petId: 'pet-1',
          petName: 'Max',
          metadata: {
            postId: 'post-1',
            postType: 'pet_spotlight',
            authorId: 'user-1',
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('tracks comment action analytics', async () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('comment-button'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'open_comments',
          documentType: 'social_post',
          petId: 'pet-1',
          petName: 'Max',
          metadata: {
            postId: 'post-1',
            postType: 'pet_spotlight',
            authorId: 'user-1',
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('tracks share action analytics', async () => {
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('share-button'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'share_post',
          documentType: 'social_post',
          petId: 'pet-1',
          petName: 'Max',
          metadata: {
            postId: 'post-1',
            postType: 'pet_spotlight',
            platform: 'system_share',
          },
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('shows alert when like action fails', async () => {
      (correlationIdService.getCorrelationId as jest.Mock).mockRejectedValue(
        new Error('Correlation ID error')
      );
      
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Unable to update like. Please try again.'
        );
      });
    });

    it('shows alert when comment action fails', async () => {
      (correlationIdService.getCorrelationId as jest.Mock).mockRejectedValue(
        new Error('Correlation ID error')
      );
      
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('comment-button'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Unable to open comments. Please try again.'
        );
      });
    });
  });

  describe('Share Content Creation', () => {
    it('creates proper share content', () => {
      // This would typically be tested through the ShareButton component
      // which would receive the proper share content
      const { getByTestId } = render(<PostCard {...defaultProps} />);
      
      expect(getByTestId('share-button')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing callback functions gracefully', () => {
      const propsWithoutCallbacks = {
        post: basePost,
        onLike: undefined,
        onComment: undefined,
        onShare: undefined,
        onAuthorPress: undefined,
        onImagePress: undefined,
      };
      
      const { getByTestId } = render(<PostCard {...propsWithoutCallbacks} />);
      
      expect(() => {
        fireEvent.press(getByTestId('like-button'));
        fireEvent.press(getByTestId('comment-button'));
        fireEvent.press(getByTestId(`author-button-${basePost.id}`));
      }).not.toThrow();
    });

    it('handles post without images', () => {
      const postWithoutImages = { ...basePost, images: undefined };
      
      const { queryByTestId } = render(
        <PostCard {...defaultProps} post={postWithoutImages} />
      );
      
      expect(queryByTestId('single-image-0')).toBeNull();
      expect(queryByTestId('multiple-image-0')).toBeNull();
    });

    it('handles post with empty images array', () => {
      const postWithEmptyImages = { ...basePost, images: [] };
      
      const { queryByTestId } = render(
        <PostCard {...defaultProps} post={postWithEmptyImages} />
      );
      
      expect(queryByTestId('single-image-0')).toBeNull();
      expect(queryByTestId('multiple-image-0')).toBeNull();
    });

    it('handles very long content', () => {
      const postWithLongContent = {
        ...basePost,
        content: 'A'.repeat(1000),
      };
      
      const { getByText } = render(
        <PostCard {...defaultProps} post={postWithLongContent} />
      );
      
      expect(getByText('A'.repeat(1000))).toBeTruthy();
    });

    it('handles posts without pet information', () => {
      const postWithoutPet = {
        ...basePost,
        petId: undefined,
        petName: undefined,
      };
      
      const { getByText } = render(
        <PostCard {...defaultProps} post={postWithoutPet} />
      );
      
      expect(getByText('This is a test post about my dog Max!')).toBeTruthy();
    });
  });
});