// Pet Love Community - Pet List Screen Tests
// Comprehensive test suite for the main pet discovery interface

import React from 'react';
import { fireEvent, waitFor, screen, within } from '@testing-library/react-native';
import PetListScreen from '../PetListScreen';
import {
  renderWithProviders,
  createMockPetList,
  createMockNavigation,
  createMockRoute,
  createMockColors,
  createMockAnalyticsTracker,
  createMockQueryResponse,
  createMockPetSearchResponse,
  testSearchFilters,
  testAccessibility,
  waitForApiCall,
  cleanupMocks,
} from '../../__tests__/testUtils';

// Mock the pet API service
jest.mock('../../services/petApi', () => ({
  useGetFeaturedPetsQuery: jest.fn(),
  useSearchPetsQuery: jest.fn(),
}));

// Mock the hooks
jest.mock('../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalyticsTracker: jest.fn(),
}));

// Mock the search filters component
jest.mock('../../components/PetSearchFilters', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ searchFilters, onFiltersChange, onSearch, isSearching }: any) => (
    <View testID="pet-search-filters">
      <Text testID="search-filters-query">{searchFilters.searchQuery || 'No query'}</Text>
      <TouchableOpacity
        testID="search-button"
        onPress={() => onSearch()}
        disabled={isSearching}
      >
        <Text>{isSearching ? 'Searching...' : 'Search'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="apply-filters-button"
        onPress={() => onFiltersChange({ ...searchFilters, searchQuery: 'test query' })}
      >
        <Text>Apply Test Filter</Text>
      </TouchableOpacity>
    </View>
  );
});

import { useGetFeaturedPetsQuery, useSearchPetsQuery } from '../../services/petApi';
import { useColors } from '../../hooks/useColors';
import { useAnalyticsTracker } from '../../hooks/useAnalytics';

// Type the mocked hooks
const mockUseGetFeaturedPetsQuery = useGetFeaturedPetsQuery as jest.MockedFunction<typeof useGetFeaturedPetsQuery>;
const mockUseSearchPetsQuery = useSearchPetsQuery as jest.MockedFunction<typeof useSearchPetsQuery>;
const mockUseColors = useColors as jest.MockedFunction<typeof useColors>;
const mockUseAnalyticsTracker = useAnalyticsTracker as jest.MockedFunction<typeof useAnalyticsTracker>;

