import appStateService from '../appStateService';
import { AppState } from 'react-native';

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

describe('appStateService', () => {
  it('should have the initial app state', () => {
    expect(appStateService.getAppState()).toBe('active');
  });

  it('should update the app state on change', () => {
    const service = new (appStateService as any)();
    const listener = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
    listener('background');
    expect(service.getAppState()).toBe('background');
    listener('active');
    expect(service.getAppState()).toBe('active');
  });
});
