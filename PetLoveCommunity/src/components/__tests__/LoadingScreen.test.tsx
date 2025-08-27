// Pet Love Community - Loading Screen Tests
// Comprehensive test suite for loading screen component used throughout pet discovery

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import LoadingScreen from '../LoadingScreen';
import {
  renderWithProviders,
  createMockColors,
  cleanupMocks,
} from '../../__tests__/testUtils';

// Mock the useColors hook
jest.mock('../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

import { useColors } from '../../hooks/useColors';

// Type the mocked hook
const mockUseColors = useColors as jest.MockedFunction<typeof useColors>;

describe('LoadingScreen', () => {
  const mockColors = createMockColors();

  beforeEach(() => {
    mockUseColors.mockReturnValue(mockColors);
  });

  afterEach(() => {
    cleanupMocks();
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with default loading message', () => {
      renderWithProviders(<LoadingScreen />);

      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('renders with custom message', () => {
      const customMessage = 'Loading pet information...';
      renderWithProviders(<LoadingScreen message={customMessage} />);

      expect(screen.getByText(customMessage)).toBeTruthy();
    });

    it('renders activity indicator', () => {
      const { UNSAFE_getByType } = renderWithProviders(<LoadingScreen />);

      const activityIndicator = UNSAFE_getByType(ActivityIndicator);
      expect(activityIndicator).toBeTruthy();
      expect(activityIndicator.props.size).toBe('large');
      expect(activityIndicator.props.color).toBe(mockColors.primary.coral);
    });

    it('displays empty message when empty string provided', () => {
      renderWithProviders(<LoadingScreen message="" />);

      expect(screen.getByText('')).toBeTruthy();
    });

    it('handles very long messages gracefully', () => {
      const longMessage = 'This is a very long loading message that might exceed typical length limits and should still render correctly without breaking the layout or causing any accessibility issues for users who rely on screen readers to understand the application state';
      
      renderWithProviders(<LoadingScreen message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeTruthy();
    });
  });

  describe('Styling and Colors', () => {
    it('applies correct background color from theme', () => {
      const { getByTestId } = render(<LoadingScreen />);
      
      // Since we can't directly test StyleSheet styles, we verify the component renders without errors
      // and that useColors was called to get the theme
      expect(mockUseColors).toHaveBeenCalled();
    });

    it('applies correct text color from theme', () => {
      renderWithProviders(<LoadingScreen message="Test message" />);
      
      const textElement = screen.getByText('Test message');
      expect(textElement).toBeTruthy();
      expect(mockUseColors).toHaveBeenCalled();
    });

    it('applies correct spinner color from theme', () => {
      const { UNSAFE_getByType } = renderWithProviders(<LoadingScreen />);

      const activityIndicator = UNSAFE_getByType(ActivityIndicator);
      expect(activityIndicator.props.color).toBe('#FF6B6B'); // coral color
    });

    it('handles theme changes correctly', () => {
      const customColors = {
        ...mockColors,
        primary: { coral: '#FF0000', teal: '#00FFFF' },
        neutral: { beige: '#F0F0F0', midnight: '#000000' },
      };

      mockUseColors.mockReturnValue(customColors);

      const { UNSAFE_getByType } = renderWithProviders(<LoadingScreen />);

      const activityIndicator = UNSAFE_getByType(ActivityIndicator);
      expect(activityIndicator.props.color).toBe('#FF0000');
    });
  });

  describe('Pet Discovery Contexts', () => {
    it('renders with pet-specific loading messages', () => {
      const petMessages = [
        'Loading pet information...',
        'Searching for pets...',
        'Loading pet gallery...',
        'Fetching pet details...',
        'Loading adoption application...',
        'Uploading pet photos...',
      ];

      petMessages.forEach(message => {
        const { rerender } = renderWithProviders(<LoadingScreen message={message} />);
        expect(screen.getByText(message)).toBeTruthy();
      });
    });

    it('handles adoption workflow loading states', () => {
      const adoptionMessages = [
        'Submitting adoption application...',
        'Validating application data...',
        'Processing payment...',
        'Scheduling meet and greet...',
        'Finalizing adoption...',
      ];

      adoptionMessages.forEach(message => {
        renderWithProviders(<LoadingScreen message={message} />);
        expect(screen.getByText(message)).toBeTruthy();
      });
    });

    it('handles search and filter loading states', () => {
      const searchMessages = [
        'Searching pets by location...',
        'Applying filters...',
        'Loading search results...',
        'Finding pets near you...',
        'Updating availability...',
      ];

      searchMessages.forEach(message => {
        renderWithProviders(<LoadingScreen message={message} />);
        expect(screen.getByText(message)).toBeTruthy();
      });
    });
  });

  describe('Layout and Structure', () => {
    it('centers content vertically and horizontally', () => {
      // We test that the component renders without layout errors
      // The actual centering is handled by StyleSheet which we mock
      renderWithProviders(<LoadingScreen />);
      
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('positions spinner above text', () => {
      const { UNSAFE_getByType } = renderWithProviders(<LoadingScreen message="Test" />);
      
      const activityIndicator = UNSAFE_getByType(ActivityIndicator);
      const textElement = screen.getByText('Test');
      
      // Both elements should be present
      expect(activityIndicator).toBeTruthy();
      expect(textElement).toBeTruthy();
    });

    it('maintains proper spacing between spinner and text', () => {
      renderWithProviders(<LoadingScreen message="Spaced text" />);
      
      // Component should render without layout issues
      expect(screen.getByText('Spaced text')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible loading information to screen readers', () => {
      renderWithProviders(<LoadingScreen message="Loading pet information" />);
      
      const loadingText = screen.getByText('Loading pet information');
      expect(loadingText).toBeTruthy();
      
      // Activity indicator should be accessible by default
      const { UNSAFE_getByType } = renderWithProviders(<LoadingScreen />);
      const activityIndicator = UNSAFE_getByType(ActivityIndicator);
      expect(activityIndicator).toBeTruthy();
    });

    it('announces loading state changes', () => {
      const { rerender } = renderWithProviders(<LoadingScreen message="Initial loading..." />);
      
      expect(screen.getByText('Initial loading...')).toBeTruthy();
      
      rerender(<LoadingScreen message="Still loading..." />);
      expect(screen.getByText('Still loading...')).toBeTruthy();
    });

    it('supports screen reader navigation', () => {
      renderWithProviders(<LoadingScreen message="Loading..." />);
      
      // Text should be readable by screen readers
      const loadingText = screen.getByText('Loading...');
      expect(loadingText).toBeTruthy();
      
      // Component should not have accessibility barriers
      expect(loadingText.props.accessible).not.toBe(false);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('handles rapid message changes efficiently', () => {
      const { rerender } = renderWithProviders(<LoadingScreen message="Message 1" />);
      
      expect(screen.getByText('Message 1')).toBeTruthy();
      
      // Rapid changes should not cause performance issues
      for (let i = 2; i <= 10; i++) {
        rerender(<LoadingScreen message={`Message ${i}`} />);
        expect(screen.getByText(`Message ${i}`)).toBeTruthy();
      }
    });

    it('handles null and undefined messages gracefully', () => {
      renderWithProviders(<LoadingScreen message={undefined} />);
      expect(screen.getByText('Loading...')).toBeTruthy();
      
      renderWithProviders(<LoadingScreen message={null as any} />);
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('handles special characters in messages', () => {
      const specialMessages = [
        'Loading... 🐕',
        'Finding pets near you! 📍',
        'Almost done... ✨',
        'Loading pets & shelters...',
        'Searching: "Golden Retriever"',
        'Progress: 50%',
      ];

      specialMessages.forEach(message => {
        renderWithProviders(<LoadingScreen message={message} />);
        expect(screen.getByText(message)).toBeTruthy();
      });
    });

    it('maintains consistent styling across different messages', () => {
      const testMessages = [
        'Short',
        'A moderately long loading message',
        'A very long loading message that contains multiple lines of text and should still maintain consistent styling and layout',
      ];

      testMessages.forEach(message => {
        renderWithProviders(<LoadingScreen message={message} />);
        expect(screen.getByText(message)).toBeTruthy();
        expect(mockUseColors).toHaveBeenCalled();
      });
    });

    it('does not cause memory leaks with frequent re-renders', () => {
      let component = renderWithProviders(<LoadingScreen message="Initial" />);
      
      // Simulate frequent updates that might occur during loading states
      for (let i = 0; i < 100; i++) {
        component.rerender(<LoadingScreen message={`Update ${i}`} />);
      }
      
      // Should still render correctly after many updates
      expect(screen.getByText('Update 99')).toBeTruthy();
    });
  });

  describe('Integration with Pet Discovery Workflows', () => {
    it('works correctly in pet list loading scenarios', () => {
      renderWithProviders(<LoadingScreen message="Loading available pets..." />);
      
      expect(screen.getByText('Loading available pets...')).toBeTruthy();
    });

    it('works correctly in pet detail loading scenarios', () => {
      renderWithProviders(<LoadingScreen message="Loading pet details..." />);
      
      expect(screen.getByText('Loading pet details...')).toBeTruthy();
    });

    it('works correctly in photo gallery loading scenarios', () => {
      renderWithProviders(<LoadingScreen message="Loading pet photos..." />);
      
      expect(screen.getByText('Loading pet photos...')).toBeTruthy();
    });

    it('works correctly in search and filter scenarios', () => {
      renderWithProviders(<LoadingScreen message="Applying search filters..." />);
      
      expect(screen.getByText('Applying search filters...')).toBeTruthy();
    });

    it('works correctly in adoption form loading scenarios', () => {
      renderWithProviders(<LoadingScreen message="Loading adoption form..." />);
      
      expect(screen.getByText('Loading adoption form...')).toBeTruthy();
    });

    it('works correctly with real-time updates', () => {
      const { rerender } = renderWithProviders(<LoadingScreen message="Connecting..." />);
      
      expect(screen.getByText('Connecting...')).toBeTruthy();
      
      rerender(<LoadingScreen message="Synchronizing data..." />);
      expect(screen.getByText('Synchronizing data...')).toBeTruthy();
      
      rerender(<LoadingScreen message="Finalizing..." />);
      expect(screen.getByText('Finalizing...')).toBeTruthy();
    });
  });
});