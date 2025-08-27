import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from 'react-native';
import { useColors } from '../hooks/useColors';

interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  type?: 'primary' | 'secondary';
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityActions?: Array<{ name: string; label?: string }>;
  accessibilityState?: any;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  accessibilityLevel?: number;
  accessibilityLanguage?: string;
  testID?: string;
  style?: any;
}

const Button: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  type = 'primary', 
  disabled = false, 
  accessibilityLabel, 
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityActions,
  accessibilityState,
  accessibilityLiveRegion,
  accessibilityLevel,
  accessibilityLanguage,
  testID,
  style 
}) => {
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
      style={[styles.button, getButtonStyle(), style]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      accessibilityState={accessibilityState || { disabled }}
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityLevel={accessibilityLevel}
      accessibilityLanguage={accessibilityLanguage}
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
    minWidth: 44, // WCAG AA minimum touch target size
    minHeight: 44, // WCAG AA minimum touch target size
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Button;
