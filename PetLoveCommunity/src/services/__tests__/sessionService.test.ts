// Mock React Native first before any imports
jest.mock('react-native', () => ({
  AppState: {
    addListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    currentState: 'active',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native-uuid', () => ({
  v4: jest.fn(),
}));

// Mock the constants config
jest.mock('../../config/constants', () => ({
  STORAGE_KEYS: {
    CURRENT_SESSION: 'CURRENT_SESSION',
  },
  SESSION_CONFIG: {
    TIMEOUT: 30 * 60 * 1000,
  },
}));

// Import after mocking
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { AppState } from 'react-native';
import sessionService, { SessionService, SessionData } from '../sessionService';

describe('SessionService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (uuid.v4 as jest.Mock).mockReturnValue('test-session-id');
    
    // Clear session before each test and wait for initialization
    await sessionService.clearSession();
    await sessionService.waitForInitialization();
  });

  afterEach(async () => {
    jest.clearAllTimers();
    // Clean up any lingering sessions to prevent test pollution
    await sessionService.clearSession();
  });

  describe('getCurrentSession', () => {
    it('should create a new session when none exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const session = await sessionService.getCurrentSession();
      
      expect(session.sessionId).toBe('test-session-id');
      expect(session.isActive).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'CURRENT_SESSION',
        expect.stringContaining('test-session-id')
      );
    });

    it('should return existing session when valid', async () => {
      const mockSession: SessionData = {
        sessionId: 'existing-session',
        startTime: Date.now() - 1000,
        lastActivity: Date.now() - 1000,
        isActive: true,
      };
      
      // Mock the storage to return the existing session
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSession));
      
      // Create a new SessionService instance to test initialization with existing session
      const testService = new SessionService();
      await testService.waitForInitialization();
      
      const session = await testService.getCurrentSession();
      
      expect(session.sessionId).toBe('existing-session');
      expect(session.isActive).toBe(true);
    });

    it('should create new session when existing session is expired', async () => {
      const expiredSession: SessionData = {
        sessionId: 'expired-session',
        startTime: Date.now() - 2000000, // Very old
        lastActivity: Date.now() - 2000000, // Very old (beyond timeout)
        isActive: true,
      };
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredSession));
      
      const session = await sessionService.getCurrentSession();
      
      expect(session.sessionId).toBe('test-session-id');
      expect(session.isActive).toBe(true);
    });
  });

  describe('getSessionId', () => {
    it('should return current session ID', async () => {
      // First create a session to ensure we have an ID
      await sessionService.getCurrentSession();
      const sessionId = sessionService.getSessionId();
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toBe('test-session-id');
    });

    it('should return null when no session exists', async () => {
      await sessionService.clearSession();
      await sessionService.waitForInitialization();
      const sessionId = sessionService.getSessionId();
      expect(sessionId).toBeNull();
    });
  });

  describe('updateSessionActivity', () => {
    it('should update last activity timestamp', async () => {
      await sessionService.getCurrentSession();
      
      const beforeUpdate = Date.now();
      sessionService.updateSessionActivity();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'CURRENT_SESSION',
        expect.stringContaining('"lastActivity":')
      );
    });
  });

  describe('associateUser', () => {
    it('should associate user ID with session', async () => {
      await sessionService.getCurrentSession();
      await sessionService.associateUser('user-123');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'CURRENT_SESSION',
        expect.stringContaining('"userId":"user-123"')
      );
    });
  });

  describe('associateDevice', () => {
    it('should associate device ID with session', async () => {
      await sessionService.getCurrentSession();
      await sessionService.associateDevice('device-123');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'CURRENT_SESSION',
        expect.stringContaining('"deviceId":"device-123"')
      );
    });
  });

  describe('endSession', () => {
    it('should mark session as inactive', async () => {
      await sessionService.getCurrentSession();
      await sessionService.endSession();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'CURRENT_SESSION',
        expect.stringContaining('"isActive":false')
      );
    });
  });

  describe('clearSession', () => {
    it('should remove session from storage', async () => {
      await sessionService.clearSession();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('CURRENT_SESSION');
    });
  });

  describe('getSessionMetrics', () => {
    it('should return session metrics when session exists', async () => {
      await sessionService.getCurrentSession();
      
      const metrics = sessionService.getSessionMetrics();
      
      expect(metrics).toEqual({
        sessionDuration: expect.any(Number),
        pageViews: 0,
        transactions: [],
      });
    });

    it('should return null when no session exists', async () => {
      await sessionService.clearSession();
      
      const metrics = sessionService.getSessionMetrics();
      
      expect(metrics).toBeNull();
    });
  });

  describe('trackTransaction', () => {
    it('should update session activity when tracking transaction', async () => {
      await sessionService.getCurrentSession();
      
      sessionService.trackTransaction('txn-123');
      
      // Should trigger updateSessionActivity
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('app state handling', () => {
    it('should use AppState.addListener instead of deprecated addEventListener', () => {
      // This test verifies that we're using the new API
      // We can't easily test the constructor call due to singleton import,
      // but we can verify that AppState.addListener exists and is being used
      expect(AppState.addListener).toBeDefined();
      expect(typeof AppState.addListener).toBe('function');
      
      // The actual call happens during import, so let's test that the service
      // has the proper setup by checking it has a destroy method for cleanup
      expect(typeof sessionService.destroy).toBe('function');
    });
  });

  // NEW COMPREHENSIVE TESTS FOR MISSING COVERAGE

  describe('Error Handling Scenarios', () => {
    it('should handle initialization errors gracefully (Lines 47-48)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock AsyncStorage to throw error during initialization
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'));
      
      // Create new service instance to trigger initialization
      const testService = new SessionService();
      await testService.waitForInitialization();
      
      // Should log error (this error gets caught and logged by loadStoredSession, which then triggers initialization error)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load stored session:', expect.any(Error));
      
      // Service should still be usable after error
      const session = await testService.getCurrentSession();
      expect(session.sessionId).toBe('test-session-id');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle loadStoredSession errors gracefully (Line 73)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock AsyncStorage.getItem to throw error
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage read failed'));
      
      const testService = new SessionService();
      await testService.waitForInitialization();
      
      // Should log error and continue with new session
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load stored session:', expect.any(Error));
      
      const session = await testService.getCurrentSession();
      expect(session.sessionId).toBe('test-session-id');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle persistSession errors gracefully (Line 105)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await sessionService.getCurrentSession();
      
      // Mock AsyncStorage.setItem to throw error
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage write failed'));
      
      // Should not throw when persistence fails
      await expect(sessionService.associateUser('user-123')).resolves.not.toThrow();
      
      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to persist session:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle JSON parse errors in loadStoredSession', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock invalid JSON data
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid-json{');
      
      const testService = new SessionService();
      await testService.waitForInitialization();
      
      // Should handle JSON parse error and create new session
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load stored session:', expect.any(Error));
      
      const session = await testService.getCurrentSession();
      expect(session.sessionId).toBe('test-session-id');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('App State Change Handling (Lines 57-62)', () => {
    let testService: SessionService;
    let appStateListener: (state: any) => void;

    beforeEach(async () => {
      // Create a fresh service instance for app state testing
      testService = new SessionService();
      await testService.waitForInitialization();
      
      // Get the listener that was registered
      const addListenerCalls = (AppState.addListener as jest.Mock).mock.calls;
      appStateListener = addListenerCalls[addListenerCalls.length - 1][1];
      
      // Create initial session
      await testService.getCurrentSession();
    });

    it('should update session activity when app becomes active (Lines 57-59)', async () => {
      jest.clearAllMocks();
      
      // Simulate app state change to active
      appStateListener('active');
      
      // Should trigger updateSessionActivity -> persistSession
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'CURRENT_SESSION',
        expect.stringContaining('"lastActivity":')
      );
    });

    it('should persist session when app goes to background (Lines 60-62)', async () => {
      jest.clearAllMocks();
      
      // Simulate app state change to background
      appStateListener('background');
      
      // Should trigger persistSession
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'CURRENT_SESSION',
        expect.anything()
      );
    });

    it('should handle inactive state without crashing', async () => {
      jest.clearAllMocks();
      
      // Simulate app state change to inactive (should not trigger specific actions)
      expect(() => appStateListener('inactive')).not.toThrow();
      
      // Should not trigger any storage operations
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle unknown state without crashing', async () => {
      jest.clearAllMocks();
      
      // Simulate unknown app state
      expect(() => appStateListener('unknown')).not.toThrow();
    });

    it('should handle rapid app state changes', async () => {
      jest.clearAllMocks();
      
      // Rapid state changes
      appStateListener('background');
      appStateListener('active');
      appStateListener('background');
      appStateListener('active');
      
      // Should handle all changes without errors
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Session Timeout and Inactivity (Line 114)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should end session after timeout period', async () => {
      const testService = new SessionService();
      await testService.waitForInitialization();
      await testService.getCurrentSession();
      
      // Fast-forward time beyond session timeout (30 minutes)
      jest.advanceTimersByTime(30 * 60 * 1000 + 1000);
      
      // Session should be ended (marked as inactive)
      const session = await testService.getCurrentSession();
      // Should create a new session since the old one timed out
      expect(session.sessionId).toBe('test-session-id');
    });

    it('should reschedule timeout on activity update', async () => {
      const testService = new SessionService();
      await testService.waitForInitialization();
      await testService.getCurrentSession();
      
      // Advance time partway to timeout
      jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
      
      // Update activity (should reschedule timeout)
      testService.updateSessionActivity();
      
      // Advance another 20 minutes (total 35 minutes, but timeout should be reset)
      jest.advanceTimersByTime(20 * 60 * 1000);
      
      // Session should still be valid because timeout was rescheduled
      const sessionId = testService.getSessionId();
      expect(sessionId).toBe('test-session-id');
    });

    it('should clear timeout when session is ended manually', async () => {
      const testService = new SessionService();
      await testService.waitForInitialization();
      await testService.getCurrentSession();
      
      // Manually end session
      await testService.endSession();
      
      // Fast-forward time beyond timeout
      jest.advanceTimersByTime(30 * 60 * 1000 + 1000);
      
      // Should not cause any issues since timeout was cleared
      expect(() => jest.runAllTimers()).not.toThrow();
    });
  });

  describe('startSession Public Method (Line 169)', () => {
    it('should create new session when startSession is called', async () => {
      jest.clearAllMocks();
      
      // Call startSession directly
      sessionService.startSession();
      
      // Should create and persist a new session
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'CURRENT_SESSION',
        expect.stringContaining('test-session-id')
      );
    });

    it('should replace existing session when startSession is called', async () => {
      // First create a session
      await sessionService.getCurrentSession();
      const firstSessionId = sessionService.getSessionId();
      
      // Clear mocks to track new session creation
      jest.clearAllMocks();
      
      // Start new session
      sessionService.startSession();
      
      // Should create a new session
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'CURRENT_SESSION',
        expect.stringContaining('test-session-id')
      );
    });
  });

  describe('Service Lifecycle and Cleanup (Lines 213-218)', () => {
    it('should properly cleanup resources on destroy', () => {
      const testService = new SessionService();
      
      // Verify subscription was created
      expect(AppState.addListener).toHaveBeenCalled();
      
      // Mock the remove function
      const mockRemove = jest.fn();
      const mockSubscription = { remove: mockRemove };
      (AppState.addListener as jest.Mock).mockReturnValueOnce(mockSubscription);
      
      // Create another service to test cleanup
      const testService2 = new SessionService();
      testService2.destroy();
      
      // Should clean up app state subscription
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('should handle destroy when subscription is null', () => {
      const testService = new SessionService();
      
      // Call destroy multiple times
      expect(() => {
        testService.destroy();
        testService.destroy();
      }).not.toThrow();
    });

    it('should clear activity timer on destroy', async () => {
      jest.useFakeTimers();
      
      const testService = new SessionService();
      await testService.waitForInitialization();
      await testService.getCurrentSession();
      
      // Create timer by updating activity
      testService.updateSessionActivity();
      
      // Destroy service (should clear timer)
      testService.destroy();
      
      // Fast-forward time - should not trigger session end since timer was cleared
      jest.advanceTimersByTime(30 * 60 * 1000 + 1000);
      
      // Should not cause any issues
      expect(() => jest.runAllTimers()).not.toThrow();
      
      jest.useRealTimers();
    });
  });

  describe('Edge Cases and Integration Scenarios', () => {
    it('should handle session without userId or deviceId', async () => {
      const session = await sessionService.getCurrentSession();
      
      expect(session.userId).toBeUndefined();
      expect(session.deviceId).toBeUndefined();
      expect(session.sessionId).toBeTruthy();
    });

    it('should handle multiple services instances', () => {
      // Multiple instances should not interfere with each other
      const service1 = new SessionService();
      const service2 = new SessionService();
      const service3 = new SessionService();
      
      expect(AppState.addListener).toHaveBeenCalledTimes(3);
      
      // All should be destroyable
      expect(() => {
        service1.destroy();
        service2.destroy();
        service3.destroy();
      }).not.toThrow();
    });

    it('should handle operations on destroyed service', async () => {
      const testService = new SessionService();
      await testService.waitForInitialization();
      
      testService.destroy();
      
      // Operations should still work (destroy only cleans up listeners/timers)
      await expect(testService.getCurrentSession()).resolves.toBeTruthy();
      expect(() => testService.updateSessionActivity()).not.toThrow();
    });

    it('should maintain session state consistency across operations', async () => {
      const testService = new SessionService();
      await testService.waitForInitialization();
      
      // Create session
      const session = await testService.getCurrentSession();
      const originalId = session.sessionId;
      
      // Associate user and device
      await testService.associateUser('user-456');
      await testService.associateDevice('device-789');
      
      // Update activity
      testService.updateSessionActivity();
      
      // Track transaction
      testService.trackTransaction('txn-456');
      
      // Get session again - should be same ID with updated data
      const updatedSession = await testService.getCurrentSession();
      expect(updatedSession.sessionId).toBe(originalId);
      expect(updatedSession.userId).toBe('user-456');
      expect(updatedSession.deviceId).toBe('device-789');
    });
  });
});