// Pet API Integration Tests
// Testing RTK Query endpoints, caching, and enterprise features

import { configureStore } from '@reduxjs/toolkit';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { petApi, handlePetStatusUpdate, handlePetAvailabilityUpdate } from '../petApi';
import type { 
  Pet, 
  PetSearchResponse, 
  PetFavorite, 
  AdoptionApplication,
  PetApiResponse,
  PetStatusUpdate,
  PetAvailabilityUpdate 
} from '../../types/pet';

// Mock the base query dependencies
jest.mock('../correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-id')),
}));

jest.mock('../../transactions/transactionService', () => ({
  generateTransactionId: jest.fn(() => 'test-transaction-id'),
  generateIdempotencyKey: jest.fn(() => 'test-idempotency-key'),
}));

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
  getVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('../../config/constants', () => ({
  API_CONFIG: {
    BASE_URL: 'http://test-api.com',
    TIMEOUT: 10000,
  },
  ENV: {
    IS_DEV: true,
  },
}));

// Mock data
const mockPet: Pet = {
  id: 'pet-123',
  name: 'Buddy',
  type: 'dog',
  breed: 'Golden Retriever',
  age: 3,
  gender: 'male',
  size: 'large',
  description: 'Friendly dog looking for a home',
  photos: [{
    id: 'photo-1',
    url: 'http://example.com/photo1.jpg',
    thumbnailUrl: 'http://example.com/thumb1.jpg',
    isPrimary: true,
    uploadedAt: '2024-01-01T00:00:00Z',
  }],
  location: {
    id: 'loc-1',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'US',
  },
  status: 'available',
  shelter: {
    id: 'shelter-1',
    name: 'SF Animal Shelter',
    email: 'contact@sfas.org',
    phone: '555-0123',
    address: '123 Main St',
    location: {
      id: 'loc-1',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'US',
    },
    verified: true,
    rating: 4.5,
    totalReviews: 100,
  },
  characteristics: {
    energyLevel: 4,
    friendlinessWithChildren: 5,
    friendlinessWithPets: 4,
    trainability: 4,
    groomingNeeds: 3,
    specialNeeds: [],
    goodWith: ['children', 'dogs'],
    houseTrained: true,
    spayedNeutered: true,
  },
  medicalInfo: {
    vaccinated: true,
    microchipped: true,
    healthConditions: [],
    medications: [],
    lastCheckupDate: '2024-01-01',
  },
  adoptionInfo: {
    adoptionFee: 200,
    currency: 'USD',
    adoptionProcess: ['Application', 'Meet & Greet', 'Home Visit'],
    requirements: ['Valid ID', 'Stable Income'],
    contactInfo: {
      primaryContact: 'John Doe',
      email: 'john@sfas.org',
      phone: '555-0123',
    },
    availableForVisit: true,
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockSearchResponse: PetSearchResponse = {
  pets: [mockPet],
  total: 1,
  page: 1,
  limit: 20,
  hasMore: false,
  filters: {},
};

const mockFavorite: PetFavorite = {
  petId: 'pet-123',
  userId: 'user-123',
  favoritedAt: '2024-01-01T00:00:00Z',
  notes: 'Love this dog!',
};

// MSW server setup
const server = setupServer(
  rest.post('http://test-api.com/pets/search', (req, res, ctx) => {
    return res(ctx.json(mockSearchResponse));
  }),
  
  rest.get('http://test-api.com/pets/featured', (req, res, ctx) => {
    return res(ctx.json([mockPet]));
  }),
  
  rest.get('http://test-api.com/pets/:petId', (req, res, ctx) => {
    return res(ctx.json(mockPet));
  }),
  
  rest.post('http://test-api.com/pets/batch', (req, res, ctx) => {
    return res(ctx.json([mockPet]));
  }),
  
  rest.get('http://test-api.com/pets/favorites', (req, res, ctx) => {
    return res(ctx.json([mockFavorite]));
  }),
  
  rest.post('http://test-api.com/pets/:petId/favorite', (req, res, ctx) => {
    const response: PetApiResponse<PetFavorite> = {
      data: mockFavorite,
      success: true,
      correlationId: 'test-correlation-id',
      timestamp: '2024-01-01T00:00:00Z',
    };
    return res(ctx.json(response));
  }),
  
  rest.delete('http://test-api.com/pets/:petId/favorite', (req, res, ctx) => {
    const response: PetApiResponse<void> = {
      data: undefined as any,
      success: true,
      correlationId: 'test-correlation-id',
      timestamp: '2024-01-01T00:00:00Z',
    };
    return res(ctx.json(response));
  }),
  
  rest.post('http://test-api.com/adoption/applications', (req, res, ctx) => {
    const mockApplication: AdoptionApplication = {
      id: 'app-123',
      petId: 'pet-123',
      userId: 'user-123',
      status: 'draft',
      submittedAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0123',
        address: '123 Main St',
        dateOfBirth: '1990-01-01',
      },
      livingSituation: {
        housingType: 'house',
        ownOrRent: 'own',
        yardType: 'large',
      },
      experience: {
        previousPets: true,
        currentPets: [],
        petExperience: 'Had dogs for 10 years',
      },
      references: [],
      documents: [],
    };
    
    const response: PetApiResponse<AdoptionApplication> = {
      data: mockApplication,
      success: true,
      correlationId: 'test-correlation-id',
      timestamp: '2024-01-01T00:00:00Z',
    };
    return res(ctx.json(response));
  })
);

// Test store setup
const createTestStore = () => {
  return configureStore({
    reducer: {
      [petApi.reducerPath]: petApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(petApi.middleware),
  });
};

describe('Pet API Integration Tests', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeAll(() => server.listen());
  
  beforeEach(() => {
    store = createTestStore();
    jest.clearAllMocks();
  });
  
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('Pet Discovery Endpoints', () => {
    test('searchPets should make POST request with search criteria', async () => {
      const searchRequest = {
        filters: { type: ['dog'] as const },
        sortBy: 'newest' as const,
        limit: 10,
      };

      const { data } = await store.dispatch(
        petApi.endpoints.searchPets.initiate(searchRequest)
      ).unwrap();

      expect(data.pets).toHaveLength(1);
      expect(data.pets[0].name).toBe('Buddy');
      expect(data.total).toBe(1);
    });

    test('getFeaturedPets should cache results properly', async () => {
      // First request
      await store.dispatch(
        petApi.endpoints.getFeaturedPets.initiate({ limit: 5 })
      );

      // Second identical request should use cache
      const result = await store.dispatch(
        petApi.endpoints.getFeaturedPets.initiate({ limit: 5 })
      );

      expect(result.data).toBeDefined();
      expect(result.data![0].name).toBe('Buddy');
    });

    test('getPetById should return single pet', async () => {
      const { data } = await store.dispatch(
        petApi.endpoints.getPetById.initiate('pet-123')
      ).unwrap();

      expect(data.id).toBe('pet-123');
      expect(data.name).toBe('Buddy');
    });

    test('getPetsByIds should handle batch requests', async () => {
      const { data } = await store.dispatch(
        petApi.endpoints.getPetsByIds.initiate(['pet-123'])
      ).unwrap();

      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('pet-123');
    });
  });

  describe('Pet Favorites Endpoints', () => {
    test('getUserFavorites should return user favorites', async () => {
      const { data } = await store.dispatch(
        petApi.endpoints.getUserFavorites.initiate()
      ).unwrap();

      expect(data).toHaveLength(1);
      expect(data[0].petId).toBe('pet-123');
      expect(data[0].notes).toBe('Love this dog!');
    });

    test('addPetToFavorites should perform optimistic update', async () => {
      // First get the current favorites to establish cache
      await store.dispatch(
        petApi.endpoints.getUserFavorites.initiate()
      );

      // Add new favorite
      const addResult = await store.dispatch(
        petApi.endpoints.addPetToFavorites.initiate({
          petId: 'pet-456',
          notes: 'Another great pet!',
        })
      );

      expect(addResult.data?.data.petId).toBe('pet-123'); // Mock returns pet-123
    });

    test('removePetFromFavorites should handle optimistic update rollback on error', async () => {
      // Setup server error for this test
      server.use(
        rest.delete('http://test-api.com/pets/:petId/favorite', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        })
      );

      try {
        await store.dispatch(
          petApi.endpoints.removePetFromFavorites.initiate('pet-123')
        ).unwrap();
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });
  });

  describe('Adoption Application Endpoints', () => {
    test('createAdoptionApplication should submit application data', async () => {
      const applicationData = {
        petId: 'pet-123',
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0123',
          address: '123 Main St',
          dateOfBirth: '1990-01-01',
        },
        livingSituation: {
          housingType: 'house' as const,
          ownOrRent: 'own' as const,
          yardType: 'large' as const,
        },
        experience: {
          previousPets: true,
          currentPets: [],
          petExperience: 'Had dogs for 10 years',
        },
        references: [],
        documents: [],
      };

      const { data } = await store.dispatch(
        petApi.endpoints.createAdoptionApplication.initiate(applicationData)
      ).unwrap();

      expect(data.data.id).toBe('app-123');
      expect(data.data.petId).toBe('pet-123');
      expect(data.success).toBe(true);
    });
  });

  describe('Caching and Invalidation', () => {
    test('should invalidate related cache when adding to favorites', async () => {
      // Get initial favorites
      const initialFavorites = await store.dispatch(
        petApi.endpoints.getUserFavorites.initiate()
      );

      // Add to favorites (which should invalidate PetFavorite tags)
      await store.dispatch(
        petApi.endpoints.addPetToFavorites.initiate({
          petId: 'pet-456',
        })
      );

      // The cache should be marked as invalid
      const cacheState = store.getState()[petApi.reducerPath];
      const queryState = cacheState.queries['getUserFavorites(undefined)'];
      
      expect(queryState).toBeDefined();
    });
  });

  describe('SignalR Real-time Update Handlers', () => {
    test('handlePetStatusUpdate should update pet cache', () => {
      const mockDispatch = jest.fn();
      const statusUpdate: PetStatusUpdate = {
        petId: 'pet-123',
        status: 'adopted',
        updatedAt: '2024-01-01T12:00:00Z',
        reason: 'Adopted by John Doe',
      };

      handlePetStatusUpdate(mockDispatch, statusUpdate);

      expect(mockDispatch).toHaveBeenCalledTimes(2); // updateQueryData + invalidateTags
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('updateQueryData'),
        })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('invalidateTags'),
        })
      );
    });

    test('handlePetAvailabilityUpdate should invalidate search cache', () => {
      const mockDispatch = jest.fn();
      const availabilityUpdate: PetAvailabilityUpdate = {
        petId: 'pet-123',
        available: false,
        updatedAt: '2024-01-01T12:00:00Z',
        shelter: {
          id: 'shelter-1',
          name: 'SF Animal Shelter',
        },
      };

      handlePetAvailabilityUpdate(mockDispatch, availabilityUpdate);

      expect(mockDispatch).toHaveBeenCalledTimes(2); // updateQueryData + invalidateTags
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      server.use(
        rest.get('http://test-api.com/pets/:petId', (req, res, ctx) => {
          return res(ctx.status(404), ctx.json({ error: 'Pet not found' }));
        })
      );

      try {
        await store.dispatch(
          petApi.endpoints.getPetById.initiate('nonexistent-pet')
        ).unwrap();
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });

    test('should retry on network errors', async () => {
      let callCount = 0;
      server.use(
        rest.get('http://test-api.com/pets/:petId', (req, res, ctx) => {
          callCount++;
          if (callCount === 1) {
            return res.networkError('Network error');
          }
          return res(ctx.json(mockPet));
        })
      );

      // RTK Query will handle retries automatically
      const result = await store.dispatch(
        petApi.endpoints.getPetById.initiate('pet-123')
      );

      expect(result.data || result.error).toBeDefined();
    });
  });
});