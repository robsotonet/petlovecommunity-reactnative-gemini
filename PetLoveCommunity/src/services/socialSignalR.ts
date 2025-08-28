// Pet Love Community - Social SignalR Service
// Real-time social platform updates via SignalR with mobile optimizations

import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { AppState, AppStateStatus } from 'react-native';
import { store } from '../store';
import { addNotifications, setOnlineStatus } from '../features/social/socialSlice';
import { socialApi } from './socialApi';
import correlationIdService from './correlationIdService';
import { loggingService } from './loggingService';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';

// SignalR event interfaces
export interface SocialSignalREvents {
  // Post events
  PostCreated: (post: any) => void;
  PostUpdated: (post: any) => void;
  PostDeleted: (postId: string) => void;
  PostLiked: (data: { postId: string; userId: string; userName: string; likesCount: number }) => void;
  PostUnliked: (data: { postId: string; userId: string; likesCount: number }) => void;
  
  // Comment events
  CommentCreated: (comment: any) => void;
  CommentUpdated: (comment: any) => void;
  CommentDeleted: (commentId: string, postId: string) => void;
  CommentLiked: (data: { commentId: string; userId: string; userName: string; likesCount: number }) => void;
  CommentUnliked: (data: { commentId: string; userId: string; likesCount: number }) => void;
  
  // User events
  UserFollowed: (data: { userId: string; followerId: string; followerName: string }) => void;
  UserUnfollowed: (data: { userId: string; followerId: string }) => void;
  
  // Notification events
  NotificationReceived: (notification: any) => void;
  NotificationsMarkedRead: (userId: string) => void;
  
  // Real-time engagement
  TypingStarted: (data: { postId: string; userId: string; userName: string }) => void;
  TypingStopped: (data: { postId: string; userId: string }) => void;
  UserOnline: (userId: string) => void;
  UserOffline: (userId: string) => void;
}

class SocialSignalRService {
  private connection: HubConnection | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private isReconnecting = false;
  private appStateSubscription: any = null;
  private netInfoSubscription: any = null;

  // Connection state
  private isConnected = false;
  private isInitialized = false;
  private currentUserId: string | null = null;
  private deviceId: string | null = null;

  // Event handlers storage
  private eventHandlers: Map<string, Function[]> = new Map();

