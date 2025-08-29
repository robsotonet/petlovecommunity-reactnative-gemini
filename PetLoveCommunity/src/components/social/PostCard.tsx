// Pet Love Community - Social Post Card Component
// Displays individual community posts with Pet Love Community design system

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native';
import { useColors } from '../../hooks/useColors';
import Button from '../Button';
import { ShareButton } from '../ui/ShareButton';
import correlationIdService from '../../services/correlationIdService';
import useAdoptionAnalytics from '../../hooks/useAdoptionAnalytics';

export interface PostAuthor {
  id: string;
  name: string;
  avatar?: string;
  shelterName?: string;
  isVerified?: boolean;
}

export interface PostContent {
  id: string;
  author: PostAuthor;
  content: string;
  images?: string[];
  timestamp: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  petId?: string; // If post is about a specific pet
  petName?: string;
  postType: 'adoption_success' | 'general' | 'pet_spotlight' | 'shelter_update';
  tags?: string[];
}

export interface PostCardProps {
  post: PostContent;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onAuthorPress?: (authorId: string) => void;
  onImagePress?: (imageUrl: string, index: number) => void;
  disabled?: boolean;
  showActions?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onAuthorPress,
  onImagePress,
  disabled = false,
  showActions = true,
}) => {
  const colors = useColors();
  const { trackDocumentAction } = useAdoptionAnalytics();
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }
  };

  // Get post type styling
  const getPostTypeColor = () => {
    switch (post.postType) {
      case 'adoption_success':
        return colors.primary.coral;
      case 'pet_spotlight':
        return colors.primary.teal;
      case 'shelter_update':
        return colors.semantic.info;
      default:
        return colors.extended.textVariations.secondary;
    }
  };

  // Get post type icon
  const getPostTypeIcon = () => {
    switch (post.postType) {
      case 'adoption_success':
        return '🎉';
      case 'pet_spotlight':
        return '🐾';
      case 'shelter_update':
        return '📢';
      default:
        return '💬';
    }
  };

  // Handle like action
  const handleLike = async () => {
    if (isLiking || disabled) return;
    
    setIsLiking(true);
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      // Track analytics
      trackDocumentAction({
        action: post.isLiked ? 'unlike_post' : 'like_post',
        documentType: 'social_post',
        petId: post.petId,
        petName: post.petName,
        metadata: {
          postId: post.id,
          postType: post.postType,
          authorId: post.author.id,
          correlationId,
        },
      });

      onLike?.(post.id);
    } catch (error) {
      Alert.alert('Error', 'Unable to update like. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  // Handle comment action
  const handleComment = async () => {
    if (isCommenting || disabled) return;
    
    setIsCommenting(true);
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      // Track analytics
      trackDocumentAction({
        action: 'open_comments',
        documentType: 'social_post',
        petId: post.petId,
        petName: post.petName,
        metadata: {
          postId: post.id,
          postType: post.postType,
          authorId: post.author.id,
          correlationId,
        },
      });

      onComment?.(post.id);
    } catch (error) {
      Alert.alert('Error', 'Unable to open comments. Please try again.');
    } finally {
      setIsCommenting(false);
    }
  };

  // Handle author press
  const handleAuthorPress = () => {
    if (disabled) return;
    onAuthorPress?.(post.author.id);
  };

  // Handle image press
  const handleImagePress = (imageUrl: string, index: number) => {
    if (disabled) return;
    onImagePress?.(imageUrl, index);
  };

  // Create share content
  const createShareContent = () => ({
    type: post.postType,
    title: `${post.author.name} shared: ${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}`,
    message: `Check out this post from ${post.author.name} on Pet Love Community: "${post.content}"`,
    url: `https://petlovecommunity.app/posts/${post.id}`,
    imageUrl: post.images?.[0],
    petId: post.petId,
    petName: post.petName,
  });

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.neutral.beige,
      marginVertical: 8,
      marginHorizontal: 16,
      borderRadius: 12,
      padding: 16,
      shadowColor: colors.neutral.midnight,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.neutral.lightGray,
      marginRight: 12,
    },
    authorInfo: {
      flex: 1,
    },
    authorName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.neutral.midnight,
      marginBottom: 2,
    },
    shelterName: {
      fontSize: 14,
      color: colors.extended.textVariations.secondary,
    },
    verified: {
      marginLeft: 4,
      fontSize: 14,
    },
    postType: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.extended.tealVariations.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 12,
    },
    postTypeIcon: {
      fontSize: 12,
      marginRight: 4,
    },
    postTypeText: {
      fontSize: 12,
      color: getPostTypeColor(),
      fontWeight: '500',
    },
    timestamp: {
      fontSize: 12,
      color: colors.extended.textVariations.tertiary,
      marginTop: 4,
    },
    content: {
      fontSize: 16,
      lineHeight: 22,
      color: colors.neutral.midnight,
      marginBottom: 12,
    },
    imagesContainer: {
      marginBottom: 12,
    },
    singleImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
    },
    multipleImagesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    multipleImage: {
      width: '48%',
      height: 150,
      marginHorizontal: '1%',
      marginVertical: 4,
      borderRadius: 8,
    },
    moreImagesOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    moreImagesText: {
      color: colors.neutral.beige,
      fontSize: 16,
      fontWeight: '600',
    },
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    tag: {
      backgroundColor: colors.extended.coralVariations.light,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 6,
      marginBottom: 4,
    },
    tagText: {
      fontSize: 12,
      color: colors.neutral.midnight,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.neutral.lightGray,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 8,
    },
    actionIcon: {
      fontSize: 18,
      marginRight: 6,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.extended.textVariations.secondary,
    },
    actionTextActive: {
      color: colors.primary.coral,
    },
    shareContainer: {
      flex: 1,
      alignItems: 'flex-end',
    },
  });

  return (
    <View style={styles.container} testID={`post-card-${post.id}`}>
      {/* Header */}
      <View style={styles.header} testID="post-header">
        <TouchableOpacity onPress={handleAuthorPress} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} testID={`author-button-${post.id}`}>
          {post.author.avatar ? (
            <Image source={{ uri: post.author.avatar }} style={styles.avatar} testID="author-avatar" />
          ) : (
            <View style={styles.avatar} testID="author-avatar-placeholder" />
          )}
          <View style={styles.authorInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.authorName} testID="author-name">{post.author.name}</Text>
              {post.author.isVerified && <Text style={styles.verified} testID="verified-badge">✓</Text>}
            </View>
            {post.author.shelterName && (
              <Text style={styles.shelterName} testID="shelter-name">{post.author.shelterName}</Text>
            )}
            <Text style={styles.timestamp} testID="post-timestamp">{formatTimestamp(post.timestamp)}</Text>
          </View>
        </TouchableOpacity>
        
        {/* Post Type Badge */}
        <View style={styles.postType} testID="post-type-badge">
          <Text style={styles.postTypeIcon} testID="post-type-icon">{getPostTypeIcon()}</Text>
          <Text style={styles.postTypeText} testID="post-type-text">
            {post.postType.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.content} testID="post-content">{post.content}</Text>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <View style={styles.imagesContainer} testID="post-images">
          {post.images.length === 1 ? (
            <TouchableOpacity onPress={() => handleImagePress(post.images![0], 0)} testID={`image-${post.id}-0`}>
              <Image source={{ uri: post.images[0] }} style={styles.singleImage} testID="single-image-0" />
            </TouchableOpacity>
          ) : (
            <View style={styles.multipleImagesContainer}>
              {post.images.slice(0, 4).map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleImagePress(image, index)}
                  style={styles.multipleImage}
                  testID={`image-${post.id}-${index}`}
                >
                  <Image source={{ uri: image }} style={styles.multipleImage} testID={`multiple-image-${index}`} />
                  {index === 3 && post.images!.length > 4 && (
                    <View style={styles.moreImagesOverlay} testID="more-images-overlay">
                      <Text style={styles.moreImagesText} testID="more-images-text">+{post.images!.length - 4}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tags} testID="post-tags">
          {post.tags.map((tag, index) => (
            <View key={index} style={styles.tag} testID={`tag-${index}`}>
              <Text style={styles.tagText} testID={`tag-text-${index}`}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      {showActions && (
        <View style={styles.actions} testID="post-actions">
          {/* Like Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
            disabled={isLiking || disabled}
            testID="like-button"
          >
            <Text style={[styles.actionIcon, post.isLiked && { color: colors.primary.coral }]} testID="like-icon">
              {post.isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]} testID="like-count">
              {post.likes}
            </Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleComment}
            disabled={isCommenting || disabled}
            testID="comment-button"
          >
            <Text style={styles.actionIcon} testID="comment-icon">💬</Text>
            <Text style={styles.actionText} testID="comment-count">{post.comments}</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <View style={styles.shareContainer}>
            <ShareButton
              content={createShareContent()}
              title="Share"
              variant="text"
              size="small"
              onShareSuccess={(platform) => {
                onShare?.(post.id);
                trackDocumentAction({
                  action: 'share_post',
                  documentType: 'social_post',
                  petId: post.petId,
                  petName: post.petName,
                  metadata: {
                    postId: post.id,
                    postType: post.postType,
                    platform: platform || 'system_share',
                  },
                });
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
};

export default PostCard;