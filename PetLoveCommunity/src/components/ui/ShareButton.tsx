// Pet Love Community - ShareButton Component
// Social sharing functionality for pet photos, adoption success stories, and events

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import Share, { ShareOptions, Social } from 'react-native-share';
import { useColors } from '../../hooks/useColors';
import Button from '../Button';
import correlationIdService from '../../services/correlationIdService';
import useAdoptionAnalytics from '../../hooks/useAdoptionAnalytics';

export type ShareContentType = 
  | 'pet_photo' 
  | 'adoption_success' 
  | 'appointment_confirmation'
  | 'pet_profile'
  | 'shelter_event';

export interface ShareContent {
  type: ShareContentType;
  title: string;
  message: string;
  url?: string;
  imageUrl?: string;
  // Pet-specific data for analytics
  petId?: string;
  petName?: string;
  shelterId?: string;
  shelterName?: string;
}

export interface ShareButtonProps {
  content: ShareContent;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  showPlatformOptions?: boolean;
  onShareSuccess?: (platform?: string) => void;
  onShareError?: (error: Error) => void;
  disabled?: boolean;
  style?: any;
  title?: string;
}

interface SharePlatform {
  name: string;
  social: Social;
  icon: string;
  color: string;
}

const SHARE_PLATFORMS: SharePlatform[] = [
  { name: 'Facebook', social: Social.Facebook, icon: '📘', color: '#1877F2' },
  { name: 'Instagram', social: Social.Instagram, icon: '📷', color: '#E4405F' },
  { name: 'Twitter', social: Social.Twitter, icon: '🐦', color: '#1DA1F2' },
  { name: 'WhatsApp', social: Social.WhatsApp, icon: '💬', color: '#25D366' },
  { name: 'Messages', social: Social.SMS, icon: '💬', color: '#34C759' },
  { name: 'Email', social: Social.Email, icon: '📧', color: '#007AFF' },
];

