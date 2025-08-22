// Logging Service Comprehensive Tests
// Testing enterprise logging functionality, log levels, and production behavior

import loggingService, { LogLevel, LogEntry } from '../loggingService';

// Mock ENV module
jest.mock('../../config/constants', () => ({
  ENV: {
    IS_DEV: false, // Start with production mode
  },
}));

describe('LoggingService', () => {
  let consoleSpy: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    // Mock all console methods
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };

    // Clear logs before each test
    loggingService.clearLogs();
    
    // Reset to default production settings
    loggingService.setLogLevel(LogLevel.WARN);
    loggingService.enableConsole(false);
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Log Level Management', () => {
    test('should respect log level filtering in production', () => {
      loggingService.setLogLevel(LogLevel.WARN);
      loggingService.enableConsole(true);

      // These should be logged (>= WARN)
      loggingService.warn('Warning message');
      loggingService.error('Error message');

      // These should be filtered out (< WARN)
      loggingService.debug('Debug message');
      loggingService.info('Info message');

      expect(consoleSpy.warn).toHaveBeenCalledWith(' Warning message');
      expect(consoleSpy.error).toHaveBeenCalledWith(' Error message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    test('should log all levels when set to DEBUG', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      loggingService.debug('Debug message');
      loggingService.info('Info message');
      loggingService.warn('Warning message');
      loggingService.error('Error message');

      expect(consoleSpy.debug).toHaveBeenCalledWith(' Debug message');
      expect(consoleSpy.info).toHaveBeenCalledWith(' Info message');
      expect(consoleSpy.warn).toHaveBeenCalledWith(' Warning message');
      expect(consoleSpy.error).toHaveBeenCalledWith(' Error message');
    });

    test('should not log anything when set to SILENT', () => {
      loggingService.setLogLevel(LogLevel.SILENT);
      loggingService.enableConsole(true);

      loggingService.debug('Debug message');
      loggingService.info('Info message');
      loggingService.warn('Warning message');
      loggingService.error('Error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('Console Output Management', () => {
    test('should not output to console when disabled', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(false);

      loggingService.debug('Debug message');
      loggingService.info('Info message');
      loggingService.warn('Warning message');
      loggingService.error('Error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    test('should format console messages with context', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      loggingService.debug('Test message', 'TestContext');
      loggingService.info('Test message', 'TestContext', { key: 'value' });

      expect(consoleSpy.debug).toHaveBeenCalledWith('[TestContext] Test message');
      expect(consoleSpy.info).toHaveBeenCalledWith('[TestContext] Test message {"key":"value"}');
    });

    test('should format console messages without context', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      loggingService.debug('Plain message');
      loggingService.info('Message with metadata', undefined, { data: 'test' });

      expect(consoleSpy.debug).toHaveBeenCalledWith(' Plain message');
      expect(consoleSpy.info).toHaveBeenCalledWith(' Message with metadata {"data":"test"}');
    });
  });

  describe('Log Queue Management', () => {
    test('should add logs to queue regardless of console output', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(false);

      loggingService.debug('Debug message');
      loggingService.info('Info message');
      loggingService.warn('Warning message');

      const recentLogs = loggingService.getRecentLogs(10);
      expect(recentLogs).toHaveLength(3);
      expect(recentLogs[0].message).toBe('Debug message');
      expect(recentLogs[0].level).toBe(LogLevel.DEBUG);
      expect(recentLogs[1].message).toBe('Info message');
      expect(recentLogs[2].message).toBe('Warning message');
    });

    test('should maintain queue size limit', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);

      // Add more than 100 logs (default queue size)
      for (let i = 0; i < 105; i++) {
        loggingService.debug(`Message ${i}`);
      }

      const recentLogs = loggingService.getRecentLogs(200);
      expect(recentLogs.length).toBeLessThanOrEqual(100);
      
      // Should contain the most recent logs
      const lastLog = recentLogs[recentLogs.length - 1];
      expect(lastLog.message).toBe('Message 104');
    });

    test('should return limited number of recent logs', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);

      for (let i = 0; i < 10; i++) {
        loggingService.debug(`Message ${i}`);
      }

      const recentLogs = loggingService.getRecentLogs(5);
      expect(recentLogs).toHaveLength(5);
      expect(recentLogs[0].message).toBe('Message 5');
      expect(recentLogs[4].message).toBe('Message 9');
    });

    test('should clear logs properly', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      
      loggingService.debug('Message 1');
      loggingService.info('Message 2');
      
      expect(loggingService.getRecentLogs(10)).toHaveLength(2);
      
      loggingService.clearLogs();
      
      expect(loggingService.getRecentLogs(10)).toHaveLength(0);
    });
  });

  describe('Analytics-Specific Logging', () => {
    test('should handle analytics warnings in production (logged as debug)', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      const metadata = { petId: 'pet-123', source: 'featured' };
      loggingService.logAnalyticsWarning('Analytics not ready', metadata);

      // In production mode (IS_DEV: false), analytics warnings are logged as debug
      expect(consoleSpy.debug).toHaveBeenCalledWith('[Analytics] Analytics not ready {"petId":"pet-123","source":"featured"}');

      const recentLogs = loggingService.getRecentLogs(1);
      expect(recentLogs[0].context).toBe('Analytics');
      expect(recentLogs[0].metadata).toEqual(metadata);
    });

    test('should handle analytics errors', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      const metadata = { error: 'Network failure' };
      loggingService.logAnalyticsError('Failed to track event', metadata);

      expect(consoleSpy.error).toHaveBeenCalledWith('[Analytics] Failed to track event {"error":"Network failure"}');

      const recentLogs = loggingService.getRecentLogs(1);
      expect(recentLogs[0].level).toBe(LogLevel.ERROR);
      expect(recentLogs[0].context).toBe('Analytics');
    });

    test('should handle analytics info logging', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      const metadata = { sessionId: 'session-123' };
      loggingService.logAnalyticsInfo('Session started', metadata);

      expect(consoleSpy.info).toHaveBeenCalledWith('[Analytics] Session started {"sessionId":"session-123"}');
    });

    test('should reduce verbosity in production for analytics warnings', () => {
      // Simulate production environment
      jest.doMock('../../config/constants', () => ({
        ENV: {
          IS_DEV: false,
        },
      }));

      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      loggingService.logAnalyticsWarning('Analytics not ready');

      // In production, this should be logged as debug level
      const recentLogs = loggingService.getRecentLogs(1);
      expect(recentLogs[0].level).toBe(LogLevel.DEBUG);
    });
  });

  describe('Performance Logging', () => {
    test('should log performance metrics correctly', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      const metadata = { cacheHit: true };
      loggingService.logPerformance('API Request', 150, 'Network', metadata);

      expect(consoleSpy.info).toHaveBeenCalledWith('[Network] Performance: API Request completed in 150ms {"duration":150,"cacheHit":true}');

      const recentLogs = loggingService.getRecentLogs(1);
      expect(recentLogs[0].level).toBe(LogLevel.INFO);
      expect(recentLogs[0].context).toBe('Network');
      expect(recentLogs[0].metadata).toEqual({ duration: 150, cacheHit: true });
    });

    test('should use default context for performance logging', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      loggingService.logPerformance('Database Query', 75);

      expect(consoleSpy.info).toHaveBeenCalledWith('[Performance] Performance: Database Query completed in 75ms {"duration":75}');
    });
  });

  describe('Log Entry Structure', () => {
    test('should create log entries with proper structure', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);

      const metadata = { userId: 'user-123' };
      loggingService.info('Test message', 'TestContext', metadata);

      const recentLogs = loggingService.getRecentLogs(1);
      const logEntry = recentLogs[0];

      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        message: 'Test message',
        context: 'TestContext',
        metadata: metadata,
        timestamp: expect.any(String),
      });

      // Verify timestamp is valid ISO string
      expect(new Date(logEntry.timestamp).toISOString()).toBe(logEntry.timestamp);
    });

    test('should handle optional parameters correctly', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);

      loggingService.error('Error without context');

      const recentLogs = loggingService.getRecentLogs(1);
      const logEntry = recentLogs[0];

      expect(logEntry.level).toBe(LogLevel.ERROR);
      expect(logEntry.message).toBe('Error without context');
      expect(logEntry.context).toBeUndefined();
      expect(logEntry.metadata).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty messages gracefully', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);

      loggingService.info('');
      loggingService.warn('   ');

      const recentLogs = loggingService.getRecentLogs(2);
      expect(recentLogs).toHaveLength(2);
      expect(recentLogs[0].message).toBe('');
      expect(recentLogs[1].message).toBe('   ');
    });

    test('should handle complex metadata objects', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);
      loggingService.enableConsole(true);

      const complexMetadata = {
        user: { id: 'user-123', name: 'John Doe' },
        settings: { theme: 'dark', notifications: true },
        array: [1, 2, 3],
        nested: { level: { deep: 'value' } }
      };

      loggingService.info('Complex metadata test', 'Test', complexMetadata);

      const recentLogs = loggingService.getRecentLogs(1);
      expect(recentLogs[0].metadata).toEqual(complexMetadata);
    });

    test('should handle null and undefined metadata', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);

      loggingService.info('Test with null', 'Test', null as any);
      loggingService.info('Test with undefined', 'Test', undefined);

      const recentLogs = loggingService.getRecentLogs(2);
      expect(recentLogs[0].metadata).toBeNull();
      expect(recentLogs[1].metadata).toBeUndefined();
    });
  });

  describe('Integration Scenarios', () => {
    test('should work correctly with rapid logging', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);

      const startTime = Date.now();
      
      // Rapid fire logging
      for (let i = 0; i < 50; i++) {
        loggingService.info(`Rapid log ${i}`);
      }

      const endTime = Date.now();
      const recentLogs = loggingService.getRecentLogs(50);

      expect(recentLogs).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    test('should maintain correct order of logs', () => {
      loggingService.setLogLevel(LogLevel.DEBUG);

      loggingService.debug('First');
      loggingService.info('Second');
      loggingService.warn('Third');
      loggingService.error('Fourth');

      const recentLogs = loggingService.getRecentLogs(4);
      expect(recentLogs[0].message).toBe('First');
      expect(recentLogs[1].message).toBe('Second');
      expect(recentLogs[2].message).toBe('Third');
      expect(recentLogs[3].message).toBe('Fourth');
    });
  });
});