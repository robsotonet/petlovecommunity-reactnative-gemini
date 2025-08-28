// Pet Love Community - Social SignalR Service Tests
// Comprehensive unit tests for the social SignalR service

// Mock Redux hooks before importing anything else
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
  useStore: jest.fn(() => ({
    getState: jest.fn(),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  })),
}));

import { socialSignalRService } from '../socialSignalR';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { store } from '../../store';
import { socialApi } from '../socialApi';
import { addNotifications, setOnlineStatus } from '../../features/social/socialSlice';
import correlationIdService from '../correlationIdService';
import { loggingService } from '../loggingService';
import DeviceInfo from 'react-native-device-info';

// Mock dependencies
jest.mock('@microsoft/signalr');
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));
jest.mock('@react-native-community/netinfo');
jest.mock('../../store');
jest.mock('../socialApi');
jest.mock('../../features/social/socialSlice');
jest.mock('../correlationIdService');
jest.mock('../loggingService');
jest.mock('react-native-device-info');

// Mock global process.env
const mockEnv = {
  REACT_APP_SIGNALR_BASE_URL: 'https://test-api.petlovecommunity.app',
};
Object.defineProperty(process, 'env', { value: mockEnv });

describe('SocialSignalRService', () => {
  let mockConnection: jest.Mocked<HubConnection>;
  let mockBuilder: jest.Mocked<HubConnectionBuilder>;
  let mockStore: any;
  const mockCorrelationId = 'test-correlation-id';
  const mockDeviceId = 'test-device-id';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HubConnection
    mockConnection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      invoke: jest.fn().mockResolvedValue(undefined),
      onreconnecting: jest.fn(),
      onreconnected: jest.fn(),
      onclose: jest.fn(),
      state: 'Connected' as any,
    } as any;

    // Mock HubConnectionBuilder
    mockBuilder = {
      withUrl: jest.fn().mockReturnThis(),
      withAutomaticReconnect: jest.fn().mockReturnThis(),
      configureLogging: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue(mockConnection),
    } as any;

    (HubConnectionBuilder as jest.Mock).mockImplementation(() => mockBuilder);

    // Mock store
    mockStore = {
      getState: jest.fn().mockReturnValue({
        auth: {
          token: 'test-token',
          user: { id: 'user-1' },
        },
      }),
      dispatch: jest.fn(),
    };
    (store as any).getState = mockStore.getState;
    (store as any).dispatch = mockStore.dispatch;

    // Mock other services
    (correlationIdService.getCorrelationId as jest.Mock).mockResolvedValue(mockCorrelationId);
    (DeviceInfo.getDeviceId as jest.Mock).mockResolvedValue(mockDeviceId);

    // Mock NetInfo
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(() => {});
    
    // Mock AppState
    (AppState.addEventListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
  });

  afterEach(async () => {
    // Clean up service state
    await socialSignalRService.cleanup();
  });

  describe('Initialization', () => {
    it('initializes SignalR connection with correct configuration', async () => {
      await socialSignalRService.initialize();

      expect(HubConnectionBuilder).toHaveBeenCalled();
      expect(mockBuilder.withUrl).toHaveBeenCalledWith(
        'https://test-api.petlovecommunity.app/hubs/social',
        {
          accessTokenFactory: expect.any(Function),
          transport: 1, // WebSockets only
        }
      );
      expect(mockBuilder.withAutomaticReconnect).toHaveBeenCalledWith({
        nextRetryDelayInMilliseconds: expect.any(Function),
      });
      expect(mockBuilder.configureLogging).toHaveBeenCalledWith(LogLevel.Information);
    });

    it('does not initialize when already initialized', async () => {
      await socialSignalRService.initialize();
      mockBuilder.build.mockClear();

      await socialSignalRService.initialize();

      expect(mockBuilder.build).not.toHaveBeenCalled();
    });

    it('defers initialization when no auth token', async () => {
      mockStore.getState.mockReturnValue({
        auth: { token: null, user: null },
      });

      await socialSignalRService.initialize();

      expect(mockBuilder.build).not.toHaveBeenCalled();
      expect(loggingService.warn).toHaveBeenCalledWith(
        'SocialSignalR: No authentication token, deferring initialization'
      );
    });

    it('sets up event handlers during initialization', async () => {
      await socialSignalRService.initialize();

      expect(mockConnection.on).toHaveBeenCalledWith('PostCreated', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('PostUpdated', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('PostDeleted', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('PostLiked', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('CommentCreated', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('NotificationReceived', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('UserOnline', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('UserOffline', expect.any(Function));
    });

    it('starts connection and registers user', async () => {
      await socialSignalRService.initialize();

      expect(mockConnection.start).toHaveBeenCalled();
      expect(mockConnection.invoke).toHaveBeenCalledWith('RegisterUserConnection', {
        userId: 'user-1',
        deviceId: mockDeviceId,
        platform: 'mobile',
        correlationId: mockCorrelationId,
      });
    });

    it('sets up mobile listeners', async () => {
      await socialSignalRService.initialize();

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(NetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('logs successful initialization', async () => {
      await socialSignalRService.initialize();

      expect(loggingService.info).toHaveBeenCalledWith(
        'SocialSignalR: Initialized successfully',
        {
          userId: 'user-1',
          deviceId: mockDeviceId,
          correlationId: mockCorrelationId,
        }
      );
    });

    it('handles initialization errors', async () => {
      const error = new Error('Connection failed');
      mockConnection.start.mockRejectedValue(error);

      await expect(socialSignalRService.initialize()).rejects.toThrow('Connection failed');
      expect(loggingService.error).toHaveBeenCalledWith(
        'SocialSignalR: Failed to initialize',
        { error }
      );
    });
  });

  describe('Connection Event Handlers', () => {
    beforeEach(async () => {
      await socialSignalRService.initialize();
    });

    it('handles reconnecting event', () => {
      const onReconnectingHandler = mockConnection.onreconnecting.mock.calls[0][0];
      const error = new Error('Connection lost');

      onReconnectingHandler(error);

      expect(mockStore.dispatch).toHaveBeenCalledWith(setOnlineStatus(false));
      expect(loggingService.info).toHaveBeenCalledWith(
        'SocialSignalR: Reconnecting...',
        { error: error.message }
      );
    });

    it('handles reconnected event', () => {
      const onReconnectedHandler = mockConnection.onreconnected.mock.calls[0][0];
      const connectionId = 'new-connection-id';

      onReconnectedHandler(connectionId);

      expect(mockStore.dispatch).toHaveBeenCalledWith(setOnlineStatus(true));
      expect(mockConnection.invoke).toHaveBeenCalledWith('RegisterUserConnection', {
        userId: 'user-1',
        deviceId: mockDeviceId,
        platform: 'mobile',
        correlationId: mockCorrelationId,
      });
      expect(loggingService.info).toHaveBeenCalledWith(
        'SocialSignalR: Reconnected successfully',
        { connectionId }
      );
    });

    it('handles close event', () => {
      const onCloseHandler = mockConnection.onclose.mock.calls[0][0];
      const error = new Error('Connection closed');

      onCloseHandler(error);

      expect(mockStore.dispatch).toHaveBeenCalledWith(setOnlineStatus(false));
      expect(loggingService.error).toHaveBeenCalledWith(
        'SocialSignalR: Connection closed',
        { error: error.message }
      );
    });
  });

  describe('SignalR Event Handlers', () => {
    beforeEach(async () => {
      await socialSignalRService.initialize();
    });

    it('handles PostCreated event', () => {
      const postCreatedHandler = mockConnection.on.mock.calls
        .find(([event]) => event === 'PostCreated')[1];
      
      const newPost = { id: 'post-1', content: 'New post' };
      postCreatedHandler(newPost);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        socialApi.util.invalidateTags([{ type: 'Post', id: 'LIST' }])
      );
      expect(loggingService.debug).toHaveBeenCalledWith(
        'SocialSignalR: PostCreated received',
        { postId: 'post-1' }
      );
    });

    it('handles PostUpdated event', () => {
      const postUpdatedHandler = mockConnection.on.mock.calls
        .find(([event]) => event === 'PostUpdated')[1];
      
      const updatedPost = { id: 'post-1', content: 'Updated post' };
      postUpdatedHandler(updatedPost);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        socialApi.util.invalidateTags([{ type: 'Post', id: 'post-1' }])
      );
    });

    it('handles PostDeleted event', () => {
      const postDeletedHandler = mockConnection.on.mock.calls
        .find(([event]) => event === 'PostDeleted')[1];
      
      postDeletedHandler('post-1');

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        socialApi.util.invalidateTags([
          { type: 'Post', id: 'post-1' },
          { type: 'Post', id: 'LIST' },
        ])
      );
    });

    it('handles PostLiked event and creates notification', () => {
      const postLikedHandler = mockConnection.on.mock.calls
        .find(([event]) => event === 'PostLiked')[1];
      
      const likeData = {
        postId: 'post-1',
        userId: 'user-2', // Different from current user
        userName: 'Jane Doe',
        likesCount: 5,
      };
      
      postLikedHandler(likeData);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        socialApi.util.updateQueryData('getFeed', {}, expect.any(Function))
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        addNotifications([
          expect.objectContaining({
            type: 'like_post',
            title: 'Post Liked',
            message: 'Jane Doe liked your post',
            actionUserId: 'user-2',
            actionUserName: 'Jane Doe',
            targetId: 'post-1',
            targetType: 'post',
          })
        ])
      );
    });

    it('does not create notification for own post like', () => {
      const postLikedHandler = mockConnection.on.mock.calls
        .find(([event]) => event === 'PostLiked')[1];
      
      const likeData = {
        postId: 'post-1',
        userId: 'user-1', // Same as current user
        userName: 'John Doe',
        likesCount: 5,
      };
      
      postLikedHandler(likeData);

      expect(mockStore.dispatch).not.toHaveBeenCalledWith(
        addNotifications(expect.any(Array))
      );
    });

    it('handles CommentCreated event and creates notification', () => {
      const commentCreatedHandler = mockConnection.on.mock.calls
        .find(([event]) => event === 'CommentCreated')[1];
      
      const comment = {
        id: 'comment-1',
        postId: 'post-1',
        author: {
          id: 'user-2',
          name: 'Jane Doe',
          avatar: 'avatar.jpg',
        },
        content: 'Great post!',
        timestamp: '2024-01-01T12:00:00Z',
      };
      
      commentCreatedHandler(comment);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        socialApi.util.invalidateTags([
          { type: 'Comment', id: 'POST_post-1' },
          { type: 'Post', id: 'post-1' },
        ])
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        addNotifications([
          expect.objectContaining({
            type: 'comment',
            title: 'New Comment',
            message: 'Jane Doe commented on your post',
            actionUserId: 'user-2',
            actionUserName: 'Jane Doe',
            actionUserAvatar: 'avatar.jpg',
            targetId: 'post-1',
            targetType: 'post',
          })
        ])
      );
    });

    it('handles NotificationReceived event', () => {
      const notificationHandler = mockConnection.on.mock.calls
        .find(([event]) => event === 'NotificationReceived')[1];
      
      const notification = {
        id: 'notif-1',
        type: 'like_post',
        title: 'Post Liked',
        message: 'Someone liked your post',
      };
      
      notificationHandler(notification);

      expect(mockStore.dispatch).toHaveBeenCalledWith(addNotifications([notification]));
      expect(loggingService.debug).toHaveBeenCalledWith(
        'SocialSignalR: NotificationReceived',
        { notificationId: 'notif-1' }
      );
    });

    it('handles UserOnline event', () => {
      const userOnlineHandler = mockConnection.on.mock.calls
        .find(([event]) => event === 'UserOnline')[1];
      
      userOnlineHandler('user-2');

      expect(loggingService.debug).toHaveBeenCalledWith(
        'SocialSignalR: UserOnline',
        { userId: 'user-2' }
      );
    });

    it('handles UserOffline event', () => {
      const userOfflineHandler = mockConnection.on.mock.calls
        .find(([event]) => event === 'UserOffline')[1];
      
      userOfflineHandler('user-2');

      expect(loggingService.debug).toHaveBeenCalledWith(
        'SocialSignalR: UserOffline',
        { userId: 'user-2' }
      );
    });
  });

  describe('Mobile App State Handling', () => {
    beforeEach(async () => {
      await socialSignalRService.initialize();
    });

    it('handles app state change to active', () => {
      const appStateHandler = (AppState.addEventListener as jest.Mock).mock.calls
        .find(([event]) => event === 'change')[1];
      
      // Simulate connection being lost
      const service = socialSignalRService as any;
      service.isConnected = false;
      service.isInitialized = true;

      appStateHandler('active');

      // Should attempt reconnection (tested via attemptReconnect method)
      expect(mockConnection.start).toHaveBeenCalledTimes(2); // Once during init, once during reconnect
    });

    it('handles app state change to background', () => {
      const appStateHandler = (AppState.addEventListener as jest.Mock).mock.calls
        .find(([event]) => event === 'change')[1];
      
      appStateHandler('background');

      expect(loggingService.info).toHaveBeenCalledWith(
        'SocialSignalR: App backgrounded, maintaining connection'
      );
    });
  });

  describe('Network State Handling', () => {
    beforeEach(async () => {
      await socialSignalRService.initialize();
    });

    it('handles network state change to online', () => {
      const networkHandler = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      
      // Simulate connection being lost
      const service = socialSignalRService as any;
      service.isConnected = false;
      service.isInitialized = true;

      networkHandler({
        isConnected: true,
        isInternetReachable: true,
      });

      expect(mockStore.dispatch).toHaveBeenCalledWith(setOnlineStatus(true));
    });

    it('handles network state change to offline', () => {
      const networkHandler = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      
      networkHandler({
        isConnected: false,
        isInternetReachable: false,
      });

      expect(mockStore.dispatch).toHaveBeenCalledWith(setOnlineStatus(false));
    });
  });

  describe('SignalR Methods', () => {
    beforeEach(async () => {
      await socialSignalRService.initialize();
    });

    it('sends typing indicator', async () => {
      await socialSignalRService.sendTypingIndicator('post-1', true);

      expect(mockConnection.invoke).toHaveBeenCalledWith('StartTyping', 'post-1');
    });

    it('sends stop typing indicator', async () => {
      await socialSignalRService.sendTypingIndicator('post-1', false);

      expect(mockConnection.invoke).toHaveBeenCalledWith('StopTyping', 'post-1');
    });

    it('joins post group', async () => {
      await socialSignalRService.joinPostGroup('post-1');

      expect(mockConnection.invoke).toHaveBeenCalledWith('JoinPostGroup', 'post-1');
      expect(loggingService.debug).toHaveBeenCalledWith(
        'SocialSignalR: Joined post group',
        { postId: 'post-1' }
      );
    });

    it('leaves post group', async () => {
      await socialSignalRService.leavePostGroup('post-1');

      expect(mockConnection.invoke).toHaveBeenCalledWith('LeavePostGroup', 'post-1');
      expect(loggingService.debug).toHaveBeenCalledWith(
        'SocialSignalR: Left post group',
        { postId: 'post-1' }
      );
    });

    it('handles method errors gracefully', async () => {
      mockConnection.invoke.mockRejectedValue(new Error('Method failed'));

      await socialSignalRService.sendTypingIndicator('post-1', true);

      expect(loggingService.error).toHaveBeenCalledWith(
        'SocialSignalR: Failed to send typing indicator',
        { error: expect.any(Error), postId: 'post-1', isTyping: true }
      );
    });

    it('handles methods when not connected', async () => {
      const service = socialSignalRService as any;
      service.isConnected = false;

      await socialSignalRService.sendTypingIndicator('post-1', true);

      expect(mockConnection.invoke).not.toHaveBeenCalled();
    });
  });

  describe('Event Emitter Functionality', () => {
    beforeEach(async () => {
      await socialSignalRService.initialize();
    });

    it('registers and calls event handlers', () => {
      const mockHandler = jest.fn();
      
      socialSignalRService.on('PostCreated', mockHandler);

      // Trigger the event handler internally
      const service = socialSignalRService as any;
      service.emit('PostCreated', { id: 'post-1' });

      expect(mockHandler).toHaveBeenCalledWith({ id: 'post-1' });
    });

    it('removes event handlers', () => {
      const mockHandler = jest.fn();
      
      socialSignalRService.on('PostCreated', mockHandler);
      socialSignalRService.off('PostCreated', mockHandler);

      // Trigger the event handler internally
      const service = socialSignalRService as any;
      service.emit('PostCreated', { id: 'post-1' });

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('handles event handler errors', () => {
      const mockHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      
      socialSignalRService.on('PostCreated', mockHandler);

      // Trigger the event handler internally
      const service = socialSignalRService as any;
      service.emit('PostCreated', { id: 'post-1' });

      expect(loggingService.error).toHaveBeenCalledWith(
        'SocialSignalR: Event handler error for PostCreated',
        { error: expect.any(Error) }
      );
    });
  });

  describe('Connection Status', () => {
    it('returns correct connection status', async () => {
      const status = socialSignalRService.getConnectionStatus();

      expect(status).toEqual({
        isConnected: false,
        isInitialized: false,
        isReconnecting: false,
        reconnectAttempts: 0,
      });

      await socialSignalRService.initialize();

      const statusAfterInit = socialSignalRService.getConnectionStatus();

      expect(statusAfterInit).toEqual({
        isConnected: true,
        isInitialized: true,
        isReconnecting: false,
        reconnectAttempts: 0,
      });
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await socialSignalRService.initialize();
    });

    it('cleans up all resources', async () => {
      const mockAppStateSubscription = { remove: jest.fn() };
      const mockNetInfoUnsubscribe = jest.fn();

      // Mock the subscriptions
      (AppState.addEventListener as jest.Mock).mockReturnValue(mockAppStateSubscription);
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockNetInfoUnsubscribe);

      // Re-initialize to set up subscriptions
      await socialSignalRService.cleanup();
      await socialSignalRService.initialize();

      await socialSignalRService.cleanup();

      expect(mockAppStateSubscription.remove).toHaveBeenCalled();
      expect(mockNetInfoUnsubscribe).toHaveBeenCalled();
      expect(mockConnection.stop).toHaveBeenCalled();
      expect(loggingService.info).toHaveBeenCalledWith('SocialSignalR: Cleanup completed');
    });

    it('handles cleanup errors gracefully', async () => {
      mockConnection.stop.mockRejectedValue(new Error('Stop failed'));

      await socialSignalRService.cleanup();

      expect(loggingService.error).toHaveBeenCalledWith(
        'SocialSignalR: Cleanup failed',
        { error: expect.any(Error) }
      );
    });

    it('resets service state after cleanup', async () => {
      await socialSignalRService.cleanup();

      const status = socialSignalRService.getConnectionStatus();
      expect(status).toEqual({
        isConnected: false,
        isInitialized: false,
        isReconnecting: false,
        reconnectAttempts: 0,
      });
    });
  });

  describe('Retry Logic', () => {
    it('calculates correct retry delays', async () => {
      await socialSignalRService.initialize();

      const retryDelayFunction = mockBuilder.withAutomaticReconnect.mock.calls[0][0].nextRetryDelayInMilliseconds;

      expect(retryDelayFunction({ previousRetryCount: 0 })).toBe(1000);
      expect(retryDelayFunction({ previousRetryCount: 1 })).toBe(2000);
      expect(retryDelayFunction({ previousRetryCount: 2 })).toBe(4000);
      expect(retryDelayFunction({ previousRetryCount: 10 })).toBe(30000); // Max delay
    });
  });

  describe('Authentication Token Factory', () => {
    it('returns correct token from store', async () => {
      await socialSignalRService.initialize();

      const tokenFactory = mockBuilder.withUrl.mock.calls[0][1].accessTokenFactory;
      const token = tokenFactory();

      expect(token).toBe('test-token');
    });

    it('handles missing token gracefully', async () => {
      mockStore.getState.mockReturnValue({
        auth: { token: null },
      });

      await socialSignalRService.initialize();

      const tokenFactory = mockBuilder.withUrl.mock.calls[0][1].accessTokenFactory;
      const token = tokenFactory();

      expect(token).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple initialization calls gracefully', async () => {
      await Promise.all([
        socialSignalRService.initialize(),
        socialSignalRService.initialize(),
        socialSignalRService.initialize(),
      ]);

      expect(mockBuilder.build).toHaveBeenCalledTimes(1);
    });

    it('handles user registration when user ID is missing', async () => {
      mockStore.getState.mockReturnValue({
        auth: { token: 'test-token', user: null },
      });

      await socialSignalRService.initialize();

      expect(mockConnection.invoke).not.toHaveBeenCalledWith(
        'RegisterUserConnection',
        expect.any(Object)
      );
    });

    it('handles missing environment variables', async () => {
      delete mockEnv.REACT_APP_SIGNALR_BASE_URL;

      await socialSignalRService.initialize();

      expect(mockBuilder.withUrl).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/hubs/social',
        expect.any(Object)
      );
    });
  });
});