export const ShareButton: React.FC<ShareButtonProps> = ({
  content,
  variant = 'secondary',
  size = 'medium',
  showPlatformOptions = false,
  onShareSuccess,
  onShareError,
  disabled = false,
  style,
  title = 'Share',
}) => {
  const colors = useColors();
  const [isSharing, setIsSharing] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const { trackDocumentAction } = useAdoptionAnalytics();

  // Generate share options based on content
  const generateShareOptions = (platform?: Social): ShareOptions => {
    const baseOptions: ShareOptions = {
      title: content.title,
      message: content.message,
      url: content.url,
    };

    // Add image for platforms that support it
    if (content.imageUrl && platform !== Social.Twitter) {
      baseOptions.urls = [content.imageUrl];
    }

    // Platform-specific customizations
    switch (platform) {
      case Social.Facebook:
        return {
          ...baseOptions,
          social: Social.Facebook,
          message: '', // Facebook doesn't allow pre-filled text
        };
      
      case Social.Instagram:
        return {
          ...baseOptions,
          social: Social.Instagram,
          backgroundImage: content.imageUrl,
          backgroundBottomColor: colors.primary.coral,
          backgroundTopColor: colors.primary.teal,
        };
      
      case Social.Twitter:
        return {
          ...baseOptions,
          social: Social.Twitter,
          message: `${content.message} ${content.url || ''}`.trim(),
        };
      
      case Social.WhatsApp:
        return {
          ...baseOptions,
          social: Social.WhatsApp,
          whatsAppNumber: '', // User's number will be used
        };
      
      case Social.SMS:
        return {
          ...baseOptions,
          social: Social.SMS,
          recipient: '', // User will choose recipient
        };
      
      case Social.Email:
        return {
          ...baseOptions,
          social: Social.Email,
          subject: content.title,
          recipient: '',
        };
      
      default:
        return baseOptions;
    }
  };

  // Track sharing events for analytics
  const trackShareEvent = async (platform?: string, success: boolean = true) => {
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      if (content.petId) {
        await trackDocumentAction({
          action: success ? 'share_success' : 'share_failed',
          documentType: content.type,
          petId: content.petId,
          petName: content.petName,
          metadata: {
            platform: platform || 'generic',
            shareType: content.type,
            correlationId,
          },
        });
      }
    } catch (error) {
      console.warn('Failed to track share event:', error);
    }
  };

  // Handle generic sharing (system share sheet)
  const handleGenericShare = async () => {
    if (disabled || isSharing) return;

    setIsSharing(true);
    try {
      const options = generateShareOptions();
      const result = await Share.open(options);
      
      if (result.success) {
        await trackShareEvent(result.app || 'system_share', true);
        onShareSuccess?.(result.app);
      }
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('Share failed:', error);
        await trackShareEvent('system_share', false);
        onShareError?.(error);
        
        Alert.alert(
          'Sharing Failed',
          'Unable to share content. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Handle platform-specific sharing
  const handlePlatformShare = async (platform: SharePlatform) => {
    if (disabled || isSharing) return;

    setIsSharing(true);
    try {
      const options = generateShareOptions(platform.social);
      const result = await Share.shareSingle(options);
      
      if (result.success) {
        await trackShareEvent(platform.name.toLowerCase(), true);
        onShareSuccess?.(platform.name);
      }
    } catch (error: any) {
      console.error(`${platform.name} share failed:`, error);
      await trackShareEvent(platform.name.toLowerCase(), false);
      onShareError?.(error);
      
      Alert.alert(
        'Sharing Failed',
        `Unable to share to ${platform.name}. Please make sure the app is installed and try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSharing(false);
    }
  };

  // Get share button icon based on content type
  const getShareIcon = () => {
    switch (content.type) {
      case 'pet_photo':
        return '📸';
      case 'adoption_success':
        return '🎉';
      case 'appointment_confirmation':
        return '📅';
      case 'pet_profile':
        return '🐾';
      case 'shelter_event':
        return '🎪';
      default:
        return '📤';
    }
  };

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    platformsContainer: {
      marginTop: 12,
      padding: 16,
      backgroundColor: colors.neutral.beige,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.extended.tealVariations.background,
    },
    platformsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.neutral.midnight,
      textAlign: 'center',
      marginBottom: 12,
    },
    platformsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
    },
    platformButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.neutral.beige,
      borderWidth: 1,
      borderColor: colors.extended.tealVariations.background,
      shadowColor: colors.neutral.midnight,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    platformIcon: {
      fontSize: 20,
      marginBottom: 2,
    },
    platformName: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.neutral.midnight,
      textAlign: 'center',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    loadingText: {
      marginLeft: 8,
      fontSize: 14,
      color: colors.extended.textVariations.secondary,
    },
    dismissButton: {
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.extended.textVariations.tertiary + '20',
    },
    dismissText: {
      fontSize: 14,
      color: colors.extended.textVariations.secondary,
      textAlign: 'center',
    },
  });

  if (showPlatformOptions && showPlatforms) {
    return (
      <View style={[styles.container, style]}>
        <Button
          title={isSharing ? `${getShareIcon()} Sharing...` : `${getShareIcon()} ${title}`}
          onPress={handleGenericShare}
          variant={variant}
          size={size}
          disabled={disabled || isSharing}
        />
        
        <View style={styles.platformsContainer}>
          <Text style={styles.platformsTitle}>Share to specific app:</Text>
          
          {isSharing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.coral} />
              <Text style={styles.loadingText}>Sharing...</Text>
            </View>
          ) : (
            <>
              <View style={styles.platformsGrid}>
                {SHARE_PLATFORMS.map((platform) => (
                  <TouchableOpacity
                    key={platform.name}
                    style={[
                      styles.platformButton,
                      { borderColor: platform.color + '40' }
                    ]}
                    onPress={() => handlePlatformShare(platform)}
                    disabled={disabled}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Share to ${platform.name}`}
                    accessibilityHint={`Opens ${platform.name} app to share ${content.type.replace('_', ' ')}`}
                  >
                    <Text style={styles.platformIcon}>{platform.icon}</Text>
                    <Text style={styles.platformName}>{platform.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setShowPlatforms(false)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss sharing options"
              >
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Button
        title={isSharing ? `${getShareIcon()} Sharing...` : `${getShareIcon()} ${title}`}
        onPress={showPlatformOptions ? () => setShowPlatforms(true) : handleGenericShare}
        variant={variant}
        size={size}
        disabled={disabled || isSharing}
        accessibilityRole="button"
        accessibilityLabel={`Share ${content.type.replace('_', ' ')}`}
        accessibilityHint={
          showPlatformOptions 
            ? "Shows sharing options for different social media platforms"
            : "Opens system share sheet to share content"
        }
      />
    </View>
  );
};

export default ShareButton;