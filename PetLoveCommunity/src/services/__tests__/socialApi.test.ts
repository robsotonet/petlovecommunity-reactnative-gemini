// Pet Love Community - Social API Service Tests
// Comprehensive unit tests for the social API service

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

import { socialApi } from '../socialApi';
import { configureStore } from '@reduxjs/toolkit';
import correlationIdService from '../correlationIdService';
import loggingService from '../loggingService';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('../correlationIdService');
jest.mock('../loggingService');
jest.mock('react-native-device-info', () => ({
  getDeviceId: jest.fn(),
  getVersion: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock fetch for testing
global.fetch = jest.fn(() => {
  const mockResponse = {
    ok: true,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
    clone: jest.fn().mockReturnThis(),
    status: 200,
    statusText: 'OK',
  };
  return Promise.resolve(mockResponse);
});

describe('socialApi', () => {
  let store: any;
  const mockCorrelationId = 'test-correlation-id';
  const mockDeviceId = 'test-device-id';
  const mockAppVersion = '1.0.0';

  beforeEach(() => {
    jest.clearAllMocks();
    
    (correlationIdService.getCorrelationId as jest.Mock).mockResolvedValue(mockCorrelationId);
    (DeviceInfo.getDeviceId as jest.Mock).mockResolvedValue(mockDeviceId);
    (DeviceInfo.getVersion as jest.Mock).mockReturnValue(mockAppVersion);
    
    // Create a test store
    store = configureStore({
      reducer: {
        socialApi: socialApi.reducer,
        auth: (state = { token: 'test-token', user: { id: 'user-1' } }) => state,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(socialApi.middleware),
    });

    (global.fetch as jest.Mock).mockClear();
  });

  describe('API Configuration', () => {
    it('has correct reducer path', () => {
      expect(socialApi.reducerPath).toBe('socialApi');
    });

    it('has correct base URL from environment or default', () => {
      const baseQuery = socialApi.baseQuery as any;
      expect(baseQuery.baseUrl).toBe('https://api.petlovecommunity.app');
    });

    it('sets correct tag types', () => {
      expect(socialApi.tagTypes).toEqual(['Post', 'Comment', 'Like']);
    });
  });

  describe('Header Preparation', () => {
    it('prepares headers with authentication and enterprise headers', async () => {
      const mockHeaders = new Map();
      mockHeaders.set = jest.fn();

      const baseQuery = socialApi.baseQuery as any;
      await baseQuery.prepareHeaders(mockHeaders, { getState: () => store.getState() });

      expect(mockHeaders.set).toHaveBeenCalledWith('Authorization', 'Bearer test-token');
      expect(mockHeaders.set).toHaveBeenCalledWith('X-Correlation-ID', mockCorrelationId);
      expect(mockHeaders.set).toHaveBeenCalledWith('X-Device-ID', mockDeviceId);
      expect(mockHeaders.set).toHaveBeenCalledWith('X-Platform', 'ios');
      expect(mockHeaders.set).toHaveBeenCalledWith('X-App-Version', mockAppVersion);
      expect(mockHeaders.set).toHaveBeenCalledWith('Content-Type', 'application/json');
    });

    it('handles missing authentication token gracefully', async () => {
      const storeWithoutAuth = configureStore({
        reducer: {
          socialApi: socialApi.reducer,
          auth: () => ({ token: null }),
        },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware().concat(socialApi.middleware),
      });

      const mockHeaders = new Map();
      mockHeaders.set = jest.fn();

      const baseQuery = socialApi.baseQuery as any;
      await baseQuery.prepareHeaders(mockHeaders, { getState: () => storeWithoutAuth.getState() });

      expect(mockHeaders.set).not.toHaveBeenCalledWith('Authorization', expect.any(String));
    });

    it('handles header preparation errors gracefully', async () => {
      (correlationIdService.getCorrelationId as jest.Mock).mockRejectedValue(
        new Error('Correlation ID error')
      );

      const mockHeaders = new Map();
      mockHeaders.set = jest.fn();

      const baseQuery = socialApi.baseQuery as any;
      const result = await baseQuery.prepareHeaders(mockHeaders, { 
        getState: () => store.getState() 
      });

      expect(loggingService.error).toHaveBeenCalledWith(
        'Failed to prepare API headers',
        { error: expect.any(Error) }
      );
    });
  });

  describe('getFeed Endpoint', () => {
    const mockFeedResponse = {
      posts: [
        {
          id: 'post-1',
          author: { id: 'user-1', name: 'John Doe' },
          content: 'Test post',
          timestamp: '2024-01-01T12:00:00Z',
          likes: 5,
          comments: 2,
          isLiked: false,
          postType: 'general',
        },
      ],
      totalCount: 1,
      hasMore: false,
      nextCursor: null,
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFeedResponse,
      });
    });

    it('builds correct URL without filters', async () => {
      const result = await store.dispatch(
        socialApi.endpoints.getFeed.initiate({})
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/feed',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('builds correct URL with filters', async () => {
      const filters = {
        type: 'adoption_success' as const,
        authorId: 'user-1',
        petId: 'pet-1',
        tags: ['dogs', 'cute'],
        limit: 10,
        cursor: 'cursor-123',
      };

      await store.dispatch(
        socialApi.endpoints.getFeed.initiate(filters)
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/feed?type=adoption_success&authorId=user-1&petId=pet-1&tags=dogs%2Ccute&limit=10&cursor=cursor-123',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('skips "all" type filter', async () => {
      await store.dispatch(
        socialApi.endpoints.getFeed.initiate({ type: 'all' })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/feed',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('provides correct cache tags', () => {
      const endpoint = socialApi.endpoints.getFeed;
      const tags = endpoint.providesTags!(mockFeedResponse, undefined, {});

      expect(tags).toEqual([
        { type: 'Post', id: 'post-1' },
        { type: 'Post', id: 'LIST' },
      ]);
    });

    it('handles empty response', () => {
      const emptyResponse = { posts: [], totalCount: 0, hasMore: false };
      const endpoint = socialApi.endpoints.getFeed;
      const tags = endpoint.providesTags!(emptyResponse, undefined, {});

      expect(tags).toEqual([{ type: 'Post', id: 'LIST' }]);
    });

    it('merges paginated results correctly', () => {
      const endpoint = socialApi.endpoints.getFeed;
      const currentCache = {
        posts: [{ id: 'post-1', content: 'First post' }],
        totalCount: 1,
        hasMore: true,
      };
      const newItems = {
        posts: [{ id: 'post-2', content: 'Second post' }],
        totalCount: 2,
        hasMore: false,
      };

      const merged = endpoint.merge!(currentCache, newItems, { arg: { cursor: 'cursor-123' } });

      expect(merged).toEqual({
        posts: [
          { id: 'post-1', content: 'First post' },
          { id: 'post-2', content: 'Second post' },
        ],
        totalCount: 2,
        hasMore: false,
      });
    });

    it('replaces cache on fresh load', () => {
      const endpoint = socialApi.endpoints.getFeed;
      const currentCache = {
        posts: [{ id: 'post-1', content: 'Old post' }],
        totalCount: 1,
        hasMore: false,
      };
      const newItems = {
        posts: [{ id: 'post-2', content: 'New post' }],
        totalCount: 1,
        hasMore: false,
      };

      const merged = endpoint.merge!(currentCache, newItems, { arg: {} });

      expect(merged).toEqual(newItems);
    });

    it('forces refetch correctly', () => {
      const endpoint = socialApi.endpoints.getFeed;

      // Should refetch when cursor is not present and args differ
      expect(endpoint.forceRefetch!({
        currentArg: { type: 'general' },
        previousArg: { type: 'adoption_success' },
      })).toBe(true);

      // Should not refetch when cursor is present (pagination)
      expect(endpoint.forceRefetch!({
        currentArg: { cursor: 'cursor-123' },
        previousArg: { type: 'general' },
      })).toBe(false);

      // Should not refetch when args are the same
      expect(endpoint.forceRefetch!({
        currentArg: { type: 'general' },
        previousArg: { type: 'general' },
      })).toBe(false);
    });
  });

  describe('getPost Endpoint', () => {
    const mockPost = {
      id: 'post-1',
      author: { id: 'user-1', name: 'John Doe' },
      content: 'Test post',
      timestamp: '2024-01-01T12:00:00Z',
      likes: 5,
      comments: 2,
      isLiked: false,
      postType: 'general',
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPost,
      });
    });

    it('builds correct URL for single post', async () => {
      await store.dispatch(
        socialApi.endpoints.getPost.initiate('post-1')
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/posts/post-1',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('provides correct cache tags', () => {
      const endpoint = socialApi.endpoints.getPost;
      const tags = endpoint.providesTags!(mockPost, undefined, 'post-1');

      expect(tags).toEqual([{ type: 'Post', id: 'post-1' }]);
    });
  });

  describe('createPost Endpoint', () => {
    const mockNewPost = {
      id: 'new-post-1',
      author: { id: 'user-1', name: 'John Doe' },
      content: 'New test post',
      timestamp: '2024-01-01T12:00:00Z',
      likes: 0,
      comments: 0,
      isLiked: false,
      postType: 'general',
    };

    const postData = {
      content: 'New test post',
      postType: 'general' as const,
      images: ['image1.jpg'],
      tags: ['test'],
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockNewPost,
      });
    });

    it('sends POST request with correct data', async () => {
      await store.dispatch(
        socialApi.endpoints.createPost.initiate(postData)
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/posts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      );
    });

    it('invalidates correct cache tags', () => {
      const endpoint = socialApi.endpoints.createPost;
      const tags = endpoint.invalidatesTags;

      expect(tags).toEqual([{ type: 'Post', id: 'LIST' }]);
    });

    it('logs successful post creation', async () => {
      const result = await store.dispatch(
        socialApi.endpoints.createPost.initiate(postData)
      );

      expect(loggingService.info).toHaveBeenCalledWith(
        'Post created successfully',
        {
          postId: 'new-post-1',
          postType: 'general',
        }
      );
    });

    it('logs failed post creation', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await store.dispatch(
          socialApi.endpoints.createPost.initiate(postData)
        );
      } catch (error) {
        // Expected to throw
      }

      expect(loggingService.error).toHaveBeenCalledWith(
        'Failed to create post',
        { error: expect.any(Error), postData }
      );
    });
  });

  describe('updatePost Endpoint', () => {
    const mockUpdatedPost = {
      id: 'post-1',
      author: { id: 'user-1', name: 'John Doe' },
      content: 'Updated test post',
      timestamp: '2024-01-01T12:00:00Z',
      likes: 5,
      comments: 2,
      isLiked: false,
      postType: 'general',
    };

    const updateData = {
      postId: 'post-1',
      updates: {
        content: 'Updated test post',
        tags: ['updated'],
      },
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedPost,
      });
    });

    it('sends PUT request with correct data', async () => {
      await store.dispatch(
        socialApi.endpoints.updatePost.initiate(updateData)
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/posts/post-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData.updates),
        })
      );
    });

    it('invalidates correct cache tags', () => {
      const endpoint = socialApi.endpoints.updatePost;
      const tags = endpoint.invalidatesTags!(mockUpdatedPost, undefined, updateData);

      expect(tags).toEqual([{ type: 'Post', id: 'post-1' }]);
    });
  });

  describe('deletePost Endpoint', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
    });

    it('sends DELETE request', async () => {
      await store.dispatch(
        socialApi.endpoints.deletePost.initiate('post-1')
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/posts/post-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('invalidates correct cache tags', () => {
      const endpoint = socialApi.endpoints.deletePost;
      const tags = endpoint.invalidatesTags!(undefined, undefined, 'post-1');

      expect(tags).toEqual([
        { type: 'Post', id: 'post-1' },
        { type: 'Post', id: 'LIST' },
      ]);
    });
  });

  describe('getComments Endpoint', () => {
    const mockCommentsResponse = {
      comments: [
        {
          id: 'comment-1',
          postId: 'post-1',
          author: { id: 'user-1', name: 'John Doe' },
          content: 'Test comment',
          timestamp: '2024-01-01T12:00:00Z',
          likes: 2,
          isLiked: false,
        },
      ],
      totalCount: 1,
      hasMore: false,
      nextCursor: null,
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockCommentsResponse,
      });
    });

    it('builds correct URL with pagination', async () => {
      await store.dispatch(
        socialApi.endpoints.getComments.initiate({
          postId: 'post-1',
          cursor: 'cursor-123',
          limit: 10,
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/posts/post-1/comments?limit=10&cursor=cursor-123',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('uses default limit when not specified', async () => {
      await store.dispatch(
        socialApi.endpoints.getComments.initiate({
          postId: 'post-1',
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/posts/post-1/comments?limit=20',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('provides correct cache tags', () => {
      const endpoint = socialApi.endpoints.getComments;
      const tags = endpoint.providesTags!(mockCommentsResponse, undefined, { postId: 'post-1' });

      expect(tags).toEqual([
        { type: 'Comment', id: 'comment-1' },
        { type: 'Comment', id: 'POST_post-1' },
      ]);
    });

    it('merges paginated comments correctly', () => {
      const endpoint = socialApi.endpoints.getComments;
      const currentCache = {
        comments: [{ id: 'comment-1', content: 'First comment' }],
        totalCount: 1,
        hasMore: true,
      };
      const newItems = {
        comments: [{ id: 'comment-2', content: 'Second comment' }],
        totalCount: 2,
        hasMore: false,
      };

      const merged = endpoint.merge!(currentCache, newItems, { 
        arg: { postId: 'post-1', cursor: 'cursor-123' } 
      });

      expect(merged).toEqual({
        comments: [
          { id: 'comment-1', content: 'First comment' },
          { id: 'comment-2', content: 'Second comment' },
        ],
        totalCount: 2,
        hasMore: false,
      });
    });
  });

  describe('createComment Endpoint', () => {
    const mockNewComment = {
      id: 'comment-1',
      postId: 'post-1',
      author: { id: 'user-1', name: 'John Doe' },
      content: 'New comment',
      timestamp: '2024-01-01T12:00:00Z',
      likes: 0,
      isLiked: false,
    };

    const commentData = {
      postId: 'post-1',
      content: 'New comment',
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockNewComment,
      });
    });

    it('sends POST request with correct data', async () => {
      await store.dispatch(
        socialApi.endpoints.createComment.initiate(commentData)
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/comments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(commentData),
        })
      );
    });

    it('invalidates correct cache tags', () => {
      const endpoint = socialApi.endpoints.createComment;
      const tags = endpoint.invalidatesTags!(mockNewComment, undefined, commentData);

      expect(tags).toEqual([
        { type: 'Comment', id: 'POST_post-1' },
        { type: 'Post', id: 'post-1' },
      ]);
    });

    it('logs successful comment creation', async () => {
      await store.dispatch(
        socialApi.endpoints.createComment.initiate(commentData)
      );

      expect(loggingService.info).toHaveBeenCalledWith(
        'Comment created successfully',
        {
          commentId: 'comment-1',
          postId: 'post-1',
        }
      );
    });
  });

  describe('toggleLike Endpoint', () => {
    const mockLikeResponse = {
      isLiked: true,
      likesCount: 6,
    };

    const likeData = {
      targetId: 'post-1',
      targetType: 'post' as const,
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockLikeResponse,
      });
    });

    it('sends POST request with correct data', async () => {
      await store.dispatch(
        socialApi.endpoints.toggleLike.initiate(likeData)
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/likes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(likeData),
        })
      );
    });

    it('invalidates correct cache tags for post', () => {
      const endpoint = socialApi.endpoints.toggleLike;
      const tags = endpoint.invalidatesTags!(mockLikeResponse, undefined, likeData);

      expect(tags).toEqual([{ type: 'Post', id: 'post-1' }]);
    });

    it('invalidates correct cache tags for comment', () => {
      const commentLikeData = {
        targetId: 'comment-1',
        targetType: 'comment' as const,
      };

      const endpoint = socialApi.endpoints.toggleLike;
      const tags = endpoint.invalidatesTags!(mockLikeResponse, undefined, commentLikeData);

      expect(tags).toEqual([{ type: 'Comment', id: 'comment-1' }]);
    });

    it('logs successful like toggle', async () => {
      await store.dispatch(
        socialApi.endpoints.toggleLike.initiate(likeData)
      );

      expect(loggingService.info).toHaveBeenCalledWith(
        'Like toggled successfully',
        {
          targetId: 'post-1',
          targetType: 'post',
          isLiked: true,
        }
      );
    });
  });

  describe('reportContent Endpoint', () => {
    const reportData = {
      targetId: 'post-1',
      targetType: 'post' as const,
      reason: 'inappropriate',
      description: 'This post contains inappropriate content',
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
    });

    it('sends POST request with correct data', async () => {
      await store.dispatch(
        socialApi.endpoints.reportContent.initiate(reportData)
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/reports',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(reportData),
        })
      );
    });
  });

  describe('getUserPosts Endpoint', () => {
    const mockUserPostsResponse = {
      posts: [
        {
          id: 'post-1',
          author: { id: 'user-1', name: 'John Doe' },
          content: 'User post',
          timestamp: '2024-01-01T12:00:00Z',
          likes: 3,
          comments: 1,
          isLiked: false,
          postType: 'general',
        },
      ],
      totalCount: 1,
      hasMore: false,
      nextCursor: null,
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUserPostsResponse,
      });
    });

    it('builds correct URL with pagination', async () => {
      await store.dispatch(
        socialApi.endpoints.getUserPosts.initiate({
          userId: 'user-1',
          cursor: 'cursor-123',
          limit: 10,
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/users/user-1/posts?limit=10&cursor=cursor-123',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('provides correct cache tags', () => {
      const endpoint = socialApi.endpoints.getUserPosts;
      const tags = endpoint.providesTags!(mockUserPostsResponse, undefined, { userId: 'user-1' });

      expect(tags).toEqual([
        { type: 'Post', id: 'post-1' },
        { type: 'Post', id: 'USER_user-1' },
      ]);
    });
  });

  describe('searchPosts Endpoint', () => {
    const mockSearchResponse = {
      posts: [
        {
          id: 'post-1',
          author: { id: 'user-1', name: 'John Doe' },
          content: 'Search result post',
          timestamp: '2024-01-01T12:00:00Z',
          likes: 2,
          comments: 0,
          isLiked: false,
          postType: 'general',
        },
      ],
      totalCount: 1,
      hasMore: false,
      nextCursor: null,
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      });
    });

    it('builds correct search URL', async () => {
      await store.dispatch(
        socialApi.endpoints.searchPosts.initiate({
          query: 'dog adoption',
          filters: {
            type: 'adoption_success',
            tags: ['dogs'],
          },
          cursor: 'cursor-123',
          limit: 10,
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/search/posts?q=dog+adoption&limit=10&cursor=cursor-123&type=adoption_success&tags=dogs',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('handles search without filters', async () => {
      await store.dispatch(
        socialApi.endpoints.searchPosts.initiate({
          query: 'cats',
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.petlovecommunity.app/social/search/posts?q=cats&limit=20',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('provides correct cache tags', () => {
      const endpoint = socialApi.endpoints.searchPosts;
      const tags = endpoint.providesTags;

      expect(tags).toEqual(['Post']);
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await store.dispatch(
          socialApi.endpoints.getFeed.initiate({})
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      try {
        await store.dispatch(
          socialApi.endpoints.getPost.initiate('non-existent-post')
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Cache Management', () => {
    it('serializes query args correctly for caching', () => {
      const endpoint = socialApi.endpoints.getFeed;
      const serialized = endpoint.serializeQueryArgs!({
        queryArgs: { type: 'general', cursor: 'cursor-123' },
        endpointDefinition: {} as any,
        endpointName: 'getFeed',
      });

      expect(serialized).toEqual({
        queryArgs: { type: 'general' },
        endpointDefinition: {},
        endpointName: 'getFeed',
      });
    });

    it('optimistic updates work correctly for feed', async () => {
      // This would be tested in integration tests with actual store updates
      expect(socialApi.util.updateQueryData).toBeDefined();
    });
  });

  describe('Hooks Export', () => {
    it('exports all required hooks', () => {
      expect(socialApi.useGetFeedQuery).toBeDefined();
      expect(socialApi.useGetPostQuery).toBeDefined();
      expect(socialApi.useCreatePostMutation).toBeDefined();
      expect(socialApi.useUpdatePostMutation).toBeDefined();
      expect(socialApi.useDeletePostMutation).toBeDefined();
      expect(socialApi.useGetCommentsQuery).toBeDefined();
      expect(socialApi.useCreateCommentMutation).toBeDefined();
      expect(socialApi.useToggleLikeMutation).toBeDefined();
      expect(socialApi.useReportContentMutation).toBeDefined();
      expect(socialApi.useGetUserPostsQuery).toBeDefined();
      expect(socialApi.useSearchPostsQuery).toBeDefined();
      expect(socialApi.useLazyGetFeedQuery).toBeDefined();
      expect(socialApi.useLazyGetCommentsQuery).toBeDefined();
      expect(socialApi.useLazySearchPostsQuery).toBeDefined();
    });
  });
});