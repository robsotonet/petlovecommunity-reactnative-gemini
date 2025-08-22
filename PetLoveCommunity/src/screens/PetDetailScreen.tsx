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
import { Pet } from '../types/pet';
import type { PetDetailNavigationProp, PetDetailRouteProp } from '../types/navigation';
import Button from '../components/Button';
import Card from '../components/Card';

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
      {/* Pet Images */}
      <View style={[styles.imageContainer, { backgroundColor: colors.extended.tealVariations.background }]}>
        <Text style={[styles.imagePlaceholder, { color: colors.neutral.midnight }]}>
          📷 {pet.photos.length} photos of {pet.name}
        </Text>
      </View>

      {/* Pet Info */}
      <View style={styles.content}>
        <Card>
          <View style={styles.headerSection}>
            <View style={styles.titleRow}>
              <View style={styles.titleInfo}>
                <Text style={[styles.petName, { color: colors.neutral.midnight }]}>
                  {pet.name}
                </Text>
                <Text style={[styles.petBreed, { color: colors.extended.textVariations.secondary }]}>
                  {pet.breed} • {pet.age} years • {pet.gender}
                </Text>
              </View>

              {/* Status Badge */}
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: pet.status === 'available' 
                    ? colors.semantic.success 
                    : colors.extended.textVariations.tertiary 
                }
              ]}>
                <Text style={styles.statusText}>
                  {pet.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={[styles.location, { color: colors.extended.textVariations.tertiary }]}>
              📍 {pet.location.city}, {pet.location.state}
            </Text>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <View style={styles.buttonRow}>
                <View style={styles.primaryButton}>
                  <Button
                    title="❤️ Adopt Me"
                    onPress={handleAdoptPress}
                    type="primary"
                    accessibilityLabel={`Start adoption process for ${pet.name}`}
                  />
                </View>
                <View style={styles.favoriteButton}>
                  <Button
                    title={isFavorited ? '💝 Favorited' : '🤍 Favorite'}
                    onPress={handleFavoritePress}
                    type="secondary"
                    accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                  />
                </View>
              </View>
              <Button
                title={`Contact ${pet.shelter.name}`}
                onPress={handleContactShelter}
                type="secondary"
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
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
            Personality & Traits
          </Text>
          {renderCharacteristicBar('Energy Level', pet.characteristics.energyLevel)}
          {renderCharacteristicBar('Good with Children', pet.characteristics.friendlinessWithChildren)}
          {renderCharacteristicBar('Good with Pets', pet.characteristics.friendlinessWithPets)}
          {renderCharacteristicBar('Trainability', pet.characteristics.trainability)}
          {renderCharacteristicBar('Grooming Needs', pet.characteristics.groomingNeeds)}

          <View style={styles.booleanTraits}>
            <Text style={[styles.traitItem, { color: colors.extended.textVariations.secondary }]}>
              {pet.characteristics.houseTrained ? '✅' : '❌'} House Trained
            </Text>
            <Text style={[styles.traitItem, { color: colors.extended.textVariations.secondary }]}>
              {pet.characteristics.spayedNeutered ? '✅' : '❌'} Spayed/Neutered
            </Text>
          </View>
        </Card>

        {/* Adoption Info */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
            Adoption Details
          </Text>
          <Text style={[styles.adoptionFee, { color: colors.primary.coral }]}>
            Adoption Fee: ${pet.adoptionInfo.adoptionFee}
          </Text>
          <Text style={[styles.adoptionText, { color: colors.extended.textVariations.secondary }]}>
            {pet.adoptionInfo.adoptionProcess.join(' • ')}
          </Text>
        </Card>

        {/* Shelter Info */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
            Shelter Information
          </Text>
          <Text style={[styles.shelterName, { color: colors.primary.teal }]}>
            {pet.shelter.name}
          </Text>
          <Text style={[styles.shelterInfo, { color: colors.extended.textVariations.secondary }]}>
            ⭐ {pet.shelter.rating}/5 ({pet.shelter.totalReviews} reviews)
          </Text>
          <Text style={[styles.shelterInfo, { color: colors.extended.textVariations.secondary }]}>
            📍 {pet.shelter.address}
          </Text>
        </Card>
      </View>
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
  imageContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    fontSize: 18,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  headerSection: {
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 16,
  },
  location: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 2,
  },
  favoriteButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
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
  booleanTraits: {
    marginTop: 8,
    gap: 8,
  },
  traitItem: {
    fontSize: 14,
  },
  adoptionFee: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  adoptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  shelterName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  shelterInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
});

export default PetDetailScreen;