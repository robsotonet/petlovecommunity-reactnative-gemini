// Performance Monitoring Utility
// Provides real-time performance tracking and baseline monitoring for the Pet Love Community app

interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  category: 'render' | 'network' | 'storage' | 'computation' | 'navigation';
  metadata?: Record<string, any>;
}

interface PerformanceBaseline {
  operation: string;
  averageTime: number;
  p50: number;
  p90: number;
  p99: number;
  maxTime: number;
  sampleCount: number;
  category: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeMetrics: Map<string, PerformanceMetrics> = new Map();
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private isEnabled: boolean = __DEV__;

  constructor() {
    this.initializeBaselines();
  }

  private initializeBaselines(): void {
    // Default performance baselines for critical operations
    const defaultBaselines: Omit<PerformanceBaseline, 'sampleCount'>[] = [
      {
        operation: 'component_render',
        averageTime: 16, // 60fps = 16.67ms per frame
        p50: 10,
        p90: 25,
        p99: 50,
        maxTime: 100,
        category: 'render',
      },
      {
        operation: 'redux_dispatch',
        averageTime: 1,
        p50: 0.5,
        p90: 2,
        p99: 5,
        maxTime: 10,
        category: 'computation',
      },
      {
        operation: 'api_request',
        averageTime: 1000,
        p50: 800,
        p90: 1500,
        p99: 3000,
        maxTime: 5000,
        category: 'network',
      },
      {
        operation: 'storage_read',
        averageTime: 10,
        p50: 5,
        p90: 20,
        p99: 50,
        maxTime: 100,
        category: 'storage',
      },
      {
        operation: 'storage_write',
        averageTime: 20,
        p50: 10,
        p90: 40,
        p99: 100,
        maxTime: 200,
        category: 'storage',
      },
      {
        operation: 'navigation_transition',
        averageTime: 300,
        p50: 250,
        p90: 400,
        p99: 600,
        maxTime: 1000,
        category: 'navigation',
      },
    ];

    defaultBaselines.forEach(baseline => {
      this.baselines.set(baseline.operation, {
        ...baseline,
        sampleCount: 0,
      });
    });
  }

  /**
   * Start measuring performance for an operation
   */
  start(name: string, category: PerformanceMetrics['category'], metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetrics = {
      name,
      startTime: performance.now(),
      category,
      metadata,
    };

    this.activeMetrics.set(name, metric);
  }

  /**
   * End measuring performance for an operation
   */
  end(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.activeMetrics.get(name);
    if (!metric) {
      console.warn(`PerformanceMonitor: No active metric found for "${name}"`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetrics = {
      ...metric,
      endTime,
      duration,
    };

    this.activeMetrics.delete(name);
    this.metrics.push(completedMetric);

    // Check against baseline
    this.checkBaseline(completedMetric);

    return duration;
  }

  /**
   * Measure a synchronous operation
   */
  measure<T>(
    name: string,
    category: PerformanceMetrics['category'],
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.isEnabled) return operation();

    this.start(name, category, metadata);
    const result = operation();
    this.end(name);

    return result;
  }

  /**
   * Measure an asynchronous operation
   */
  async measureAsync<T>(
    name: string,
    category: PerformanceMetrics['category'],
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) return await operation();

    this.start(name, category, metadata);
    const result = await operation();
    this.end(name);

    return result;
  }

