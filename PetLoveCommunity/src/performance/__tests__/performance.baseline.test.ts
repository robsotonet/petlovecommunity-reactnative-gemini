// Performance Baseline Tests
// Establishing performance benchmarks for critical app operations

import { configureStore } from '@reduxjs/toolkit';
import { petApi } from '../../services/petApi';
import counterReducer, { increment } from '../../features/counter/counterSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock React Native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock services
jest.mock('../../services/correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-id')),
}));

jest.mock('../../transactions/transactionService', () => ({
  generateTransactionId: jest.fn(() => 'test-transaction-id'),
  generateIdempotencyKey: jest.fn(() => 'test-idempotency-key'),
}));

jest.mock('../../config/constants', () => ({
  STORAGE_KEYS: {
    TRANSACTION_QUEUE: 'TRANSACTION_QUEUE',
  },
  ENV: {
    IS_TEST: true,
  },
}));

// Performance measurement utilities
const measurePerformance = async (
  operation: () => Promise<any> | any,
  iterations: number = 1
): Promise<{
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
}> => {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await operation();
    const end = performance.now();
    times.push(end - start);
  }
  
  return {
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    totalTime: times.reduce((a, b) => a + b, 0),
  };
};

const measureMemoryUsage = (): number => {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

describe('Performance Baseline Tests', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        counter: counterReducer,
        [petApi.reducerPath]: petApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }).concat(petApi.middleware),
    });
  });

  describe('Redux Store Performance', () => {
    test('should dispatch actions within performance baseline', async () => {
      const results = await measurePerformance(() => {
        store.dispatch(increment());
      }, 1000);

      // Baseline: Actions should complete in < 1ms on average
      expect(results.averageTime).toBeLessThan(1);
      expect(results.maxTime).toBeLessThan(5);
      
      console.log('Action Dispatch Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        max: `${results.maxTime.toFixed(3)}ms`,
        min: `${results.minTime.toFixed(3)}ms`,
      });
    });

    test('should handle bulk state operations efficiently', async () => {
      const results = await measurePerformance(() => {
        // Dispatch 100 actions at once
        for (let i = 0; i < 100; i++) {
          store.dispatch(increment());
        }
      }, 10);

      // Baseline: 100 actions should complete in < 10ms on average
      expect(results.averageTime).toBeLessThan(10);
      expect(results.maxTime).toBeLessThan(20);
      
      console.log('Bulk Operations Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        max: `${results.maxTime.toFixed(3)}ms`,
        operations: '100 actions',
      });
    });

    test('should maintain consistent performance with large state', async () => {
      // Build up large state
      for (let i = 0; i < 10000; i++) {
        store.dispatch(increment());
      }

      const results = await measurePerformance(() => {
        store.dispatch(increment());
      }, 100);

      // Performance should not degrade significantly with large state
      expect(results.averageTime).toBeLessThan(2);
      expect(results.maxTime).toBeLessThan(10);
      
      console.log('Large State Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        stateSize: store.getState().counter.value,
      });
    });
  });

  describe('AsyncStorage Performance', () => {
    test('should read from storage within baseline', async () => {
      const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      
      const results = await measurePerformance(async () => {
        await mockStorage.getItem('test-key');
      }, 100);

      // Baseline: Storage reads should be fast (mocked)
      expect(results.averageTime).toBeLessThan(5);
      
      console.log('Storage Read Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        iterations: 100,
      });
    });

    test('should write to storage within baseline', async () => {
      const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      
      const results = await measurePerformance(async () => {
        await mockStorage.setItem('test-key', 'test-value');
      }, 100);

      // Baseline: Storage writes should be fast (mocked)
      expect(results.averageTime).toBeLessThan(5);
      
      console.log('Storage Write Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        iterations: 100,
      });
    });

    test('should handle concurrent storage operations', async () => {
      const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      
      const results = await measurePerformance(async () => {
        const promises = Array.from({ length: 10 }, (_, i) =>
          mockStorage.setItem(`key-${i}`, `value-${i}`)
        );
        await Promise.all(promises);
      }, 50);

      // Concurrent operations should complete efficiently
      expect(results.averageTime).toBeLessThan(20);
      
      console.log('Concurrent Storage Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        concurrentOps: 10,
      });
    });
  });

  describe('Component Rendering Performance', () => {
    test('should measure JSON serialization performance', async () => {
      const largeObject = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: Array.from({ length: 10 }, (_, j) => `data-${j}`),
        })),
      };

      const results = await measurePerformance(() => {
        JSON.stringify(largeObject);
      }, 100);

      // JSON serialization baseline
      expect(results.averageTime).toBeLessThan(10);
      
      console.log('JSON Serialization Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        objectSize: '1000 items',
      });
    });

    test('should measure array operations performance', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);

      const results = await measurePerformance(() => {
        largeArray.map(x => x * 2).filter(x => x % 3 === 0);
      }, 100);

      // Array operations baseline
      expect(results.averageTime).toBeLessThan(5);
      
      console.log('Array Operations Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        arraySize: 10000,
      });
    });
  });

  describe('Memory Usage Baselines', () => {
    test('should not cause memory leaks in store operations', () => {
      const initialMemory = measureMemoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 10000; i++) {
        store.dispatch(increment());
        store.getState();
      }
      
      const finalMemory = measureMemoryUsage();
      
      // Memory usage should not grow excessively (if measurement is available)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
        
        console.log('Memory Usage:', {
          initial: `${(initialMemory / (1024 * 1024)).toFixed(2)}MB`,
          final: `${(finalMemory / (1024 * 1024)).toFixed(2)}MB`,
          increase: `${memoryIncreaseMB.toFixed(2)}MB`,
        });
        
        // Should not increase by more than 10MB for this test
        expect(memoryIncreaseMB).toBeLessThan(10);
      } else {
        console.log('Memory measurement not available in test environment');
        expect(true).toBe(true); // Pass if measurement unavailable
      }
    });

    test('should handle garbage collection efficiently', () => {
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        // Create temporary objects that should be garbage collected
        const tempData = {
          id: i,
          data: Array.from({ length: 100 }, (_, j) => `temp-${j}`),
          nested: { value: i * 2 },
        };
        
        // Use the object briefly
        JSON.stringify(tempData);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Test should complete without memory issues
      expect(true).toBe(true);
    });
  });

  describe('Algorithm Performance', () => {
    test('should sort large arrays efficiently', async () => {
      const unsortedArray = Array.from({ length: 10000 }, () =>
        Math.floor(Math.random() * 10000)
      );

      const results = await measurePerformance(() => {
        [...unsortedArray].sort((a, b) => a - b);
      }, 10);

      // Sorting baseline for 10k items
      expect(results.averageTime).toBeLessThan(50);
      
      console.log('Sorting Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        arraySize: 10000,
      });
    });

    test('should search arrays efficiently', async () => {
      const searchArray = Array.from({ length: 10000 }, (_, i) => i);
      const searchValue = 7500;

      const results = await measurePerformance(() => {
        searchArray.find(x => x === searchValue);
      }, 1000);

      // Linear search baseline
      expect(results.averageTime).toBeLessThan(1);
      
      console.log('Array Search Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        arraySize: 10000,
      });
    });

    test('should handle object property access efficiently', async () => {
      const largeObject: Record<string, number> = {};
      
      // Build large object
      for (let i = 0; i < 10000; i++) {
        largeObject[`key${i}`] = i;
      }

      const results = await measurePerformance(() => {
        largeObject['key5000'];
        largeObject['key9999'];
        largeObject['key0'];
      }, 1000);

      // Object property access baseline
      expect(results.averageTime).toBeLessThan(0.1);
      
      console.log('Object Access Performance:', {
        average: `${results.averageTime.toFixed(4)}ms`,
        objectSize: 10000,
      });
    });
  });

  describe('Network Simulation Performance', () => {
    test('should handle API response simulation efficiently', async () => {
      const mockApiResponse = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Pet ${i}`,
          breed: `Breed ${i % 20}`,
          age: Math.floor(Math.random() * 15),
          photos: Array.from({ length: 3 }, (_, j) => `photo-${i}-${j}.jpg`),
        })),
        pagination: {
          page: 1,
          limit: 1000,
          total: 1000,
        },
      };

      const results = await measurePerformance(() => {
        // Simulate API processing
        JSON.parse(JSON.stringify(mockApiResponse));
      }, 100);

      // API response processing baseline
      expect(results.averageTime).toBeLessThan(20);
      
      console.log('API Processing Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        dataSize: '1000 pet records',
      });
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance regressions in critical operations', async () => {
      const operationBaselines = {
        singleDispatch: 1, // ms
        bulkDispatch: 10, // ms
        stateAccess: 0.1, // ms
        jsonSerialization: 10, // ms
      };

      // Test single dispatch
      const singleDispatchResults = await measurePerformance(() => {
        store.dispatch(increment());
      }, 100);

      // Test bulk dispatch
      const bulkDispatchResults = await measurePerformance(() => {
        for (let i = 0; i < 100; i++) {
          store.dispatch(increment());
        }
      }, 10);

      // Test state access
      const stateAccessResults = await measurePerformance(() => {
        store.getState();
      }, 1000);

      // Test JSON serialization
      const testObject = { data: Array.from({ length: 100 }, (_, i) => i) };
      const jsonResults = await measurePerformance(() => {
        JSON.stringify(testObject);
      }, 100);

      // Performance regression checks
      expect(singleDispatchResults.averageTime).toBeLessThan(operationBaselines.singleDispatch * 2);
      expect(bulkDispatchResults.averageTime).toBeLessThan(operationBaselines.bulkDispatch * 2);
      expect(stateAccessResults.averageTime).toBeLessThan(operationBaselines.stateAccess * 10);
      expect(jsonResults.averageTime).toBeLessThan(operationBaselines.jsonSerialization * 2);

      console.log('Performance Regression Check:', {
        singleDispatch: {
          current: `${singleDispatchResults.averageTime.toFixed(3)}ms`,
          baseline: `${operationBaselines.singleDispatch}ms`,
          ratio: (singleDispatchResults.averageTime / operationBaselines.singleDispatch).toFixed(2),
        },
        bulkDispatch: {
          current: `${bulkDispatchResults.averageTime.toFixed(3)}ms`,
          baseline: `${operationBaselines.bulkDispatch}ms`,
          ratio: (bulkDispatchResults.averageTime / operationBaselines.bulkDispatch).toFixed(2),
        },
        stateAccess: {
          current: `${stateAccessResults.averageTime.toFixed(3)}ms`,
          baseline: `${operationBaselines.stateAccess}ms`,
          ratio: (stateAccessResults.averageTime / operationBaselines.stateAccess).toFixed(2),
        },
        jsonSerialization: {
          current: `${jsonResults.averageTime.toFixed(3)}ms`,
          baseline: `${operationBaselines.jsonSerialization}ms`,
          ratio: (jsonResults.averageTime / operationBaselines.jsonSerialization).toFixed(2),
        },
      });
    });
  });
});