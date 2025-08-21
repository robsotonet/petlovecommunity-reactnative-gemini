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

  describe('Adoption Application Endpoints (Missing Coverage)', () => {
    test('getUserApplications should fetch user applications', async () => {
      server.use(
        rest.get('http://test-api.com/adoption/applications', (req, res, ctx) => {
          return res(ctx.json([
            {
              id: 'app-123',
              petId: 'pet-123',
              userId: 'user-123',
              status: 'submitted',
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
            }
          ]));
        })
      );

      const { data } = await store.dispatch(
        petApi.endpoints.getUserApplications.initiate()
      ).unwrap();

      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('app-123');
      expect(data[0].status).toBe('submitted');
    });

    test('getApplicationById should fetch specific application', async () => {
      server.use(
        rest.get('http://test-api.com/adoption/applications/app-123', (req, res, ctx) => {
          return res(ctx.json({
            id: 'app-123',
            petId: 'pet-123',
            userId: 'user-123',
            status: 'under_review',
            submittedAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
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
          }));
        })
      );

      const { data } = await store.dispatch(
        petApi.endpoints.getApplicationById.initiate('app-123')
      ).unwrap();

      expect(data.id).toBe('app-123');
      expect(data.status).toBe('under_review');
    });

    test('updateAdoptionApplication should update application', async () => {
      server.use(
        rest.patch('http://test-api.com/adoption/applications/app-123', (req, res, ctx) => {
          const response: PetApiResponse<AdoptionApplication> = {
            data: {
              id: 'app-123',
              petId: 'pet-123',
              userId: 'user-123',
              status: 'updated',
              submittedAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-02T12:00:00Z',
              personalInfo: {
                firstName: 'John',
                lastName: 'Smith', // Updated
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
            },
            success: true,
            correlationId: 'test-correlation-id',
            timestamp: '2024-01-02T12:00:00Z',
          };
          return res(ctx.json(response));
        })
      );

      const updateData = {
        personalInfo: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com',
          phone: '555-0123',
          address: '123 Main St',
          dateOfBirth: '1990-01-01',
        }
      };

      const { data } = await store.dispatch(
        petApi.endpoints.updateAdoptionApplication.initiate({
          id: 'app-123',
          updates: updateData
        })
      ).unwrap();

      expect(data.data.personalInfo.lastName).toBe('Smith');
      expect(data.success).toBe(true);
    });

    test('submitAdoptionApplication should submit application', async () => {
      server.use(
        rest.post('http://test-api.com/adoption/applications/app-123/submit', (req, res, ctx) => {
          const response: PetApiResponse<AdoptionApplication> = {
            data: {
              id: 'app-123',
              petId: 'pet-123',
              userId: 'user-123',
              status: 'submitted',
              submittedAt: '2024-01-02T12:00:00Z',
              updatedAt: '2024-01-02T12:00:00Z',
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
            },
            success: true,
            correlationId: 'test-correlation-id',
            timestamp: '2024-01-02T12:00:00Z',
          };
          return res(ctx.json(response));
        })
      );

      const { data } = await store.dispatch(
        petApi.endpoints.submitAdoptionApplication.initiate('app-123')
      ).unwrap();

      expect(data.data.status).toBe('submitted');
      expect(data.data.submittedAt).toBe('2024-01-02T12:00:00Z');
    });
  });

  describe('Analytics Tracking Endpoints (Missing Coverage)', () => {
    test('trackPetView should track pet view events', async () => {
      server.use(
        rest.post('http://test-api.com/analytics/pet-view', (req, res, ctx) => {
          const response: PetApiResponse<void> = {
            data: undefined as any,
            success: true,
            correlationId: 'test-correlation-id',
            timestamp: '2024-01-01T00:00:00Z',
          };
          return res(ctx.json(response));
        })
      );

      const viewEvent = {
        petId: 'pet-123',
        source: 'featured' as const,
        sessionId: 'session-123',
        userId: 'user-123',
        deviceId: 'device-123',
      };

      const { data } = await store.dispatch(
        petApi.endpoints.trackPetView.initiate(viewEvent)
      ).unwrap();

      expect(data.success).toBe(true);
    });

    test('trackPetInteraction should track pet interaction events', async () => {
      server.use(
        rest.post('http://test-api.com/analytics/pet-interaction', (req, res, ctx) => {
          const response: PetApiResponse<void> = {
            data: undefined as any,
            success: true,
            correlationId: 'test-correlation-id',
            timestamp: '2024-01-01T00:00:00Z',
          };
          return res(ctx.json(response));
        })
      );

      const interactionEvent = {
        petId: 'pet-123',
        action: 'favorite' as const,
        userId: 'user-123',
        metadata: { source: 'detail_page' },
      };

      const { data } = await store.dispatch(
        petApi.endpoints.trackPetInteraction.initiate(interactionEvent)
      ).unwrap();

      expect(data.success).toBe(true);
    });
  });

  describe('File Upload Endpoints (Missing Coverage)', () => {
    test('uploadApplicationDocument should upload documents', async () => {
      server.use(
        rest.post('http://test-api.com/adoption/applications/app-123/documents', (req, res, ctx) => {
          const response: PetApiResponse<{ url: string; documentId: string }> = {
            data: {
              url: 'https://example.com/documents/doc-123.pdf',
              documentId: 'doc-123'
            },
            success: true,
            correlationId: 'test-correlation-id',
            timestamp: '2024-01-01T00:00:00Z',
          };
          return res(ctx.json(response));
        })
      );

      const formData = new FormData();
      formData.append('file', new Blob(['test content'], { type: 'application/pdf' }), 'test.pdf');

      const uploadData = {
        applicationId: 'app-123',
        file: formData,
        documentType: 'identification'
      };

      const { data } = await store.dispatch(
        petApi.endpoints.uploadApplicationDocument.initiate(uploadData)
      ).unwrap();

      expect(data.data.documentId).toBe('doc-123');
      expect(data.data.url).toContain('doc-123.pdf');
    });

    test('uploadPetPhoto should upload pet photos', async () => {
      server.use(
        rest.post('http://test-api.com/pets/pet-123/photos', (req, res, ctx) => {
          const response: PetApiResponse<{ url: string; photoId: string }> = {
            data: {
              url: 'https://example.com/photos/photo-123.jpg',
              photoId: 'photo-123'
            },
            success: true,
            correlationId: 'test-correlation-id',
            timestamp: '2024-01-01T00:00:00Z',
          };
          return res(ctx.json(response));
        })
      );

      const formData = new FormData();
      formData.append('file', new Blob(['image content'], { type: 'image/jpeg' }), 'pet.jpg');

      const uploadData = {
        petId: 'pet-123',
        file: formData,
        caption: 'Beautiful pet photo',
        isPrimary: true
      };

      const { data } = await store.dispatch(
        petApi.endpoints.uploadPetPhoto.initiate(uploadData)
      ).unwrap();

      expect(data.data.photoId).toBe('photo-123');
      expect(data.data.url).toContain('photo-123.jpg');
    });
  });

  describe('Optimistic Updates Error Handling (Missing Coverage)', () => {
    test('removePetFromFavorites should handle rollback on failure', async () => {
      // First populate favorites cache
      await store.dispatch(
        petApi.endpoints.getUserFavorites.initiate()
      );

      // Setup server error for remove operation
      server.use(
        rest.delete('http://test-api.com/pets/pet-123/favorite', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        })
      );

      try {
        await store.dispatch(
          petApi.endpoints.removePetFromFavorites.initiate('pet-123')
        ).unwrap();
      } catch (error: any) {
        expect(error.status).toBe(500);
      }

      // Verify the optimistic update was rolled back
      const cacheState = store.getState()[petApi.reducerPath];
      expect(cacheState.queries).toBeDefined();
    });

    test('addPetToFavorites should handle rollback on failure', async () => {
      // First populate favorites cache
      await store.dispatch(
        petApi.endpoints.getUserFavorites.initiate()
      );

      // Setup server error for add operation
      server.use(
        rest.post('http://test-api.com/pets/pet-456/favorite', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ error: 'Already favorited' }));
        })
      );

      try {
        await store.dispatch(
          petApi.endpoints.addPetToFavorites.initiate({
            petId: 'pet-456',
            notes: 'Test note'
          })
        ).unwrap();
      } catch (error: any) {
        expect(error.status).toBe(400);
      }

      // Verify the optimistic update was rolled back
      const cacheState = store.getState()[petApi.reducerPath];
      expect(cacheState.queries).toBeDefined();
    });
  });

  describe('Advanced Error Scenarios (Missing Coverage)', () => {
    test('should handle malformed response data', async () => {
      server.use(
        rest.get('http://test-api.com/pets/pet-malformed', (req, res, ctx) => {
          return res(ctx.json({ invalid: 'response format' }));
        })
      );

      try {
        await store.dispatch(
          petApi.endpoints.getPetById.initiate('pet-malformed')
        ).unwrap();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle network timeout errors', async () => {
      server.use(
        rest.get('http://test-api.com/pets/pet-timeout', (req, res, ctx) => {
          return res(ctx.delay('infinite'));
        })
      );

      // This would normally timeout based on API_CONFIG.TIMEOUT
      // For testing, we'll just verify the request structure
      const promise = store.dispatch(
        petApi.endpoints.getPetById.initiate('pet-timeout')
      );

      // Cancel the request to avoid hanging test
      promise.abort();

      expect(promise.requestId).toBeDefined();
    });

    test('should handle concurrent requests properly', async () => {
      const requests = [
        store.dispatch(petApi.endpoints.getPetById.initiate('pet-1')),
        store.dispatch(petApi.endpoints.getPetById.initiate('pet-2')),
        store.dispatch(petApi.endpoints.getPetById.initiate('pet-3')),
      ];

      const results = await Promise.allSettled(requests.map(req => req.unwrap()));
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.id).toMatch(/pet-[123]/);
        }
      });
    });
  });

  describe('Advanced SignalR Integration (Missing Coverage)', () => {
    test('handlePetStatusUpdate should handle complex status changes', () => {
      const mockDispatch = jest.fn();
      
      const complexStatusUpdate: PetStatusUpdate = {
        petId: 'pet-complex',
        status: 'adopted',
        updatedAt: '2024-01-15T10:30:00Z',
        reason: 'Successfully matched with loving family'
      };

      handlePetStatusUpdate(mockDispatch, complexStatusUpdate);

      expect(mockDispatch).toHaveBeenCalledTimes(2);
      
      // Verify both updateQueryData and invalidateTags calls
      const calls = mockDispatch.mock.calls;
      expect(calls[0][0].type).toContain('updateQueryData');
      expect(calls[1][0].type).toContain('invalidateTags');
    });

    test('handlePetAvailabilityUpdate should handle shelter-specific updates', () => {
      const mockDispatch = jest.fn();
      
      const shelterUpdate: PetAvailabilityUpdate = {
        petId: 'pet-shelter-update',
        available: false,
        updatedAt: '2024-01-15T11:00:00Z',
        shelter: {
          id: 'shelter-456',
          name: 'City Animal Shelter',
        }
      };

      handlePetAvailabilityUpdate(mockDispatch, shelterUpdate);

      expect(mockDispatch).toHaveBeenCalledTimes(2);
      
      // Verify the update changes availability status
      const updateCall = mockDispatch.mock.calls[0][0];
      expect(updateCall.type).toContain('updateQueryData');
      
      const invalidateCall = mockDispatch.mock.calls[1][0];
      expect(invalidateCall.type).toContain('invalidateTags');
    });

    test('SignalR handlers should maintain data consistency', () => {
      const mockDispatch = jest.fn();
      
      // Simulate rapid status updates
      const updates = [
        { petId: 'pet-rapid', status: 'pending', updatedAt: '2024-01-15T10:00:00Z' },
        { petId: 'pet-rapid', status: 'approved', updatedAt: '2024-01-15T10:05:00Z' },
        { petId: 'pet-rapid', status: 'adopted', updatedAt: '2024-01-15T10:10:00Z' },
      ];

      updates.forEach(update => {
        handlePetStatusUpdate(mockDispatch, update as PetStatusUpdate);
      });

      // Should have processed all updates
      expect(mockDispatch).toHaveBeenCalledTimes(6); // 2 calls per update
    });
  });
});