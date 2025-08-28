// Pet Love Community - Social Redux Slice Tests
// Comprehensive unit tests for the social Redux slice

import { enableMapSet } from 'immer';

// Enable MapSet plugin for Immer to handle Set operations
enableMapSet();

import socialSliceReducer, {
  setCurrentUser,
  updateCurrentUser,
  clearCurrentUser,
  setFeedFilter,
  setFeedSortBy,
  addNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  setNotificationsLoading,
  addOfflineAction,
  removeOfflineAction,
  incrementRetryCount,
  setOnlineStatus,
  setCreatePostModalVisible,
  setSelectedPostId,
  setCommentsModalVisible,
  openImageViewer,
  closeImageViewer,
  setImageViewerIndex,
  togglePostLike,
  toggleCommentLike,
  toggleUserFollow,
  updatePreferences,
  saveDraftPost,
  clearDraftPost,
  updateSocialAnalytics,
  incrementAnalytic,
  resetSocialState,
  SocialState,
  SocialUser,
  SocialNotification,
  SocialPreferences,
  selectCurrentUser,
  selectFeedFilter,
  selectIsOnline,
  selectNotifications,
  selectUnreadNotificationsCount,
  selectOfflineActions,
  selectHasOfflineActions,
  selectFailedOfflineActions,
  selectPendingOfflineActions,
} from '../socialSlice';