  /**
   * Check if a metric exceeds baseline thresholds
   */
  private checkBaseline(metric: PerformanceMetrics): void {
    if (!metric.duration) return;

    const baseline = this.baselines.get(metric.name);
    if (!baseline) return;

    // Check if performance exceeds warning thresholds
    if (metric.duration > baseline.p90) {
      console.warn(
        `PerformanceMonitor: "${metric.name}" took ${metric.duration.toFixed(2)}ms (> P90: ${baseline.p90}ms)`,
        metric.metadata
      );
    }

    if (metric.duration > baseline.p99) {
      console.error(
        `PerformanceMonitor: "${metric.name}" took ${metric.duration.toFixed(2)}ms (> P99: ${baseline.p99}ms)`,
        metric.metadata
      );
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operationName: string, timeWindow?: number): {
    count: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    p50: number;
    p90: number;
    p99: number;
  } | null {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    const relevantMetrics = this.metrics.filter(
      m => m.name === operationName && 
           m.duration !== undefined && 
           m.startTime >= cutoffTime
    );

    if (relevantMetrics.length === 0) return null;

    const durations = relevantMetrics
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    const sum = durations.reduce((acc, val) => acc + val, 0);

    return {
      count: durations.length,
      averageTime: sum / durations.length,
      minTime: durations[0],
      maxTime: durations[durations.length - 1],
      p50: this.percentile(durations, 50),
      p90: this.percentile(durations, 90),
      p99: this.percentile(durations, 99),
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Get all performance metrics for a category
   */
  getMetricsByCategory(category: PerformanceMetrics['category'], timeWindow?: number): PerformanceMetrics[] {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    return this.metrics.filter(
      m => m.category === category && m.startTime >= cutoffTime
    );
  }

  /**
   * Generate performance report
   */
  generateReport(timeWindow?: number): {
    summary: Record<string, any>;
    categoryStats: Record<string, any>;
    slowOperations: PerformanceMetrics[];
    baselineViolations: PerformanceMetrics[];
  } {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    const relevantMetrics = this.metrics.filter(
      m => m.duration !== undefined && m.startTime >= cutoffTime
    );

    const categories: PerformanceMetrics['category'][] = ['render', 'network', 'storage', 'computation', 'navigation'];
    const categoryStats: Record<string, any> = {};

    categories.forEach(category => {
      const categoryMetrics = relevantMetrics.filter(m => m.category === category);
      if (categoryMetrics.length > 0) {
        const durations = categoryMetrics.map(m => m.duration!);
        const sum = durations.reduce((acc, val) => acc + val, 0);
        
        categoryStats[category] = {
          count: durations.length,
          averageTime: sum / durations.length,
          totalTime: sum,
          minTime: Math.min(...durations),
          maxTime: Math.max(...durations),
        };
      }
    });

    // Find slow operations (> 100ms)
    const slowOperations = relevantMetrics.filter(m => m.duration! > 100);

    // Find baseline violations
    const baselineViolations = relevantMetrics.filter(m => {
      const baseline = this.baselines.get(m.name);
      return baseline && m.duration! > baseline.p90;
    });

    return {
      summary: {
        totalMetrics: relevantMetrics.length,
        timeWindow: timeWindow ? `${timeWindow}ms` : 'all time',
        averageTime: relevantMetrics.length > 0 
          ? relevantMetrics.reduce((acc, m) => acc + m.duration!, 0) / relevantMetrics.length 
          : 0,
        slowOperationsCount: slowOperations.length,
        baselineViolationsCount: baselineViolations.length,
      },
      categoryStats,
      slowOperations,
      baselineViolations,
    };
  }

  /**
   * Clear performance metrics
   */
  clear(): void {
    this.metrics = [];
    this.activeMetrics.clear();
  }

  /**
   * Enable/disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.activeMetrics.clear();
    }
  }

  /**
   * Update baseline for an operation
   */
  updateBaseline(operation: string, baseline: Partial<PerformanceBaseline>): void {
    const existing = this.baselines.get(operation) || {
      operation,
      averageTime: 0,
      p50: 0,
      p90: 0,
      p99: 0,
      maxTime: 0,
      sampleCount: 0,
      category: 'computation',
    };

    this.baselines.set(operation, { ...existing, ...baseline });
  }

  /**
   * Get current baselines
   */
  getBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.baselines);
  }

  /**
   * Log performance summary to console (development only)
   */
  logSummary(): void {
    if (!__DEV__ || this.metrics.length === 0) return;

    const report = this.generateReport();
    
    console.group('🚀 Performance Monitor Summary');
    console.log('📊 Overview:', report.summary);
    console.log('📈 By Category:', report.categoryStats);
    
    if (report.slowOperations.length > 0) {
      console.warn('🐌 Slow Operations:', report.slowOperations.map(m => ({
        name: m.name,
        duration: `${m.duration?.toFixed(2)}ms`,
        category: m.category,
      })));
    }
    
    if (report.baselineViolations.length > 0) {
      console.error('⚠️  Baseline Violations:', report.baselineViolations.map(m => ({
        name: m.name,
        duration: `${m.duration?.toFixed(2)}ms`,
        category: m.category,
      })));
    }
    
    console.groupEnd();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export React Hook for component performance monitoring
export const usePerformanceMonitor = () => {
  const measureRender = (componentName: string, metadata?: Record<string, any>) => {
    const metricName = `${componentName}_render`;
    performanceMonitor.start(metricName, 'render', metadata);
    
    return () => {
      performanceMonitor.end(metricName);
    };
  };

  const measureAsync = performanceMonitor.measureAsync.bind(performanceMonitor);
  const measure = performanceMonitor.measure.bind(performanceMonitor);

  return {
    measureRender,
    measureAsync,
    measure,
    getStats: performanceMonitor.getStats.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
  };
};

// Export types
export type { PerformanceMetrics, PerformanceBaseline };