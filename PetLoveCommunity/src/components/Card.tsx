import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useColors } from '../hooks/useColors';

const Card: React.FC<ViewProps> = ({ children, style, ...props }) => {
  const colors = useColors();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.neutral.beige,
      borderRadius: 12,
      padding: 20,
      shadowColor: colors.neutral.midnight,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.extended.tealVariations.background,
    },
  });

  return (
    <View style={[styles.card, style]} accessibilityRole="summary" {...props}>
      {children}
    </View>
  );
};

export default Card;
