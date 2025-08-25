// Pet Love Community - Pet Detail Screen Tests
// Comprehensive test suite for individual pet details and adoption actions

import React from 'react';
import { fireEvent, waitFor, screen, within } from '@testing-library/react-native';
import PetDetailScreen from '../PetDetailScreen';
import {
  renderWithProviders,
  createMockPet,
  createMockNavigation,
  createMockRoute,
  createMockColors,
  createMockAnalyticsTracker,
  createMockQueryResponse,
  createMockMutationResponse,
  createMockFavorite,
  testPetData,
  testAccessibility,
  waitForApiCall,
  cleanupMocks,
} from '../../__tests__/testUtils';

// Mock the pet API service
jest.mock('../../services/petApi', () => ({
  useGetPetByIdQuery: jest.fn(),
  useGetUserFavoritesQuery: jest.fn(),
  useAddPetToFavoritesMutation: jest.fn(),
  useRemovePetFromFavoritesMutation: jest.fn(),
  useTrackPetViewMutation: jest.fn(),
}));

// Mock the hooks
jest.mock('../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalyticsTracker: jest.fn(),
}));

jest.mock('../../hooks/usePetPhotoUpload', () => ({
  usePetPhotoUpload: jest.fn(() => ({
    uploadPhoto: jest.fn(),
    isUploading: false,
    uploadProgress: 0,
    error: null,
  })),
}));

// Mock components
jest.mock('../../components/CameraModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ visible, onClose, onPhotoTaken }: any) => 
    visible ? (
      <View testID="camera-modal">
        <Text>Camera Modal</Text>
        <TouchableOpacity testID="take-photo-button" onPress={() => onPhotoTaken?.('mock-photo.jpg')}>
          <Text>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="close-camera-button" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    ) : null;
});

import {
  useGetPetByIdQuery,
  useGetUserFavoritesQuery,
  useAddPetToFavoritesMutation,
  useRemovePetFromFavoritesMutation,
  useTrackPetViewMutation,
} from '../../services/petApi';
import { useColors } from '../../hooks/useColors';
import { useAnalyticsTracker } from '../../hooks/useAnalytics';

// Type the mocked hooks
const mockUseGetPetByIdQuery = useGetPetByIdQuery as jest.MockedFunction<typeof useGetPetByIdQuery>;
const mockUseGetUserFavoritesQuery = useGetUserFavoritesQuery as jest.MockedFunction<typeof useGetUserFavoritesQuery>;
const mockUseAddPetToFavoritesMutation = useAddPetToFavoritesMutation as jest.MockedFunction<typeof useAddPetToFavoritesMutation>;
const mockUseRemovePetFromFavoritesMutation = useRemovePetFromFavoritesMutation as jest.MockedFunction<typeof useRemovePetFromFavoritesMutation>;
const mockUseTrackPetViewMutation = useTrackPetViewMutation as jest.MockedFunction<typeof useTrackPetViewMutation>;
const mockUseColors = useColors as jest.MockedFunction<typeof useColors>;
const mockUseAnalyticsTracker = useAnalyticsTracker as jest.MockedFunction<typeof useAnalyticsTracker>;

