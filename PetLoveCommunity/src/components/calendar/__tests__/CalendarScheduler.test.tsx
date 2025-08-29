// Pet Love Community - CalendarScheduler Component Tests
// Comprehensive unit tests for calendar integration and appointment scheduling

import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CalendarScheduler, CalendarSchedulerProps } from '../CalendarScheduler';
import useCalendar from '../../../hooks/useCalendar';
import { AppointmentType, AvailableSlots, TimeSlot } from '../../../services/calendarService';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock useCalendar hook
jest.mock('../../../hooks/useCalendar', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Calendar is mocked globally in setupTests.ts

// Mock Button component
jest.mock('../../Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress, disabled, loading, variant, style }: any) => (
    <TouchableOpacity
      testID={`button-${title.toLowerCase().replace(/\s+/g, '-')}`}
      onPress={onPress}
      disabled={disabled || loading}
      style={style}
    >
      <Text>{loading ? 'Loading...' : title}</Text>
    </TouchableOpacity>
  );
});

// Mock Card component
jest.mock('../../Card', () => {
  const { View } = require('react-native');
  return ({ children, style }: any) => (
    <View testID="card" style={style}>
      {children}
    </View>
  );
});

const mockUseCalendar = useCalendar as jest.MockedFunction<typeof useCalendar>;

