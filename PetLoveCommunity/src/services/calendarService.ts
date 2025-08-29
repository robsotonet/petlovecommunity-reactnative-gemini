// Pet Love Community - Calendar Service
// Native calendar integration for appointment scheduling with shelter visits, meet-and-greets, and adoption events

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';
import RNCalendarEvents, { Calendar } from 'react-native-calendar-events';
import correlationIdService from './correlationIdService';
import adoptionAnalyticsService from './adoptionAnalyticsService';

// Calendar event types specific to pet adoption
export type AppointmentType = 
  | 'meet_and_greet' 
  | 'shelter_visit' 
  | 'home_visit' 
  | 'adoption_appointment' 
  | 'follow_up' 
  | 'vet_appointment' 
  | 'training_session';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  attendees: string[];
  reminders: Array<{
    minutes: number;
    method: 'alert' | 'email' | 'sms';
  }>;
  allDay: boolean;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
  // Pet adoption specific fields
  appointmentType: AppointmentType;
  petId?: string;
  petName?: string;
  shelterId: string;
  shelterName: string;
  shelterContact: {
    name: string;
    phone: string;
    email: string;
  };
  applicationId?: string;
  adopterId: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  requirements?: string[];
  notes?: string;
  correlationId: string;
  nativeEventId?: string; // ID from the native calendar system
}

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;
  available: boolean;
  appointmentType: AppointmentType[];
  maxCapacity: number;
  currentBookings: number;
  specialRequirements?: string[];
}

export interface AvailableSlots {
  date: string; // YYYY-MM-DD format
  slots: TimeSlot[];
  notes?: string;
}

export interface ShelterAvailability {
  shelterId: string;
  shelterName: string;
  availableSlots: AvailableSlots[];
  blackoutDates: string[]; // YYYY-MM-DD format
  operatingHours: {
    [key: string]: { // day of week (monday, tuesday, etc.)
      open: string; // HH:MM
      close: string; // HH:MM
      closed?: boolean;
    };
  };
  appointmentDuration: {
    [K in AppointmentType]: number; // minutes
  };
  advanceBookingDays: number;
  timezone: string;
}

class CalendarService {
  private isInitialized = false;
  private hasCalendarPermission = false;
  private cachedEvents: CalendarEvent[] = [];
  private shelterAvailability: Record<string, ShelterAvailability> = {};
  private defaultCalendar: Calendar | null = null;

