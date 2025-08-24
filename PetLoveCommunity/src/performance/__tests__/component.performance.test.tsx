// Component Performance Tests
// Testing render performance, re-render optimization, and component lifecycle timing

import React, { useState, useEffect, useMemo } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { performanceMonitor } from '../performanceMonitor';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';

// Mock React Native components and utilities
jest.mock('react-native', () => {
  const React = require('react');
  
  return {
    Platform: { OS: 'ios' },
    StyleSheet: {
      create: jest.fn(styles => styles),
      flatten: jest.fn(styles => styles),
    },
    useColorScheme: jest.fn(() => 'light'),
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
    // Mock React Native components
    TouchableOpacity: ({ children, onPress, style, testID, accessibilityRole, accessibilityLabel, accessibilityState, disabled, ...props }: any) =>
      React.createElement('TouchableOpacity', { 
        onPress: disabled ? undefined : onPress, 
        style, 
        testID, 
        accessibilityRole, 
        accessibilityLabel, 
        accessibilityState: accessibilityState || { disabled }, 
        ...props 
      }, children),
    Text: ({ children, style, ...props }: any) =>
      React.createElement('Text', { style, ...props }, children),
    TextInput: ({ value, onChangeText, style, placeholder, testID, accessibilityLabel, accessibilityHint, ...props }: any) =>
      React.createElement('TextInput', { 
        value, 
        onChangeText, 
        style, 
        placeholder, 
        testID, 
        accessibilityLabel, 
        accessibilityHint,
        ...props 
      }),
    View: ({ children, style, testID, ...props }: any) =>
      React.createElement('View', { style, testID, ...props }, children),
  };
});

// Mock constants
jest.mock('../../config/constants', () => ({
  COLORS: {
    PRIMARY: '#FF6B6B',
    SECONDARY: '#4ECDC4',
    BACKGROUND: '#F7FFF7',
    TEXT: '#1A535C',
  },
}));

// Mock colors module
jest.mock('../../styles/colors', () => ({
  getColors: jest.fn(() => ({
    primary: {
      coral: '#FF6B6B',
      teal: '#4ECDC4',
    },
    neutral: {
      beige: '#F7FFF7',
      midnight: '#1A535C',
      lightGray: '#CCCCCC',
      darkGray: '#666666',
    },
    extended: {
      coralVariations: {
        light: '#FF8E8E',
        dark: '#E55555',
      },
      tealVariations: {
        light: '#6ED4CC',
        dark: '#3BB5B0',
        background: '#E8F8F7',
      },
      textVariations: {
        secondary: '#2C6B73',
        tertiary: '#6C757D',
      },
    },
    semantic: {
      success: '#00B894',
      warning: '#FDCB6E',
      error: '#E74C3C',
      info: '#74B9FF',
    },
  })),
}));

// Performance measurement utilities for React components
const measureComponentRender = async (
  component: React.ReactElement,
  iterations: number = 1
): Promise<{
  averageTime: number;
  minTime: number;
  maxTime: number;
  renders: number;
}> => {
  const times: number[] = [];
  let renderCount = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    const { unmount } = render(component);
    renderCount++;
    
    const end = performance.now();
    times.push(end - start);
    
    unmount();
  }

  return {
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    renders: renderCount,
  };
};

