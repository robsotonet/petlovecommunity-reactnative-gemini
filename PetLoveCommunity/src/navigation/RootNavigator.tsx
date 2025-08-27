import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/AuthProvider';
import { useColors } from '../hooks/useColors';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import PetListScreen from '../screens/PetListScreen';
import PetDetailScreen from '../screens/PetDetailScreen';
import PetGalleryScreen from '../screens/PetGalleryScreen';
import AdoptionApplicationScreen from '../screens/AdoptionApplicationScreen';
import LoadingScreen from '../components/LoadingScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuth();
  const colors = useColors();

  console.log('RootNavigator: Render state:', { isLoggedIn, isLoading });

  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.neutral.beige,
          },
          headerTintColor: colors.neutral.midnight,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        {isLoggedIn ? (
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="PetList" 
              component={PetListScreen}
              options={{
                title: 'Find Pets',
                headerStyle: {
                  backgroundColor: colors.neutral.beige,
                },
              }}
            />
            <Stack.Screen 
              name="PetDetail" 
              component={PetDetailScreen}
              options={{
                title: 'Pet Details',
                headerStyle: {
                  backgroundColor: colors.neutral.beige,
                },
              }}
            />
            <Stack.Screen 
              name="PetGallery" 
              component={PetGalleryScreen}
              options={{
                headerShown: false, // Gallery handles its own UI
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen 
              name="AdoptionApplication" 
              component={AdoptionApplicationScreen}
              options={{
                title: 'Adoption Application',
                headerStyle: {
                  backgroundColor: colors.primary.coral,
                },
                headerTintColor: '#FFFFFF',
              }}
            />
          </>
        ) : (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              headerShown: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