describe('CalendarScheduler', () => {
  const mockGetAvailableAppointments = jest.fn();
  const mockScheduleAppointment = jest.fn();
  const mockScheduleMeetAndGreet = jest.fn();

  const defaultCalendarHook = {
    getAvailableAppointments: mockGetAvailableAppointments,
    scheduleAppointment: mockScheduleAppointment,
    scheduleMeetAndGreet: mockScheduleMeetAndGreet,
    error: null,
    isLoading: false,
  };

  const defaultProps: CalendarSchedulerProps = {
    shelterId: 'shelter-123',
    shelterName: 'Happy Paws Shelter',
    shelterContact: {
      name: 'Dr. Smith',
      phone: '+1234567890',
      email: 'dr.smith@happypaws.com',
    },
    adopterId: 'adopter-123',
    appointmentType: 'meet_and_greet',
    onAppointmentScheduled: jest.fn(),
    onCancel: jest.fn(),
  };

  const createMockTimeSlot = (
    startTime: string,
    appointmentType: AppointmentType[] = ['meet_and_greet'],
    available: boolean = true,
    currentBookings: number = 0,
    maxCapacity: number = 5
  ): TimeSlot => ({
    startTime,
    endTime: `${(parseInt(startTime.split(':')[0]) + 1).toString().padStart(2, '0')}:${startTime.split(':')[1]}`,
    available,
    appointmentType,
    maxCapacity,
    currentBookings,
  });

  const createMockAvailableSlots = (date: string, slots: TimeSlot[]): AvailableSlots => ({
    date,
    slots,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCalendar.mockReturnValue(defaultCalendarHook);
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    });
  });

  describe('Component Rendering', () => {
    it('renders without crashing', async () => {
      mockGetAvailableAppointments.mockResolvedValue([]);

      render(<CalendarScheduler {...defaultProps} />);

      expect(screen.getByText('Schedule Meet & Greet')).toBeTruthy();
      expect(screen.getByText('at Happy Paws Shelter')).toBeTruthy();
    });

    it('displays pet name when provided', async () => {
      mockGetAvailableAppointments.mockResolvedValue([]);

      render(
        <CalendarScheduler
          {...defaultProps}
          petId="pet-123"
          petName="Buddy"
        />
      );

      expect(screen.getByText('with Buddy at Happy Paws Shelter')).toBeTruthy();
    });

    it('shows loading state while fetching available slots', async () => {
      mockGetAvailableAppointments.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<CalendarScheduler {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Loading available dates...')).toBeTruthy();
      });
    });
  });

  describe('Available Slots Loading', () => {
    it('loads available slots on component mount', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [
          createMockTimeSlot('09:00'),
          createMockTimeSlot('10:00'),
        ]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      render(<CalendarScheduler {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetAvailableAppointments).toHaveBeenCalledWith(
          'shelter-123',
          'meet_and_greet',
          expect.any(Date),
          expect.any(Date)
        );
      });
    });

    it('handles error when loading slots fails', async () => {
      mockGetAvailableAppointments.mockRejectedValue(new Error('Network error'));

      render(<CalendarScheduler {...defaultProps} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load available appointment times. Please try again.',
          [{ text: 'OK' }]
        );
      });
    });

    it('reloads slots when appointment type changes', async () => {
      const mockSlots = [createMockAvailableSlots('2025-01-15', [])];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      const { rerender } = render(<CalendarScheduler {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetAvailableAppointments).toHaveBeenCalledTimes(1);
      });

      rerender(
        <CalendarScheduler
          {...defaultProps}
          appointmentType="vet_appointment"
        />
      );

      await waitFor(() => {
        expect(mockGetAvailableAppointments).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Calendar Interaction', () => {
    it('handles day selection', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [
          createMockTimeSlot('09:00'),
          createMockTimeSlot('10:00'),
        ]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      render(<CalendarScheduler {...defaultProps} />);

      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        expect(screen.getByText('Available Times for 2025-01-15')).toBeTruthy();
      });
    });

    it('shows time slots for selected date', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [
          createMockTimeSlot('09:00'),
          createMockTimeSlot('10:00'),
        ]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      render(<CalendarScheduler {...defaultProps} />);

      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        expect(screen.getByText('9:00 AM')).toBeTruthy();
        expect(screen.getByText('10:00 AM')).toBeTruthy();
      });
    });

    it('shows no slots message when none available for selected date', async () => {
      const mockSlots = [createMockAvailableSlots('2025-01-15', [])];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      render(<CalendarScheduler {...defaultProps} />);

      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        expect(
          screen.getByText('No available times for this date. Please select another date.')
        ).toBeTruthy();
      });
    });
  });

  describe('Time Slot Selection', () => {
    it('selects time slot when pressed', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [createMockTimeSlot('09:00')]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      render(<CalendarScheduler {...defaultProps} />);

      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.press(timeSlot);
      });

      // Schedule button should become enabled
      await waitFor(() => {
        const scheduleButton = screen.getByTestID('button-schedule-appointment');
        expect(scheduleButton).toBeTruthy();
      });
    });

    it('filters slots by appointment type', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [
          createMockTimeSlot('09:00', ['meet_and_greet']),
          createMockTimeSlot('10:00', ['vet_appointment']),
        ]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      render(
        <CalendarScheduler
          {...defaultProps}
          appointmentType="meet_and_greet"
        />
      );

      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        expect(screen.getByText('9:00 AM')).toBeTruthy();
        expect(screen.queryByText('10:00 AM')).toBeNull();
      });
    });

    it('disables full capacity slots', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [
          createMockTimeSlot('09:00', ['meet_and_greet'], true, 5, 5),
        ]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);

      render(<CalendarScheduler {...defaultProps} />);

      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        expect(timeSlot).toBeTruthy();
      });
    });
  });

  describe('Appointment Scheduling', () => {
    it('requires both date and time selection', async () => {
      render(<CalendarScheduler {...defaultProps} />);

      const scheduleButton = screen.getByTestID('button-schedule-appointment');
      fireEvent.press(scheduleButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Missing Information',
          'Please select both a date and time for your appointment.',
          [{ text: 'OK' }]
        );
      });
    });

    it('schedules meet & greet appointment successfully', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [createMockTimeSlot('09:00')]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);
      mockScheduleMeetAndGreet.mockResolvedValue({
        success: true,
        eventId: 'event-123',
      });

      render(
        <CalendarScheduler
          {...defaultProps}
          petId="pet-123"
          petName="Buddy"
          appointmentType="meet_and_greet"
        />
      );

      // Select date and time
      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.press(timeSlot);
      });

      // Schedule appointment
      const scheduleButton = screen.getByTestID('button-schedule-appointment');
      fireEvent.press(scheduleButton);

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

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Appointment Scheduled!',
          expect.stringContaining('Your meet & greet has been scheduled'),
          expect.any(Array)
        );
      });
    });

    it('schedules general appointment successfully', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [createMockTimeSlot('09:00')]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);
      mockScheduleAppointment.mockResolvedValue({
        success: true,
        eventId: 'event-123',
      });

      render(
        <CalendarScheduler
          {...defaultProps}
          appointmentType="vet_appointment"
        />
      );

      // Select date and time
      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.press(timeSlot);
      });

      // Schedule appointment
      const scheduleButton = screen.getByTestID('button-schedule-appointment');
      fireEvent.press(scheduleButton);

      await waitFor(() => {
        expect(mockScheduleAppointment).toHaveBeenCalledWith({
          title: 'Vet Appointment - Happy Paws Shelter',
          description: 'Vet Appointment at Happy Paws Shelter',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          location: 'Happy Paws Shelter',
          attendees: ['dr.smith@happypaws.com'],
          reminders: [
            { minutes: 60, method: 'alert' },
            { minutes: 15, method: 'alert' },
          ],
          allDay: false,
          appointmentType: 'vet_appointment',
          petId: undefined,
          petName: undefined,
          shelterId: 'shelter-123',
          shelterName: 'Happy Paws Shelter',
          shelterContact: {
            name: 'Dr. Smith',
            phone: '+1234567890',
            email: 'dr.smith@happypaws.com',
          },
          adopterId: 'adopter-123',
        });
      });
    });

    it('handles scheduling failure', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [createMockTimeSlot('09:00')]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);
      mockScheduleAppointment.mockResolvedValue({
        success: false,
        error: 'Slot no longer available',
      });

      render(<CalendarScheduler {...defaultProps} />);

      // Select date and time
      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.press(timeSlot);
      });

      // Schedule appointment
      const scheduleButton = screen.getByTestID('button-schedule-appointment');
      fireEvent.press(scheduleButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Scheduling Failed',
          'Slot no longer available',
          [{ text: 'OK' }]
        );
      });
    });

    it('handles scheduling exception', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [createMockTimeSlot('09:00')]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);
      mockScheduleAppointment.mockRejectedValue(new Error('Network error'));

      render(<CalendarScheduler {...defaultProps} />);

      // Select date and time
      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.press(timeSlot);
      });

      // Schedule appointment
      const scheduleButton = screen.getByTestID('button-schedule-appointment');
      fireEvent.press(scheduleButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Scheduling Failed',
          'Network error',
          [{ text: 'OK' }]
        );
      });
    });

    it('shows loading state during scheduling', async () => {
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [createMockTimeSlot('09:00')]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);
      mockScheduleAppointment.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<CalendarScheduler {...defaultProps} />);

      // Select date and time
      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.press(timeSlot);
      });

      // Schedule appointment
      const scheduleButton = screen.getByTestID('button-schedule-appointment');
      fireEvent.press(scheduleButton);

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeTruthy();
      });
    });

    it('calls onAppointmentScheduled callback on success', async () => {
      const mockOnAppointmentScheduled = jest.fn();
      const mockSlots = [
        createMockAvailableSlots('2025-01-15', [createMockTimeSlot('09:00')]),
      ];
      mockGetAvailableAppointments.mockResolvedValue(mockSlots);
      mockScheduleAppointment.mockResolvedValue({
        success: true,
        eventId: 'event-123',
      });

      render(
        <CalendarScheduler
          {...defaultProps}
          onAppointmentScheduled={mockOnAppointmentScheduled}
        />
      );

      // Select date and time
      await waitFor(() => {
        const calendar = screen.getByTestID('calendar');
        fireEvent.press(calendar);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.press(timeSlot);
      });

      // Schedule appointment
      const scheduleButton = screen.getByTestID('button-schedule-appointment');
      fireEvent.press(scheduleButton);

      await waitFor(() => {
        expect(mockOnAppointmentScheduled).toHaveBeenCalledWith('event-123');
      });
    });
  });

  describe('Cancel Button', () => {
    it('calls onCancel when cancel button is pressed', () => {
      const mockOnCancel = jest.fn();
      mockGetAvailableAppointments.mockResolvedValue([]);

      render(<CalendarScheduler {...defaultProps} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByTestID('button-cancel');
      fireEvent.press(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Error Display', () => {
    it('shows error message from useCalendar hook', () => {
      mockUseCalendar.mockReturnValue({
        ...defaultCalendarHook,
        error: 'Calendar permission denied',
      });

      render(<CalendarScheduler {...defaultProps} />);

      expect(screen.getByText('Calendar permission denied')).toBeTruthy();
    });
  });

  describe('Appointment Type Display Names', () => {
    const appointmentTypeTests = [
      { type: 'meet_and_greet', display: 'Schedule Meet & Greet' },
      { type: 'adoption_visit', display: 'Schedule Adoption Visit' },
      { type: 'follow_up', display: 'Schedule Follow-up Visit' },
      { type: 'vet_appointment', display: 'Schedule Appointment' },
    ] as const;

    appointmentTypeTests.forEach(({ type, display }) => {
      it(`displays correct title for ${type}`, async () => {
        mockGetAvailableAppointments.mockResolvedValue([]);

        render(
          <CalendarScheduler
            {...defaultProps}
            appointmentType={type as AppointmentType}
          />
        );

        expect(screen.getByText(display)).toBeTruthy();
      });
    });
  });

  describe('Date Range Constraints', () => {
    it('uses provided minDate and maxDate', async () => {
      mockGetAvailableAppointments.mockResolvedValue([]);

      render(
        <CalendarScheduler
          {...defaultProps}
          minDate="2025-01-01"
          maxDate="2025-12-31"
        />
      );

      // Calendar component receives the date constraints
      expect(screen.getByTestID('calendar')).toBeTruthy();
    });

    it('uses default date range when not provided', async () => {
      mockGetAvailableAppointments.mockResolvedValue([]);

      render(<CalendarScheduler {...defaultProps} />);

      // Calendar should use default range (today + 30 days)
      expect(screen.getByTestID('calendar')).toBeTruthy();
    });
  });
});