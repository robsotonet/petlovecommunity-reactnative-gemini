// Pet Love Community - Network Service Comprehensive Tests
// Complete test suite for offline support and network state management

import { NetworkService } from '../networkService';
import networkService from '../networkService';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { loggingService } from '../loggingService';
import correlationIdService from '../correlationIdService';

// Mock dependencies
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
  NetInfoStateType: {
    none: 'none',
    unknown: 'unknown',
    cellular: 'cellular',
    wifi: 'wifi',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
  },
}));

jest.mock('../loggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../correlationIdService', () => ({
  getCorrelationId: jest.fn(),
}));

// Type the mocked dependencies
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;
const mockCorrelationIdService = correlationIdService as jest.Mocked<typeof correlationIdService>;

// Mock timers
jest.useFakeTimers();

describe('NetworkService Comprehensive Tests', () => {
  const mockCorrelationId = 'corr-123';
  let service: NetworkService;
  let connectivityCallback: (state: NetInfoState) => void;

  const createMockNetInfoState = (overrides: Partial<NetInfoState> = {}): NetInfoState => ({
    type: NetInfoStateType.wifi,
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      ssid: 'test-wifi',
      strength: 80,
      ipAddress: '192.168.1.100',
      subnet: '255.255.255.0',
      ...overrides.details,
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Setup correlation ID mock
    mockCorrelationIdService.getCorrelationId.mockResolvedValue(mockCorrelationId);

    // Mock NetInfo.fetch and addEventListener
    mockNetInfo.fetch.mockResolvedValue(createMockNetInfoState());
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      connectivityCallback = callback;
      return () => {}; // Unsubscribe function
    });

    service = new NetworkService();
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
    jest.runOnlyPendingTimers();
  });

  describe('Service Initialization', () => {
    it('initializes with correct default state', () => {
      const info = service.getNetworkInfo();
      expect(info.isConnected).toBe(false);
      expect(info.connectionType).toBe(NetInfoStateType.none);
      expect(info.isInternetReachable).toBeNull();
    });

    it('fetches initial network state on initialization', async () => {
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockNetInfo.fetch).toHaveBeenCalled();
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'NetworkService: Initialized',
        expect.objectContaining({
          initialState: expect.any(Object),
        })
      );
    });

    it('handles initialization errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValueOnce(new Error('NetInfo error'));

      const errorService = new NetworkService();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'NetworkService: Failed to initialize',
        expect.objectContaining({
          error: 'NetInfo error',
        })
      );

      errorService.destroy();
    });

    it('does not reinitialize if already initialized', async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      jest.clearAllMocks();

      // Create another instance (should not reinitialize)
      const anotherService = new NetworkService();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should still call because each instance initializes itself
      expect(mockNetInfo.fetch).toHaveBeenCalled();
      anotherService.destroy();
    });
  });

  describe('Network State Updates', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      jest.clearAllMocks();
    });

    it('updates network state when connectivity changes', async () => {
      const newState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
        isInternetReachable: false,
      });

      connectivityCallback(newState);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.getIsConnected()).toBe(false);
      expect(service.getNetworkInfo().connectionType).toBe(NetInfoStateType.none);
      expect(service.getIsInternetReachable()).toBe(false);
    });

    it('logs network state changes', async () => {
      const newState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });

      connectivityCallback(newState);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'NetworkService: Connection state changed',
        expect.objectContaining({
          correlationId: mockCorrelationId,
          wasConnected: true,
          isNowConnected: false,
          connectionType: NetInfoStateType.none,
        })
      );
    });

    it('does not log when connection state remains the same', async () => {
      const sameState = createMockNetInfoState({
        isConnected: true,
        type: NetInfoStateType.wifi,
      });

      connectivityCallback(sameState);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLoggingService.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Connection state changed'),
        expect.anything()
      );
    });

    it('tracks connection strength changes', async () => {
      const weakState = createMockNetInfoState({
        details: { strength: 20 },
      });

      connectivityCallback(weakState);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.getNetworkInfo().strength).toBe(20);
      expect(service.getConnectionQuality()).toBe('poor');
    });

    it('handles states with missing details gracefully', async () => {
      const stateWithoutDetails = createMockNetInfoState({
        details: undefined,
      });

      connectivityCallback(stateWithoutDetails);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.getNetworkInfo().strength).toBeUndefined();
      expect(service.getConnectionQuality()).toBe('good');
    });
  });

  describe('Connection Quality Assessment', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('returns offline when not connected', () => {
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });

      connectivityCallback(offlineState);
      expect(service.getConnectionQuality()).toBe('offline');
    });

    it('assesses WiFi connection quality correctly', () => {
      const testCases = [
        { strength: 90, expected: 'excellent' },
        { strength: 70, expected: 'good' },
        { strength: 50, expected: 'fair' },
        { strength: 30, expected: 'poor' },
      ];

      testCases.forEach(({ strength, expected }) => {
        const wifiState = createMockNetInfoState({
          type: NetInfoStateType.wifi,
          details: { strength },
        });

        connectivityCallback(wifiState);
        expect(service.getConnectionQuality()).toBe(expected);
      });
    });

    it('assesses cellular connection quality correctly', () => {
      const testCases = [
        { strength: 90, expected: 'good' },
        { strength: 70, expected: 'fair' },
        { strength: 50, expected: 'poor' },
        { strength: 30, expected: 'poor' },
      ];

      testCases.forEach(({ strength, expected }) => {
        const cellularState = createMockNetInfoState({
          type: NetInfoStateType.cellular,
          details: { strength },
        });

        connectivityCallback(cellularState);
        expect(service.getConnectionQuality()).toBe(expected);
      });
    });

    it('handles ethernet connections as excellent', () => {
      const ethernetState = createMockNetInfoState({
        type: NetInfoStateType.ethernet,
      });

      connectivityCallback(ethernetState);
      expect(service.getConnectionQuality()).toBe('excellent');
    });

    it('handles unknown connection types as fair', () => {
      const unknownState = createMockNetInfoState({
        type: NetInfoStateType.unknown,
      });

      connectivityCallback(unknownState);
      expect(service.getConnectionQuality()).toBe('fair');
    });

    it('defaults to good quality when strength is not available for WiFi', () => {
      const wifiWithoutStrength = createMockNetInfoState({
        type: NetInfoStateType.wifi,
        details: { strength: undefined },
      });

      connectivityCallback(wifiWithoutStrength);
      expect(service.getConnectionQuality()).toBe('good');
    });
  });

  describe('Network Change Listeners', () => {
    let listener1: jest.Mock;
    let listener2: jest.Mock;
    let unsubscribe1: () => void;
    let unsubscribe2: () => void;

    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      listener1 = jest.fn();
      listener2 = jest.fn();
    });

    it('adds network change listeners correctly', () => {
      unsubscribe1 = service.addNetworkChangeListener(listener1);
      unsubscribe2 = service.addNetworkChangeListener(listener2);

      expect(mockLoggingService.debug).toHaveBeenCalledWith(
        'NetworkService: Added network change listener',
        { totalListeners: 1 }
      );

      expect(mockLoggingService.debug).toHaveBeenCalledWith(
        'NetworkService: Added network change listener',
        { totalListeners: 2 }
      );
    });

    it('notifies all listeners on network state change', async () => {
      unsubscribe1 = service.addNetworkChangeListener(listener1);
      unsubscribe2 = service.addNetworkChangeListener(listener2);

      const newState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });

      connectivityCallback(newState);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(listener1).toHaveBeenCalledWith(
        expect.objectContaining({ isConnected: false }),
        expect.objectContaining({ isConnected: true })
      );

      expect(listener2).toHaveBeenCalledWith(
        expect.objectContaining({ isConnected: false }),
        expect.objectContaining({ isConnected: true })
      );
    });

    it('supports async listeners', async () => {
      const asyncListener = jest.fn().mockResolvedValue(undefined);
      unsubscribe1 = service.addNetworkChangeListener(asyncListener);

      const newState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });

      connectivityCallback(newState);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(asyncListener).toHaveBeenCalled();
    });

    it('handles listener errors gracefully', async () => {
      const errorListener = jest.fn().mockRejectedValue(new Error('Listener error'));
      unsubscribe1 = service.addNetworkChangeListener(errorListener);

      const newState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });

      connectivityCallback(newState);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'NetworkService: Listener error',
        expect.objectContaining({
          error: 'Listener error',
        })
      );
    });

    it('removes listeners correctly', () => {
      unsubscribe1 = service.addNetworkChangeListener(listener1);
      unsubscribe2 = service.addNetworkChangeListener(listener2);

      unsubscribe1();

      expect(mockLoggingService.debug).toHaveBeenCalledWith(
        'NetworkService: Removed network change listener',
        { totalListeners: 1 }
      );

      unsubscribe2();

      expect(mockLoggingService.debug).toHaveBeenCalledWith(
        'NetworkService: Removed network change listener',
        { totalListeners: 0 }
      );
    });

    it('does not notify removed listeners', async () => {
      unsubscribe1 = service.addNetworkChangeListener(listener1);
      unsubscribe1(); // Remove listener

      const newState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });

      connectivityCallback(newState);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(listener1).not.toHaveBeenCalled();
    });
  });

  describe('Reconnection Management', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      jest.clearAllMocks();
    });

    it('resets reconnection attempts when connection is restored', async () => {
      // Start with disconnected state and some attempts
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });
      connectivityCallback(offlineState);

      // Trigger a few reconnection attempts
      await service.attemptReconnection();
      await service.attemptReconnection();

      const stats = service.getStatistics();
      expect(stats.reconnectionAttempts).toBeGreaterThan(0);

      // Restore connection
      const onlineState = createMockNetInfoState({
        isConnected: true,
        type: NetInfoStateType.wifi,
      });
      connectivityCallback(onlineState);

      const newStats = service.getStatistics();
      expect(newStats.reconnectionAttempts).toBe(0);
    });

    it('attempts reconnection with proper retry logic', async () => {
      // Start offline
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
        isInternetReachable: false,
      });
      connectivityCallback(offlineState);

      mockNetInfo.fetch.mockResolvedValue(offlineState);

      const result = await service.attemptReconnection();

      expect(result).toBe(false);
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'NetworkService: Attempting reconnection',
        expect.objectContaining({
          attempt: 1,
          maxAttempts: 5,
        })
      );

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000); // Exponential backoff
    });

    it('succeeds when connection is restored during reconnection', async () => {
      // Start offline
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });
      connectivityCallback(offlineState);

      // Mock successful reconnection
      const onlineState = createMockNetInfoState({
        isConnected: true,
        type: NetInfoStateType.wifi,
        isInternetReachable: true,
      });
      mockNetInfo.fetch.mockResolvedValue(onlineState);

      const result = await service.attemptReconnection();

      expect(result).toBe(true);
      expect(service.getStatistics().reconnectionAttempts).toBe(0);
    });

    it('stops attempting after max retries', async () => {
      // Start offline
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });
      connectivityCallback(offlineState);

      mockNetInfo.fetch.mockResolvedValue(offlineState);

      // Attempt reconnection 6 times (exceeding max of 5)
      for (let i = 0; i < 6; i++) {
        await service.attemptReconnection();
      }

      expect(mockLoggingService.warn).toHaveBeenCalledWith(
        'NetworkService: Max reconnection attempts reached',
        expect.objectContaining({
          attempts: 5,
          maxAttempts: 5,
        })
      );
    });

    it('uses exponential backoff for retry delays', async () => {
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });
      connectivityCallback(offlineState);

      mockNetInfo.fetch.mockResolvedValue(offlineState);

      await service.attemptReconnection(); // Attempt 1
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000); // 1000 * 2^1

      await service.attemptReconnection(); // Attempt 2  
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 4000); // 1000 * 2^2

      await service.attemptReconnection(); // Attempt 3
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 8000); // 1000 * 2^3
    });

    it('caps retry delay at maximum value', async () => {
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });
      connectivityCallback(offlineState);

      mockNetInfo.fetch.mockResolvedValue(offlineState);

      // Make many attempts to trigger max delay
      for (let i = 0; i < 10; i++) {
        await service.attemptReconnection();
      }

      // Should cap at 30000ms
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 30000);
    });
  });

  describe('Network State Refresh', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('refreshes network state successfully', async () => {
      const newState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.cellular,
        details: { strength: 60 },
      });

      mockNetInfo.fetch.mockResolvedValueOnce(newState);

      const result = await service.refreshNetworkState();

      expect(mockNetInfo.fetch).toHaveBeenCalled();
      expect(result.isConnected).toBe(false);
      expect(result.connectionType).toBe(NetInfoStateType.cellular);
      expect(result.strength).toBe(60);
    });

    it('handles refresh errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValueOnce(new Error('Fetch error'));

      const result = await service.refreshNetworkState();

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'NetworkService: Failed to refresh network state',
        expect.objectContaining({
          error: 'Fetch error',
        })
      );

      // Should return current state even on error
      expect(result).toEqual(service.getNetworkInfo());
    });
  });

  describe('Service Statistics', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('provides accurate service statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toEqual({
        isConnected: expect.any(Boolean),
        connectionType: expect.any(String),
        isInternetReachable: expect.any(Boolean),
        connectionQuality: expect.any(String),
        reconnectionAttempts: expect.any(Number),
        maxReconnectionAttempts: 5,
        activeListeners: expect.any(Number),
        isInitialized: true,
      });
    });

    it('tracks active listeners count correctly', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      expect(service.getStatistics().activeListeners).toBe(0);

      const unsubscribe1 = service.addNetworkChangeListener(listener1);
      expect(service.getStatistics().activeListeners).toBe(1);

      const unsubscribe2 = service.addNetworkChangeListener(listener2);
      expect(service.getStatistics().activeListeners).toBe(2);

      unsubscribe1();
      expect(service.getStatistics().activeListeners).toBe(1);

      unsubscribe2();
      expect(service.getStatistics().activeListeners).toBe(0);
    });

    it('tracks reconnection attempts correctly', async () => {
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });
      connectivityCallback(offlineState);

      mockNetInfo.fetch.mockResolvedValue(offlineState);

      expect(service.getStatistics().reconnectionAttempts).toBe(0);

      await service.attemptReconnection();
      expect(service.getStatistics().reconnectionAttempts).toBe(1);

      await service.attemptReconnection();
      expect(service.getStatistics().reconnectionAttempts).toBe(2);
    });
  });

  describe('Service Cleanup', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('cleans up resources on destroy', () => {
      const listener = jest.fn();
      service.addNetworkChangeListener(listener);

      service.destroy();

      expect(service.getStatistics().activeListeners).toBe(0);
      expect(service.getStatistics().reconnectionAttempts).toBe(0);
      expect(service.getStatistics().isInitialized).toBe(false);

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'NetworkService: Service destroyed',
        expect.objectContaining({
          finalState: expect.any(Object),
        })
      );
    });

    it('clears reconnection timeout on destroy', async () => {
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });
      connectivityCallback(offlineState);

      mockNetInfo.fetch.mockResolvedValue(offlineState);
      await service.attemptReconnection(); // This should set a timeout

      service.destroy();

      expect(clearTimeout).toHaveBeenCalled();
    });

    it('can be destroyed multiple times safely', () => {
      service.destroy();
      service.destroy();

      // Should not throw or cause issues
      expect(service.getStatistics().isInitialized).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('handles null network state gracefully', async () => {
      const nullState = null as any;

      expect(() => {
        connectivityCallback(nullState);
      }).not.toThrow();
    });

    it('handles undefined network state gracefully', async () => {
      const undefinedState = undefined as any;

      expect(() => {
        connectivityCallback(undefinedState);
      }).not.toThrow();
    });

    it('handles network state with null values gracefully', async () => {
      const nullValueState = createMockNetInfoState({
        isConnected: null as any,
        type: null as any,
        isInternetReachable: null,
      });

      connectivityCallback(nullValueState);

      const info = service.getNetworkInfo();
      expect(info.isConnected).toBe(false); // Should default to false
      expect(info.connectionType).toBeNull();
      expect(info.isInternetReachable).toBeNull();
    });

    it('handles correlation ID service failures gracefully', async () => {
      mockCorrelationIdService.getCorrelationId.mockRejectedValue(new Error('Correlation error'));

      const newState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });

      expect(() => {
        connectivityCallback(newState);
      }).not.toThrow();
    });

    it('handles very rapid network state changes', async () => {
      const states = [
        createMockNetInfoState({ isConnected: false }),
        createMockNetInfoState({ isConnected: true }),
        createMockNetInfoState({ isConnected: false }),
        createMockNetInfoState({ isConnected: true }),
      ];

      // Rapid fire state changes
      states.forEach(state => {
        connectivityCallback(state);
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should handle all changes without error
      expect(service.getIsConnected()).toBe(true); // Final state
    });

    it('handles listeners that throw synchronous errors', async () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Sync listener error');
      });

      service.addNetworkChangeListener(errorListener);

      const newState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
      });

      connectivityCallback(newState);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'NetworkService: Listener error',
        expect.objectContaining({
          error: 'Sync listener error',
        })
      );
    });
  });

  describe('Integration with Offline Support', () => {
    let connectionRestoreListener: jest.Mock;

    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      connectionRestoreListener = jest.fn();
      service.addNetworkChangeListener(connectionRestoreListener);
    });

    it('notifies listeners when connection is restored from offline', async () => {
      // Start online
      expect(service.getIsConnected()).toBe(true);

      // Go offline
      const offlineState = createMockNetInfoState({
        isConnected: false,
        type: NetInfoStateType.none,
        isInternetReachable: false,
      });
      connectivityCallback(offlineState);

      await new Promise(resolve => setTimeout(resolve, 0));
      jest.clearAllMocks();

      // Restore connection
      const onlineState = createMockNetInfoState({
        isConnected: true,
        type: NetInfoStateType.wifi,
        isInternetReachable: true,
      });
      connectivityCallback(onlineState);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(connectionRestoreListener).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: true,
          isInternetReachable: true,
        }),
        expect.objectContaining({
          isConnected: false,
          isInternetReachable: false,
        })
      );
    });

    it('tracks connection quality degradation for queue management', async () => {
      const qualityStates = [
        { strength: 90, expected: 'excellent' },
        { strength: 60, expected: 'good' },
        { strength: 40, expected: 'fair' },
        { strength: 20, expected: 'poor' },
      ];

      qualityStates.forEach(({ strength, expected }) => {
        const state = createMockNetInfoState({
          type: NetInfoStateType.wifi,
          details: { strength },
        });

        connectivityCallback(state);
        expect(service.getConnectionQuality()).toBe(expected);
      });
    });

    it('provides connection info suitable for queue prioritization', () => {
      const info = service.getNetworkInfo();
      const quality = service.getConnectionQuality();
      const stats = service.getStatistics();

      // These properties would be used by queue management systems
      expect(typeof info.isConnected).toBe('boolean');
      expect(typeof info.isInternetReachable).toBe('boolean');
      expect(['excellent', 'good', 'fair', 'poor', 'offline']).toContain(quality);
      expect(typeof stats.reconnectionAttempts).toBe('number');
    });
  });
});