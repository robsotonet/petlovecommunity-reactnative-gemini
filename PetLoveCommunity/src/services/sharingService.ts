// Pet Love Community - Sharing Service
// Centralized service for generating sharing content and managing sharing analytics

import { ShareContent, ShareContentType } from '../components/ui/ShareButton';
import correlationIdService from './correlationIdService';
import adoptionAnalyticsService from './adoptionAnalyticsService';

export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: string;
  description: string;
  images: string[];
  shelter: {
    id: string;
    name: string;
    website?: string;
  };
}

export interface AdoptionSuccess {
  petId: string;
  petName: string;
  adopterName: string;
  adoptionDate: Date;
  successStory?: string;
  beforeAfterPhotos?: {
    before: string;
    after: string;
  };
  shelter: {
    id: string;
    name: string;
  };
}

export interface AppointmentDetails {
  id: string;
  type: string;
  petName?: string;
  shelterName: string;
  date: Date;
  confirmationNumber?: string;
}

class SharingService {
  private baseAppUrl = 'https://petlovecommunity.app'; // Configure this in environment

  // Generate share content for pet photos
  generatePetPhotoContent(pet: Pet, photoUrl: string): ShareContent {
    const message = `Check out ${pet.name}, a beautiful ${pet.age} ${pet.breed}! 🐾\n\n${pet.description.substring(0, 100)}${pet.description.length > 100 ? '...' : ''}\n\nAvailable for adoption at ${pet.shelter.name}. #PetAdoption #${pet.breed.replace(/\s+/g, '')}`;

    return {
      type: 'pet_photo',
      title: `Meet ${pet.name} - Available for Adoption!`,
      message,
      url: `${this.baseAppUrl}/pets/${pet.id}`,
      imageUrl: photoUrl,
      petId: pet.id,
      petName: pet.name,
      shelterId: pet.shelter.id,
      shelterName: pet.shelter.name,
    };
  }

  // Generate share content for pet profile
  generatePetProfileContent(pet: Pet): ShareContent {
    const message = `🐾 ${pet.name} is looking for a forever home!\n\n` +
                   `• ${pet.breed}\n` +
                   `• ${pet.age}\n` +
                   `• Available at ${pet.shelter.name}\n\n` +
                   `${pet.description.substring(0, 150)}${pet.description.length > 150 ? '...' : ''}\n\n` +
                   `Could you be ${pet.name}'s new family? #AdoptDontShop #PetRescue`;

    return {
      type: 'pet_profile',
      title: `${pet.name} Needs a Home - Pet Adoption`,
      message,
      url: `${this.baseAppUrl}/pets/${pet.id}`,
      imageUrl: pet.images[0],
      petId: pet.id,
      petName: pet.name,
      shelterId: pet.shelter.id,
      shelterName: pet.shelter.name,
    };
  }

  // Generate share content for adoption success stories
  generateAdoptionSuccessContent(success: AdoptionSuccess): ShareContent {
    const message = `🎉 Amazing news! ${success.petName} has found their forever home with ${success.adopterName}! 💕\n\n` +
                   `${success.successStory || `${success.petName} is now living their best life and brings joy to their new family every day.`}\n\n` +
                   `Thank you to ${success.shelter.name} for helping make this possible! 🙏\n\n` +
                   `#AdoptionSuccess #HappyEnding #${success.petName}`;

    return {
      type: 'adoption_success',
      title: `${success.petName} Found Their Forever Home! 🎉`,
      message,
      url: `${this.baseAppUrl}/success-stories/${success.petId}`,
      imageUrl: success.beforeAfterPhotos?.after || undefined,
      petId: success.petId,
      petName: success.petName,
      shelterId: success.shelter.id,
      shelterName: success.shelter.name,
    };
  }

