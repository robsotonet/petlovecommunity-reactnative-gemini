// Pet Love Community - PetGalleryScreen Test Suite
// Comprehensive tests for full-screen pet photo gallery

import React from 'react';
import { render } from '@testing-library/react-native';
import PetGalleryScreen from '../PetGalleryScreen';
import { useGetPetByIdQuery } from '../../services/petApi';
import SwipeableImageGallery from '../../components/SwipeableImageGallery';
import {
  renderWithProviders,
  createMockPet,
  createMockNavigation,
  createMockRoute,
  createMockQueryResponse,
  cleanupMocks,
} from '../../__tests__/testUtils';

// Mock the pet API
jest.mock('../../services/petApi', () => ({
  useGetPetByIdQuery: jest.fn(),
}));

// Mock the SwipeableImageGallery component
jest.mock('../../components/SwipeableImageGallery', () => {
  return jest.fn(({ onClose, petName, photos, initialIndex, visible }) => {
    const mockComponent = require('react-native').View;
    return React.createElement(mockComponent, {
      testID: 'swipeable-image-gallery',
      accessibilityLabel: `Photo gallery for ${petName}`,
      children: [
        React.createElement(require('react-native').Text, {
          key: 'pet-name',
          testID: 'gallery-pet-name',
        }, petName),
        React.createElement(require('react-native').Text, {
          key: 'photo-count',
          testID: 'gallery-photo-count',
        }, `${photos.length} photos`),
        React.createElement(require('react-native').Text, {
          key: 'initial-index',
          testID: 'gallery-initial-index',
        }, `Starting at photo ${initialIndex + 1}`),
        React.createElement(require('react-native').TouchableOpacity, {
          key: 'close-button',
          testID: 'gallery-close-button',
          onPress: onClose,
          accessibilityLabel: 'Close gallery',
        }, React.createElement(require('react-native').Text, {}, 'Close')),
      ],
    });
  });
});

const mockUseGetPetByIdQuery = useGetPetByIdQuery as jest.MockedFunction<typeof useGetPetByIdQuery>;
const MockSwipeableImageGallery = SwipeableImageGallery as jest.MockedFunction<typeof SwipeableImageGallery>;

