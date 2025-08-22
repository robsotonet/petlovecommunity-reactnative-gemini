import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

class NetworkService {
  private isConnected: boolean = false;

  constructor() {
    NetInfo.addEventListener(this.handleConnectivityChange);
  }

  private handleConnectivityChange = (state: NetInfoState) => {
    this.isConnected = state.isConnected ?? false;
  };

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export { NetworkService };

const networkService = new NetworkService();
export default networkService;
