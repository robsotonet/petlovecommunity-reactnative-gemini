// Pet Love Community - Pet API Service
// Enterprise RTK Query service for pet adoption features

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithEnterpriseHeaders } from '../utils/baseQuery';
import type {
  Pet,
  PetSearchRequest,
  PetSearchResponse,
  PetFavorite,
  AdoptionApplication,
  PetApiResponse,
  PetViewEvent,
  PetInteractionEvent,
  PetStatusUpdate,
  PetAvailabilityUpdate,
} from '../types/pet';
import type { AppDispatch } from '../store';

export const petApi = createApi({
  reducerPath: 'petApi',
  baseQuery: baseQueryWithEnterpriseHeaders,
  tagTypes: ['Pet', 'PetFavorite', 'AdoptionApplication', 'PetSearch'],
  endpoints: (builder) => ({
    // Pet Discovery
    searchPets: builder.query<PetSearchResponse, PetSearchRequest>({
      query: (searchRequest) => ({
        url: '/pets/search',
        method: 'POST',
        body: searchRequest,
      }),
      providesTags: (result) => [
        'PetSearch',
        ...(result?.pets.map(({ id }) => ({ type: 'Pet' as const, id })) || []),
      ],
    }),

    getFeaturedPets: builder.query<Pet[], { limit?: number }>({
      query: ({ limit = 20 } = {}) => ({
        url: `/pets/featured?limit=${limit}`,
      }),
      providesTags: (result) => [
        'Pet',
        ...(result?.map(({ id }) => ({ type: 'Pet' as const, id })) || []),
      ],
    }),

    getPetById: builder.query<Pet, string>({
      query: (petId) => ({
        url: `/pets/${petId}`,
      }),
      providesTags: (result, error, petId) => [{ type: 'Pet', id: petId }],
    }),

    getPetsByIds: builder.query<Pet[], string[]>({
      query: (petIds) => ({
        url: '/pets/batch',
        method: 'POST',
        body: { petIds },
      }),
      providesTags: (result) => [
        'Pet',
        ...(result?.map(({ id }) => ({ type: 'Pet' as const, id })) || []),
      ],
    }),

    // Pet Favorites
    getUserFavorites: builder.query<PetFavorite[], void>({
      query: () => ({
        url: '/pets/favorites',
      }),
      providesTags: ['PetFavorite'],
    }),

    addPetToFavorites: builder.mutation<
      PetApiResponse<PetFavorite>,
      { petId: string; notes?: string }
    >({
      query: ({ petId, notes }) => ({
        url: `/pets/${petId}/favorite`,
        method: 'POST',
        body: { notes },
      }),
      invalidatesTags: ['PetFavorite'],
      // Optimistic update
      async onQueryStarted({ petId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          petApi.util.updateQueryData('getUserFavorites', undefined, (draft) => {
            if (Array.isArray(draft)) {
              draft.push({
                petId,
                userId: '', // Will be filled by server response
                favoritedAt: new Date().toISOString(),
                notes: '',
              });
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    removePetFromFavorites: builder.mutation<PetApiResponse<void>, string>({
      query: (petId) => ({
        url: `/pets/${petId}/favorite`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PetFavorite'],
      // Optimistic update
      async onQueryStarted(petId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          petApi.util.updateQueryData('getUserFavorites', undefined, (draft) => {
            if (Array.isArray(draft)) {
              return draft.filter((favorite) => favorite.petId !== petId);
            }
            return draft;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Adoption Applications
    getUserApplications: builder.query<AdoptionApplication[], void>({
      query: () => ({
        url: '/adoption/applications',
      }),
      providesTags: ['AdoptionApplication'],
    }),

    getApplicationById: builder.query<AdoptionApplication, string>({
      query: (applicationId) => ({
        url: `/adoption/applications/${applicationId}`,
      }),
      providesTags: (result, error, applicationId) => [
        { type: 'AdoptionApplication', id: applicationId },
      ],
    }),

    createAdoptionApplication: builder.mutation<
      PetApiResponse<AdoptionApplication>,
      Partial<AdoptionApplication>
    >({
      query: (application) => ({
        url: '/adoption/applications',
        method: 'POST',
        body: application,
      }),
      invalidatesTags: ['AdoptionApplication'],
    }),

    updateAdoptionApplication: builder.mutation<
      PetApiResponse<AdoptionApplication>,
      { id: string; updates: Partial<AdoptionApplication> }
    >({
      query: ({ id, updates }) => ({
        url: `/adoption/applications/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'AdoptionApplication', id },
      ],
    }),

    submitAdoptionApplication: builder.mutation<
      PetApiResponse<AdoptionApplication>,
      string
    >({
      query: (applicationId) => ({
        url: `/adoption/applications/${applicationId}/submit`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, applicationId) => [
        { type: 'AdoptionApplication', id: applicationId },
      ],
    }),

    // Draft Management & Synchronization
    syncApplicationDraft: builder.mutation<
      PetApiResponse<{
        draftId: string;
        serverVersion: number;
        conflictData?: Partial<AdoptionApplication>;
        needsConflictResolution: boolean;
      }>,
      {
        draftId: string;
        clientVersion: number;
        formData: Partial<AdoptionApplication>;
        completionPercentage: number;
        currentStep: number;
        lastModified: string;
        changesSinceLastSync: string[];
      }
    >({
      query: ({ draftId, clientVersion, formData, completionPercentage, currentStep, lastModified, changesSinceLastSync }) => ({
        url: `/adoption/applications/drafts/${draftId}/sync`,
        method: 'POST',
        body: {
          clientVersion,
          formData,
          completionPercentage,
          currentStep,
          lastModified,
          changesSinceLastSync,
        },
      }),
      invalidatesTags: (result, error, { draftId }) => [
        { type: 'AdoptionApplication', id: draftId },
      ],
    }),

    getApplicationDraft: builder.query<
      {
        draftId: string;
        formData: Partial<AdoptionApplication>;
        completionPercentage: number;
        currentStep: number;
        serverVersion: number;
        lastModified: string;
        syncStatus: 'synced' | 'needs_sync' | 'conflict';
      },
      string
    >({
      query: (draftId) => ({
        url: `/adoption/applications/drafts/${draftId}`,
      }),
      providesTags: (result, error, draftId) => [
        { type: 'AdoptionApplication', id: draftId },
      ],
    }),

    // Analytics & Tracking
    trackPetView: builder.mutation<PetApiResponse<void>, Omit<PetViewEvent, 'timestamp' | 'correlationId'>>({
      query: (viewEvent) => ({
        url: '/analytics/pet-view',
        method: 'POST',
        body: viewEvent,
      }),
    }),

    trackPetInteraction: builder.mutation<
      PetApiResponse<void>,
      Omit<PetInteractionEvent, 'timestamp' | 'correlationId'>
    >({
      query: (interactionEvent) => ({
        url: '/analytics/pet-interaction',
        method: 'POST',
        body: interactionEvent,
      }),
    }),

    // Enhanced Analytics Batch Tracking
    trackAnalyticsBatch: builder.mutation<
      PetApiResponse<{ processedEvents: number; failedEvents: number }>,
      {
        events: Array<{
          eventType: string;
          eventData: any;
          correlationId: string;
          timestamp: string;
        }>;
      }
    >({
      query: ({ events }) => ({
        url: '/analytics/batch',
        method: 'POST',
        body: { events },
      }),
    }),

    trackAdoptionFunnelEvent: builder.mutation<
      PetApiResponse<void>,
      {
        petId: string;
        funnelStep: string;
        stepDetails: any;
        correlationId: string;
        timestamp: string;
        applicationId?: string;
        draftId?: string;
      }
    >({
      query: (funnelEvent) => ({
        url: '/analytics/adoption-funnel',
        method: 'POST',
        body: funnelEvent,
      }),
    }),

    trackFormAnalyticsEvent: builder.mutation<
      PetApiResponse<void>,
      {
        formType: string;
        formId: string;
        action: string;
        fieldDetails?: any;
        correlationId: string;
        timestamp: string;
      }
    >({
      query: (formEvent) => ({
        url: '/analytics/form-interaction',
        method: 'POST',
        body: formEvent,
      }),
    }),

    trackDocumentUploadEvent: builder.mutation<
      PetApiResponse<void>,
      {
        documentType: string;
        applicationId: string;
        action: string;
        uploadDetails: any;
        correlationId: string;
        timestamp: string;
      }
    >({
      query: (documentEvent) => ({
        url: '/analytics/document-upload',
        method: 'POST',
        body: documentEvent,
      }),
    }),

    trackSearchAnalyticsEvent: builder.mutation<
      PetApiResponse<void>,
      {
        searchDetails: any;
        resultsCount: number;
        searchTime: number;
        correlationId: string;
        timestamp: string;
      }
    >({
      query: (searchEvent) => ({
        url: '/analytics/search',
        method: 'POST',
        body: searchEvent,
      }),
    }),

    // Analytics Insights
    getAdoptionFunnelAnalytics: builder.query<
      {
        totalViews: number;
        totalFavorites: number;
        totalApplications: number;
        totalSubmissions: number;
        conversionRates: {
          viewToFavorite: number;
          favoriteToApplication: number;
          applicationToSubmission: number;
          overallConversion: number;
        };
        averageTimeToApplication: number;
        dropOffPoints: Array<{
          step: string;
          dropOffRate: number;
          commonReasons: string[];
        }>;
      },
      { userId?: string; dateRange?: { start: string; end: string } }
    >({
      query: ({ userId, dateRange } = {}) => ({
        url: '/analytics/adoption-funnel/insights',
        params: {
          ...(userId && { userId }),
          ...(dateRange && { startDate: dateRange.start, endDate: dateRange.end }),
        },
      }),
    }),

    // Calendar & Appointment Management
    getShelterAvailability: builder.query<
      {
        shelterId: string;
        shelterName: string;
        availableSlots: Array<{
          date: string;
          slots: Array<{
            startTime: string;
            endTime: string;
            available: boolean;
            appointmentTypes: string[];
            maxCapacity: number;
            currentBookings: number;
          }>;
        }>;
        operatingHours: Record<string, { open: string; close: string; closed?: boolean }>;
        blackoutDates: string[];
        timezone: string;
      },
      { 
        shelterId: string; 
        startDate: string; 
        endDate: string; 
        appointmentType?: string; 
      }
    >({
      query: ({ shelterId, startDate, endDate, appointmentType }) => ({
        url: `/shelters/${shelterId}/availability`,
        params: {
          startDate,
          endDate,
          ...(appointmentType && { appointmentType }),
        },
      }),
      providesTags: (result, error, { shelterId }) => [
        { type: 'PetSearch', id: `shelter_${shelterId}_availability` },
      ],
    }),

    scheduleAppointment: builder.mutation<
      PetApiResponse<{
        appointmentId: string;
        calendarEventId?: string;
        confirmationNumber: string;
        status: string;
      }>,
      {
        shelterId: string;
        petId?: string;
        appointmentType: string;
        startDateTime: string;
        endDateTime: string;
        adopterId: string;
        contactInfo: {
          name: string;
          email: string;
          phone: string;
        };
        requirements?: string[];
        notes?: string;
      }
    >({
      query: (appointmentData) => ({
        url: '/appointments/schedule',
        method: 'POST',
        body: appointmentData,
      }),
      invalidatesTags: (result, error, { shelterId }) => [
        { type: 'PetSearch', id: `shelter_${shelterId}_availability` },
      ],
    }),

    getUserAppointments: builder.query<
      Array<{
        appointmentId: string;
        shelterId: string;
        shelterName: string;
        petId?: string;
        petName?: string;
        appointmentType: string;
        startDateTime: string;
        endDateTime: string;
        status: string;
        location: string;
        contactInfo: any;
        requirements?: string[];
        notes?: string;
        confirmationNumber: string;
        createdAt: string;
        updatedAt: string;
      }>,
      { status?: string; limit?: number }
    >({
      query: ({ status, limit = 20 } = {}) => ({
        url: '/appointments/user',
        params: {
          ...(status && { status }),
          limit,
        },
      }),
      providesTags: ['AdoptionApplication'], // Reusing existing tag
    }),

    updateAppointmentStatus: builder.mutation<
      PetApiResponse<{ appointmentId: string; status: string }>,
      { 
        appointmentId: string; 
        status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
        notes?: string;
        cancellationReason?: string;
      }
    >({
      query: ({ appointmentId, status, notes, cancellationReason }) => ({
        url: `/appointments/${appointmentId}/status`,
        method: 'PATCH',
        body: {
          status,
          notes,
          cancellationReason,
        },
      }),
      invalidatesTags: ['AdoptionApplication'],
    }),

    rescheduleAppointment: builder.mutation<
      PetApiResponse<{
        appointmentId: string;
        newStartDateTime: string;
        newEndDateTime: string;
        status: string;
      }>,
      {
        appointmentId: string;
        newStartDateTime: string;
        newEndDateTime: string;
        reason?: string;
      }
    >({
      query: ({ appointmentId, newStartDateTime, newEndDateTime, reason }) => ({
        url: `/appointments/${appointmentId}/reschedule`,
        method: 'PATCH',
        body: {
          newStartDateTime,
          newEndDateTime,
          reason,
        },
      }),
      invalidatesTags: ['AdoptionApplication'],
    }),

    getAppointmentById: builder.query<
      {
        appointmentId: string;
        shelterId: string;
        shelterName: string;
        shelterContact: {
          name: string;
          phone: string;
          email: string;
          address: string;
        };
        petId?: string;
        petName?: string;
        petPhoto?: string;
        appointmentType: string;
        startDateTime: string;
        endDateTime: string;
        status: string;
        location: string;
        requirements?: string[];
        notes?: string;
        confirmationNumber: string;
        reminderSettings: Array<{
          minutes: number;
          method: string;
          sent: boolean;
        }>;
        attendees: Array<{
          name: string;
          email: string;
          role: string;
        }>;
      },
      string
    >({
      query: (appointmentId) => ({
        url: `/appointments/${appointmentId}`,
      }),
      providesTags: (result, error, appointmentId) => [
        { type: 'AdoptionApplication', id: appointmentId },
      ],
    }),

    addAppointmentReminder: builder.mutation<
      PetApiResponse<{ reminderId: string }>,
      {
        appointmentId: string;
        minutes: number;
        method: 'email' | 'sms' | 'push';
      }
    >({
      query: ({ appointmentId, minutes, method }) => ({
        url: `/appointments/${appointmentId}/reminders`,
        method: 'POST',
        body: {
          minutes,
          method,
        },
      }),
      invalidatesTags: (result, error, { appointmentId }) => [
        { type: 'AdoptionApplication', id: appointmentId },
      ],
    }),

    // Document Upload
    uploadApplicationDocument: builder.mutation<
      PetApiResponse<{ url: string; documentId: string; thumbnailUrl?: string }>,
      { 
        applicationId: string; 
        documentType: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        description?: string;
        fileData: string; // base64 encoded
      }
    >({
      query: ({ applicationId, documentType, fileName, fileSize, mimeType, description, fileData }) => ({
        url: `/adoption/applications/${applicationId}/documents`,
        method: 'POST',
        body: {
          documentType,
          fileName,
          fileSize,
          mimeType,
          description,
          fileData,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      invalidatesTags: (result, error, { applicationId }) => [
        { type: 'AdoptionApplication', id: applicationId },
      ],
    }),

    // Pet Photo Upload (for shelters)
    uploadPetPhoto: builder.mutation<
      PetApiResponse<{ url: string; photoId: string }>,
      { petId: string; file: FormData; caption?: string; isPrimary?: boolean }
    >({
      query: ({ petId, file, caption, isPrimary }) => ({
        url: `/pets/${petId}/photos`,
        method: 'POST',
        body: file,
        formData: true,
        headers: {
          ...(caption && { 'X-Photo-Caption': caption }),
          ...(isPrimary && { 'X-Photo-Primary': 'true' }),
        },
      }),
      invalidatesTags: (result, error, { petId }) => [
        { type: 'Pet', id: petId },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  // Pet Discovery
  useSearchPetsQuery,
  useLazySearchPetsQuery,
  useGetFeaturedPetsQuery,
  useGetPetByIdQuery,
  useGetPetsByIdsQuery,

  // Pet Favorites
  useGetUserFavoritesQuery,
  useAddPetToFavoritesMutation,
  useRemovePetFromFavoritesMutation,

  // Adoption Applications
  useGetUserApplicationsQuery,
  useGetApplicationByIdQuery,
  useCreateAdoptionApplicationMutation,
  useUpdateAdoptionApplicationMutation,
  useSubmitAdoptionApplicationMutation,

  // Draft Management
  useSyncApplicationDraftMutation,
  useGetApplicationDraftQuery,

  // Analytics & Tracking
  useTrackPetViewMutation,
  useTrackPetInteractionMutation,
  useTrackAnalyticsBatchMutation,
  useTrackAdoptionFunnelEventMutation,
  useTrackFormAnalyticsEventMutation,
  useTrackDocumentUploadEventMutation,
  useTrackSearchAnalyticsEventMutation,

  // Analytics Insights
  useGetAdoptionFunnelAnalyticsQuery,

  // Calendar & Appointments
  useGetShelterAvailabilityQuery,
  useScheduleAppointmentMutation,
  useGetUserAppointmentsQuery,
  useUpdateAppointmentStatusMutation,
  useRescheduleAppointmentMutation,
  useGetAppointmentByIdQuery,
  useAddAppointmentReminderMutation,

  // File Uploads
  useUploadApplicationDocumentMutation,
  useUploadPetPhotoMutation,
} = petApi;

// Export utility functions
export const {
  util: { invalidateTags, updateQueryData, prefetch },
} = petApi;

// Real-time update handlers for SignalR integration
export const handlePetStatusUpdate = (dispatch: AppDispatch, update: PetStatusUpdate) => {
  dispatch(
    petApi.util.updateQueryData('getPetById', update.petId, (draft) => {
      if (draft) {
        draft.status = update.status;
        draft.updatedAt = update.updatedAt;
      }
    })
  );
  
  // Also update search results if they exist
  dispatch(
    petApi.util.invalidateTags(['PetSearch'])
  );
};

export const handlePetAvailabilityUpdate = (dispatch: AppDispatch, update: PetAvailabilityUpdate) => {
  dispatch(
    petApi.util.updateQueryData('getPetById', update.petId, (draft) => {
      if (draft) {
        draft.status = update.available ? 'available' : 'unavailable';
        draft.updatedAt = update.updatedAt;
      }
    })
  );
  
  // Invalidate search and featured pets
  dispatch(
    petApi.util.invalidateTags(['PetSearch', 'Pet'])
  );
};

export default petApi;