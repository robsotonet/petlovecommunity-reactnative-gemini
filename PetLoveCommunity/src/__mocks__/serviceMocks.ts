// Centralized service mocks for consistent testing
// Import and use these mocks across test files for standardization

// Correlation ID Service Mock
export const mockCorrelationIdService = {
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-123')),
  generateCorrelationId: jest.fn(() => 'test-correlation-123'),
};

// Auth Service Mock
export const mockAuthService = {
  login: jest.fn(() => Promise.resolve({ success: true, token: 'test-token' })),
  logout: jest.fn(() => Promise.resolve()),
  refreshToken: jest.fn(() => Promise.resolve('new-test-token')),
  getCurrentUser: jest.fn(() => Promise.resolve({ id: '1', name: 'Test User' })),
  validateSession: jest.fn(() => Promise.resolve(true)),
};

// Network Service Mock
export const mockNetworkService = {
  isConnected: jest.fn(() => Promise.resolve(true)),
  addNetworkChangeListener: jest.fn(),
  removeNetworkChangeListener: jest.fn(),
  getConnectionInfo: jest.fn(() => Promise.resolve({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
};

// Device Info Service Mock
export const mockDeviceInfoService = {
  getDeviceId: jest.fn(() => Promise.resolve('test-device-123')),
  getDeviceInfo: jest.fn(() => Promise.resolve({
    deviceId: 'test-device-123',
    platform: 'ios',
    version: '14.0',
  })),
};

// Logging Service Mock
export const mockLoggingService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Analytics Service Mock
export const mockAnalyticsService = {
  track: jest.fn(() => Promise.resolve()),
  identify: jest.fn(() => Promise.resolve()),
  screen: jest.fn(() => Promise.resolve()),
  trackDocumentAction: jest.fn(() => Promise.resolve()),
};

// Social API Mock
export const mockSocialApi = {
  getPosts: jest.fn(() => Promise.resolve({ data: [] })),
  createPost: jest.fn(() => Promise.resolve({ id: '1' })),
  likePost: jest.fn(() => Promise.resolve()),
  commentOnPost: jest.fn(() => Promise.resolve({ id: '1' })),
  followUser: jest.fn(() => Promise.resolve()),
};

// Pet API Mock
export const mockPetApi = {
  getAllPets: jest.fn(() => Promise.resolve({ data: [] })),
  getPetById: jest.fn(() => Promise.resolve({ id: '1', name: 'Test Pet' })),
  adoptPet: jest.fn(() => Promise.resolve({ success: true })),
  searchPets: jest.fn(() => Promise.resolve({ data: [] })),
};

// Calendar Service Mock
export const mockCalendarService = {
  getEvents: jest.fn(() => Promise.resolve([])),
  createEvent: jest.fn(() => Promise.resolve({ id: '1' })),
  updateEvent: jest.fn(() => Promise.resolve()),
  deleteEvent: jest.fn(() => Promise.resolve()),
  requestPermissions: jest.fn(() => Promise.resolve(true)),
};

// Document Upload Service Mock
export const mockDocumentUploadService = {
  uploadDocument: jest.fn(() => Promise.resolve({ url: 'test-url' })),
  getUploadProgress: jest.fn(() => Promise.resolve(100)),
  cancelUpload: jest.fn(() => Promise.resolve()),
};

// Secure Storage Mock
export const mockSecureStorage = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve('test-value')),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
};

// SignalR Service Mock
export const mockSignalRService = {
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  off: jest.fn(),
  invoke: jest.fn(() => Promise.resolve()),
  getConnection: jest.fn(() => ({
    state: 'Connected',
    on: jest.fn(),
    off: jest.fn(),
    invoke: jest.fn(() => Promise.resolve()),
  })),
};

// Reset all mocks function
export const resetAllServiceMocks = () => {
  Object.values({
    ...mockCorrelationIdService,
    ...mockAuthService,
    ...mockNetworkService,
    ...mockDeviceInfoService,
    ...mockLoggingService,
    ...mockAnalyticsService,
    ...mockSocialApi,
    ...mockPetApi,
    ...mockCalendarService,
    ...mockDocumentUploadService,
    ...mockSecureStorage,
    ...mockSignalRService,
  }).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};

// Service mock factory for jest.mock() usage
export const createServiceMocks = () => ({
  'correlationIdService': () => mockCorrelationIdService,
  'authService': () => mockAuthService,
  'networkService': () => mockNetworkService,
  'deviceInfoService': () => mockDeviceInfoService,
  'loggingService': () => mockLoggingService,
  'analyticsService': () => mockAnalyticsService,
  'socialApi': () => mockSocialApi,
  'petApi': () => mockPetApi,
  'calendarService': () => mockCalendarService,
  'documentUploadService': () => mockDocumentUploadService,
  'secureStorage': () => mockSecureStorage,
  'signalRService': () => mockSignalRService,
});