// Comprehensive React Native Mock Setup for Integration Tests
// Fixes Platform.select issues, component dependencies, and navigation mocking

import { ReactTestInstance } from 'react-test-renderer';

// Mock React Native Platform with proper select method
const mockPlatform = {
  OS: 'ios' as 'ios' | 'android',
  Version: '14.0',
  isPad: false,
  isTVOS: false,
  select: jest.fn((options: any) => {
    if (typeof options === 'object' && options !== null) {
      return options[mockPlatform.OS] || options.default;
    }
    return options;
  }),
};

// Mock React Native core modules
jest.mock('react-native', () => ({
  Platform: mockPlatform,
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => style),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
    roundToNearestPixel: jest.fn((size) => size),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  // Mock React Native components
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  TouchableHighlight: 'TouchableHighlight',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  SectionList: 'SectionList',
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  Modal: 'Modal',
  Alert: {
    alert: jest.fn(),
    prompt: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    emit: jest.fn(),
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
  Animated: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    Value: jest.fn(() => ({ setValue: jest.fn(), addListener: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    decay: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(),
    parallel: jest.fn(),
    loop: jest.fn(),
    createAnimatedComponent: jest.fn((Component) => Component),
  },
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    quad: jest.fn(),
    cubic: jest.fn(),
  },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  SafeAreaView: 'SafeAreaView',
  StatusBar: 'StatusBar',
  useColorScheme: jest.fn(() => 'light'),
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  mergeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiMerge: jest.fn(() => Promise.resolve()),
}));

// Mock React Navigation with proper Platform.select support
const mockNavigationActions = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  dispatch: jest.fn(),
  canGoBack: jest.fn(() => false),
  getId: jest.fn(() => 'mock-navigation-id'),
  getParent: jest.fn(),
  getState: jest.fn(() => ({ routes: [], index: 0 })),
  setParams: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  // Import the actual Platform mock to ensure consistency
  const { Platform } = jest.requireMock('react-native');
  
  return {
    NavigationContainer: jest.fn(({ children }) => children),
    useNavigation: jest.fn(() => mockNavigationActions),
    useRoute: jest.fn(() => ({
      key: 'mock-route-key',
      name: 'MockScreen',
      params: {},
    })),
    useFocusEffect: jest.fn((callback) => {
      callback();
    }),
    useIsFocused: jest.fn(() => true),
    useNavigationState: jest.fn(() => ({ routes: [], index: 0 })),
    createNavigationContainerRef: jest.fn(),
    CommonActions: {
      navigate: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
    },
    StackActions: {
      push: jest.fn(),
      pop: jest.fn(),
      popToTop: jest.fn(),
      replace: jest.fn(),
    },
    TabActions: {
      jumpTo: jest.fn(),
    },
    DrawerActions: {
      openDrawer: jest.fn(),
      closeDrawer: jest.fn(),
      toggleDrawer: jest.fn(),
    },
    // This ensures Platform.select works for React Navigation
    __Platform: Platform,
  };
});

// Note: Stack Navigator mock removed as package is not installed in this project

// Mock native dependencies
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
  getVersion: jest.fn(() => '1.0.0'),
  getBundleId: jest.fn(() => 'com.petlove.test'),
  getApplicationName: jest.fn(() => 'PetLove'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '14.0'),
  getModel: jest.fn(() => 'iPhone'),
  getDeviceType: jest.fn(() => 'Handset'),
}));

// Mock Secure Storage
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() => Promise.resolve({ username: '', password: '' })),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
  canImplyAuthentication: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve('TouchID')),
}));

// Mock useColors hook for component dependencies
jest.mock('../../../hooks/useColors', () => ({
  useColors: jest.fn(() => ({
    primary: {
      coral: '#FF6B6B',
      coralLight: '#FF8E8E',
      coralDark: '#E55555',
    },
    secondary: {
      teal: '#4ECDC4',
      tealLight: '#6ED4CC',
      tealDark: '#3BB5B0',
    },
    neutral: {
      beige: '#F7FFF7',
      midnight: '#1A535C',
    },
    extended: {
      coralVariations: {
        hover: '#FF8E8E',
        active: '#E55555',
        background: '#FFF5F5',
      },
      tealVariations: {
        hover: '#6ED4CC',
        active: '#3BB5B0',
        background: '#F0FFFE',
      },
    },
  })),
}));

// Mock constants
jest.mock('../../../config/constants', () => ({
  API_CONFIG: {
    BASE_URL: 'https://test-api.petlove.com',
    TIMEOUT: 10000,
  },
  STORAGE_KEYS: {
    AUTH_TOKEN: 'AUTH_TOKEN',
    USER_DATA: 'USER_DATA',
    CURRENT_SESSION: 'CURRENT_SESSION',
    TRANSACTION_QUEUE: 'TRANSACTION_QUEUE',
  },
  SESSION_CONFIG: {
    TIMEOUT: 30 * 60 * 1000, // 30 minutes
  },
  COLORS: {
    PRIMARY: '#FF6B6B',
    SECONDARY: '#4ECDC4',
    BACKGROUND: '#F7FFF7',
    TEXT: '#1A535C',
  },
  ENV: {
    IS_DEV: false,
  },
}));

// Mock services
jest.mock('../../../services/correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-id')),
  generateCorrelationId: jest.fn(() => 'test-correlation-id'),
}));

jest.mock('../../../transactions/transactionService', () => ({
  generateTransactionId: jest.fn(() => 'test-transaction-id'),
  generateIdempotencyKey: jest.fn(() => 'test-idempotency-key'),
  TransactionService: jest.fn(() => ({
    getQueue: jest.fn(() => Promise.resolve([])),
    addTransaction: jest.fn(() => Promise.resolve()),
    processQueue: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock Secure Storage utilities
jest.mock('../../../utils/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    clear: jest.fn(() => Promise.resolve()),
    isAvailable: jest.fn(() => Promise.resolve(true)),
  },
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Export mock utilities for test files  
export { mockNavigationActions, mockPlatform };

// Reset function for test isolation
export const resetMocks = () => {
  jest.clearAllMocks();
  mockPlatform.OS = 'ios';
};

// Helper to simulate platform changes
export const setPlatform = (os: 'ios' | 'android') => {
  mockPlatform.OS = os;
};

export default {
  mockNavigationActions,
  mockPlatform,
  resetMocks,
  setPlatform,
};