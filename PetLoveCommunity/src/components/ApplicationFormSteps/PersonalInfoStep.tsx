// Pet Love Community - Personal Information Form Step
// First step of adoption application with personal details

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';
import Input from '../Input';
import type { AdoptionApplication } from '../../types/pet';

interface PersonalInfoStepProps {
  data?: AdoptionApplication['personalInfo'];
  onUpdate: (personalInfo: AdoptionApplication['personalInfo']) => void;
}

const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({ data, onUpdate }) => {
  const colors = useColors();

  const updateField = (field: keyof AdoptionApplication['personalInfo'], value: string) => {
    onUpdate({
      ...data,
      [field]: value,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.extended.textVariations.secondary }]}>
        Please provide your personal information. This helps the shelter contact you and verify your identity.
      </Text>

      <View style={styles.nameRow}>
        <View style={styles.nameField}>
          <Input
            label="First Name *"
            value={data?.firstName || ''}
            onChangeText={(value) => updateField('firstName', value)}
            placeholder="Enter your first name"
            autoCapitalize="words"
            required
          />
        </View>
        <View style={styles.nameField}>
          <Input
            label="Last Name *"
            value={data?.lastName || ''}
            onChangeText={(value) => updateField('lastName', value)}
            placeholder="Enter your last name"
            autoCapitalize="words"
            required
          />
        </View>
      </View>

      <Input
        label="Email Address *"
        value={data?.email || ''}
        onChangeText={(value) => updateField('email', value)}
        placeholder="Enter your email address"
        keyboardType="email-address"
        autoCapitalize="none"
        required
      />

      <Input
        label="Phone Number *"
        value={data?.phone || ''}
        onChangeText={(value) => updateField('phone', value)}
        placeholder="Enter your phone number"
        keyboardType="phone-pad"
        required
      />

      <Input
        label="Current Address *"
        value={data?.address || ''}
        onChangeText={(value) => updateField('address', value)}
        placeholder="Enter your full address"
        multiline
        numberOfLines={3}
        required
      />

      <Input
        label="Date of Birth *"
        value={data?.dateOfBirth || ''}
        onChangeText={(value) => updateField('dateOfBirth', value)}
        placeholder="MM/DD/YYYY"
        keyboardType="numeric"
        required
      />

      <View style={[styles.infoBox, { backgroundColor: colors.extended.tealVariations.background }]}>
        <Text style={[styles.infoText, { color: colors.neutral.midnight }]}>
          ℹ️ Your information is kept confidential and only shared with the shelter for adoption purposes.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
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

export default PersonalInfoStep;