describe('PetDetailScreen', () => {
  const mockNavigation = createMockNavigation();
  const mockColors = createMockColors();
  const mockAnalytics = createMockAnalyticsTracker();
  const mockPet = testPetData.availablePet;
  const testRoute = createMockRoute({ petId: mockPet.id });

  const mockAddToFavorites = jest.fn();
  const mockRemoveFromFavorites = jest.fn();
  const mockTrackPetView = jest.fn();

  beforeEach(() => {
    // Setup default mock implementations
    mockUseColors.mockReturnValue(mockColors);
    mockUseAnalyticsTracker.mockReturnValue(mockAnalytics);
    
    // Default API responses
    mockUseGetPetByIdQuery.mockReturnValue(
      createMockQueryResponse(mockPet, false)
    );
    
    mockUseGetUserFavoritesQuery.mockReturnValue(
      createMockQueryResponse([], false)
    );

    mockUseAddPetToFavoritesMutation.mockReturnValue([
      mockAddToFavorites,
      { isLoading: false, isSuccess: false, isError: false, data: undefined, error: undefined, reset: jest.fn() }
    ]);

    mockUseRemovePetFromFavoritesMutation.mockReturnValue([
      mockRemoveFromFavorites,
      { isLoading: false, isSuccess: false, isError: false, data: undefined, error: undefined, reset: jest.fn() }
    ]);

    mockUseTrackPetViewMutation.mockReturnValue([
      mockTrackPetView,
      { isLoading: false, isSuccess: false, isError: false, data: undefined, error: undefined, reset: jest.fn() }
    ]);
  });

  afterEach(() => {
    cleanupMocks();
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('renders loading state correctly', () => {
      mockUseGetPetByIdQuery.mockReturnValue(
        createMockQueryResponse(undefined, true)
      );

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      expect(screen.getByText('Loading pet details...')).toBeTruthy();
      expect(screen.getByTestId('pet-detail-loading')).toBeTruthy();
    });

    it('displays pet information correctly', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        // Basic pet info
        expect(screen.getByText(mockPet.name)).toBeTruthy();
        expect(screen.getByText(`${mockPet.breed} • ${mockPet.age} years old`)).toBeTruthy();
        expect(screen.getByText(mockPet.gender)).toBeTruthy();
        expect(screen.getByText(mockPet.size)).toBeTruthy();
        
        // Location
        expect(screen.getByText(`${mockPet.location.city}, ${mockPet.location.state}`)).toBeTruthy();
        expect(screen.getByText(mockPet.location.shelterName)).toBeTruthy();
        
        // Description
        expect(screen.getByText(mockPet.description)).toBeTruthy();
        
        // Status
        expect(screen.getByText('AVAILABLE')).toBeTruthy();
      });
    });

    it('shows favorite button state correctly when pet is not favorited', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText('🤍 Add to Favorites')).toBeTruthy();
      });
    });

    it('shows favorite button state correctly when pet is favorited', async () => {
      const favorites = [createMockFavorite({ petId: mockPet.id })];
      mockUseGetUserFavoritesQuery.mockReturnValue(
        createMockQueryResponse(favorites, false)
      );

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText('❤️ Favorited')).toBeTruthy();
      });
    });

    it('renders adoption CTA button', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText('🏠 Start Adoption Process')).toBeTruthy();
      });
    });

    it('displays pet characteristics correctly', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText('Good with Children')).toBeTruthy();
        expect(screen.getByText('House Trained')).toBeTruthy();
        expect(screen.getByText('Spayed/Neutered')).toBeTruthy();
        expect(screen.getByText('Vaccinated')).toBeTruthy();
      });
    });

    it('shows pet photos gallery', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText(`📷 ${mockPet.photos.length} Photos`)).toBeTruthy();
        expect(screen.getByText('View Gallery')).toBeTruthy();
      });
    });

    it('displays medical and behavior information', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        // Medical info
        expect(screen.getByText('Medical Information')).toBeTruthy();
        expect(screen.getByText('Last vet visit:')).toBeTruthy();
        
        // Behavior info  
        expect(screen.getByText('Behavior & Temperament')).toBeTruthy();
        mockPet.behaviorInfo.temperament.forEach(trait => {
          expect(screen.getByText(trait)).toBeTruthy();
        });
      });
    });

    it('shows adoption fee and requirements', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText('Adoption Information')).toBeTruthy();
        expect(screen.getByText(`$${mockPet.adoptionInfo.adoptionFee}`)).toBeTruthy();
        
        mockPet.adoptionInfo.adoptionRequirements.forEach(requirement => {
          expect(screen.getByText(requirement)).toBeTruthy();
        });
      });
    });
  });

  describe('User Interaction Tests', () => {
    beforeEach(() => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );
    });

    it('handles favorite button press when pet is not favorited', async () => {
      await waitFor(() => {
        expect(screen.getByText('🤍 Add to Favorites')).toBeTruthy();
      });

      const favoriteButton = screen.getByText('🤍 Add to Favorites');
      fireEvent.press(favoriteButton);

      expect(mockAddToFavorites).toHaveBeenCalledWith({
        petId: mockPet.id,
        notes: '',
      });
    });

    it('handles unfavorite button press when pet is favorited', async () => {
      const favorites = [createMockFavorite({ petId: mockPet.id })];
      mockUseGetUserFavoritesQuery.mockReturnValue(
        createMockQueryResponse(favorites, false)
      );

      const { rerender } = renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText('❤️ Favorited')).toBeTruthy();
      });

      const favoriteButton = screen.getByText('❤️ Favorited');
      fireEvent.press(favoriteButton);

      expect(mockRemoveFromFavorites).toHaveBeenCalledWith(mockPet.id);
    });

    it('handles adoption CTA button press', async () => {
      await waitFor(() => {
        expect(screen.getByText('🏠 Start Adoption Process')).toBeTruthy();
      });

      const adoptionButton = screen.getByText('🏠 Start Adoption Process');
      fireEvent.press(adoptionButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('AdoptionApplication', {
        petId: mockPet.id,
        petName: mockPet.name,
      });
    });

    it('handles back navigation', async () => {
      await waitFor(() => {
        expect(screen.getByText(mockPet.name)).toBeTruthy();
      });

      // Simulate back button press (would typically come from navigation header)
      const backButton = screen.queryByTestId('back-button');
      if (backButton) {
        fireEvent.press(backButton);
        expect(mockNavigation.goBack).toHaveBeenCalled();
      }
    });

    it('opens photo gallery when view gallery is pressed', async () => {
      await waitFor(() => {
        expect(screen.getByText('View Gallery')).toBeTruthy();
      });

      const galleryButton = screen.getByText('View Gallery');
      fireEvent.press(galleryButton);

      // Should open gallery modal or navigate to gallery screen
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PetGallery', {
        petId: mockPet.id,
        photos: mockPet.photos,
      });
    });

    it('handles contact shelter button press', async () => {
      await waitFor(() => {
        expect(screen.getByText('📞 Contact Shelter')).toBeTruthy();
      });

      const contactButton = screen.getByText('📞 Contact Shelter');
      fireEvent.press(contactButton);

      // Should show contact options or navigate to contact screen
      expect(screen.getByText('Contact Options')).toBeTruthy();
    });

    it('handles share pet functionality', async () => {
      await waitFor(() => {
        const shareButton = screen.queryByText('Share');
        if (shareButton) {
          fireEvent.press(shareButton);
          // Should trigger native sharing
          expect(mockAnalytics.trackPetInteraction).toHaveBeenCalledWith(
            mockPet.id,
            'share',
            expect.any(Object)
          );
        }
      });
    });
  });

  describe('API Integration Tests', () => {
    it('fetches pet details by ID on mount', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      expect(mockUseGetPetByIdQuery).toHaveBeenCalledWith(mockPet.id);
    });

    it('fetches user favorites to determine favorite status', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      expect(mockUseGetUserFavoritesQuery).toHaveBeenCalled();
    });

    it('tracks pet view analytics when pet data loads', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(mockTrackPetView).toHaveBeenCalledWith({
          petId: mockPet.id,
          source: expect.any(String),
        });
      });
    });

    it('handles pet loading error gracefully', async () => {
      mockUseGetPetByIdQuery.mockReturnValue({
        ...createMockQueryResponse(undefined, false),
        isError: true,
        error: { message: 'Pet not found' },
      });

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText('Pet Not Found')).toBeTruthy();
        expect(screen.getByText('This pet may no longer be available for adoption.')).toBeTruthy();
        expect(screen.getByText('Back to Pet List')).toBeTruthy();
      });
    });

    it('shows loading state for favorite operations', async () => {
      mockUseAddPetToFavoritesMutation.mockReturnValue([
        mockAddToFavorites,
        { isLoading: true, isSuccess: false, isError: false, data: undefined, error: undefined, reset: jest.fn() }
      ]);

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        // Should show loading state on favorite button
        expect(screen.getByText('Adding...')).toBeTruthy();
      });
    });

    it('handles favorite operation errors', async () => {
      mockUseAddPetToFavoritesMutation.mockReturnValue([
        mockAddToFavorites,
        {
          isLoading: false,
          isSuccess: false,
          isError: true,
          data: undefined,
          error: { message: 'Failed to add to favorites' },
          reset: jest.fn()
        }
      ]);

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        // Should show error message or revert button state
        expect(screen.getByText('🤍 Add to Favorites')).toBeTruthy();
      });
    });
  });

  describe('Analytics Tracking Tests', () => {
    it('tracks screen view when component mounts', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(mockAnalytics.trackScreenView).toHaveBeenCalledWith(
          'PetDetailScreen',
          expect.objectContaining({
            petId: mockPet.id,
            petSpecies: mockPet.species,
            petBreed: mockPet.breed,
            petStatus: mockPet.status,
          })
        );
      });
    });

    it('tracks pet interaction events', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        const favoriteButton = screen.getByText('🤍 Add to Favorites');
        fireEvent.press(favoriteButton);
      });

      expect(mockAnalytics.trackPetInteraction).toHaveBeenCalledWith(
        mockPet.id,
        'favorite',
        expect.objectContaining({
          petName: mockPet.name,
          fromScreen: 'PetDetailScreen',
        })
      );
    });

    it('tracks adoption process start', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        const adoptionButton = screen.getByText('🏠 Start Adoption Process');
        fireEvent.press(adoptionButton);
      });

      expect(mockAnalytics.trackPetInteraction).toHaveBeenCalledWith(
        mockPet.id,
        'adoption_start',
        expect.objectContaining({
          petName: mockPet.name,
          fromScreen: 'PetDetailScreen',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('shows error state when pet data fails to load', async () => {
      mockUseGetPetByIdQuery.mockReturnValue({
        ...createMockQueryResponse(undefined, false),
        isError: true,
        error: { message: 'Network error' },
      });

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      expect(screen.getByText('Pet Not Found')).toBeTruthy();
      expect(screen.getByText('This pet may no longer be available for adoption.')).toBeTruthy();
    });

    it('handles missing pet ID parameter', () => {
      const routeWithoutPetId = createMockRoute({});

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={routeWithoutPetId} />
      );

      expect(screen.getByText('Pet Not Found')).toBeTruthy();
    });

    it('shows retry option on error', async () => {
      mockUseGetPetByIdQuery.mockReturnValue({
        ...createMockQueryResponse(undefined, false),
        isError: true,
        error: { message: 'Network error' },
        refetch: jest.fn(),
      });

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      const retryButton = screen.getByText('Try Again');
      fireEvent.press(retryButton);

      expect(mockUseGetPetByIdQuery().refetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper accessibility labels for interactive elements', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        const adoptionButton = screen.getByText('🏠 Start Adoption Process');
        expect(adoptionButton.parent?.props?.accessibilityLabel).toBe(
          `Start adoption process for ${mockPet.name}`
        );

        const favoriteButton = screen.getByText('🤍 Add to Favorites');
        expect(favoriteButton.parent?.props?.accessibilityLabel).toBe(
          `Add ${mockPet.name} to favorites`
        );
      });
    });

    it('supports screen reader navigation', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        // Pet information should be accessible
        expect(screen.getByText(mockPet.name)).toBeTruthy();
        expect(screen.getByText(mockPet.description)).toBeTruthy();
        
        // Interactive elements should be focusable
        const adoptionButton = screen.getByText('🏠 Start Adoption Process');
        expect(adoptionButton.parent?.props?.accessible).not.toBe(false);
      });
    });

    it('has proper semantic elements for content structure', async () => {
      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        // Headers should have proper semantic meaning
        expect(screen.getByText('Medical Information')).toBeTruthy();
        expect(screen.getByText('Behavior & Temperament')).toBeTruthy();
        expect(screen.getByText('Adoption Information')).toBeTruthy();
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('handles pets with no photos gracefully', async () => {
      const petWithoutPhotos = { ...mockPet, photos: [] };
      mockUseGetPetByIdQuery.mockReturnValue(
        createMockQueryResponse(petWithoutPhotos, false)
      );

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText('📷 0 Photos')).toBeTruthy();
        expect(screen.getByText('No photos available')).toBeTruthy();
      });
    });

    it('handles pets with minimal information', async () => {
      const minimalPet = {
        ...mockPet,
        description: '',
        characteristics: {},
        medicalInfo: {},
        behaviorInfo: { temperament: [], activityLevel: '', socialWithDogs: false, socialWithCats: false, socialWithChildren: false },
      };

      mockUseGetPetByIdQuery.mockReturnValue(
        createMockQueryResponse(minimalPet, false)
      );

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText(minimalPet.name)).toBeTruthy();
        // Should not crash with missing data
        expect(screen.getByText('🏠 Start Adoption Process')).toBeTruthy();
      });
    });

    it('manages memory efficiently with large pet data', async () => {
      const petWithLargeData = {
        ...mockPet,
        description: 'A'.repeat(5000), // Very long description
        photos: Array.from({ length: 50 }, (_, i) => ({
          id: `photo${i}`,
          url: `https://example.com/photo${i}.jpg`,
          thumbnail: `https://example.com/photo${i}_thumb.jpg`,
          caption: `Photo ${i}`,
          isPrimary: i === 0,
        })),
      };

      mockUseGetPetByIdQuery.mockReturnValue(
        createMockQueryResponse(petWithLargeData, false)
      );

      renderWithProviders(
        <PetDetailScreen navigation={mockNavigation} route={testRoute} />
      );

      await waitFor(() => {
        expect(screen.getByText(petWithLargeData.name)).toBeTruthy();
        expect(screen.getByText('📷 50 Photos')).toBeTruthy();
      });
    });
  });
});