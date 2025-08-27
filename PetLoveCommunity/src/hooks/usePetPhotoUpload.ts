// Pet Love Community - Pet Photo Upload Hook
// Custom hook for managing pet photo uploads with camera integration

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useUploadPetPhotoMutation } from '../services/petApi';
import photoUploadService from '../services/photoUploadService';
import { useAnalyticsTracker } from './useAnalytics';
import loggingService from '../services/loggingService';

interface PhotoResult {
  uri: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
  width?: number;
  height?: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UsePetPhotoUploadProps {
  petId: string;
  onUploadSuccess?: (photoUrl: string, photoId: string) => void;
  onUploadError?: (error: string) => void;
}

interface UsePetPhotoUploadReturn {
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  showCameraModal: boolean;
  openCameraModal: () => void;
  closeCameraModal: () => void;
  handlePhotoSelected: (photo: PhotoResult) => void;
  uploadPhoto: (photo: PhotoResult, caption?: string, isPrimary?: boolean) => Promise<void>;
}

export const usePetPhotoUpload = ({
  petId,
  onUploadSuccess,
  onUploadError,
}: UsePetPhotoUploadProps): UsePetPhotoUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  
  // RTK Query mutation for API integration
  const [uploadPetPhotoMutation] = useUploadPetPhotoMutation();
  
  // Analytics tracking
  const { trackUserAction } = useAnalyticsTracker();

  const openCameraModal = useCallback(() => {
    trackUserAction('pet_photo_upload_initiated', { petId });
    setShowCameraModal(true);
  }, [petId, trackUserAction]);

  const closeCameraModal = useCallback(() => {
    setShowCameraModal(false);
    setUploadProgress(null);
  }, []);

  const uploadPhoto = useCallback(async (
    photo: PhotoResult,
    caption?: string,
    isPrimary?: boolean
  ) => {
    try {
      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: 100, percentage: 0 });

      // Validate photo
      const validation = photoUploadService.validatePhoto(photo.uri, photo.fileSize);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      trackUserAction('pet_photo_upload_started', {
        petId,
        fileSize: photo.fileSize,
        hasCaption: Boolean(caption),
        isPrimary,
      });

      // Upload using the photo upload service
      const uploadResult = await photoUploadService.uploadPetPhoto(
        {
          petId,
          photoUri: photo.uri,
          fileName: photo.fileName,
          caption,
          isPrimary,
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Also update the RTK Query cache (simulate API call)
      try {
        // TODO: Use actual RTK Query mutation when backend is ready
        // const formData = new FormData();
        // formData.append('file', {
        //   uri: photo.uri,
        //   type: photo.type || 'image/jpeg',
        //   name: photo.fileName || 'photo.jpg',
        // } as any);

        // await uploadPetPhotoMutation({
        //   petId,
        //   file: formData,
        //   caption,
        //   isPrimary,
        // }).unwrap();

        loggingService.debug('RTK Query upload integration pending', 'PetPhotoUpload', {
          petId,
          fileName: photo.fileName,
          caption,
          isPrimary,
          note: 'Placeholder for RTK Query integration'
        });
      } catch (apiError) {
        loggingService.warn('RTK Query upload failed, fallback service succeeded', 'PetPhotoUpload', {
          petId,
          apiError: apiError instanceof Error ? apiError.message : String(apiError),
          fallbackSuccess: true
        });
      }

      trackUserAction('pet_photo_upload_completed', {
        petId,
        photoId: uploadResult.photoId,
        correlationId: uploadResult.correlationId,
      });

      // Success callback
      if (uploadResult.url && uploadResult.photoId) {
        onUploadSuccess?.(uploadResult.url, uploadResult.photoId);
      }

      Alert.alert(
        'Upload Successful',
        'Your photo has been uploaded successfully!',
        [{ text: 'OK' }]
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      trackUserAction('pet_photo_upload_failed', {
        petId,
        error: errorMessage,
      });

      onUploadError?.(errorMessage);

      Alert.alert(
        'Upload Failed',
        `Failed to upload photo: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [petId, onUploadSuccess, onUploadError, trackUserAction, uploadPetPhotoMutation]);

  const handlePhotoSelected = useCallback(async (photo: PhotoResult) => {
    closeCameraModal();
    
    // Show upload confirmation dialog
    Alert.alert(
      'Upload Photo',
      'Would you like to upload this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upload', 
          onPress: () => uploadPhoto(photo),
        },
      ]
    );
  }, [closeCameraModal, uploadPhoto]);

  return {
    isUploading,
    uploadProgress,
    showCameraModal,
    openCameraModal,
    closeCameraModal,
    handlePhotoSelected,
    uploadPhoto,
  };
};

export default usePetPhotoUpload;