  private readonly STORAGE_KEYS = {
    CACHED_EVENTS: '@PetLoveCommunity:calendar_events',
    SHELTER_AVAILABILITY: '@PetLoveCommunity:shelter_availability',
    CALENDAR_SETTINGS: '@PetLoveCommunity:calendar_settings',
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request calendar permissions
      await this.requestCalendarPermissions();
      
      // Load cached data
      await this.loadCachedData();
      
      // Initialize native calendar integration
      if (this.hasCalendarPermission) {
        await this.initializeNativeCalendar();
      }

      this.isInitialized = true;
      console.log('Calendar service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize calendar service:', error);
      throw error;
    }
  }

  private async requestCalendarPermissions(): Promise<void> {
    try {
      // Get the appropriate calendar permission for the platform
      const calendarPermission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CALENDARS 
        : PERMISSIONS.ANDROID.READ_CALENDAR;
      
      const writeCalendarPermission = Platform.OS === 'android' 
        ? PERMISSIONS.ANDROID.WRITE_CALENDAR 
        : null;

      // Check current permission status
      const readResult = await check(calendarPermission);
      let writeResult = RESULTS.GRANTED; // iOS handles both read/write with single permission
      
      if (writeCalendarPermission) {
        writeResult = await check(writeCalendarPermission);
      }

      // Request permissions if not granted
      if (readResult !== RESULTS.GRANTED) {
        const readRequestResult = await request(calendarPermission);
        if (readRequestResult !== RESULTS.GRANTED) {
          this.hasCalendarPermission = false;
          this.showPermissionAlert();
          return;
        }
      }

      if (writeCalendarPermission && writeResult !== RESULTS.GRANTED) {
        const writeRequestResult = await request(writeCalendarPermission);
        if (writeRequestResult !== RESULTS.GRANTED) {
          this.hasCalendarPermission = false;
          this.showPermissionAlert();
          return;
        }
      }

      this.hasCalendarPermission = true;
      console.log('Calendar permissions granted successfully');
    } catch (error) {
      console.error('Failed to request calendar permissions:', error);
      this.hasCalendarPermission = false;
      this.showPermissionAlert();
    }
  }

  private showPermissionAlert(): void {
    Alert.alert(
      'Calendar Permission Required',
      'To schedule appointments and reminders, please allow calendar access in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            // Note: Opening settings would require additional package like react-native-settings
            // For now, we'll just show the message
            console.log('User should manually enable calendar permissions in device settings');
          }
        }
      ]
    );
  }

  private async loadCachedData(): Promise<void> {
    try {
      const [eventsData, availabilityData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.CACHED_EVENTS),
        AsyncStorage.getItem(this.STORAGE_KEYS.SHELTER_AVAILABILITY),
      ]);

      if (eventsData) {
        this.cachedEvents = JSON.parse(eventsData).map((event: any) => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
        }));
      }

      if (availabilityData) {
        this.shelterAvailability = JSON.parse(availabilityData);
      }
    } catch (error) {
      console.error('Failed to load cached calendar data:', error);
    }
  }

  private async persistCachedData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(
          this.STORAGE_KEYS.CACHED_EVENTS,
          JSON.stringify(this.cachedEvents)
        ),
        AsyncStorage.setItem(
          this.STORAGE_KEYS.SHELTER_AVAILABILITY,
          JSON.stringify(this.shelterAvailability)
        ),
      ]);
    } catch (error) {
      console.error('Failed to persist calendar data:', error);
    }
  }

  private async initializeNativeCalendar(): Promise<void> {
    try {
      if (!this.hasCalendarPermission) {
        console.log('Calendar permission not granted, skipping native calendar initialization');
        return;
      }

      // Fetch available calendars
      const calendars = await RNCalendarEvents.findCalendars();
      
      // Find the default calendar (usually the first writable one)
      this.defaultCalendar = calendars.find(cal => 
        cal.allowsModifications !== false && 
        (cal.type === 'local' || cal.type === 'calDAV' || cal.type === 'iCloud')
      ) || calendars[0] || null;

      if (!this.defaultCalendar) {
        console.warn('No suitable calendar found for Pet Love Community appointments');
        return;
      }

      console.log(`Native calendar integration initialized with calendar: ${this.defaultCalendar.title}`);
    } catch (error) {
      console.error('Failed to initialize native calendar:', error);
      this.defaultCalendar = null;
    }
  }

  // Appointment Scheduling
  async scheduleAppointment(appointmentData: Omit<CalendarEvent, 'id' | 'correlationId' | 'status'>): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
  }> {
    try {
      const correlationId = await correlationIdService.getCorrelationId();
      const eventId = `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const calendarEvent: CalendarEvent = {
        ...appointmentData,
        id: eventId,
        correlationId,
        status: 'scheduled',
      };

      // Validate appointment slot availability
      const isAvailable = await this.checkSlotAvailability(
        appointmentData.shelterId,
        appointmentData.startDate,
        appointmentData.appointmentType
      );

      if (!isAvailable) {
        return {
          success: false,
          error: 'Selected time slot is not available'
        };
      }

      // Add to device calendar if permission granted
      if (this.hasCalendarPermission) {
        await this.addToNativeCalendar(calendarEvent);
      }

      // Cache the event
      this.cachedEvents.push(calendarEvent);
      await this.persistCachedData();

      // Track analytics
      await adoptionAnalyticsService.trackEvent({
        eventType: 'offline_event',
        action: 'queue_event',
        queueSize: this.cachedEvents.length,
      });

      console.log(`Appointment scheduled: ${eventId}`);
      return {
        success: true,
        eventId,
      };

    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkSlotAvailability(
    shelterId: string,
    startDate: Date,
    appointmentType: AppointmentType
  ): Promise<boolean> {
    const availability = this.shelterAvailability[shelterId];
    if (!availability) {
      console.warn(`No availability data for shelter ${shelterId}`);
      return false;
    }

    const dateString = startDate.toISOString().split('T')[0];
    const timeString = startDate.toTimeString().substr(0, 5);

    // Check if date is blacklisted
    if (availability.blackoutDates.includes(dateString)) {
      return false;
    }

    // Find available slots for the date
    const daySlots = availability.availableSlots.find(slot => slot.date === dateString);
    if (!daySlots) {
      return false;
    }

    // Check if time slot is available for this appointment type
    const availableSlot = daySlots.slots.find(slot => 
      slot.startTime <= timeString && 
      slot.endTime > timeString &&
      slot.available &&
      slot.appointmentType.includes(appointmentType) &&
      slot.currentBookings < slot.maxCapacity
    );

    return !!availableSlot;
  }

  private async addToNativeCalendar(event: CalendarEvent): Promise<void> {
    try {
      if (!this.defaultCalendar || !this.hasCalendarPermission) {
        console.log('No calendar available or permission not granted, skipping native calendar event creation');
        return;
      }

      console.log(`Adding event to native calendar: ${event.title}`);
      
      const nativeEvent = {
        title: event.title,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.location,
        allDay: event.allDay || false,
        calendarId: this.defaultCalendar.id,
        alarms: event.reminders.map(reminder => ({
          date: new Date(event.startDate.getTime() - reminder.minutes * 60000).toISOString()
        })),
        notes: `Pet Love Community appointment\nCorrelation ID: ${event.correlationId}`,
      };

      const nativeEventId = await RNCalendarEvents.saveEvent(event.title, nativeEvent);
      console.log(`Event added to native calendar with ID: ${nativeEventId}`);
      
      // Store the native event ID for future reference
      event.nativeEventId = nativeEventId;
    } catch (error) {
      console.error('Failed to add event to native calendar:', error);
      // Don't throw error - we want the appointment to be saved even if native calendar fails
    }
  }

  // Get available appointments for a shelter
  async getAvailableAppointments(
    shelterId: string,
    appointmentType: AppointmentType,
    startDate: Date,
    endDate: Date
  ): Promise<AvailableSlots[]> {
    try {
      const availability = this.shelterAvailability[shelterId];
      if (!availability) {
        // Fetch from API if not cached
        await this.fetchShelterAvailability(shelterId);
      }

      const shelterData = this.shelterAvailability[shelterId];
      if (!shelterData) {
        return [];
      }

      // Filter available slots within date range
      const availableSlots = shelterData.availableSlots.filter(daySlot => {
        const slotDate = new Date(daySlot.date);
        return slotDate >= startDate && slotDate <= endDate;
      });

      // Filter slots by appointment type
      return availableSlots.map(daySlot => ({
        ...daySlot,
        slots: daySlot.slots.filter(slot => 
          slot.appointmentType.includes(appointmentType) && 
          slot.available &&
          slot.currentBookings < slot.maxCapacity
        ),
      })).filter(daySlot => daySlot.slots.length > 0);

    } catch (error) {
      console.error('Failed to get available appointments:', error);
      return [];
    }
  }

  private async fetchShelterAvailability(shelterId: string): Promise<void> {
    try {
      // This would fetch from your API
      // For now, we'll simulate with default availability
      const defaultAvailability: ShelterAvailability = {
        shelterId,
        shelterName: `Shelter ${shelterId}`,
        availableSlots: [],
        blackoutDates: [],
        operatingHours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
          wednesday: { open: '09:00', close: '17:00' },
          thursday: { open: '09:00', close: '17:00' },
          friday: { open: '09:00', close: '17:00' },
          saturday: { open: '10:00', close: '16:00' },
          sunday: { closed: true },
        },
        appointmentDuration: {
          meet_and_greet: 30,
          shelter_visit: 60,
          home_visit: 120,
          adoption_appointment: 45,
          follow_up: 30,
          vet_appointment: 60,
          training_session: 90,
        },
        advanceBookingDays: 30,
        timezone: 'America/New_York',
      };

      // Generate available slots for next 30 days
      const slots: AvailableSlots[] = [];
      for (let i = 1; i <= 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dayHours = defaultAvailability.operatingHours[dayName];

        if (!dayHours?.closed) {
          const timeSlots: TimeSlot[] = [];
          let currentTime = dayHours.open;

          while (currentTime < dayHours.close) {
            const [hours, minutes] = currentTime.split(':').map(Number);
            const endTime = new Date();
            endTime.setHours(hours, minutes + 60, 0, 0);
            
            timeSlots.push({
              startTime: currentTime,
              endTime: endTime.toTimeString().substr(0, 5),
              available: true,
              appointmentType: ['meet_and_greet', 'shelter_visit', 'adoption_appointment'],
              maxCapacity: 3,
              currentBookings: 0,
            });

            // Move to next hour
            const nextTime = new Date();
            nextTime.setHours(hours + 1, minutes, 0, 0);
            currentTime = nextTime.toTimeString().substr(0, 5);
          }

          slots.push({
            date: date.toISOString().split('T')[0],
            slots: timeSlots,
          });
        }
      }

      defaultAvailability.availableSlots = slots;
      this.shelterAvailability[shelterId] = defaultAvailability;
      await this.persistCachedData();

    } catch (error) {
      console.error('Failed to fetch shelter availability:', error);
    }
  }

  // Appointment Management
  async getUpcomingAppointments(limit: number = 10): Promise<CalendarEvent[]> {
    const now = new Date();
    return this.cachedEvents
      .filter(event => event.startDate >= now && event.status !== 'cancelled')
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, limit);
  }

  async getAppointmentById(eventId: string): Promise<CalendarEvent | null> {
    return this.cachedEvents.find(event => event.id === eventId) || null;
  }

  async updateAppointmentStatus(
    eventId: string, 
    status: CalendarEvent['status'],
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const eventIndex = this.cachedEvents.findIndex(event => event.id === eventId);
      if (eventIndex === -1) {
        return { success: false, error: 'Appointment not found' };
      }

      this.cachedEvents[eventIndex].status = status;
      if (notes) {
        this.cachedEvents[eventIndex].notes = notes;
      }

      await this.persistCachedData();

      console.log(`Appointment ${eventId} status updated to ${status}`);
      return { success: true };

    } catch (error) {
      console.error('Failed to update appointment status:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async cancelAppointment(eventId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.updateAppointmentStatus(eventId, 'cancelled', reason);
      
      if (result.success && this.hasCalendarPermission) {
        // Remove from native calendar
        await this.removeFromNativeCalendar(eventId);
      }

      return result;
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async removeFromNativeCalendar(eventId: string): Promise<void> {
    try {
      if (!this.hasCalendarPermission) {
        console.log('No calendar permission, skipping native calendar event removal');
        return;
      }

      // Find the event to get its native event ID
      const event = this.cachedEvents.find(e => e.id === eventId);
      if (!event || !event.nativeEventId) {
        console.log(`No native event ID found for event: ${eventId}`);
        return;
      }

      console.log(`Removing event from native calendar: ${eventId} (native ID: ${event.nativeEventId})`);
      await RNCalendarEvents.removeEvent(event.nativeEventId);
      console.log(`Event removed from native calendar successfully`);
    } catch (error) {
      console.error('Failed to remove event from native calendar:', error);
      // Don't throw error - we want the appointment cancellation to work even if native calendar fails
    }
  }

  // Calendar Utilities
  async addReminder(
    eventId: string, 
    minutes: number, 
    method: 'alert' | 'email' | 'sms' = 'alert'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const eventIndex = this.cachedEvents.findIndex(event => event.id === eventId);
      if (eventIndex === -1) {
        return { success: false, error: 'Appointment not found' };
      }

      this.cachedEvents[eventIndex].reminders.push({ minutes, method });
      await this.persistCachedData();

      // Update native calendar event if needed
      if (this.hasCalendarPermission) {
        await this.updateNativeCalendarEvent(this.cachedEvents[eventIndex]);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to add reminder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async updateNativeCalendarEvent(event: CalendarEvent): Promise<void> {
    try {
      if (!this.hasCalendarPermission || !this.defaultCalendar) {
        console.log('No calendar permission or calendar available, skipping native calendar update');
        return;
      }

      if (!event.nativeEventId) {
        console.log(`No native event ID for event ${event.id}, creating new native event`);
        await this.addToNativeCalendar(event);
        return;
      }

      console.log(`Updating native calendar event: ${event.id} (native ID: ${event.nativeEventId})`);

      const updatedNativeEvent = {
        id: event.nativeEventId,
        title: event.title,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.location,
        allDay: event.allDay || false,
        calendarId: this.defaultCalendar.id,
        alarms: event.reminders.map(reminder => ({
          date: new Date(event.startDate.getTime() - reminder.minutes * 60000).toISOString()
        })),
        notes: `Pet Love Community appointment\nCorrelation ID: ${event.correlationId}\nStatus: ${event.status}`,
      };

      await RNCalendarEvents.saveEvent(event.title, updatedNativeEvent);
      console.log(`Native calendar event updated successfully`);
    } catch (error) {
      console.error('Failed to update native calendar event:', error);
      // Don't throw error - we want the appointment update to work even if native calendar fails
    }
  }

  // Quick appointment generators
  async scheduleMeetAndGreet(
    petId: string,
    petName: string,
    shelterId: string,
    shelterName: string,
    shelterContact: CalendarEvent['shelterContact'],
    startDate: Date,
    adopterId: string,
    specialRequirements?: string[]
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 minutes

    return await this.scheduleAppointment({
      title: `Meet & Greet with ${petName}`,
      description: `Scheduled meet and greet session with ${petName} at ${shelterName}. This is an opportunity to interact with the pet and ask questions about their care needs.`,
      startDate,
      endDate,
      location: `${shelterName} - Meet & Greet Area`,
      attendees: [adopterId],
      reminders: [
        { minutes: 60, method: 'alert' },
        { minutes: 1440, method: 'alert' }, // 24 hours
      ],
      allDay: false,
      appointmentType: 'meet_and_greet',
      petId,
      petName,
      shelterId,
      shelterName,
      shelterContact,
      adopterId,
      requirements: specialRequirements,
    });
  }

  // Sync and cleanup
  async syncWithServer(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      // Sync pending appointments with server
      const pendingEvents = this.cachedEvents.filter(event => event.status === 'scheduled');
      
      for (const event of pendingEvents) {
        try {
          // This would sync with your API
          console.log(`Syncing appointment ${event.id} with server`);
          synced++;
        } catch (error) {
          console.error(`Failed to sync appointment ${event.id}:`, error);
          errors++;
        }
      }

      return { synced, errors };
    } catch (error) {
      console.error('Failed to sync calendar with server:', error);
      return { synced, errors: errors + 1 };
    }
  }

  async clearExpiredEvents(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const initialCount = this.cachedEvents.length;
    this.cachedEvents = this.cachedEvents.filter(event => event.endDate >= thirtyDaysAgo);
    
    const removedCount = initialCount - this.cachedEvents.length;
    
    if (removedCount > 0) {
      await this.persistCachedData();
    }

    return removedCount;
  }
}

// Export singleton instance
const calendarService = new CalendarService();
export default calendarService;