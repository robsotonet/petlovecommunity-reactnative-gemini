// Performance Monitor Comprehensive Tests
// Testing performance monitoring, baseline detection, and regression analysis

import { performanceMonitor, usePerformanceMonitor } from '../performanceMonitor';
import { renderHook, act } from '@testing-library/react-native';

// Mock global performance API
const mockPerformanceNow = jest.fn();

// Setup performance object that persists between test runs
beforeAll(() => {
  global.performance = {
    now: mockPerformanceNow,
  } as any;
});

afterAll(() => {
  // Clean up performance mock
  delete (global as any).performance;
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock but don't set default return value to avoid interference
    mockPerformanceNow.mockReset();
    performanceMonitor.clear();
    performanceMonitor.setEnabled(true);
    
    // Mock __DEV__ as true for testing
    (global as any).__DEV__ = true;
  });

  afterEach(() => {
    performanceMonitor.clear();
    (global as any).__DEV__ = false;
  });

  describe('Basic Operation Management', () => {
    test('should start and end metrics correctly', () => {
      mockPerformanceNow
        .mockReturnValueOnce(100) // start time
        .mockReturnValueOnce(150); // end time

      performanceMonitor.start('test_operation', 'computation');
      const duration = performanceMonitor.end('test_operation');

      expect(duration).toBe(50);
    });

    test('should return null when ending non-existent metric', () => {
      const duration = performanceMonitor.end('nonexistent');
      expect(duration).toBeNull();
    });

    test('should warn when ending non-existent metric', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      performanceMonitor.end('nonexistent');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'PerformanceMonitor: No active metric found for "nonexistent"'
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle overlapping metrics', () => {
      mockPerformanceNow
        .mockReturnValueOnce(100) // metric1 start
        .mockReturnValueOnce(120) // metric2 start
        .mockReturnValueOnce(140) // metric1 end
        .mockReturnValueOnce(160); // metric2 end

      performanceMonitor.start('metric1', 'computation');
      performanceMonitor.start('metric2', 'render');
      
      const duration1 = performanceMonitor.end('metric1');
      const duration2 = performanceMonitor.end('metric2');

      expect(duration1).toBe(40);
      expect(duration2).toBe(40);
    });
  });

  describe('Synchronous Measurement', () => {
    test('should measure synchronous operations', () => {
      let operationCalled = false;
      mockPerformanceNow
        .mockReturnValueOnce(100) // start
        .mockReturnValueOnce(150); // end

      const result = performanceMonitor.measure(
        'sync_operation',
        'computation',
        () => {
          operationCalled = true;
          return 'test_result';
        }
      );

      expect(result).toBe('test_result');
      expect(operationCalled).toBe(true);
    });

    test('should handle errors in synchronous operations', () => {
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150);

      expect(() => {
        performanceMonitor.measure('error_operation', 'computation', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    test('should not measure when disabled', () => {
      performanceMonitor.setEnabled(false);
      let operationCalled = false;

      const result = performanceMonitor.measure(
        'disabled_operation',
        'computation',
        () => {
          operationCalled = true;
          return 'result';
        }
      );

      expect(result).toBe('result');
      expect(operationCalled).toBe(true);
      expect(mockPerformanceNow).not.toHaveBeenCalled();
    });
  });

  describe('Asynchronous Measurement', () => {
    test('should measure asynchronous operations', async () => {
      let operationCalled = false;
      mockPerformanceNow
        .mockReturnValueOnce(100) // start
        .mockReturnValueOnce(200); // end

      const result = await performanceMonitor.measureAsync(
        'async_operation',
        'network',
        async () => {
          operationCalled = true;
          return Promise.resolve('async_result');
        }
      );

      expect(result).toBe('async_result');
      expect(operationCalled).toBe(true);
    });

    test('should handle async errors', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(200);

      await expect(
        performanceMonitor.measureAsync('async_error', 'network', async () => {
          throw new Error('Async error');
        })
      ).rejects.toThrow('Async error');
    });

    test('should not measure async when disabled', async () => {
      performanceMonitor.setEnabled(false);
      let operationCalled = false;

      const result = await performanceMonitor.measureAsync(
        'disabled_async',
        'network',
        async () => {
          operationCalled = true;
          return 'result';
        }
      );

      expect(result).toBe('result');
      expect(operationCalled).toBe(true);
      expect(mockPerformanceNow).not.toHaveBeenCalled();
    });
  });

  describe('Baseline Monitoring', () => {
    test('should check against baselines and warn for p90 violations', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Set up a baseline violation (p90 = 2ms, actual = 3ms)
      performanceMonitor.updateBaseline('test_operation', { 
        operation: 'test_operation',
        p90: 2,
        p99: 10,
        averageTime: 1,
        p50: 1,
        maxTime: 5,
        sampleCount: 10,
        category: 'computation'
      });
      
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(103); // 3ms duration

      performanceMonitor.start('test_operation', 'computation');
      performanceMonitor.end('test_operation');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PerformanceMonitor: "test_operation" took 3.00ms (> P90: 2ms)'),
        undefined
      );

      consoleSpy.mockRestore();
    });

    test('should check against baselines and error for p99 violations', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      performanceMonitor.updateBaseline('test_operation', {
        operation: 'test_operation',
        p90: 8,
        p99: 5,
        averageTime: 1,
        p50: 1,
        maxTime: 15,
        sampleCount: 10,
        category: 'computation'
      });
      
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(110); // 10ms duration

      performanceMonitor.start('test_operation', 'computation');
      performanceMonitor.end('test_operation');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PerformanceMonitor: "test_operation" took 10.00ms (> P99: 5ms)'),
        undefined
      );

      consoleSpy.mockRestore();
    });

    test('should not warn for operations within baseline', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      performanceMonitor.updateBaseline('fast_operation', { p90: 100 });
      
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150); // 50ms duration (within baseline)

      performanceMonitor.start('fast_operation', 'computation');
      performanceMonitor.end('fast_operation');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Statistics Calculation', () => {
    beforeEach(() => {
      // Add multiple metrics for statistical analysis
      const durations = [10, 20, 30, 40, 50];
      durations.forEach((duration, index) => {
        mockPerformanceNow
          .mockReturnValueOnce(100)
          .mockReturnValueOnce(100 + duration);
        
        performanceMonitor.start(`test_${index}`, 'computation');
        performanceMonitor.end(`test_${index}`);
      });
    });

    test('should return null for non-existent operation stats', () => {
      const stats = performanceMonitor.getStats('nonexistent');
      expect(stats).toBeNull();
    });

    test('should calculate statistics for single operation', () => {
      // Clear any existing metrics first
      performanceMonitor.clear();
      
      // Add specific operation multiple times with different start times
      const durations = [5, 10, 15, 20, 25];
      durations.forEach((duration, index) => {
        const startTime = 1000 + index * 100; // Use different start times
        mockPerformanceNow
          .mockReturnValueOnce(startTime)
          .mockReturnValueOnce(startTime + duration);
        
        performanceMonitor.start('repeated_op', 'computation');
        performanceMonitor.end('repeated_op');
      });

      const stats = performanceMonitor.getStats('repeated_op');
      
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(5);
      expect(stats!.averageTime).toBe(15); // (5+10+15+20+25)/5
      expect(stats!.minTime).toBe(5);
      expect(stats!.maxTime).toBe(25);
      expect(stats!.p50).toBe(15);
    });

    test('should calculate statistics within time window', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      // Add operation outside time window
      mockPerformanceNow
        .mockReturnValueOnce(now - 2000) // 2 seconds ago
        .mockReturnValueOnce(now - 1990);
      performanceMonitor.start('old_op', 'computation');
      performanceMonitor.end('old_op');

      // Add operation within time window
      mockPerformanceNow
        .mockReturnValueOnce(now - 500) // 0.5 seconds ago
        .mockReturnValueOnce(now - 490);
      performanceMonitor.start('old_op', 'computation');
      performanceMonitor.end('old_op');

      const stats = performanceMonitor.getStats('old_op', 1000); // 1 second window
      
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1); // Only recent operation counted

      jest.restoreAllMocks();
    });
  });

  describe('Category-based Metrics', () => {
    test('should retrieve metrics by category', () => {
      // Add metrics for different categories
      ['render', 'network', 'storage'].forEach((category, index) => {
        mockPerformanceNow
          .mockReturnValueOnce(100)
          .mockReturnValueOnce(110 + index * 10);
        
        performanceMonitor.start(`${category}_op`, category as any);
        performanceMonitor.end(`${category}_op`);
      });

      const renderMetrics = performanceMonitor.getMetricsByCategory('render');
      const networkMetrics = performanceMonitor.getMetricsByCategory('network');
      
      expect(renderMetrics).toHaveLength(1);
      expect(renderMetrics[0].name).toBe('render_op');
      expect(renderMetrics[0].category).toBe('render');
      
      expect(networkMetrics).toHaveLength(1);
      expect(networkMetrics[0].name).toBe('network_op');
      expect(networkMetrics[0].category).toBe('network');
    });

    test('should filter metrics by time window', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      // Add old metric
      mockPerformanceNow
        .mockReturnValueOnce(now - 2000)
        .mockReturnValueOnce(now - 1990);
      performanceMonitor.start('old_render', 'render');
      performanceMonitor.end('old_render');

      // Add recent metric
      mockPerformanceNow
        .mockReturnValueOnce(now - 500)
        .mockReturnValueOnce(now - 490);
      performanceMonitor.start('new_render', 'render');
      performanceMonitor.end('new_render');

      const recentMetrics = performanceMonitor.getMetricsByCategory('render', 1000);
      
      expect(recentMetrics).toHaveLength(1);
      expect(recentMetrics[0].name).toBe('new_render');

      jest.restoreAllMocks();
    });
  });

  describe('Performance Reporting', () => {
    beforeEach(() => {
      // Set up diverse metrics for reporting
      const metrics = [
        { name: 'fast_render', category: 'render', duration: 5 },
        { name: 'slow_render', category: 'render', duration: 150 },
        { name: 'api_call', category: 'network', duration: 200 },
        { name: 'quick_storage', category: 'storage', duration: 10 },
      ];

      metrics.forEach((metric, index) => {
        mockPerformanceNow
          .mockReturnValueOnce(index * 100)
          .mockReturnValueOnce(index * 100 + metric.duration);
        
        performanceMonitor.start(metric.name, metric.category as any);
        performanceMonitor.end(metric.name);
      });
    });

    test('should generate comprehensive performance report', () => {
      const report = performanceMonitor.generateReport();
      
      expect(report.summary.totalMetrics).toBe(4);
      expect(report.summary.slowOperationsCount).toBe(2); // slow_render and api_call
      expect(report.categoryStats.render).toBeDefined();
      expect(report.categoryStats.network).toBeDefined();
      expect(report.categoryStats.storage).toBeDefined();
      
      expect(report.categoryStats.render.count).toBe(2);
      expect(report.categoryStats.network.count).toBe(1);
      expect(report.categoryStats.storage.count).toBe(1);
    });

    test('should identify slow operations', () => {
      const report = performanceMonitor.generateReport();
      
      expect(report.slowOperations).toHaveLength(2);
      expect(report.slowOperations.map(op => op.name)).toContain('slow_render');
      expect(report.slowOperations.map(op => op.name)).toContain('api_call');
    });

    test('should identify baseline violations', () => {
      performanceMonitor.updateBaseline('fast_render', { p90: 3 });
      
      const report = performanceMonitor.generateReport();
      
      expect(report.baselineViolations).toHaveLength(1);
      expect(report.baselineViolations[0].name).toBe('fast_render');
    });
  });

  describe('Utility Functions', () => {
    test('should enable and disable monitoring', () => {
      performanceMonitor.setEnabled(false);
      
      performanceMonitor.start('disabled_test', 'computation');
      const duration = performanceMonitor.end('disabled_test');
      
      expect(duration).toBeNull();
      expect(mockPerformanceNow).not.toHaveBeenCalled();

      performanceMonitor.setEnabled(true);
      
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150);
      
      performanceMonitor.start('enabled_test', 'computation');
      const enabledDuration = performanceMonitor.end('enabled_test');
      
      expect(enabledDuration).toBe(50);
    });

    test('should clear metrics', () => {
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150);
      
      performanceMonitor.start('test_clear', 'computation');
      performanceMonitor.end('test_clear');
      
      expect(performanceMonitor.getStats('test_clear')).not.toBeNull();
      
      performanceMonitor.clear();
      
      expect(performanceMonitor.getStats('test_clear')).toBeNull();
    });

    test('should update and retrieve baselines', () => {
      const baseline = {
        operation: 'test_op',
        averageTime: 50,
        p50: 40,
        p90: 80,
        p99: 100,
        maxTime: 120,
        sampleCount: 100,
        category: 'computation',
      };

      performanceMonitor.updateBaseline('test_op', baseline);
      
      const baselines = performanceMonitor.getBaselines();
      
      expect(baselines.has('test_op')).toBe(true);
      expect(baselines.get('test_op')).toMatchObject(baseline);
    });
  });

  describe('Development Logging', () => {
    test('should log summary in development mode', () => {
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
      
      // Add some test metrics
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150);
      
      performanceMonitor.start('dev_test', 'computation');
      performanceMonitor.end('dev_test');
      
      performanceMonitor.logSummary();
      
      expect(consoleSpy).toHaveBeenCalledWith('🚀 Performance Monitor Summary');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleEndSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleEndSpy.mockRestore();
    });

    test('should not log summary when no metrics exist', () => {
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
      
      performanceMonitor.logSummary();
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should not log summary when not in development', () => {
      (global as any).__DEV__ = false;
      
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
      
      // Add metrics
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150);
      
      performanceMonitor.start('prod_test', 'computation');
      performanceMonitor.end('prod_test');
      
      performanceMonitor.logSummary();
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle performance.now undefined gracefully', () => {
      // Temporarily remove performance object
      const originalPerformance = global.performance;
      delete (global as any).performance;
      
      expect(() => {
        performanceMonitor.start('no_performance', 'computation');
        performanceMonitor.end('no_performance');
      }).toThrow('performance is not defined');
      
      // Restore performance object
      global.performance = originalPerformance;
    });

    test('should handle very large metric counts', () => {
      // Clear first to ensure clean state
      performanceMonitor.clear();
      
      // Add many metrics to test performance (using smaller number for test speed)
      for (let i = 0; i < 100; i++) {
        mockPerformanceNow
          .mockReturnValueOnce(1000 + i * 10)
          .mockReturnValueOnce(1000 + i * 10 + 1);
        
        performanceMonitor.start(`bulk_${i}`, 'computation');
        performanceMonitor.end(`bulk_${i}`);
      }
      
      const report = performanceMonitor.generateReport();
      expect(report.summary.totalMetrics).toBe(100);
    });

    test('should handle metadata correctly', () => {
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150);
      
      const metadata = { component: 'TestComponent', props: { id: 123 } };
      
      performanceMonitor.start('metadata_test', 'render', metadata);
      performanceMonitor.end('metadata_test');
      
      const stats = performanceMonitor.getStats('metadata_test');
      expect(stats).not.toBeNull();
    });
  });
});