describe('socialSlice', () => {
  const initialState: SocialState = {
    currentUser: null,
    feedFilter: 'all',
    feedSortBy: 'recent',
    notifications: [],
    unreadNotificationsCount: 0,
    notificationsLoading: false,
    offlineActions: [],
    isOnline: true,
    createPostModalVisible: false,
    selectedPostId: null,
    commentsModalVisible: false,
    imageViewerVisible: false,
    selectedImages: [],
    currentImageIndex: 0,
    likedPosts: new Set(),
    likedComments: new Set(),
    followedUsers: new Set(),
    preferences: {
      showNotifications: true,
      allowComments: true,
      allowSharing: true,
      autoFollowShelters: false,
      emailNotifications: true,
      pushNotifications: true,
      notificationTypes: {
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
        newPosts: true,
      },
    },
    draftPost: null,
    socialAnalytics: {
      postsCreated: 0,
      likesReceived: 0,
      commentsReceived: 0,
      sharesReceived: 0,
      profileViews: 0,
      lastAnalyticsSync: null,
    },
  };

  describe('Initial State', () => {
    it('returns the initial state', () => {
      expect(socialSliceReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('User Management Actions', () => {
    const mockUser: SocialUser = {
      id: 'user-1',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      shelterName: 'Happy Paws Shelter',
      isVerified: true,
      followersCount: 100,
      followingCount: 50,
      postsCount: 25,
    };

    it('sets current user', () => {
      const action = setCurrentUser(mockUser);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.currentUser).toEqual(mockUser);
    });

    it('updates current user', () => {
      const stateWithUser = { ...initialState, currentUser: mockUser };
      const updates = { name: 'Jane Doe', followersCount: 150 };
      
      const action = updateCurrentUser(updates);
      const state = socialSliceReducer(stateWithUser, action);
      
      expect(state.currentUser).toEqual({
        ...mockUser,
        ...updates,
      });
    });

    it('does not update when current user is null', () => {
      const updates = { name: 'Jane Doe' };
      
      const action = updateCurrentUser(updates);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.currentUser).toBeNull();
    });

    it('clears current user and resets interaction tracking', () => {
      const stateWithData = {
        ...initialState,
        currentUser: mockUser,
        likedPosts: new Set(['post-1', 'post-2']),
        likedComments: new Set(['comment-1']),
        followedUsers: new Set(['user-2']),
      };
      
      const action = clearCurrentUser();
      const state = socialSliceReducer(stateWithData, action);
      
      expect(state.currentUser).toBeNull();
      expect(state.likedPosts).toEqual(new Set());
      expect(state.likedComments).toEqual(new Set());
      expect(state.followedUsers).toEqual(new Set());
    });
  });

  describe('Feed Management Actions', () => {
    it('sets feed filter', () => {
      const action = setFeedFilter('adoption_success');
      const state = socialSliceReducer(initialState, action);
      
      expect(state.feedFilter).toBe('adoption_success');
    });

    it('sets feed sort by', () => {
      const action = setFeedSortBy('popular');
      const state = socialSliceReducer(initialState, action);
      
      expect(state.feedSortBy).toBe('popular');
    });
  });

  describe('Notifications Actions', () => {
    const mockNotifications: SocialNotification[] = [
      {
        id: 'notif-1',
        type: 'like_post',
        title: 'Post Liked',
        message: 'Someone liked your post',
        timestamp: '2024-01-01T12:00:00Z',
        isRead: false,
        actionUserId: 'user-2',
        actionUserName: 'Jane Doe',
        targetId: 'post-1',
        targetType: 'post',
      },
      {
        id: 'notif-2',
        type: 'comment',
        title: 'New Comment',
        message: 'Someone commented on your post',
        timestamp: '2024-01-01T11:00:00Z',
        isRead: true,
        actionUserId: 'user-3',
        actionUserName: 'Bob Smith',
        targetId: 'post-1',
        targetType: 'post',
      },
    ];

    it('adds notifications and sorts by timestamp', () => {
      const action = addNotifications(mockNotifications);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.notifications).toHaveLength(2);
      expect(state.notifications[0].id).toBe('notif-1'); // More recent timestamp first
      expect(state.notifications[1].id).toBe('notif-2');
      expect(state.unreadNotificationsCount).toBe(1);
    });

    it('does not add duplicate notifications', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: [mockNotifications[0]],
        unreadNotificationsCount: 1,
      };
      
      const action = addNotifications([mockNotifications[0], mockNotifications[1]]);
      const state = socialSliceReducer(stateWithNotifications, action);
      
      expect(state.notifications).toHaveLength(2);
      expect(state.unreadNotificationsCount).toBe(1);
    });

    it('limits notifications to 100', () => {
      const manyNotifications = Array.from({ length: 120 }, (_, i) => ({
        id: `notif-${i}`,
        type: 'like_post' as const,
        title: 'Post Liked',
        message: `Notification ${i}`,
        timestamp: new Date(2024, 0, 1, 12, i).toISOString(),
        isRead: false,
      }));
      
      const action = addNotifications(manyNotifications);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.notifications).toHaveLength(100);
      expect(state.unreadNotificationsCount).toBe(100);
    });

    it('marks notification as read', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadNotificationsCount: 1,
      };
      
      const action = markNotificationAsRead('notif-1');
      const state = socialSliceReducer(stateWithNotifications, action);
      
      expect(state.notifications[0].isRead).toBe(true);
      expect(state.unreadNotificationsCount).toBe(0);
    });

    it('does not change count when marking already read notification', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadNotificationsCount: 1,
      };
      
      const action = markNotificationAsRead('notif-2'); // Already read
      const state = socialSliceReducer(stateWithNotifications, action);
      
      expect(state.unreadNotificationsCount).toBe(1);
    });

    it('marks all notifications as read', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadNotificationsCount: 1,
      };
      
      const action = markAllNotificationsAsRead();
      const state = socialSliceReducer(stateWithNotifications, action);
      
      expect(state.notifications.every(n => n.isRead)).toBe(true);
      expect(state.unreadNotificationsCount).toBe(0);
    });

    it('sets notifications loading state', () => {
      const action = setNotificationsLoading(true);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.notificationsLoading).toBe(true);
    });
  });

  describe('Offline Actions', () => {
    const mockOfflineAction = {
      type: 'like_post' as const,
      payload: { postId: 'post-1' },
      maxRetries: 3,
      correlationId: 'correlation-1',
    };

    it('adds offline action with generated ID and timestamp', () => {
      const action = addOfflineAction(mockOfflineAction);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.offlineActions).toHaveLength(1);
      expect(state.offlineActions[0]).toMatchObject({
        ...mockOfflineAction,
        retryCount: 0,
      });
      expect(state.offlineActions[0].id).toMatch(/offline_\d+_[a-z0-9]+/);
      expect(state.offlineActions[0].timestamp).toBeDefined();
    });

    it('removes offline action', () => {
      const stateWithAction = {
        ...initialState,
        offlineActions: [{
          ...mockOfflineAction,
          id: 'offline-1',
          timestamp: '2024-01-01T12:00:00Z',
          retryCount: 0,
        }],
      };
      
      const action = removeOfflineAction('offline-1');
      const state = socialSliceReducer(stateWithAction, action);
      
      expect(state.offlineActions).toHaveLength(0);
    });

    it('increments retry count', () => {
      const stateWithAction = {
        ...initialState,
        offlineActions: [{
          ...mockOfflineAction,
          id: 'offline-1',
          timestamp: '2024-01-01T12:00:00Z',
          retryCount: 0,
        }],
      };
      
      const action = incrementRetryCount('offline-1');
      const state = socialSliceReducer(stateWithAction, action);
      
      expect(state.offlineActions[0].retryCount).toBe(1);
    });

    it('sets online status', () => {
      const action = setOnlineStatus(false);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.isOnline).toBe(false);
    });
  });

  describe('UI State Actions', () => {
    it('sets create post modal visibility', () => {
      const action = setCreatePostModalVisible(true);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.createPostModalVisible).toBe(true);
    });

    it('clears draft when closing create post modal', () => {
      const stateWithDraft = {
        ...initialState,
        draftPost: {
          content: 'Draft content',
          images: [],
          postType: 'general' as const,
          tags: [],
        },
      };
      
      const action = setCreatePostModalVisible(false);
      const state = socialSliceReducer(stateWithDraft, action);
      
      expect(state.createPostModalVisible).toBe(false);
      expect(state.draftPost).toBeNull();
    });

    it('sets selected post ID', () => {
      const action = setSelectedPostId('post-1');
      const state = socialSliceReducer(initialState, action);
      
      expect(state.selectedPostId).toBe('post-1');
    });

    it('sets comments modal visibility', () => {
      const action = setCommentsModalVisible(true);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.commentsModalVisible).toBe(true);
    });

    it('opens image viewer', () => {
      const images = ['image1.jpg', 'image2.jpg'];
      const action = openImageViewer({ images, index: 1 });
      const state = socialSliceReducer(initialState, action);
      
      expect(state.imageViewerVisible).toBe(true);
      expect(state.selectedImages).toEqual(images);
      expect(state.currentImageIndex).toBe(1);
    });

    it('closes image viewer', () => {
      const stateWithViewer = {
        ...initialState,
        imageViewerVisible: true,
        selectedImages: ['image1.jpg'],
        currentImageIndex: 1,
      };
      
      const action = closeImageViewer();
      const state = socialSliceReducer(stateWithViewer, action);
      
      expect(state.imageViewerVisible).toBe(false);
      expect(state.selectedImages).toEqual([]);
      expect(state.currentImageIndex).toBe(0);
    });

    it('sets image viewer index', () => {
      const action = setImageViewerIndex(2);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.currentImageIndex).toBe(2);
    });
  });

  describe('User Interactions', () => {
    it('toggles post like on', () => {
      const action = togglePostLike({ postId: 'post-1', isLiked: true });
      const state = socialSliceReducer(initialState, action);
      
      expect(state.likedPosts.has('post-1')).toBe(true);
    });

    it('toggles post like off', () => {
      const stateWithLike = {
        ...initialState,
        likedPosts: new Set(['post-1']),
      };
      
      const action = togglePostLike({ postId: 'post-1', isLiked: false });
      const state = socialSliceReducer(stateWithLike, action);
      
      expect(state.likedPosts.has('post-1')).toBe(false);
    });

    it('toggles comment like on', () => {
      const action = toggleCommentLike({ commentId: 'comment-1', isLiked: true });
      const state = socialSliceReducer(initialState, action);
      
      expect(state.likedComments.has('comment-1')).toBe(true);
    });

    it('toggles comment like off', () => {
      const stateWithLike = {
        ...initialState,
        likedComments: new Set(['comment-1']),
      };
      
      const action = toggleCommentLike({ commentId: 'comment-1', isLiked: false });
      const state = socialSliceReducer(stateWithLike, action);
      
      expect(state.likedComments.has('comment-1')).toBe(false);
    });

    it('toggles user follow on', () => {
      const action = toggleUserFollow({ userId: 'user-1', isFollowing: true });
      const state = socialSliceReducer(initialState, action);
      
      expect(state.followedUsers.has('user-1')).toBe(true);
    });

    it('toggles user follow off', () => {
      const stateWithFollow = {
        ...initialState,
        followedUsers: new Set(['user-1']),
      };
      
      const action = toggleUserFollow({ userId: 'user-1', isFollowing: false });
      const state = socialSliceReducer(stateWithFollow, action);
      
      expect(state.followedUsers.has('user-1')).toBe(false);
    });
  });

  describe('Preferences', () => {
    const updatedPreferences: Partial<SocialPreferences> = {
      showNotifications: false,
      pushNotifications: false,
      notificationTypes: {
        likes: false,
        comments: true,
        follows: true,
        mentions: true,
        newPosts: false,
      },
    };

    it('updates preferences', () => {
      const action = updatePreferences(updatedPreferences);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.preferences).toEqual({
        ...initialState.preferences,
        ...updatedPreferences,
      });
    });
  });

  describe('Draft Management', () => {
    const mockDraftPost = {
      content: 'Draft post content',
      images: ['image1.jpg'],
      postType: 'pet_spotlight' as const,
      tags: ['dogs', 'cute'],
      petId: 'pet-1',
      petName: 'Max',
    };

    it('saves draft post', () => {
      const action = saveDraftPost(mockDraftPost);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.draftPost).toEqual(mockDraftPost);
    });

    it('clears draft post', () => {
      const stateWithDraft = {
        ...initialState,
        draftPost: mockDraftPost,
      };
      
      const action = clearDraftPost();
      const state = socialSliceReducer(stateWithDraft, action);
      
      expect(state.draftPost).toBeNull();
    });
  });

  describe('Analytics', () => {
    const mockAnalytics = {
      postsCreated: 5,
      likesReceived: 50,
      lastAnalyticsSync: '2024-01-01T12:00:00Z',
    };

    it('updates social analytics', () => {
      const action = updateSocialAnalytics(mockAnalytics);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.socialAnalytics).toEqual({
        ...initialState.socialAnalytics,
        ...mockAnalytics,
      });
    });

    it('increments analytic counter', () => {
      const action = incrementAnalytic('postsCreated');
      const state = socialSliceReducer(initialState, action);
      
      expect(state.socialAnalytics.postsCreated).toBe(1);
      expect(state.socialAnalytics.lastAnalyticsSync).toBeDefined();
    });

    it('increments existing analytic counter', () => {
      const stateWithAnalytics = {
        ...initialState,
        socialAnalytics: {
          ...initialState.socialAnalytics,
          likesReceived: 10,
        },
      };
      
      const action = incrementAnalytic('likesReceived');
      const state = socialSliceReducer(stateWithAnalytics, action);
      
      expect(state.socialAnalytics.likesReceived).toBe(11);
    });
  });

  describe('Reset State', () => {
    it('resets to initial state', () => {
      const modifiedState = {
        ...initialState,
        currentUser: {
          id: 'user-1',
          name: 'John Doe',
        } as SocialUser,
        feedFilter: 'adoption_success' as const,
        notifications: [
          {
            id: 'notif-1',
            type: 'like_post' as const,
            title: 'Test',
            message: 'Test',
            timestamp: '2024-01-01T12:00:00Z',
            isRead: false,
          },
        ],
        isOnline: false,
      };
      
      const action = resetSocialState();
      const state = socialSliceReducer(modifiedState, action);
      
      expect(state).toEqual(initialState);
    });
  });

  describe('Selectors', () => {
    const mockRootState = {
      social: {
        ...initialState,
        currentUser: {
          id: 'user-1',
          name: 'John Doe',
        } as SocialUser,
        feedFilter: 'pet_spotlight' as const,
        isOnline: false,
        notifications: [
          {
            id: 'notif-1',
            type: 'like_post' as const,
            title: 'Test',
            message: 'Test',
            timestamp: '2024-01-01T12:00:00Z',
            isRead: false,
          },
        ],
        unreadNotificationsCount: 1,
        offlineActions: [
          {
            id: 'offline-1',
            type: 'like_post' as const,
            payload: {},
            timestamp: '2024-01-01T12:00:00Z',
            retryCount: 0,
            maxRetries: 3,
            correlationId: 'corr-1',
          },
          {
            id: 'offline-2',
            type: 'create_post' as const,
            payload: {},
            timestamp: '2024-01-01T12:00:00Z',
            retryCount: 5,
            maxRetries: 3,
            correlationId: 'corr-2',
          },
        ],
      },
    };

    it('selects current user', () => {
      const user = selectCurrentUser(mockRootState);
      expect(user).toEqual({ id: 'user-1', name: 'John Doe' });
    });

    it('selects feed filter', () => {
      const filter = selectFeedFilter(mockRootState);
      expect(filter).toBe('pet_spotlight');
    });

    it('selects online status', () => {
      const isOnline = selectIsOnline(mockRootState);
      expect(isOnline).toBe(false);
    });

    it('selects notifications', () => {
      const notifications = selectNotifications(mockRootState);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe('notif-1');
    });

    it('selects unread notifications count', () => {
      const count = selectUnreadNotificationsCount(mockRootState);
      expect(count).toBe(1);
    });

    it('selects offline actions', () => {
      const actions = selectOfflineActions(mockRootState);
      expect(actions).toHaveLength(2);
    });

    it('selects has offline actions', () => {
      const hasActions = selectHasOfflineActions(mockRootState);
      expect(hasActions).toBe(true);
    });

    it('selects failed offline actions', () => {
      const failedActions = selectFailedOfflineActions(mockRootState);
      expect(failedActions).toHaveLength(1);
      expect(failedActions[0].id).toBe('offline-2');
    });

    it('selects pending offline actions', () => {
      const pendingActions = selectPendingOfflineActions(mockRootState);
      expect(pendingActions).toHaveLength(1);
      expect(pendingActions[0].id).toBe('offline-1');
    });
  });

  describe('Edge Cases', () => {
    it('handles Set operations correctly', () => {
      // Sets should be serializable for Redux
      const action = togglePostLike({ postId: 'post-1', isLiked: true });
      const state = socialSliceReducer(initialState, action);
      
      expect(state.likedPosts instanceof Set).toBe(true);
      expect(JSON.stringify(state)).toBeDefined();
    });

    it('handles empty arrays and null values', () => {
      const action = addNotifications([]);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.notifications).toEqual([]);
      expect(state.unreadNotificationsCount).toBe(0);
    });

    it('handles malformed notification data', () => {
      const malformedNotification = {
        id: 'notif-1',
        type: 'like_post' as const,
        title: 'Test',
        message: 'Test',
        timestamp: 'invalid-date',
        isRead: false,
      };
      
      const action = addNotifications([malformedNotification]);
      const state = socialSliceReducer(initialState, action);
      
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].timestamp).toBe('invalid-date');
    });
  });
});