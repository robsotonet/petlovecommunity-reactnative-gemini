// Pet Love Community - Pet Preferences Form Step
// Fourth step of adoption application with pet preferences and requirements

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../../hooks/useColors';
import Input from '../Input';
import type { AdoptionApplication, Pet } from '../../types/pet';

interface PreferencesStepProps {
  data?: AdoptionApplication['preferences'];
  pet?: Pet;
  onUpdate: (preferences: AdoptionApplication['preferences']) => void;
}

const PreferencesStep: React.FC<PreferencesStepProps> = ({ data, pet, onUpdate }) => {
  const colors = useColors();

  const updateField = <K extends keyof AdoptionApplication['preferences']>(
    field: K,
    value: AdoptionApplication['preferences'][K]
  ) => {
    onUpdate({
      ...data,
      [field]: value,
    });
  };

  const renderYesNoButtons = (
    label: string,
    currentValue: boolean | undefined,
    onSelect: (value: boolean) => void,
    description?: string
  ) => (
    <View style={styles.yesNoGroup}>
      <Text style={[styles.questionLabel, { color: colors.neutral.midnight }]}>
        {label}
      </Text>
      {description && (
        <Text style={[styles.questionDescription, { color: colors.extended.textVariations.secondary }]}>
          {description}
        </Text>
      )}
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

  const renderOptionButtons = <T extends string>(
    label: string,
    currentValue: T | undefined,
    options: Array<{ value: T; label: string }>,
    onSelect: (value: T) => void
  ) => (
    <View style={styles.optionGroup}>
      <Text style={[styles.optionLabel, { color: colors.neutral.midnight }]}>
        {label}
      </Text>
      <View style={styles.optionButtons}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              {
                backgroundColor: currentValue === option.value
                  ? colors.primary.coral
                  : colors.extended.tealVariations.background,
                borderColor: currentValue === option.value
                  ? colors.primary.coral
                  : colors.extended.tealVariations.light,
              },
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.optionButtonText,
                {
                  color: currentValue === option.value
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
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.extended.textVariations.secondary }]}>
        Tell us about your preferences and expectations to help us ensure {pet?.name} is the perfect match for your lifestyle.
      </Text>

      {/* Pet-specific compatibility */}
      {pet && (
        <View style={[styles.petCompatibilityCard, { backgroundColor: colors.extended.tealVariations.background }]}>
          <Text style={[styles.cardTitle, { color: colors.neutral.midnight }]}>
            About {pet.name}
          </Text>
          <View style={styles.petTraits}>
            <Text style={[styles.traitText, { color: colors.extended.textVariations.secondary }]}>
              🐕 {pet.breed} • {pet.age} years old • {pet.gender}
            </Text>
            {pet.traits && pet.traits.length > 0 && (
              <Text style={[styles.traitText, { color: colors.extended.textVariations.secondary }]}>
                ✨ {pet.traits.join(', ')}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Activity level preference */}
      {renderOptionButtons(
        'What activity level are you looking for?',
        data?.activityLevel,
        [
          { value: 'low', label: 'Low Energy' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'high', label: 'High Energy' },
          { value: 'very-high', label: 'Very Active' },
        ],
        (value) => updateField('activityLevel', value)
      )}

      {/* Size preference */}
      {renderOptionButtons(
        'Do you have a size preference?',
        data?.sizePreference,
        [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
          { value: 'extra-large', label: 'Extra Large' },
          { value: 'no-preference', label: 'No Preference' },
        ],
        (value) => updateField('sizePreference', value)
      )}

      {/* Training expectations */}
      {renderYesNoButtons(
        'Are you prepared to invest time in training?',
        data?.willingToTrain,
        (value) => updateField('willingToTrain', value),
        'Some pets may need basic obedience training or behavioral support.'
      )}

      {/* Time commitment */}
      {renderOptionButtons(
        'How much time can you dedicate daily to your pet?',
        data?.timeCommitment,
        [
          { value: 'minimal', label: '< 1 hour' },
          { value: 'moderate', label: '1-3 hours' },
          { value: 'significant', label: '3-5 hours' },
          { value: 'extensive', label: '5+ hours' },
        ],
        (value) => updateField('timeCommitment', value)
      )}

      {/* Children compatibility */}
      {renderYesNoButtons(
        'Do you have children under 12 in your household?',
        data?.hasChildren,
        (value) => updateField('hasChildren', value),
        'This helps us ensure pet compatibility with young family members.'
      )}

      {/* Other pets compatibility */}
      {renderYesNoButtons(
        'Will this pet need to get along with other pets?',
        data?.needsPetCompatibility,
        (value) => updateField('needsPetCompatibility', value)
      )}

      {/* Special considerations */}
      <View style={styles.textInputSection}>
        <Input
          label="Special Considerations (Optional)"
          value={data?.specialConsiderations || ''}
          onChangeText={(value) => updateField('specialConsiderations', value)}
          placeholder="Any specific needs, concerns, or requirements you'd like the shelter to know about..."
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />
      </View>

      {/* Why this pet */}
      <View style={styles.textInputSection}>
        <Input
          label={`Why are you interested in adopting ${pet?.name || 'this pet'}?`}
          value={data?.whyThisPet || ''}
          onChangeText={(value) => updateField('whyThisPet', value)}
          placeholder="Share what drew you to this pet and how they fit into your life..."
          multiline
          numberOfLines={4}
          style={styles.textArea}
          required
        />
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.extended.tealVariations.background }]}>
        <Text style={[styles.infoText, { color: colors.neutral.midnight }]}>
          💡 Being honest about your preferences helps us ensure a successful, long-term match that's best for both you and your new companion.
        </Text>
      </View>
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
  petCompatibilityCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  petTraits: {
    gap: 4,
  },
  traitText: {
    fontSize: 14,
    lineHeight: 20,
  },
  yesNoGroup: {
    gap: 8,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  questionDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
    fontStyle: 'italic',
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
  optionGroup: {
    gap: 8,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInputSection: {
    marginTop: 8,
  },
  textArea: {
    minHeight: 80,
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
});

export default PreferencesStep;