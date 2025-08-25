// Pet Love Community - Application Review Form Step
// Final step of adoption application for review and submission

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useColors } from '../../hooks/useColors';
import Card from '../Card';
import type { AdoptionApplication, Pet } from '../../types/pet';

interface ReviewStepProps {
  data?: AdoptionApplication;
  pet?: Pet;
  onUpdate: (updates: Partial<AdoptionApplication>) => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ data, pet, onUpdate }) => {
  const colors = useColors();

  const renderSection = (title: string, children: React.ReactNode, canEdit?: boolean, onEdit?: () => void) => (
    <Card style={[styles.reviewSection, { backgroundColor: colors.extended.tealVariations.background }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
          {title}
        </Text>
        {canEdit && onEdit && (
          <TouchableOpacity onPress={onEdit} style={[styles.editButton, { borderColor: colors.primary.coral }]}>
            <Text style={[styles.editButtonText, { color: colors.primary.coral }]}>
              Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </Card>
  );

  const renderInfoRow = (label: string, value: string | undefined, fallback = 'Not provided') => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.extended.textVariations.secondary }]}>
        {label}:
      </Text>
      <Text style={[styles.infoValue, { color: colors.neutral.midnight }]}>
        {value || fallback}
      </Text>
    </View>
  );

  const renderBooleanRow = (label: string, value: boolean | undefined) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.extended.textVariations.secondary }]}>
        {label}:
      </Text>
      <Text style={[
        styles.infoValue,
        {
          color: value === true
            ? colors.semantic.success
            : value === false
            ? colors.semantic.error
            : colors.extended.textVariations.tertiary
        }
      ]}>
        {value === true ? 'Yes' : value === false ? 'No' : 'Not answered'}
      </Text>
    </View>
  );

  const getActivityLevelLabel = (level: string | undefined) => {
    switch (level) {
      case 'low': return 'Low Energy';
      case 'moderate': return 'Moderate';
      case 'high': return 'High Energy';
      case 'very-high': return 'Very Active';
      default: return 'Not specified';
    }
  };

  const getSizePreferenceLabel = (size: string | undefined) => {
    switch (size) {
      case 'small': return 'Small';
      case 'medium': return 'Medium';
      case 'large': return 'Large';
      case 'extra-large': return 'Extra Large';
      case 'no-preference': return 'No Preference';
      default: return 'Not specified';
    }
  };

  const getTimeCommitmentLabel = (time: string | undefined) => {
    switch (time) {
      case 'minimal': return 'Less than 1 hour';
      case 'moderate': return '1-3 hours';
      case 'significant': return '3-5 hours';
      case 'extensive': return '5+ hours';
      default: return 'Not specified';
    }
  };

  const getHousingTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'house': return 'House';
      case 'apartment': return 'Apartment';
      case 'condo': return 'Condo';
      case 'other': return 'Other';
      default: return 'Not specified';
    }
  };

  const getYardTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'none': return 'No Yard';
      case 'small': return 'Small Yard';
      case 'medium': return 'Medium Yard';
      case 'large': return 'Large Yard';
      default: return 'Not specified';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.extended.textVariations.secondary }]}>
        Please review your application before submitting. You can edit any section if needed.
      </Text>

      {/* Pet Information */}
      {pet && (
        <View style={[styles.petCard, { backgroundColor: colors.primary.coral + '15', borderColor: colors.primary.coral }]}>
          <Text style={[styles.petCardTitle, { color: colors.primary.coral }]}>
            Adopting {pet.name}
          </Text>
          <Text style={[styles.petCardDetails, { color: colors.neutral.midnight }]}>
            {pet.breed} • {pet.age} years • {pet.gender}
          </Text>
          <Text style={[styles.shelterName, { color: colors.primary.teal }]}>
            {pet.shelter.name}
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={styles.reviewContent}>
        {/* Personal Information */}
        {renderSection('Personal Information', (
          <>
            {renderInfoRow('Name', `${data?.personalInfo?.firstName || ''} ${data?.personalInfo?.lastName || ''}`.trim())}
            {renderInfoRow('Email', data?.personalInfo?.email)}
            {renderInfoRow('Phone', data?.personalInfo?.phone)}
            {renderInfoRow('Address', data?.personalInfo?.address)}
            {renderInfoRow('Date of Birth', data?.personalInfo?.dateOfBirth)}
          </>
        ))}

        {/* Living Situation */}
        {renderSection('Living Situation', (
          <>
            {renderInfoRow('Housing Type', getHousingTypeLabel(data?.livingSituation?.housingType))}
            {renderInfoRow('Own or Rent', data?.livingSituation?.ownOrRent === 'own' ? 'Own' : data?.livingSituation?.ownOrRent === 'rent' ? 'Rent' : 'Not specified')}
            {renderInfoRow('Yard/Outdoor Space', getYardTypeLabel(data?.livingSituation?.yardType))}
            {data?.livingSituation?.ownOrRent === 'rent' && (
              renderBooleanRow('Landlord Permission', data?.livingSituation?.landlordApproval)
            )}
          </>
        ))}

        {/* Pet Experience */}
        {renderSection('Pet Experience', (
          <>
            {renderBooleanRow('Previous Pets', data?.experience?.previousPets)}
            {data?.experience?.previousPets && data?.experience?.petExperience && (
              <View style={styles.experienceText}>
                <Text style={[styles.infoLabel, { color: colors.extended.textVariations.secondary }]}>
                  Experience Details:
                </Text>
                <Text style={[styles.experienceDescription, { color: colors.neutral.midnight }]}>
                  {data.experience.petExperience}
                </Text>
              </View>
            )}
            {renderBooleanRow('Current Pets', data?.experience?.currentPets && data.experience.currentPets.length > 0)}
            {data?.experience?.veterinarianInfo?.name && (
              <>
                {renderInfoRow('Veterinarian', data.experience.veterinarianInfo.name)}
                {renderInfoRow('Vet Phone', data.experience.veterinarianInfo.phone)}
                {renderInfoRow('Vet Address', data.experience.veterinarianInfo.address)}
              </>
            )}
          </>
        ))}

        {/* Preferences */}
        {renderSection('Pet Preferences', (
          <>
            {renderInfoRow('Activity Level', getActivityLevelLabel(data?.preferences?.activityLevel))}
            {renderInfoRow('Size Preference', getSizePreferenceLabel(data?.preferences?.sizePreference))}
            {renderBooleanRow('Willing to Train', data?.preferences?.willingToTrain)}
            {renderInfoRow('Time Commitment', getTimeCommitmentLabel(data?.preferences?.timeCommitment))}
            {renderBooleanRow('Has Children Under 12', data?.preferences?.hasChildren)}
            {renderBooleanRow('Needs Pet Compatibility', data?.preferences?.needsPetCompatibility)}
            {data?.preferences?.specialConsiderations && (
              <View style={styles.experienceText}>
                <Text style={[styles.infoLabel, { color: colors.extended.textVariations.secondary }]}>
                  Special Considerations:
                </Text>
                <Text style={[styles.experienceDescription, { color: colors.neutral.midnight }]}>
                  {data.preferences.specialConsiderations}
                </Text>
              </View>
            )}
            {data?.preferences?.whyThisPet && (
              <View style={styles.experienceText}>
                <Text style={[styles.infoLabel, { color: colors.extended.textVariations.secondary }]}>
                  Why This Pet:
                </Text>
                <Text style={[styles.experienceDescription, { color: colors.neutral.midnight }]}>
                  {data.preferences.whyThisPet}
                </Text>
              </View>
            )}
          </>
        ))}
      </ScrollView>

      {/* Submission Agreement */}
      <View style={[styles.agreementSection, { backgroundColor: colors.extended.tealVariations.background }]}>
        <Text style={[styles.agreementTitle, { color: colors.neutral.midnight }]}>
          Application Agreement
        </Text>
        <Text style={[styles.agreementText, { color: colors.extended.textVariations.secondary }]}>
          By submitting this application, I confirm that all information provided is accurate and complete. I understand that providing false information may disqualify my application. I agree to the shelter's adoption policies and procedures.
        </Text>
        <Text style={[styles.nextStepsText, { color: colors.primary.teal }]}>
          📋 Next steps: The shelter will review your application and contact you within 2-3 business days.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  petCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  petCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  petCardDetails: {
    fontSize: 16,
    marginBottom: 4,
  },
  shelterName: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewContent: {
    flex: 1,
  },
  reviewSection: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  experienceText: {
    marginTop: 8,
    gap: 4,
  },
  experienceDescription: {
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 8,
    borderRadius: 6,
  },
  agreementSection: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  agreementTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  agreementText: {
    fontSize: 14,
    lineHeight: 20,
  },
  nextStepsText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default ReviewStep;