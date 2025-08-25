// Pet Love Community - Adoption Analytics Service
// Enterprise analytics service for tracking adoption workflow with correlation IDs and detailed metrics

import AsyncStorage from '@react-native-async-storage/async-storage';
import correlationIdService from './correlationIdService';
import deviceInfoService from './deviceInfoService';
import { petApi } from './petApi';
import type { AdoptionApplication } from '../types/pet';

// Analytics event types
export interface BaseAnalyticsEvent {
  eventId: string;
  correlationId: string;
  userId: string;
  sessionId: string;
  timestamp: string;
  deviceInfo: {
    platform: 'ios' | 'android';
    deviceId: string;
    appVersion: string;
    osVersion: string;
  };
  userAgent?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

export interface PetViewEvent extends BaseAnalyticsEvent {
  eventType: 'pet_view';
  petId: string;
  petName?: string;
  viewDuration?: number;
  source: 'search' | 'featured' | 'favorites' | 'recommendation' | 'deep_link';
  searchQuery?: string;
  searchFilters?: Record<string, any>;
  scrollPosition?: number;
  imageViews: string[]; // Array of image URLs viewed
}

export interface PetInteractionEvent extends BaseAnalyticsEvent {
  eventType: 'pet_interaction';
  petId: string;
  interactionType: 'favorite' | 'unfavorite' | 'share' | 'image_swipe' | 'expand_details' | 'contact_shelter';
  interactionValue?: string | number;
  previousState?: any;
  newState?: any;
}

export interface AdoptionFunnelEvent extends BaseAnalyticsEvent {
  eventType: 'adoption_funnel';
  petId: string;
  funnelStep: 'view' | 'favorite' | 'application_start' | 'application_step' | 'application_complete' | 'application_submit';
  stepDetails: {
    currentStep?: number;
    totalSteps?: number;
    completionPercentage?: number;
    timeSpent?: number;
    stepName?: string;
    validationErrors?: string[];
  };
  applicationId?: string;
  draftId?: string;
}

export interface FormAnalyticsEvent extends BaseAnalyticsEvent {
  eventType: 'form_analytics';
  formType: 'adoption_application' | 'user_registration' | 'contact_form';
  formId: string;
  action: 'start' | 'field_focus' | 'field_blur' | 'validation_error' | 'step_complete' | 'abandon' | 'submit';
  fieldName?: string;
  fieldValue?: string;
  errorMessage?: string;
  timeOnField?: number;
  stepNumber?: number;
  completionPercentage?: number;
  formData?: Partial<AdoptionApplication>;
}

export interface DocumentUploadEvent extends BaseAnalyticsEvent {
  eventType: 'document_upload';
  documentType: string;
  applicationId: string;
  action: 'start' | 'select_method' | 'capture' | 'validation_error' | 'upload_start' | 'upload_success' | 'upload_fail';
  method?: 'camera' | 'gallery' | 'file_picker';
  fileSize?: number;
  fileType?: string;
  processingTime?: number;
  errorDetails?: string;
  retryCount?: number;
}

export interface SearchAnalyticsEvent extends BaseAnalyticsEvent {
  eventType: 'search_analytics';
  query?: string;
  filters: Record<string, any>;
  resultsCount: number;
  searchTime: number;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  sortBy?: string;
  selectedPetId?: string;
  selectedPosition?: number;
  refinements: string[];
  noResultsReason?: string;
}

export interface OfflineEvent extends BaseAnalyticsEvent {
  eventType: 'offline_event';
  action: 'queue_event' | 'sync_start' | 'sync_success' | 'sync_fail' | 'conflict_detected' | 'conflict_resolved';
  queueSize?: number;
  syncedCount?: number;
  failedCount?: number;
  conflictCount?: number;
  offlineDuration?: number;
  dataSize?: number;
}

export type AnalyticsEvent = 
  | PetViewEvent 
  | PetInteractionEvent 
  | AdoptionFunnelEvent 
  | FormAnalyticsEvent 
  | DocumentUploadEvent 
  | SearchAnalyticsEvent 
  | OfflineEvent;

// Analytics configuration
interface AnalyticsConfig {
  enableLocalStorage: boolean;
  enableRealTimeTracking: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  maxRetries: number;
  queueMaxSize: number;
  enableDebugLogging: boolean;
}

class AdoptionAnalyticsService {
  private isInitialized = false;
  private sessionId: string = '';
  private userId: string = '';
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isOnline = true;
  
  private config: AnalyticsConfig = {
    enableLocalStorage: true,
    enableRealTimeTracking: true,
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    maxRetries: 3,
    queueMaxSize: 1000,
    enableDebugLogging: __DEV__,
  };

  private readonly STORAGE_KEYS = {
    ANALYTICS_QUEUE: '@PetLoveCommunity:analytics_queue',
    SESSION_DATA: '@PetLoveCommunity:analytics_session',
    USER_JOURNEY: '@PetLoveCommunity:user_journey',
  };

