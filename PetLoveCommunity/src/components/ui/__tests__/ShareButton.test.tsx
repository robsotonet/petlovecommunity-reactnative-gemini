// Pet Love Community - ShareButton Component Tests
// Comprehensive unit tests for social sharing functionality

import React from 'react';
import { renderWithScreen as render, fireEvent, screen, waitFor } from '../../../__mocks__/testUtils';
import { Alert } from 'react-native';
import Share, { Social } from 'react-native-share';
import { ShareButton, ShareButtonProps, ShareContent } from '../ShareButton';
import { useColors } from '../../../hooks/useColors';
import useAdoptionAnalytics from '../../../hooks/useAdoptionAnalytics';
import correlationIdService from '../../../services/correlationIdService';

// ShareButton specific mocks
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
    shareSingle: jest.fn(),
  },
  Social: {
    Facebook: 'facebook',
    Twitter: 'twitter',
    Instagram: 'instagram',
    WhatsApp: 'whatsapp',
  },
}));

jest.mock('../../../services/correlationIdService', () => ({
  __esModule: true,
  default: {
    getCorrelationId: jest.fn(() => Promise.resolve('correlation-123')),
  },
}));

jest.mock('../../../hooks/useAdoptionAnalytics', () => ({
  __esModule: true,
  default: () => ({
    trackDocumentAction: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock('../../../hooks/useColors', () => ({
  useColors: () => ({
    primary: {
      coral: '#FF6B6B',
      teal: '#4ECDC4',
    },
    neutral: {
      beige: '#F7FFF7',
      midnight: '#1A535C',
      lightGray: '#CCCCCC',
      darkGray: '#666666',
    },
    extended: {
      coralVariations: {
        light: '#FF8E8E',
        dark: '#E55555',
      },
      tealVariations: {
        light: '#6ED4CC',
        dark: '#3BB5B0',
        background: '#E8F8F7',
      },
      textVariations: {
        secondary: '#2C6B73',
        tertiary: '#6C757D',
      },
    },
    semantic: {
      success: '#00B894',
      warning: '#FDCB6E',
      error: '#E74C3C',
      info: '#74B9FF',
    },
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Additional mocks specific to ShareButton tests

// Mock Button component with safe implementation
jest.mock('../../Button', () => {
  const React = require('react');
  return React.forwardRef(({ title, onPress, disabled, variant, size, ...props }: any, ref: any) => {
    return React.createElement('View', {
      ...props,
      ref,
      testID: `share-button-${title?.toLowerCase().replace(/\s+/g, '-') || 'button'}`,
      onPress: disabled ? undefined : onPress,
      disabled,
      accessibilityRole: 'button',
      children: title || 'Button'
    });
  });
});

const mockShare = Share as jest.Mocked<typeof Share>;

// Mock the correlationId service for tests  
const mockCorrelationIdService = correlationIdService as jest.Mocked<typeof correlationIdService>;
mockCorrelationIdService.getCorrelationId = jest.fn().mockResolvedValue('correlation-123');

describe('ShareButton', () => {
  const mockTrackDocumentAction = jest.fn();
  const mockOnShareSuccess = jest.fn();
  const mockOnShareError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockImplementation(() => {});
  });

  const createMockContent = (overrides: Partial<ShareContent> = {}): ShareContent => ({
    type: 'pet_photo',
    title: 'Meet Buddy - Available for Adoption!',
    message: 'Check out Buddy, a beautiful 2 year old Golden Retriever! 🐾',
    url: 'https://petlovecommunity.app/pets/buddy-123',
    imageUrl: 'https://example.com/buddy.jpg',
    petId: 'pet-123',
    petName: 'Buddy',
    shelterId: 'shelter-123',
    shelterName: 'Happy Paws Shelter',
    ...overrides,
  });

  const defaultProps: ShareButtonProps = {
    content: createMockContent(),
    onShareSuccess: mockOnShareSuccess,
    onShareError: mockOnShareError,
  };

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<ShareButton {...defaultProps} />);
      
      expect(screen.getByText('📸 Share')).toBeTruthy();
    });

    it('displays custom title', () => {
      render(<ShareButton {...defaultProps} title="Share Pet" />);
      
      expect(screen.getByText('📸 Share Pet')).toBeTruthy();
    });

    it('shows correct icon for different content types', () => {
      const contentTypes = [
        { type: 'pet_photo', icon: '📸' },
        { type: 'adoption_success', icon: '🎉' },
        { type: 'appointment_confirmation', icon: '📅' },
        { type: 'pet_profile', icon: '🐾' },
        { type: 'shelter_event', icon: '🎪' },
      ] as const;

      contentTypes.forEach(({ type, icon }) => {
        const content = createMockContent({ type });
        const { unmount } = render(<ShareButton content={content} />);
        
        expect(screen.getByText(`${icon} Share`)).toBeTruthy();
        unmount();
      });
    });

    it('shows disabled state', () => {
      render(<ShareButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByTestID('share-button-📸-share');
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Generic Sharing', () => {
    it('calls Share.open with correct options', async () => {
      mockShare.open.mockResolvedValue({ success: true, app: 'com.apple.UIKit.activity.Message' });
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockShare.open).toHaveBeenCalledWith({
          title: 'Meet Buddy - Available for Adoption!',
          message: 'Check out Buddy, a beautiful 2 year old Golden Retriever! 🐾',
          url: 'https://petlovecommunity.app/pets/buddy-123',
          urls: ['https://example.com/buddy.jpg'],
        });
      });
    });

    it('calls onShareSuccess on successful share', async () => {
      mockShare.open.mockResolvedValue({ success: true, app: 'com.apple.UIKit.activity.Message' });
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockOnShareSuccess).toHaveBeenCalledWith('com.apple.UIKit.activity.Message');
      });
    });

    it('tracks analytics on successful share', async () => {
      mockShare.open.mockResolvedValue({ success: true, app: 'Messages' });
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'share_success',
          documentType: 'pet_photo',
          petId: 'pet-123',
          petName: 'Buddy',
          metadata: {
            platform: 'Messages',
            shareType: 'pet_photo',
            correlationId: 'correlation-123',
          },
        });
      });
    });

    it('handles share cancellation gracefully', async () => {
      mockShare.open.mockRejectedValue(new Error('User did not share'));
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockOnShareError).not.toHaveBeenCalled();
        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });

    it('handles share error and shows alert', async () => {
      const error = new Error('Network error');
      mockShare.open.mockRejectedValue(error);
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockOnShareError).toHaveBeenCalledWith(error);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Sharing Failed',
          'Unable to share content. Please try again.',
          [{ text: 'OK' }]
        );
      });
    });

    it('tracks analytics on share failure', async () => {
      mockShare.open.mockRejectedValue(new Error('Network error'));
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockTrackDocumentAction).toHaveBeenCalledWith({
          action: 'share_failed',
          documentType: 'pet_photo',
          petId: 'pet-123',
          petName: 'Buddy',
          metadata: {
            platform: 'system_share',
            shareType: 'pet_photo',
            correlationId: 'correlation-123',
          },
        });
      });
    });

    it('shows loading state during share', async () => {
      mockShare.open.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(screen.getByText('📸 Sharing...')).toBeTruthy();
      });
    });
  });

  describe('Platform-Specific Sharing', () => {
    it('shows platform options when showPlatformOptions is true', () => {
      render(<ShareButton {...defaultProps} showPlatformOptions={true} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      expect(screen.getByText('Share to specific app:')).toBeTruthy();
      expect(screen.getByText('Facebook')).toBeTruthy();
      expect(screen.getByText('Instagram')).toBeTruthy();
      expect(screen.getByText('Twitter')).toBeTruthy();
      expect(screen.getByText('WhatsApp')).toBeTruthy();
    });

    it('calls Share.shareSingle for platform-specific sharing', async () => {
      mockShare.shareSingle.mockResolvedValue({ success: true });
      
      render(<ShareButton {...defaultProps} showPlatformOptions={true} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      const facebookButton = screen.getByText('Facebook');
      fireEvent.press(facebookButton);
      
      await waitFor(() => {
        expect(mockShare.shareSingle).toHaveBeenCalledWith({
          title: 'Meet Buddy - Available for Adoption!',
          message: '', // Facebook doesn't allow pre-filled text
          url: 'https://petlovecommunity.app/pets/buddy-123',
          urls: ['https://example.com/buddy.jpg'],
          social: Social.Facebook,
        });
      });
    });

    it('handles platform-specific share options correctly', async () => {
      const testCases = [
        {
          platform: 'Instagram',
          social: Social.Instagram,
          expectedOptions: {
            social: Social.Instagram,
            backgroundImage: 'https://example.com/buddy.jpg',
          },
        },
        {
          platform: 'Twitter',
          social: Social.Twitter,
          expectedOptions: {
            social: Social.Twitter,
            message: 'Check out Buddy, a beautiful 2 year old Golden Retriever! 🐾 https://petlovecommunity.app/pets/buddy-123',
          },
        },
        {
          platform: 'WhatsApp',
          social: Social.WhatsApp,
          expectedOptions: {
            social: Social.WhatsApp,
            whatsAppNumber: '',
          },
        },
      ];

      for (const testCase of testCases) {
        mockShare.shareSingle.mockResolvedValue({ success: true });
        
        const { unmount } = render(<ShareButton {...defaultProps} showPlatformOptions={true} />);
        
        fireEvent.press(screen.getByTestID('share-button-📸-share'));
        
        const platformButton = screen.getByText(testCase.platform);
        fireEvent.press(platformButton);
        
        await waitFor(() => {
          expect(mockShare.shareSingle).toHaveBeenCalledWith(
            expect.objectContaining(testCase.expectedOptions)
          );
        });
        
        unmount();
      }
    });

    it('dismisses platform options when dismiss button is pressed', () => {
      render(<ShareButton {...defaultProps} showPlatformOptions={true} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.press(dismissButton);
      
      expect(screen.queryByText('Share to specific app:')).toBeNull();
    });

    it('handles platform-specific share error', async () => {
      const error = new Error('Instagram not installed');
      mockShare.shareSingle.mockRejectedValue(error);
      
      render(<ShareButton {...defaultProps} showPlatformOptions={true} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      const instagramButton = screen.getByText('Instagram');
      fireEvent.press(instagramButton);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Sharing Failed',
          'Unable to share to Instagram. Please make sure the app is installed and try again.',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Content Without Pet Information', () => {
    it('handles content without petId for analytics', async () => {
      const content = createMockContent({ petId: undefined });
      mockShare.open.mockResolvedValue({ success: true, app: 'Messages' });
      
      render(<ShareButton content={content} onShareSuccess={mockOnShareSuccess} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockOnShareSuccess).toHaveBeenCalledWith('Messages');
        expect(mockTrackDocumentAction).not.toHaveBeenCalled();
      });
    });

    it('handles content without image URL', async () => {
      const content = createMockContent({ imageUrl: undefined });
      mockShare.open.mockResolvedValue({ success: true });
      
      render(<ShareButton content={content} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockShare.open).toHaveBeenCalledWith({
          title: content.title,
          message: content.message,
          url: content.url,
        });
      });
    });

    it('handles content without URL', async () => {
      const content = createMockContent({ url: undefined });
      mockShare.open.mockResolvedValue({ success: true });
      
      render(<ShareButton content={content} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockShare.open).toHaveBeenCalledWith({
          title: content.title,
          message: content.message,
          url: undefined,
          urls: [content.imageUrl],
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels for main button', () => {
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByTestID('share-button-📸-share');
      expect(button).toBeTruthy();
    });

    it('provides accessibility labels for platform buttons', () => {
      render(<ShareButton {...defaultProps} showPlatformOptions={true} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      const facebookButton = screen.getByText('Facebook');
      expect(facebookButton).toBeTruthy();
    });
  });

  describe('Component Props', () => {
    it('applies custom style', () => {
      const customStyle = { marginTop: 20 };
      render(<ShareButton {...defaultProps} style={customStyle} />);
      
      expect(screen.getByTestID('share-button-📸-share')).toBeTruthy();
    });

    it('passes variant to Button component', () => {
      render(<ShareButton {...defaultProps} variant="primary" />);
      
      expect(screen.getByTestID('share-button-📸-share')).toBeTruthy();
    });

    it('passes size to Button component', () => {
      render(<ShareButton {...defaultProps} size="large" />);
      
      expect(screen.getByTestID('share-button-📸-share')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles analytics tracking failure gracefully', async () => {
      mockTrackDocumentAction.mockRejectedValue(new Error('Analytics error'));
      mockShare.open.mockResolvedValue({ success: true, app: 'Messages' });
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockOnShareSuccess).toHaveBeenCalledWith('Messages');
        // Should not crash despite analytics error
      });
    });

    it('handles correlation ID service failure gracefully', async () => {
      mockCorrelationIdService.getCorrelationId.mockRejectedValue(new Error('Service error'));
      mockShare.open.mockResolvedValue({ success: true, app: 'Messages' });
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockOnShareSuccess).toHaveBeenCalledWith('Messages');
      });
    });

    it('prevents multiple simultaneous shares', async () => {
      mockShare.open.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ success: true }), 100)
      ));
      
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByTestID('share-button-📸-share');
      
      fireEvent.press(button);
      fireEvent.press(button); // Second press should be ignored
      
      expect(mockShare.open).toHaveBeenCalledTimes(1);
    });

    it('handles share result without success property', async () => {
      mockShare.open.mockResolvedValue({} as any);
      
      render(<ShareButton {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('share-button-📸-share'));
      
      await waitFor(() => {
        expect(mockOnShareSuccess).not.toHaveBeenCalled();
      });
    });
  });
});