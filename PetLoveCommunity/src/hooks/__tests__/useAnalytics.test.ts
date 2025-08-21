// Mock React Native first before any imports
jest.mock('react-native', () => ({
  AppState: {
    addListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    currentState: 'active',
  },
}));

jest.mock('../../services/deviceInfoService');
jest.mock('../../services/sessionService');
jest.mock('../../services/correlationIdService');
jest.mock('../../services/loggingService');

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAnalytics, useAnalyticsTracker } from '../useAnalytics';
import deviceInfoService from '../../services/deviceInfoService';
import sessionService from '../../services/sessionService';
import correlationIdService from '../../services/correlationIdService';
import loggingService from '../../services/loggingService';

const mockDeviceInfoService = deviceInfoService as jest.Mocked<typeof deviceInfoService>;
const mockSessionService = sessionService as jest.Mocked<typeof sessionService>;
const mockCorrelationIdService = correlationIdService as jest.Mocked<typeof correlationIdService>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;

describe('useAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDeviceInfoService.getDeviceInfo.mockResolvedValue({
      uniqueId: 'device-123',
      deviceId: 'device-456',
      bundleId: 'com.petlove.app',
      systemVersion: '14.0',
    });
    
    mockSessionService.getCurrentSession.mockResolvedValue({
      sessionId: 'session-123',
      startTime: Date.now(),
      lastActivity: Date.now(),
      userId: 'user-123',
      isActive: true,
    });
    
    mockSessionService.associateDevice.mockResolvedValue();
    
    mockCorrelationIdService.getCorrelationId.mockResolvedValue('correlation-123');
  });

  it('should load analytics data successfully', async () => {
    const { result } = renderHook(() => useAnalytics());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.deviceId).toBe('device-123');
    expect(result.current.sessionId).toBe('session-123');
    expect(result.current.userId).toBe('user-123');
    expect(result.current.correlationId).toBe('correlation-123');
    expect(result.current.error).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Failed to load device info');
    mockDeviceInfoService.getDeviceInfo.mockRejectedValue(error);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.deviceId).toBeNull();
    expect(result.current.sessionId).toBeNull();
  });

  it('should associate device with session when different', async () => {
    mockSessionService.getCurrentSession.mockResolvedValue({
      sessionId: 'session-123',
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      deviceId: 'different-device', // Different from device info
    });

    renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(mockSessionService.associateDevice).toHaveBeenCalledWith('device-123');
    });
  });
});

describe('useAnalyticsTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDeviceInfoService.getDeviceInfo.mockResolvedValue({
      uniqueId: 'device-123',
      deviceId: 'device-456',
      bundleId: 'com.petlove.app',
      systemVersion: '14.0',
    });
    
    mockSessionService.getCurrentSession.mockResolvedValue({
      sessionId: 'session-123',
      startTime: Date.now(),
      lastActivity: Date.now(),
      userId: 'user-123',
      isActive: true,
    });
    
    mockCorrelationIdService.getCorrelationId.mockResolvedValue('correlation-123');
    mockSessionService.updateSessionActivity.mockImplementation(() => {});
  });

  it('should return ready state when analytics data is loaded', async () => {
    const { result } = renderHook(() => useAnalyticsTracker());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should track pet view with correct data', async () => {
    const { result } = renderHook(() => useAnalyticsTracker());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const trackingData = result.current.trackPetView('pet-123', 'featured');

    expect(trackingData).toEqual({
      petId: 'pet-123',
      source: 'featured',
      deviceId: 'device-123',
      sessionId: 'session-123',
      correlationId: 'correlation-123',
      userId: 'user-123',
      timestamp: expect.any(String),
    });

    expect(mockSessionService.updateSessionActivity).toHaveBeenCalled();
  });

  it('should track pet interaction with metadata', async () => {
    const { result } = renderHook(() => useAnalyticsTracker());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const metadata = { shelter: 'Happy Tails Shelter' };
    const trackingData = result.current.trackPetInteraction('pet-123', 'contact', metadata);

    expect(trackingData).toEqual({
      petId: 'pet-123',
      action: 'contact',
      metadata,
      deviceId: 'device-123',
      sessionId: 'session-123',
      correlationId: 'correlation-123',
      userId: 'user-123',
      timestamp: expect.any(String),
    });

    expect(mockSessionService.updateSessionActivity).toHaveBeenCalled();
  });

  it('should track screen view', async () => {
    const { result } = renderHook(() => useAnalyticsTracker());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const metadata = { hasFilters: true, petsCount: 5 };
    const trackingData = result.current.trackScreenView('PetListScreen', metadata);

    expect(trackingData).toEqual({
      screenName: 'PetListScreen',
      metadata,
      deviceId: 'device-123',
      sessionId: 'session-123',
      correlationId: 'correlation-123',
      userId: 'user-123',
      timestamp: expect.any(String),
    });

    expect(mockSessionService.updateSessionActivity).toHaveBeenCalled();
  });

  it('should return null and warn when analytics data is not ready', async () => {
    mockDeviceInfoService.getDeviceInfo.mockRejectedValue(new Error('Device info failed'));

    const { result } = renderHook(() => useAnalyticsTracker());

    await waitFor(() => {
      expect(result.current.isReady).toBe(false);
    });

    const trackingData = result.current.trackPetView('pet-123', 'featured');

    expect(trackingData).toBeNull();
    expect(mockLoggingService.logAnalyticsWarning).toHaveBeenCalledWith(
      'Analytics data not ready for pet view tracking',
      { petId: 'pet-123', source: 'featured' }
    );
  });

  it('should get tracking data directly', async () => {
    const { result } = renderHook(() => useAnalyticsTracker());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const trackingData = result.current.getTrackingData();

    expect(trackingData).toEqual({
      deviceId: 'device-123',
      sessionId: 'session-123',
      correlationId: 'correlation-123',
      userId: 'user-123',
      timestamp: expect.any(String),
    });
  });

  it('should return null for tracking data when analytics data is missing', async () => {
    // Mock missing correlation ID to make analytics data incomplete
    mockCorrelationIdService.getCorrelationId.mockResolvedValue('');

    const { result } = renderHook(() => useAnalyticsTracker());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const trackingData = result.current.getTrackingData();
    expect(trackingData).toBeNull();
  });
});