  async initialize(userId: string, config?: Partial<AnalyticsConfig>): Promise<void> {
    if (this.isInitialized) return;

    this.userId = userId;
    this.sessionId = await this.generateSessionId();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Load persisted queue
    await this.loadPersistedQueue();
    
    // Start flush timer
    this.startFlushTimer();
    
    this.isInitialized = true;
    this.log('Analytics service initialized', { userId, sessionId: this.sessionId });
  }

  private async generateSessionId(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `session_${timestamp}_${random}`;
  }

  private async loadPersistedQueue(): Promise<void> {
    if (!this.config.enableLocalStorage) return;

    try {
      const queueData = await AsyncStorage.getItem(this.STORAGE_KEYS.ANALYTICS_QUEUE);
      if (queueData) {
        const events = JSON.parse(queueData) as AnalyticsEvent[];
        this.eventQueue = events.slice(0, this.config.queueMaxSize);
        this.log(`Loaded ${this.eventQueue.length} events from storage`);
      }
    } catch (error) {
      console.error('Failed to load analytics queue:', error);
    }
  }

  private async persistQueue(): Promise<void> {
    if (!this.config.enableLocalStorage) return;

    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.ANALYTICS_QUEUE,
        JSON.stringify(this.eventQueue)
      );
    } catch (error) {
      console.error('Failed to persist analytics queue:', error);
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  private log(message: string, data?: any): void {
    if (this.config.enableDebugLogging) {
      console.log(`[AdoptionAnalytics] ${message}`, data);
    }
  }

  // Core tracking methods
  async trackEvent(eventData: Omit<AnalyticsEvent, keyof BaseAnalyticsEvent>): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Analytics service not initialized');
      return;
    }

    const baseEvent: BaseAnalyticsEvent = {
      eventId: await correlationIdService.getCorrelationId(),
      correlationId: await correlationIdService.getCorrelationId(),
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      deviceInfo: await deviceInfoService.getDeviceInfo(),
    };

    const fullEvent: AnalyticsEvent = {
      ...baseEvent,
      ...eventData,
    } as AnalyticsEvent;

    // Add to queue
    this.eventQueue.push(fullEvent);
    
    // Maintain queue size
    if (this.eventQueue.length > this.config.queueMaxSize) {
      this.eventQueue = this.eventQueue.slice(-this.config.queueMaxSize);
    }

    // Persist queue
    await this.persistQueue();

    this.log('Event tracked', { eventType: eventData.eventType, queueSize: this.eventQueue.length });

