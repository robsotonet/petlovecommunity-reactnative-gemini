// Mock dependencies before importing the service
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { AppState } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native-uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active',
  },
}));

// Import after mocking
import sessionService, { SessionData } from '../sessionService';

describe('SessionService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (uuid.v4 as jest.Mock).mockReturnValue('test-session-id');
    
    // Clear session before each test
    await sessionService.clearSession();
  });

  afterEach(() => {
    jest.clearAllTimers();
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
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSession));
      
      const session = await sessionService.getCurrentSession();
      
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
    it('should return current session ID', () => {
      const sessionId = sessionService.getSessionId();
      expect(typeof sessionId).toBe('string');
    });

    it('should return null when no session exists', async () => {
      await sessionService.clearSession();
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
    it('should set up app state listener on construction', () => {
      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });
  });
});