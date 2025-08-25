// Pet Love Community - Calendar Hook
// Custom hook for calendar integration and appointment scheduling

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import calendarService, { 
  CalendarEvent, 
  AppointmentType, 
  AvailableSlots, 
  TimeSlot 
} from '../services/calendarService';
import { useSelector } from 'react-redux';
import { selectIsOnline } from '../features/pets/petSlice';
import useAdoptionAnalytics from './useAdoptionAnalytics';

interface UseCalendarOptions {
  autoSync?: boolean;
  syncInterval?: number; // minutes
}

interface AppointmentScheduleRequest {
  petId: string;
  petName: string;
  shelterId: string;
  shelterName: string;
  shelterContact: CalendarEvent['shelterContact'];
  appointmentType: AppointmentType;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  adopterId: string;
  specialRequirements?: string[];
  notes?: string;
}

export const useCalendar = (options: UseCalendarOptions = {}) => {
  const { autoSync = true, syncInterval = 30 } = options;
  
  const isOnline = useSelector(selectIsOnline);
  const { trackDocumentAction } = useAdoptionAnalytics();
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<CalendarEvent[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Initialize calendar service
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await calendarService.initialize();
      setIsInitialized(true);
      
      // Load initial data
      await loadUpcomingAppointments();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize calendar';
      setError(errorMessage);
      console.error('Calendar initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Load upcoming appointments
  const loadUpcomingAppointments = useCallback(async (limit = 10) => {
    try {
      const appointments = await calendarService.getUpcomingAppointments(limit);
      setUpcomingAppointments(appointments);
    } catch (err) {
      console.error('Failed to load upcoming appointments:', err);
    }
  }, []);

  // Get available time slots for a shelter
  const getAvailableSlots = useCallback(async (
    shelterId: string,
    appointmentType: AppointmentType,
    startDate: Date,
    endDate: Date
  ): Promise<AvailableSlots[]> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const slots = await calendarService.getAvailableAppointments(
        shelterId,
        appointmentType,
        startDate,
        endDate
      );
      
      setAvailableSlots(slots);
      return slots;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load available slots';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Schedule a new appointment
  const scheduleAppointment = useCallback(async (request: AppointmentScheduleRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate appointment duration based on type
      const durationMinutes = getAppointmentDuration(request.appointmentType);
      const endDate = new Date(request.selectedDate.getTime() + durationMinutes * 60000);

      // Generate appropriate title and description
      const { title, description } = generateAppointmentContent(
        request.appointmentType,
        request.petName,
        request.shelterName
      );

      const result = await calendarService.scheduleAppointment({
        title,
        description,
        startDate: request.selectedDate,
        endDate,
        location: `${request.shelterName}`,
        attendees: [request.adopterId],
        reminders: [
          { minutes: 60, method: 'alert' },
          { minutes: 1440, method: 'alert' }, // 24 hours
        ],
        allDay: false,
        appointmentType: request.appointmentType,
        petId: request.petId,
        petName: request.petName,
        shelterId: request.shelterId,
        shelterName: request.shelterName,
        shelterContact: request.shelterContact,
        adopterId: request.adopterId,
        requirements: request.specialRequirements,
        notes: request.notes,
      });

      if (result.success) {
        // Refresh appointments list
        await loadUpcomingAppointments();
        
        // Track analytics
        await trackDocumentAction(
          'calendar_appointment',
          request.shelterId,
          'upload_success',
          { 
            method: 'calendar',
            fileType: request.appointmentType,
          }
        );

        Alert.alert(
          'Appointment Scheduled',
          `Your ${getAppointmentTypeName(request.appointmentType)} with ${request.petName} has been scheduled for ${request.selectedDate.toLocaleDateString()} at ${request.selectedDate.toLocaleTimeString()}.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(result.error || 'Failed to schedule appointment');
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule appointment';
      setError(errorMessage);
      
      Alert.alert(
        'Scheduling Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [loadUpcomingAppointments, trackDocumentAction]);

  // Quick meet-and-greet scheduling
  const scheduleMeetAndGreet = useCallback(async (
    petId: string,
    petName: string,
    shelterId: string,
    shelterName: string,
    shelterContact: CalendarEvent['shelterContact'],
    selectedDate: Date,
    adopterId: string,
    specialRequirements?: string[]
  ) => {
    try {
      const result = await calendarService.scheduleMeetAndGreet(
        petId,
        petName,
        shelterId,
        shelterName,
        shelterContact,
        selectedDate,
        adopterId,
        specialRequirements
      );

      if (result.success) {
        await loadUpcomingAppointments();
        
        Alert.alert(
          'Meet & Greet Scheduled!',
          `Your meet and greet with ${petName} has been scheduled for ${selectedDate.toLocaleDateString()} at ${selectedDate.toLocaleTimeString()}.`,
          [{ text: 'Great!' }]
        );
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule meet and greet';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadUpcomingAppointments]);

  // Update appointment status
  const updateAppointmentStatus = useCallback(async (
    eventId: string, 
    status: CalendarEvent['status'],
    notes?: string
  ) => {
    try {
      const result = await calendarService.updateAppointmentStatus(eventId, status, notes);
      
      if (result.success) {
        await loadUpcomingAppointments();
        
        const statusMessages = {
          confirmed: 'Appointment confirmed',
          cancelled: 'Appointment cancelled',
          completed: 'Appointment completed',
          no_show: 'Appointment marked as no-show',
        };
        
        if (status !== 'scheduled') {
          Alert.alert(
            'Appointment Updated',
            statusMessages[status] || 'Appointment status updated',
            [{ text: 'OK' }]
          );
        }
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update appointment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadUpcomingAppointments]);

  // Cancel appointment
  const cancelAppointment = useCallback(async (eventId: string, reason?: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      Alert.alert(
        'Cancel Appointment',
        'Are you sure you want to cancel this appointment?',
        [
          { text: 'No', style: 'cancel', onPress: () => resolve({ success: false }) },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await calendarService.cancelAppointment(eventId, reason);
                if (result.success) {
                  await loadUpcomingAppointments();
                }
                resolve(result);
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to cancel appointment';
                resolve({ success: false, error: errorMessage });
              }
            }
          }
        ]
      );
    });
  }, [loadUpcomingAppointments]);

  // Add reminder to appointment
  const addReminder = useCallback(async (
    eventId: string,
    minutes: number,
    method: 'alert' | 'email' | 'sms' = 'alert'
  ) => {
    try {
      const result = await calendarService.addReminder(eventId, minutes, method);
      
      if (result.success) {
        await loadUpcomingAppointments();
        Alert.alert(
          'Reminder Added',
          `You'll be reminded ${minutes} minutes before your appointment.`,
          [{ text: 'OK' }]
        );
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add reminder';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadUpcomingAppointments]);

  // Sync with server
  const syncCalendar = useCallback(async () => {
    if (!isOnline) {
      setError('Cannot sync calendar while offline');
      return { synced: 0, errors: 1 };
    }

    try {
      setIsLoading(true);
      const result = await calendarService.syncWithServer();
      setLastSyncTime(new Date());
      
      if (result.synced > 0) {
        await loadUpcomingAppointments();
      }
      
      return result;
    } catch (err) {
      console.error('Calendar sync failed:', err);
      return { synced: 0, errors: 1 };
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, loadUpcomingAppointments]);

  // Auto-sync effect
  useEffect(() => {
    if (!autoSync || !isInitialized || !isOnline) return;

    const syncTimer = setInterval(syncCalendar, syncInterval * 60 * 1000);
    return () => clearInterval(syncTimer);
  }, [autoSync, isInitialized, isOnline, syncInterval, syncCalendar]);

  // Cleanup expired events
  const cleanupExpiredEvents = useCallback(async () => {
    try {
      const removedCount = await calendarService.clearExpiredEvents();
      if (removedCount > 0) {
        await loadUpcomingAppointments();
        console.log(`Cleaned up ${removedCount} expired calendar events`);
      }
      return removedCount;
    } catch (err) {
      console.error('Failed to cleanup expired events:', err);
      return 0;
    }
  }, [loadUpcomingAppointments]);

  // Get specific appointment
  const getAppointment = useCallback(async (eventId: string) => {
    try {
      return await calendarService.getAppointmentById(eventId);
    } catch (err) {
      console.error('Failed to get appointment:', err);
      return null;
    }
  }, []);

  // Filter appointments by type
  const getAppointmentsByType = useCallback((type: AppointmentType) => {
    return upcomingAppointments.filter(appointment => appointment.appointmentType === type);
  }, [upcomingAppointments]);

  // Get appointments for a specific pet
  const getAppointmentsByPet = useCallback((petId: string) => {
    return upcomingAppointments.filter(appointment => appointment.petId === petId);
  }, [upcomingAppointments]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    upcomingAppointments,
    availableSlots,
    lastSyncTime,
    
    // Actions
    initialize,
    getAvailableSlots,
    scheduleAppointment,
    scheduleMeetAndGreet,
    updateAppointmentStatus,
    cancelAppointment,
    addReminder,
    syncCalendar,
    cleanupExpiredEvents,
    
    // Queries
    getAppointment,
    getAppointmentsByType,
    getAppointmentsByPet,
    loadUpcomingAppointments,
    
    // Utils
    clearError: () => setError(null),
  };
};

// Helper functions
function getAppointmentDuration(type: AppointmentType): number {
  const durations = {
    meet_and_greet: 30,
    shelter_visit: 60,
    home_visit: 120,
    adoption_appointment: 45,
    follow_up: 30,
    vet_appointment: 60,
    training_session: 90,
  };
  
  return durations[type] || 30;
}

function generateAppointmentContent(type: AppointmentType, petName: string, shelterName: string) {
  const templates = {
    meet_and_greet: {
      title: `Meet & Greet with ${petName}`,
      description: `Scheduled meet and greet session with ${petName} at ${shelterName}. This is an opportunity to interact with the pet and ask questions about their care needs.`
    },
    shelter_visit: {
      title: `Visit ${shelterName}`,
      description: `Visit to ${shelterName} to learn more about ${petName} and the adoption process.`
    },
    home_visit: {
      title: `Home Visit for ${petName} Adoption`,
      description: `Home visit from ${shelterName} staff to assess suitability for ${petName}'s adoption.`
    },
    adoption_appointment: {
      title: `${petName} Adoption Appointment`,
      description: `Final adoption appointment for ${petName} at ${shelterName}. Please bring required documentation and identification.`
    },
    follow_up: {
      title: `Follow-up for ${petName}`,
      description: `Follow-up appointment regarding ${petName}'s adoption process.`
    },
    vet_appointment: {
      title: `Vet Appointment for ${petName}`,
      description: `Veterinary appointment for ${petName}. Please bring vaccination records and any relevant medical information.`
    },
    training_session: {
      title: `Training Session for ${petName}`,
      description: `Training session to help you and ${petName} build a strong relationship and address any behavioral needs.`
    },
  };
  
  return templates[type] || templates.meet_and_greet;
}

function getAppointmentTypeName(type: AppointmentType): string {
  const names = {
    meet_and_greet: 'meet and greet',
    shelter_visit: 'shelter visit',
    home_visit: 'home visit',
    adoption_appointment: 'adoption appointment',
    follow_up: 'follow-up appointment',
    vet_appointment: 'veterinary appointment',
    training_session: 'training session',
  };
  
  return names[type] || 'appointment';
}

export default useCalendar;