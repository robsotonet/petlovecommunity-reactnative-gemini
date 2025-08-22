import { AppStateService } from '../appStateService';
import appStateService from '../appStateService';
import { AppState } from 'react-native';

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
}));

describe('appStateService', () => {
  it('should have the initial app state', () => {
    expect(appStateService.getAppState()).toBe('active');
  });

  it('should update the app state on change', () => {
    // Clear previous calls
    (AppState.addListener as jest.Mock).mockClear();
    
    const service = new AppStateService();
    const listener = (AppState.addListener as jest.Mock).mock.calls[0][1];
    
    // Simulate app state changes
    listener('background');
    expect(service.getAppState()).toBe('background');
    
    listener('active');
    expect(service.getAppState()).toBe('active');
  });
});
