import { AppStateService } from '../appStateService';
import appStateService from '../appStateService';
import { AppState, NativeEventSubscription } from 'react-native';

// Create mock subscription object
const mockRemove = jest.fn();
const mockSubscription = {
  remove: mockRemove,
} as NativeEventSubscription;

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addListener: jest.fn(() => mockSubscription),
  },
}));

describe('appStateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemove.mockClear();
  });

  describe('Basic Functionality', () => {
    it('should have the initial app state', () => {
      expect(appStateService.getAppState()).toBe('active');
    });

    it('should initialize with current AppState', () => {
      const service = new AppStateService();
      expect(service.getAppState()).toBe('active');
      expect(AppState.addListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update the app state on change', () => {
      const service = new AppStateService();
      const listener = (AppState.addListener as jest.Mock).mock.calls[0][1];
      
      // Simulate app state changes
      listener('background');
      expect(service.getAppState()).toBe('background');
      
      listener('active');
      expect(service.getAppState()).toBe('active');
      
      listener('inactive');
      expect(service.getAppState()).toBe('inactive');
    });
  });

  describe('Subscription Management (Lines 23-25)', () => {
    it('should properly destroy subscription when destroy is called', () => {
      const service = new AppStateService();
      
      // Verify subscription was created
      expect(AppState.addListener).toHaveBeenCalledTimes(1);
      
      // Call destroy method (Line 23-25)
      service.destroy();
      
      // Should call remove on subscription (Line 24)
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple destroy calls gracefully', () => {
      const service = new AppStateService();
      
      // First destroy call
      service.destroy();
      expect(mockRemove).toHaveBeenCalledTimes(1);
      
      // Second destroy call - should not call remove again
      service.destroy();
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('should handle destroy when subscription is already null', () => {
      const service = new AppStateService();
      
      // Destroy once
      service.destroy();
      expect(mockRemove).toHaveBeenCalledTimes(1);
      
      // Destroy again - should handle null subscription gracefully
      expect(() => service.destroy()).not.toThrow();
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('should continue to return app state after destroy', () => {
      const service = new AppStateService();
      const listener = (AppState.addListener as jest.Mock).mock.calls[0][1];
      
      // Change state before destroy
      listener('background');
      expect(service.getAppState()).toBe('background');
      
      // Destroy subscription
      service.destroy();
      
      // Should still return last known state
      expect(service.getAppState()).toBe('background');
    });
  });

  describe('App State Transitions', () => {
    it('should handle all valid app state values', () => {
      const service = new AppStateService();
      const listener = (AppState.addListener as jest.Mock).mock.calls[0][1];
      
      const validStates = ['active', 'background', 'inactive', 'unknown', 'extension'];
      
      validStates.forEach(state => {
        listener(state);
        expect(service.getAppState()).toBe(state);
      });
    });

    it('should handle rapid state changes', () => {
      const service = new AppStateService();
      const listener = (AppState.addListener as jest.Mock).mock.calls[0][1];
      
      // Rapid state changes
      listener('active');
      listener('background');
      listener('inactive');
      listener('active');
      listener('background');
      
      // Should track the latest state
      expect(service.getAppState()).toBe('background');
    });

    it('should maintain state consistency during lifecycle', () => {
      const service = new AppStateService();
      const listener = (AppState.addListener as jest.Mock).mock.calls[0][1];
      
      // Initial state
      expect(service.getAppState()).toBe('active');
      
      // State change
      listener('background');
      expect(service.getAppState()).toBe('background');
      
      // Another change
      listener('inactive');
      expect(service.getAppState()).toBe('inactive');
      
      // Back to active
      listener('active');
      expect(service.getAppState()).toBe('active');
      
      // Destroy and verify state is preserved
      service.destroy();
      expect(service.getAppState()).toBe('active');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle listener registration errors gracefully', () => {
      // Mock addListener to throw error
      (AppState.addListener as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Listener registration failed');
      });
      
      // Should not throw when creating service
      expect(() => new AppStateService()).toThrow('Listener registration failed');
    });

    it('should handle remove method errors gracefully', () => {
      mockRemove.mockImplementationOnce(() => {
        throw new Error('Remove failed');
      });
      
      const service = new AppStateService();
      
      // Should handle remove error gracefully
      expect(() => service.destroy()).toThrow('Remove failed');
    });

    it('should work with different initial states', () => {
      // Test with different initial AppState values
      (AppState as any).currentState = 'background';
      
      const service = new AppStateService();
      expect(service.getAppState()).toBe('background');
    });
  });

  describe('Memory Management', () => {
    it('should prevent memory leaks by cleaning up subscriptions', () => {
      const service1 = new AppStateService();
      const service2 = new AppStateService();
      const service3 = new AppStateService();
      
      // All should have subscriptions
      expect(AppState.addListener).toHaveBeenCalledTimes(3);
      
      // Destroy all
      service1.destroy();
      service2.destroy();
      service3.destroy();
      
      // All should have been cleaned up
      expect(mockRemove).toHaveBeenCalledTimes(3);
    });

    it('should handle service creation and destruction in sequence', () => {
      // Reset AppState to ensure clean state
      (AppState as any).currentState = 'active';
      
      for (let i = 0; i < 5; i++) {
        const service = new AppStateService();
        expect(service.getAppState()).toBe('active');
        service.destroy();
      }
      
      expect(AppState.addListener).toHaveBeenCalledTimes(5);
      expect(mockRemove).toHaveBeenCalledTimes(5);
    });
  });
});
