// Navigation mocks for testing  
// Import this in test files that need navigation functionality

export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();
export const mockReset = jest.fn();
export const mockSetOptions = jest.fn();

export const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  reset: mockReset,
  setOptions: mockSetOptions,
};

export const mockRoute = {
  params: {},
  name: 'TestScreen',
  key: 'test-key',
};

export const mockUseFocusEffect = jest.fn();

// Complete Navigation mock for jest.mock usage
export const navigationMock = {
  NavigationContainer: ({ children }: any) => children,
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  useFocusEffect: mockUseFocusEffect,
};

// Reset function for cleanup
export const resetNavigationMocks = () => {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockReset.mockClear();
  mockSetOptions.mockClear();
  mockUseFocusEffect.mockClear();
};