describe('usePerformanceMonitor Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReset();
    performanceMonitor.clear();
    performanceMonitor.setEnabled(true);
    
    // Ensure performance API is available for hook tests
    if (!global.performance) {
      global.performance = {
        now: mockPerformanceNow,
      } as any;
    }
  });

  test('should provide performance monitoring utilities', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    expect(typeof result.current.measureRender).toBe('function');
    expect(typeof result.current.measureAsync).toBe('function');
    expect(typeof result.current.measure).toBe('function');
    expect(typeof result.current.getStats).toBe('function');
    expect(typeof result.current.generateReport).toBe('function');
  });

  test('should measure render operations', () => {
    mockPerformanceNow
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(150);
    
    const { result } = renderHook(() => usePerformanceMonitor());
    
    const endRender = result.current.measureRender('TestComponent');
    endRender();
    
    const stats = result.current.getStats('TestComponent_render');
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(1);
  });

  test('should handle metadata in render measurements', () => {
    mockPerformanceNow
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(150);
    
    const { result } = renderHook(() => usePerformanceMonitor());
    
    const metadata = { props: { count: 5 } };
    const endRender = result.current.measureRender('TestComponent', metadata);
    endRender();
    
    const stats = result.current.getStats('TestComponent_render');
    expect(stats).not.toBeNull();
  });

  test('should provide access to underlying monitor functions', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    // Test that functions are bound correctly
    expect(result.current.getStats('nonexistent')).toBeNull();
    expect(result.current.generateReport()).toBeDefined();
  });
});