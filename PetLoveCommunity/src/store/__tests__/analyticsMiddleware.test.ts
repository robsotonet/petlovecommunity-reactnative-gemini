// Pet Love Community - Analytics Middleware Tests
// Comprehensive test suite for offline event tracking and queue management

import { analyticsMiddleware } from '../analyticsMiddleware';
import adoptionAnalyticsService from '../../services/adoptionAnalyticsService';
import type { RootState } from '../';
import { AnyAction, Middleware } from '@reduxjs/toolkit';

// Mock the analytics service
jest.mock('../../services/adoptionAnalyticsService', () => ({
  trackPetView: jest.fn(),
  trackPetInteraction: jest.fn(),
  trackAdoptionFunnelStep: jest.fn(),
  trackFormAction: jest.fn(),
  trackSearch: jest.fn(),
  trackOfflineEvent: jest.fn(),
}));

// Type the mocked service
const mockAnalyticsService = adoptionAnalyticsService as jest.Mocked<typeof adoptionAnalyticsService>;

// Mock console.error to avoid test noise
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('Analytics Middleware - Offline Support and Queue Management', () => {
  let store: any;
  let next: jest.Mock;
  let middleware: ReturnType<Middleware>;

  const createMockState = (overrides: Partial<RootState> = {}): RootState => ({
    pets: {
      items: [],
      loading: false,
      error: null,
      selectedPet: null,
      searchFilters: {},
      recentSearches: [],
      favorites: [],
      drafts: {},
      currentApplication: {
        petId: '',
        petName: '',
        step: 1,
        status: 'draft',
      },
      draftSyncStatus: {},
      ...overrides.pets,
    },
    auth: {
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      ...overrides.auth,
    },
    ...overrides,
  } as RootState);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock store with state
    store = {
      getState: jest.fn(() => createMockState()),
      dispatch: jest.fn(),
    };

    next = jest.fn((action) => action);
    middleware = analyticsMiddleware(store)(next);

    // Setup analytics service mocks
    mockAnalyticsService.trackPetView.mockResolvedValue();
    mockAnalyticsService.trackPetInteraction.mockResolvedValue();
    mockAnalyticsService.trackAdoptionFunnelStep.mockResolvedValue();
    mockAnalyticsService.trackFormAction.mockResolvedValue();
    mockAnalyticsService.trackSearch.mockResolvedValue();
    mockAnalyticsService.trackOfflineEvent.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Offline Event Tracking', () => {
    it('tracks draft sync start events', async () => {
      const action = {
        type: 'pets/setDraftSyncStatus',
        payload: { draftId: 'draft-123', status: 'syncing' },
      };

      const newState = createMockState({
        pets: {
          drafts: { 'draft-123': { id: 'draft-123' } },
        } as any,
      });

      store.getState
        .mockReturnValueOnce(createMockState()) // Previous state
        .mockReturnValueOnce(newState); // New state

      middleware(action);

      // Fast-forward to trigger async analytics
      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackOfflineEvent).toHaveBeenCalledWith('sync_start', {
        queueSize: 1,
      });
    });

    it('tracks queue events when draft backups are created', async () => {
      const action = {
        type: 'pets/createDraftBackup',
        payload: { draftId: 'draft-123', backupVersion: 2 },
      };

      const newState = createMockState({
        pets: {
          drafts: {
            'draft-123': { id: 'draft-123' },
            'draft-456': { id: 'draft-456' },
          },
        } as any,
      });

      store.getState
        .mockReturnValueOnce(createMockState()) // Previous state
        .mockReturnValueOnce(newState); // New state

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackOfflineEvent).toHaveBeenCalledWith('queue_event', {
        queueSize: 2,
      });
    });

    it('tracks successful sync events', async () => {
      const action = {
        type: 'pets/updateDraftFromServer',
        payload: { draftId: 'draft-123', serverData: { version: 2 } },
      };

      const newState = createMockState({
        pets: {
          drafts: { 'draft-123': { id: 'draft-123', syncStatus: 'synced' } },
        } as any,
      });

      store.getState
        .mockReturnValueOnce(createMockState())
        .mockReturnValueOnce(newState);

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackOfflineEvent).toHaveBeenCalledWith('sync_success', {
        queueSize: 1,
      });
    });

    it('tracks conflict resolution events', async () => {
      const action = {
        type: 'pets/resolveDraftConflict',
        payload: { 
          draftId: 'draft-123', 
          resolution: 'server',
          conflictsResolved: 1,
        },
      };

      const newState = createMockState({
        pets: {
          drafts: { 'draft-123': { id: 'draft-123' } },
        } as any,
      });

      store.getState
        .mockReturnValueOnce(createMockState())
        .mockReturnValueOnce(newState);

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackOfflineEvent).toHaveBeenCalledWith('conflict_resolved', {
        queueSize: 1,
      });
    });

    it('handles empty drafts state correctly', async () => {
      const action = {
        type: 'pets/setDraftSyncStatus',
        payload: { draftId: 'draft-123', status: 'error' },
      };

      const newState = createMockState({
        pets: {
          drafts: {},
        } as any,
      });

      store.getState
        .mockReturnValueOnce(createMockState())
        .mockReturnValueOnce(newState);

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackOfflineEvent).toHaveBeenCalledWith('sync_start', {
        queueSize: 0,
      });
    });

    it('does not track offline events for unrelated actions', async () => {
      const action = {
        type: 'auth/loginSuccess',
        payload: { user: { id: 'user-123' } },
      };

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackOfflineEvent).not.toHaveBeenCalled();
    });
  });

  describe('Pet Interaction Tracking with Offline Context', () => {
    it('tracks pet views with proper context', async () => {
      const pet = {
        id: 'pet-123',
        name: 'Buddy',
        species: 'dog',
        breed: 'Golden Retriever',
      };

      const action = {
        type: 'pets/setSelectedPet',
        payload: pet,
      };

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackPetView).toHaveBeenCalledWith('pet-123', {
        petName: 'Buddy',
        source: 'direct',
      });
    });

    it('tracks pet favorites with state comparison', async () => {
      const action = {
        type: 'pets/addFavoriteOptimistic',
        payload: { petId: 'pet-123' },
      };

      const prevState = createMockState({
        pets: { favorites: [] } as any,
      });

      const newState = createMockState({
        pets: {
          favorites: [{ petId: 'pet-123', userId: 'user-123' }],
        } as any,
      });

      store.getState
        .mockReturnValueOnce(prevState)
        .mockReturnValueOnce(newState);

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackPetInteraction).toHaveBeenCalledWith(
        'pet-123',
        'favorite',
        {
          previousState: false,
          newState: true,
        }
      );
    });

    it('tracks pet unfavorites correctly', async () => {
      const action = {
        type: 'pets/removeFavoriteOptimistic',
        payload: { petId: 'pet-123' },
      };

      const prevState = createMockState({
        pets: {
          favorites: [{ petId: 'pet-123', userId: 'user-123' }],
        } as any,
      });

      const newState = createMockState({
        pets: { favorites: [] } as any,
      });

      store.getState
        .mockReturnValueOnce(prevState)
        .mockReturnValueOnce(newState);

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackPetInteraction).toHaveBeenCalledWith(
        'pet-123',
        'unfavorite',
        {
          previousState: true,
          newState: false,
        }
      );
    });
  });

  describe('Adoption Workflow Tracking', () => {
    it('tracks adoption application start with timing', async () => {
      const action = {
        type: 'pets/startAdoptionApplication',
        payload: { petId: 'pet-123', petName: 'Buddy' },
      };

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackAdoptionFunnelStep).toHaveBeenCalledWith(
        'pet-123',
        'application_start',
        {
          currentStep: 1,
          totalSteps: 5,
          completionPercentage: 0,
          timeSpent: 0,
          stepName: 'Personal Information',
        }
      );
    });

    it('tracks form updates with completion tracking', async () => {
      const action = {
        type: 'pets/updateApplicationDraft',
        payload: {
          draftId: 'draft-123',
          formData: { personalInfo: { firstName: 'John' } },
          step: 2,
        },
      };

      const newState = createMockState({
        pets: {
          drafts: {
            'draft-123': {
              id: 'draft-123',
              completionPercentage: 40,
            },
          },
        } as any,
      });

      store.getState
        .mockReturnValueOnce(createMockState())
        .mockReturnValueOnce(newState);

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackFormAction).toHaveBeenCalledWith(
        'adoption_application',
        'draft-123',
        'field_blur',
        {
          stepNumber: 2,
          completionPercentage: 40,
          formData: { personalInfo: { firstName: 'John' } },
        }
      );
    });

    it('tracks step navigation with timing context', async () => {
      const action = {
        type: 'pets/nextApplicationStep',
        payload: { petId: 'pet-123' },
      };

      const newState = createMockState({
        pets: {
          currentApplication: {
            petId: 'pet-123',
            step: 3,
            status: 'draft',
          },
        } as any,
      });

      store.getState
        .mockReturnValueOnce(createMockState())
        .mockReturnValueOnce(newState);

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackAdoptionFunnelStep).toHaveBeenCalledWith(
        'pet-123',
        'application_step',
        {
          currentStep: 3,
          totalSteps: 5,
          completionPercentage: 60, // (3/5) * 100
          timeSpent: expect.any(Number),
          stepName: 'Experience & References',
        }
      );
    });

    it('tracks application completion with total time', async () => {
      const action = {
        type: 'pets/completeApplication',
        payload: { petId: 'pet-123', applicationId: 'app-456' },
      };

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackAdoptionFunnelStep).toHaveBeenCalledWith(
        'pet-123',
        'application_submit',
        {
          currentStep: 5,
          totalSteps: 5,
          completionPercentage: 100,
          timeSpent: expect.any(Number),
          stepName: 'Application Submitted',
        }
      );
    });
  });

  describe('Search Analytics Tracking', () => {
    it('tracks search filter updates', async () => {
      const action = {
        type: 'pets/updateSearchFilters',
        payload: { species: 'dog', age: 'young' },
      };

      const newState = createMockState({
        pets: {
          searchFilters: { species: 'dog', age: 'young' },
        } as any,
      });

      store.getState
        .mockReturnValueOnce(createMockState())
        .mockReturnValueOnce(newState);

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Filter updates are tracked in context but search isn't called until query execution
      // This verifies the context is stored correctly
      expect(mockAnalyticsService.trackSearch).not.toHaveBeenCalled();
    });

    it('tracks search queries with simplified analytics', async () => {
      const action = {
        type: 'pets/addRecentSearch',
        payload: 'Golden Retriever puppies',
      };

      const newState = createMockState({
        pets: {
          searchFilters: { species: 'dog', breed: 'Golden Retriever' },
        } as any,
      });

      store.getState
        .mockReturnValueOnce(createMockState())
        .mockReturnValueOnce(newState);

      middleware(action);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackSearch).toHaveBeenCalledWith(
        { species: 'dog', breed: 'Golden Retriever' },
        0, // Results count placeholder
        0, // Search time placeholder
        {
          query: 'Golden Retriever puppies',
        }
      );
    });
  });

  describe('Context Management', () => {
    it('maintains timing context across multiple actions', async () => {
      const startAction = {
        type: 'pets/startAdoptionApplication',
        payload: { petId: 'pet-123', petName: 'Buddy' },
      };

      const stepAction = {
        type: 'pets/nextApplicationStep',
        payload: { petId: 'pet-123' },
      };

      const completeAction = {
        type: 'pets/completeApplication',
        payload: { petId: 'pet-123', applicationId: 'app-456' },
      };

      // Start application
      middleware(startAction);
      jest.advanceTimersByTime(5000); // 5 second delay

      // Navigate step
      store.getState.mockReturnValue(createMockState({
        pets: {
          currentApplication: { petId: 'pet-123', step: 2 },
        } as any,
      }));

      middleware(stepAction);
      jest.advanceTimersByTime(10000); // 10 more seconds

      // Complete application
      middleware(completeAction);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify timing context is maintained
      expect(mockAnalyticsService.trackAdoptionFunnelStep).toHaveBeenCalledWith(
        'pet-123',
        'application_submit',
        expect.objectContaining({
          timeSpent: expect.any(Number),
        })
      );
    });

    it('handles form state context correctly', async () => {
      const firstUpdate = {
        type: 'pets/updateApplicationDraft',
        payload: {
          draftId: 'draft-123',
          formData: { personalInfo: { firstName: 'John' } },
          step: 1,
        },
      };

      const secondUpdate = {
        type: 'pets/updateApplicationDraft',
        payload: {
          draftId: 'draft-123',
          formData: { personalInfo: { firstName: 'John', lastName: 'Doe' } },
          step: 1,
        },
      };

      const mockDraft = {
        id: 'draft-123',
        completionPercentage: 25,
      };

      store.getState.mockReturnValue(createMockState({
        pets: { drafts: { 'draft-123': mockDraft } } as any,
      }));

      // First update
      middleware(firstUpdate);
      jest.advanceTimersByTime(2000);

      // Second update
      middleware(secondUpdate);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackFormAction).toHaveBeenCalledTimes(2);
    });

    it('cleans up timing context after completion', async () => {
      const startAction = {
        type: 'pets/startAdoptionApplication',
        payload: { petId: 'pet-123', petName: 'Buddy' },
      };

      const completeAction = {
        type: 'pets/completeApplication',
        payload: { petId: 'pet-123', applicationId: 'app-456' },
      };

      // Start and complete application
      middleware(startAction);
      middleware(completeAction);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Try to navigate step after completion (context should be cleaned)
      const laterStepAction = {
        type: 'pets/nextApplicationStep',
        payload: { petId: 'pet-123' },
      };

      store.getState.mockReturnValue(createMockState({
        pets: {
          currentApplication: { petId: 'pet-123', step: 3 },
        } as any,
      }));

      middleware(laterStepAction);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should track step but with fresh timing context
      expect(mockAnalyticsService.trackAdoptionFunnelStep).toHaveBeenCalledWith(
        'pet-123',
        'application_step',
        expect.objectContaining({
          timeSpent: expect.any(Number),
        })
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('handles analytics service errors gracefully', async () => {
      mockAnalyticsService.trackPetView.mockRejectedValueOnce(new Error('Analytics service error'));

      const action = {
        type: 'pets/setSelectedPet',
        payload: { id: 'pet-123', name: 'Buddy' },
      };

      expect(() => {
        middleware(action);
      }).not.toThrow();

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith(
        'Analytics tracking error:',
        expect.any(Error)
      );
    });

    it('handles missing payload data gracefully', async () => {
      const action = {
        type: 'pets/setSelectedPet',
        payload: null,
      };

      expect(() => {
        middleware(action);
      }).not.toThrow();

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackPetView).not.toHaveBeenCalled();
    });

    it('handles missing draft data gracefully', async () => {
      const action = {
        type: 'pets/updateApplicationDraft',
        payload: {
          draftId: 'draft-999',
          formData: { personalInfo: { firstName: 'John' } },
          step: 1,
        },
      };

      const stateWithoutDraft = createMockState({
        pets: { drafts: {} } as any,
      });

      store.getState.mockReturnValue(stateWithoutDraft);

      expect(() => {
        middleware(action);
      }).not.toThrow();

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackFormAction).not.toHaveBeenCalled();
    });

    it('continues processing other actions after errors', async () => {
      mockAnalyticsService.trackPetView.mockRejectedValueOnce(new Error('First error'));
      mockAnalyticsService.trackPetInteraction.mockResolvedValueOnce();

      const firstAction = {
        type: 'pets/setSelectedPet',
        payload: { id: 'pet-123', name: 'Buddy' },
      };

      const secondAction = {
        type: 'pets/addFavoriteOptimistic',
        payload: { petId: 'pet-456' },
      };

      store.getState.mockReturnValue(createMockState({
        pets: {
          favorites: [{ petId: 'pet-456', userId: 'user-123' }],
        } as any,
      }));

      middleware(firstAction);
      middleware(secondAction);

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAnalyticsService.trackPetInteraction).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Action Pass-Through', () => {
    it('passes all actions through to next middleware', () => {
      const trackedAction = {
        type: 'pets/setSelectedPet',
        payload: { id: 'pet-123' },
      };

      const untrackedAction = {
        type: 'auth/loginSuccess',
        payload: { user: { id: 'user-123' } },
      };

      const result1 = middleware(trackedAction);
      const result2 = middleware(untrackedAction);

      expect(next).toHaveBeenCalledWith(trackedAction);
      expect(next).toHaveBeenCalledWith(untrackedAction);
      expect(result1).toBe(trackedAction);
      expect(result2).toBe(untrackedAction);
    });

    it('does not interfere with action processing', () => {
      const action = {
        type: 'pets/setSelectedPet',
        payload: { id: 'pet-123' },
      };

      // Mock an error in analytics
      mockAnalyticsService.trackPetView.mockRejectedValueOnce(new Error('Analytics error'));

      const result = middleware(action);

      // Action should still be processed normally
      expect(next).toHaveBeenCalledWith(action);
      expect(result).toBe(action);
    });
  });

  describe('Performance Considerations', () => {
    it('uses setTimeout to avoid blocking the main thread', () => {
      const action = {
        type: 'pets/setSelectedPet',
        payload: { id: 'pet-123', name: 'Buddy' },
      };

      middleware(action);

      // Analytics should not be called synchronously
      expect(mockAnalyticsService.trackPetView).not.toHaveBeenCalled();

      // Should be called after setTimeout
      jest.advanceTimersByTime(0);
      expect(mockAnalyticsService.trackPetView).toHaveBeenCalled();
    });

    it('handles rapid sequential actions efficiently', async () => {
      const actions = Array.from({ length: 100 }, (_, i) => ({
        type: 'pets/updateApplicationDraft',
        payload: {
          draftId: 'draft-123',
          formData: { personalInfo: { firstName: `Name${i}` } },
          step: 1,
        },
      }));

      const mockDraft = {
        id: 'draft-123',
        completionPercentage: 50,
      };

      store.getState.mockReturnValue(createMockState({
        pets: { drafts: { 'draft-123': mockDraft } } as any,
      }));

      // Process all actions rapidly
      actions.forEach(action => middleware(action));

      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should handle all actions without issues
      expect(mockAnalyticsService.trackFormAction).toHaveBeenCalledTimes(100);
    });
  });
});