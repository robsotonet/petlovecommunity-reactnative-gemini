// Pet Love Community - Push Notification Service
// Enterprise-grade push notification management with Firebase Cloud Messaging

import { Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService } from './loggingService';
import correlationIdService from './correlationIdService';
import deviceInfoService from './deviceInfoService';

// Storage keys
const DEVICE_TOKEN_KEY = '@PetLoveCommunity:DeviceToken';
const NOTIFICATION_PREFERENCES_KEY = '@PetLoveCommunity:NotificationPreferences';
const NOTIFICATION_HISTORY_KEY = '@PetLoveCommunity:NotificationHistory';

// Notification categories and priorities
export enum NotificationCategory {
  ADOPTION_STATUS = 'adoption_status',
  APPLICATION_UPDATE = 'application_update',
  PET_AVAILABILITY = 'pet_availability',
  SHELTER_MESSAGE = 'shelter_message',
  SYSTEM_ALERT = 'system_alert',
  MARKETING = 'marketing',
}

export enum NotificationPriority {
  LOW = 'low',
  DEFAULT = 'default',
  HIGH = 'high',
  MAX = 'max',
}

export interface NotificationPreferences {
  adoptionStatus: boolean;
  applicationUpdates: boolean;
  petAvailability: boolean;
  shelterMessages: boolean;
  systemAlerts: boolean;
  marketing: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface ReceivedNotification {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  data: Record<string, any>;
  receivedAt: string;
  readAt?: string;
  correlationId: string;
}

export interface NotificationRegistrationResult {
  success: boolean;
  deviceToken?: string;
  correlationId: string;
  error?: string;
}

interface NotificationHandler {
  (notification: ReceivedNotification): void | Promise<void>;
}

class PushNotificationService {
  private static readonly MAX_HISTORY_SIZE = 100;
  private static readonly TOKEN_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  private isInitialized = false;
  private deviceToken: string | null = null;
  private preferences: NotificationPreferences;
  private handlers: Set<NotificationHandler> = new Set();
  private notificationHistory: ReceivedNotification[] = [];
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.preferences = this.getDefaultPreferences();
  }

  /**
   * Initialize push notification service
   */
  async initialize(): Promise<NotificationRegistrationResult> {
    if (this.isInitialized) {
      return {
        success: true,
        deviceToken: this.deviceToken || undefined,
        correlationId: await correlationIdService.getCorrelationId(),
      };
    }

    const correlationId = await correlationIdService.getCorrelationId();

    try {
      loggingService.info('PushNotificationService: Initializing', { correlationId });

      // Load stored preferences and history
      await this.loadPreferences();
      await this.loadNotificationHistory();

      // Request notification permissions
      const permissionResult = await this.requestNotificationPermissions();
      if (!permissionResult.success) {
        return {
          success: false,
          error: permissionResult.error,
          correlationId,
        };
      }

      // Get or refresh device token
      const tokenResult = await this.getDeviceToken();
      if (!tokenResult.success) {
        return {
          success: false,
          error: tokenResult.error,
          correlationId,
        };
      }

      this.deviceToken = tokenResult.deviceToken!;

      // Set up message handlers
      this.setupMessageHandlers();

      // Start token refresh timer
      this.startTokenRefreshTimer();

      this.isInitialized = true;

      loggingService.info('PushNotificationService: Initialized successfully', {
        correlationId,
        deviceToken: this.deviceToken.substring(0, 20) + '...',
        platform: Platform.OS,
      });

      return {
        success: true,
        deviceToken: this.deviceToken,
        correlationId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      loggingService.error('PushNotificationService: Failed to initialize', {
        correlationId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        correlationId,
      };
    }
  }

  /**
   * Request notification permissions from the user
   */
  private async requestNotificationPermissions(): Promise<{ success: boolean; error?: string }> {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.NOTIFICATIONS
        : PERMISSIONS.ANDROID.POST_NOTIFICATIONS;

      const currentStatus = await check(permission);
      
      if (currentStatus === RESULTS.GRANTED) {
        return { success: true };
      }

      if (currentStatus === RESULTS.DENIED) {
        const requestResult = await request(permission);
        
        if (requestResult === RESULTS.GRANTED) {
          return { success: true };
        } else {
          return { 
            success: false, 
            error: 'Notification permission denied by user' 
          };
        }
      }

      return { 
        success: false, 
        error: `Notification permission status: ${currentStatus}` 
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Permission request failed',
      };
    }
  }

  /**
   * Get or refresh device token
   */
  private async getDeviceToken(): Promise<{ success: boolean; deviceToken?: string; error?: string }> {
    try {
      // Check for stored token first
      const storedToken = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
      if (storedToken) {
        // Verify token is still valid by attempting to get a fresh one
        try {
          const freshToken = await messaging().getToken();
          if (freshToken === storedToken) {
            return { success: true, deviceToken: storedToken };
          }
        } catch (verificationError) {
          loggingService.warn('PushNotificationService: Token verification failed, getting new token', {
            error: verificationError instanceof Error ? verificationError.message : 'Unknown error',
          });
        }
      }

      // Get fresh token
      const token = await messaging().getToken();
      
      if (!token) {
        return { success: false, error: 'Failed to get device token' };
      }

      // Store token
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
      
      loggingService.info('PushNotificationService: Device token obtained', {
        tokenPrefix: token.substring(0, 20),
        platform: Platform.OS,
      });

      return { success: true, deviceToken: token };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get device token',
      };
    }
  }

