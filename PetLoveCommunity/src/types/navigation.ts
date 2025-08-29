// Pet Love Community - Navigation Types
// TypeScript definitions for React Navigation

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { AppointmentType } from '../services/calendarService';

// Define the parameter list for all screens in the app
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  PetList: undefined;
  PetDetail: {
    petId: string;
  };
  PetGallery: {
    petId: string;
    photoIndex: number;
  };
  AdoptionApplication: {
    petId: string;
  };
  // Calendar & Appointment screens
  AppointmentScheduler: {
    petId?: string;
    petName?: string;
    shelterId: string;
    shelterName: string;
    shelterContact: {
      name: string;
      phone: string;
      email: string;
    };
    adopterId: string;
    appointmentType: AppointmentType;
    minDate?: string;
    maxDate?: string;
  };
  MyAppointments: undefined;
  AppointmentDetails: {
    appointmentId: string;
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

export type PetGalleryNavigationProp = RootStackNavigationProp<'PetGallery'>;
export type PetGalleryRouteProp = RootStackRouteProp<'PetGallery'>;

export type AdoptionApplicationNavigationProp = RootStackNavigationProp<'AdoptionApplication'>;
export type AdoptionApplicationRouteProp = RootStackRouteProp<'AdoptionApplication'>;

// Calendar & Appointment screen navigation prop types
export type AppointmentSchedulerNavigationProp = RootStackNavigationProp<'AppointmentScheduler'>;
export type AppointmentSchedulerRouteProp = RootStackRouteProp<'AppointmentScheduler'>;

export type MyAppointmentsNavigationProp = RootStackNavigationProp<'MyAppointments'>;
export type MyAppointmentsRouteProp = RootStackRouteProp<'MyAppointments'>;

export type AppointmentDetailsNavigationProp = RootStackNavigationProp<'AppointmentDetails'>;
export type AppointmentDetailsRouteProp = RootStackRouteProp<'AppointmentDetails'>;

// Generic screen props interface
export interface ScreenProps<T extends keyof RootStackParamList> {
  navigation: RootStackNavigationProp<T>;
  route: RootStackRouteProp<T>;
}