// Pet Love Community - Living Situation Form Step
// Second step of adoption application with housing details

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../../hooks/useColors';
import type { AdoptionApplication } from '../../types/pet';

interface LivingSituationStepProps {
  data?: AdoptionApplication['livingSituation'];
  onUpdate: (livingSituation: AdoptionApplication['livingSituation']) => void;
}

const LivingSituationStep: React.FC<LivingSituationStepProps> = ({ data, onUpdate }) => {
  const colors = useColors();

  const updateField = <K extends keyof AdoptionApplication['livingSituation']>(
    field: K,
    value: AdoptionApplication['livingSituation'][K]
  ) => {
    onUpdate({
      ...data,
      [field]: value,
    });
  };

  const renderOptionButtons = <T extends string>(
    label: string,
    currentValue: T | undefined,
    options: Array<{ value: T; label: string }>,
    onSelect: (value: T) => void
  ) => (
    <View style={styles.optionGroup}>
      <Text style={[styles.optionLabel, { color: colors.neutral.midnight }]}>
        {label} *
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

  const renderCheckbox = (
    label: string,
    checked: boolean | undefined,
    onToggle: (checked: boolean) => void
  ) => (
    <TouchableOpacity
      style={[styles.checkboxContainer, { backgroundColor: colors.extended.tealVariations.background }]}
      onPress={() => onToggle(!checked)}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? colors.primary.coral : 'transparent',
            borderColor: colors.extended.textVariations.tertiary,
          },
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.checkboxLabel, { color: colors.neutral.midnight }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.extended.textVariations.secondary }]}>
        Tell us about your living situation to help us match you with the right pet.
      </Text>

      {renderOptionButtons(
        'Type of Housing',
        data?.housingType,
        [
          { value: 'house', label: 'House' },
          { value: 'apartment', label: 'Apartment' },
          { value: 'condo', label: 'Condo' },
          { value: 'other', label: 'Other' },
        ],
        (value) => updateField('housingType', value)
      )}

      {renderOptionButtons(
        'Do you own or rent?',
        data?.ownOrRent,
        [
          { value: 'own', label: 'Own' },
          { value: 'rent', label: 'Rent' },
        ],
        (value) => updateField('ownOrRent', value)
      )}

      {renderOptionButtons(
        'Yard/Outdoor Space',
        data?.yardType,
        [
          { value: 'none', label: 'No Yard' },
          { value: 'small', label: 'Small Yard' },
          { value: 'medium', label: 'Medium Yard' },
          { value: 'large', label: 'Large Yard' },
        ],
        (value) => updateField('yardType', value)
      )}

      {/* Show landlord approval question if renting */}
      {data?.ownOrRent === 'rent' && (
        <View style={styles.conditionalSection}>
          <Text style={[styles.conditionalLabel, { color: colors.neutral.midnight }]}>
            Landlord Permission
          </Text>
          {renderCheckbox(
            'I have permission from my landlord to have pets',
            data?.landlordApproval,
            (checked) => updateField('landlordApproval', checked)
          )}
        </View>
      )}

      <View style={[styles.infoBox, { backgroundColor: colors.extended.tealVariations.background }]}>
        <Text style={[styles.infoText, { color: colors.neutral.midnight }]}>
          💡 Tip: If you rent, having written permission from your landlord will speed up the adoption process.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
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
  conditionalSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  conditionalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
    flex: 1,
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

export default LivingSituationStep;