// Pet Love Community - Draft Sync Hook
// Custom hook for managing application draft synchronization with server

import { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { 
  selectDraftsNeedingSync,
  selectDraftsWithConflicts,
  selectSyncingSummary,
  selectIsOnline,
  setDraftSyncStatus,
  createDraftBackup,
  updateDraftFromServer,
  resolveDraftConflict,
} from '../features/pets/petSlice';
import { useSyncApplicationDraftMutation } from '../services/petApi';
import draftSyncService from '../services/draftSyncService';
import { AdoptionDraft } from '../features/pets/petSlice';
import type { AdoptionApplication } from '../types/pet';

export const useDraftSync = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [syncDraftMutation] = useSyncApplicationDraftMutation();
  
  const draftsNeedingSync = useSelector(selectDraftsNeedingSync);
  const draftsWithConflicts = useSelector(selectDraftsWithConflicts);
  const syncSummary = useSelector(selectSyncingSummary);
  const isOnline = useSelector(selectIsOnline);
  
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  // Initialize sync service
  const initializeSync = useCallback(async () => {
    if (isInitialized.current) return;
    
    try {
      await draftSyncService.initialize();
      isInitialized.current = true;
      
      // Set up automatic sync when online
      if (isOnline) {
        startAutoSync();
      }
    } catch (error) {
      console.error('Failed to initialize draft sync service:', error);
    }
  }, [isOnline]);

  // Start automatic sync timer
  const startAutoSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
    }
    
    syncTimerRef.current = setInterval(async () => {
      if (isOnline && draftsNeedingSync.length > 0) {
        await syncPendingDrafts();
      }
    }, 60000); // Sync every minute
  }, [isOnline, draftsNeedingSync.length]);

  // Stop automatic sync
  const stopAutoSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  // Sync individual draft
  const syncDraft = useCallback(async (draft: AdoptionDraft) => {
    if (!isOnline) {
      console.log('Cannot sync draft - offline');
      return { success: false, reason: 'offline' };
    }

    try {
      // Set syncing status
      dispatch(setDraftSyncStatus({ draftId: draft.id, status: 'syncing' }));

      // Create backup before sync
      dispatch(createDraftBackup({ draftId: draft.id }));

      // Perform sync via API
      const syncResult = await syncDraftMutation({
        draftId: draft.id,
        clientVersion: draft.version,
        formData: draft.formData,
        completionPercentage: draft.completionPercentage,
        currentStep: draft.currentStep,
        lastModified: draft.lastModified,
        changesSinceLastSync: draft.metadata.changesSinceLastSync,
      }).unwrap();

      // Update draft based on server response
      dispatch(updateDraftFromServer({
        draftId: draft.id,
        serverVersion: syncResult.data.serverVersion,
        conflictData: syncResult.data.conflictData,
        needsConflictResolution: syncResult.data.needsConflictResolution,
      }));

      // Update local draft sync service
      await draftSyncService.updateDraftSyncStatus(
        draft.id,
        syncResult.data.needsConflictResolution ? 'conflict' : 'synced'
      );

      return { 
        success: true, 
        needsConflictResolution: syncResult.data.needsConflictResolution 
      };

    } catch (error) {
      console.error('Draft sync failed:', error);
      
      // Set error status
      dispatch(setDraftSyncStatus({ draftId: draft.id, status: 'error' }));
      
      // Update local service
      await draftSyncService.updateDraftSyncStatus(draft.id, 'error');
      
      return { success: false, error };
    }
  }, [isOnline, dispatch, syncDraftMutation]);

  // Sync all pending drafts
  const syncPendingDrafts = useCallback(async () => {
    if (!isOnline || draftsNeedingSync.length === 0) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    const results = { synced: 0, failed: 0, conflicts: 0 };

    // Sync drafts one by one to avoid overwhelming the server
    for (const draft of draftsNeedingSync) {
      const result = await syncDraft(draft);
      
      if (result.success) {
        if (result.needsConflictResolution) {
          results.conflicts++;
        } else {
          results.synced++;
        }
      } else {
        results.failed++;
      }

      // Small delay between syncs
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }, [isOnline, draftsNeedingSync, syncDraft]);

  // Force sync specific draft
  const forceSyncDraft = useCallback(async (draftId: string) => {
    const draft = await draftSyncService.getDraft(draftId);
    if (draft) {
      return await syncDraft(draft);
    }
    return { success: false, reason: 'draft_not_found' };
  }, [syncDraft]);

  // Resolve conflict
  const resolveConflict = useCallback(async (
    draftId: string,
    resolution: 'use_local' | 'use_server' | 'merge',
    mergedData?: Partial<AdoptionApplication>
  ) => {
    try {
      // Resolve conflict in Redux store
      dispatch(resolveDraftConflict({
        draftId,
        resolution,
        mergedData,
      }));

      // Update local service
      await draftSyncService.updateDraftSyncStatus(draftId, 'local');

      // Trigger sync of resolved draft
      await forceSyncDraft(draftId);

      return { success: true };
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      return { success: false, error };
    }
  }, [dispatch, forceSyncDraft]);

  // Get conflict details for UI
  const getConflictDetails = useCallback((draftId: string) => {
    const conflictDraft = draftsWithConflicts.find(d => d.id === draftId);
    if (!conflictDraft) return null;

    return {
      localData: conflictDraft.formData,
      serverData: conflictDraft.conflictData,
      lastModified: conflictDraft.lastModified,
      serverVersion: conflictDraft.serverVersion,
      clientVersion: conflictDraft.version,
    };
  }, [draftsWithConflicts]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && isInitialized.current) {
      startAutoSync();
      // Trigger immediate sync of pending drafts
      setTimeout(() => syncPendingDrafts(), 1000);
    } else {
      stopAutoSync();
    }

    return () => stopAutoSync();
  }, [isOnline, startAutoSync, stopAutoSync, syncPendingDrafts]);

  // Initialize on mount
  useEffect(() => {
    initializeSync();
  }, [initializeSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoSync();
    };
  }, [stopAutoSync]);

  return {
    // State
    syncSummary,
    draftsNeedingSync,
    draftsWithConflicts,
    isOnline,
    
    // Actions
    syncDraft,
    syncPendingDrafts,
    forceSyncDraft,
    resolveConflict,
    getConflictDetails,
    
    // Control
    startAutoSync,
    stopAutoSync,
  };
};

export default useDraftSync;