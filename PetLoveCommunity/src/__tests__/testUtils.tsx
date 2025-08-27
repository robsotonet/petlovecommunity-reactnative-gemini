// Pet Love Community - Test Utilities
// Shared testing utilities, mocks, and data factories for pet discovery components

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { Pet, PetType, PetSearchRequest, PetFavorite, AdoptionApplication } from '../types/pet';

// Mock store setup
const mockStore = configureStore({
  reducer: {
    pets: (state = {
      favorites: [],
      applications: [],
      drafts: {},
      currentApplication: { petId: null, step: 1, isSubmitting: false, submitError: null },
      searchFilters: { limit: 20, page: 1 },
      recentSearches: [],
      selectedPet: null,
      adoptionStatus: 'idle',
      lastError: null,
      isOnline: true,
      lastSyncTimestamp: null,
      adoptionFunnel: {
        viewedPets: [],
        favoritedPets: [],
        startedApplications: [],
        submittedApplications: [],
      },
    }, action) => state,
  },
});

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  store?: typeof mockStore;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    initialState,
    store = mockStore,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <Provider store={store}>
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </Provider>
    );
  };

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Mock data factories
export const createMockPet = (overrides: Partial<Pet> = {}): Pet => ({
  id: `pet-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Buddy',
  type: 'dog',
  breed: 'Golden Retriever',
  age: 3,
  gender: 'male',
  size: 'large',
  description: 'A friendly and energetic dog who loves to play fetch and go on long walks.',
  status: 'available',
  photos: [
    {
      id: 'photo1',
      url: 'https://example.com/photo1.jpg',
      thumbnailUrl: 'https://example.com/photo1_thumb.jpg',
      caption: 'Playing in the park',
      isPrimary: true,
      uploadedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'photo2', 
      url: 'https://example.com/photo2.jpg',
      thumbnailUrl: 'https://example.com/photo2_thumb.jpg',
      caption: 'Relaxing at home',
      isPrimary: false,
      uploadedAt: '2024-01-15T10:30:00Z',
    },
  ],
  location: {
    id: 'location1',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    country: 'US',
    coordinates: {
      latitude: 39.7817,
      longitude: -89.6501,
    },
  },
  shelter: {
    id: 'shelter1',
    name: 'Happy Paws Animal Shelter',
    email: 'info@happypaws.org',
    phone: '+1-555-123-4567',
    website: 'https://happypaws.org',
    address: '123 Main St, Springfield, IL 62701',
    location: {
      id: 'location1',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'US',
    },
    verified: true,
    rating: 4.8,
    totalReviews: 127,
  },
  characteristics: {
    energyLevel: 4,
    friendlinessWithChildren: 5,
    friendlinessWithPets: 3,
    trainability: 4,
    groomingNeeds: 3,
    specialNeeds: [],
    goodWith: ['children', 'dogs'],
    houseTrained: true,
    spayedNeutered: true,
  },
  medicalInfo: {
    vaccinated: true,
    vaccinationDate: '2024-01-15',
    microchipped: true,
    microchipId: 'ABC123456789',
    healthConditions: [],
    medications: [],
    veterinarianNotes: 'Healthy and active dog. All vaccinations up to date.',
    lastCheckupDate: '2024-01-15',
  },
  adoptionInfo: {
    adoptionFee: 150,
    currency: 'USD',
    adoptionProcess: [
      'Submit application',
      'Phone interview',
      'Home visit',
      'Meet and greet',
      'Finalize adoption',
    ],
    requirements: ['Valid ID', 'Proof of residence', 'Veterinary references'],
    contactInfo: {
      primaryContact: 'Sarah Johnson',
      email: 'adoptions@happypaws.org',
      phone: '+1-555-123-4567',
    },
    availableForVisit: true,
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  ...overrides,
});

export const createMockPetList = (count: number = 5): Pet[] => {
  const pets: Pet[] = [];
  const names = ['Buddy', 'Luna', 'Charlie', 'Bella', 'Max', 'Daisy', 'Rocky', 'Molly'];
  const breeds = ['Golden Retriever', 'Labrador', 'Border Collie', 'German Shepherd', 'Poodle'];
  const types: PetType[] = ['dog', 'cat'];

  for (let i = 0; i < count; i++) {
    pets.push(createMockPet({
      id: `pet-${i + 1}`,
      name: names[i % names.length],
      breed: breeds[i % breeds.length],
      type: types[i % types.length],
      age: Math.floor(Math.random() * 10) + 1,
      status: i === 0 ? 'pending' : 'available', // First pet has different status
    }));
  }

  return pets;
};

export const createMockSearchRequest = (overrides: Partial<PetSearchRequest> = {}): PetSearchRequest => ({
  limit: 20,
  page: 1,
  searchQuery: undefined,
  filters: undefined,
  sortBy: undefined,
  ...overrides,
});

export const createMockFavorite = (overrides: Partial<PetFavorite> = {}): PetFavorite => ({
  petId: 'pet-1',
  userId: 'user-1',
  favoritedAt: '2024-01-15T10:00:00Z',
  notes: 'Seems like a great match for our family!',
  ...overrides,
});

export const createMockAdoptionApplication = (overrides: Partial<AdoptionApplication> = {}): AdoptionApplication => ({
  id: 'app-1',
  petId: 'pet-1',
  userId: 'user-1',
  status: 'draft',
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-123-4567',
    address: '456 Oak Ave, Springfield, IL 62701',
    dateOfBirth: '1985-05-15',
  },
  livingSituation: {
    housingType: 'house',
    ownOrRent: 'own',
    landlordContact: undefined,
    yardType: 'fenced',
    currentPets: [],
  },
  experience: {
    previousPets: true,
    petExperience: 'I have had dogs for over 10 years and am experienced with training and care.',
    currentPets: [],
    veterinarianInfo: {
      name: 'Dr. Smith',
      phone: '+1-555-987-6543',
      address: '789 Vet St, Springfield, IL 62701',
    },
  },
  preferences: {
    activityLevel: 'high',
    livingArrangement: 'indoor_outdoor',
    childrenInHome: false,
    otherPetsInHome: false,
    specificRequests: 'Looking for an active companion for hiking and outdoor activities.',
  },
  documents: {
    idDocument: {
      type: 'drivers_license',
      url: 'https://example.com/id.jpg',
      uploadedAt: '2024-01-15T09:00:00Z',
    },
    proofOfResidence: {
      type: 'utility_bill',
      url: 'https://example.com/utility.pdf',
      uploadedAt: '2024-01-15T09:15:00Z',
    },
  },
  references: [
    {
      name: 'Jane Smith',
      relationship: 'Friend',
      phone: '+1-555-111-2222',
      email: 'jane.smith@example.com',
      yearsKnown: 5,
    },
  ],
  createdAt: '2024-01-15T08:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  submittedAt: undefined,
  ...overrides,
});

// Mock API responses
export const createMockApiResponse = <T>(data: T, success: boolean = true) => ({
  data,
  success,
  message: success ? 'Success' : 'Error occurred',
  timestamp: new Date().toISOString(),
});

export const createMockPetSearchResponse = (pets: Pet[] = createMockPetList()) => ({
  pets,
  totalCount: pets.length,
  hasMore: false,
  nextPage: null,
});

// Navigation mocks
export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();
export const mockReset = jest.fn();

export const createMockNavigation = () => ({
  navigate: mockNavigate,
  goBack: mockGoBack,
  reset: mockReset,
  canGoBack: () => true,
  dispatch: jest.fn(),
  setParams: jest.fn(),
  isFocused: () => true,
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
});

export const createMockRoute = (params: any = {}) => ({
  key: 'test-key',
  name: 'TestScreen' as never,
  params,
});

// Hook mocks
export const createMockColors = () => ({
  neutral: {
    beige: '#F7FFF7',
    midnight: '#1A535C',
  },
  primary: {
    coral: '#FF6B6B',
    teal: '#4ECDC4',
  },
  extended: {
    textVariations: {
      secondary: '#666666',
      tertiary: '#999999',
    },
    tealVariations: {
      background: '#E8F8F7',
      light: '#7BDFD6',
      dark: '#3BB5B0',
    },
    orangeVariations: {
      background: '#FFF3E0',
      dark: '#E65100',
    },
  },
  semantic: {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
  },
});

export const createMockAnalyticsTracker = () => ({
  trackScreenView: jest.fn(),
  trackPetView: jest.fn(),
  trackPetInteraction: jest.fn(),
  trackFormEvent: jest.fn(),
  trackError: jest.fn(),
  isReady: true,
});

// RTK Query mocks
export const createMockQueryResponse = <T>(
  data: T | undefined,
  isLoading: boolean = false,
  error: any = null
) => ({
  data,
  isLoading,
  isFetching: isLoading,
  isSuccess: !isLoading && !error && data !== undefined,
  isError: !!error,
  error,
  refetch: jest.fn(),
  fulfilledTimeStamp: Date.now(),
  requestId: 'test-request-id',
  startedTimeStamp: Date.now() - 1000,
});

export const createMockMutationResponse = () => ({
  0: jest.fn(), // The mutation trigger function
  1: {
    isLoading: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    error: undefined,
    reset: jest.fn(),
  },
});

// Test data collections
export const testPetData = {
  availablePet: createMockPet({ id: 'available-pet', status: 'available' }),
  pendingPet: createMockPet({ id: 'pending-pet', status: 'pending' }),
  adoptedPet: createMockPet({ id: 'adopted-pet', status: 'adopted' }),
};

export const testSearchFilters = {
  empty: createMockSearchRequest(),
  withQuery: createMockSearchRequest({ searchQuery: 'Golden Retriever' }),
  withFilters: createMockSearchRequest({
    filters: {
      species: 'Dog',
      size: 'Large',
      age: '1-3',
      goodWithChildren: true,
    },
  }),
  withSorting: createMockSearchRequest({ sortBy: 'age_asc' }),
};

// Accessibility test helpers
export const testAccessibility = {
  hasAccessibilityLabel: (element: any, label: string) => {
    expect(element.props.accessibilityLabel).toBe(label);
  },
  hasAccessibilityRole: (element: any, role: string) => {
    expect(element.props.accessibilityRole).toBe(role);
  },
  isAccessible: (element: any) => {
    expect(element.props.accessible).toBeTruthy();
  },
};

// Async test helpers
export const waitForApiCall = () => new Promise(resolve => setTimeout(resolve, 100));
export const waitForAnimation = () => new Promise(resolve => setTimeout(resolve, 300));

// Clean up helpers
export const cleanupMocks = () => {
  jest.clearAllMocks();
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockReset.mockClear();
};

export default {
  renderWithProviders,
  createMockPet,
  createMockPetList,
  createMockNavigation,
  createMockRoute,
  createMockColors,
  createMockAnalyticsTracker,
  createMockQueryResponse,
  createMockMutationResponse,
  testPetData,
  testSearchFilters,
  testAccessibility,
  waitForApiCall,
  cleanupMocks,
};