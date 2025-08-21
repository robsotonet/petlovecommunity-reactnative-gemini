import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  const colors = useColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.neutral.beige,
    },
    text: {
      marginTop: 16,
      fontSize: 16,
      color: colors.neutral.midnight,
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary.coral} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

export default LoadingScreen;