    // Flush if batch size reached or real-time tracking enabled
    if (this.eventQueue.length >= this.config.batchSize || this.config.enableRealTimeTracking) {
      await this.flushEvents();
    }
  }

  // Pet-specific tracking methods
  async trackPetView(petId: string, options: Partial<Omit<PetViewEvent, keyof BaseAnalyticsEvent | 'eventType' | 'petId'>> = {}): Promise<void> {
    await this.trackEvent({
      eventType: 'pet_view',
      petId,
      petName: options.petName,
      viewDuration: options.viewDuration,
      source: options.source || 'search',
      searchQuery: options.searchQuery,
      searchFilters: options.searchFilters,
      scrollPosition: options.scrollPosition,
      imageViews: options.imageViews || [],
    });
  }

  async trackPetInteraction(petId: string, interactionType: PetInteractionEvent['interactionType'], options: Partial<Omit<PetInteractionEvent, keyof BaseAnalyticsEvent | 'eventType' | 'petId' | 'interactionType'>> = {}): Promise<void> {
    await this.trackEvent({
      eventType: 'pet_interaction',
      petId,
      interactionType,
      interactionValue: options.interactionValue,
      previousState: options.previousState,
      newState: options.newState,
    });
  }

  async trackAdoptionFunnelStep(petId: string, funnelStep: AdoptionFunnelEvent['funnelStep'], stepDetails: AdoptionFunnelEvent['stepDetails'], options: Partial<Omit<AdoptionFunnelEvent, keyof BaseAnalyticsEvent | 'eventType' | 'petId' | 'funnelStep' | 'stepDetails'>> = {}): Promise<void> {
    await this.trackEvent({
      eventType: 'adoption_funnel',
      petId,
      funnelStep,
      stepDetails,
      applicationId: options.applicationId,
      draftId: options.draftId,
    });
  }

  async trackFormAction(formType: FormAnalyticsEvent['formType'], formId: string, action: FormAnalyticsEvent['action'], options: Partial<Omit<FormAnalyticsEvent, keyof BaseAnalyticsEvent | 'eventType' | 'formType' | 'formId' | 'action'>> = {}): Promise<void> {
    await this.trackEvent({
      eventType: 'form_analytics',
      formType,
      formId,
      action,
      fieldName: options.fieldName,
      fieldValue: options.fieldValue,
      errorMessage: options.errorMessage,
      timeOnField: options.timeOnField,
      stepNumber: options.stepNumber,
      completionPercentage: options.completionPercentage,
      formData: options.formData,
    });
  }

  async trackDocumentUpload(documentType: string, applicationId: string, action: DocumentUploadEvent['action'], options: Partial<Omit<DocumentUploadEvent, keyof BaseAnalyticsEvent | 'eventType' | 'documentType' | 'applicationId' | 'action'>> = {}): Promise<void> {
    await this.trackEvent({
      eventType: 'document_upload',
      documentType,
      applicationId,
      action,
      method: options.method,
      fileSize: options.fileSize,
      fileType: options.fileType,
      processingTime: options.processingTime,
      errorDetails: options.errorDetails,
      retryCount: options.retryCount,
    });
  }

  async trackSearch(filters: Record<string, any>, resultsCount: number, searchTime: number, options: Partial<Omit<SearchAnalyticsEvent, keyof BaseAnalyticsEvent | 'eventType' | 'filters' | 'resultsCount' | 'searchTime'>> = {}): Promise<void> {
    await this.trackEvent({
      eventType: 'search_analytics',
      query: options.query,
      filters,
      resultsCount,
      searchTime,
      location: options.location,
      sortBy: options.sortBy,
      selectedPetId: options.selectedPetId,
      selectedPosition: options.selectedPosition,
      refinements: options.refinements || [],
      noResultsReason: options.noResultsReason,
    });
  }

  async trackOfflineEvent(action: OfflineEvent['action'], options: Partial<Omit<OfflineEvent, keyof BaseAnalyticsEvent | 'eventType' | 'action'>> = {}): Promise<void> {
    await this.trackEvent({
      eventType: 'offline_event',
      action,
      queueSize: options.queueSize,
      syncedCount: options.syncedCount,
      failedCount: options.failedCount,
      conflictCount: options.conflictCount,
      offlineDuration: options.offlineDuration,
      dataSize: options.dataSize,
    });
  }

  // Batch processing and sync
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0 || !this.isOnline) {
      return;
    }

    const eventsToFlush = this.eventQueue.splice(0, this.config.batchSize);
    this.log(`Flushing ${eventsToFlush.length} events`);

    try {
      // Send events to server (replace with actual API call)
      await this.sendEventsToServer(eventsToFlush);
      
      // Update persisted queue
      await this.persistQueue();
      
      this.log(`Successfully flushed ${eventsToFlush.length} events`);
    } catch (error) {
      // Re-add events to front of queue for retry
      this.eventQueue.unshift(...eventsToFlush);
      console.error('Failed to flush analytics events:', error);
      
      this.log(`Failed to flush events, re-queued ${eventsToFlush.length} events`);
    }
  }

  private async sendEventsToServer(events: AnalyticsEvent[]): Promise<void> {
    // This would integrate with your actual analytics API
    // For now, using the existing pet API structure
    for (const event of events) {
      try {
        // You would replace this with your actual analytics endpoint
        console.log('Sending analytics event:', event.eventType, event.eventId);
        
        // Example: await analyticsApi.sendEvent(event);
        // For now, just simulate the API call
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Failed to send event ${event.eventId}:`, error);
        throw error; // Re-throw to trigger retry logic
      }
    }
  }

  // Network status handling
  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    
    if (isOnline && this.eventQueue.length > 0) {
      // Trigger immediate flush when coming online
      setTimeout(() => this.flushEvents(), 1000);
    }

    this.trackOfflineEvent(isOnline ? 'sync_start' : 'queue_event', {
      queueSize: this.eventQueue.length,
    });
  }

  // Analytics insights and reporting
  async getSessionSummary(): Promise<{
    sessionId: string;
    startTime: string;
    eventsCount: number;
    queuedEvents: number;
    topEventTypes: Record<string, number>;
  }> {
    const topEventTypes: Record<string, number> = {};
    
    this.eventQueue.forEach(event => {
      topEventTypes[event.eventType] = (topEventTypes[event.eventType] || 0) + 1;
    });

    return {
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      eventsCount: 0, // Would track total events sent in session
      queuedEvents: this.eventQueue.length,
      topEventTypes,
    };
  }

  async clearQueue(): Promise<void> {
    this.eventQueue = [];
    await AsyncStorage.removeItem(this.STORAGE_KEYS.ANALYTICS_QUEUE);
    this.log('Analytics queue cleared');
  }

  // Cleanup
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    await this.flushEvents();
    
    this.isInitialized = false;
    this.log('Analytics service shut down');
  }
}

// Export singleton instance
const adoptionAnalyticsService = new AdoptionAnalyticsService();
export default adoptionAnalyticsService;