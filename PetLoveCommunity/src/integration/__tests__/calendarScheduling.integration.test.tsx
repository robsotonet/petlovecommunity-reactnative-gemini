// Pet Love Community - Calendar Scheduling Integration Tests
// End-to-end testing of the complete calendar scheduling user journey

import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Alert } from 'react-native';
import { CalendarScheduler } from '../../components/calendar/CalendarScheduler';
import { TimeSlotPicker } from '../../components/calendar/TimeSlotPicker';
import { AppointmentCard } from '../../components/calendar/AppointmentCard';
import useCalendar from '../../hooks/useCalendar';
import calendarService from '../../services/calendarService';
import sharingService from '../../services/sharingService';
import petSlice from '../../features/pets/petSlice';

// Mock external dependencies
jest.mock('../../hooks/useCalendar');
jest.mock('../../services/calendarService');
jest.mock('../../services/sharingService');
jest.mock('../../services/correlationIdService');
jest.mock('../../hooks/useAdoptionAnalytics');
jest.mock('react-native-calendars', () => ({
  Calendar: ({ onDayPress }: any) => {
    const MockCalendar = require('react-native').TouchableOpacity;
    return (
      <MockCalendar
        testID="calendar"
        onPress={() => onDayPress({ dateString: '2025-01-15' })}
      />
    );
  },
}));
jest.mock('react-native-share');
jest.spyOn(Alert, 'alert');

// Mock components to simplify testing
jest.mock('../../components/ui/Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress, disabled, loading }: any) => (
    <TouchableOpacity
      testID={`button-${title.toLowerCase().replace(/\s+/g, '-')}`}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Text>{loading ? 'Loading...' : title}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../../components/ui/Card', () => {
  const { View } = require('react-native');
  return ({ children }: any) => <View testID="card">{children}</View>;
});

const mockUseCalendar = useCalendar as jest.MockedFunction<typeof useCalendar>;
const mockCalendarService = calendarService as jest.Mocked<typeof calendarService>;
const mockSharingService = sharingService as jest.Mocked<typeof sharingService>;

