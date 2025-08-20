import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';

class AppStateService {
  private appState: AppStateStatus;
  private subscription: NativeEventSubscription | null = null;

  constructor() {
    this.appState = AppState.currentState;
    this.subscription = AppState.addListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    // You can add logic here to handle app state changes
    // For example, you might want to disconnect SignalR when the app goes to the background
    this.appState = nextAppState;
  };

  public getAppState(): AppStateStatus {
    return this.appState;
  }

  public destroy(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

export { AppStateService };

const appStateService = new AppStateService();
export default appStateService;
