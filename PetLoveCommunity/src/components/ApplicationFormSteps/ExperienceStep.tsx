// Pet Love Community - Pet Experience Form Step
// Third step of adoption application with pet experience details

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../../hooks/useColors';
import Input from '../Input';
import DocumentUploadModal from '../DocumentUploadModal';
import { DocumentType } from '../../services/documentUploadService';
import type { AdoptionApplication } from '../../types/pet';

interface ExperienceStepProps {
  data?: AdoptionApplication['experience'];
  applicationId?: string;
  onUpdate: (experience: AdoptionApplication['experience']) => void;
}

const ExperienceStep: React.FC<ExperienceStepProps> = ({ data, applicationId, onUpdate }) => {
  const colors = useColors();
  const [showVetDocumentModal, setShowVetDocumentModal] = useState(false);

  const updateField = <K extends keyof AdoptionApplication['experience']>(
    field: K,
    value: AdoptionApplication['experience'][K]
  ) => {
    onUpdate({
      ...data,
      [field]: value,
    });
  };

  const renderYesNoButtons = (
    label: string,
    currentValue: boolean | undefined,
    onSelect: (value: boolean) => void
  ) => (
    <View style={styles.yesNoGroup}>
      <Text style={[styles.questionLabel, { color: colors.neutral.midnight }]}>
        {label} *
      </Text>
      <View style={styles.yesNoButtons}>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            {
              backgroundColor: currentValue === true
                ? colors.semantic.success
                : colors.extended.tealVariations.background,
              borderColor: currentValue === true
                ? colors.semantic.success
                : colors.extended.tealVariations.light,
            },
          ]}
          onPress={() => onSelect(true)}
        >
          <Text
            style={[
              styles.yesNoButtonText,
              {
                color: currentValue === true ? '#FFFFFF' : colors.neutral.midnight,
              },
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            {
              backgroundColor: currentValue === false
                ? colors.semantic.error
                : colors.extended.tealVariations.background,
              borderColor: currentValue === false
                ? colors.semantic.error
                : colors.extended.tealVariations.light,
            },
          ]}
          onPress={() => onSelect(false)}
        >
          <Text
            style={[
              styles.yesNoButtonText,
              {
                color: currentValue === false ? '#FFFFFF' : colors.neutral.midnight,
              },
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.extended.textVariations.secondary }]}>
        Your experience with pets helps us understand how to best support you and your new companion.
      </Text>

      {renderYesNoButtons(
        'Have you owned pets before?',
        data?.previousPets,
        (value) => updateField('previousPets', value)
      )}

      {/* Show additional questions if they have previous pets */}
      {data?.previousPets === true && (
        <View style={styles.conditionalSection}>
          <Input
            label="Tell us about your pet experience"
            value={data?.petExperience || ''}
            onChangeText={(value) => updateField('petExperience', value)}
            placeholder="Describe the types of pets you've had, how long you cared for them, and any relevant experience..."
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        </View>
      )}

      {/* Current pets information */}
      <View style={styles.currentPetsSection}>
        <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
          Current Pets
        </Text>
        
        {renderYesNoButtons(
          'Do you currently have any pets?',
          data?.currentPets && data.currentPets.length > 0,
          (hasCurrentPets) => {
            if (hasCurrentPets) {
              // Initialize with one empty pet if they have pets
              updateField('currentPets', data?.currentPets?.length ? data.currentPets : []);
            } else {
              // Clear current pets if they don't have any
              updateField('currentPets', []);
            }
          }
        )}

        {data?.currentPets && data.currentPets.length >= 0 && (
          <View style={[styles.infoBox, { backgroundColor: colors.extended.tealVariations.background }]}>
            <Text style={[styles.infoText, { color: colors.neutral.midnight }]}>
              ℹ️ If you have current pets, the shelter may require a meet-and-greet to ensure compatibility.
            </Text>
          </View>
        )}
      </View>

      {/* Veterinarian information */}
      {(data?.previousPets === true || (data?.currentPets && data.currentPets.length > 0)) && (
        <View style={styles.vetSection}>
          <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
            Veterinarian Information (Optional)
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.extended.textVariations.secondary }]}>
            Providing veterinarian information helps verify your commitment to pet healthcare.
          </Text>

          <Input
            label="Veterinarian Name"
            value={data?.veterinarianInfo?.name || ''}
            onChangeText={(value) =>
              updateField('veterinarianInfo', {
                ...data?.veterinarianInfo,
                name: value,
              })
            }
            placeholder="Dr. Smith's Animal Hospital"
          />

          <Input
            label="Veterinarian Phone"
            value={data?.veterinarianInfo?.phone || ''}
            onChangeText={(value) =>
              updateField('veterinarianInfo', {
                ...data?.veterinarianInfo,
                phone: value,
              })
            }
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
          />

          <Input
            label="Veterinarian Address"
            value={data?.veterinarianInfo?.address || ''}
            onChangeText={(value) =>
              updateField('veterinarianInfo', {
                ...data?.veterinarianInfo,
                address: value,
              })
            }
            placeholder="123 Main St, City, State"
            multiline
            numberOfLines={2}
          />

          {/* Veterinary Records Upload */}
          {applicationId && (
            <View style={styles.documentSection}>
              <Text style={[styles.documentLabel, { color: colors.neutral.midnight }]}>
                Veterinary Records (Optional)
              </Text>
              <Text style={[styles.documentDescription, { color: colors.extended.textVariations.secondary }]}>
                Upload vaccination records, health certificates, or other veterinary documents for your current pets.
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  {
                    backgroundColor: colors.extended.tealVariations.background,
                    borderColor: colors.primary.teal,
                  }
                ]}
                onPress={() => setShowVetDocumentModal(true)}
              >
                <Text style={[styles.uploadButtonText, { color: colors.primary.teal }]}>
                  📄 Upload Veterinary Records
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Document Upload Modal */}
      {applicationId && (
        <DocumentUploadModal
          visible={showVetDocumentModal}
          onClose={() => setShowVetDocumentModal(false)}
          applicationId={applicationId}
          documentType={DocumentType.VET_RECORDS}
          title="Upload Veterinary Records"
          description="Please provide vaccination records, health certificates, or other relevant veterinary documents for your current pets. This helps us verify their health status and care history."
          allowMultiple={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  yesNoGroup: {
    gap: 8,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  yesNoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  yesNoButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  conditionalSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 100,
  },
  currentPetsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  vetSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  documentSection: {
    marginTop: 16,
    gap: 8,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  documentDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ExperienceStep;