import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from 'react-native';
import { useColors } from '../hooks/useColors';

interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  type?: 'primary' | 'secondary';
  accessibilityLabel?: string;
}

const Button: React.FC<ButtonProps> = ({ title, onPress, type = 'primary', accessibilityLabel }) => {
  const colors = useColors();
  const buttonStyle = type === 'primary' ? { backgroundColor: colors.primary.coral } : { backgroundColor: colors.primary.teal };
  const textStyle = type === 'primary' ? { color: '#FFFFFF' } : { color: '#FFFFFF' };

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
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
