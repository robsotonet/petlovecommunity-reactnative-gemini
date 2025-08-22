// Pet Love Community - Navigation Types
// TypeScript definitions for React Navigation

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

// Define the parameter list for all screens in the app
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  PetList: undefined;
  PetDetail: {
    petId: string;
  };
  AdoptionApplication: {
    petId: string;
  };
  // Add more screens as they are implemented
};

// Navigation prop types for type safety
export type RootStackNavigationProp<T extends keyof RootStackParamList> = 
  NativeStackNavigationProp<RootStackParamList, T>;

export type RootStackRouteProp<T extends keyof RootStackParamList> = 
  RouteProp<RootStackParamList, T>;

// Screen-specific navigation prop types
export type PetListNavigationProp = RootStackNavigationProp<'PetList'>;
export type PetListRouteProp = RootStackRouteProp<'PetList'>;

export type PetDetailNavigationProp = RootStackNavigationProp<'PetDetail'>;
export type PetDetailRouteProp = RootStackRouteProp<'PetDetail'>;

export type AdoptionApplicationNavigationProp = RootStackNavigationProp<'AdoptionApplication'>;
export type AdoptionApplicationRouteProp = RootStackRouteProp<'AdoptionApplication'>;

// Generic screen props interface
export interface ScreenProps<T extends keyof RootStackParamList> {
  navigation: RootStackNavigationProp<T>;
  route: RootStackRouteProp<T>;
}