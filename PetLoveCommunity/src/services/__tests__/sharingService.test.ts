// Pet Love Community - Sharing Service Tests
// Comprehensive unit tests for sharing content generation and analytics

import sharingService from '../sharingService';
import correlationIdService from '../correlationIdService';
import adoptionAnalyticsService from '../adoptionAnalyticsService';

// Mock dependencies
jest.mock('../correlationIdService', () => ({
  getCorrelationId: jest.fn(),
}));

jest.mock('../adoptionAnalyticsService', () => ({
  trackEvent: jest.fn(),
}));

const mockCorrelationIdService = correlationIdService as jest.Mocked<typeof correlationIdService>;
const mockAdoptionAnalyticsService = adoptionAnalyticsService as jest.Mocked<typeof adoptionAnalyticsService>;

describe('SharingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCorrelationIdService.getCorrelationId.mockResolvedValue('correlation-123');
  });

  describe('Pet Photo Content Generation', () => {
    it('generates correct content for pet photos', () => {
      const pet = {
        id: 'pet-123',
        name: 'Buddy',
        breed: 'Golden Retriever',
        age: '2 years old',
        description: 'A friendly and energetic dog who loves to play fetch and swim. Great with kids and other pets.',
        images: ['https://example.com/buddy1.jpg', 'https://example.com/buddy2.jpg'],
        shelter: {
          id: 'shelter-123',
          name: 'Happy Paws Shelter',
          website: 'https://happypaws.org',
        },
      };

      const photoUrl = 'https://example.com/buddy1.jpg';
      const content = sharingService.generatePetPhotoContent(pet, photoUrl);

      expect(content.type).toBe('pet_photo');
      expect(content.title).toBe('Meet Buddy - Available for Adoption!');
      expect(content.message).toContain('Check out Buddy, a beautiful 2 years old Golden Retriever! 🐾');
      expect(content.message).toContain('Happy Paws Shelter');
      expect(content.message).toContain('#PetAdoption #GoldenRetriever');
      expect(content.url).toBe('https://petlovecommunity.app/pets/pet-123');
      expect(content.imageUrl).toBe(photoUrl);
      expect(content.petId).toBe('pet-123');
      expect(content.petName).toBe('Buddy');
      expect(content.shelterId).toBe('shelter-123');
      expect(content.shelterName).toBe('Happy Paws Shelter');
    });

    it('truncates long descriptions in pet photo content', () => {
      const pet = {
        id: 'pet-123',
        name: 'Buddy',
        breed: 'Golden Retriever',
        age: '2 years old',
        description: 'A'.repeat(150), // Very long description
        images: ['https://example.com/buddy.jpg'],
        shelter: {
          id: 'shelter-123',
          name: 'Happy Paws Shelter',
        },
      };

      const content = sharingService.generatePetPhotoContent(pet, 'photo.jpg');

      expect(content.message).toContain('A'.repeat(100));
      expect(content.message).toContain('...');
      expect(content.message.length).toBeLessThan(300); // Reasonable message length
    });
  });

  describe('Pet Profile Content Generation', () => {
    it('generates correct content for pet profiles', () => {
      const pet = {
        id: 'pet-456',
        name: 'Mittens',
        breed: 'Maine Coon',
        age: '3 years old',
        description: 'A gentle and affectionate cat who enjoys sunbathing and being petted.',
        images: ['https://example.com/mittens.jpg'],
        shelter: {
          id: 'shelter-456',
          name: 'Feline Friends Rescue',
        },
      };

      const content = sharingService.generatePetProfileContent(pet);

      expect(content.type).toBe('pet_profile');
      expect(content.title).toBe('Mittens Needs a Home - Pet Adoption');
      expect(content.message).toContain('🐾 Mittens is looking for a forever home!');
      expect(content.message).toContain('• Maine Coon');
      expect(content.message).toContain('• 3 years old');
      expect(content.message).toContain('• Available at Feline Friends Rescue');
      expect(content.message).toContain('#AdoptDontShop #PetRescue');
      expect(content.url).toBe('https://petlovecommunity.app/pets/pet-456');
      expect(content.imageUrl).toBe('https://example.com/mittens.jpg');
    });
  });

  describe('Adoption Success Content Generation', () => {
    it('generates correct content for adoption success stories', () => {
      const success = {
        petId: 'pet-789',
        petName: 'Max',
        adopterName: 'Johnson Family',
        adoptionDate: new Date('2025-01-15'),
        successStory: 'Max has brought so much joy to our family and loves playing in our backyard.',
        beforeAfterPhotos: {
          before: 'https://example.com/max-before.jpg',
          after: 'https://example.com/max-after.jpg',
        },
        shelter: {
          id: 'shelter-789',
          name: 'Second Chance Animal Rescue',
        },
      };

      const content = sharingService.generateAdoptionSuccessContent(success);

      expect(content.type).toBe('adoption_success');
      expect(content.title).toBe('Max Found Their Forever Home! 🎉');
      expect(content.message).toContain('🎉 Amazing news! Max has found their forever home with Johnson Family! 💕');
      expect(content.message).toContain('Max has brought so much joy to our family');
      expect(content.message).toContain('Thank you to Second Chance Animal Rescue');
      expect(content.message).toContain('#AdoptionSuccess #HappyEnding #Max');
      expect(content.url).toBe('https://petlovecommunity.app/success-stories/pet-789');
      expect(content.imageUrl).toBe('https://example.com/max-after.jpg');
    });

    it('uses default success story when none provided', () => {
      const success = {
        petId: 'pet-789',
        petName: 'Max',
        adopterName: 'Johnson Family',
        adoptionDate: new Date('2025-01-15'),
        shelter: {
          id: 'shelter-789',
          name: 'Second Chance Animal Rescue',
        },
      };

      const content = sharingService.generateAdoptionSuccessContent(success);

      expect(content.message).toContain('Max is now living their best life and brings joy to their new family every day.');
    });
  });

  describe('Appointment Confirmation Content Generation', () => {
    it('generates correct content for appointments with pet name', () => {
      const appointment = {
        id: 'appt-123',
        type: 'Meet & Greet',
        petName: 'Luna',
        shelterName: 'City Animal Shelter',
        date: new Date('2025-02-01T14:30:00Z'),
        confirmationNumber: 'CONF-12345',
      };

      const content = sharingService.generateAppointmentConfirmationContent(appointment);

      expect(content.type).toBe('appointment_confirmation');
      expect(content.title).toBe('Pet Appointment Scheduled - City Animal Shelter');
      expect(content.message).toContain('📅 I have a Meet & Greet scheduled with Luna at City Animal Shelter!');
      expect(content.message).toContain('So excited to meet this wonderful pet! 🐾');
      expect(content.message).toContain('#PetAdoption #MeetGreet');
      expect(content.url).toBe('https://petlovecommunity.app/appointments/CONF-12345');
    });

    it('generates correct content for appointments without pet name', () => {
      const appointment = {
        id: 'appt-456',
        type: 'Shelter Visit',
        shelterName: 'City Animal Shelter',
        date: new Date('2025-02-01T10:00:00Z'),
      };

      const content = sharingService.generateAppointmentConfirmationContent(appointment);

      expect(content.message).toContain('📅 I have an appointment at City Animal Shelter!');
      expect(content.message).toContain('Looking forward to finding my perfect pet companion! 🐾');
      expect(content.url).toBeUndefined();
    });
  });

  describe('Shelter Event Content Generation', () => {
    it('generates correct content for shelter events', () => {
      const event = {
        id: 'event-123',
        title: 'Adoption Fair 2025',
        description: 'Join us for our biggest adoption event of the year! Meet dozens of pets looking for homes, enjoy food trucks, and participate in fun activities for the whole family.',
        date: new Date('2025-03-15T10:00:00Z'),
        location: 'Central Park Pavilion',
        shelter: {
          id: 'shelter-123',
          name: 'Happy Paws Shelter',
        },
        imageUrl: 'https://example.com/adoption-fair.jpg',
      };

      const content = sharingService.generateShelterEventContent(event);

      expect(content.type).toBe('shelter_event');
      expect(content.title).toBe('Adoption Fair 2025');
      expect(content.message).toContain('🎪 Don\'t miss "Adoption Fair 2025" at Happy Paws Shelter!');
      expect(content.message).toContain('📅 Saturday, March 15, 2025');
      expect(content.message).toContain('📍 Central Park Pavilion');
      expect(content.message).toContain('Join us for our biggest adoption event');
      expect(content.message).toContain('#ShelterEvent #CommunityEvent #HappyPawsShelter');
      expect(content.url).toBe('https://petlovecommunity.app/events/event-123');
      expect(content.imageUrl).toBe('https://example.com/adoption-fair.jpg');
    });

    it('truncates long event descriptions', () => {
      const event = {
        id: 'event-123',
        title: 'Long Event',
        description: 'A'.repeat(250), // Very long description
        date: new Date('2025-03-15T10:00:00Z'),
        location: 'Test Location',
        shelter: {
          id: 'shelter-123',
          name: 'Test Shelter',
        },
      };

      const content = sharingService.generateShelterEventContent(event);

      expect(content.message).toContain('A'.repeat(200));
      expect(content.message).toContain('...');
    });
  });

  describe('Sharing Analytics Tracking', () => {
    it('tracks successful sharing events', async () => {
      await sharingService.trackSharingEvent(
        'pet_photo',
        'facebook',
        true,
        'pet-123',
        'shelter-456'
      );

      expect(mockAdoptionAnalyticsService.trackEvent).toHaveBeenCalledWith({
        eventType: 'share_success',
        category: 'social_sharing',
        properties: {
          contentType: 'pet_photo',
          platform: 'facebook',
          petId: 'pet-123',
          shelterId: 'shelter-456',
          correlationId: 'correlation-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('tracks failed sharing events', async () => {
      await sharingService.trackSharingEvent(
        'adoption_success',
        'twitter',
        false,
        'pet-456'
      );

      expect(mockAdoptionAnalyticsService.trackEvent).toHaveBeenCalledWith({
        eventType: 'share_failed',
        category: 'social_sharing',
        properties: {
          contentType: 'adoption_success',
          platform: 'twitter',
          petId: 'pet-456',
          shelterId: undefined,
          correlationId: 'correlation-123',
          timestamp: expect.any(String),
        },
      });
    });

    it('handles analytics tracking errors gracefully', async () => {
      mockAdoptionAnalyticsService.trackEvent.mockRejectedValue(new Error('Analytics error'));

      await expect(
        sharingService.trackSharingEvent('pet_photo', 'instagram', true)
      ).resolves.not.toThrow();
    });
  });

  describe('Sharing Capability Validation', () => {
    it('validates sharing capabilities', async () => {
      const result = await sharingService.validateSharingCapability();

      expect(result.canShare).toBe(true);
      expect(result.availablePlatforms).toContain('facebook');
      expect(result.availablePlatforms).toContain('instagram');
      expect(result.availablePlatforms).toContain('twitter');
      expect(result.availablePlatforms).toContain('whatsapp');
      expect(result.availablePlatforms).toContain('email');
      expect(result.availablePlatforms).toContain('sms');
    });
  });

  describe('Privacy-Compliant Content Generation', () => {
    it('generates public privacy level content unchanged', () => {
      const originalContent = {
        type: 'pet_photo' as const,
        title: 'Meet Buddy - Available for Adoption!',
        message: 'Check out Buddy at Happy Paws Shelter!',
        petName: 'Buddy',
        shelterId: 'shelter-123',
        shelterName: 'Happy Paws Shelter',
      };

      const result = sharingService.generatePrivacyCompliantContent(originalContent, 'public');

      expect(result).toEqual(originalContent);
    });

    it('generates limited privacy level content with shelter info removed', () => {
      const originalContent = {
        type: 'pet_photo' as const,
        title: 'Meet Buddy - Available for Adoption!',
        message: 'Check out Buddy at Happy Paws Shelter!',
        petName: 'Buddy',
        shelterId: 'shelter-123',
        shelterName: 'Happy Paws Shelter',
      };

      const result = sharingService.generatePrivacyCompliantContent(originalContent, 'limited');

      expect(result.message).toBe('Check out Buddy at a local shelter!');
      expect(result.petName).toBe('Buddy');
      expect(result.shelterId).toBeUndefined();
    });

    it('generates private privacy level content with all identifying info removed', () => {
      const originalContent = {
        type: 'pet_photo' as const,
        title: 'Meet Buddy - Available for Adoption!',
        message: 'Check out Buddy at Happy Paws Shelter!',
        petName: 'Buddy',
        shelterId: 'shelter-123',
        shelterName: 'Happy Paws Shelter',
      };

      const result = sharingService.generatePrivacyCompliantContent(originalContent, 'private');

      expect(result.message).toBe('Check out [Pet Name] at [Pet Name] Shelter!');
      expect(result.petName).toBeUndefined();
      expect(result.shelterId).toBeUndefined();
      expect(result.shelterName).toBe('Local Shelter');
    });
  });

  describe('Sharing Statistics', () => {
    it('returns sharing statistics structure', async () => {
      const stats = await sharingService.getSharingStats();

      expect(stats).toHaveProperty('totalShares');
      expect(stats).toHaveProperty('byPlatform');
      expect(stats).toHaveProperty('byContentType');
      expect(stats).toHaveProperty('topSharedPets');
      expect(stats.byContentType).toHaveProperty('pet_photo');
      expect(stats.byContentType).toHaveProperty('adoption_success');
      expect(stats.byContentType).toHaveProperty('appointment_confirmation');
      expect(stats.byContentType).toHaveProperty('pet_profile');
      expect(stats.byContentType).toHaveProperty('shelter_event');
    });

    it('handles date range parameters', async () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const stats = await sharingService.getSharingStats(dateRange);

      expect(stats).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles pets with very short descriptions', () => {
      const pet = {
        id: 'pet-123',
        name: 'Buddy',
        breed: 'Dog',
        age: '1 year',
        description: 'Sweet.',
        images: ['photo.jpg'],
        shelter: {
          id: 'shelter-123',
          name: 'Test Shelter',
        },
      };

      const content = sharingService.generatePetPhotoContent(pet, 'photo.jpg');

      expect(content.message).toContain('Sweet.');
      expect(content.message).not.toContain('...');
    });

    it('handles breeds with multiple words for hashtags', () => {
      const pet = {
        id: 'pet-123',
        name: 'Buddy',
        breed: 'German Shepherd Dog',
        age: '2 years',
        description: 'Great dog.',
        images: ['photo.jpg'],
        shelter: {
          id: 'shelter-123',
          name: 'Test Shelter',
        },
      };

      const content = sharingService.generatePetPhotoContent(pet, 'photo.jpg');

      expect(content.message).toContain('#GermanShepherdDog');
    });

    it('handles missing shelter website gracefully', () => {
      const pet = {
        id: 'pet-123',
        name: 'Buddy',
        breed: 'Dog',
        age: '1 year',
        description: 'Good dog.',
        images: ['photo.jpg'],
        shelter: {
          id: 'shelter-123',
          name: 'Test Shelter',
          // No website property
        },
      };

      const content = sharingService.generatePetProfileContent(pet);

      expect(content.shelterName).toBe('Test Shelter');
    });
  });
});