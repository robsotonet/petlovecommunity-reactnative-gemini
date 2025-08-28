// Pet Love Community - Social Redux Slice
// State management for social platform features with offline support

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../store';

// Social state interfaces
export interface SocialUser {
  id: string;
  name: string;
  avatar?: string;
  shelterName?: string;
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

export interface SocialNotification {
  id: string;
  type: 'like_post' | 'like_comment' | 'comment' | 'follow' | 'mention' | 'new_post';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUserId?: string;
  actionUserName?: string;
  actionUserAvatar?: string;
  targetId?: string; // Post ID, Comment ID, etc.
  targetType?: 'post' | 'comment' | 'user';
}

export interface OfflineSocialAction {
  id: string;
  type: 'like_post' | 'like_comment' | 'create_comment' | 'create_post' | 'follow_user';
  timestamp: string;
  payload: any;
  retryCount: number;
  maxRetries: number;
  correlationId: string;
}

export interface SocialPreferences {
  showNotifications: boolean;
  allowComments: boolean;
  allowSharing: boolean;
  autoFollowShelters: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationTypes: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    mentions: boolean;
    newPosts: boolean;
  };
}

export interface SocialState {
  // Current user social profile
  currentUser: SocialUser | null;
  
  // Feed preferences
  feedFilter: 'all' | 'adoption_success' | 'pet_spotlight' | 'shelter_update';
  feedSortBy: 'recent' | 'popular' | 'trending';
  
  // Notifications
  notifications: SocialNotification[];
  unreadNotificationsCount: number;
  notificationsLoading: boolean;
  
  // Offline queue
  offlineActions: OfflineSocialAction[];
  isOnline: boolean;
  
  // UI state
  createPostModalVisible: boolean;
  selectedPostId: string | null;
  commentsModalVisible: boolean;
  imageViewerVisible: boolean;
  selectedImages: string[];
  currentImageIndex: number;
  
  // User interactions tracking
  likedPosts: Set<string>;
  likedComments: Set<string>;
  followedUsers: Set<string>;
  
  // Preferences
  preferences: SocialPreferences;
  
  // Draft content
  draftPost: {
    content: string;
    images: string[];
    postType: 'adoption_success' | 'general' | 'pet_spotlight' | 'shelter_update';
    tags: string[];
    petId?: string;
    petName?: string;
  } | null;
  
  // Analytics
  socialAnalytics: {
    postsCreated: number;
    likesReceived: number;
    commentsReceived: number;
    sharesReceived: number;
    profileViews: number;
    lastAnalyticsSync: string | null;
  };
}

// Initial state
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