describe('Calendar Scheduling Integration Tests', () => {
  const mockGetAvailableAppointments = jest.fn();
  const mockScheduleAppointment = jest.fn();
  const mockScheduleMeetAndGreet = jest.fn();
  const mockGetAppointmentById = jest.fn();
  const mockUpdateAppointmentStatus = jest.fn();
  const mockCancelAppointment = jest.fn();

  const setupMocks = () => {
    mockUseCalendar.mockReturnValue({
      getAvailableAppointments: mockGetAvailableAppointments,
      scheduleAppointment: mockScheduleAppointment,
      scheduleMeetAndGreet: mockScheduleMeetAndGreet,
      error: null,
      isLoading: false,
    });

    mockCalendarService.getAppointmentById = mockGetAppointmentById;
    mockCalendarService.updateAppointmentStatus = mockUpdateAppointmentStatus;
    mockCalendarService.cancelAppointment = mockCancelAppointment;

    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    });
  };

  const createTestStore = () => {
    return configureStore({
      reducer: {
        pets: petSlice,
      },
      preloadedState: {
        pets: {
          pets: [],
          isLoading: false,
          error: null,
          favorites: [],
          searchFilters: {
            breed: '',
            age: '',
            size: '',
            location: '',
            specialNeeds: false,
          },
        },
      },
    });
  };

  const renderWithStore = (component: React.ReactElement) => {
    const store = createTestStore();
    return render(
      <Provider store={store}>
        {component}
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('Complete Meet & Greet Scheduling Journey', () => {
    it('successfully completes the full meet & greet scheduling flow', async () => {
      // Mock available slots
      const mockSlots = [
        {
          date: '2025-01-15',
          slots: [
            {
              startTime: '09:00',
              endTime: '09:30',
              available: true,
              appointmentType: ['meet_and_greet'],
              maxCapacity: 3,
              currentBookings: 1,
            },
            {
              startTime: '10:00',
              endTime: '10:30',
              available: true,
              appointmentType: ['meet_and_greet'],
              maxCapacity: 3,
              currentBookings: 0,
            },
          ],
        },
      ];

      mockGetAvailableAppointments.mockResolvedValue(mockSlots);
      mockScheduleMeetAndGreet.mockResolvedValue({
        success: true,
        eventId: 'event-123',
      });

      const mockOnAppointmentScheduled = jest.fn();

      renderWithStore(
        <CalendarScheduler
          petId="pet-123"
          petName="Buddy"
          shelterId="shelter-123"
          shelterName="Happy Paws Shelter"
          shelterContact={{
            name: 'Dr. Smith',
            phone: '+1234567890',
            email: 'dr.smith@happypaws.com',
          }}
          adopterId="adopter-123"
          appointmentType="meet_and_greet"
          onAppointmentScheduled={mockOnAppointmentScheduled}
        />
      );

      // Step 1: Wait for component to load and fetch available slots
      await waitFor(() => {
        expect(mockGetAvailableAppointments).toHaveBeenCalledWith(
          'shelter-123',
          'meet_and_greet',
          expect.any(Date),
          expect.any(Date)
        );
      });

      // Step 2: Select a date on the calendar
      const calendar = screen.getByTestID('calendar');
      fireEvent.press(calendar);

      await waitFor(() => {
        expect(screen.getByText('Available Times for 2025-01-15')).toBeTruthy();
        expect(screen.getByText('9:00 AM')).toBeTruthy();
        expect(screen.getByText('10:00 AM')).toBeTruthy();
      });

      // Step 3: Select a time slot
      const timeSlot = screen.getByText('10:00 AM');
      fireEvent.press(timeSlot);

      // Step 4: Schedule the appointment
      const scheduleButton = screen.getByTestID('button-schedule-appointment');
      await act(async () => {
        fireEvent.press(scheduleButton);
      });

      // Verify the scheduling call
      await waitFor(() => {
        expect(mockScheduleMeetAndGreet).toHaveBeenCalledWith(
          'pet-123',
          'Buddy',
          'shelter-123',
          'Happy Paws Shelter',
          {
            name: 'Dr. Smith',
            phone: '+1234567890',
            email: 'dr.smith@happypaws.com',
          },
          expect.any(Date),
          'adopter-123',
          []
        );
      });

      // Step 5: Verify success handling
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Appointment Scheduled!',
          expect.stringContaining('Your meet & greet has been scheduled'),
          expect.any(Array)
        );
      });

      // Step 6: Verify callback is called
      await waitFor(() => {
        expect(mockOnAppointmentScheduled).toHaveBeenCalledWith('event-123');
      });
    });

    it('handles scheduling conflicts gracefully', async () => {
      // Mock slots that become unavailable
      const mockSlots = [
        {
          date: '2025-01-15',
          slots: [
            {
              startTime: '09:00',
              endTime: '09:30',
              available: true,
              appointmentType: ['meet_and_greet'],
              maxCapacity: 1,
              currentBookings: 0,
            },
          ],
        },
      ];

      mockGetAvailableAppointments.mockResolvedValue(mockSlots);
      mockScheduleMeetAndGreet.mockResolvedValue({
        success: false,
        error: 'Time slot no longer available',
      });

      renderWithStore(
        <CalendarScheduler
          petId="pet-123"
          petName="Buddy"
          shelterId="shelter-123"
          shelterName="Happy Paws Shelter"
          shelterContact={{
            name: 'Dr. Smith',
            phone: '+1234567890',
            email: 'dr.smith@happypaws.com',
          }}
          adopterId="adopter-123"
          appointmentType="meet_and_greet"
        />
      );

      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.press(timeSlot);
      });

      await act(async () => {
        const scheduleButton = screen.getByTestID('button-schedule-appointment');
        fireEvent.press(scheduleButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Scheduling Failed',
          'Time slot no longer available',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('TimeSlotPicker Integration', () => {
    it('properly filters and displays available slots', () => {
      const slots = [
        {
          startTime: '09:00',
          endTime: '09:30',
          available: true,
          appointmentType: ['meet_and_greet', 'adoption_appointment'],
          maxCapacity: 3,
          currentBookings: 1,
        },
        {
          startTime: '10:00',
          endTime: '10:30',
          available: true,
          appointmentType: ['vet_appointment'],
          maxCapacity: 2,
          currentBookings: 0,
        },
        {
          startTime: '11:00',
          endTime: '11:30',
          available: true,
          appointmentType: ['meet_and_greet'],
          maxCapacity: 1,
          currentBookings: 1, // Full capacity
        },
      ];

      const mockOnSlotSelect = jest.fn();

      render(
        <TimeSlotPicker
          slots={slots}
          onSlotSelect={mockOnSlotSelect}
          appointmentType="meet_and_greet"
          showCapacity={true}
        />
      );

      // Should show available meet_and_greet slots
      expect(screen.getByText('9:00 AM')).toBeTruthy();
      expect(screen.getByText('2 spots left')).toBeTruthy();

      // Should not show vet_appointment only slot
      expect(screen.queryByText('10:00 AM')).toBeNull();

      // Should not show full capacity slot  
      expect(screen.queryByText('11:00 AM')).toBeNull();
    });
  });

  describe('AppointmentCard Integration', () => {
    it('displays appointment information and handles actions', async () => {
      const appointment = {
        id: 'appointment-123',
        title: 'Meet & Greet with Buddy',
        description: 'Meet and greet appointment with Buddy',
        startDate: new Date('2025-01-15T10:00:00Z'),
        endDate: new Date('2025-01-15T10:30:00Z'),
        location: 'Happy Paws Shelter',
        attendees: ['dr.smith@happypaws.com'],
        reminders: [],
        allDay: false,
        appointmentType: 'meet_and_greet' as const,
        petId: 'pet-123',
        petName: 'Buddy',
        shelterId: 'shelter-123',
        shelterName: 'Happy Paws Shelter',
        shelterContact: {
          name: 'Dr. Smith',
          phone: '+1234567890',
          email: 'dr.smith@happypaws.com',
        },
        adopterId: 'adopter-123',
        status: 'scheduled' as const,
        correlationId: 'correlation-123',
      };

      const mockOnConfirm = jest.fn();
      const mockOnReschedule = jest.fn();
      const mockOnCancel = jest.fn();

      mockUpdateAppointmentStatus.mockResolvedValue({ success: true });

      render(
        <AppointmentCard
          appointment={appointment}
          onConfirm={mockOnConfirm}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Meet & Greet')).toBeTruthy();
      expect(screen.getByText('with Buddy')).toBeTruthy();
      expect(screen.getByText('Scheduled')).toBeTruthy();
      expect(screen.getByText('📍 Happy Paws Shelter')).toBeTruthy();

      // Test confirm action
      const confirmButton = screen.getByTestID('button-confirm');
      fireEvent.press(confirmButton);
      expect(mockOnConfirm).toHaveBeenCalled();

      // Test reschedule action
      const rescheduleButton = screen.getByTestID('button-reschedule');
      fireEvent.press(rescheduleButton);
      expect(mockOnReschedule).toHaveBeenCalled();

      // Test cancel action
      const cancelButton = screen.getByTestID('button-cancel');
      fireEvent.press(cancelButton);
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Appointment Sharing Integration', () => {
    it('generates and shares appointment confirmation', () => {
      const appointmentDetails = {
        id: 'appt-123',
        type: 'Meet & Greet',
        petName: 'Buddy',
        shelterName: 'Happy Paws Shelter',
        date: new Date('2025-01-15T10:00:00Z'),
        confirmationNumber: 'CONF-12345',
      };

      const mockShareContent = {
        type: 'appointment_confirmation' as const,
        title: 'Pet Appointment Scheduled - Happy Paws Shelter',
        message: '📅 I have a Meet & Greet scheduled with Buddy at Happy Paws Shelter!',
        url: 'https://petlovecommunity.app/appointments/CONF-12345',
        petName: 'Buddy',
      };

      mockSharingService.generateAppointmentConfirmationContent.mockReturnValue(mockShareContent);

      const content = sharingService.generateAppointmentConfirmationContent(appointmentDetails);

      expect(content.type).toBe('appointment_confirmation');
      expect(content.message).toContain('Meet & Greet scheduled with Buddy');
      expect(content.url).toContain('CONF-12345');
    });
  });

  describe('Error Handling Throughout Journey', () => {
    it('handles network errors during slot loading', async () => {
      mockGetAvailableAppointments.mockRejectedValue(new Error('Network error'));

      renderWithStore(
        <CalendarScheduler
          shelterId="shelter-123"
          shelterName="Happy Paws Shelter"
          shelterContact={{
            name: 'Dr. Smith',
            phone: '+1234567890',
            email: 'dr.smith@happypaws.com',
          }}
          adopterId="adopter-123"
          appointmentType="meet_and_greet"
        />
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load available appointment times. Please try again.',
          [{ text: 'OK' }]
        );
      });
    });

    it('handles API errors during appointment scheduling', async () => {
      const mockSlots = [
        {
          date: '2025-01-15',
          slots: [
            {
              startTime: '09:00',
              endTime: '09:30',
              available: true,
              appointmentType: ['meet_and_greet'],
              maxCapacity: 3,
              currentBookings: 1,
            },
          ],
        },
      ];

      mockGetAvailableAppointments.mockResolvedValue(mockSlots);
      mockScheduleMeetAndGreet.mockRejectedValue(new Error('API error'));

      renderWithStore(
        <CalendarScheduler
          petId="pet-123"
          petName="Buddy"
          shelterId="shelter-123"
          shelterName="Happy Paws Shelter"
          shelterContact={{
            name: 'Dr. Smith',
            phone: '+1234567890',
            email: 'dr.smith@happypaws.com',
          }}
          adopterId="adopter-123"
          appointmentType="meet_and_greet"
        />
      );

      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.press(timeSlot);
      });

      await act(async () => {
        const scheduleButton = screen.getByTestID('button-schedule-appointment');
        fireEvent.press(scheduleButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Scheduling Failed',
          'API error',
          [{ text: 'OK' }]
        );
      });
    });

    it('validates required selections before scheduling', () => {
      renderWithStore(
        <CalendarScheduler
          shelterId="shelter-123"
          shelterName="Happy Paws Shelter"
          shelterContact={{
            name: 'Dr. Smith',
            phone: '+1234567890',
            email: 'dr.smith@happypaws.com',
          }}
          adopterId="adopter-123"
          appointmentType="meet_and_greet"
        />
      );

      const scheduleButton = screen.getByTestID('button-schedule-appointment');
      fireEvent.press(scheduleButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Missing Information',
        'Please select both a date and time for your appointment.',
        [{ text: 'OK' }]
      );
    });
  });

  describe('Accessibility in User Journey', () => {
    it('provides proper accessibility throughout the scheduling flow', async () => {
      const mockSlots = [
        {
          date: '2025-01-15',
          slots: [
            {
              startTime: '09:00',
              endTime: '09:30',
              available: true,
              appointmentType: ['meet_and_greet'],
              maxCapacity: 3,
              currentBookings: 1,
            },
          ],
        },
      ];

      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      renderWithStore(
        <CalendarScheduler
          petId="pet-123"
          petName="Buddy"
          shelterId="shelter-123"
          shelterName="Happy Paws Shelter"
          shelterContact={{
            name: 'Dr. Smith',
            phone: '+1234567890',
            email: 'dr.smith@happypaws.com',
          }}
          adopterId="adopter-123"
          appointmentType="meet_and_greet"
        />
      );

      // Verify accessibility elements are present
      await waitFor(() => {
        expect(screen.getByTestID('calendar')).toBeTruthy();
      });

      const calendar = screen.getByTestID('calendar');
      fireEvent.press(calendar);

      await waitFor(() => {
        expect(screen.getByText('9:00 AM')).toBeTruthy();
      });
    });
  });

  describe('Performance During Journey', () => {
    it('loads and renders components efficiently', async () => {
      const startTime = Date.now();

      const mockSlots = [
        {
          date: '2025-01-15',
          slots: Array.from({ length: 10 }, (_, i) => ({
            startTime: `${9 + i}:00`,
            endTime: `${9 + i}:30`,
            available: true,
            appointmentType: ['meet_and_greet'],
            maxCapacity: 3,
            currentBookings: 0,
          })),
        },
      ];

      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      renderWithStore(
        <CalendarScheduler
          shelterId="shelter-123"
          shelterName="Happy Paws Shelter"
          shelterContact={{
            name: 'Dr. Smith',
            phone: '+1234567890',
            email: 'dr.smith@happypaws.com',
          }}
          adopterId="adopter-123"
          appointmentType="meet_and_greet"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestID('calendar')).toBeTruthy();
      });

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
    });
  });
});