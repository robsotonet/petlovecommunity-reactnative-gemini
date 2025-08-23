// Component Integration Tests
// Testing how components work together with real data flow, events, and interactions

import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { petApi } from '../../services/petApi';
import counterReducer, { increment, decrement } from '../../features/counter/counterSlice';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';

// Mock React Native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: jest.fn(styles => styles),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  useColorScheme: jest.fn(() => 'light'),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock transaction service
jest.mock('../../transactions/transactionService', () => ({
  generateTransactionId: jest.fn(() => 'test-transaction-id'),
  generateIdempotencyKey: jest.fn(() => 'test-idempotency-key'),
}));

// Mock correlation service
jest.mock('../../services/correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-id')),
}));

// Mock constants
jest.mock('../../config/constants', () => ({
  COLORS: {
    PRIMARY: '#FF6B6B',
    SECONDARY: '#4ECDC4',
    BACKGROUND: '#F7FFF7',
    TEXT: '#1A535C',
  },
  STORAGE_KEYS: {
    TRANSACTION_QUEUE: 'TRANSACTION_QUEUE',
  },
}));

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      counter: counterReducer,
      [petApi.reducerPath]: petApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(petApi.middleware),
  });
};

describe('Component Integration Tests', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();
  });

  describe('Button and Redux Integration', () => {
    const CounterComponent = () => {
      const [count, setCount] = useState(0);

      return (
        <>
          <Card testID="counter-card">
            <Button
              title={`Count: ${count}`}
              onPress={() => setCount(prev => prev + 1)}
              testID="increment-button"
            />
            <Button
              title="Reset"
              onPress={() => setCount(0)}
              variant="secondary"
              testID="reset-button"
            />
          </Card>
        </>
      );
    };

    test('should integrate Button with Card component', () => {
      render(
        <Provider store={store}>
          <CounterComponent />
        </Provider>
      );

      expect(screen.getByTestID('counter-card')).toBeTruthy();
      expect(screen.getByTestID('increment-button')).toBeTruthy();
      expect(screen.getByTestID('reset-button')).toBeTruthy();
    });

    test('should handle component interactions correctly', () => {
      render(
        <Provider store={store}>
          <CounterComponent />
        </Provider>
      );

      const incrementButton = screen.getByTestID('increment-button');
      const resetButton = screen.getByTestID('reset-button');

      // Initial state
      expect(screen.getByText('Count: 0')).toBeTruthy();

      // Increment
      fireEvent.press(incrementButton);
      expect(screen.getByText('Count: 1')).toBeTruthy();

      fireEvent.press(incrementButton);
      expect(screen.getByText('Count: 2')).toBeTruthy();

      // Reset
      fireEvent.press(resetButton);
      expect(screen.getByText('Count: 0')).toBeTruthy();
    });
  });

  describe('Form Component Integration', () => {
    const FormComponent = () => {
      const [name, setName] = useState('');
      const [email, setEmail] = useState('');
      const [submitted, setSubmitted] = useState(false);

      const handleSubmit = () => {
        if (name && email) {
          setSubmitted(true);
        }
      };

      return (
        <Card testID="form-card">
          {!submitted ? (
            <>
              <Input
                placeholder="Enter name"
                value={name}
                onChangeText={setName}
                testID="name-input"
              />
              <Input
                placeholder="Enter email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                testID="email-input"
              />
              <Button
                title="Submit"
                onPress={handleSubmit}
                disabled={!name || !email}
                testID="submit-button"
              />
            </>
          ) : (
            <>
              <Card testID="success-card">
                <Button
                  title="Form Submitted Successfully!"
                  onPress={() => setSubmitted(false)}
                  variant="secondary"
                  testID="success-message"
                />
              </Card>
            </>
          )}
        </Card>
      );
    };

    test('should integrate Input and Button components in form', () => {
      render(
        <Provider store={store}>
          <FormComponent />
        </Provider>
      );

      expect(screen.getByTestID('form-card')).toBeTruthy();
      expect(screen.getByTestID('name-input')).toBeTruthy();
      expect(screen.getByTestID('email-input')).toBeTruthy();
      expect(screen.getByTestID('submit-button')).toBeTruthy();
    });

    test('should handle form validation and submission flow', () => {
      render(
        <Provider store={store}>
          <FormComponent />
        </Provider>
      );

      const nameInput = screen.getByTestID('name-input');
      const emailInput = screen.getByTestID('email-input');
      const submitButton = screen.getByTestID('submit-button');

      // Initially disabled due to empty fields
      expect(submitButton.props.disabled).toBe(true);

      // Enter name only
      fireEvent.changeText(nameInput, 'John Doe');
      expect(submitButton.props.disabled).toBe(true);

      // Enter email
      fireEvent.changeText(emailInput, 'john@example.com');
      expect(submitButton.props.disabled).toBe(false);

      // Submit form
      fireEvent.press(submitButton);
      
      expect(screen.getByTestID('success-card')).toBeTruthy();
      expect(screen.getByTestID('success-message')).toBeTruthy();
    });

    test('should handle form reset after submission', () => {
      render(
        <Provider store={store}>
          <FormComponent />
        </Provider>
      );

      const nameInput = screen.getByTestID('name-input');
      const emailInput = screen.getByTestID('email-input');
      const submitButton = screen.getByTestID('submit-button');

      // Fill and submit form
      fireEvent.changeText(nameInput, 'John Doe');
      fireEvent.changeText(emailInput, 'john@example.com');
      fireEvent.press(submitButton);

      // Should show success message
      expect(screen.getByTestID('success-message')).toBeTruthy();

      // Reset form
      const successMessage = screen.getByTestID('success-message');
      fireEvent.press(successMessage);

      // Should return to form view
      expect(screen.getByTestID('name-input')).toBeTruthy();
      expect(screen.getByTestID('email-input')).toBeTruthy();
    });
  });

  describe('Redux Connected Components', () => {
    const ReduxCounterComponent = () => {
      const count = store.getState().counter.value;

      return (
        <Card testID="redux-counter-card">
          <Button
            title={`Redux Count: ${count}`}
            onPress={() => store.dispatch(increment())}
            testID="redux-increment-button"
          />
          <Button
            title="Decrement"
            onPress={() => store.dispatch(decrement())}
            variant="secondary"
            testID="redux-decrement-button"
          />
        </Card>
      );
    };

    test('should integrate components with Redux store', () => {
      render(
        <Provider store={store}>
          <ReduxCounterComponent />
        </Provider>
      );

      expect(screen.getByTestID('redux-counter-card')).toBeTruthy();
      expect(screen.getByText('Redux Count: 0')).toBeTruthy();
    });

    test('should handle Redux actions through component interactions', () => {
      const TestWrapper = () => {
        const [, forceUpdate] = useState({});
        React.useEffect(() => {
          const unsubscribe = store.subscribe(() => forceUpdate({}));
          return unsubscribe;
        }, []);
        
        return <ReduxCounterComponent />;
      };

      render(
        <Provider store={store}>
          <TestWrapper />
        </Provider>
      );

      const incrementButton = screen.getByTestID('redux-increment-button');
      const decrementButton = screen.getByTestID('redux-decrement-button');

      // Test increment
      fireEvent.press(incrementButton);
      expect(store.getState().counter.value).toBe(1);

      fireEvent.press(incrementButton);
      expect(store.getState().counter.value).toBe(2);

      // Test decrement
      fireEvent.press(decrementButton);
      expect(store.getState().counter.value).toBe(1);
    });
  });

  describe('Component Composition', () => {
    const ComposedComponent = () => {
      const [items, setItems] = useState<string[]>([]);
      const [inputValue, setInputValue] = useState('');

      const addItem = () => {
        if (inputValue.trim()) {
          setItems(prev => [...prev, inputValue.trim()]);
          setInputValue('');
        }
      };

      const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
      };

      return (
        <Card testID="composed-component">
          <Input
            placeholder="Add item"
            value={inputValue}
            onChangeText={setInputValue}
            testID="item-input"
          />
          <Button
            title="Add Item"
            onPress={addItem}
            disabled={!inputValue.trim()}
            testID="add-button"
          />
          
          {items.map((item, index) => (
            <Card key={index} testID={`item-card-${index}`}>
              <Button
                title={`${item} (Remove)`}
                onPress={() => removeItem(index)}
                variant="secondary"
                testID={`remove-button-${index}`}
              />
            </Card>
          ))}
        </Card>
      );
    };

    test('should handle complex component composition', () => {
      render(
        <Provider store={store}>
          <ComposedComponent />
        </Provider>
      );

      expect(screen.getByTestID('composed-component')).toBeTruthy();
      expect(screen.getByTestID('item-input')).toBeTruthy();
      expect(screen.getByTestID('add-button')).toBeTruthy();
    });

    test('should handle dynamic component creation and removal', () => {
      render(
        <Provider store={store}>
          <ComposedComponent />
        </Provider>
      );

      const input = screen.getByTestID('item-input');
      const addButton = screen.getByTestID('add-button');

      // Add first item
      fireEvent.changeText(input, 'First Item');
      fireEvent.press(addButton);

      expect(screen.getByTestID('item-card-0')).toBeTruthy();
      expect(screen.getByTestID('remove-button-0')).toBeTruthy();

      // Add second item
      fireEvent.changeText(input, 'Second Item');
      fireEvent.press(addButton);

      expect(screen.getByTestID('item-card-1')).toBeTruthy();
      expect(screen.getByTestID('remove-button-1')).toBeTruthy();

      // Remove first item
      const removeButton0 = screen.getByTestID('remove-button-0');
      fireEvent.press(removeButton0);

      // Only second item should remain, but now as index 0
      expect(screen.queryByTestId('item-card-1')).toBeNull();
      expect(screen.getByTestID('item-card-0')).toBeTruthy();
    });
  });

  describe('Event Propagation', () => {
    const EventPropagationComponent = () => {
      const [events, setEvents] = useState<string[]>([]);

      const addEvent = (event: string) => {
        setEvents(prev => [...prev, event]);
      };

      return (
        <Card testID="event-card" onPress={() => addEvent('Card pressed')}>
          <Button
            title="Button in Card"
            onPress={() => addEvent('Button pressed')}
            testID="nested-button"
          />
          <Input
            placeholder="Input in card"
            onFocus={() => addEvent('Input focused')}
            onBlur={() => addEvent('Input blurred')}
            testID="nested-input"
          />
          {events.map((event, index) => (
            <Button
              key={index}
              title={event}
              onPress={() => {}}
              variant="secondary"
              testID={`event-${index}`}
            />
          ))}
        </Card>
      );
    };

    test('should handle event propagation correctly', () => {
      render(
        <Provider store={store}>
          <EventPropagationComponent />
        </Provider>
      );

      const button = screen.getByTestID('nested-button');
      const input = screen.getByTestID('nested-input');

      // Test button press
      fireEvent.press(button);
      expect(screen.getByTestID('event-0')).toBeTruthy();

      // Test input focus/blur
      fireEvent(input, 'focus');
      expect(screen.getByTestID('event-1')).toBeTruthy();

      fireEvent(input, 'blur');
      expect(screen.getByTestID('event-2')).toBeTruthy();
    });
  });

  describe('Component State Synchronization', () => {
    const SyncedComponent = () => {
      const [sharedValue, setSharedValue] = useState('');

      return (
        <>
          <Card testID="card-1">
            <Input
              placeholder="Shared input 1"
              value={sharedValue}
              onChangeText={setSharedValue}
              testID="input-1"
            />
          </Card>
          <Card testID="card-2">
            <Input
              placeholder="Shared input 2"
              value={sharedValue}
              onChangeText={setSharedValue}
              testID="input-2"
            />
            <Button
              title={`Current value: ${sharedValue}`}
              onPress={() => {}}
              testID="display-button"
            />
          </Card>
        </>
      );
    };

    test('should synchronize state between components', () => {
      render(
        <Provider store={store}>
          <SyncedComponent />
        </Provider>
      );

      const input1 = screen.getByTestID('input-1');
      const input2 = screen.getByTestID('input-2');
      const displayButton = screen.getByTestID('display-button');

      // Change first input
      fireEvent.changeText(input1, 'Synchronized value');

      // Both inputs should have the same value
      expect(input1.props.value).toBe('Synchronized value');
      expect(input2.props.value).toBe('Synchronized value');
      expect(screen.getByText('Current value: Synchronized value')).toBeTruthy();

      // Change second input
      fireEvent.changeText(input2, 'Updated value');

      expect(input1.props.value).toBe('Updated value');
      expect(input2.props.value).toBe('Updated value');
      expect(screen.getByText('Current value: Updated value')).toBeTruthy();
    });
  });

  describe('Performance Integration', () => {
    const PerformanceComponent = () => {
      const [items, setItems] = useState<number[]>([]);

      const addManyItems = () => {
        const newItems = Array.from({ length: 100 }, (_, i) => i);
        setItems(prev => [...prev, ...newItems]);
      };

      const clearItems = () => {
        setItems([]);
      };

      return (
        <Card testID="performance-card">
          <Button
            title="Add 100 items"
            onPress={addManyItems}
            testID="add-many-button"
          />
          <Button
            title="Clear items"
            onPress={clearItems}
            variant="secondary"
            testID="clear-button"
          />
          {items.map(item => (
            <Button
              key={item}
              title={`Item ${item}`}
              onPress={() => {}}
              testID={`item-button-${item}`}
            />
          ))}
        </Card>
      );
    };

    test('should handle large component lists efficiently', () => {
      render(
        <Provider store={store}>
          <PerformanceComponent />
        </Provider>
      );

      const addButton = screen.getByTestID('add-many-button');
      const clearButton = screen.getByTestID('clear-button');

      const startTime = Date.now();

      // Add many items
      fireEvent.press(addButton);

      const endTime = Date.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(2000);

      // Clear items
      fireEvent.press(clearButton);

      // Should not find any item buttons after clearing
      expect(screen.queryByTestId('item-button-0')).toBeNull();
    });
  });

  describe('Error Boundary Integration', () => {
    const ErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
      if (shouldError) {
        throw new Error('Component error');
      }
      
      return (
        <Card testID="error-card">
          <Button
            title="Working component"
            onPress={() => {}}
            testID="working-button"
          />
        </Card>
      );
    };

    test('should handle component errors gracefully', () => {
      // Mock console.error to avoid test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const TestWrapper = ({ shouldError }: { shouldError: boolean }) => (
        <Provider store={store}>
          <ErrorComponent shouldError={shouldError} />
        </Provider>
      );

      // First render without error
      const { rerender } = render(<TestWrapper shouldError={false} />);
      expect(screen.getByTestID('working-button')).toBeTruthy();

      // Component should handle errors
      expect(() => rerender(<TestWrapper shouldError={true} />)).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility Integration', () => {
    const AccessibleComponent = () => {
      const [value, setValue] = useState('');
      const [submitted, setSubmitted] = useState(false);

      return (
        <Card 
          testID="accessible-card"
          accessibilityLabel="Accessible form container"
        >
          <Input
            placeholder="Accessible input"
            value={value}
            onChangeText={setValue}
            accessibilityLabel="Text input field"
            accessibilityHint="Enter your text here"
            testID="accessible-input"
          />
          <Button
            title="Submit"
            onPress={() => setSubmitted(true)}
            disabled={!value}
            accessibilityLabel="Submit button"
            accessibilityHint="Tap to submit the form"
            testID="accessible-button"
          />
          {submitted && (
            <Button
              title="Success!"
              onPress={() => {}}
              accessibilityLabel="Success message"
              accessibilityRole="text"
              testID="success-text"
            />
          )}
        </Card>
      );
    };

    test('should integrate accessibility features across components', () => {
      render(
        <Provider store={store}>
          <AccessibleComponent />
        </Provider>
      );

      const card = screen.getByTestID('accessible-card');
      const input = screen.getByTestID('accessible-input');
      const button = screen.getByTestID('accessible-button');

      expect(card.props.accessibilityLabel).toBe('Accessible form container');
      expect(input.props.accessibilityLabel).toBe('Text input field');
      expect(button.props.accessibilityLabel).toBe('Submit button');

      // Test interaction flow
      fireEvent.changeText(input, 'Test value');
      fireEvent.press(button);

      const successText = screen.getByTestID('success-text');
      expect(successText.props.accessibilityRole).toBe('text');
    });
  });
});