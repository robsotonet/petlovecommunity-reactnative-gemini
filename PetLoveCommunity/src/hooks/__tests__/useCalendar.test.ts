// Pet Love Community - useCalendar Hook Tests
// Unit tests for calendar hook including memory leak prevention and auto-sync behavior

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useCalendar from '../useCalendar';
import calendarService from '../../services/calendarService';
import petSlice from '../../features/pets/petSlice';

// Mock calendarService
jest.mock('../../services/calendarService', () => ({
  initialize: jest.fn(),
  getUpcomingAppointments: jest.fn(),
  getAvailableAppointments: jest.fn(),
  scheduleAppointment: jest.fn(),
  scheduleMeetAndGreet: jest.fn(),
  updateAppointmentStatus: jest.fn(),
  cancelAppointment: jest.fn(),
  addReminder: jest.fn(),
  syncWithServer: jest.fn(),
  clearExpiredEvents: jest.fn(),
  getAppointmentById: jest.fn(),
}));

// Mock useAdoptionAnalytics
jest.mock('../useAdoptionAnalytics', () => ({
  __esModule: true,
  default: () => ({
    trackDocumentAction: jest.fn(),
  }),
}));

// Mock timers
jest.useFakeTimers();

describe('useCalendar', () => {
  let store: ReturnType<typeof configureStore>;
  let mockCalendarService: jest.Mocked<typeof calendarService>;

  const createTestStore = (initialState = {}) => {
    return configureStore({
      reducer: {
        pets: petSlice,
      },
      preloadedState: {
        pets: {
          pets: [],
          isLoading: false,
          error: null,
          favorites: [],
          selectedPet: null,
          isOnline: true,
          ...initialState,
        },
      },
    });
  };

  const renderHookWithProvider = (options: any = {}) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => 
      React.createElement(Provider, { store }, children);
    return renderHook(() => useCalendar(options), { wrapper });
  };

  beforeEach(() => {
    store = createTestStore();
    mockCalendarService = calendarService as jest.Mocked<typeof calendarService>;
    
    // Reset all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Mock default calendar service responses
    mockCalendarService.initialize.mockResolvedValue();
    mockCalendarService.getUpcomingAppointments.mockResolvedValue([]);
    mockCalendarService.syncWithServer.mockResolvedValue({ synced: 1, errors: 0 });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Initialization', () => {
    it('should initialize calendar service on first render', async () => {
      const { result } = renderHookWithProvider();

      await act(async () => {
        await result.current.initialize();
      });

      expect(mockCalendarService.initialize).toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(true);
    });

    it('should load upcoming appointments after initialization', async () => {
      const mockAppointments = [
        {
          id: 'test-appointment-1',
          title: 'Meet & Greet with Fluffy',
          startDate: new Date(),
          endDate: new Date(),
          appointmentType: 'meet_and_greet' as const,
          shelterId: 'shelter-1',
          shelterName: 'Happy Tails Shelter',
          adopterId: 'user-123',
          status: 'scheduled' as const,
        },
      ];

      mockCalendarService.getUpcomingAppointments.mockResolvedValue(mockAppointments);

      const { result } = renderHookWithProvider();

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.upcomingAppointments).toEqual(mockAppointments);
    });
  });

  describe('Auto-sync functionality', () => {
    it('should start auto-sync when online and initialized', async () => {
      const { result } = renderHookWithProvider({ autoSync: true, syncInterval: 1 }); // 1 minute

      await act(async () => {
        await result.current.initialize();
      });

      // Fast-forward time to trigger sync
      await act(async () => {
        jest.advanceTimersByTime(60000); // 1 minute
      });

      await waitFor(() => {
        expect(mockCalendarService.syncWithServer).toHaveBeenCalled();
      });
    });

    it('should stop auto-sync when component unmounts', async () => {
      const { result, unmount } = renderHookWithProvider({ 
        autoSync: true, 
        syncInterval: 1 
      });

      await act(async () => {
        await result.current.initialize();
      });

      // Unmount the component
      unmount();

      // Fast-forward time - sync should not be called after unmount
      await act(async () => {
        jest.advanceTimersByTime(60000); // 1 minute
      });

      // syncWithServer might have been called during initialization, but not after unmount
      const callCountBeforeUnmount = mockCalendarService.syncWithServer.mock.calls.length;
      
      // Clear calls and advance time again
      mockCalendarService.syncWithServer.mockClear();
      
      await act(async () => {
        jest.advanceTimersByTime(60000); // Another minute
      });

      expect(mockCalendarService.syncWithServer).not.toHaveBeenCalled();
    });

    it('should prevent recursive sync scheduling after unmount', async () => {
      const { result, unmount } = renderHookWithProvider({ 
        autoSync: true, 
        syncInterval: 1 
      });

      await act(async () => {
        await result.current.initialize();
      });

      // Unmount component
      unmount();

      // Simulate multiple timer cycles to ensure no recursive calls
      await act(async () => {
        jest.advanceTimersByTime(180000); // 3 minutes
      });

      // Should not continue syncing after unmount
      const syncCallsAfterUnmount = mockCalendarService.syncWithServer.mock.calls.length;
      expect(syncCallsAfterUnmount).toBeLessThanOrEqual(1); // At most one call during initialization
    });

    it('should handle sync errors gracefully and continue auto-sync', async () => {
      mockCalendarService.syncWithServer.mockRejectedValueOnce(new Error('Sync error'));
      mockCalendarService.syncWithServer.mockResolvedValue({ synced: 0, errors: 1 });

      const { result } = renderHookWithProvider({ 
        autoSync: true, 
        syncInterval: 1 
      });

      await act(async () => {
        await result.current.initialize();
      });

      // Advance timer to trigger first sync (which will fail)
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Advance timer for second sync (which should succeed)
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Should have attempted sync despite previous error
      expect(mockCalendarService.syncWithServer).toHaveBeenCalledTimes(2);
    });

    it('should not auto-sync when offline', async () => {
      // Create store with offline state
      store = createTestStore({ isOnline: false });

      const { result } = renderHookWithProvider({ 
        autoSync: true, 
        syncInterval: 1 
      });

      await act(async () => {
        await result.current.initialize();
      });

      // Fast-forward time
      await act(async () => {
        jest.advanceTimersByTime(120000); // 2 minutes
      });

      // Sync should not be called when offline
      expect(mockCalendarService.syncWithServer).not.toHaveBeenCalled();
    });
  });

  describe('Memory leak prevention', () => {
    it('should clear timers on unmount', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHookWithProvider({ 
        autoSync: true, 
        syncInterval: 1 
      });

      await act(async () => {
        await result.current.initialize();
      });

      // Unmount component
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('should not execute scheduled callbacks after unmount', async () => {
      let callbackExecuted = false;
      
      // Mock syncCalendar to track execution
      const originalSyncWithServer = mockCalendarService.syncWithServer;
      mockCalendarService.syncWithServer.mockImplementation(async () => {
        callbackExecuted = true;
        return { synced: 1, errors: 0 };
      });

      const { result, unmount } = renderHookWithProvider({ 
        autoSync: true, 
        syncInterval: 1 
      });

      await act(async () => {
        await result.current.initialize();
      });

      // Immediately unmount before timer fires
      unmount();

      // Reset flag
      callbackExecuted = false;

      // Advance timer - callback should not execute due to mounted check
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      expect(callbackExecuted).toBe(false);

      // Restore original mock
      mockCalendarService.syncWithServer = originalSyncWithServer;
    });
  });

  describe('Manual sync controls', () => {
    it('should perform manual sync when requested', async () => {
      const { result } = renderHookWithProvider();

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.syncCalendar();
      });

      expect(mockCalendarService.syncWithServer).toHaveBeenCalled();
    });

    it('should prevent overlapping sync operations', async () => {
      mockCalendarService.syncWithServer.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ synced: 1, errors: 0 }), 100))
      );

      const { result } = renderHookWithProvider();

      await act(async () => {
        await result.current.initialize();
      });

      // Start two sync operations simultaneously
      const sync1Promise = result.current.syncCalendar();
      const sync2Promise = result.current.syncCalendar();

      await act(async () => {
        jest.advanceTimersByTime(150);
        await Promise.all([sync1Promise, sync2Promise]);
      });

      // Should only sync once due to overlapping prevention
      expect(mockCalendarService.syncWithServer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      mockCalendarService.initialize.mockRejectedValue(new Error('Init failed'));

      const { result } = renderHookWithProvider();

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.error).toContain('Init failed');
      expect(result.current.isInitialized).toBe(false);
    });

    it('should handle sync errors and set appropriate state', async () => {
      mockCalendarService.syncWithServer.mockRejectedValue(new Error('Network error'));

      const { result } = renderHookWithProvider();

      await act(async () => {
        await result.current.initialize();
      });

      const syncResult = await act(async () => {
        return await result.current.syncCalendar();
      });

      expect(syncResult).toEqual({ synced: 0, errors: 1 });
    });
  });

  describe('Cleanup operations', () => {
    it('should cleanup expired events', async () => {
      mockCalendarService.clearExpiredEvents.mockResolvedValue(5);

      const { result } = renderHookWithProvider();

      await act(async () => {
        await result.current.initialize();
      });

      const removedCount = await act(async () => {
        return await result.current.cleanupExpiredEvents();
      });

      expect(removedCount).toBe(5);
      expect(mockCalendarService.clearExpiredEvents).toHaveBeenCalled();
    });
  });
});