// Social slice
const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    // User management
    setCurrentUser: (state, action: PayloadAction<SocialUser>) => {
      state.currentUser = action.payload;
    },
    
    updateCurrentUser: (state, action: PayloadAction<Partial<SocialUser>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
    
    clearCurrentUser: (state) => {
      state.currentUser = null;
      state.likedPosts = new Set();
      state.likedComments = new Set();
      state.followedUsers = new Set();
    },

    // Feed management
    setFeedFilter: (state, action: PayloadAction<SocialState['feedFilter']>) => {
      state.feedFilter = action.payload;
    },
    
    setFeedSortBy: (state, action: PayloadAction<SocialState['feedSortBy']>) => {
      state.feedSortBy = action.payload;
    },

    // Notifications
    addNotifications: (state, action: PayloadAction<SocialNotification[]>) => {
      const existingIds = new Set(state.notifications.map(n => n.id));
      const newNotifications = action.payload.filter(n => !existingIds.has(n.id));
      
      state.notifications = [
        ...newNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        ...state.notifications,
      ].slice(0, 100); // Keep only latest 100 notifications
      
      state.unreadNotificationsCount = state.notifications.filter(n => !n.isRead).length;
    },
    
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadNotificationsCount = Math.max(0, state.unreadNotificationsCount - 1);
      }
    },
    
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(n => n.isRead = true);
      state.unreadNotificationsCount = 0;
    },
    
    setNotificationsLoading: (state, action: PayloadAction<boolean>) => {
      state.notificationsLoading = action.payload;
    },

    // Offline queue management
    addOfflineAction: (state, action: PayloadAction<Omit<OfflineSocialAction, 'id' | 'timestamp' | 'retryCount'>>) => {
      const offlineAction: OfflineSocialAction = {
        ...action.payload,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
      state.offlineActions.push(offlineAction);
    },
    
    removeOfflineAction: (state, action: PayloadAction<string>) => {
      state.offlineActions = state.offlineActions.filter(offlineAction => offlineAction.id !== action.payload);
    },
    
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const action_item = state.offlineActions.find(a => a.id === action.payload);
      if (action_item) {
        action_item.retryCount++;
      }
    },
    
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },

    // UI state management
    setCreatePostModalVisible: (state, action: PayloadAction<boolean>) => {
      state.createPostModalVisible = action.payload;
      if (!action.payload) {
        // Clear draft when closing modal (unless user explicitly saved it)
        state.draftPost = null;
      }
    },
    
    setSelectedPostId: (state, action: PayloadAction<string | null>) => {
      state.selectedPostId = action.payload;
    },
    
    setCommentsModalVisible: (state, action: PayloadAction<boolean>) => {
      state.commentsModalVisible = action.payload;
    },
    
    openImageViewer: (state, action: PayloadAction<{ images: string[]; index: number }>) => {
      state.imageViewerVisible = true;
      state.selectedImages = action.payload.images;
      state.currentImageIndex = action.payload.index;
    },
    
    closeImageViewer: (state) => {
      state.imageViewerVisible = false;
      state.selectedImages = [];
      state.currentImageIndex = 0;
    },
    
    setImageViewerIndex: (state, action: PayloadAction<number>) => {
      state.currentImageIndex = action.payload;
    },

    // User interactions
    togglePostLike: (state, action: PayloadAction<{ postId: string; isLiked: boolean }>) => {
      const { postId, isLiked } = action.payload;
      if (isLiked) {
        state.likedPosts.add(postId);
      } else {
        state.likedPosts.delete(postId);
      }
    },
    
    toggleCommentLike: (state, action: PayloadAction<{ commentId: string; isLiked: boolean }>) => {
      const { commentId, isLiked } = action.payload;
      if (isLiked) {
        state.likedComments.add(commentId);
      } else {
        state.likedComments.delete(commentId);
      }
    },
    
    toggleUserFollow: (state, action: PayloadAction<{ userId: string; isFollowing: boolean }>) => {
      const { userId, isFollowing } = action.payload;
      if (isFollowing) {
        state.followedUsers.add(userId);
      } else {
        state.followedUsers.delete(userId);
      }
    },

    // Preferences
    updatePreferences: (state, action: PayloadAction<Partial<SocialPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },

    // Draft management
    saveDraftPost: (state, action: PayloadAction<SocialState['draftPost']>) => {
      state.draftPost = action.payload;
    },
    
    clearDraftPost: (state) => {
      state.draftPost = null;
    },

    // Analytics
    updateSocialAnalytics: (state, action: PayloadAction<Partial<SocialState['socialAnalytics']>>) => {
      state.socialAnalytics = { ...state.socialAnalytics, ...action.payload };
    },
    
    incrementAnalytic: (state, action: PayloadAction<keyof Omit<SocialState['socialAnalytics'], 'lastAnalyticsSync'>>) => {
      state.socialAnalytics[action.payload]++;
      state.socialAnalytics.lastAnalyticsSync = new Date().toISOString();
    },

    // Reset state
    resetSocialState: () => initialState,
  },
});

// Export actions
export const {
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
} = socialSlice.actions;

// Export selectors
export const selectCurrentUser = (state: RootState) => state.social.currentUser;
export const selectFeedFilter = (state: RootState) => state.social.feedFilter;
export const selectFeedSortBy = (state: RootState) => state.social.feedSortBy;
export const selectNotifications = (state: RootState) => state.social.notifications;
export const selectUnreadNotificationsCount = (state: RootState) => state.social.unreadNotificationsCount;
export const selectNotificationsLoading = (state: RootState) => state.social.notificationsLoading;
export const selectOfflineActions = (state: RootState) => state.social.offlineActions;
export const selectIsOnline = (state: RootState) => state.social.isOnline;
export const selectCreatePostModalVisible = (state: RootState) => state.social.createPostModalVisible;
export const selectSelectedPostId = (state: RootState) => state.social.selectedPostId;
export const selectCommentsModalVisible = (state: RootState) => state.social.commentsModalVisible;
export const selectImageViewerVisible = (state: RootState) => state.social.imageViewerVisible;
export const selectSelectedImages = (state: RootState) => state.social.selectedImages;
export const selectCurrentImageIndex = (state: RootState) => state.social.currentImageIndex;
export const selectLikedPosts = (state: RootState) => state.social.likedPosts;
export const selectLikedComments = (state: RootState) => state.social.likedComments;
export const selectFollowedUsers = (state: RootState) => state.social.followedUsers;
export const selectSocialPreferences = (state: RootState) => state.social.preferences;
export const selectDraftPost = (state: RootState) => state.social.draftPost;
export const selectSocialAnalytics = (state: RootState) => state.social.socialAnalytics;

// Complex selectors
export const selectHasOfflineActions = (state: RootState) => state.social.offlineActions.length > 0;
export const selectFailedOfflineActions = (state: RootState) => 
  state.social.offlineActions.filter(action => action.retryCount >= action.maxRetries);
export const selectPendingOfflineActions = (state: RootState) =>
  state.social.offlineActions.filter(action => action.retryCount < action.maxRetries);

export default socialSlice.reducer;