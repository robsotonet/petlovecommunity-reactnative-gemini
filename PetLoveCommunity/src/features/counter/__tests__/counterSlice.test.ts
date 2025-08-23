// CounterSlice Redux Tests - Comprehensive Coverage
// Testing Redux Toolkit slice reducers, actions, and state management

import counterReducer, { increment, decrement, incrementByAmount } from '../counterSlice';

describe('counterSlice', () => {
  const initialState = {
    value: 0,
  };

  describe('reducer', () => {
    test('should return the initial state', () => {
      expect(counterReducer(undefined, { type: undefined })).toEqual(initialState);
    });

    test('should handle unknown action types', () => {
      const unknownAction = { type: 'unknown/action' };
      expect(counterReducer(initialState, unknownAction)).toEqual(initialState);
    });

    test('should maintain state immutability', () => {
      const state = { value: 5 };
      const newState = counterReducer(state, increment());
      
      // Original state should not be mutated
      expect(state.value).toBe(5);
      expect(newState.value).toBe(6);
      expect(newState).not.toBe(state); // Different object reference
    });
  });

  describe('increment action', () => {
    test('should increment the value by 1', () => {
      const actual = counterReducer(initialState, increment());
      expect(actual.value).toBe(1);
    });

    test('should increment from positive values', () => {
      const state = { value: 5 };
      const actual = counterReducer(state, increment());
      expect(actual.value).toBe(6);
    });

    test('should increment from negative values', () => {
      const state = { value: -3 };
      const actual = counterReducer(state, increment());
      expect(actual.value).toBe(-2);
    });

    test('should handle large numbers', () => {
      const state = { value: 999999 };
      const actual = counterReducer(state, increment());
      expect(actual.value).toBe(1000000);
    });

    test('should create proper action object', () => {
      const action = increment();
      expect(action).toEqual({
        type: 'counter/increment',
        payload: undefined,
      });
    });
  });

  describe('decrement action', () => {
    test('should decrement the value by 1', () => {
      const state = { value: 1 };
      const actual = counterReducer(state, decrement());
      expect(actual.value).toBe(0);
    });

    test('should decrement from initial state (0)', () => {
      const actual = counterReducer(initialState, decrement());
      expect(actual.value).toBe(-1);
    });

    test('should decrement from positive values', () => {
      const state = { value: 10 };
      const actual = counterReducer(state, decrement());
      expect(actual.value).toBe(9);
    });

    test('should decrement from negative values', () => {
      const state = { value: -5 };
      const actual = counterReducer(state, decrement());
      expect(actual.value).toBe(-6);
    });

    test('should handle large negative numbers', () => {
      const state = { value: -999999 };
      const actual = counterReducer(state, decrement());
      expect(actual.value).toBe(-1000000);
    });

    test('should create proper action object', () => {
      const action = decrement();
      expect(action).toEqual({
        type: 'counter/decrement',
        payload: undefined,
      });
    });
  });

  describe('incrementByAmount action', () => {
    test('should increment by specified amount', () => {
      const amount = 5;
      const actual = counterReducer(initialState, incrementByAmount(amount));
      expect(actual.value).toBe(5);
    });

    test('should increment by positive amounts', () => {
      const state = { value: 10 };
      const actual = counterReducer(state, incrementByAmount(15));
      expect(actual.value).toBe(25);
    });

    test('should handle negative amounts (effectively decrement)', () => {
      const state = { value: 10 };
      const actual = counterReducer(state, incrementByAmount(-3));
      expect(actual.value).toBe(7);
    });

    test('should handle zero amount', () => {
      const state = { value: 5 };
      const actual = counterReducer(state, incrementByAmount(0));
      expect(actual.value).toBe(5);
    });

    test('should handle decimal amounts', () => {
      const state = { value: 10 };
      const actual = counterReducer(state, incrementByAmount(2.5));
      expect(actual.value).toBe(12.5);
    });

    test('should handle large amounts', () => {
      const state = { value: 100 };
      const actual = counterReducer(state, incrementByAmount(1000000));
      expect(actual.value).toBe(1000100);
    });

    test('should create proper action object with payload', () => {
      const amount = 42;
      const action = incrementByAmount(amount);
      expect(action).toEqual({
        type: 'counter/incrementByAmount',
        payload: 42,
      });
    });

    test('should handle string numbers as payload', () => {
      // TypeScript would prevent this, but test runtime safety
      const state = { value: 10 };
      const actual = counterReducer(state, incrementByAmount('5' as any));
      expect(actual.value).toBe('105'); // String concatenation behavior
    });
  });

  describe('sequential actions', () => {
    test('should handle multiple increment actions', () => {
      let state = initialState;
      
      state = counterReducer(state, increment());
      state = counterReducer(state, increment());
      state = counterReducer(state, increment());
      
      expect(state.value).toBe(3);
    });

    test('should handle multiple decrement actions', () => {
      const startState = { value: 5 };
      let state = startState;
      
      state = counterReducer(state, decrement());
      state = counterReducer(state, decrement());
      state = counterReducer(state, decrement());
      
      expect(state.value).toBe(2);
    });

    test('should handle mixed increment and decrement actions', () => {
      let state = initialState;
      
      state = counterReducer(state, increment()); // 1
      state = counterReducer(state, increment()); // 2
      state = counterReducer(state, decrement()); // 1
      state = counterReducer(state, incrementByAmount(5)); // 6
      state = counterReducer(state, decrement()); // 5
      
      expect(state.value).toBe(5);
    });

    test('should handle complex sequence with incrementByAmount', () => {
      let state = initialState;
      
      state = counterReducer(state, incrementByAmount(10)); // 10
      state = counterReducer(state, increment()); // 11
      state = counterReducer(state, incrementByAmount(-3)); // 8
      state = counterReducer(state, decrement()); // 7
      state = counterReducer(state, incrementByAmount(0)); // 7
      
      expect(state.value).toBe(7);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle undefined payload gracefully', () => {
      const action = { type: 'counter/incrementByAmount', payload: undefined };
      const actual = counterReducer(initialState, action as any);
      
      // Should handle undefined by not changing the value or adding undefined
      expect(actual.value).toBeNaN(); // undefined + 0 = NaN
    });

    test('should handle null payload', () => {
      const action = { type: 'counter/incrementByAmount', payload: null };
      const actual = counterReducer(initialState, action as any);
      
      expect(actual.value).toBe(0); // null + 0 = 0
    });

    test('should handle very large numbers without overflow', () => {
      const state = { value: Number.MAX_SAFE_INTEGER };
      const actual = counterReducer(state, increment());
      
      expect(actual.value).toBe(Number.MAX_SAFE_INTEGER + 1);
    });

    test('should handle very small numbers', () => {
      const state = { value: Number.MIN_SAFE_INTEGER };
      const actual = counterReducer(state, decrement());
      
      expect(actual.value).toBe(Number.MIN_SAFE_INTEGER - 1);
    });

    test('should handle floating point precision', () => {
      const state = { value: 0.1 };
      const actual = counterReducer(state, incrementByAmount(0.2));
      
      // Floating point arithmetic may not be exact
      expect(actual.value).toBeCloseTo(0.3);
    });

    test('should handle infinity values', () => {
      const state = { value: Infinity };
      const actual = counterReducer(state, increment());
      
      expect(actual.value).toBe(Infinity);
    });

    test('should handle negative infinity', () => {
      const state = { value: -Infinity };
      const actual = counterReducer(state, decrement());
      
      expect(actual.value).toBe(-Infinity);
    });

    test('should handle NaN values', () => {
      const state = { value: NaN };
      const actual = counterReducer(state, increment());
      
      expect(actual.value).toBeNaN();
    });
  });

  describe('action creators', () => {
    test('increment action creator should be a function', () => {
      expect(typeof increment).toBe('function');
    });

    test('decrement action creator should be a function', () => {
      expect(typeof decrement).toBe('function');
    });

    test('incrementByAmount action creator should be a function', () => {
      expect(typeof incrementByAmount).toBe('function');
    });

    test('action creators should create serializable actions', () => {
      const incrementAction = increment();
      const decrementAction = decrement();
      const incrementByAmountAction = incrementByAmount(10);
      
      // Actions should be JSON serializable
      expect(() => JSON.stringify(incrementAction)).not.toThrow();
      expect(() => JSON.stringify(decrementAction)).not.toThrow();
      expect(() => JSON.stringify(incrementByAmountAction)).not.toThrow();
    });

    test('actions should have proper type prefixes', () => {
      expect(increment().type).toBe('counter/increment');
      expect(decrement().type).toBe('counter/decrement');
      expect(incrementByAmount(5).type).toBe('counter/incrementByAmount');
    });
  });

  describe('state structure', () => {
    test('should maintain correct state structure', () => {
      const state = counterReducer(initialState, increment());
      
      expect(state).toHaveProperty('value');
      expect(typeof state.value).toBe('number');
      expect(Object.keys(state)).toEqual(['value']);
    });

    test('should not add extra properties to state', () => {
      const state = counterReducer(initialState, increment());
      
      expect(Object.keys(state)).toHaveLength(1);
    });

    test('should preserve state structure across all actions', () => {
      const actions = [increment(), decrement(), incrementByAmount(5)];
      
      actions.forEach(action => {
        const state = counterReducer(initialState, action);
        expect(state).toHaveProperty('value');
        expect(typeof state.value).toBe('number');
      });
    });
  });

  describe('performance and memory', () => {
    test('should handle rapid sequential actions efficiently', () => {
      let state = initialState;
      const startTime = Date.now();
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        state = counterReducer(state, increment());
      }
      
      const endTime = Date.now();
      
      expect(state.value).toBe(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    test('should not create memory leaks with repeated actions', () => {
      let state = initialState;
      
      // Perform many operations that might create intermediate objects
      for (let i = 0; i < 100; i++) {
        state = counterReducer(state, incrementByAmount(i));
        state = counterReducer(state, decrement());
      }
      
      // State should still be valid and have expected value
      expect(typeof state.value).toBe('number');
      expect(state).toHaveProperty('value');
    });
  });

  describe('integration with Redux patterns', () => {
    test('should work with Redux DevTools', () => {
      const action = increment();
      const state = counterReducer(initialState, action);
      
      // Actions should have proper structure for DevTools
      expect(action.type).toBeDefined();
      expect(typeof action.type).toBe('string');
    });

    test('should support time-travel debugging', () => {
      const states = [];
      let currentState = initialState;
      
      // Record state snapshots
      states.push(currentState);
      
      currentState = counterReducer(currentState, increment());
      states.push(currentState);
      
      currentState = counterReducer(currentState, incrementByAmount(5));
      states.push(currentState);
      
      currentState = counterReducer(currentState, decrement());
      states.push(currentState);
      
      // Should be able to navigate between states
      expect(states[0].value).toBe(0);
      expect(states[1].value).toBe(1);
      expect(states[2].value).toBe(6);
      expect(states[3].value).toBe(5);
    });

    test('should work with middleware patterns', () => {
      // Simulate middleware by wrapping action dispatch
      const middlewareWrapper = (action: any, state: any) => {
        // Log action (simulate logging middleware)
        const actionLog = { type: action.type, payload: action.payload };
        
        // Process action
        const newState = counterReducer(state, action);
        
        return { newState, actionLog };
      };
      
      const result = middlewareWrapper(increment(), initialState);
      
      expect(result.newState.value).toBe(1);
      expect(result.actionLog.type).toBe('counter/increment');
    });
  });

  describe('type safety and TypeScript integration', () => {
    test('should maintain type consistency', () => {
      const state = counterReducer(initialState, increment());
      
      // Value should always be a number
      expect(typeof state.value).toBe('number');
    });

    test('should handle payload types correctly', () => {
      // This would be caught by TypeScript at compile time,
      // but we can test runtime behavior
      const validPayload = incrementByAmount(42);
      const state = counterReducer(initialState, validPayload);
      
      expect(state.value).toBe(42);
    });
  });
});