// Pet Love Community - Analytics Hook
// Custom hook providing enterprise analytics data for tracking

import { useState, useEffect } from 'react';
import deviceInfoService from '../services/deviceInfoService';
import sessionService from '../services/sessionService';
import correlationIdService from '../services/correlationIdService';

export interface AnalyticsData {
  deviceId: string | null;
  sessionId: string | null;
  userId?: string;
  correlationId: string | null;
  isLoading: boolean;
  error: Error | null;
}

export interface AnalyticsTrackingData {
  deviceId: string;
  sessionId: string;
  correlationId: string;
  userId?: string;
  timestamp: string;
}

export const useAnalytics = (): AnalyticsData => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    deviceId: null,
    sessionId: null,
    userId: undefined,
    correlationId: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadAnalyticsData = async () => {
      try {
        setAnalyticsData(prev => ({ ...prev, isLoading: true, error: null }));

        // Load device info, session data, and correlation ID in parallel
        const [deviceInfo, sessionData, correlationId] = await Promise.all([
          deviceInfoService.getDeviceInfo(),
          sessionService.getCurrentSession(),
          correlationIdService.getCorrelationId(),
        ]);

        // Associate device with session if not already done
        if (sessionData.deviceId !== deviceInfo.uniqueId) {
          await sessionService.associateDevice(deviceInfo.uniqueId);
        }

        if (isMounted) {
          setAnalyticsData({
            deviceId: deviceInfo.uniqueId,
            sessionId: sessionData.sessionId,
            userId: sessionData.userId,
            correlationId,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setAnalyticsData(prev => ({
            ...prev,
            isLoading: false,
            error: error as Error,
          }));
        }
      }
    };

    loadAnalyticsData();

    return () => {
      isMounted = false;
    };
  }, []);

  return analyticsData;
};

export const useAnalyticsTracker = () => {
  const analyticsData = useAnalytics();

  const getTrackingData = (): AnalyticsTrackingData | null => {
    if (analyticsData.isLoading || analyticsData.error || !analyticsData.deviceId || !analyticsData.sessionId || !analyticsData.correlationId) {
      return null;
    }

    return {
      deviceId: analyticsData.deviceId,
      sessionId: analyticsData.sessionId,
      correlationId: analyticsData.correlationId,
      userId: analyticsData.userId,
      timestamp: new Date().toISOString(),
    };
  };

  const trackPetView = (petId: string, source: 'search' | 'featured' | 'direct' | 'share') => {
    const trackingData = getTrackingData();
    if (!trackingData) {
      console.warn('Analytics data not ready for pet view tracking');
      return null;
    }

    // Update session activity
    sessionService.updateSessionActivity();

    return {
      petId,
      source,
      ...trackingData,
    };
  };

  const trackPetInteraction = (petId: string, action: 'favorite' | 'unfavorite' | 'share' | 'contact' | 'application_start', metadata?: Record<string, any>) => {
    const trackingData = getTrackingData();
    if (!trackingData) {
      console.warn('Analytics data not ready for pet interaction tracking');
      return null;
    }

    // Update session activity
    sessionService.updateSessionActivity();

    return {
      petId,
      action,
      metadata,
      ...trackingData,
    };
  };

  const trackScreenView = (screenName: string, metadata?: Record<string, any>) => {
    const trackingData = getTrackingData();
    if (!trackingData) {
      console.warn('Analytics data not ready for screen view tracking');
      return null;
    }

    // Update session activity
    sessionService.updateSessionActivity();

    return {
      screenName,
      metadata,
      ...trackingData,
    };
  };

  const isReady = !analyticsData.isLoading && !analyticsData.error && !!analyticsData.deviceId && !!analyticsData.sessionId;

  return {
    isReady,
    isLoading: analyticsData.isLoading,
    error: analyticsData.error,
    trackPetView,
    trackPetInteraction,
    trackScreenView,
    getTrackingData,
  };
};

export default useAnalytics;