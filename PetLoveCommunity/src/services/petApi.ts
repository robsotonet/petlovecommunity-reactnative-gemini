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

    // Document Upload
    uploadApplicationDocument: builder.mutation<
      PetApiResponse<{ url: string; documentId: string }>,
      { applicationId: string; file: FormData; documentType: string }
    >({
      query: ({ applicationId, file, documentType }) => ({
        url: `/adoption/applications/${applicationId}/documents`,
        method: 'POST',
        body: file,
        formData: true,
        headers: {
          'X-Document-Type': documentType,
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

  // Analytics & Tracking
  useTrackPetViewMutation,
  useTrackPetInteractionMutation,

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