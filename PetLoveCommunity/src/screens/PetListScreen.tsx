// Pet Love Community - Pet List Screen
// Enterprise pet discovery and listing with real-time updates

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useGetFeaturedPetsQuery, useSearchPetsQuery } from '../services/petApi';
import { useColors } from '../hooks/useColors';
import { useAnalyticsTracker } from '../hooks/useAnalytics';
import { Pet, PetSearchRequest } from '../types/pet';
import { PetListNavigationProp } from '../types/navigation';
import Button from '../components/Button';
import Card from '../components/Card';
import PetSearchFilters from '../components/PetSearchFilters';

interface PetListScreenProps {
  navigation: PetListNavigationProp;
}

const { width: screenWidth } = Dimensions.get('window');

const PetListScreen: React.FC<PetListScreenProps> = ({ navigation }) => {
  const colors = useColors();
  const [searchFilters, setSearchFilters] = useState<PetSearchRequest>({
    limit: 20,
    page: 1,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Analytics hook
  const { trackScreenView, trackPetView, trackPetInteraction, isReady: analyticsReady } = useAnalyticsTracker();

  // Use featured pets by default, search pets when filters are applied
  const hasFilters = Boolean(
    searchFilters.filters || 
    searchFilters.searchQuery || 
    searchFilters.sortBy
  );

  const {
    data: featuredPets,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
  } = useGetFeaturedPetsQuery({ limit: 20 }, { skip: hasFilters });

  const {
    data: searchResults,
    isLoading: searchLoading,
    refetch: refetchSearch,
  } = useSearchPetsQuery(searchFilters, { skip: !hasFilters });

  const pets = hasFilters ? searchResults?.pets : featuredPets;
  const isLoading = hasFilters ? searchLoading : featuredLoading;

  // Track screen view when component mounts
  useEffect(() => {
    if (analyticsReady) {
      trackScreenView('PetListScreen', {
        hasFilters,
        petsCount: pets?.length || 0,
      });
    }
  }, [analyticsReady, hasFilters, pets?.length, trackScreenView]);

  // Handle search filters change
  const handleFiltersChange = useCallback((newFilters: PetSearchRequest) => {
    setSearchFilters(newFilters);
  }, []);

  // Handle manual search trigger
  const handleSearch = useCallback(async () => {
    if (!hasFilters) return;
    
    setIsSearching(true);
    try {
      await refetchSearch();
    } finally {
      setIsSearching(false);
    }
  }, [hasFilters, refetchSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (hasFilters) {
        await refetchSearch();
      } else {
        await refetchFeatured();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const navigateToPetDetail = (petId: string, source: 'search' | 'featured' = 'featured') => {
    // Track analytics for pet selection from list
    if (analyticsReady) {
      trackPetView(petId, hasFilters ? 'search' : 'featured');
    }

    navigation.navigate('PetDetail', { petId });
  };

  const renderPetItem = ({ item: pet }: { item: Pet }) => (
    <TouchableOpacity
      style={styles.petCard}
      onPress={() => navigateToPetDetail(pet.id)}
      activeOpacity={0.8}
    >
      <Card style={styles.petCardContent}>
        {/* Pet Image Placeholder */}
        <View style={[styles.petImageContainer, { backgroundColor: colors.extended.tealVariations.background }]}>
          <Text style={[styles.imageText, { color: colors.neutral.midnight }]}>
            📷 {pet.photos.length}
          </Text>
          <Text style={[styles.imageSubtext, { color: colors.extended.textVariations.secondary }]}>
            photos
          </Text>
        </View>

        {/* Pet Info */}
        <View style={styles.petInfo}>
          <View style={styles.petHeader}>
            <Text style={[styles.petName, { color: colors.neutral.midnight }]}>
              {pet.name}
            </Text>
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
          
          <Text style={[styles.petBreed, { color: colors.extended.textVariations.secondary }]}>
            {pet.breed} • {pet.age} years • {pet.gender}
          </Text>
          <Text style={[styles.petLocation, { color: colors.extended.textVariations.tertiary }]}>
            📍 {pet.location.city}, {pet.location.state}
          </Text>

          {/* Quick Traits */}
          <View style={styles.traitsContainer}>
            {pet.characteristics.goodWithChildren && (
              <View style={[styles.traitTag, { backgroundColor: colors.extended.tealVariations.background }]}>
                <Text style={[styles.traitText, { color: colors.neutral.midnight }]}>
                  👶 Good with kids
                </Text>
              </View>
            )}
            {pet.characteristics.houseTrained && (
              <View style={[styles.traitTag, { backgroundColor: colors.extended.tealVariations.background }]}>
                <Text style={[styles.traitText, { color: colors.neutral.midnight }]}>
                  🏠 House trained
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Adoption CTA */}
        <View style={styles.petActions}>
          <Button
            title="❤️ View Details"
            onPress={() => {
              // Track interaction before navigating
              if (analyticsReady) {
                trackPetInteraction(pet.id, 'application_start', { 
                  source: hasFilters ? 'search' : 'featured',
                  fromList: true 
                });
              }
              navigateToPetDetail(pet.id);
            }}
            type="primary"
            accessibilityLabel={`View adoption details for ${pet.name}`}
            style={styles.viewDetailsButton}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: colors.neutral.midnight }]}>
        No pets found
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.extended.textVariations.secondary }]}>
        {hasFilters 
          ? 'Try adjusting your search filters'
          : 'Check back later for new pets looking for homes'
        }
      </Text>
      <Button
        title="Refresh"
        onPress={handleRefresh}
        type="secondary"
      />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.neutral.midnight }]}>
        {hasFilters ? 'Search Results' : 'Featured Pets'}
      </Text>
      <Text style={[styles.headerSubtitle, { color: colors.extended.textVariations.secondary }]}>
        {pets?.length || 0} pets looking for homes
      </Text>
    </View>
  );

  if (isLoading && !pets) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.neutral.beige }]}>
        <ActivityIndicator size="large" color={colors.primary.coral} />
        <Text style={[styles.loadingText, { color: colors.extended.textVariations.secondary }]}>
          Finding pets for you...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.neutral.beige }]}>
      <FlatList
        data={pets || []}
        renderItem={renderPetItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <>
            <PetSearchFilters
              searchFilters={searchFilters}
              onFiltersChange={handleFiltersChange}
              onSearch={handleSearch}
              isSearching={isSearching || isLoading}
            />
            {renderHeader()}
          </>
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.coral]}
            tintColor={colors.primary.coral}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
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
  header: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  petCard: {
    marginBottom: 16,
  },
  petCardContent: {
    padding: 16,
  },
  petImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  imageText: {
    fontSize: 18,
    fontWeight: '600',
  },
  imageSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  petInfo: {
    flex: 1,
    marginBottom: 16,
  },
  petHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  petName: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  petBreed: {
    fontSize: 16,
    marginBottom: 6,
  },
  petLocation: {
    fontSize: 14,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  traitTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  traitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  petActions: {
    marginTop: 8,
  },
  viewDetailsButton: {
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default PetListScreen;