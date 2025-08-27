// Pet Love Community - Error Boundary Tests
// Comprehensive test suite for error boundary component used in pet discovery workflows

import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ErrorBoundary from '../ErrorBoundary';
import {
  renderWithProviders,
  cleanupMocks,
} from '../../__tests__/testUtils';

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = true, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <Text>No error occurred</Text>;
};

// Component that throws after a state change
const ConditionalError: React.FC = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  return (
    <View>
      <Text onPress={() => setShouldThrow(true)} testID="trigger-error">
        Trigger Error
      </Text>
      {shouldThrow && <ThrowError />}
    </View>
  );
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanupMocks();
    jest.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <Text>Child component content</Text>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child component content')).toBeTruthy();
    });

    it('renders multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <Text>First child</Text>
          <Text>Second child</Text>
          <View>
            <Text>Nested child</Text>
          </View>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeTruthy();
      expect(screen.getByText('Second child')).toBeTruthy();
      expect(screen.getByText('Nested child')).toBeTruthy();
    });

    it('passes props through to children correctly', () => {
      const TestChild: React.FC<{ testProp: string }> = ({ testProp }) => (
        <Text>{testProp}</Text>
      );

      render(
        <ErrorBoundary>
          <TestChild testProp="Test value" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test value')).toBeTruthy();
    });
  });

  describe('Error Catching', () => {
    it('catches and displays error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Component crashed!" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('Component crashed!')).toBeTruthy();
      expect(screen.getByText('Try Again')).toBeTruthy();
    });

    it('displays default message when error has no message', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('catches errors thrown during component updates', () => {
      render(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Trigger Error')).toBeTruthy();

      const trigger = screen.getByTestId('trigger-error');
      fireEvent.press(trigger);

      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('Test error')).toBeTruthy();
    });

    it('logs error to console when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Logging test error" />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error)
      );
      expect(console.error).toHaveBeenCalledWith(
        'ErrorBoundary - Component stack:',
        expect.any(String)
      );
      expect(console.error).toHaveBeenCalledWith(
        'ErrorBoundary - Error:',
        expect.any(Error)
      );
    });
  });

  describe('Error Recovery', () => {
    it('allows recovery after error when Try Again is pressed', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error state
      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('Try Again')).toBeTruthy();

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.press(tryAgainButton);

      // Rerender with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error occurred')).toBeTruthy();
      expect(screen.queryByText('Something went wrong')).toBeNull();
    });

    it('resets error state correctly', () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        return (
          <ErrorBoundary>
            {shouldThrow ? (
              <ThrowError />
            ) : (
              <Text onPress={() => setShouldThrow(true)}>Recovered component</Text>
            )}
          </ErrorBoundary>
        );
      };

      render(<TestComponent />);

      // Should show error
      expect(screen.getByText('Something went wrong')).toBeTruthy();

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.press(tryAgainButton);

      // Error state should be reset
      expect(screen.queryByText('Something went wrong')).toBeNull();
    });
  });

  describe('Pet Discovery Error Scenarios', () => {
    it('handles pet loading errors gracefully', () => {
      const PetLoadingError: React.FC = () => {
        throw new Error('Failed to load pet information');
      };

      render(
        <ErrorBoundary>
          <PetLoadingError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('Failed to load pet information')).toBeTruthy();
    });

    it('handles pet search errors', () => {
      const SearchError: React.FC = () => {
        throw new Error('Search service unavailable');
      };

      render(
        <ErrorBoundary>
          <SearchError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Search service unavailable')).toBeTruthy();
    });

    it('handles pet image loading errors', () => {
      const ImageError: React.FC = () => {
        throw new Error('Unable to load pet images');
      };

      render(
        <ErrorBoundary>
          <ImageError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Unable to load pet images')).toBeTruthy();
    });

    it('handles adoption form errors', () => {
      const FormError: React.FC = () => {
        throw new Error('Adoption form validation failed');
      };

      render(
        <ErrorBoundary>
          <FormError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Adoption form validation failed')).toBeTruthy();
    });

    it('handles network connectivity errors', () => {
      const NetworkError: React.FC = () => {
        throw new Error('Network request failed');
      };

      render(
        <ErrorBoundary>
          <NetworkError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Network request failed')).toBeTruthy();
    });
  });

  describe('Error Boundary Nesting', () => {
    it('inner error boundary catches errors before outer one', () => {
      render(
        <ErrorBoundary>
          <Text>Outer boundary content</Text>
          <ErrorBoundary>
            <ThrowError message="Inner error" />
          </ErrorBoundary>
          <Text>More outer content</Text>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText('Outer boundary content')).toBeTruthy();
      expect(screen.getByText('More outer content')).toBeTruthy();
      expect(screen.getByText('Inner error')).toBeTruthy();
    });

    it('outer boundary catches errors when inner boundary fails', () => {
      const BrokenErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        throw new Error('Error boundary itself failed');
      };

      render(
        <ErrorBoundary>
          <BrokenErrorBoundary>
            <Text>Should not appear</Text>
          </BrokenErrorBoundary>
        </ErrorBoundary>
      );

      expect(screen.getByText('Error boundary itself failed')).toBeTruthy();
      expect(screen.queryByText('Should not appear')).toBeNull();
    });
  });

  describe('Error State Management', () => {
    it('maintains error state until explicitly reset', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();

      // Re-render with different children but don't reset
      rerender(
        <ErrorBoundary>
          <Text>New content</Text>
        </ErrorBoundary>
      );

      // Should still show error state
      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.queryByText('New content')).toBeNull();
    });

    it('clears error state when reset is called', () => {
      let boundaryRef: ErrorBoundary | null = null;

      render(
        <ErrorBoundary ref={(ref) => { boundaryRef = ref; }}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.press(tryAgainButton);

      // Error state should be cleared (component will re-render)
      expect(boundaryRef?.state.hasError).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible error information', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Accessibility test error" />
        </ErrorBoundary>
      );

      const errorTitle = screen.getByText('Something went wrong');
      const errorMessage = screen.getByText('Accessibility test error');
      const tryAgainButton = screen.getByText('Try Again');

      expect(errorTitle).toBeTruthy();
      expect(errorMessage).toBeTruthy();
      expect(tryAgainButton).toBeTruthy();

      // Button should be pressable
      fireEvent.press(tryAgainButton);
    });

    it('maintains focus management during error states', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByText('Try Again');
      expect(tryAgainButton).toBeTruthy();

      // Button should be accessible
      expect(tryAgainButton.props.accessible).not.toBe(false);
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('handles errors with very long messages', () => {
      const longMessage = 'This is a very long error message that might exceed normal display limits and should still be handled gracefully by the error boundary component without causing layout issues or accessibility problems';

      render(
        <ErrorBoundary>
          <ThrowError message={longMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText(longMessage)).toBeTruthy();
    });

    it('handles errors with special characters', () => {
      const specialMessage = 'Error with special chars: <>&"\'🐕📱';

      render(
        <ErrorBoundary>
          <ThrowError message={specialMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(specialMessage)).toBeTruthy();
    });

    it('handles multiple rapid errors', () => {
      const MultiError: React.FC<{ errorCount: number }> = ({ errorCount }) => {
        if (errorCount > 0) {
          throw new Error(`Error number ${errorCount}`);
        }
        return <Text>No errors</Text>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <MultiError errorCount={0} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No errors')).toBeTruthy();

      // Trigger first error
      rerender(
        <ErrorBoundary>
          <MultiError errorCount={1} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error number 1')).toBeTruthy();

      // Reset and trigger another error
      fireEvent.press(screen.getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <MultiError errorCount={2} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error number 2')).toBeTruthy();
    });

    it('handles null and undefined error messages', () => {
      const NullError: React.FC = () => {
        const error = new Error();
        error.message = null as any;
        throw error;
      };

      render(
        <ErrorBoundary>
          <NullError />
        </ErrorBoundary>
      );

      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('does not interfere with successful component updates', () => {
      const DynamicComponent: React.FC<{ count: number }> = ({ count }) => {
        return <Text>Count: {count}</Text>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicComponent count={0} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Count: 0')).toBeTruthy();

      // Update should work normally
      rerender(
        <ErrorBoundary>
          <DynamicComponent count={5} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Count: 5')).toBeTruthy();
    });
  });

  describe('Integration with Pet App Workflows', () => {
    it('works with pet list components', () => {
      const PetList: React.FC = () => (
        <View>
          <Text>Pet List Header</Text>
          <ThrowError message="Failed to load pets" />
        </View>
      );

      render(
        <ErrorBoundary>
          <PetList />
        </ErrorBoundary>
      );

      expect(screen.getByText('Failed to load pets')).toBeTruthy();
    });

    it('works with pet detail components', () => {
      const PetDetail: React.FC = () => {
        throw new Error('Pet details unavailable');
      };

      render(
        <ErrorBoundary>
          <PetDetail />
        </ErrorBoundary>
      );

      expect(screen.getByText('Pet details unavailable')).toBeTruthy();
    });

    it('works with adoption form components', () => {
      const AdoptionForm: React.FC = () => {
        throw new Error('Form submission failed');
      };

      render(
        <ErrorBoundary>
          <AdoptionForm />
        </ErrorBoundary>
      );

      expect(screen.getByText('Form submission failed')).toBeTruthy();
    });

    it('allows recovery in pet discovery workflows', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError message="Search temporarily unavailable" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Search temporarily unavailable')).toBeTruthy();

      fireEvent.press(screen.getByText('Try Again'));

      rerender(
        <ErrorBoundary>
          <Text>Search restored successfully</Text>
        </ErrorBoundary>
      );

      expect(screen.getByText('Search restored successfully')).toBeTruthy();
    });
  });
});