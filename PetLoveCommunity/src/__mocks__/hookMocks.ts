// Centralized hook mocks for consistent testing
// Import and use these mocks across test files for standardization

// useColors hook mock
export const mockUseColors = () => ({
  primary: {
    coral: '#FF6B6B',
    teal: '#4ECDC4',
  },
  neutral: {
    beige: '#F7FFF7',
    midnight: '#1A535C',
    lightGray: '#CCCCCC',
    darkGray: '#666666',
  },
  extended: {
    coralVariations: {
      light: '#FF8E8E',
      dark: '#E55555',
    },
    tealVariations: {
      light: '#6ED4CC',
      dark: '#3BB5B0',
      background: '#E8F8F7',
    },
    textVariations: {
      secondary: '#2C6B73',
      tertiary: '#6C757D',
    },
  },
  semantic: {
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#E74C3C',
    info: '#74B9FF',
  },
});

// useAuth hook mock
export const mockUseAuth = () => ({
  isAuthenticated: true,
  user: { id: '1', name: 'Test User', email: 'test@example.com' },
  login: jest.fn(() => Promise.resolve()),
  logout: jest.fn(() => Promise.resolve()),
  loading: false,
  error: null,
});

// useNavigation hook mock  
export const mockUseNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

// useRoute hook mock
export const mockUseRoute = () => ({
  params: {},
  name: 'TestScreen',
  key: 'test-key',
});

// useAdoptionAnalytics hook mock
export const mockUseAdoptionAnalytics = () => ({
  trackDocumentAction: jest.fn(() => Promise.resolve()),
  trackUserAction: jest.fn(() => Promise.resolve()),
  trackScreenView: jest.fn(() => Promise.resolve()),
  trackError: jest.fn(() => Promise.resolve()),
});

// useAnalytics hook mock
export const mockUseAnalytics = () => ({
  track: jest.fn(() => Promise.resolve()),
  identify: jest.fn(() => Promise.resolve()),
  screen: jest.fn(() => Promise.resolve()),
  reset: jest.fn(() => Promise.resolve()),
});

// useAdoption hook mock
export const mockUseAdoption = () => ({
  pets: [],
  selectedPet: null,
  adoptPet: jest.fn(() => Promise.resolve()),
  searchPets: jest.fn(() => Promise.resolve()),
  loading: false,
  error: null,
});

// useCalendar hook mock
export const mockUseCalendar = () => ({
  events: [],
  createEvent: jest.fn(() => Promise.resolve()),
  updateEvent: jest.fn(() => Promise.resolve()),
  deleteEvent: jest.fn(() => Promise.resolve()),
  requestPermissions: jest.fn(() => Promise.resolve(true)),
  hasPermissions: true,
  loading: false,
  error: null,
});

// useDocumentUpload hook mock
export const mockUseDocumentUpload = () => ({
  uploadDocument: jest.fn(() => Promise.resolve({ url: 'test-url' })),
  uploadProgress: 0,
  isUploading: false,
  error: null,
  cancelUpload: jest.fn(),
});

// useNetworkStatus hook mock
export const mockUseNetworkStatus = () => ({
  isConnected: true,
  connectionType: 'wifi',
  isInternetReachable: true,
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

// useFormValidation hook mock
export const mockUseFormValidation = () => ({
  values: {},
  errors: {},
  touched: {},
  isValid: true,
  handleChange: jest.fn(),
  handleBlur: jest.fn(),
  handleSubmit: jest.fn(),
  resetForm: jest.fn(),
  setFieldValue: jest.fn(),
  setFieldError: jest.fn(),
});

// useModal hook mock
export const mockUseModal = () => ({
  isVisible: false,
  show: jest.fn(),
  hide: jest.fn(),
  toggle: jest.fn(),
});

// usePagination hook mock
export const mockUsePagination = () => ({
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  nextPage: jest.fn(),
  previousPage: jest.fn(),
  goToPage: jest.fn(),
  reset: jest.fn(),
});

// useInfiniteScroll hook mock
export const mockUseInfiniteScroll = () => ({
  data: [],
  loading: false,
  hasMore: true,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  error: null,
});

// useFocusEffect hook mock
export const mockUseFocusEffect = jest.fn();

// Hook mock factory for jest.mock() usage
export const createHookMocks = () => ({
  '../../hooks/useColors': () => ({ useColors: mockUseColors }),
  '../../../hooks/useColors': () => ({ useColors: mockUseColors }),
  '../../hooks/useAuth': () => ({ default: mockUseAuth }),
  '../../../hooks/useAuth': () => ({ default: mockUseAuth }),
  '../../hooks/useAdoptionAnalytics': () => ({ default: mockUseAdoptionAnalytics }),
  '../../../hooks/useAdoptionAnalytics': () => ({ default: mockUseAdoptionAnalytics }),
  '../../hooks/useAnalytics': () => ({ default: mockUseAnalytics }),
  '../../../hooks/useAnalytics': () => ({ default: mockUseAnalytics }),
  '../../hooks/useAdoption': () => ({ default: mockUseAdoption }),
  '../../../hooks/useAdoption': () => ({ default: mockUseAdoption }),
  '../../hooks/useCalendar': () => ({ default: mockUseCalendar }),
  '../../../hooks/useCalendar': () => ({ default: mockUseCalendar }),
  '../../hooks/useDocumentUpload': () => ({ default: mockUseDocumentUpload }),
  '../../../hooks/useDocumentUpload': () => ({ default: mockUseDocumentUpload }),
  '@react-navigation/native': () => ({
    useNavigation: mockUseNavigation,
    useRoute: mockUseRoute,
    useFocusEffect: mockUseFocusEffect,
  }),
});

// Reset all hook mocks
export const resetAllHookMocks = () => {
  const mocks = [
    mockUseAuth,
    mockUseAdoptionAnalytics,
    mockUseAnalytics,
    mockUseAdoption,
    mockUseCalendar,
    mockUseDocumentUpload,
    mockUseNetworkStatus,
    mockUseFormValidation,
    mockUseModal,
    mockUsePagination,
    mockUseInfiniteScroll,
    mockUseFocusEffect,
  ];

  mocks.forEach(mock => {
    if (typeof mock === 'function') {
      const mockFn = mock();
      if (mockFn && typeof mockFn === 'object') {
        Object.values(mockFn).forEach(fn => {
          if (jest.isMockFunction(fn)) {
            fn.mockClear();
          }
        });
      }
    } else if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};