// Pet Love Community - Create Post Modal Component
// Modal for creating new social posts with image and text content

import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import Button from '../Button';
import { CameraModal } from '../CameraModal';
import correlationIdService from '../../services/correlationIdService';
import useAdoptionAnalytics from '../../hooks/useAdoptionAnalytics';

export interface CreatePostData {
  content: string;
  images: string[];
  postType: 'adoption_success' | 'general' | 'pet_spotlight' | 'shelter_update';
  tags: string[];
  petId?: string;
  petName?: string;
}

export interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (postData: CreatePostData) => Promise<void>;
  initialPostType?: CreatePostData['postType'];
  initialPetId?: string;
  initialPetName?: string;
  maxImages?: number;
  maxContentLength?: number;
  loading?: boolean;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialPostType = 'general',
  initialPetId,
  initialPetName,
  maxImages = 4,
  maxContentLength = 500,
  loading = false,
}) => {
  const colors = useColors();
  const { trackDocumentAction } = useAdoptionAnalytics();
  const textInputRef = useRef<TextInput>(null);

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [postType, setPostType] = useState<CreatePostData['postType']>(initialPostType);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post type options
  const postTypeOptions = [
    { value: 'general', label: 'General', icon: '💬', color: colors.extended.textVariations.secondary },
    { value: 'adoption_success', label: 'Adoption Success', icon: '🎉', color: colors.primary.coral },
    { value: 'pet_spotlight', label: 'Pet Spotlight', icon: '🐾', color: colors.primary.teal },
    { value: 'shelter_update', label: 'Shelter Update', icon: '📢', color: colors.semantic.info },
  ];

  // Reset form
  const resetForm = () => {
    setContent('');
    setImages([]);
    setPostType(initialPostType);
    setTags([]);
    setTagInput('');
  };

  // Handle close
  const handleClose = () => {
    if (content.trim() || images.length > 0 || tags.length > 0) {
      Alert.alert(
        'Discard Post?',
        'You have unsaved changes. Are you sure you want to discard this post?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Missing Content', 'Please write something to share with the community.');
      return;
    }

    if (content.length > maxContentLength) {
      Alert.alert('Content Too Long', `Please keep your post under ${maxContentLength} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const correlationId = await correlationIdService.getCorrelationId();

      // Track analytics
      trackDocumentAction({
        action: 'create_post',
        documentType: 'social_post',
        petId: initialPetId,
        petName: initialPetName,
        metadata: {
          postType,
          contentLength: content.length,
          imageCount: images.length,
          tagCount: tags.length,
          correlationId,
        },
      });

      const postData: CreatePostData = {
        content: content.trim(),
        images,
        postType,
        tags,
        petId: initialPetId,
        petName: initialPetName,
      };

      await onSubmit(postData);
      resetForm();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Unable to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle add tag
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  // Handle remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle camera result
  const handleCameraResult = (photoUri: string) => {
    if (images.length < maxImages) {
      setImages([...images, photoUri]);
    } else {
      Alert.alert('Maximum Images', `You can only add up to ${maxImages} images per post.`);
    }
    setShowCamera(false);
  };

  // Handle remove image
  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Get selected post type config
  const selectedPostType = postTypeOptions.find(option => option.value === postType)!;

  const styles = StyleSheet.create({
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
      flex: 1,
      backgroundColor: colors.neutral.beige,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral.lightGray,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.neutral.midnight,
    },
    headerButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    headerButtonText: {
      fontSize: 16,
      color: colors.primary.teal,
      fontWeight: '500',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    textInput: {
      fontSize: 16,
      color: colors.neutral.midnight,
      lineHeight: 22,
      minHeight: 120,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    characterCount: {
      alignSelf: 'flex-end',
      fontSize: 12,
      color: colors.extended.textVariations.tertiary,
      marginBottom: 16,
    },
    characterCountWarning: {
      color: colors.semantic.warning,
    },
    characterCountError: {
      color: colors.semantic.error,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.neutral.midnight,
      marginBottom: 12,
    },
    postTypeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    postTypeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.neutral.lightGray,
      marginRight: 8,
      marginBottom: 8,
    },
    postTypeOptionSelected: {
      borderColor: colors.primary.teal,
      backgroundColor: colors.extended.tealVariations.background,
    },
    postTypeIcon: {
      fontSize: 16,
      marginRight: 6,
    },
    postTypeText: {
      fontSize: 14,
      color: colors.extended.textVariations.secondary,
      fontWeight: '500',
    },
    postTypeTextSelected: {
      color: colors.primary.teal,
    },
    imagesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
    },
    imageWrapper: {
      marginRight: 8,
      marginBottom: 8,
      position: 'relative',
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: 8,
    },
    removeImageButton: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: colors.semantic.error,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeImageText: {
      color: colors.neutral.beige,
      fontSize: 16,
      fontWeight: '600',
    },
    addImageButton: {
      width: 80,
      height: 80,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.neutral.lightGray,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      marginBottom: 8,
    },
    addImageIcon: {
      fontSize: 32,
      color: colors.neutral.lightGray,
    },
    tagInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    tagInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.neutral.lightGray,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: colors.neutral.midnight,
      marginRight: 8,
    },
    addTagButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.primary.teal,
      borderRadius: 8,
    },
    addTagButtonText: {
      color: colors.neutral.beige,
      fontSize: 14,
      fontWeight: '500',
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
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
      marginRight: 4,
    },
    removeTagButton: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.neutral.midnight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeTagText: {
      color: colors.neutral.beige,
      fontSize: 10,
      fontWeight: '600',
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.neutral.lightGray,
    },
    submitButton: {
      marginBottom: Platform.OS === 'ios' ? 0 : 16,
    },
  });

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={handleClose}
        testID="create-post-modal"
      >
        <SafeAreaView style={styles.container} testID="modal-container">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            testID="keyboard-avoiding-view"
          >
            {/* Header */}
            <View style={styles.header} testID="modal-header">
              <TouchableOpacity onPress={handleClose} style={styles.headerButton} testID="cancel-button">
                <Text style={styles.headerButtonText} testID="cancel-text">Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle} testID="modal-title">New Post</Text>
              <TouchableOpacity onPress={handleSubmit} style={styles.headerButton} testID="share-button">
                <Text style={[styles.headerButtonText, { opacity: content.trim() ? 1 : 0.5 }]} testID="share-text">
                  Share
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} testID="modal-content">
              {/* Text Content */}
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                placeholder="Share your pet story with the community..."
                placeholderTextColor={colors.extended.textVariations.tertiary}
                value={content}
                onChangeText={setContent}
                multiline
                autoFocus
                maxLength={maxContentLength}
                testID="content-input"
              />
              
              <Text style={[
                styles.characterCount,
                content.length > maxContentLength * 0.9 && styles.characterCountWarning,
                content.length >= maxContentLength && styles.characterCountError,
              ]} testID="character-count">
                {content.length}/{maxContentLength}
              </Text>

              {/* Post Type Selection */}
              <View style={styles.section} testID="post-type-section">
                <Text style={styles.sectionTitle} testID="post-type-title">Post Type</Text>
                <View style={styles.postTypeContainer} testID="post-type-container">
                  {postTypeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.postTypeOption,
                        postType === option.value && styles.postTypeOptionSelected,
                      ]}
                      onPress={() => setPostType(option.value as CreatePostData['postType'])}
                      testID={`post-type-${option.value}`}
                    >
                      <Text style={styles.postTypeIcon} testID={`post-type-icon-${option.value}`}>{option.icon}</Text>
                      <Text style={[
                        styles.postTypeText,
                        postType === option.value && styles.postTypeTextSelected,
                      ]} testID={`post-type-text-${option.value}`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Images */}
              <View style={styles.section} testID="images-section">
                <Text style={styles.sectionTitle} testID="images-title">Photos ({images.length}/{maxImages})</Text>
                <View style={styles.imagesContainer} testID="images-container">
                  {images.map((image, index) => (
                    <View key={index} style={styles.imageWrapper} testID={`image-wrapper-${index}`}>
                      <Image source={{ uri: image }} style={styles.image} testID={`image-${index}`} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                        testID={`remove-image-${index}`}
                      >
                        <Text style={styles.removeImageText} testID={`remove-image-text-${index}`}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  {images.length < maxImages && (
                    <TouchableOpacity
                      style={styles.addImageButton}
                      onPress={() => setShowCamera(true)}
                      testID="add-image-button"
                    >
                      <Text style={styles.addImageIcon} testID="add-image-icon">+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Tags */}
              <View style={styles.section} testID="tags-section">
                <Text style={styles.sectionTitle} testID="tags-title">Tags ({tags.length}/5)</Text>
                <View style={styles.tagInputContainer} testID="tag-input-container">
                  <TextInput
                    style={styles.tagInput}
                    placeholder="Add a tag..."
                    placeholderTextColor={colors.extended.textVariations.tertiary}
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={handleAddTag}
                    maxLength={20}
                    testID="tag-input"
                  />
                  <TouchableOpacity
                    style={[styles.addTagButton, { opacity: tagInput.trim() ? 1 : 0.5 }]}
                    onPress={handleAddTag}
                    disabled={!tagInput.trim()}
                    testID="add-tag-button"
                  >
                    <Text style={styles.addTagButtonText} testID="add-tag-text">Add</Text>
                  </TouchableOpacity>
                </View>
                
                {tags.length > 0 && (
                  <View style={styles.tagsContainer} testID="tags-container">
                    {tags.map((tag, index) => (
                      <View key={index} style={styles.tag} testID={`tag-${index}`}>
                        <Text style={styles.tagText} testID={`tag-text-${index}`}>#{tag}</Text>
                        <TouchableOpacity
                          style={styles.removeTagButton}
                          onPress={() => handleRemoveTag(tag)}
                          testID={`remove-tag-${index}`}
                        >
                          <Text style={styles.removeTagText} testID={`remove-tag-text-${index}`}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer} testID="modal-footer">
              <Button
                title={isSubmitting ? "Sharing..." : "Share Post"}
                onPress={handleSubmit}
                type="primary"
                disabled={!content.trim() || isSubmitting || loading}
                style={styles.submitButton}
                testID="submit-button"
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Camera Modal */}
      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraResult}
        title="Add Photo to Post"
        testID="camera-modal"
      />
    </>
  );
};

export default CreatePostModal;