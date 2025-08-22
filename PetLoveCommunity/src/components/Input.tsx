import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useColors } from '../hooks/useColors';

interface InputProps extends TextInputProps {
  label: string;
  accessibilityHint?: string;
}

const Input: React.FC<InputProps> = ({ label, accessibilityHint, ...props }) => {
  const colors = useColors();

  const styles = StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      color: colors.neutral.midnight,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.neutral.beige,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.extended.tealVariations.background,
      color: colors.neutral.midnight,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        {...props}
      />
    </View>
  );
};

export default Input;
