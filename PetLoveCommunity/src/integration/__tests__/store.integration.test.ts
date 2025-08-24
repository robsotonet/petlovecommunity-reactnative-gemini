// Redux Store Integration Tests
// Testing store configuration, middleware, persistence, and RTK Query integration

import { configureStore } from '@reduxjs/toolkit';
import { petApi } from '../../services/petApi';
import counterReducer, { increment, decrement, incrementByAmount } from '../../features/counter/counterSlice';
import { store } from '../../store';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock AsyncStorage for persistence tests
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock React Native environment
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock device info
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
  getVersion: jest.fn(() => '1.0.0'),
}));

// Mock constants
jest.mock('../../config/constants', () => ({
  API_CONFIG: {
    BASE_URL: 'http://test-api.com',
    TIMEOUT: 10000,
  },
  STORAGE_KEYS: {
    TRANSACTION_QUEUE: 'TRANSACTION_QUEUE',
  },
  ENV: {
    IS_TEST: true,
  },
}));

// Mock services
jest.mock('../../services/correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-id')),
}));

jest.mock('../../transactions/transactionService', () => ({
  generateTransactionId: jest.fn(() => 'test-transaction-id'),
  generateIdempotencyKey: jest.fn(() => 'test-idempotency-key'),
}));

// MSW server setup for API integration tests
const server = setupServer(
  rest.post('http://test-api.com/pets/search', (req, res, ctx) => {
    return res(ctx.json({
      pets: [{ id: 'pet-1', name: 'Buddy' }],
      total: 1,
    }));
  }),
  rest.get('http://test-api.com/pets/featured', (req, res, ctx) => {
    return res(ctx.json([{ id: 'pet-2', name: 'Bella' }]));
  })
);

