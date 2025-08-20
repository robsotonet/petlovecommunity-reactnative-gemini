import { AppState, AppStateStatus } from 'react-native';

class AppStateService {
  private appState: AppStateStatus;

  constructor() {
    this.appState = AppState.currentState;
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    // You can add logic here to handle app state changes
    // For example, you might want to disconnect SignalR when the app goes to the background
    this.appState = nextAppState;
  };

  public getAppState(): AppStateStatus {
    return this.appState;
  }
}

const appStateService = new AppStateService();
export default appStateService;
