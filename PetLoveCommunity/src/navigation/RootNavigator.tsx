import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/AuthProvider';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import LoadingScreen from '../components/LoadingScreen';

const Stack = createNativeStackNavigator();

const RootNavigator: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuth();

  console.log('RootNavigator: Render state:', { isLoggedIn, isLoading });

  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
