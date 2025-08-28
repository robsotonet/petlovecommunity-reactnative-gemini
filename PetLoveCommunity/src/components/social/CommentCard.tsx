// Pet Love Community - Comment Card Component  
// Displays individual comments with Pet Love Community design system

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useColors } from '../../hooks/useColors';
import correlationIdService from '../../services/correlationIdService';
import useAdoptionAnalytics from '../../hooks/useAdoptionAnalytics';

export interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
  isVerified?: boolean;
}

export interface CommentContent {
  id: string;
  author: CommentAuthor;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  parentCommentId?: string; // For reply threads
  replies?: CommentContent[];
  postId: string;
}

export interface CommentCardProps {
  comment: CommentContent;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string) => void;
  onAuthorPress?: (authorId: string) => void;
  isReply?: boolean;
  maxReplies?: number;
  disabled?: boolean;
  showActions?: boolean;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  onLike,
  onReply,
  onAuthorPress,
  isReply = false,
  maxReplies = 3,
  disabled = false,
  showActions = true,
}) => {
  const colors = useColors();
  const { trackDocumentAction } = useAdoptionAnalytics();
  const [isLiking, setIsLiking] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'now' : `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? '1d' : `${diffInDays}d`;
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
        action: comment.isLiked ? 'unlike_comment' : 'like_comment',
        documentType: 'social_comment',
        metadata: {
          commentId: comment.id,
          postId: comment.postId,
          authorId: comment.author.id,
          isReply,
          correlationId,
        },
      });

      onLike?.(comment.id);
    } catch (error) {
      Alert.alert('Error', 'Unable to update like. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  // Handle reply action
  const handleReply = async () => {
    if (disabled) return;
    
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      // Track analytics
      trackDocumentAction({
        action: 'reply_to_comment',
        documentType: 'social_comment',
        metadata: {
          commentId: comment.id,
          postId: comment.postId,
          authorId: comment.author.id,
          isReply,
          correlationId,
        },
      });

      onReply?.(comment.id);
    } catch (error) {
      Alert.alert('Error', 'Unable to open reply. Please try again.');
    }
  };

  // Handle author press
  const handleAuthorPress = () => {
    if (disabled) return;
    onAuthorPress?.(comment.author.id);
  };

  // Get replies to display
  const repliesToShow = showAllReplies ? comment.replies : comment.replies?.slice(0, maxReplies);
  const hasMoreReplies = comment.replies && comment.replies.length > maxReplies && !showAllReplies;

  const styles = StyleSheet.create({
    container: {
      paddingVertical: 8,
      paddingLeft: isReply ? 40 : 0,
    },
    commentContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    avatar: {
      width: isReply ? 32 : 40,
      height: isReply ? 32 : 40,
      borderRadius: isReply ? 16 : 20,
      backgroundColor: colors.neutral.lightGray,
      marginRight: 12,
    },
    contentContainer: {
      flex: 1,
    },
    bubble: {
      backgroundColor: colors.extended.tealVariations.background,
      borderRadius: 16,
      padding: 12,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    authorName: {
      fontSize: isReply ? 13 : 14,
      fontWeight: '600',
      color: colors.neutral.midnight,
      marginRight: 6,
    },
    verified: {
      fontSize: isReply ? 10 : 12,
      marginRight: 6,
    },
    timestamp: {
      fontSize: isReply ? 11 : 12,
      color: colors.extended.textVariations.tertiary,
    },
    content: {
      fontSize: isReply ? 13 : 14,
      lineHeight: isReply ? 18 : 20,
      color: colors.neutral.midnight,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    likeIcon: {
      fontSize: isReply ? 12 : 14,
      marginRight: 4,
    },
    actionText: {
      fontSize: isReply ? 11 : 12,
      color: colors.extended.textVariations.secondary,
      fontWeight: '500',
    },
    actionTextActive: {
      color: colors.primary.coral,
    },
    repliesContainer: {
      marginTop: 8,
    },
    showMoreButton: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    showMoreText: {
      fontSize: 12,
      color: colors.extended.textVariations.secondary,
      fontWeight: '500',
    },
    replyIndicator: {
      position: 'absolute',
      left: 20,
      top: 8,
      bottom: 0,
      width: 2,
      backgroundColor: colors.neutral.lightGray,
    },
  });

  return (
    <View style={styles.container}>
      {isReply && <View style={styles.replyIndicator} />}
      
      <View style={styles.commentContainer}>
        {/* Avatar */}
        <TouchableOpacity onPress={handleAuthorPress}>
          {comment.author.avatar ? (
            <Image source={{ uri: comment.author.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar} />
          )}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.contentContainer}>
          <View style={styles.bubble}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleAuthorPress}>
                <Text style={styles.authorName}>{comment.author.name}</Text>
              </TouchableOpacity>
              {comment.author.isVerified && <Text style={styles.verified}>✓</Text>}
              <Text style={styles.timestamp}>{formatTimestamp(comment.timestamp)}</Text>
            </View>

            {/* Comment Content */}
            <Text style={styles.content}>{comment.content}</Text>
          </View>

          {/* Actions */}
          {showActions && (
            <View style={styles.actions}>
              {/* Like Button */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLike}
                disabled={isLiking || disabled}
              >
                <Text style={[
                  styles.likeIcon,
                  comment.isLiked && { color: colors.primary.coral }
                ]}>
                  {comment.isLiked ? '❤️' : '🤍'}
                </Text>
                {comment.likes > 0 && (
                  <Text style={[styles.actionText, comment.isLiked && styles.actionTextActive]}>
                    {comment.likes}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Reply Button (only for main comments, not replies) */}
              {!isReply && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleReply}
                  disabled={disabled}
                >
                  <Text style={styles.actionText}>Reply</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Replies */}
          {!isReply && repliesToShow && repliesToShow.length > 0 && (
            <View style={styles.repliesContainer}>
              {repliesToShow.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  onLike={onLike}
                  onAuthorPress={onAuthorPress}
                  isReply={true}
                  disabled={disabled}
                  showActions={showActions}
                />
              ))}
              
              {/* Show More Replies Button */}
              {hasMoreReplies && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllReplies(true)}
                >
                  <Text style={styles.showMoreText}>
                    View {comment.replies!.length - maxReplies} more replies
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default CommentCard;