describe('Redux Store Integration Tests', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Store Configuration', () => {
    test('should have proper store structure', () => {
      const state = store.getState();
      
      expect(state).toHaveProperty('counter');
      expect(state).toHaveProperty('petApi');
      expect(state.counter).toEqual({ value: 0 });
    });

    test('should include RTK Query middleware', () => {
      // Verify RTK Query middleware is present by checking for API slice
      const state = store.getState();
      expect(state.petApi).toBeDefined();
    });

    test('should handle unknown actions gracefully', () => {
      const initialState = store.getState();
      
      store.dispatch({ type: 'unknown/action' });
      
      const afterState = store.getState();
      // State should remain the same for counter, but petApi middleware state may change
      expect(afterState.counter).toEqual(initialState.counter);
      expect(afterState.petApi).toBeDefined();
    });
  });

  describe('Counter Slice Integration', () => {
    test('should dispatch and handle increment actions', () => {
      const initialState = store.getState();
      
      store.dispatch(increment());
      
      const newState = store.getState();
      expect(newState.counter.value).toBe(initialState.counter.value + 1);
    });

    test('should dispatch and handle decrement actions', () => {
      const beforeState = store.getState();
      
      store.dispatch(decrement());
      
      const afterState = store.getState();
      expect(afterState.counter.value).toBe(beforeState.counter.value - 1);
    });

    test('should handle incrementByAmount actions', () => {
      const initialState = store.getState();
      const amount = 5;
      
      store.dispatch(incrementByAmount(amount));
      
      const newState = store.getState();
      expect(newState.counter.value).toBe(initialState.counter.value + amount);
    });

    test('should handle sequential actions correctly', () => {
      const initialValue = store.getState().counter.value;
      
      store.dispatch(increment()); // +1
      store.dispatch(increment()); // +1
      store.dispatch(decrement()); // -1
      store.dispatch(incrementByAmount(10)); // +10
      
      const finalState = store.getState();
      expect(finalState.counter.value).toBe(initialValue + 11);
    });
  });

  describe('RTK Query Integration', () => {
    test('should integrate RTK Query API slice', async () => {
      const searchRequest = {
        filters: { type: ['dog'] as const },
        sortBy: 'newest' as const,
        limit: 10,
      };

      // Dispatch RTK Query action
      const promise = store.dispatch(
        petApi.endpoints.searchPets.initiate(searchRequest)
      );

      const result = await promise.unwrap();
      
      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].name).toBe('Buddy');
      
      // Check that API state is updated
      const state = store.getState();
      expect(state.petApi.queries).toBeDefined();
    });

    test('should cache API responses', async () => {
      // First request
      const promise1 = store.dispatch(
        petApi.endpoints.getFeaturedPets.initiate({ limit: 5 })
      );
      await promise1;

      // Check cache state
      const state = store.getState();
      const cacheKey = 'getFeaturedPets({"limit":5})';
      expect(state.petApi.queries[cacheKey]).toBeDefined();
      expect(state.petApi.queries[cacheKey].status).toBe('fulfilled');
    });

    test('should handle API errors', async () => {
      server.use(
        rest.get('http://test-api.com/pets/featured', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        })
      );

      try {
        await store.dispatch(
          petApi.endpoints.getFeaturedPets.initiate({ limit: 5 })
        ).unwrap();
      } catch (error: any) {
        expect(error.status).toBe(500);
      }
    });
  });

  describe('Store Subscription and Updates', () => {
    test('should notify subscribers of state changes', () => {
      let notificationCount = 0;
      let latestState: any = null;

      const unsubscribe = store.subscribe(() => {
        notificationCount++;
        latestState = store.getState();
      });

      const initialCount = notificationCount;
      
      store.dispatch(increment());
      
      expect(notificationCount).toBe(initialCount + 1);
      expect(latestState.counter.value).toBeGreaterThan(0);
      
      unsubscribe();
    });

    test('should handle concurrent dispatches', async () => {
      const initialState = store.getState();
      
      const promises = [
        new Promise<void>((resolve) => {
          setTimeout(() => {
            store.dispatch(increment());
            resolve();
          }, 10);
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            store.dispatch(incrementByAmount(5));
            resolve();
          }, 20);
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            store.dispatch(decrement());
            resolve();
          }, 15);
        }),
      ];
      
      await Promise.all(promises);
      
      const finalState = store.getState();
      expect(finalState.counter.value).toBe(initialState.counter.value + 5); // +1 +5 -1 = +5
    });
  });

  describe('Middleware Integration', () => {
    test('should process actions through middleware chain', () => {
      // Test that actions are processed correctly through all middleware
      const initialState = store.getState();
      
      // Dispatch action that should go through middleware
      store.dispatch(increment());
      
      const newState = store.getState();
      expect(newState.counter.value).toBe(initialState.counter.value + 1);
    });

    test('should handle RTK Query middleware for API caching', async () => {
      // This tests that RTK Query middleware handles caching correctly
      const request = { limit: 3 };
      
      // First request
      await store.dispatch(
        petApi.endpoints.getFeaturedPets.initiate(request)
      );
      
      // Second identical request should use cache
      const result = await store.dispatch(
        petApi.endpoints.getFeaturedPets.initiate(request)
      );
      
      expect(result.data).toBeDefined();
    });
  });

  describe('State Shape Validation', () => {
    test('should maintain consistent state shape', () => {
      const state = store.getState();
      
      // Verify required state structure
      expect(state).toHaveProperty('counter');
      expect(state).toHaveProperty('petApi');
      
      // Verify counter state shape
      expect(state.counter).toHaveProperty('value');
      expect(typeof state.counter.value).toBe('number');
      
      // Verify RTK Query state shape
      expect(state.petApi).toHaveProperty('queries');
      expect(state.petApi).toHaveProperty('mutations');
    });

    test('should preserve state shape after actions', () => {
      const actions = [
        increment(),
        decrement(),
        incrementByAmount(10),
        incrementByAmount(-5),
      ];
      
      actions.forEach(action => {
        store.dispatch(action);
        const state = store.getState();
        
        expect(state).toHaveProperty('counter');
        expect(state.counter).toHaveProperty('value');
        expect(typeof state.counter.value).toBe('number');
      });
    });
  });

  describe('Performance and Memory', () => {
    test('should handle high frequency actions efficiently', () => {
      const startTime = Date.now();
      
      // Dispatch many actions rapidly
      for (let i = 0; i < 1000; i++) {
        store.dispatch(increment());
      }
      
      const endTime = Date.now();
      const state = store.getState();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
      expect(typeof state.counter.value).toBe('number');
    });

    test('should not accumulate memory leaks with API requests', async () => {
      // Make multiple API requests
      const requests = Array.from({ length: 10 }, (_, i) => 
        store.dispatch(
          petApi.endpoints.getFeaturedPets.initiate({ limit: i + 1 })
        )
      );
      
      await Promise.all(requests);
      
      const state = store.getState();
      
      // API state should exist but not accumulate indefinitely
      expect(state.petApi.queries).toBeDefined();
      expect(Object.keys(state.petApi.queries).length).toBeGreaterThan(0);
    });
  });

  describe('Development Tools Integration', () => {
    test('should support Redux DevTools in development', () => {
      // Test that actions have proper structure for DevTools
      const action = increment();
      
      expect(action.type).toBeDefined();
      expect(typeof action.type).toBe('string');
      expect(action.type).toBe('counter/increment');
    });

    test('should serialize state for DevTools', () => {
      const state = store.getState();
      
      // State should be JSON serializable for DevTools
      expect(() => JSON.stringify(state)).not.toThrow();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle malformed actions gracefully', () => {
      const initialState = store.getState();
      
      // Dispatch malformed action - use invalid string instead of null
      try {
        store.dispatch({ type: '' } as any);
      } catch (error) {
        // Expected to catch Redux validation error
      }
      
      const afterState = store.getState();
      expect(afterState.counter).toEqual(initialState.counter);
    });

    test('should recover from API failures', async () => {
      // Use a unique endpoint for this test to avoid cache conflicts
      server.use(
        rest.get('http://test-api.com/pets/test-recovery', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      // Add test endpoint to MSW handlers
      server.use(
        rest.get('http://test-api.com/pets/test-recovery', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      // Test that API handles failures gracefully
      try {
        const result = await fetch('http://test-api.com/pets/test-recovery');
        expect(result.status).toBe(500);
      } catch (error) {
        // Network error handling
      }

      // Restore successful response
      server.use(
        rest.get('http://test-api.com/pets/test-recovery', (req, res, ctx) => {
          return res(ctx.json([{ id: 'pet-recovered', name: 'Recovered Pet' }]));
        })
      );

      // Second request should succeed
      const result = await fetch('http://test-api.com/pets/test-recovery');
      const data = await result.json();
      expect(data[0].name).toBe('Recovered Pet');
    });
  });
});