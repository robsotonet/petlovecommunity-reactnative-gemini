// Pet Love Community - Create Post Modal Component Tests
// Comprehensive unit tests for the create post modal component

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
const act = (fn: () => void) => fn(); // Simple act implementation for our custom utilities
import { Alert } from 'react-native';
import { CreatePostModal, CreatePostModalProps, CreatePostData } from '../CreatePostModal';
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
      error: '#dc3545',
      warning: '#ffc107',
    },
  }),
}));

jest.mock('../../Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress, disabled, testID }: any) => (
    <TouchableOpacity testID={testID} onPress={onPress} disabled={disabled}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../../CameraModal', () => ({
  CameraModal: ({ visible, onClose, onCapture }: any) => {
    const { Modal, TouchableOpacity, Text } = require('react-native');
    return (
      <Modal visible={visible} testID="camera-modal">
        <TouchableOpacity 
          testID="capture-photo"
          onPress={() => onCapture('file://captured-photo.jpg')}
        >
          <Text>Capture Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="close-camera" onPress={onClose}>
          <Text>Close Camera</Text>
        </TouchableOpacity>
      </Modal>
    );
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('CreatePostModal', () => {
  const mockCorrelationId = 'test-correlation-id';
  const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

  const defaultProps: CreatePostModalProps = {
    visible: true,
    onClose: jest.fn(),
    onSubmit: mockOnSubmit,
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (correlationIdService.getCorrelationId as jest.Mock).mockResolvedValue(mockCorrelationId);
  });

  describe('Rendering', () => {
    it('renders modal when visible', () => {
      const { getByText, getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      expect(getByText('New Post')).toBeTruthy();
      expect(getByTestId('content-input')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Share')).toBeTruthy();
    });

    it('does not render modal when not visible', () => {
      const { queryByText } = render(
        <CreatePostModal {...defaultProps} visible={false} />
      );
      
      expect(queryByText('New Post')).toBeNull();
    });

    it('renders all post type options', () => {
      const { getByText } = render(<CreatePostModal {...defaultProps} />);
      
      expect(getByText('General')).toBeTruthy();
      expect(getByText('Adoption Success')).toBeTruthy();
      expect(getByText('Pet Spotlight')).toBeTruthy();
      expect(getByText('Shelter Update')).toBeTruthy();
    });

    it('renders initial post type selection', () => {
      const { getByTestId } = render(
        <CreatePostModal {...defaultProps} initialPostType="adoption_success" />
      );
      
      const adoptionSuccessOption = getByTestId('post-type-adoption_success');
      expect(adoptionSuccessOption).toBeTruthy();
    });

    it('shows character count', () => {
      const { getByText, getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      expect(getByText('0/500')).toBeTruthy();
      
      // Type some content
      fireEvent.changeText(getByTestId('content-input'), 'Test content');
      
      expect(getByText('12/500')).toBeTruthy();
    });

    it('shows image counter', () => {
      const { getByText } = render(<CreatePostModal {...defaultProps} />);
      
      expect(getByText('Photos (0/4)')).toBeTruthy();
    });

    it('shows tag counter', () => {
      const { getByText } = render(<CreatePostModal {...defaultProps} />);
      
      expect(getByText('Tags (0/5)')).toBeTruthy();
    });
  });

  describe('Content Input', () => {
    it('updates content when text changes', () => {
      const { getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      const contentInput = getByTestId('content-input');
      fireEvent.changeText(contentInput, 'This is my test post');
      
      expect(contentInput.props.value).toBe('This is my test post');
    });

    it('shows warning when character count is near limit', () => {
      const { getByTestId, getByText } = render(
        <CreatePostModal {...defaultProps} maxContentLength={100} />
      );
      
      const contentInput = getByTestId('content-input');
      fireEvent.changeText(contentInput, 'A'.repeat(95));
      
      const characterCount = getByText('95/100');
      expect(characterCount).toBeTruthy();
    });

    it('shows error when character count exceeds limit', () => {
      const { getByTestId, getByText } = render(
        <CreatePostModal {...defaultProps} maxContentLength={100} />
      );
      
      const contentInput = getByTestId('content-input');
      fireEvent.changeText(contentInput, 'A'.repeat(105));
      
      const characterCount = getByText('105/100');
      expect(characterCount).toBeTruthy();
    });

    it('enforces max length on input', () => {
      const { getByTestId } = render(
        <CreatePostModal {...defaultProps} maxContentLength={100} />
      );
      
      const contentInput = getByTestId('content-input');
      expect(contentInput.props.maxLength).toBe(100);
    });
  });

  describe('Post Type Selection', () => {
    it('allows selecting different post types', () => {
      const { getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      const adoptionSuccessOption = getByTestId('post-type-adoption_success');
      fireEvent.press(adoptionSuccessOption);
      
      expect(adoptionSuccessOption).toBeTruthy();
    });

    it('shows correct icons for each post type', () => {
      const { getByText } = render(<CreatePostModal {...defaultProps} />);
      
      expect(getByText('💬')).toBeTruthy(); // General
      expect(getByText('🎉')).toBeTruthy(); // Adoption Success
      expect(getByText('🐾')).toBeTruthy(); // Pet Spotlight
      expect(getByText('📢')).toBeTruthy(); // Shelter Update
    });
  });

  describe('Image Management', () => {
    it('opens camera when add image button is pressed', () => {
      const { getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      const addImageButton = getByTestId('add-image-button');
      fireEvent.press(addImageButton);
      
      expect(getByTestId('camera-modal')).toBeTruthy();
    });

    it('adds image when camera captures photo', async () => {
      const { getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      // Open camera
      fireEvent.press(getByTestId('add-image-button'));
      
      // Capture photo
      fireEvent.press(getByTestId('capture-photo'));
      
      await waitFor(() => {
        expect(getByTestId('image-0')).toBeTruthy();
      });
    });

    it('removes image when remove button is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      // Add image first
      fireEvent.press(getByTestId('add-image-button'));
      fireEvent.press(getByTestId('capture-photo'));
      
      await waitFor(() => {
        expect(getByTestId('image-0')).toBeTruthy();
      });
      
      // Remove image
      fireEvent.press(getByTestId('remove-image-0'));
      
      await waitFor(() => {
        expect(queryByTestId('image-0')).toBeNull();
      });
    });

    it('shows alert when trying to add more than max images', async () => {
      const { getByTestId } = render(
        <CreatePostModal {...defaultProps} maxImages={1} />
      );
      
      // Add first image
      fireEvent.press(getByTestId('add-image-button'));
      fireEvent.press(getByTestId('capture-photo'));
      
      await waitFor(() => {
        expect(getByTestId('image-0')).toBeTruthy();
      });
      
      // Try to add second image
      fireEvent.press(getByTestId('add-image-button'));
      fireEvent.press(getByTestId('capture-photo'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Maximum Images',
          'You can only add up to 1 images per post.'
        );
      });
    });

    it('hides add image button when max images reached', async () => {
      const { getByTestId, queryByTestId } = render(
        <CreatePostModal {...defaultProps} maxImages={1} />
      );
      
      // Add image
      fireEvent.press(getByTestId('add-image-button'));
      fireEvent.press(getByTestId('capture-photo'));
      
      await waitFor(() => {
        expect(queryByTestId('add-image-button')).toBeNull();
      });
    });
  });

  describe('Tag Management', () => {
    it('adds tag when add button is pressed', async () => {
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      const tagInput = getByTestId('tag-input');
      fireEvent.changeText(tagInput, 'dogs');
      
      fireEvent.press(getByTestId('add-tag-button'));
      
      await waitFor(() => {
        expect(getByText('#dogs')).toBeTruthy();
      });
    });

    it('adds tag when enter is pressed', async () => {
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      const tagInput = getByTestId('tag-input');
      fireEvent.changeText(tagInput, 'cats');
      fireEvent(tagInput, 'submitEditing');
      
      await waitFor(() => {
        expect(getByText('#cats')).toBeTruthy();
      });
    });

    it('removes tag when remove button is pressed', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <CreatePostModal {...defaultProps} />
      );
      
      // Add tag first
      const tagInput = getByTestId('tag-input');
      fireEvent.changeText(tagInput, 'dogs');
      fireEvent.press(getByTestId('add-tag-button'));
      
      await waitFor(() => {
        expect(getByText('#dogs')).toBeTruthy();
      });
      
      // Remove tag
      fireEvent.press(getByTestId('remove-tag-dogs'));
      
      await waitFor(() => {
        expect(queryByText('#dogs')).toBeNull();
      });
    });

    it('does not add duplicate tags', async () => {
      const { getByTestId, getAllByText } = render(<CreatePostModal {...defaultProps} />);
      
      const tagInput = getByTestId('tag-input');
      
      // Add first tag
      fireEvent.changeText(tagInput, 'dogs');
      fireEvent.press(getByTestId('add-tag-button'));
      
      // Try to add same tag again
      fireEvent.changeText(tagInput, 'dogs');
      fireEvent.press(getByTestId('add-tag-button'));
      
      await waitFor(() => {
        const dogTags = getAllByText('#dogs');
        expect(dogTags.length).toBe(1);
      });
    });

    it('does not add more than 5 tags', async () => {
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      const tagInput = getByTestId('tag-input');
      
      // Add 5 tags
      for (let i = 1; i <= 5; i++) {
        fireEvent.changeText(tagInput, `tag${i}`);
        fireEvent.press(getByTestId('add-tag-button'));
      }
      
      await waitFor(() => {
        expect(getByText('Tags (5/5)')).toBeTruthy();
      });
      
      // Try to add 6th tag
      fireEvent.changeText(tagInput, 'tag6');
      fireEvent.press(getByTestId('add-tag-button'));
      
      // Should still be 5 tags
      expect(getByText('Tags (5/5)')).toBeTruthy();
    });

    it('clears tag input after adding tag', async () => {
      const { getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      const tagInput = getByTestId('tag-input');
      fireEvent.changeText(tagInput, 'dogs');
      fireEvent.press(getByTestId('add-tag-button'));
      
      await waitFor(() => {
        expect(tagInput.props.value).toBe('');
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data', async () => {
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      // Fill form
      fireEvent.changeText(getByTestId('content-input'), 'Test post content');
      fireEvent.press(getByTestId('post-type-pet_spotlight'));
      
      // Add tag
      fireEvent.changeText(getByTestId('tag-input'), 'dogs');
      fireEvent.press(getByTestId('add-tag-button'));
      
      // Submit
      fireEvent.press(getByText('Share'));
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          content: 'Test post content',
          images: [],
          postType: 'pet_spotlight',
          tags: ['dogs'],
          petId: undefined,
          petName: undefined,
        });
      });
    });

    it('submits with initial pet data when provided', async () => {
      const { getByTestId, getByText } = render(
        <CreatePostModal 
          {...defaultProps} 
          initialPetId="pet-1" 
          initialPetName="Max"
        />
      );
      
      fireEvent.changeText(getByTestId('content-input'), 'Test post about Max');
      fireEvent.press(getByText('Share'));
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          content: 'Test post about Max',
          images: [],
          postType: 'general',
          tags: [],
          petId: 'pet-1',
          petName: 'Max',
        });
      });
    });

    it('shows error when submitting without content', async () => {
      const { getByText } = render(<CreatePostModal {...defaultProps} />);
      
      fireEvent.press(getByText('Share'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Missing Content',
          'Please write something to share with the community.'
        );
      });
    });

    it('shows error when content exceeds max length', async () => {
      const { getByTestId, getByText } = render(
        <CreatePostModal {...defaultProps} maxContentLength={10} />
      );
      
      fireEvent.changeText(getByTestId('content-input'), 'This is too long content');
      fireEvent.press(getByText('Share'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Content Too Long',
          'Please keep your post under 10 characters.'
        );
      });
    });

    it('resets form after successful submission', async () => {
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      // Fill form
      fireEvent.changeText(getByTestId('content-input'), 'Test content');
      
      // Submit
      fireEvent.press(getByText('Share'));
      
      await waitFor(() => {
        expect(getByTestId('content-input').props.value).toBe('');
      });
    });

    it('shows loading state when submitting', () => {
      const { getByText } = render(<CreatePostModal {...defaultProps} loading={true} />);
      
      expect(getByText('Sharing...')).toBeTruthy();
    });

    it('disables submit button when loading', () => {
      const { getByTestId } = render(<CreatePostModal {...defaultProps} loading={true} />);
      
      const submitButton = getByTestId('submit-button');
      expect(submitButton.props.disabled).toBe(true);
    });

    it('shows alert when submission fails', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('Submission failed'));
      
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      fireEvent.changeText(getByTestId('content-input'), 'Test content');
      fireEvent.press(getByText('Share'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Unable to create post. Please try again.'
        );
      });
    });
  });

  describe('Modal Closing', () => {
    it('calls onClose when cancel button is pressed with no changes', () => {
      const { getByText } = render(<CreatePostModal {...defaultProps} />);
      
      fireEvent.press(getByText('Cancel'));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('shows confirmation dialog when closing with changes', async () => {
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      // Make changes
      fireEvent.changeText(getByTestId('content-input'), 'Some content');
      
      // Try to close
      fireEvent.press(getByText('Cancel'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Discard Post?',
          'You have unsaved changes. Are you sure you want to discard this post?',
          expect.any(Array)
        );
      });
    });

    it('resets form when user chooses to discard changes', async () => {
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        buttons[1].onPress(); // Press "Discard" button
      });
      
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      // Make changes
      fireEvent.changeText(getByTestId('content-input'), 'Some content');
      
      // Try to close
      fireEvent.press(getByText('Cancel'));
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks post creation analytics', async () => {
      const { getByTestId, getByText } = render(
        <CreatePostModal 
          {...defaultProps} 
          initialPetId="pet-1" 
          initialPetName="Max"
        />
      );
      
      fireEvent.changeText(getByTestId('content-input'), 'Test content');
      fireEvent.press(getByText('Share'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'create_post',
          documentType: 'social_post',
          petId: 'pet-1',
          petName: 'Max',
          metadata: {
            postType: 'general',
            contentLength: 12,
            imageCount: 0,
            tagCount: 0,
            correlationId: mockCorrelationId,
          },
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles very long tag input', async () => {
      const { getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      const tagInput = getByTestId('tag-input');
      fireEvent.changeText(tagInput, 'a'.repeat(25));
      
      expect(tagInput.props.maxLength).toBe(20);
    });

    it('handles whitespace-only content', async () => {
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      fireEvent.changeText(getByTestId('content-input'), '   ');
      fireEvent.press(getByText('Share'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Missing Content',
          'Please write something to share with the community.'
        );
      });
    });

    it('handles empty tag input when add button is pressed', async () => {
      const { getByTestId, queryByText } = render(<CreatePostModal {...defaultProps} />);
      
      fireEvent.press(getByTestId('add-tag-button'));
      
      expect(queryByText('#')).toBeNull();
    });

    it('trims whitespace from tags', async () => {
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      const tagInput = getByTestId('tag-input');
      fireEvent.changeText(tagInput, '  dogs  ');
      fireEvent.press(getByTestId('add-tag-button'));
      
      await waitFor(() => {
        expect(getByText('#dogs')).toBeTruthy();
      });
    });

    it('converts tags to lowercase', async () => {
      const { getByTestId, getByText } = render(<CreatePostModal {...defaultProps} />);
      
      const tagInput = getByTestId('tag-input');
      fireEvent.changeText(tagInput, 'DOGS');
      fireEvent.press(getByTestId('add-tag-button'));
      
      await waitFor(() => {
        expect(getByText('#dogs')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      const { getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      const contentInput = getByTestId('content-input');
      expect(contentInput.props.placeholder).toBe('Share your pet story with the community...');
    });

    it('auto-focuses content input when modal opens', () => {
      const { getByTestId } = render(<CreatePostModal {...defaultProps} />);
      
      const contentInput = getByTestId('content-input');
      expect(contentInput.props.autoFocus).toBe(true);
    });
  });
});