  /**
   * Set up Firebase message handlers
   */
  private setupMessageHandlers(): void {
    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      await this.handleReceivedMessage(remoteMessage, 'foreground');
    });

    // Handle background/quit state messages
    messaging().onNotificationOpenedApp(remoteMessage => {
      this.handleReceivedMessage(remoteMessage, 'background_opened');
    });

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        this.handleReceivedMessage(remoteMessage, 'quit_state_opened');
      }
    });

    // Handle token refresh
    messaging().onTokenRefresh(token => {
      this.handleTokenRefresh(token);
    });
  }

  /**
   * Handle received push notification message
   */
  private async handleReceivedMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    context: 'foreground' | 'background_opened' | 'quit_state_opened'
  ): Promise<void> {
    const correlationId = await correlationIdService.getCorrelationId();

    try {
      const notification: ReceivedNotification = {
        id: remoteMessage.messageId || `msg_${Date.now()}`,
        category: (remoteMessage.data?.category as NotificationCategory) || NotificationCategory.SYSTEM_ALERT,
        priority: (remoteMessage.data?.priority as NotificationPriority) || NotificationPriority.DEFAULT,
        title: remoteMessage.notification?.title || 'Pet Love Community',
        body: remoteMessage.notification?.body || 'You have a new notification',
        data: remoteMessage.data || {},
        receivedAt: new Date().toISOString(),
        correlationId,
      };

      // Check if notification should be processed based on preferences
      if (!this.shouldProcessNotification(notification)) {
        loggingService.debug('PushNotificationService: Notification filtered by preferences', {
          correlationId,
          category: notification.category,
          context,
        });
        return;
      }

      // Add to history
      this.addToHistory(notification);

      // Log notification
      loggingService.info('PushNotificationService: Notification received', {
        correlationId,
        notificationId: notification.id,
        category: notification.category,
        priority: notification.priority,
        context,
      });

      // Notify handlers
      await this.notifyHandlers(notification);

    } catch (error) {
      loggingService.error('PushNotificationService: Failed to handle received message', {
        correlationId,
        context,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle device token refresh
   */
  private async handleTokenRefresh(token: string): Promise<void> {
    const correlationId = await correlationIdService.getCorrelationId();

    try {
      this.deviceToken = token;
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);

      loggingService.info('PushNotificationService: Device token refreshed', {
        correlationId,
        tokenPrefix: token.substring(0, 20),
      });

      // Here you would typically send the new token to your backend
      // This is where you'd integrate with your API to update the token
      
    } catch (error) {
      loggingService.error('PushNotificationService: Failed to handle token refresh', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if notification should be processed based on user preferences
   */
  private shouldProcessNotification(notification: ReceivedNotification): boolean {
    // Check category preferences
    switch (notification.category) {
      case NotificationCategory.ADOPTION_STATUS:
        if (!this.preferences.adoptionStatus) return false;
        break;
      case NotificationCategory.APPLICATION_UPDATE:
        if (!this.preferences.applicationUpdates) return false;
        break;
      case NotificationCategory.PET_AVAILABILITY:
        if (!this.preferences.petAvailability) return false;
        break;
      case NotificationCategory.SHELTER_MESSAGE:
        if (!this.preferences.shelterMessages) return false;
        break;
      case NotificationCategory.MARKETING:
        if (!this.preferences.marketing) return false;
        break;
      case NotificationCategory.SYSTEM_ALERT:
        // System alerts always go through
        break;
      default:
        return false;
    }

    // Check quiet hours
    if (this.preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const startTime = this.preferences.quietHours.start;
      const endTime = this.preferences.quietHours.end;
      
      if (this.isInQuietHours(currentTime, startTime, endTime)) {
        // Only allow high priority notifications during quiet hours
        return notification.priority === NotificationPriority.HIGH || 
               notification.priority === NotificationPriority.MAX;
      }
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(current: string, start: string, end: string): boolean {
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const currentMinutes = timeToMinutes(current);
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    if (startMinutes <= endMinutes) {
      // Same day (e.g., 09:00 to 17:00)
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Cross midnight (e.g., 22:00 to 06:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  /**
   * Add notification to history
   */
  private addToHistory(notification: ReceivedNotification): void {
    this.notificationHistory.unshift(notification);
    
    // Keep history size manageable
    if (this.notificationHistory.length > PushNotificationService.MAX_HISTORY_SIZE) {
      this.notificationHistory = this.notificationHistory.slice(0, PushNotificationService.MAX_HISTORY_SIZE);
    }
    
    // Save to storage asynchronously
    this.saveNotificationHistory();
  }

  /**
   * Notify all registered handlers
   */
  private async notifyHandlers(notification: ReceivedNotification): Promise<void> {
    const promises = Array.from(this.handlers).map(async handler => {
      try {
        await handler(notification);
      } catch (error) {
        loggingService.error('PushNotificationService: Handler error', {
          notificationId: notification.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get current device token
   */
  public getDeviceToken(): string | null {
    return this.deviceToken;
  }

  /**
   * Get notification preferences
   */
  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Update notification preferences
   */
  public async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    const correlationId = await correlationIdService.getCorrelationId();

    this.preferences = { ...this.preferences, ...preferences };
    
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(this.preferences));
      
      loggingService.info('PushNotificationService: Preferences updated', {
        correlationId,
        updatedFields: Object.keys(preferences),
      });
    } catch (error) {
      loggingService.error('PushNotificationService: Failed to save preferences', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Add notification handler
   */
  public addNotificationHandler(handler: NotificationHandler): () => void {
    this.handlers.add(handler);
    
    loggingService.debug('PushNotificationService: Added notification handler', {
      totalHandlers: this.handlers.size,
    });

    // Return unsubscribe function
    return () => {
      this.handlers.delete(handler);
      loggingService.debug('PushNotificationService: Removed notification handler', {
        totalHandlers: this.handlers.size,
      });
    };
  }

  /**
   * Get notification history
   */
  public getNotificationHistory(): ReceivedNotification[] {
    return [...this.notificationHistory];
  }

  /**
   * Mark notification as read
   */
  public async markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (notification && !notification.readAt) {
      notification.readAt = new Date().toISOString();
      await this.saveNotificationHistory();
      
      loggingService.debug('PushNotificationService: Notification marked as read', {
        notificationId,
      });
    }
  }

  /**
   * Clear notification history
   */
  public async clearNotificationHistory(): Promise<void> {
    this.notificationHistory = [];
    await this.saveNotificationHistory();
    
    loggingService.info('PushNotificationService: Notification history cleared');
  }

  /**
   * Get service statistics
   */
  public getStatistics() {
    const unreadCount = this.notificationHistory.filter(n => !n.readAt).length;
    const categoryCounts = this.notificationHistory.reduce((acc, notification) => {
      acc[notification.category] = (acc[notification.category] || 0) + 1;
      return acc;
    }, {} as Record<NotificationCategory, number>);

    return {
      isInitialized: this.isInitialized,
      hasDeviceToken: this.deviceToken !== null,
      totalNotifications: this.notificationHistory.length,
      unreadCount,
      activeHandlers: this.handlers.size,
      categoryCounts,
      preferences: this.preferences,
    };
  }

  /**
   * Force token refresh
   */
  public async refreshToken(): Promise<NotificationRegistrationResult> {
    const correlationId = await correlationIdService.getCorrelationId();

    try {
      const result = await this.getDeviceToken();
      if (result.success) {
        this.deviceToken = result.deviceToken!;
      }
      
      return {
        success: result.success,
        deviceToken: result.deviceToken,
        error: result.error,
        correlationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
        correlationId,
      };
    }
  }

  /**
   * Start automatic token refresh timer
   */
  private startTokenRefreshTimer(): void {
    this.tokenRefreshTimer = setInterval(() => {
      this.refreshToken();
    }, PushNotificationService.TOKEN_REFRESH_INTERVAL);
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(): NotificationPreferences {
    return {
      adoptionStatus: true,
      applicationUpdates: true,
      petAvailability: true,
      shelterMessages: true,
      systemAlerts: true,
      marketing: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }

  /**
   * Load preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
      if (stored) {
        this.preferences = { ...this.getDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch (error) {
      loggingService.warn('PushNotificationService: Failed to load preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Load notification history from storage
   */
  private async loadNotificationHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
      if (stored) {
        this.notificationHistory = JSON.parse(stored);
      }
    } catch (error) {
      loggingService.warn('PushNotificationService: Failed to load notification history', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.notificationHistory = [];
    }
  }

  /**
   * Save notification history to storage
   */
  private async saveNotificationHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(this.notificationHistory));
    } catch (error) {
      loggingService.warn('PushNotificationService: Failed to save notification history', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Cleanup service resources
   */
  public destroy(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    this.handlers.clear();
    this.isInitialized = false;
    
    loggingService.info('PushNotificationService: Service destroyed', {
      totalNotifications: this.notificationHistory.length,
    });
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;