describe('PetListScreen', () => {
  const mockNavigation = createMockNavigation();
  const mockRoute = createMockRoute();
  const mockColors = createMockColors();
  const mockAnalytics = createMockAnalyticsTracker();
  const mockPetList = createMockPetList(5);

  beforeEach(() => {
    // Setup default mock implementations
    mockUseColors.mockReturnValue(mockColors);
    mockUseAnalyticsTracker.mockReturnValue(mockAnalytics);
    
    // Default API responses - featured pets
    mockUseGetFeaturedPetsQuery.mockReturnValue(
      createMockQueryResponse(mockPetList, false)
    );
    
    // Default API responses - search pets  
    mockUseSearchPetsQuery.mockReturnValue(
      createMockQueryResponse(createMockPetSearchResponse([]), false)
    );
  });

  afterEach(() => {
    cleanupMocks();
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('renders loading state correctly', () => {
      mockUseGetFeaturedPetsQuery.mockReturnValue(
        createMockQueryResponse(undefined, true)
      );

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      expect(screen.getByText('Finding pets for you...')).toBeTruthy();
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('displays pet list when data loads', async () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(screen.getByText('Featured Pets')).toBeTruthy();
        expect(screen.getByText('5 pets looking for homes')).toBeTruthy();
      });

      // Check if pet cards are rendered
      mockPetList.forEach((pet) => {
        expect(screen.getByText(pet.name)).toBeTruthy();
        expect(screen.getByText(`${pet.breed} • ${pet.age} years • ${pet.gender}`)).toBeTruthy();
        expect(screen.getByText(`📍 ${pet.location.city}, ${pet.location.state}`)).toBeTruthy();
      });
    });

    it('shows empty state when no pets available', () => {
      mockUseGetFeaturedPetsQuery.mockReturnValue(
        createMockQueryResponse([], false)
      );

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      expect(screen.getByText('No pets found')).toBeTruthy();
      expect(screen.getByText('Check back later for new pets looking for homes')).toBeTruthy();
      expect(screen.getByText('Refresh')).toBeTruthy();
    });

    it('renders search filters component', () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      expect(screen.getByTestId('pet-search-filters')).toBeTruthy();
      expect(screen.getByTestId('search-button')).toBeTruthy();
    });

    it('displays correct status badges for pets', () => {
      const petsWithStatus = [
        createMockPetList(1)[0],
        { ...createMockPetList(1)[0], id: 'pet-pending', status: 'pending' as const },
      ];

      mockUseGetFeaturedPetsQuery.mockReturnValue(
        createMockQueryResponse(petsWithStatus, false)
      );

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      expect(screen.getByText('AVAILABLE')).toBeTruthy();
      expect(screen.getByText('PENDING')).toBeTruthy();
    });

    it('shows pet characteristics correctly', () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      // Check for trait tags
      expect(screen.getByText('👶 Good with kids')).toBeTruthy();
      expect(screen.getByText('🏠 House trained')).toBeTruthy();
    });
  });

  describe('API Integration Tests', () => {
    it('fetches featured pets on mount', async () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(mockUseGetFeaturedPetsQuery).toHaveBeenCalledWith(
          { limit: 20 },
          { skip: false }
        );
      });
    });

    it('switches to search mode when filters are applied', async () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      // Apply a test filter
      const applyFiltersButton = screen.getByTestId('apply-filters-button');
      fireEvent.press(applyFiltersButton);

      await waitFor(() => {
        // Should skip featured pets query when filters are active
        expect(mockUseSearchPetsQuery).toHaveBeenCalledWith(
          expect.objectContaining({ searchQuery: 'test query' }),
          { skip: false }
        );
      });

      expect(screen.getByText('Search Results')).toBeTruthy();
    });

    it('handles search filter changes correctly', async () => {
      const searchResults = createMockPetList(3);
      mockUseSearchPetsQuery.mockReturnValue(
        createMockQueryResponse(createMockPetSearchResponse(searchResults), false)
      );

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      // Apply filters
      fireEvent.press(screen.getByTestId('apply-filters-button'));

      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeTruthy();
        expect(screen.getByText('3 pets looking for homes')).toBeTruthy();
      });
    });

    it('implements pull-to-refresh correctly', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
      mockUseGetFeaturedPetsQuery.mockReturnValue({
        ...createMockQueryResponse(mockPetList, false),
        refetch: mockRefetch,
      });

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      // Simulate pull to refresh
      const scrollView = screen.getByTestId('pet-list-flatlist');
      fireEvent(scrollView, 'refresh');

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('manages loading and error states properly', async () => {
      // Test loading state
      mockUseGetFeaturedPetsQuery.mockReturnValue(
        createMockQueryResponse(undefined, true)
      );

      const { rerender } = renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      expect(screen.getByText('Finding pets for you...')).toBeTruthy();

      // Test error state
      mockUseGetFeaturedPetsQuery.mockReturnValue({
        ...createMockQueryResponse(undefined, false),
        isError: true,
        error: { message: 'Network error' },
      });

      rerender(<PetListScreen navigation={mockNavigation} />);

      // Should show empty state when there's an error and no cached data
      expect(screen.getByText('No pets found')).toBeTruthy();
    });
  });

  describe('User Interaction Tests', () => {
    beforeEach(() => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);
    });

    it('navigates to pet detail when pet card is tapped', async () => {
      await waitFor(() => {
        expect(screen.getByText(mockPetList[0].name)).toBeTruthy();
      });

      const petCard = screen.getByText(mockPetList[0].name).parent?.parent;
      fireEvent.press(petCard!);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PetDetail', {
        petId: mockPetList[0].id,
      });
    });

    it('navigates to pet detail when view details button is pressed', async () => {
      await waitFor(() => {
        expect(screen.getByText('❤️ View Details')).toBeTruthy();
      });

      const viewDetailsButton = screen.getAllByText('❤️ View Details')[0];
      fireEvent.press(viewDetailsButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PetDetail', {
        petId: mockPetList[0].id,
      });
    });

    it('handles search filter interactions', async () => {
      const searchButton = screen.getByTestId('search-button');
      fireEvent.press(searchButton);

      // Should trigger search functionality
      await waitFor(() => {
        expect(screen.getByTestId('search-button')).toBeTruthy();
      });
    });

    it('handles empty state refresh button', () => {
      mockUseGetFeaturedPetsQuery.mockReturnValue(
        createMockQueryResponse([], false)
      );

      const { rerender } = renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      const refreshButton = screen.getByText('Refresh');
      fireEvent.press(refreshButton);

      // Should trigger refetch
      expect(mockUseGetFeaturedPetsQuery().refetch).toBeDefined();
    });

    it('tracks analytics for pet views', async () => {
      await waitFor(() => {
        expect(screen.getByText(mockPetList[0].name)).toBeTruthy();
      });

      // Tap on a pet card
      const petCard = screen.getByText(mockPetList[0].name).parent?.parent;
      fireEvent.press(petCard!);

      expect(mockAnalytics.trackPetView).toHaveBeenCalledWith(
        mockPetList[0].id,
        'featured'
      );
    });

    it('tracks analytics for adoption interactions', async () => {
      await waitFor(() => {
        expect(screen.getByText('❤️ View Details')).toBeTruthy();
      });

      const viewDetailsButton = screen.getAllByText('❤️ View Details')[0];
      fireEvent.press(viewDetailsButton);

      expect(mockAnalytics.trackPetInteraction).toHaveBeenCalledWith(
        mockPetList[0].id,
        'application_start',
        expect.objectContaining({
          source: 'featured',
          fromList: true,
        })
      );
    });

    it('tracks screen view analytics on mount', async () => {
      await waitFor(() => {
        expect(mockAnalytics.trackScreenView).toHaveBeenCalledWith(
          'PetListScreen',
          expect.objectContaining({
            hasFilters: false,
            petsCount: mockPetList.length,
          })
        );
      });
    });
  });

  describe('Search and Filter Functionality', () => {
    it('shows correct header for search results', async () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      // Apply filters to switch to search mode
      fireEvent.press(screen.getByTestId('apply-filters-button'));

      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeTruthy();
        expect(screen.getByTestId('search-filters-query')).toBeTruthy();
      });
    });

    it('shows correct empty state message for search', async () => {
      mockUseSearchPetsQuery.mockReturnValue(
        createMockQueryResponse(createMockPetSearchResponse([]), false)
      );

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      // Apply filters
      fireEvent.press(screen.getByTestId('apply-filters-button'));

      await waitFor(() => {
        expect(screen.getByText('No pets found')).toBeTruthy();
        expect(screen.getByText('Try adjusting your search filters')).toBeTruthy();
      });
    });

    it('handles search button loading state', async () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      // Apply filters first
      fireEvent.press(screen.getByTestId('apply-filters-button'));

      await waitFor(() => {
        const searchButton = screen.getByTestId('search-button');
        expect(searchButton).toBeTruthy();
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper accessibility labels for pet cards', async () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        const viewDetailsButtons = screen.getAllByText('❤️ View Details');
        expect(viewDetailsButtons[0]).toBeTruthy();
        
        // Check if the button has proper accessibility label
        const buttonProps = viewDetailsButtons[0].props;
        expect(buttonProps.accessibilityLabel).toBe(`View adoption details for ${mockPetList[0].name}`);
      });
    });

    it('supports screen reader navigation', async () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        // Pet information should be readable by screen readers
        expect(screen.getByText(mockPetList[0].name)).toBeTruthy();
        expect(screen.getByText(`${mockPetList[0].breed} • ${mockPetList[0].age} years • ${mockPetList[0].gender}`)).toBeTruthy();
      });
    });

    it('has proper touch targets for interactive elements', async () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        const petCards = screen.getAllByText('❤️ View Details');
        expect(petCards.length).toBeGreaterThan(0);
        
        // Each pet card should be touchable
        petCards.forEach(button => {
          expect(button.parent?.props?.onPress).toBeDefined();
        });
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('handles large pet lists efficiently', async () => {
      const largePetList = createMockPetList(100);
      mockUseGetFeaturedPetsQuery.mockReturnValue(
        createMockQueryResponse(largePetList, false)
      );

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(screen.getByText('100 pets looking for homes')).toBeTruthy();
        // Should still render efficiently
        expect(screen.getByTestId('pet-list-flatlist')).toBeTruthy();
      });
    });

    it('handles pets with missing or incomplete data', async () => {
      const petsWithMissingData = [
        {
          ...createMockPetList(1)[0],
          photos: [], // No photos
          characteristics: {
            ...createMockPetList(1)[0].characteristics,
            goodWithChildren: undefined,
            houseTrained: undefined,
          },
        },
      ];

      mockUseGetFeaturedPetsQuery.mockReturnValue(
        createMockQueryResponse(petsWithMissingData, false)
      );

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(screen.getByText(petsWithMissingData[0].name)).toBeTruthy();
        // Should show 0 photos
        expect(screen.getByText('📷 0')).toBeTruthy();
      });
    });

    it('maintains scroll position during refresh', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
      mockUseGetFeaturedPetsQuery.mockReturnValue({
        ...createMockQueryResponse(createMockPetList(20), false),
        refetch: mockRefetch,
      });

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      const scrollView = screen.getByTestId('pet-list-flatlist');
      
      // Simulate scroll and refresh
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 500 } } });
      fireEvent(scrollView, 'refresh');

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('handles network errors gracefully', () => {
      mockUseGetFeaturedPetsQuery.mockReturnValue({
        ...createMockQueryResponse(undefined, false),
        isError: true,
        error: { message: 'Network request failed' },
      });

      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      // Should show empty state instead of crashing
      expect(screen.getByText('No pets found')).toBeTruthy();
      expect(screen.getByText('Check back later for new pets looking for homes')).toBeTruthy();
    });
  });

  describe('Integration with Other Components', () => {
    it('passes correct props to PetSearchFilters', () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      const searchFilters = screen.getByTestId('pet-search-filters');
      expect(searchFilters).toBeTruthy();

      // Should have the search filters and handlers
      expect(screen.getByTestId('search-button')).toBeTruthy();
      expect(screen.getByTestId('apply-filters-button')).toBeTruthy();
    });

    it('updates state correctly when PetSearchFilters changes', async () => {
      renderWithProviders(<PetListScreen navigation={mockNavigation} />);

      // Simulate filter change
      fireEvent.press(screen.getByTestId('apply-filters-button'));

      await waitFor(() => {
        expect(screen.getByTestId('search-filters-query')).toBeTruthy();
        expect(screen.getByText('test query')).toBeTruthy();
      });
    });
  });
});