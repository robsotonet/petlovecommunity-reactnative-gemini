// Pet Love Community - Pet Detail Screen
// Enterprise pet details with adoption workflow and analytics

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {
  useGetPetByIdQuery,
  useAddPetToFavoritesMutation,
  useRemovePetFromFavoritesMutation,
  useGetUserFavoritesQuery,
  useTrackPetViewMutation,
} from '../services/petApi';
import { useColors } from '../hooks/useColors';
import { useAnalyticsTracker } from '../hooks/useAnalytics';
import { usePetPhotoUpload } from '../hooks/usePetPhotoUpload';
import { Pet } from '../types/pet';
import type { PetDetailNavigationProp, PetDetailRouteProp } from '../types/navigation';
import Button from '../components/Button';
import Card from '../components/Card';
import CameraModal from '../components/CameraModal';

interface PetDetailScreenProps {
  route: PetDetailRouteProp;
  navigation: PetDetailNavigationProp;
}

const { width: screenWidth } = Dimensions.get('window');

const PetDetailScreen: React.FC<PetDetailScreenProps> = ({ route, navigation }) => {
  const { petId } = route.params;
  const colors = useColors();

  // API hooks
  const { data: pet, isLoading, error } = useGetPetByIdQuery(petId);
  const { data: favorites } = useGetUserFavoritesQuery();
  const [addToFavorites, { isLoading: addingFavorite }] = useAddPetToFavoritesMutation();
  const [removeFromFavorites, { isLoading: removingFavorite }] = useRemovePetFromFavoritesMutation();
  const [trackPetView] = useTrackPetViewMutation();

  // Analytics hook
  const { trackPetView: trackPetViewAnalytics, trackPetInteraction, isReady: analyticsReady } = useAnalyticsTracker();

  // Camera and photo upload hook
  const {
    isUploading,
    showCameraModal,
    openCameraModal,
    closeCameraModal,
    handlePhotoSelected,
  } = usePetPhotoUpload({
    petId,
    onUploadSuccess: (photoUrl, photoId) => {
      // Refresh pet data to show new photo
      console.log('Photo uploaded successfully:', { photoUrl, photoId });
      // TODO: Invalidate RTK Query cache to refresh pet data
    },
    onUploadError: (error) => {
      console.error('Photo upload error:', error);
    },
  });

  // Check if pet is favorited
  const isFavorited = favorites?.some(fav => fav.petId === petId) || false;
  const favoriteLoading = addingFavorite || removingFavorite;

  // Track pet view for analytics
  useEffect(() => {
    if (pet && analyticsReady) {
      // Track with real analytics data
      const analyticsData = trackPetViewAnalytics(pet.id, 'direct');
      
      if (analyticsData) {
        // Send to API for server-side analytics
        trackPetView(analyticsData);
      }
    }
  }, [pet, analyticsReady, trackPetViewAnalytics, trackPetView]);

  const handleFavoritePress = async () => {
    try {
      // Track analytics for favorite/unfavorite interaction
      if (analyticsReady) {
        const action = isFavorited ? 'unfavorite' : 'favorite';
        trackPetInteraction(petId, action);
      }

      if (isFavorited) {
        await removeFromFavorites(petId).unwrap();
      } else {
        await addToFavorites({ petId }).unwrap();
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Unable to update favorites. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAdoptPress = () => {
    if (!pet) return;
    
    // Track analytics for adoption process start
    if (analyticsReady) {
      trackPetInteraction(petId, 'application_start');
    }
    
    Alert.alert(
      'Start Adoption Process',
      `Begin adoption application for ${pet.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Application', 
          onPress: () => {
            // TODO: Navigate to adoption application screen
            navigation.navigate('AdoptionApplication', { petId: pet.id });
          }
        },
      ]
    );
  };

  const handleContactShelter = () => {
    if (!pet) return;
    
    // Track analytics for shelter contact
    if (analyticsReady) {
      trackPetInteraction(petId, 'contact', { shelter: pet.shelter.name });
    }
    
    Alert.alert(
      'Contact Shelter',
      `Contact ${pet.shelter.name} about ${pet.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => {/* TODO: Open phone app */} },
        { text: 'Email', onPress: () => {/* TODO: Open email app */} },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.neutral.beige }]}>
        <ActivityIndicator size="large" color={colors.primary.coral} />
        <Text style={[styles.loadingText, { color: colors.extended.textVariations.secondary }]}>
          Loading pet details...
        </Text>
      </View>
    );
  }

  if (error || !pet) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.neutral.beige }]}>
        <Text style={[styles.errorTitle, { color: colors.semantic.error }]}>
          Pet Not Found
        </Text>
        <Text style={[styles.errorText, { color: colors.extended.textVariations.secondary }]}>
          This pet may no longer be available for adoption.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          type="secondary"
        />
      </View>
    );
  }

  const renderCharacteristicBar = (label: string, value: number, maxValue: number = 5) => (
    <View style={styles.characteristicItem}>
      <Text style={[styles.characteristicLabel, { color: colors.extended.textVariations.secondary }]}>
        {label}
      </Text>
      <View style={styles.characteristicBar}>
        <View 
          style={[
            styles.characteristicFill, 
            { 
              backgroundColor: colors.primary.teal,
              width: `${(value / maxValue) * 100}%`
            }
          ]} 
        />
      </View>
      <Text style={[styles.characteristicValue, { color: colors.extended.textVariations.tertiary }]}>
        {value}/{maxValue}
      </Text>
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.neutral.beige }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Image Section */}
      <TouchableOpacity 
        style={[styles.heroImageContainer, { backgroundColor: colors.extended.tealVariations.background }]}
        onPress={() => {
          navigation.navigate('PetGallery', { petId: pet.id, photoIndex: 0 });
        }}
        activeOpacity={0.8}
      >
        <View style={styles.heroImageContent}>
          <Text style={[styles.heroImageText, { color: colors.neutral.midnight }]}>
            📷 {pet.photos.length}
          </Text>
          <Text style={[styles.heroImageSubtext, { color: colors.extended.textVariations.secondary }]}>
            photos of {pet.name}
          </Text>
          <Text style={[styles.heroImageHint, { color: colors.extended.textVariations.tertiary }]}>
            Tap to view gallery
          </Text>
        </View>
        
        {/* Status overlay */}
        <View style={styles.statusOverlay}>
          <View style={[
            styles.statusBadgeLarge,
            { 
              backgroundColor: pet.status === 'available' 
                ? colors.semantic.success 
                : colors.extended.textVariations.tertiary 
            }
          ]}>
            <Text style={styles.statusTextLarge}>
              {pet.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Pet Info */}
      <View style={styles.content}>
        {/* Main Pet Information */}
        <Card style={styles.mainInfoCard}>
          <View style={styles.petNameSection}>
            <Text style={[styles.petName, { color: colors.neutral.midnight }]}>
              {pet.name}
            </Text>
            <Text style={[styles.petBreed, { color: colors.extended.textVariations.secondary }]}>
              {pet.breed} • {pet.age} years • {pet.gender}
            </Text>
            <Text style={[styles.location, { color: colors.extended.textVariations.tertiary }]}>
              📍 {pet.location.city}, {pet.location.state}
            </Text>
          </View>

          {/* Adoption Fee Highlight */}
          <View style={[styles.adoptionFeeCard, { backgroundColor: colors.extended.coralVariations.light }]}>
            <Text style={[styles.adoptionFeeLabel, { color: colors.neutral.midnight }]}>
              Adoption Fee
            </Text>
            <Text style={[styles.adoptionFeeAmount, { color: colors.primary.coral }]}>
              ${pet.adoptionInfo.adoptionFee}
            </Text>
          </View>
        </Card>

        {/* Primary Action Buttons */}
        <Card style={styles.actionsCard}>
          <View style={styles.primaryActions}>
            <Button
              title="❤️ Start Adoption Process"
              onPress={handleAdoptPress}
              type="primary"
              accessibilityLabel={`Start adoption process for ${pet.name}`}
              style={styles.adoptButton}
            />
            
            <View style={styles.secondaryActionsRow}>
              <View style={styles.favoriteButtonContainer}>
                <Button
                  title={isFavorited ? '💝 Favorited' : '🤍 Favorite'}
                  onPress={handleFavoritePress}
                  type="secondary"
                  disabled={favoriteLoading}
                  accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                />
              </View>
              <View style={styles.contactButtonContainer}>
                <Button
                  title="📞 Contact Shelter"
                  onPress={handleContactShelter}
                  type="secondary"
                />
              </View>
            </View>

            {/* Photo Upload Action */}
            <View style={styles.photoUploadSection}>
              <Button
                title={isUploading ? "📤 Uploading..." : "📷 Add Photo"}
                onPress={openCameraModal}
                type="secondary"
                disabled={isUploading}
                style={[styles.photoUploadButton, { 
                  backgroundColor: isUploading 
                    ? colors.extended.textVariations.tertiary 
                    : colors.extended.tealVariations.background 
                }]}
                accessibilityLabel="Add a photo of this pet"
              />
            </View>
          </View>
        </Card>

        {/* Description */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
            About {pet.name}
          </Text>
          <Text style={[styles.description, { color: colors.extended.textVariations.secondary }]}>
            {pet.description}
          </Text>
        </Card>

        {/* Characteristics */}
        <Card style={styles.characteristicsCard}>
          <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
            🐾 Personality & Traits
          </Text>
          
          {/* Quick Traits Grid */}
          <View style={styles.quickTraitsGrid}>
            <View style={[styles.quickTrait, { backgroundColor: colors.extended.tealVariations.background }]}>
              <Text style={[styles.quickTraitText, { color: colors.neutral.midnight }]}>
                {pet.characteristics.houseTrained ? '✅' : '❌'} House Trained
              </Text>
            </View>
            <View style={[styles.quickTrait, { backgroundColor: colors.extended.tealVariations.background }]}>
              <Text style={[styles.quickTraitText, { color: colors.neutral.midnight }]}>
                {pet.characteristics.spayedNeutered ? '✅' : '❌'} Spayed/Neutered
              </Text>
            </View>
            <View style={[styles.quickTrait, { backgroundColor: colors.extended.tealVariations.background }]}>
              <Text style={[styles.quickTraitText, { color: colors.neutral.midnight }]}>
                {pet.characteristics.friendlinessWithChildren >= 4 ? '✅' : '❌'} Good with Kids
              </Text>
            </View>
            <View style={[styles.quickTrait, { backgroundColor: colors.extended.tealVariations.background }]}>
              <Text style={[styles.quickTraitText, { color: colors.neutral.midnight }]}>
                {pet.characteristics.friendlinessWithPets >= 4 ? '✅' : '❌'} Good with Pets
              </Text>
            </View>
          </View>

          {/* Detailed Characteristics */}
          <View style={styles.characteristicsSection}>
            <Text style={[styles.characteristicsSubtitle, { color: colors.extended.textVariations.secondary }]}>
              Detailed Traits
            </Text>
            {renderCharacteristicBar('Energy Level', pet.characteristics.energyLevel)}
            {renderCharacteristicBar('Good with Children', pet.characteristics.friendlinessWithChildren)}
            {renderCharacteristicBar('Good with Pets', pet.characteristics.friendlinessWithPets)}
            {renderCharacteristicBar('Trainability', pet.characteristics.trainability)}
            {renderCharacteristicBar('Grooming Needs', pet.characteristics.groomingNeeds)}
          </View>
        </Card>

        {/* Adoption Process */}
        <Card style={styles.adoptionProcessCard}>
          <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
            📋 Adoption Process
          </Text>
          <View style={styles.processSteps}>
            {pet.adoptionInfo.adoptionProcess.map((step, index) => (
              <View key={index} style={styles.processStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary.coral }]}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.extended.textVariations.secondary }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Shelter Info */}
        <Card style={styles.shelterCard}>
          <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
            🏠 Shelter Information
          </Text>
          
          <View style={styles.shelterHeader}>
            <View style={styles.shelterNameSection}>
              <Text style={[styles.shelterName, { color: colors.primary.teal }]}>
                {pet.shelter.name}
              </Text>
              <View style={styles.shelterRating}>
                <Text style={[styles.shelterInfo, { color: colors.extended.textVariations.secondary }]}>
                  ⭐ {pet.shelter.rating}/5
                </Text>
                <Text style={[styles.shelterReviews, { color: colors.extended.textVariations.tertiary }]}>
                  ({pet.shelter.totalReviews} reviews)
                </Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.shelterAddress, { backgroundColor: colors.extended.tealVariations.background }]}>
            <Text style={[styles.shelterAddressText, { color: colors.neutral.midnight }]}>
              📍 {pet.shelter.address}
            </Text>
          </View>
        </Card>
      </View>

      {/* Camera Modal */}
      <CameraModal
        visible={showCameraModal}
        onClose={closeCameraModal}
        onPhotoSelected={handlePhotoSelected}
        title={`Add Photo for ${pet.name}`}
        subtitle="Help other potential adopters see this pet"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Hero Image Styles
  heroImageContainer: {
    height: 280,
    position: 'relative',
  },
  heroImageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImageText: {
    fontSize: 24,
    fontWeight: '700',
  },
  heroImageSubtext: {
    fontSize: 16,
    marginTop: 4,
  },
  heroImageHint: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  statusOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusTextLarge: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Content Styles
  content: {
    padding: 16,
    gap: 16,
  },
  // Main Info Card
  mainInfoCard: {
    padding: 20,
  },
  petNameSection: {
    marginBottom: 16,
  },
  petName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  petBreed: {
    fontSize: 18,
    marginBottom: 6,
  },
  location: {
    fontSize: 16,
  },
  adoptionFeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  adoptionFeeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  adoptionFeeAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  // Actions Card
  actionsCard: {
    padding: 20,
  },
  primaryActions: {
    gap: 16,
  },
  adoptButton: {
    paddingVertical: 4,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  favoriteButtonContainer: {
    flex: 1,
  },
  contactButtonContainer: {
    flex: 1,
  },
  photoUploadSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  photoUploadButton: {
    marginTop: 4,
  },
  // Section Styles
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  // Characteristics Styles
  characteristicsCard: {
    padding: 20,
  },
  quickTraitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  quickTrait: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickTraitText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  characteristicsSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  characteristicsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  characteristicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  characteristicLabel: {
    flex: 1,
    fontSize: 14,
  },
  characteristicBar: {
    flex: 2,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  characteristicFill: {
    height: '100%',
    borderRadius: 4,
  },
  characteristicValue: {
    width: 30,
    fontSize: 12,
    textAlign: 'right',
  },
  // Adoption Process Styles
  adoptionProcessCard: {
    padding: 20,
  },
  processSteps: {
    gap: 16,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  // Shelter Info Styles
  shelterCard: {
    padding: 20,
  },
  shelterHeader: {
    marginBottom: 16,
  },
  shelterNameSection: {
    gap: 8,
  },
  shelterName: {
    fontSize: 20,
    fontWeight: '700',
  },
  shelterRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shelterInfo: {
    fontSize: 16,
    fontWeight: '500',
  },
  shelterReviews: {
    fontSize: 14,
  },
  shelterAddress: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shelterAddressText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PetDetailScreen;