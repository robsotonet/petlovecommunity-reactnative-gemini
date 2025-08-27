// Pet Love Community - Pet Search Filters Component
// Enhanced search and filtering UI for pet discovery

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '../hooks/useColors';
import { useAnalyticsTracker } from '../hooks/useAnalytics';
import locationService from '../services/locationService';
import Button from './Button';
import Card from './Card';
import Input from './Input';
import type { PetSearchRequest } from '../types/pet';

interface PetSearchFiltersProps {
  searchFilters: PetSearchRequest;
  onFiltersChange: (filters: PetSearchRequest) => void;
  onSearch: () => void;
  isSearching?: boolean;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  searchFilters: PetSearchRequest;
  onFiltersChange: (filters: PetSearchRequest) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  searchFilters,
  onFiltersChange,
}) => {
  const colors = useColors();
  const [tempFilters, setTempFilters] = useState(searchFilters);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { trackUserAction } = useAnalyticsTracker();

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters: PetSearchRequest = {
      limit: 20,
      page: 1,
    };
    setTempFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClose();
  };

  const updateTempFilters = (updates: Partial<PetSearchRequest>) => {
    setTempFilters(prev => ({
      ...prev,
      ...updates,
      filters: {
        ...prev.filters,
        ...updates.filters,
      },
    }));
  };

  const animalTypes = ['dog', 'cat', 'rabbit', 'bird', 'other'];
  const sizes = ['small', 'medium', 'large'];
  const ageRanges = [
    { label: 'Puppy/Kitten (0-1 year)', value: 'young' },
    { label: 'Adult (1-7 years)', value: 'adult' },
    { label: 'Senior (7+ years)', value: 'senior' },
  ];
  const distanceOptions = [
    { label: '5 km', value: 5 },
    { label: '10 km', value: 10 },
    { label: '25 km', value: 25 },
    { label: '50 km', value: 50 },
    { label: '100 km', value: 100 },
  ];

  const handleLocationToggle = async () => {
    if (tempFilters.filters?.nearMe) {
      // Disable location filtering
      updateTempFilters({
        filters: {
          ...tempFilters.filters,
          nearMe: false,
          maxDistance: undefined,
        },
      });
      trackUserAction('location_filter_disabled');
    } else {
      // Enable location filtering
      setIsGettingLocation(true);
      trackUserAction('location_filter_requested');
      
      try {
        const location = await locationService.getCurrentLocation();
        updateTempFilters({
          filters: {
            ...tempFilters.filters,
            nearMe: true,
            maxDistance: 25, // Default to 25km
            userLocation: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
          },
        });
        trackUserAction('location_filter_enabled', {
          latitude: location.latitude,
          longitude: location.longitude,
        });
      } catch (error) {
        console.error('Location error:', error);
        Alert.alert(
          'Location Error',
          'Unable to get your location. Please enable location services and try again.',
          [{ text: 'OK' }]
        );
        trackUserAction('location_filter_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsGettingLocation(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.neutral.beige }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.extended.tealVariations.background }]}>
          <Text style={[styles.modalTitle, { color: colors.neutral.midnight }]}>
            Filter Pets
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: colors.primary.teal }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Animal Type */}
          <Card style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
              Animal Type
            </Text>
            <View style={styles.optionsContainer}>
              {animalTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: tempFilters.filters?.animalType === type
                        ? colors.primary.coral
                        : colors.extended.tealVariations.background,
                      borderColor: tempFilters.filters?.animalType === type
                        ? colors.primary.coral
                        : colors.extended.tealVariations.light,
                    },
                  ]}
                  onPress={() => updateTempFilters({
                    filters: {
                      ...tempFilters.filters,
                      animalType: tempFilters.filters?.animalType === type ? undefined : type as any,
                    },
                  })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: tempFilters.filters?.animalType === type
                          ? '#FFFFFF'
                          : colors.neutral.midnight,
                      },
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Size */}
          <Card style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
              Size
            </Text>
            <View style={styles.optionsContainer}>
              {sizes.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: tempFilters.filters?.size === size
                        ? colors.primary.coral
                        : colors.extended.tealVariations.background,
                      borderColor: tempFilters.filters?.size === size
                        ? colors.primary.coral
                        : colors.extended.tealVariations.light,
                    },
                  ]}
                  onPress={() => updateTempFilters({
                    filters: {
                      ...tempFilters.filters,
                      size: tempFilters.filters?.size === size ? undefined : size as any,
                    },
                  })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: tempFilters.filters?.size === size
                          ? '#FFFFFF'
                          : colors.neutral.midnight,
                      },
                    ]}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Age Range */}
          <Card style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
              Age Range
            </Text>
            <View style={styles.optionsContainer}>
              {ageRanges.map((range) => (
                <TouchableOpacity
                  key={range.value}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: tempFilters.filters?.ageRange === range.value
                        ? colors.primary.coral
                        : colors.extended.tealVariations.background,
                      borderColor: tempFilters.filters?.ageRange === range.value
                        ? colors.primary.coral
                        : colors.extended.tealVariations.light,
                    },
                  ]}
                  onPress={() => updateTempFilters({
                    filters: {
                      ...tempFilters.filters,
                      ageRange: tempFilters.filters?.ageRange === range.value ? undefined : range.value as any,
                    },
                  })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: tempFilters.filters?.ageRange === range.value
                          ? '#FFFFFF'
                          : colors.neutral.midnight,
                      },
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Good with Children */}
          <Card style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
              Good with Children
            </Text>
            <TouchableOpacity
              style={[
                styles.checkboxContainer,
                { backgroundColor: colors.extended.tealVariations.background },
              ]}
              onPress={() => updateTempFilters({
                filters: {
                  ...tempFilters.filters,
                  goodWithChildren: !tempFilters.filters?.goodWithChildren,
                },
              })}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: tempFilters.filters?.goodWithChildren
                      ? colors.primary.coral
                      : 'transparent',
                    borderColor: colors.extended.textVariations.tertiary,
                  },
                ]}
              >
                {tempFilters.filters?.goodWithChildren && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.neutral.midnight }]}>
                Must be good with children
              </Text>
            </TouchableOpacity>
          </Card>

          {/* Location Filter */}
          <Card style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
              Location
            </Text>
            
            {/* Near Me Toggle */}
            <TouchableOpacity
              style={[
                styles.checkboxContainer,
                { 
                  backgroundColor: tempFilters.filters?.nearMe 
                    ? colors.extended.tealVariations.light 
                    : colors.extended.tealVariations.background 
                },
              ]}
              onPress={handleLocationToggle}
              disabled={isGettingLocation}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: tempFilters.filters?.nearMe
                      ? colors.primary.coral
                      : 'transparent',
                    borderColor: colors.extended.textVariations.tertiary,
                  },
                ]}
              >
                {tempFilters.filters?.nearMe && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <View style={styles.locationToggleContent}>
                <Text style={[styles.checkboxLabel, { color: colors.neutral.midnight }]}>
                  Show pets near me
                </Text>
                {isGettingLocation && (
                  <View style={styles.locationLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary.coral} />
                    <Text style={[styles.locationLoadingText, { color: colors.extended.textVariations.secondary }]}>
                      Getting location...
                    </Text>
                  </View>
                )}
                {tempFilters.filters?.nearMe && tempFilters.filters?.userLocation && (
                  <Text style={[styles.locationInfo, { color: colors.extended.textVariations.tertiary }]}>
                    📍 Location acquired
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Distance Options */}
            {tempFilters.filters?.nearMe && (
              <View style={styles.distanceSection}>
                <Text style={[styles.distanceLabel, { color: colors.extended.textVariations.secondary }]}>
                  Maximum Distance
                </Text>
                <View style={styles.distanceOptions}>
                  {distanceOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.distanceOption,
                        {
                          backgroundColor: tempFilters.filters?.maxDistance === option.value
                            ? colors.primary.coral
                            : colors.extended.tealVariations.background,
                          borderColor: tempFilters.filters?.maxDistance === option.value
                            ? colors.primary.coral
                            : colors.extended.tealVariations.light,
                        },
                      ]}
                      onPress={() => updateTempFilters({
                        filters: {
                          ...tempFilters.filters,
                          maxDistance: option.value,
                        },
                      })}
                    >
                      <Text
                        style={[
                          styles.distanceOptionText,
                          {
                            color: tempFilters.filters?.maxDistance === option.value
                              ? '#FFFFFF'
                              : colors.neutral.midnight,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </Card>
        </ScrollView>

        <View style={[styles.modalActions, { borderTopColor: colors.extended.tealVariations.background }]}>
          <Button
            title="Clear All"
            onPress={handleClearFilters}
            type="secondary"
            style={styles.actionButton}
          />
          <Button
            title="Apply Filters"
            onPress={handleApplyFilters}
            type="primary"
            style={styles.actionButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const PetSearchFilters: React.FC<PetSearchFiltersProps> = ({
  searchFilters,
  onFiltersChange,
  onSearch,
  isSearching = false,
}) => {
  const colors = useColors();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchFilters.searchQuery || '');

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onFiltersChange({
      ...searchFilters,
      searchQuery: text || undefined,
    });
  };

  const hasFilters = Boolean(
    searchFilters.filters?.animalType ||
    searchFilters.filters?.size ||
    searchFilters.filters?.ageRange ||
    searchFilters.filters?.goodWithChildren ||
    searchFilters.searchQuery
  );

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchFilters.filters?.animalType) count++;
    if (searchFilters.filters?.size) count++;
    if (searchFilters.filters?.ageRange) count++;
    if (searchFilters.filters?.goodWithChildren) count++;
    if (searchFilters.filters?.nearMe) count++;
    return count;
  };

  return (
    <>
      <Card style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Input
              placeholder="Search pets by name, breed..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={onSearch}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: hasFilters ? colors.primary.coral : colors.extended.tealVariations.background,
                borderColor: hasFilters ? colors.primary.coral : colors.extended.tealVariations.light,
              },
            ]}
            onPress={() => setShowFilters(true)}
            testID="filter-button"
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: hasFilters ? '#FFFFFF' : colors.neutral.midnight },
              ]}
            >
              Filter {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
            </Text>
          </TouchableOpacity>
        </View>
        
        <Button
          title={isSearching ? "Searching..." : "Search Pets"}
          onPress={onSearch}
          type="primary"
          disabled={isSearching}
          style={styles.searchButton}
        />
      </Card>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        searchFilters={searchFilters}
        onFiltersChange={onFiltersChange}
      />
    </>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    padding: 16,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchButton: {
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  // Location-specific styles
  locationToggleContent: {
    flex: 1,
  },
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  locationLoadingText: {
    fontSize: 12,
  },
  locationInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  distanceSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  distanceLabel: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  distanceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distanceOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  distanceOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PetSearchFilters;