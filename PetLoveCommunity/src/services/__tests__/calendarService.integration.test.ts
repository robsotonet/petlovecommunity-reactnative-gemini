// Pet Love Community - Calendar Service Integration Tests
// Tests for native calendar integration, permissions, and cross-platform behavior

import calendarService from '../calendarService';
import { PERMISSIONS, RESULTS } from 'react-native-permissions';
import RNCalendarEvents from 'react-native-calendar-events';

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  PERMISSIONS: {
    IOS: {
      CALENDARS: 'ios.permission.CALENDARS',
    },
    ANDROID: {
      READ_CALENDAR: 'android.permission.READ_CALENDAR',
      WRITE_CALENDAR: 'android.permission.WRITE_CALENDAR',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
}));

// Mock react-native-calendar-events
jest.mock('react-native-calendar-events', () => ({
  findCalendars: jest.fn(),
  saveEvent: jest.fn(),
  removeEvent: jest.fn(),
}));

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock other services
jest.mock('../correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-id')),
}));

jest.mock('../adoptionAnalyticsService', () => ({
  trackDocumentAction: jest.fn(),
}));

describe('CalendarService Integration Tests', () => {
  const { check, request } = require('react-native-permissions');
  const mockRNCalendarEvents = RNCalendarEvents as jest.Mocked<typeof RNCalendarEvents>;
  
  const mockCalendars = [
    {
      id: 'calendar1',
      title: 'Personal',
      type: 'local',
      allowsModifications: true,
      color: '#FF0000',
    },
    {
      id: 'calendar2',
      title: 'Work',
      type: 'calDAV',
      allowsModifications: true,
      color: '#0000FF',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    check.mockResolvedValue(RESULTS.GRANTED);
    request.mockResolvedValue(RESULTS.GRANTED);
    mockRNCalendarEvents.findCalendars.mockResolvedValue(mockCalendars);
    mockRNCalendarEvents.saveEvent.mockResolvedValue('native-event-id-123');
    mockRNCalendarEvents.removeEvent.mockResolvedValue();
  });

  describe('Calendar Permission Management', () => {
    it('should successfully request and grant iOS calendar permissions', async () => {
      check.mockResolvedValue(RESULTS.DENIED);
      request.mockResolvedValue(RESULTS.GRANTED);

      const result = await calendarService.initialize();

      expect(check).toHaveBeenCalledWith(PERMISSIONS.IOS.CALENDARS);
      expect(request).toHaveBeenCalledWith(PERMISSIONS.IOS.CALENDARS);
      expect(result.success).toBe(true);
    });

    it('should handle denied permissions gracefully', async () => {
      check.mockResolvedValue(RESULTS.DENIED);
      request.mockResolvedValue(RESULTS.DENIED);

      const result = await calendarService.initialize();

      expect(result.success).toBe(true); // Service should still initialize
      // Note: Calendar integration will be disabled but service remains functional
    });

    it('should handle permission request errors', async () => {
      check.mockRejectedValue(new Error('Permission check failed'));

      const result = await calendarService.initialize();

      expect(result.success).toBe(true); // Should handle errors gracefully
    });
  });

  describe('Native Calendar Integration', () => {
    beforeEach(async () => {
      // Ensure service is initialized with permissions
      await calendarService.initialize();
    });

    it('should find and configure default calendar', async () => {
      expect(mockRNCalendarEvents.findCalendars).toHaveBeenCalled();
      // Calendar should be selected from available calendars
    });

    it('should create native calendar event when scheduling appointment', async () => {
      const appointmentData = {
        title: 'Meet & Greet with Fluffy',
        description: 'Meet and greet appointment with Fluffy',
        startDate: new Date('2025-08-28T14:00:00Z'),
        endDate: new Date('2025-08-28T14:30:00Z'),
        location: 'Happy Tails Shelter, 123 Main St, City, State',
        attendees: [],
        reminders: [{ minutes: 30, method: 'alert' as const }],
        allDay: false,
        appointmentType: 'meet_and_greet' as const,
        shelterId: 'shelter-123',
        shelterName: 'Happy Tails Shelter',
        shelterContact: {
          name: 'John Doe',
          phone: '555-0123',
          email: 'john@happytails.com',
        },
        adopterId: 'user-456',
      };

      const result = await calendarService.scheduleAppointment(appointmentData);

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(mockRNCalendarEvents.saveEvent).toHaveBeenCalledWith(
        appointmentData.title,
        expect.objectContaining({
          title: appointmentData.title,
          description: appointmentData.description,
          startDate: appointmentData.startDate.toISOString(),
          endDate: appointmentData.endDate.toISOString(),
          location: appointmentData.location,
          allDay: false,
          calendarId: mockCalendars[0].id,
          alarms: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
            }),
          ]),
          notes: expect.stringContaining('Pet Love Community appointment'),
        })
      );
    });

    it('should remove native calendar event when canceling appointment', async () => {
      // First schedule an appointment
      const appointmentData = {
        title: 'Test Appointment',
        description: 'Test appointment description',
        startDate: new Date('2025-08-28T15:00:00Z'),
        endDate: new Date('2025-08-28T15:30:00Z'),
        location: 'Test Location',
        attendees: [],
        reminders: [],
        allDay: false,
        appointmentType: 'meet_and_greet' as const,
        shelterId: 'shelter-123',
        shelterName: 'Test Shelter',
        shelterContact: {
          name: 'Test Contact',
          phone: '555-0123',
          email: 'test@test.com',
        },
        adopterId: 'user-456',
      };

      const scheduleResult = await calendarService.scheduleAppointment(appointmentData);
      expect(scheduleResult.success).toBe(true);

      // Then cancel it
      const cancelResult = await calendarService.cancelAppointment(
        scheduleResult.eventId!,
        'User requested cancellation'
      );

      expect(cancelResult.success).toBe(true);
      expect(mockRNCalendarEvents.removeEvent).toHaveBeenCalledWith('native-event-id-123');
    });

    it('should handle native calendar errors gracefully', async () => {
      mockRNCalendarEvents.saveEvent.mockRejectedValue(new Error('Native calendar error'));

      const appointmentData = {
        title: 'Test Appointment',
        description: 'Test appointment description',
        startDate: new Date('2025-08-28T16:00:00Z'),
        endDate: new Date('2025-08-28T16:30:00Z'),
        location: 'Test Location',
        attendees: [],
        reminders: [],
        allDay: false,
        appointmentType: 'meet_and_greet' as const,
        shelterId: 'shelter-123',
        shelterName: 'Test Shelter',
        shelterContact: {
          name: 'Test Contact',
          phone: '555-0123',
          email: 'test@test.com',
        },
        adopterId: 'user-456',
      };

      const result = await calendarService.scheduleAppointment(appointmentData);

      // Should still succeed even if native calendar fails
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
    });
  });

  describe('Calendar without Permissions', () => {
    beforeEach(() => {
      check.mockResolvedValue(RESULTS.DENIED);
      request.mockResolvedValue(RESULTS.DENIED);
    });

    it('should function without native calendar integration when permissions denied', async () => {
      await calendarService.initialize();

      const appointmentData = {
        title: 'No Permission Appointment',
        description: 'Test appointment without calendar permissions',
        startDate: new Date('2025-08-28T17:00:00Z'),
        endDate: new Date('2025-08-28T17:30:00Z'),
        location: 'Test Location',
        attendees: [],
        reminders: [],
        allDay: false,
        appointmentType: 'meet_and_greet' as const,
        shelterId: 'shelter-123',
        shelterName: 'Test Shelter',
        shelterContact: {
          name: 'Test Contact',
          phone: '555-0123',
          email: 'test@test.com',
        },
        adopterId: 'user-456',
      };

      const result = await calendarService.scheduleAppointment(appointmentData);

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      // Native calendar methods should not be called
      expect(mockRNCalendarEvents.saveEvent).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Platform Behavior', () => {
    it('should handle Android permissions correctly', async () => {
      // Mock Android platform
      jest.doMock('react-native', () => ({
        Platform: {
          OS: 'android',
        },
        Alert: {
          alert: jest.fn(),
        },
      }));

      check.mockResolvedValueOnce(RESULTS.DENIED); // READ_CALENDAR
      check.mockResolvedValueOnce(RESULTS.DENIED); // WRITE_CALENDAR
      request.mockResolvedValueOnce(RESULTS.GRANTED); // READ_CALENDAR
      request.mockResolvedValueOnce(RESULTS.GRANTED); // WRITE_CALENDAR

      const result = await calendarService.initialize();

      expect(check).toHaveBeenCalledTimes(2);
      expect(request).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });

  describe('Calendar Event Management', () => {
    beforeEach(async () => {
      await calendarService.initialize();
    });

    it('should retrieve upcoming appointments', async () => {
      // Schedule a test appointment first
      const appointmentData = {
        title: 'Upcoming Test Appointment',
        description: 'Test appointment for upcoming retrieval',
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date(Date.now() + 86400000 + 1800000), // Tomorrow + 30 min
        location: 'Test Location',
        attendees: [],
        reminders: [],
        allDay: false,
        appointmentType: 'meet_and_greet' as const,
        shelterId: 'shelter-123',
        shelterName: 'Test Shelter',
        shelterContact: {
          name: 'Test Contact',
          phone: '555-0123',
          email: 'test@test.com',
        },
        adopterId: 'user-456',
      };

      await calendarService.scheduleAppointment(appointmentData);

      const upcomingAppointments = await calendarService.getUpcomingAppointments('user-456');

      expect(upcomingAppointments.length).toBeGreaterThan(0);
      expect(upcomingAppointments[0].title).toBe(appointmentData.title);
    });

    it('should update appointment status and native calendar', async () => {
      // Schedule an appointment
      const appointmentData = {
        title: 'Appointment to Update',
        description: 'Test appointment for status update',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 86400000 + 1800000),
        location: 'Test Location',
        attendees: [],
        reminders: [],
        allDay: false,
        appointmentType: 'meet_and_greet' as const,
        shelterId: 'shelter-123',
        shelterName: 'Test Shelter',
        shelterContact: {
          name: 'Test Contact',
          phone: '555-0123',
          email: 'test@test.com',
        },
        adopterId: 'user-456',
      };

      const scheduleResult = await calendarService.scheduleAppointment(appointmentData);
      
      // Update the appointment status
      const updateResult = await calendarService.updateAppointmentStatus(
        scheduleResult.eventId!,
        'confirmed',
        'Appointment confirmed by shelter'
      );

      expect(updateResult.success).toBe(true);
      // Native calendar should be updated with new status
      expect(mockRNCalendarEvents.saveEvent).toHaveBeenCalledTimes(2); // Once for create, once for update
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle calendar initialization failure gracefully', async () => {
      mockRNCalendarEvents.findCalendars.mockRejectedValue(new Error('Calendar access failed'));

      const result = await calendarService.initialize();

      expect(result.success).toBe(true); // Should still initialize
      // Service should continue to work without native calendar
    });

    it('should handle missing calendar gracefully', async () => {
      mockRNCalendarEvents.findCalendars.mockResolvedValue([]); // No calendars available

      const result = await calendarService.initialize();

      expect(result.success).toBe(true);
      
      // Appointments should still work without native calendar
      const appointmentData = {
        title: 'No Calendar Test',
        description: 'Test with no native calendar',
        startDate: new Date('2025-08-28T18:00:00Z'),
        endDate: new Date('2025-08-28T18:30:00Z'),
        location: 'Test Location',
        attendees: [],
        reminders: [],
        allDay: false,
        appointmentType: 'meet_and_greet' as const,
        shelterId: 'shelter-123',
        shelterName: 'Test Shelter',
        shelterContact: {
          name: 'Test Contact',
          phone: '555-0123',
          email: 'test@test.com',
        },
        adopterId: 'user-456',
      };

      const appointmentResult = await calendarService.scheduleAppointment(appointmentData);
      expect(appointmentResult.success).toBe(true);
    });
  });
});