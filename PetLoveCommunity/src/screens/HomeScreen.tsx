import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';

const HomeScreen: React.FC = () => {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text>Welcome!</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
