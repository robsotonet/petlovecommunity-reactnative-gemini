import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from 'react-native';
import { useColors } from '../hooks/useColors';

interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  type?: 'primary' | 'secondary';
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

const Button: React.FC<ButtonProps> = ({ title, onPress, type = 'primary', disabled = false, accessibilityLabel, testID }) => {
  const colors = useColors();
  
  const getButtonStyle = () => {
    if (disabled) {
      return { backgroundColor: colors.neutral.lightGray, opacity: 0.6 };
    }
    return type === 'primary' ? { backgroundColor: colors.primary.coral } : { backgroundColor: colors.primary.teal };
  };
  
  const getTextStyle = () => {
    if (disabled) {
      return { color: colors.neutral.darkGray };
    }
    return { color: '#FFFFFF' };
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle()]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <Text style={[styles.text, getTextStyle()]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Button;