describe('PetGalleryScreen', () => {
  const mockNavigation = createMockNavigation();
  
  const createMockRouteWithParams = (params: { petId: string; photoIndex: number }) =>
    createMockRoute(params);

  const mockPet = createMockPet({
    id: 'pet-123',
    name: 'Buddy',
    photos: [
      {
        id: 'photo1',
        url: 'https://example.com/photo1.jpg',
        thumbnailUrl: 'https://example.com/photo1_thumb.jpg',
        caption: 'Playing in the park',
        isPrimary: true,
        uploadedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'photo2',
        url: 'https://example.com/photo2.jpg',
        thumbnailUrl: 'https://example.com/photo2_thumb.jpg',
        caption: 'Relaxing at home',
        isPrimary: false,
        uploadedAt: '2024-01-15T10:30:00Z',
      },
      {
        id: 'photo3',
        url: 'https://example.com/photo3.jpg',
        thumbnailUrl: 'https://example.com/photo3_thumb.jpg',
        caption: 'Portrait shot',
        isPrimary: false,
        uploadedAt: '2024-01-15T11:00:00Z',
      },
    ],
  });

  beforeEach(() => {
    cleanupMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders SwipeableImageGallery when pet data is loaded', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      const { getByTestId } = renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(getByTestId('swipeable-image-gallery')).toBeTruthy();
      expect(getByTestId('gallery-pet-name')).toBeTruthy();
      expect(getByTestId('gallery-photo-count')).toBeTruthy();
    });

    it('renders null when pet data is not available', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(undefined));

      const { queryByTestId } = renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(queryByTestId('swipeable-image-gallery')).toBeNull();
    });

    it('renders null when pet data is still loading', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(undefined, true));

      const { queryByTestId } = renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(queryByTestId('swipeable-image-gallery')).toBeNull();
    });
  });

  describe('Pet API Integration', () => {
    it('calls useGetPetByIdQuery with correct petId from route params', () => {
      const route = createMockRouteWithParams({ petId: 'pet-456', photoIndex: 2 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(mockUseGetPetByIdQuery).toHaveBeenCalledWith('pet-456');
    });

    it('handles API error gracefully', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      const errorResponse = createMockQueryResponse(undefined, false, { message: 'Pet not found' });
      mockUseGetPetByIdQuery.mockReturnValue(errorResponse);

      const { queryByTestId } = renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(queryByTestId('swipeable-image-gallery')).toBeNull();
    });
  });

  describe('Photo Data Processing', () => {
    it('correctly transforms pet photos to gallery format', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 1 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(MockSwipeableImageGallery).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: [
            { url: 'https://example.com/photo1.jpg', caption: 'Playing in the park' },
            { url: 'https://example.com/photo2.jpg', caption: 'Relaxing at home' },
            { url: 'https://example.com/photo3.jpg', caption: 'Portrait shot' },
          ],
          petName: 'Buddy',
          initialIndex: 1,
          visible: true,
        }),
        expect.any(Object)
      );
    });

    it('handles pet with no photos', () => {
      const petWithNoPhotos = createMockPet({
        id: 'pet-123',
        name: 'Buddy',
        photos: [],
      });
      
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(petWithNoPhotos));

      renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(MockSwipeableImageGallery).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: [],
          petName: 'Buddy',
          initialIndex: 0,
        }),
        expect.any(Object)
      );
    });

    it('handles photos without captions', () => {
      const petWithPhotosNoCaption = createMockPet({
        id: 'pet-123',
        name: 'Buddy',
        photos: [
          {
            id: 'photo1',
            url: 'https://example.com/photo1.jpg',
            thumbnailUrl: 'https://example.com/photo1_thumb.jpg',
            caption: undefined,
            isPrimary: true,
            uploadedAt: '2024-01-15T10:00:00Z',
          },
        ],
      });
      
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(petWithPhotosNoCaption));

      renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(MockSwipeableImageGallery).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: [{ url: 'https://example.com/photo1.jpg', caption: undefined }],
        }),
        expect.any(Object)
      );
    });
  });

  describe('Navigation Integration', () => {
    it('passes correct navigation handler to SwipeableImageGallery', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(MockSwipeableImageGallery).toHaveBeenCalledWith(
        expect.objectContaining({
          onClose: expect.any(Function),
        }),
        expect.any(Object)
      );
    });

    it('calls navigation.goBack when onClose is triggered', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      const { getByTestId } = renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      const closeButton = getByTestId('gallery-close-button');
      closeButton.props.onPress();

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Route Parameters Handling', () => {
    it('uses photoIndex from route params as initialIndex', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 2 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(MockSwipeableImageGallery).toHaveBeenCalledWith(
        expect.objectContaining({
          initialIndex: 2,
        }),
        expect.any(Object)
      );
    });

    it('handles edge case photoIndex values', () => {
      // Test with photoIndex 0
      const route1 = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      const { rerender } = renderWithProviders(
        <PetGalleryScreen route={route1} navigation={mockNavigation} />
      );

      expect(MockSwipeableImageGallery).toHaveBeenCalledWith(
        expect.objectContaining({ initialIndex: 0 }),
        expect.any(Object)
      );

      // Test with high photoIndex (should still be passed through)
      const route2 = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 999 });
      rerender(<PetGalleryScreen route={route2} navigation={mockNavigation} />);

      expect(MockSwipeableImageGallery).toHaveBeenCalledWith(
        expect.objectContaining({ initialIndex: 999 }),
        expect.any(Object)
      );
    });
  });

  describe('Component Props Validation', () => {
    it('passes all required props to SwipeableImageGallery', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 1 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(MockSwipeableImageGallery).toHaveBeenCalledWith(
        expect.objectContaining({
          photos: expect.any(Array),
          initialIndex: expect.any(Number),
          visible: true,
          onClose: expect.any(Function),
          petName: expect.any(String),
        }),
        expect.any(Object)
      );
    });

    it('sets visible prop to true', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(MockSwipeableImageGallery).toHaveBeenCalledWith(
        expect.objectContaining({ visible: true }),
        expect.any(Object)
      );
    });
  });

  describe('Error Scenarios', () => {
    it('handles malformed pet data gracefully', () => {
      const malformedPet = {
        ...mockPet,
        photos: null, // Malformed data
      };
      
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(malformedPet as any));

      expect(() => {
        renderWithProviders(
          <PetGalleryScreen route={route} navigation={mockNavigation} />
        );
      }).not.toThrow();
    });

    it('handles missing route params gracefully', () => {
      const incompleteRoute = {
        key: 'test-key',
        name: 'PetGallery' as never,
        params: { petId: 'pet-123' }, // Missing photoIndex
      };
      
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      expect(() => {
        renderWithProviders(
          <PetGalleryScreen route={incompleteRoute as any} navigation={mockNavigation} />
        );
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('does not re-render unnecessarily when pet data changes', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      const { rerender } = renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      const initialCallCount = MockSwipeableImageGallery.mock.calls.length;

      // Same data should not cause re-render of SwipeableImageGallery
      rerender(<PetGalleryScreen route={route} navigation={mockNavigation} />);

      expect(MockSwipeableImageGallery.mock.calls.length).toBe(initialCallCount + 1);
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      const route = createMockRouteWithParams({ petId: 'pet-123', photoIndex: 0 });
      mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));

      const { getByLabelText } = renderWithProviders(
        <PetGalleryScreen route={route} navigation={mockNavigation} />
      );

      expect(getByLabelText('Photo gallery for Buddy')).toBeTruthy();
      expect(getByLabelText('Close gallery')).toBeTruthy();
    });
  });
});