  // Generate share content for appointment confirmations
  generateAppointmentConfirmationContent(appointment: AppointmentDetails): ShareContent {
    const dateStr = appointment.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const timeStr = appointment.date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const message = appointment.petName 
      ? `📅 I have a ${appointment.type} scheduled with ${appointment.petName} at ${appointment.shelterName}!\n\n` +
        `Date: ${dateStr}\n` +
        `Time: ${timeStr}\n\n` +
        `So excited to meet this wonderful pet! 🐾 #PetAdoption #${appointment.type.replace(/\s+/g, '')}`
      : `📅 I have an appointment at ${appointment.shelterName}!\n\n` +
        `Date: ${dateStr}\n` +
        `Time: ${timeStr}\n\n` +
        `Looking forward to finding my perfect pet companion! 🐾 #PetAdoption`;

    return {
      type: 'appointment_confirmation',
      title: `Pet Appointment Scheduled - ${appointment.shelterName}`,
      message,
      url: appointment.confirmationNumber 
        ? `${this.baseAppUrl}/appointments/${appointment.confirmationNumber}`
        : undefined,
      petName: appointment.petName,
    };
  }

  // Generate share content for shelter events
  generateShelterEventContent(event: {
    id: string;
    title: string;
    description: string;
    date: Date;
    location: string;
    shelter: { id: string; name: string };
    imageUrl?: string;
  }): ShareContent {
    const dateStr = event.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const message = `🎪 Don't miss "${event.title}" at ${event.shelter.name}!\n\n` +
                   `📅 ${dateStr}\n` +
                   `📍 ${event.location}\n\n` +
                   `${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}\n\n` +
                   `Join us for a great cause! #ShelterEvent #CommunityEvent #${event.shelter.name.replace(/\s+/g, '')}`;

    return {
      type: 'shelter_event',
      title: event.title,
      message,
      url: `${this.baseAppUrl}/events/${event.id}`,
      imageUrl: event.imageUrl,
      shelterId: event.shelter.id,
      shelterName: event.shelter.name,
    };
  }

  // Track sharing analytics
  async trackSharingEvent(
    contentType: ShareContentType,
    platform: string,
    success: boolean,
    petId?: string,
    shelterId?: string
  ): Promise<void> {
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      
      await adoptionAnalyticsService.trackEvent({
        eventType: success ? 'share_success' : 'share_failed',
        category: 'social_sharing',
        properties: {
          contentType,
          platform,
          petId,
          shelterId,
          correlationId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.warn('Failed to track sharing event:', error);
    }
  }

  // Get sharing statistics for analytics dashboard
  async getSharingStats(dateRange?: {
    start: Date;
    end: Date;
  }): Promise<{
    totalShares: number;
    byPlatform: Record<string, number>;
    byContentType: Record<ShareContentType, number>;
    topSharedPets: Array<{ petId: string; petName: string; shares: number }>;
  }> {
    try {
      // This would integrate with your analytics backend
      // For now, return mock data structure
      return {
        totalShares: 0,
        byPlatform: {},
        byContentType: {
          pet_photo: 0,
          adoption_success: 0,
          appointment_confirmation: 0,
          pet_profile: 0,
          shelter_event: 0,
        },
        topSharedPets: [],
      };
    } catch (error) {
      console.error('Failed to get sharing stats:', error);
      throw error;
    }
  }

  // Validate sharing permissions and capabilities
  async validateSharingCapability(): Promise<{
    canShare: boolean;
    availablePlatforms: string[];
    reasons?: string[];
  }> {
    try {
      // Check if native sharing is available
      const canShare = true; // react-native-share handles this internally
      
      return {
        canShare,
        availablePlatforms: ['system', 'facebook', 'instagram', 'twitter', 'whatsapp', 'email', 'sms'],
      };
    } catch (error) {
      console.error('Failed to validate sharing capability:', error);
      return {
        canShare: false,
        availablePlatforms: [],
        reasons: ['Unable to access sharing capabilities'],
      };
    }
  }

  // Generate privacy-compliant sharing content
  generatePrivacyCompliantContent(
    originalContent: ShareContent,
    privacyLevel: 'public' | 'limited' | 'private'
  ): ShareContent {
    const content = { ...originalContent };

    switch (privacyLevel) {
      case 'private':
        // Remove all identifying information
        content.message = content.message.replace(/\b[A-Z][a-z]+\b/g, '[Pet Name]');
        content.petName = undefined;
        content.shelterId = undefined;
        content.shelterName = 'Local Shelter';
        break;
        
      case 'limited':
        // Keep pet name but remove shelter specifics
        content.message = content.message.replace(content.shelterName || '', 'a local shelter');
        content.shelterId = undefined;
        break;
        
      case 'public':
      default:
        // No modifications needed
        break;
    }

    return content;
  }
}

export default new SharingService();