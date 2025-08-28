// Pet Love Community - Comment Card Component Tests
// Comprehensive unit tests for the comment card component

// Mock Redux hooks before importing anything else
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
  useStore: jest.fn(() => ({
    getState: jest.fn(),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  })),
}));

import React from 'react';
import { renderWithScreen as render, fireEvent, waitFor } from '../../../__mocks__/testUtils';
import { Alert } from 'react-native';
import { CommentCard, CommentCardProps, CommentContent } from '../CommentCard';
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
    },
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('CommentCard', () => {
  const mockCorrelationId = 'test-correlation-id';

  const baseComment: CommentContent = {
    id: 'comment-1',
    author: {
      id: 'user-1',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      isVerified: true,
    },
    content: 'This is a test comment!',
    timestamp: '2024-01-01T12:00:00Z',
    likes: 3,
    isLiked: false,
    postId: 'post-1',
  };

  const commentWithReplies: CommentContent = {
    ...baseComment,
    replies: [
      {
        id: 'reply-1',
        author: {
          id: 'user-2',
          name: 'Jane Smith',
        },
        content: 'This is a reply!',
        timestamp: '2024-01-01T12:30:00Z',
        likes: 1,
        isLiked: false,
        postId: 'post-1',
      },
      {
        id: 'reply-2',
        author: {
          id: 'user-3',
          name: 'Bob Wilson',
        },
        content: 'Another reply!',
        timestamp: '2024-01-01T13:00:00Z',
        likes: 0,
        isLiked: false,
        postId: 'post-1',
      },
    ],
  };

  const defaultProps: CommentCardProps = {
    comment: baseComment,
    onLike: jest.fn(),
    onReply: jest.fn(),
    onAuthorPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (correlationIdService.getCorrelationId as jest.Mock).mockResolvedValue(mockCorrelationId);
  });

  describe('Rendering', () => {
    it('renders comment content correctly', () => {
      const { getByText } = render(<CommentCard {...defaultProps} />);
      
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('This is a test comment!')).toBeTruthy();
      expect(getByText('3')).toBeTruthy(); // Like count
    });

    it('renders author avatar when provided', () => {
      const { getByTestId } = render(<CommentCard {...defaultProps} />);
      
      const avatar = getByTestId('comment-author-avatar');
      expect(avatar.props.source).toEqual({ uri: 'https://example.com/avatar.jpg' });
    });

    it('renders placeholder avatar when not provided', () => {
      const commentWithoutAvatar = {
        ...baseComment,
        author: { ...baseComment.author, avatar: undefined },
      };
      
      const { getByTestId } = render(
        <CommentCard {...defaultProps} comment={commentWithoutAvatar} />
      );
      
      expect(getByTestId('comment-author-avatar-placeholder')).toBeTruthy();
    });

    it('renders verification badge for verified users', () => {
      const { getByText } = render(<CommentCard {...defaultProps} />);
      
      expect(getByText('✓')).toBeTruthy();
    });

    it('does not render verification badge for non-verified users', () => {
      const commentWithoutVerification = {
        ...baseComment,
        author: { ...baseComment.author, isVerified: false },
      };
      
      const { queryByText } = render(
        <CommentCard {...defaultProps} comment={commentWithoutVerification} />
      );
      
      expect(queryByText('✓')).toBeNull();
    });

    it('renders smaller size for reply comments', () => {
      const { getByTestId } = render(
        <CommentCard {...defaultProps} isReply={true} />
      );
      
      const avatar = getByTestId('comment-author-avatar');
      expect(avatar.props.style).toMatchObject({
        width: 32,
        height: 32,
        borderRadius: 16,
      });
    });

    it('does not render reply button for reply comments', () => {
      const { queryByText } = render(
        <CommentCard {...defaultProps} isReply={true} />
      );
      
      expect(queryByText('Reply')).toBeNull();
    });

    it('does not render actions when showActions is false', () => {
      const { queryByTestId } = render(
        <CommentCard {...defaultProps} showActions={false} />
      );
      
      expect(queryByTestId('like-button')).toBeNull();
      expect(queryByText('Reply')).toBeNull();
    });
  });

  describe('Timestamp Formatting', () => {
    it('shows "now" for very recent comments', () => {
      const recentComment = {
        ...baseComment,
        timestamp: new Date().toISOString(),
      };
      
      const { getByText } = render(<CommentCard {...defaultProps} comment={recentComment} />);
      
      expect(getByText('now')).toBeTruthy();
    });

    it('shows minutes for comments within an hour', () => {
      const minutesAgo = new Date();
      minutesAgo.setMinutes(minutesAgo.getMinutes() - 30);
      
      const recentComment = {
        ...baseComment,
        timestamp: minutesAgo.toISOString(),
      };
      
      const { getByText } = render(<CommentCard {...defaultProps} comment={recentComment} />);
      
      expect(getByText('30m')).toBeTruthy();
    });

    it('shows hours for comments within a day', () => {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - 5);
      
      const oldComment = {
        ...baseComment,
        timestamp: hoursAgo.toISOString(),
      };
      
      const { getByText } = render(<CommentCard {...defaultProps} comment={oldComment} />);
      
      expect(getByText('5h')).toBeTruthy();
    });

    it('shows days for older comments', () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - 3);
      
      const oldComment = {
        ...baseComment,
        timestamp: daysAgo.toISOString(),
      };
      
      const { getByText } = render(<CommentCard {...defaultProps} comment={oldComment} />);
      
      expect(getByText('3d')).toBeTruthy();
    });
  });

  describe('Like State', () => {
    it('shows liked state correctly', () => {
      const likedComment = { ...baseComment, isLiked: true };
      
      const { getByText } = render(<CommentCard {...defaultProps} comment={likedComment} />);
      
      expect(getByText('❤️')).toBeTruthy();
    });

    it('shows unliked state correctly', () => {
      const { getByText } = render(<CommentCard {...defaultProps} />);
      
      expect(getByText('🤍')).toBeTruthy();
    });

    it('shows like count only when greater than 0', () => {
      const commentWithoutLikes = { ...baseComment, likes: 0 };
      
      const { queryByText } = render(
        <CommentCard {...defaultProps} comment={commentWithoutLikes} />
      );
      
      expect(queryByText('0')).toBeNull();
    });

    it('shows like count when greater than 0', () => {
      const { getByText } = render(<CommentCard {...defaultProps} />);
      
      expect(getByText('3')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onLike when like button is pressed', async () => {
      const { getByTestId } = render(<CommentCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(defaultProps.onLike).toHaveBeenCalledWith('comment-1');
      });
    });

    it('calls onReply when reply button is pressed', async () => {
      const { getByText } = render(<CommentCard {...defaultProps} />);
      
      fireEvent.press(getByText('Reply'));
      
      await waitFor(() => {
        expect(defaultProps.onReply).toHaveBeenCalledWith('comment-1');
      });
    });

    it('calls onAuthorPress when author is pressed', () => {
      const { getByTestId } = render(<CommentCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('author-container'));
      
      expect(defaultProps.onAuthorPress).toHaveBeenCalledWith('user-1');
    });

    it('does not trigger actions when disabled', async () => {
      const { getByTestId, getByText } = render(
        <CommentCard {...defaultProps} disabled={true} />
      );
      
      fireEvent.press(getByTestId('like-button'));
      fireEvent.press(getByText('Reply'));
      fireEvent.press(getByTestId('author-container'));
      
      await waitFor(() => {
        expect(defaultProps.onLike).not.toHaveBeenCalled();
        expect(defaultProps.onReply).not.toHaveBeenCalled();
        expect(defaultProps.onAuthorPress).not.toHaveBeenCalled();
      });
    });

    it('prevents multiple like actions when isLiking', async () => {
      const { getByTestId } = render(<CommentCard {...defaultProps} />);
      
      // First press
      fireEvent.press(getByTestId('like-button'));
      
      // Second press should be ignored
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(defaultProps.onLike).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Replies Management', () => {
    it('renders replies when present', () => {
      const { getByText } = render(
        <CommentCard {...defaultProps} comment={commentWithReplies} />
      );
      
      expect(getByText('This is a reply!')).toBeTruthy();
      expect(getByText('Another reply!')).toBeTruthy();
    });

    it('limits replies shown to maxReplies', () => {
      const { getByText, queryByText } = render(
        <CommentCard 
          {...defaultProps} 
          comment={commentWithReplies} 
          maxReplies={1}
        />
      );
      
      expect(getByText('This is a reply!')).toBeTruthy();
      expect(queryByText('Another reply!')).toBeNull();
    });

    it('shows "View more replies" button when there are more replies', () => {
      const { getByText } = render(
        <CommentCard 
          {...defaultProps} 
          comment={commentWithReplies} 
          maxReplies={1}
        />
      );
      
      expect(getByText('View 1 more replies')).toBeTruthy();
    });

    it('expands all replies when "View more replies" is pressed', () => {
      const { getByText } = render(
        <CommentCard 
          {...defaultProps} 
          comment={commentWithReplies} 
          maxReplies={1}
        />
      );
      
      fireEvent.press(getByText('View 1 more replies'));
      
      expect(getByText('This is a reply!')).toBeTruthy();
      expect(getByText('Another reply!')).toBeTruthy();
    });

    it('does not show "View more replies" when all replies are shown', () => {
      const { queryByText } = render(
        <CommentCard 
          {...defaultProps} 
          comment={commentWithReplies} 
          maxReplies={5}
        />
      );
      
      expect(queryByText(/View \d+ more replies/)).toBeNull();
    });

    it('renders reply indicator line for replies', () => {
      const { getByTestId } = render(
        <CommentCard {...defaultProps} isReply={true} />
      );
      
      expect(getByTestId('reply-indicator')).toBeTruthy();
    });

    it('does not render reply indicator for main comments', () => {
      const { queryByTestId } = render(
        <CommentCard {...defaultProps} isReply={false} />
      );
      
      expect(queryByTestId('reply-indicator')).toBeNull();
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks like action analytics', async () => {
      const { getByTestId } = render(<CommentCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'like_comment',
          documentType: 'social_comment',
          metadata: {
            commentId: 'comment-1',
            postId: 'post-1',
            authorId: 'user-1',
            isReply: false,
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('tracks unlike action analytics for liked comments', async () => {
      const likedComment = { ...baseComment, isLiked: true };
      
      const { getByTestId } = render(
        <CommentCard {...defaultProps} comment={likedComment} />
      );
      
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'unlike_comment',
          documentType: 'social_comment',
          metadata: {
            commentId: 'comment-1',
            postId: 'post-1',
            authorId: 'user-1',
            isReply: false,
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('tracks reply action analytics', async () => {
      const { getByText } = render(<CommentCard {...defaultProps} />);
      
      fireEvent.press(getByText('Reply'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'reply_to_comment',
          documentType: 'social_comment',
          metadata: {
            commentId: 'comment-1',
            postId: 'post-1',
            authorId: 'user-1',
            isReply: false,
            correlationId: mockCorrelationId,
          },
        });
      });
    });

    it('tracks analytics correctly for reply comments', async () => {
      const { getByTestId } = render(
        <CommentCard {...defaultProps} isReply={true} />
      );
      
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'like_comment',
          documentType: 'social_comment',
          metadata: {
            commentId: 'comment-1',
            postId: 'post-1',
            authorId: 'user-1',
            isReply: true,
            correlationId: mockCorrelationId,
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
      
      const { getByTestId } = render(<CommentCard {...defaultProps} />);
      
      fireEvent.press(getByTestId('like-button'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Unable to update like. Please try again.'
        );
      });
    });

    it('shows alert when reply action fails', async () => {
      (correlationIdService.getCorrelationId as jest.Mock).mockRejectedValue(
        new Error('Correlation ID error')
      );
      
      const { getByText } = render(<CommentCard {...defaultProps} />);
      
      fireEvent.press(getByText('Reply'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Unable to open reply. Please try again.'
        );
      });
    });
  });

  describe('Nested Replies', () => {
    it('renders nested replies recursively', () => {
      const commentWithNestedReplies: CommentContent = {
        ...baseComment,
        replies: [
          {
            id: 'reply-1',
            author: {
              id: 'user-2',
              name: 'Jane Smith',
            },
            content: 'This is a reply!',
            timestamp: '2024-01-01T12:30:00Z',
            likes: 1,
            isLiked: false,
            postId: 'post-1',
            replies: [
              {
                id: 'nested-reply-1',
                author: {
                  id: 'user-3',
                  name: 'Bob Wilson',
                },
                content: 'Nested reply!',
                timestamp: '2024-01-01T13:00:00Z',
                likes: 0,
                isLiked: false,
                postId: 'post-1',
              },
            ],
          },
        ],
      };
      
      const { getByText } = render(
        <CommentCard {...defaultProps} comment={commentWithNestedReplies} />
      );
      
      expect(getByText('This is a reply!')).toBeTruthy();
      expect(getByText('Nested reply!')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing callback functions gracefully', () => {
      const propsWithoutCallbacks = {
        comment: baseComment,
        onLike: undefined,
        onReply: undefined,
        onAuthorPress: undefined,
      };
      
      const { getByTestId, getByText } = render(
        <CommentCard {...propsWithoutCallbacks} />
      );
      
      expect(() => {
        fireEvent.press(getByTestId('like-button'));
        fireEvent.press(getByText('Reply'));
        fireEvent.press(getByTestId('author-container'));
      }).not.toThrow();
    });

    it('handles comment without author gracefully', () => {
      const commentWithoutAuthor = {
        ...baseComment,
        author: {
          id: '',
          name: '',
        },
      };
      
      const { getByText } = render(
        <CommentCard {...defaultProps} comment={commentWithoutAuthor} />
      );
      
      expect(getByText('This is a test comment!')).toBeTruthy();
    });

    it('handles very long comment content', () => {
      const commentWithLongContent = {
        ...baseComment,
        content: 'A'.repeat(500),
      };
      
      const { getByText } = render(
        <CommentCard {...defaultProps} comment={commentWithLongContent} />
      );
      
      expect(getByText('A'.repeat(500))).toBeTruthy();
    });

    it('handles empty replies array', () => {
      const commentWithEmptyReplies = {
        ...baseComment,
        replies: [],
      };
      
      const { queryByText } = render(
        <CommentCard {...defaultProps} comment={commentWithEmptyReplies} />
      );
      
      expect(queryByText(/View \d+ more replies/)).toBeNull();
    });

    it('handles undefined replies', () => {
      const commentWithoutReplies = {
        ...baseComment,
        replies: undefined,
      };
      
      const { queryByText } = render(
        <CommentCard {...defaultProps} comment={commentWithoutReplies} />
      );
      
      expect(queryByText(/View \d+ more replies/)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility for main comment', () => {
      const { getByTestId } = render(<CommentCard {...defaultProps} />);
      
      const container = getByTestId('comment-container');
      expect(container).toBeTruthy();
    });

    it('has proper accessibility for reply comment', () => {
      const { getByTestId } = render(
        <CommentCard {...defaultProps} isReply={true} />
      );
      
      const container = getByTestId('comment-container');
      expect(container).toBeTruthy();
    });

    it('has accessible touch targets', () => {
      const { getByTestId } = render(<CommentCard {...defaultProps} />);
      
      const likeButton = getByTestId('like-button');
      expect(likeButton.props.style).toMatchObject({
        paddingVertical: 4,
        paddingHorizontal: 4,
      });
    });
  });

  describe('Component Styling', () => {
    it('applies correct padding for main comments', () => {
      const { getByTestId } = render(<CommentCard {...defaultProps} />);
      
      const container = getByTestId('comment-container');
      expect(container.props.style).toMatchObject({
        paddingLeft: 0,
      });
    });

    it('applies correct padding for reply comments', () => {
      const { getByTestId } = render(
        <CommentCard {...defaultProps} isReply={true} />
      );
      
      const container = getByTestId('comment-container');
      expect(container.props.style).toMatchObject({
        paddingLeft: 40,
      });
    });

    it('uses correct font sizes for main comments', () => {
      const { getByText } = render(<CommentCard {...defaultProps} />);
      
      const authorName = getByText('John Doe');
      expect(authorName.props.style).toMatchObject({
        fontSize: 14,
      });
    });

    it('uses correct font sizes for reply comments', () => {
      const { getByText } = render(
        <CommentCard {...defaultProps} isReply={true} />
      );
      
      const authorName = getByText('John Doe');
      expect(authorName.props.style).toMatchObject({
        fontSize: 13,
      });
    });
  });
});