// Pet Love Community - Application Constants
// Environment-specific configuration values

export const API_CONFIG = {
  // API Base URL - configurable per environment
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:5248/api',
  
  // SignalR Hub URL - configurable per environment
  SIGNALR_HUB_URL: process.env.SIGNALR_HUB_URL || 'https://petlovecommunity.com/hub',
  
  // Request timeout in milliseconds
  TIMEOUT: 30000,
} as const;

export const STORAGE_KEYS = {
  TRANSACTION_QUEUE: 'TRANSACTION_QUEUE',
  CURRENT_SESSION: 'CURRENT_SESSION',
  USER_PREFERENCES: 'USER_PREFERENCES',
  DEVICE_INFO: 'DEVICE_INFO',
} as const;

export const SESSION_CONFIG = {
  // Session timeout in milliseconds (30 minutes)
  TIMEOUT: 30 * 60 * 1000,
  
  // Activity update interval in milliseconds (5 minutes)
  ACTIVITY_UPDATE_INTERVAL: 5 * 60 * 1000,
} as const;

export const ANALYTICS_CONFIG = {
  // Enable analytics in development
  ENABLED: process.env.NODE_ENV !== 'test',
  
  // Batch size for analytics events
  BATCH_SIZE: 10,
  
  // Analytics flush interval in milliseconds
  FLUSH_INTERVAL: 30000,
} as const;

// Environment detection
export const ENV = {
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;