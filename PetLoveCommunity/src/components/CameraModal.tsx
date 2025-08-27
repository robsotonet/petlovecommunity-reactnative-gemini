// Pet Love Community - Camera Modal Component
// Enterprise camera integration with photo capture and upload capabilities

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '../hooks/useColors';
import { useAnalyticsTracker } from '../hooks/useAnalytics';
import Button from './Button';
import Card from './Card';

// NOTE: This is a placeholder implementation for camera integration
// In a real implementation, you would install and use react-native-image-picker:
// npm install react-native-image-picker
// import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoSelected: (photoData: PhotoResult) => void;
  title?: string;
  subtitle?: string;
  allowMultiple?: boolean;
  quality?: number;
}

interface PhotoResult {
  uri: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
  width?: number;
  height?: number;
}

// Simulated camera/photo picker options
interface PhotoPickerOptions {
  mediaType: 'photo';
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  allowsEditing?: boolean;
  includeBase64?: boolean;
}

const CameraModal: React.FC<CameraModalProps> = ({
  visible,
  onClose,
  onPhotoSelected,
  title = 'Add Photo',
  subtitle = 'Choose how to add a photo',
  allowMultiple = false,
  quality = 0.8,
}) => {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);
  const { trackUserAction } = useAnalyticsTracker();

  // Check permissions (simulated for now)
  const checkCameraPermissions = async (): Promise<boolean> => {
    // TODO: Implement actual permission checking
    // import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
    
    try {
      // Simulate permission check
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (Platform.OS === 'ios') {
        // iOS permission simulation
        return true;
      } else {
        // Android permission simulation
        return true;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  };

  // Launch camera (simulated)
  const launchCameraFunction = async () => {
    trackUserAction('camera_opened', { source: 'pet_photo_upload' });
    
    const hasPermission = await checkCameraPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera access to take photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {
            // TODO: Open app settings
            console.log('Open app settings');
          }},
        ]
      );
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: Replace with actual camera implementation
      // const options: PhotoPickerOptions = {
      //   mediaType: 'photo',
      //   quality,
      //   maxWidth: 2000,
      //   maxHeight: 2000,
      //   allowsEditing: true,
      // };
      
      // launchCamera(options, (response: ImagePickerResponse) => {
      //   handleImageResponse(response);
      // });

      // Simulate camera capture
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful photo capture
      const simulatedPhoto: PhotoResult = {
        uri: 'file://simulated-photo-path.jpg',
        fileName: `pet-photo-${Date.now()}.jpg`,
        fileSize: 2048576, // 2MB
        type: 'image/jpeg',
        width: 1920,
        height: 1080,
      };

      handlePhotoResult(simulatedPhoto);
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(
        'Camera Error',
        'Unable to access camera. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Launch photo library (simulated)
  const launchPhotoLibrary = async () => {
    trackUserAction('photo_library_opened', { source: 'pet_photo_upload' });
    
    setIsLoading(true);
    
    try {
      // TODO: Replace with actual photo library implementation
      // const options: PhotoPickerOptions = {
      //   mediaType: 'photo',
      //   quality,
      //   allowsEditing: true,
      // };
      
      // launchImageLibrary(options, (response: ImagePickerResponse) => {
      //   handleImageResponse(response);
      // });

      // Simulate photo library selection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful photo selection
      const simulatedPhoto: PhotoResult = {
        uri: 'file://simulated-library-photo.jpg',
        fileName: `pet-photo-library-${Date.now()}.jpg`,
        fileSize: 1536000, // 1.5MB
        type: 'image/jpeg',
        width: 1600,
        height: 1200,
      };

      handlePhotoResult(simulatedPhoto);
    } catch (error) {
      console.error('Photo library error:', error);
      Alert.alert(
        'Photo Library Error',
        'Unable to access photo library. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoResult = (photoResult: PhotoResult) => {
    // Validate photo
    if (photoResult.fileSize && photoResult.fileSize > 10 * 1024 * 1024) { // 10MB limit
      Alert.alert(
        'File Too Large',
        'Please select a photo smaller than 10MB.',
        [{ text: 'OK' }]
      );
      return;
    }

    trackUserAction('photo_selected', { 
      source: 'pet_photo_upload',
      fileSize: photoResult.fileSize,
      width: photoResult.width,
      height: photoResult.height,
    });

    onPhotoSelected(photoResult);
    onClose();
  };

  const renderLoadingOverlay = () => {
    if (!isLoading) return null;
    
    return (
      <View style={styles.loadingOverlay}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.neutral.beige }]}>
          <ActivityIndicator size="large" color={colors.primary.coral} />
          <Text style={[styles.loadingText, { color: colors.neutral.midnight }]}>
            Processing...
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.neutral.beige }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.extended.tealVariations.background }]}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <Text style={[styles.title, { color: colors.neutral.midnight }]}>
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.extended.textVariations.secondary }]}>
                {subtitle}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.extended.textVariations.tertiary }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Camera Option */}
          <Card style={styles.optionCard}>
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, { backgroundColor: colors.extended.tealVariations.background }]}>
                <Text style={[styles.optionIconText, { color: colors.neutral.midnight }]}>
                  📷
                </Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionTitle, { color: colors.neutral.midnight }]}>
                  Take Photo
                </Text>
                <Text style={[styles.optionDescription, { color: colors.extended.textVariations.secondary }]}>
                  Use your camera to take a new photo
                </Text>
              </View>
            </View>
            <Button
              title="Open Camera"
              onPress={launchCameraFunction}
              type="primary"
              disabled={isLoading}
              style={styles.optionButton}
            />
          </Card>

          {/* Photo Library Option */}
          <Card style={styles.optionCard}>
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, { backgroundColor: colors.extended.tealVariations.background }]}>
                <Text style={[styles.optionIconText, { color: colors.neutral.midnight }]}>
                  🖼️
                </Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionTitle, { color: colors.neutral.midnight }]}>
                  Choose from Library
                </Text>
                <Text style={[styles.optionDescription, { color: colors.extended.textVariations.secondary }]}>
                  Select a photo from your gallery
                </Text>
              </View>
            </View>
            <Button
              title="Browse Photos"
              onPress={launchPhotoLibrary}
              type="secondary"
              disabled={isLoading}
              style={styles.optionButton}
            />
          </Card>

          {/* Upload Guidelines */}
          <Card style={[styles.guidelinesCard, { backgroundColor: colors.extended.tealVariations.background }]}>
            <Text style={[styles.guidelinesTitle, { color: colors.neutral.midnight }]}>
              📋 Photo Guidelines
            </Text>
            <View style={styles.guidelinesList}>
              <Text style={[styles.guideline, { color: colors.extended.textVariations.secondary }]}>
                • Use clear, well-lit photos
              </Text>
              <Text style={[styles.guideline, { color: colors.extended.textVariations.secondary }]}>
                • Show the pet clearly and in focus
              </Text>
              <Text style={[styles.guideline, { color: colors.extended.textVariations.secondary }]}>
                • Maximum file size: 10MB
              </Text>
              <Text style={[styles.guideline, { color: colors.extended.textVariations.secondary }]}>
                • Supported formats: JPG, PNG
              </Text>
            </View>
          </Card>
        </View>

        {/* Loading Overlay */}
        {renderLoadingOverlay()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  optionCard: {
    padding: 20,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionIconText: {
    fontSize: 24,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  optionButton: {
    marginTop: 4,
  },
  guidelinesCard: {
    padding: 20,
  },
  guidelinesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  guidelinesList: {
    gap: 8,
  },
  guideline: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CameraModal;