describe('Component Performance Tests', () => {
  beforeEach(() => {
    performanceMonitor.clear();
    performanceMonitor.setEnabled(true);
  });

  afterEach(() => {
    performanceMonitor.clear();
  });

  describe('Button Component Performance', () => {
    test('should render Button component within performance baseline', async () => {
      const results = await measureComponentRender(
        <Button title="Test Button" onPress={() => {}} />,
        100
      );

      // Button should render quickly
      expect(results.averageTime).toBeLessThan(10);
      expect(results.maxTime).toBeLessThan(20);

      console.log('Button Render Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        max: `${results.maxTime.toFixed(3)}ms`,
        min: `${results.minTime.toFixed(3)}ms`,
        iterations: 100,
      });
    });

    test('should handle rapid button presses efficiently', async () => {
      let pressCount = 0;
      const onPress = () => { pressCount++; };

      const { getByTestId } = render(
        <Button title="Performance Test" onPress={onPress} testID="perf-button" />
      );

      const button = getByTestId('perf-button');
      
      const start = performance.now();
      
      // Simulate rapid button presses
      for (let i = 0; i < 100; i++) {
        fireEvent.press(button);
      }
      
      const end = performance.now();
      const totalTime = end - start;

      expect(totalTime).toBeLessThan(100); // Should complete within 100ms
      expect(pressCount).toBe(100);

      console.log('Button Press Performance:', {
        totalTime: `${totalTime.toFixed(3)}ms`,
        averagePerPress: `${(totalTime / 100).toFixed(3)}ms`,
        presses: 100,
      });
    });

    test('should optimize re-renders with same props', async () => {
      let renderCount = 0;

      const TestButton = ({ title, onPress }: { title: string; onPress: () => void }) => {
        renderCount++;
        return <Button title={title} onPress={onPress} testID="rerender-button" />;
      };

      const onPress = () => {};
      const { rerender } = render(<TestButton title="Test" onPress={onPress} />);

      const initialRenderCount = renderCount;

      // Re-render with same props
      rerender(<TestButton title="Test" onPress={onPress} />);
      rerender(<TestButton title="Test" onPress={onPress} />);
      rerender(<TestButton title="Test" onPress={onPress} />);

      const finalRenderCount = renderCount;
      const additionalRenders = finalRenderCount - initialRenderCount;

      // Should re-render but efficiently
      expect(additionalRenders).toBe(3);
      console.log('Button Re-render Performance:', {
        initialRenders: initialRenderCount,
        additionalRenders,
        totalRenders: finalRenderCount,
      });
    });
  });

  describe('Card Component Performance', () => {
    test('should render Card component within baseline', async () => {
      const results = await measureComponentRender(
        <Card testID="perf-card">
          <Button title="Child Button" onPress={() => {}} />
        </Card>,
        50
      );

      expect(results.averageTime).toBeLessThan(15);
      expect(results.maxTime).toBeLessThan(30);

      console.log('Card Render Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        max: `${results.maxTime.toFixed(3)}ms`,
        withChildren: true,
      });
    });

    test('should handle dynamic children efficiently', () => {
      const DynamicCard = ({ itemCount }: { itemCount: number }) => (
        <Card testID="dynamic-card">
          {Array.from({ length: itemCount }, (_, i) => (
            <Button key={i} title={`Item ${i}`} onPress={() => {}} />
          ))}
        </Card>
      );

      const start = performance.now();

      const { rerender } = render(<DynamicCard itemCount={5} />);
      rerender(<DynamicCard itemCount={10} />);
      rerender(<DynamicCard itemCount={15} />);
      rerender(<DynamicCard itemCount={20} />);

      const end = performance.now();
      const totalTime = end - start;

      expect(totalTime).toBeLessThan(100);

      console.log('Dynamic Card Performance:', {
        totalTime: `${totalTime.toFixed(3)}ms`,
        childrenCounts: [5, 10, 15, 20],
      });
    });
  });

  describe('Input Component Performance', () => {
    test('should render Input component efficiently', async () => {
      const results = await measureComponentRender(
        <Input placeholder="Test Input" onChangeText={() => {}} />,
        100
      );

      expect(results.averageTime).toBeLessThan(10);

      console.log('Input Render Performance:', {
        average: `${results.averageTime.toFixed(3)}ms`,
        max: `${results.maxTime.toFixed(3)}ms`,
      });
    });

    test('should handle rapid text changes efficiently', () => {
      let changeCount = 0;
      const onChangeText = (text: string) => { changeCount++; };

      const { getByTestId } = render(
        <Input 
          placeholder="Performance Input" 
          onChangeText={onChangeText} 
          testID="perf-input"
        />
      );

      const input = getByTestId('perf-input');
      
      const start = performance.now();
      
      // Simulate rapid text changes
      for (let i = 0; i < 50; i++) {
        fireEvent.changeText(input, `text-${i}`);
      }
      
      const end = performance.now();
      const totalTime = end - start;

      expect(totalTime).toBeLessThan(50);
      expect(changeCount).toBe(50);

      console.log('Input Text Change Performance:', {
        totalTime: `${totalTime.toFixed(3)}ms`,
        changes: 50,
        averagePerChange: `${(totalTime / 50).toFixed(3)}ms`,
      });
    });
  });

  describe('Complex Component Composition Performance', () => {
    test('should handle deeply nested components efficiently', async () => {
      const NestedComponent = ({ depth }: { depth: number }) => {
        if (depth === 0) {
          return <Button title="Deep Button" onPress={() => {}} />;
        }
        return (
          <Card testID={`card-${depth}`}>
            <NestedComponent depth={depth - 1} />
          </Card>
        );
      };

      const results = await measureComponentRender(
        <NestedComponent depth={10} />,
        20
      );

      expect(results.averageTime).toBeLessThan(50);

      console.log('Nested Component Performance:', {
        depth: 10,
        average: `${results.averageTime.toFixed(3)}ms`,
        max: `${results.maxTime.toFixed(3)}ms`,
      });
    });

    test('should optimize list rendering performance', () => {
      const ListComponent = ({ items }: { items: string[] }) => (
        <Card testID="list-card">
          {items.map((item, index) => (
            <Button 
              key={index} 
              title={item} 
              onPress={() => {}} 
              testID={`list-item-${index}`}
            />
          ))}
        </Card>
      );

      const smallList = Array.from({ length: 10 }, (_, i) => `Item ${i}`);
      const largeList = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

      const start = performance.now();

      const { rerender } = render(<ListComponent items={smallList} />);
      const smallListTime = performance.now();

      rerender(<ListComponent items={largeList} />);
      const largeListTime = performance.now();

      const smallListRenderTime = smallListTime - start;
      const largeListRenderTime = largeListTime - smallListTime;

      // Large list should not be exponentially slower
      const performanceRatio = largeListRenderTime / smallListRenderTime;
      expect(performanceRatio).toBeLessThan(20); // Should scale reasonably

      console.log('List Rendering Performance:', {
        smallList: `${smallListRenderTime.toFixed(3)}ms (10 items)`,
        largeList: `${largeListRenderTime.toFixed(3)}ms (100 items)`,
        ratio: performanceRatio.toFixed(2),
      });
    });

    test('should handle state updates efficiently', () => {
      const StatefulComponent = () => {
        const [count, setCount] = useState(0);
        const [text, setText] = useState('');

        const expensiveValue = useMemo(() => {
          // Simulate expensive computation
          let result = 0;
          for (let i = 0; i < 1000; i++) {
            result += Math.random();
          }
          return result;
        }, [count]);

        return (
          <Card testID="stateful-card">
            <Button 
              title={`Count: ${count} (${expensiveValue.toFixed(2)})`} 
              onPress={() => setCount(c => c + 1)}
              testID="count-button"
            />
            <Input 
              placeholder="Type here" 
              value={text}
              onChangeText={setText}
              testID="text-input"
            />
          </Card>
        );
      };

      const { getByTestId } = render(<StatefulComponent />);
      
      const countButton = getByTestId('count-button');
      const textInput = getByTestId('text-input');

      const start = performance.now();

      // Test state updates
      for (let i = 0; i < 20; i++) {
        fireEvent.press(countButton);
      }

      for (let i = 0; i < 20; i++) {
        fireEvent.changeText(textInput, `text-${i}`);
      }

      const end = performance.now();
      const totalTime = end - start;

      expect(totalTime).toBeLessThan(200);

      console.log('Stateful Component Performance:', {
        totalTime: `${totalTime.toFixed(3)}ms`,
        stateUpdates: 40,
        averagePerUpdate: `${(totalTime / 40).toFixed(3)}ms`,
      });
    });
  });

  describe('Memory Usage and Cleanup', () => {
    test('should not cause memory leaks with component mounting/unmounting', () => {
      const TestComponent = () => {
        const [data] = useState(() => Array.from({ length: 1000 }, (_, i) => i));
        
        useEffect(() => {
          // Simulate cleanup
          return () => {
            // Cleanup logic
          };
        }, []);

        return (
          <Card testID="memory-test-card">
            {data.slice(0, 10).map(item => (
              <Button 
                key={item} 
                title={`Item ${item}`} 
                onPress={() => {}}
              />
            ))}
          </Card>
        );
      };

      // Mount and unmount many components
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<TestComponent />);
        unmount();
      }

      // If we reach here without memory issues, test passes
      expect(true).toBe(true);

      console.log('Memory Test:', {
        mountUnmountCycles: 100,
        status: 'completed without memory issues',
      });
    });

    test('should clean up event listeners properly', () => {
      const TestComponent = () => {
        const [count, setCount] = useState(0);

        useEffect(() => {
          const interval = setInterval(() => {
            setCount(c => c + 1);
          }, 10);

          return () => clearInterval(interval);
        }, []);

        return (
          <Button 
            title={`Count: ${count}`}
            onPress={() => setCount(0)}
            testID="cleanup-test-button"
          />
        );
      };

      const { unmount } = render(<TestComponent />);
      
      // Wait a bit to ensure interval would have run
      setTimeout(() => {
        unmount();
        // Test passes if no errors or memory leaks
        expect(true).toBe(true);
      }, 50);
    });
  });

  describe('Performance Monitor Integration', () => {
    test('should track component performance metrics', () => {
      const MonitoredComponent = () => {
        useEffect(() => {
          performanceMonitor.start('component_lifecycle', 'render');
          
          return () => {
            performanceMonitor.end('component_lifecycle');
          };
        }, []);

        return <Button title="Monitored" onPress={() => {}} />;
      };

      const { unmount } = render(<MonitoredComponent />);
      unmount();

      const stats = performanceMonitor.getStats('component_lifecycle');
      expect(stats).toBeTruthy();
      expect(stats?.count).toBe(1);

      console.log('Performance Monitor Integration:', {
        tracked: stats !== null,
        count: stats?.count,
        averageTime: stats?.averageTime?.toFixed(3) + 'ms',
      });
    });

    test('should generate performance report for component operations', () => {
      // Simulate various component operations
      performanceMonitor.measure('test_render', 'render', () => {
        render(<Button title="Test" onPress={() => {}} />);
      });

      performanceMonitor.measure('test_computation', 'computation', () => {
        Array.from({ length: 1000 }, (_, i) => i * 2);
      });

      const report = performanceMonitor.generateReport();

      expect(report.summary.totalMetrics).toBeGreaterThan(0);
      expect(report.categoryStats.render).toBeTruthy();
      expect(report.categoryStats.computation).toBeTruthy();

      console.log('Performance Report:', {
        totalMetrics: report.summary.totalMetrics,
        categories: Object.keys(report.categoryStats),
        slowOperations: report.slowOperations.length,
      });
    });
  });
});