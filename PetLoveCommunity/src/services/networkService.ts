import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { loggingService } from './loggingService';
import correlationIdService from './correlationIdService';

interface NetworkInfo {
  isConnected: boolean;
  connectionType: NetInfoStateType;
  isInternetReachable: boolean | null;
  strength?: number;
}

interface NetworkChangeListener {
  (networkInfo: NetworkInfo, previousState: NetworkInfo): void | Promise<void>;
}

class NetworkService {
  private currentNetworkInfo: NetworkInfo;
  private previousNetworkInfo: NetworkInfo | null = null;
  private listeners: Set<NetworkChangeListener> = new Set();
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 5;
  private reconnectionTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.currentNetworkInfo = {
      isConnected: false,
      connectionType: NetInfoStateType.none,
      isInternetReachable: null,
    };
    
    this.initialize();
  }

  /**
   * Initialize network monitoring
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get initial network state
      const initialState = await NetInfo.fetch();
      this.handleConnectivityChange(initialState);
      
      // Start monitoring network changes
      NetInfo.addEventListener(this.handleConnectivityChange);
      
      this.isInitialized = true;
      
      loggingService.info('NetworkService: Initialized', {
        initialState: this.currentNetworkInfo,
      });
    } catch (error) {
      loggingService.error('NetworkService: Failed to initialize', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private handleConnectivityChange = async (state: NetInfoState) => {
    const correlationId = await correlationIdService.getCorrelationId();
    
    this.previousNetworkInfo = { ...this.currentNetworkInfo };
    this.currentNetworkInfo = {
      isConnected: state.isConnected ?? false,
      connectionType: state.type,
      isInternetReachable: state.isInternetReachable,
      strength: state.details?.strength,
    };

    // Log network state change
    const wasConnected = this.previousNetworkInfo?.isConnected ?? false;
    const isNowConnected = this.currentNetworkInfo.isConnected;

    if (wasConnected !== isNowConnected) {
      loggingService.info('NetworkService: Connection state changed', {
        correlationId,
        wasConnected,
        isNowConnected,
        connectionType: this.currentNetworkInfo.connectionType,
        isInternetReachable: this.currentNetworkInfo.isInternetReachable,
      });

      // Reset reconnection attempts when connection is restored
      if (isNowConnected) {
        this.reconnectionAttempts = 0;
        if (this.reconnectionTimeout) {
          clearTimeout(this.reconnectionTimeout);
          this.reconnectionTimeout = null;
        }
      }
    }

    // Notify all listeners
    await this.notifyListeners();
  };

  /**
   * Notify all registered listeners of network state change
   */
  private async notifyListeners(): Promise<void> {
    if (!this.previousNetworkInfo) return;

    const promises = Array.from(this.listeners).map(async (listener) => {
      try {
        await listener(this.currentNetworkInfo, this.previousNetworkInfo!);
      } catch (error) {
        loggingService.error('NetworkService: Listener error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.allSettled(promises);
  };

  /**
   * Get current connection status
   */
  public getIsConnected(): boolean {
    return this.currentNetworkInfo.isConnected;
  }

  /**
   * Get detailed network information
   */
  public getNetworkInfo(): NetworkInfo {
    return { ...this.currentNetworkInfo };
  }

  /**
   * Check if internet is reachable (not just connected to network)
   */
  public getIsInternetReachable(): boolean {
    return this.currentNetworkInfo.isInternetReachable === true;
  }

  /**
   * Get connection quality estimate based on type and strength
   */
  public getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (!this.currentNetworkInfo.isConnected) return 'offline';

    const { connectionType, strength } = this.currentNetworkInfo;

    switch (connectionType) {
      case NetInfoStateType.wifi:
        if (!strength) return 'good';
        if (strength >= 80) return 'excellent';
        if (strength >= 60) return 'good';
        if (strength >= 40) return 'fair';
        return 'poor';

      case NetInfoStateType.cellular:
        if (!strength) return 'fair';
        if (strength >= 80) return 'good';
        if (strength >= 60) return 'fair';
        return 'poor';

      case NetInfoStateType.ethernet:
        return 'excellent';

      default:
        return 'fair';
    }
  }

  /**
   * Add listener for network state changes
   */
  public addNetworkChangeListener(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);
    
    loggingService.debug('NetworkService: Added network change listener', {
      totalListeners: this.listeners.size,
    });

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
      loggingService.debug('NetworkService: Removed network change listener', {
        totalListeners: this.listeners.size,
      });
    };
  }

  /**
   * Force refresh network state
   */
  public async refreshNetworkState(): Promise<NetworkInfo> {
    try {
      const state = await NetInfo.fetch();
      this.handleConnectivityChange(state);
      return this.getNetworkInfo();
    } catch (error) {
      loggingService.error('NetworkService: Failed to refresh network state', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return this.getNetworkInfo();
    }
  }

  /**
   * Attempt to reconnect (useful for triggering sync operations)
   */
  public async attemptReconnection(): Promise<boolean> {
    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      loggingService.warn('NetworkService: Max reconnection attempts reached', {
        attempts: this.reconnectionAttempts,
        maxAttempts: this.maxReconnectionAttempts,
      });
      return false;
    }

    this.reconnectionAttempts++;
    
    loggingService.info('NetworkService: Attempting reconnection', {
      attempt: this.reconnectionAttempts,
      maxAttempts: this.maxReconnectionAttempts,
    });

    const networkInfo = await this.refreshNetworkState();
    
    if (networkInfo.isConnected && networkInfo.isInternetReachable) {
      this.reconnectionAttempts = 0;
      return true;
    }

    // Schedule next attempt with exponential backoff
    const delayMs = Math.min(1000 * Math.pow(2, this.reconnectionAttempts), 30000);
    this.reconnectionTimeout = setTimeout(() => {
      this.attemptReconnection();
    }, delayMs);

    return false;
  }

  /**
   * Get network statistics
   */
  public getStatistics() {
    return {
      isConnected: this.currentNetworkInfo.isConnected,
      connectionType: this.currentNetworkInfo.connectionType,
      isInternetReachable: this.currentNetworkInfo.isInternetReachable,
      connectionQuality: this.getConnectionQuality(),
      reconnectionAttempts: this.reconnectionAttempts,
      maxReconnectionAttempts: this.maxReconnectionAttempts,
      activeListeners: this.listeners.size,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Cleanup service resources
   */
  public destroy(): void {
    this.listeners.clear();
    
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }
    
    this.reconnectionAttempts = 0;
    this.isInitialized = false;
    
    loggingService.info('NetworkService: Service destroyed', {
      finalState: this.currentNetworkInfo,
    });
  }
}

export { NetworkService };

const networkService = new NetworkService();
export default networkService;