  /**
   * Initialize the SignalR connection with authentication and device info
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get device information
      this.deviceId = await DeviceInfo.getDeviceId();
      const correlationId = await correlationIdService.getCorrelationId();

      // Get authentication token from store
      const state = store.getState();
      const token = state.auth?.token;
      const userId = state.auth?.user?.id;

      if (!token || !userId) {
        loggingService.warn('SocialSignalR: No authentication token, deferring initialization');
        return;
      }

      this.currentUserId = userId;

      // Build connection
      const baseUrl = process.env.REACT_APP_SIGNALR_BASE_URL || 'https://api.petlovecommunity.app';
      
      this.connection = new HubConnectionBuilder()
        .withUrl(`${baseUrl}/hubs/social`, {
          accessTokenFactory: () => token,
          transport: 1, // WebSockets only for mobile
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Custom retry logic for mobile
            const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
            loggingService.info(`SocialSignalR: Retrying connection in ${delay}ms`, {
              attempt: retryContext.previousRetryCount + 1,
              elapsedMs: retryContext.elapsedMilliseconds,
            });
            return delay;
          },
        })
        .configureLogging(LogLevel.Information)
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      // Set up connection event listeners
      this.connection.onreconnecting((error) => {
        this.isReconnecting = true;
        this.isConnected = false;
        store.dispatch(setOnlineStatus(false));
        loggingService.info('SocialSignalR: Reconnecting...', { error: error?.message });
      });

      this.connection.onreconnected((connectionId) => {
        this.isReconnecting = false;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        store.dispatch(setOnlineStatus(true));
        this.registerUserConnection();
        loggingService.info('SocialSignalR: Reconnected successfully', { connectionId });
      });

      this.connection.onclose((error) => {
        this.isConnected = false;
        store.dispatch(setOnlineStatus(false));
        loggingService.error('SocialSignalR: Connection closed', { error: error?.message });
        
        if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.attemptReconnect(), this.reconnectInterval);
        }
      });

      // Start connection
      await this.connection.start();
      this.isConnected = true;
      store.dispatch(setOnlineStatus(true));
      
      // Register user connection with device info
      await this.registerUserConnection();

      // Set up app state and network listeners
      this.setupMobileListeners();
      
      this.isInitialized = true;
      loggingService.info('SocialSignalR: Initialized successfully', {
        userId: this.currentUserId,
        deviceId: this.deviceId,
        correlationId,
      });

    } catch (error) {
      loggingService.error('SocialSignalR: Failed to initialize', { error });
      throw error;
    }
  }

  /**
   * Set up SignalR event handlers
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Post events
    this.connection.on('PostCreated', (post) => {
      loggingService.debug('SocialSignalR: PostCreated received', { postId: post.id });
      
      // Invalidate feed cache to show new post
      store.dispatch(socialApi.util.invalidateTags([{ type: 'Post', id: 'LIST' }]));
      this.emit('PostCreated', post);
    });

    this.connection.on('PostUpdated', (post) => {
      loggingService.debug('SocialSignalR: PostUpdated received', { postId: post.id });
      
      // Update specific post in cache
      store.dispatch(socialApi.util.invalidateTags([{ type: 'Post', id: post.id }]));
      this.emit('PostUpdated', post);
    });

    this.connection.on('PostDeleted', (postId) => {
      loggingService.debug('SocialSignalR: PostDeleted received', { postId });
      
      // Remove post from cache
      store.dispatch(socialApi.util.invalidateTags([
        { type: 'Post', id: postId },
        { type: 'Post', id: 'LIST' },
      ]));
      this.emit('PostDeleted', postId);
    });

    this.connection.on('PostLiked', (data) => {
      loggingService.debug('SocialSignalR: PostLiked received', data);
      
      // Update post in cache
      store.dispatch(
        socialApi.util.updateQueryData('getFeed', {}, (draft) => {
          const post = draft.posts.find(p => p.id === data.postId);
          if (post) {
            post.likes = data.likesCount;
            // Don't update isLiked here - that's managed by user actions
          }
        })
      );
      
      // Create notification if it's not the current user's like
      if (data.userId !== this.currentUserId) {
        const notification = {
          id: `like_${data.postId}_${data.userId}_${Date.now()}`,
          type: 'like_post' as const,
          title: 'Post Liked',
          message: `${data.userName} liked your post`,
          timestamp: new Date().toISOString(),
          isRead: false,
          actionUserId: data.userId,
          actionUserName: data.userName,
          targetId: data.postId,
          targetType: 'post' as const,
        };
        
        store.dispatch(addNotifications([notification]));
      }
      
      this.emit('PostLiked', data);
    });

    this.connection.on('PostUnliked', (data) => {
      loggingService.debug('SocialSignalR: PostUnliked received', data);
      
      // Update post in cache
      store.dispatch(
        socialApi.util.updateQueryData('getFeed', {}, (draft) => {
          const post = draft.posts.find(p => p.id === data.postId);
          if (post) {
            post.likes = data.likesCount;
          }
        })
      );
      
      this.emit('PostUnliked', data);
    });

    // Comment events
    this.connection.on('CommentCreated', (comment) => {
      loggingService.debug('SocialSignalR: CommentCreated received', { commentId: comment.id });
      
      // Update comments cache
      store.dispatch(socialApi.util.invalidateTags([
        { type: 'Comment', id: `POST_${comment.postId}` },
        { type: 'Post', id: comment.postId }, // Update comment count
      ]));
      
      // Create notification for post author
      if (comment.author.id !== this.currentUserId) {
        const notification = {
          id: `comment_${comment.id}_${Date.now()}`,
          type: 'comment' as const,
          title: 'New Comment',
          message: `${comment.author.name} commented on your post`,
          timestamp: comment.timestamp,
          isRead: false,
          actionUserId: comment.author.id,
          actionUserName: comment.author.name,
          actionUserAvatar: comment.author.avatar,
          targetId: comment.postId,
          targetType: 'post' as const,
        };
        
        store.dispatch(addNotifications([notification]));
      }
      
      this.emit('CommentCreated', comment);
    });

    // Notification events
    this.connection.on('NotificationReceived', (notification) => {
      loggingService.debug('SocialSignalR: NotificationReceived', { notificationId: notification.id });
      
      store.dispatch(addNotifications([notification]));
      this.emit('NotificationReceived', notification);
    });

    // User presence events
    this.connection.on('UserOnline', (userId) => {
      loggingService.debug('SocialSignalR: UserOnline', { userId });
      this.emit('UserOnline', userId);
    });

    this.connection.on('UserOffline', (userId) => {
      loggingService.debug('SocialSignalR: UserOffline', { userId });
      this.emit('UserOffline', userId);
    });
  }

  /**
   * Register user connection with the hub
   */
  private async registerUserConnection(): Promise<void> {
    if (!this.connection || !this.isConnected || !this.currentUserId) return;

    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      await this.connection.invoke('RegisterUserConnection', {
        userId: this.currentUserId,
        deviceId: this.deviceId,
        platform: 'mobile',
        correlationId,
      });
      
      loggingService.info('SocialSignalR: User connection registered', {
        userId: this.currentUserId,
        deviceId: this.deviceId,
      });
    } catch (error) {
      loggingService.error('SocialSignalR: Failed to register user connection', { error });
    }
  }

  /**
   * Set up mobile-specific listeners (app state, network changes)
   */
  private setupMobileListeners(): void {
    // App state listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Network state listener
    this.netInfoSubscription = NetInfo.addEventListener(this.handleNetworkChange.bind(this));
  }

  /**
   * Handle app state changes (background/foreground)
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      // App became active - reconnect if needed
      if (!this.isConnected && this.isInitialized) {
        this.attemptReconnect();
      }
    } else if (nextAppState === 'background') {
      // App went to background - maintain connection but reduce activity
      loggingService.info('SocialSignalR: App backgrounded, maintaining connection');
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: any): void {
    const isOnline = state.isConnected && state.isInternetReachable;
    store.dispatch(setOnlineStatus(isOnline));

    if (isOnline && !this.isConnected && this.isInitialized) {
      // Network came back online - attempt reconnection
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect to SignalR
   */
  private async attemptReconnect(): Promise<void> {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    this.isReconnecting = true;

    try {
      if (this.connection) {
        await this.connection.start();
        this.isConnected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        store.dispatch(setOnlineStatus(true));
        await this.registerUserConnection();
        
        loggingService.info('SocialSignalR: Reconnected successfully');
      }
    } catch (error) {
      this.isReconnecting = false;
      loggingService.error('SocialSignalR: Reconnection failed', { 
        error,
        attempt: this.reconnectAttempts,
      });

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.attemptReconnect(), this.reconnectInterval);
      }
    }
  }

  /**
   * Send typing indicator
   */
  public async sendTypingIndicator(postId: string, isTyping: boolean): Promise<void> {
    if (!this.connection || !this.isConnected) return;

    try {
      await this.connection.invoke(isTyping ? 'StartTyping' : 'StopTyping', postId);
    } catch (error) {
      loggingService.error('SocialSignalR: Failed to send typing indicator', { error, postId, isTyping });
    }
  }

  /**
   * Join post-specific group for real-time updates
   */
  public async joinPostGroup(postId: string): Promise<void> {
    if (!this.connection || !this.isConnected) return;

    try {
      await this.connection.invoke('JoinPostGroup', postId);
      loggingService.debug('SocialSignalR: Joined post group', { postId });
    } catch (error) {
      loggingService.error('SocialSignalR: Failed to join post group', { error, postId });
    }
  }

  /**
   * Leave post-specific group
   */
  public async leavePostGroup(postId: string): Promise<void> {
    if (!this.connection || !this.isConnected) return;

    try {
      await this.connection.invoke('LeavePostGroup', postId);
      loggingService.debug('SocialSignalR: Left post group', { postId });
    } catch (error) {
      loggingService.error('SocialSignalR: Failed to leave post group', { error, postId });
    }
  }

  /**
   * Event emitter functionality
   */
  public on<K extends keyof SocialSignalREvents>(event: K, handler: SocialSignalREvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler as Function);
  }

  public off<K extends keyof SocialSignalREvents>(event: K, handler: SocialSignalREvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler as Function);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof SocialSignalREvents>(event: K, ...args: Parameters<SocialSignalREvents[K]>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          loggingService.error(`SocialSignalR: Event handler error for ${event}`, { error });
        }
      });
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): {
    isConnected: boolean;
    isInitialized: boolean;
    isReconnecting: boolean;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      isInitialized: this.isInitialized,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Cleanup and disconnect
   */
  public async cleanup(): Promise<void> {
    try {
      // Remove mobile listeners
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
      
      if (this.netInfoSubscription) {
        this.netInfoSubscription();
        this.netInfoSubscription = null;
      }

      // Disconnect SignalR
      if (this.connection) {
        await this.connection.stop();
        this.connection = null;
      }

      // Reset state
      this.isConnected = false;
      this.isInitialized = false;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.eventHandlers.clear();

      loggingService.info('SocialSignalR: Cleanup completed');
    } catch (error) {
      loggingService.error('SocialSignalR: Cleanup failed', { error });
    }
  }
}

// Export singleton instance
export const socialSignalRService = new SocialSignalRService();
export default socialSignalRService;