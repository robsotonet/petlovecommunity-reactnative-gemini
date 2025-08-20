import networkService from '../networkService';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

describe('networkService', () => {
  it('should be connected by default', () => {
    expect(networkService.getIsConnected()).toBe(false);
  });

  it('should update the connection status on change', () => {
    const service = new (networkService as any)();
    const listener = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
    listener({ isConnected: true });
    expect(service.getIsConnected()).toBe(true);
    listener({ isConnected: false });
    expect(service.getIsConnected()).toBe(false);
  });
});
