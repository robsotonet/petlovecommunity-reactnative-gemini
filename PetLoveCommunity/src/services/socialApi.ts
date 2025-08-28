// Pet Love Community - Social API Service
// RTK Query API integration for social platform features with enterprise headers

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';
import correlationIdService from './correlationIdService';
import { loggingService } from './loggingService';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

// Social API Types
export interface SocialPost {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    shelterName?: string;
    isVerified?: boolean;
  };
  content: string;
  images?: string[];
  timestamp: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  petId?: string;
  petName?: string;
  postType: 'adoption_success' | 'general' | 'pet_spotlight' | 'shelter_update';
  tags?: string[];
}

export interface SocialComment {
  id: string;
  postId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isVerified?: boolean;
  };
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  parentCommentId?: string;
  replies?: SocialComment[];
}

export interface CreatePostRequest {
  content: string;
  images?: string[];
  postType: SocialPost['postType'];
  tags?: string[];
  petId?: string;
  petName?: string;
}

export interface CreateCommentRequest {
  postId: string;
  content: string;
  parentCommentId?: string;
}

export interface LikeRequest {
  targetId: string;
  targetType: 'post' | 'comment';
}

export interface PostsResponse {
  posts: SocialPost[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface CommentsResponse {
  comments: SocialComment[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface FeedFilters {
  type?: 'all' | 'adoption_success' | 'pet_spotlight' | 'shelter_update';
  authorId?: string;
  petId?: string;
  tags?: string[];
  limit?: number;
  cursor?: string;
}

// Social API Definition
export const socialApi = createApi({
  reducerPath: 'socialApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'https://api.petlovecommunity.app',
    prepareHeaders: async (headers, { getState }) => {
      try {
        // Get authentication token
        const state = getState() as RootState;
        const token = state.auth?.token;
        
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }

        // Enterprise headers
        const correlationId = await correlationIdService.getCorrelationId();
        const deviceId = await DeviceInfo.getDeviceId();
        const appVersion = DeviceInfo.getVersion();
        
        headers.set('X-Correlation-ID', correlationId);
        headers.set('X-Device-ID', deviceId);
        headers.set('X-Platform', Platform.OS);
        headers.set('X-App-Version', appVersion);
        headers.set('Content-Type', 'application/json');

        return headers;
      } catch (error) {
        loggingService.error('Failed to prepare API headers', { error });
        return headers;
      }
    },
  }),
  tagTypes: ['Post', 'Comment', 'Like'],
  endpoints: (builder) => ({
    // Get social feed with pagination and filtering
    getFeed: builder.query<PostsResponse, FeedFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        
        if (filters.type && filters.type !== 'all') {
          params.append('type', filters.type);
        }
        if (filters.authorId) {
          params.append('authorId', filters.authorId);
        }
        if (filters.petId) {
          params.append('petId', filters.petId);
        }
        if (filters.tags && filters.tags.length > 0) {
          params.append('tags', filters.tags.join(','));
        }
        if (filters.limit) {
          params.append('limit', filters.limit.toString());
        }
        if (filters.cursor) {
          params.append('cursor', filters.cursor);
        }

        return {
          url: `/social/feed${params.toString() ? `?${params.toString()}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.posts.map(({ id }) => ({ type: 'Post' as const, id })),
              { type: 'Post', id: 'LIST' },
            ]
          : [{ type: 'Post', id: 'LIST' }],
      serializeQueryArgs: ({ queryArgs, endpointDefinition, endpointName }) => {
        const { cursor, ...otherArgs } = queryArgs;
        return { queryArgs: otherArgs, endpointDefinition, endpointName };
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.cursor) {
          // Pagination: merge new posts
          return {
            ...newItems,
            posts: [...currentCache.posts, ...newItems.posts],
          };
        } else {
          // Fresh load: replace cache
          return newItems;
        }
      },
      forceRefetch({ currentArg, previousArg }) {
        return !currentArg?.cursor && JSON.stringify(currentArg) !== JSON.stringify(previousArg);
      },
    }),

    // Get single post by ID
    getPost: builder.query<SocialPost, string>({
      query: (postId) => ({
        url: `/social/posts/${postId}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Post', id }],
    }),

    // Create new post
    createPost: builder.mutation<SocialPost, CreatePostRequest>({
      query: (postData) => ({
        url: '/social/posts',
        method: 'POST',
        body: postData,
      }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
      async onQueryStarted(postData, { dispatch, queryFulfilled }) {
        try {
          const { data: newPost } = await queryFulfilled;
          
          // Optimistically update the feed
          dispatch(
            socialApi.util.updateQueryData('getFeed', {}, (draft) => {
              draft.posts.unshift(newPost);
            })
          );
          
          loggingService.info('Post created successfully', {
            postId: newPost.id,
            postType: postData.postType,
          });
        } catch (error) {
          loggingService.error('Failed to create post', { error, postData });
        }
      },
    }),

    // Update post
    updatePost: builder.mutation<SocialPost, { postId: string; updates: Partial<CreatePostRequest> }>({
      query: ({ postId, updates }) => ({
        url: `/social/posts/${postId}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { postId }) => [{ type: 'Post', id: postId }],
    }),

    // Delete post
    deletePost: builder.mutation<void, string>({
      query: (postId) => ({
        url: `/social/posts/${postId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, postId) => [
        { type: 'Post', id: postId },
        { type: 'Post', id: 'LIST' },
      ],
    }),

    // Get comments for a post
    getComments: builder.query<CommentsResponse, { postId: string; cursor?: string; limit?: number }>({
      query: ({ postId, cursor, limit = 20 }) => {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        if (cursor) {
          params.append('cursor', cursor);
        }
        
        return {
          url: `/social/posts/${postId}/comments?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, { postId }) =>
        result
          ? [
              ...result.comments.map(({ id }) => ({ type: 'Comment' as const, id })),
              { type: 'Comment', id: `POST_${postId}` },
            ]
          : [{ type: 'Comment', id: `POST_${postId}` }],
      serializeQueryArgs: ({ queryArgs, endpointDefinition, endpointName }) => {
        const { cursor, ...otherArgs } = queryArgs;
        return { queryArgs: otherArgs, endpointDefinition, endpointName };
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.cursor) {
          // Pagination: merge new comments
          return {
            ...newItems,
            comments: [...currentCache.comments, ...newItems.comments],
          };
        } else {
          // Fresh load: replace cache
          return newItems;
        }
      },
      forceRefetch({ currentArg, previousArg }) {
        return !currentArg?.cursor && JSON.stringify(currentArg) !== JSON.stringify(previousArg);
      },
    }),

    // Create comment
    createComment: builder.mutation<SocialComment, CreateCommentRequest>({
      query: (commentData) => ({
        url: '/social/comments',
        method: 'POST',
        body: commentData,
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: 'Comment', id: `POST_${postId}` },
        { type: 'Post', id: postId }, // Update comment count on post
      ],
      async onQueryStarted(commentData, { dispatch, queryFulfilled }) {
        try {
          const { data: newComment } = await queryFulfilled;
          
          // Optimistically update comments
          dispatch(
            socialApi.util.updateQueryData(
              'getComments',
              { postId: commentData.postId },
              (draft) => {
                draft.comments.unshift(newComment);
                draft.totalCount++;
              }
            )
          );

          // Update post comment count
          dispatch(
            socialApi.util.updateQueryData('getFeed', {}, (draft) => {
              const post = draft.posts.find(p => p.id === commentData.postId);
              if (post) {
                post.comments++;
              }
            })
          );
          
          loggingService.info('Comment created successfully', {
            commentId: newComment.id,
            postId: commentData.postId,
          });
        } catch (error) {
          loggingService.error('Failed to create comment', { error, commentData });
        }
      },
    }),

    // Like/Unlike post or comment
    toggleLike: builder.mutation<{ isLiked: boolean; likesCount: number }, LikeRequest>({
      query: (likeData) => ({
        url: `/social/likes`,
        method: 'POST',
        body: likeData,
      }),
      invalidatesTags: (result, error, { targetId, targetType }) => 
        targetType === 'post' 
          ? [{ type: 'Post', id: targetId }]
          : [{ type: 'Comment', id: targetId }],
      async onQueryStarted(likeData, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          
          if (likeData.targetType === 'post') {
            // Optimistically update post likes
            dispatch(
              socialApi.util.updateQueryData('getFeed', {}, (draft) => {
                const post = draft.posts.find(p => p.id === likeData.targetId);
                if (post) {
                  post.isLiked = data.isLiked;
                  post.likes = data.likesCount;
                }
              })
            );
            
            dispatch(
              socialApi.util.updateQueryData('getPost', likeData.targetId, (draft) => {
                draft.isLiked = data.isLiked;
                draft.likes = data.likesCount;
              })
            );
          } else {
            // Optimistically update comment likes
            const postIds = ['all']; // We'd need to track which posts have loaded comments
            
            postIds.forEach(postId => {
              dispatch(
                socialApi.util.updateQueryData(
                  'getComments',
                  { postId },
                  (draft) => {
                    const updateComment = (comment: SocialComment) => {
                      if (comment.id === likeData.targetId) {
                        comment.isLiked = data.isLiked;
                        comment.likes = data.likesCount;
                      }
                      comment.replies?.forEach(updateComment);
                    };
                    draft.comments.forEach(updateComment);
                  }
                )
              );
            });
          }
          
          loggingService.info('Like toggled successfully', {
            targetId: likeData.targetId,
            targetType: likeData.targetType,
            isLiked: data.isLiked,
          });
        } catch (error) {
          loggingService.error('Failed to toggle like', { error, likeData });
        }
      },
    }),

    // Report post or comment
    reportContent: builder.mutation<void, { 
      targetId: string; 
      targetType: 'post' | 'comment';
      reason: string;
      description?: string;
    }>({
      query: (reportData) => ({
        url: '/social/reports',
        method: 'POST',
        body: reportData,
      }),
    }),

    // Get user's posts
    getUserPosts: builder.query<PostsResponse, { userId: string; cursor?: string; limit?: number }>({
      query: ({ userId, cursor, limit = 20 }) => {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        if (cursor) {
          params.append('cursor', cursor);
        }
        
        return {
          url: `/social/users/${userId}/posts?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, { userId }) =>
        result
          ? [
              ...result.posts.map(({ id }) => ({ type: 'Post' as const, id })),
              { type: 'Post', id: `USER_${userId}` },
            ]
          : [{ type: 'Post', id: `USER_${userId}` }],
    }),

    // Search posts
    searchPosts: builder.query<PostsResponse, {
      query: string;
      filters?: FeedFilters;
      cursor?: string;
      limit?: number;
    }>({
      query: ({ query, filters = {}, cursor, limit = 20 }) => {
        const params = new URLSearchParams();
        params.append('q', query);
        params.append('limit', limit.toString());
        
        if (cursor) {
          params.append('cursor', cursor);
        }
        if (filters.type && filters.type !== 'all') {
          params.append('type', filters.type);
        }
        if (filters.tags && filters.tags.length > 0) {
          params.append('tags', filters.tags.join(','));
        }
        
        return {
          url: `/social/search/posts?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Post'],
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetFeedQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useGetCommentsQuery,
  useCreateCommentMutation,
  useToggleLikeMutation,
  useReportContentMutation,
  useGetUserPostsQuery,
  useSearchPostsQuery,
  useLazyGetFeedQuery,
  useLazyGetCommentsQuery,
  useLazySearchPostsQuery,
} = socialApi;

export default socialApi;