// Pet Love Community - PetSearchFilters Test Suite
// Comprehensive tests for search and filter component with modal interactions

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PetSearchFilters from '../PetSearchFilters';
import locationService from '../../services/locationService';
import { useAnalyticsTracker } from '../../hooks/useAnalytics';
import {
  renderWithProviders,
  createMockSearchRequest,
  createMockColors,
  createMockAnalyticsTracker,
  cleanupMocks,
} from '../../__tests__/testUtils';

// Mock external dependencies
jest.mock('../../services/locationService');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock Button component
jest.mock('../Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress, type, style, disabled, ...props }: any) => (
    <TouchableOpacity
      testID={`button-${title.toLowerCase().replace(/[\s\.]/g, '-')}`}
      onPress={disabled ? undefined : onPress}
      style={[style, disabled && { opacity: 0.5 }]}
      disabled={disabled}
      accessibilityLabel={title}
      {...props}
    >
      <Text testID={`button-text-${title.toLowerCase().replace(/[\s\.]/g, '-')}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
});

// Mock Input component
jest.mock('../Input', () => {
  const { TextInput } = require('react-native');
  return ({ onChangeText, onSubmitEditing, ...props }: any) => (
    <TextInput
      testID="search-input"
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      {...props}
    />
  );
});

// Mock Card component
jest.mock('../Card', () => {
  const { View } = require('react-native');
  return ({ children, style, ...props }: any) => (
    <View testID="card" style={style} {...props}>
      {children}
    </View>
  );
});

const mockLocationService = locationService as jest.Mocked<typeof locationService>;
const mockUseAnalyticsTracker = useAnalyticsTracker as jest.MockedFunction<typeof useAnalyticsTracker>;
const { useColors } = require('../../hooks/useColors');

describe('PetSearchFilters', () => {
  const mockOnFiltersChange = jest.fn();
  const mockOnSearch = jest.fn();
  const mockColors = createMockColors();
  const mockAnalytics = createMockAnalyticsTracker();

  const defaultProps = {
    searchFilters: createMockSearchRequest(),
    onFiltersChange: mockOnFiltersChange,
    onSearch: mockOnSearch,
    isSearching: false,
  };

  beforeEach(() => {
    cleanupMocks();
    useColors.mockReturnValue(mockColors);
    mockUseAnalyticsTracker.mockReturnValue(mockAnalytics);
    mockLocationService.getCurrentLocation.mockResolvedValue({
      latitude: 40.7128,
      longitude: -74.0060,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders search input and filter button', () => {
      const { getByTestId, getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      expect(getByTestId('search-input')).toBeTruthy();
      expect(getByText('Filter')).toBeTruthy();
      expect(getByTestId('button-search-pets')).toBeTruthy();
    });

    it('renders search button with correct text when not searching', () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      expect(getByText('Search Pets')).toBeTruthy();
    });

    it('renders search button with loading text when searching', () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} isSearching={true} />
      );

      expect(getByText('Searching...')).toBeTruthy();
    });

    it('disables search button when searching', () => {
      const { getByTestId } = renderWithProviders(
        <PetSearchFilters {...defaultProps} isSearching={true} />
      );

      const searchButton = getByTestId('button-searching---');
      expect(searchButton.props.disabled).toBe(true);
    });
  });

  describe('Search Input Functionality', () => {
    it('updates search query when input changes', () => {
      const { getByTestId } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'Golden Retriever');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultProps.searchFilters,
        searchQuery: 'Golden Retriever',
      });
    });

    it('clears search query when empty text is entered', () => {
      const propsWithQuery = {
        ...defaultProps,
        searchFilters: { ...defaultProps.searchFilters, searchQuery: 'Test' },
      };

      const { getByTestId } = renderWithProviders(
        <PetSearchFilters {...propsWithQuery} />
      );

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, '');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...propsWithQuery.searchFilters,
        searchQuery: undefined,
      });
    });

    it('calls onSearch when search input is submitted', () => {
      const { getByTestId } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      const searchInput = getByTestId('search-input');
      fireEvent(searchInput, 'submitEditing');

      expect(mockOnSearch).toHaveBeenCalledTimes(1);
    });

    it('displays current search query in input', () => {
      const propsWithQuery = {
        ...defaultProps,
        searchFilters: { ...defaultProps.searchFilters, searchQuery: 'Labrador' },
      };

      const { getByTestId } = renderWithProviders(
        <PetSearchFilters {...propsWithQuery} />
      );

      const searchInput = getByTestId('search-input');
      expect(searchInput.props.value).toBe('Labrador');
    });
  });

  describe('Filter Button and Active Filters', () => {
    it('shows filter count when filters are active', () => {
      const propsWithFilters = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: {
            animalType: 'dog' as any,
            size: 'large' as any,
            goodWithChildren: true,
          },
        },
      };

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...propsWithFilters} />
      );

      expect(getByText('Filter (3)')).toBeTruthy();
    });

    it('opens filter modal when filter button is pressed', () => {
      const { getByText, getByTestId } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      const filterButton = getByText('Filter');
      fireEvent.press(filterButton);

      // Check if modal is opened (modal title should be visible)
      expect(getByText('Filter Pets')).toBeTruthy();
    });

    it('highlights filter button when filters are active', () => {
      const propsWithFilters = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: { animalType: 'dog' as any },
        },
      };

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...propsWithFilters} />
      );

      // Filter button should show "Filter (1)" indicating active filters
      expect(getByText('Filter (1)')).toBeTruthy();
    });

    it('counts location filter in active filter count', () => {
      const propsWithLocationFilter = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: { nearMe: true, maxDistance: 25 },
        },
      };

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...propsWithLocationFilter} />
      );

      expect(getByText('Filter (1)')).toBeTruthy();
    });
  });

  describe('Search Button Functionality', () => {
    it('calls onSearch when search button is pressed', () => {
      const { getByTestId } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      const searchButton = getByTestId('button-search-pets');
      fireEvent.press(searchButton);

      expect(mockOnSearch).toHaveBeenCalledTimes(1);
    });

    it('does not call onSearch when button is disabled', () => {
      const { getByTestId } = renderWithProviders(
        <PetSearchFilters {...defaultProps} isSearching={true} />
      );

      const searchButton = getByTestId('button-searching---');
      fireEvent.press(searchButton);

      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });

  describe('Filter Modal - Basic Functionality', () => {
    it('closes modal when Done button is pressed', () => {
      const { getByText, queryByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      // Open modal
      fireEvent.press(getByText('Filter'));
      expect(getByText('Filter Pets')).toBeTruthy();

      // Close modal
      fireEvent.press(getByText('Done'));
      
      // Modal should be closed (title not visible)
      expect(queryByText('Filter Pets')).toBeNull();
    });

    it('renders all filter sections in modal', () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));

      expect(getByText('Animal Type')).toBeTruthy();
      expect(getByText('Size')).toBeTruthy();
      expect(getByText('Age Range')).toBeTruthy();
      expect(getByText('Good with Children')).toBeTruthy();
      expect(getByText('Location')).toBeTruthy();
    });
  });

  describe('Filter Modal - Animal Type Selection', () => {
    it('renders all animal type options', () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));

      expect(getByText('Dog')).toBeTruthy();
      expect(getByText('Cat')).toBeTruthy();
      expect(getByText('Rabbit')).toBeTruthy();
      expect(getByText('Bird')).toBeTruthy();
      expect(getByText('Other')).toBeTruthy();
    });

    it('selects animal type when option is pressed', async () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Dog'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              animalType: 'dog',
            }),
          })
        );
      });
    });

    it('deselects animal type when same option is pressed again', async () => {
      const propsWithAnimalType = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: { animalType: 'dog' as any },
        },
      };

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...propsWithAnimalType} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Dog'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              animalType: undefined,
            }),
          })
        );
      });
    });
  });

  describe('Filter Modal - Size Selection', () => {
    it('renders all size options', () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));

      expect(getByText('Small')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
      expect(getByText('Large')).toBeTruthy();
    });

    it('selects size when option is pressed', async () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Large'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              size: 'large',
            }),
          })
        );
      });
    });
  });

  describe('Filter Modal - Age Range Selection', () => {
    it('renders all age range options', () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));

      expect(getByText('Puppy/Kitten (0-1 year)')).toBeTruthy();
      expect(getByText('Adult (1-7 years)')).toBeTruthy();
      expect(getByText('Senior (7+ years)')).toBeTruthy();
    });

    it('selects age range when option is pressed', async () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Adult (1-7 years)'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              ageRange: 'adult',
            }),
          })
        );
      });
    });
  });

  describe('Filter Modal - Good with Children', () => {
    it('toggles good with children filter', async () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Must be good with children'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              goodWithChildren: true,
            }),
          })
        );
      });
    });

    it('shows checkmark when good with children is selected', () => {
      const propsWithChildren = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: { goodWithChildren: true },
        },
      };

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...propsWithChildren} />
      );

      fireEvent.press(getByText('Filter'));
      expect(getByText('✓')).toBeTruthy();
    });
  });

  describe('Filter Modal - Location Filters', () => {
    it('renders location toggle option', () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      expect(getByText('Show pets near me')).toBeTruthy();
    });

    it('enables location filtering when toggle is pressed', async () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Show pets near me'));

      await waitFor(() => {
        expect(mockLocationService.getCurrentLocation).toHaveBeenCalled();
      });

      expect(mockAnalytics.trackUserAction).toHaveBeenCalledWith('location_filter_requested');
    });

    it('shows location loading state', async () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Show pets near me'));

      // Should show loading text immediately
      expect(getByText('Getting location...')).toBeTruthy();
    });

    it('shows location acquired message after successful location fetch', async () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Show pets near me'));

      await waitFor(() => {
        expect(getByText('📍 Location acquired')).toBeTruthy();
      });
    });

    it('handles location error gracefully', async () => {
      mockLocationService.getCurrentLocation.mockRejectedValue(
        new Error('Location permission denied')
      );

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Show pets near me'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Location Error',
          'Unable to get your location. Please enable location services and try again.',
          [{ text: 'OK' }]
        );
      });

      expect(mockAnalytics.trackUserAction).toHaveBeenCalledWith(
        'location_filter_failed',
        { error: 'Location permission denied' }
      );
    });

    it('disables location filtering when already enabled', async () => {
      const propsWithLocation = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: { 
            nearMe: true, 
            maxDistance: 25,
            userLocation: { latitude: 40.7128, longitude: -74.0060 }
          },
        },
      };

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...propsWithLocation} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Show pets near me'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              nearMe: false,
              maxDistance: undefined,
            }),
          })
        );
      });

      expect(mockAnalytics.trackUserAction).toHaveBeenCalledWith('location_filter_disabled');
    });
  });

  describe('Filter Modal - Distance Options', () => {
    it('shows distance options when location is enabled', () => {
      const propsWithLocation = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: { nearMe: true },
        },
      };

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...propsWithLocation} />
      );

      fireEvent.press(getByText('Filter'));
      
      expect(getByText('Maximum Distance')).toBeTruthy();
      expect(getByText('5 km')).toBeTruthy();
      expect(getByText('10 km')).toBeTruthy();
      expect(getByText('25 km')).toBeTruthy();
      expect(getByText('50 km')).toBeTruthy();
      expect(getByText('100 km')).toBeTruthy();
    });

    it('selects distance option', async () => {
      const propsWithLocation = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: { nearMe: true },
        },
      };

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...propsWithLocation} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('10 km'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              maxDistance: 10,
            }),
          })
        );
      });
    });

    it('hides distance options when location is disabled', () => {
      const { getByText, queryByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      
      expect(queryByText('Maximum Distance')).toBeNull();
      expect(queryByText('5 km')).toBeNull();
    });
  });

  describe('Filter Modal - Apply and Clear Actions', () => {
    it('applies filters when Apply Filters is pressed', async () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Dog'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              animalType: 'dog',
            }),
          })
        );
      });
    });

    it('clears all filters when Clear All is pressed', async () => {
      const propsWithFilters = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: {
            animalType: 'dog' as any,
            size: 'large' as any,
            goodWithChildren: true,
          },
        },
      };

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...propsWithFilters} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Clear All'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          limit: 20,
          page: 1,
        });
      });
    });

    it('closes modal after applying filters', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(queryByText('Filter Pets')).toBeNull();
      });
    });

    it('closes modal after clearing filters', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Clear All'));

      await waitFor(() => {
        expect(queryByText('Filter Pets')).toBeNull();
      });
    });
  });

  describe('Accessibility and UX', () => {
    it('provides accessibility labels for main buttons', () => {
      const { getByLabelText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      expect(getByLabelText('Search Pets')).toBeTruthy();
    });

    it('handles rapid filter selections without crashing', async () => {
      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      
      // Rapid selections
      fireEvent.press(getByText('Dog'));
      fireEvent.press(getByText('Cat'));
      fireEvent.press(getByText('Large'));
      fireEvent.press(getByText('Small'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles undefined search filters gracefully', () => {
      const propsWithUndefinedFilters = {
        ...defaultProps,
        searchFilters: { limit: 20, page: 1 },
      };

      expect(() => {
        renderWithProviders(<PetSearchFilters {...propsWithUndefinedFilters} />);
      }).not.toThrow();
    });

    it('handles malformed filter data', () => {
      const propsWithMalformedFilters = {
        ...defaultProps,
        searchFilters: {
          ...defaultProps.searchFilters,
          filters: null as any,
        },
      };

      expect(() => {
        renderWithProviders(<PetSearchFilters {...propsWithMalformedFilters} />);
      }).not.toThrow();
    });

    it('handles location service unavailable', async () => {
      mockLocationService.getCurrentLocation.mockRejectedValue(
        new Error('Service unavailable')
      );

      const { getByText } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      fireEvent.press(getByText('Filter'));
      fireEvent.press(getByText('Show pets near me'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Considerations', () => {
    it('does not unnecessarily re-render on prop changes', () => {
      const { rerender } = renderWithProviders(
        <PetSearchFilters {...defaultProps} />
      );

      const initialCallCount = mockOnFiltersChange.mock.calls.length;

      // Same props should not trigger additional renders
      rerender(<PetSearchFilters {...defaultProps} />);

      expect(mockOnFiltersChange.mock.calls.length).toBe(initialCallCount);
    });
  });
});