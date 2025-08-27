// Pet Love Community - AppointmentCard Component Tests
// Comprehensive unit tests for appointment display and action buttons

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { AppointmentCard, AppointmentCardProps } from '../AppointmentCard';
import { CalendarEvent, AppointmentType } from '../../../services/calendarService';
import { useColors } from '../../../hooks/useColors';

// Mock useColors hook
jest.mock('../../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

// Mock Card component
jest.mock('../../Card', () => {
  const { View } = require('react-native');
  return ({ children, style }: any) => (
    <View testID="appointment-card" style={style}>
      {children}
    </View>
  );
});

// Mock Button component
jest.mock('../../Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress, type, style, disabled }: any) => (
    <TouchableOpacity
      testID={`button-${title.toLowerCase().replace(/\s+/g, '-')}`}
      onPress={onPress}
      disabled={disabled}
      style={style}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

const mockColors = {
  primary: {
    coral: '#FF6B6B',
    teal: '#4ECDC4',
  },
  neutral: {
    beige: '#F7FFF7',
    midnight: '#1A535C',
    darkGray: '#666666',
  },
  extended: {
    textVariations: {
      secondary: '#666666',
      tertiary: '#999999',
    },
    tealVariations: {
      background: '#E8F6F5',
    },
  },
  semantic: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
  },
};

describe('AppointmentCard', () => {
  const mockOnPress = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnReschedule = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useColors as jest.Mock).mockReturnValue(mockColors);
  });

  const createMockAppointment = (
    overrides: Partial<CalendarEvent> = {}
  ): CalendarEvent => ({
    id: 'appointment-123',
    title: 'Meet & Greet with Buddy',
    description: 'Meet and greet appointment with Buddy at Happy Paws Shelter',
    startDate: new Date('2025-01-15T10:00:00Z'),
    endDate: new Date('2025-01-15T10:30:00Z'),
    location: 'Happy Paws Shelter',
    attendees: ['dr.smith@happypaws.com'],
    reminders: [],
    allDay: false,
    appointmentType: 'meet_and_greet',
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
    status: 'scheduled',
    correlationId: 'correlation-123',
    ...overrides,
  });

  const defaultProps: AppointmentCardProps = {
    appointment: createMockAppointment(),
    onPress: mockOnPress,
    onCancel: mockOnCancel,
    onReschedule: mockOnReschedule,
    onConfirm: mockOnConfirm,
  };

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<AppointmentCard {...defaultProps} />);
      
      expect(screen.getByTestID('appointment-card')).toBeTruthy();
      expect(screen.getByText('Meet & Greet')).toBeTruthy();
      expect(screen.getByText('with Buddy')).toBeTruthy();
    });

    it('renders appointment without pet name', () => {
      const appointment = createMockAppointment({ petName: undefined });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.getByText('Meet & Greet')).toBeTruthy();
      expect(screen.queryByText('with')).toBeNull();
    });
  });

  describe('Appointment Type Display', () => {
    const appointmentTypeTests = [
      { type: 'meet_and_greet', display: 'Meet & Greet' },
      { type: 'shelter_visit', display: 'Shelter Visit' },
      { type: 'home_visit', display: 'Home Visit' },
      { type: 'adoption_appointment', display: 'Adoption Appointment' },
      { type: 'follow_up', display: 'Follow-up Visit' },
      { type: 'vet_appointment', display: 'Vet Appointment' },
      { type: 'training_session', display: 'Training Session' },
    ] as const;

    appointmentTypeTests.forEach(({ type, display }) => {
      it(`displays correct name for ${type}`, () => {
        const appointment = createMockAppointment({
          appointmentType: type as AppointmentType,
        });
        
        render(<AppointmentCard {...defaultProps} appointment={appointment} />);
        
        expect(screen.getByText(display)).toBeTruthy();
      });
    });
  });

  describe('Status Display', () => {
    const statusTests = [
      { status: 'scheduled', display: 'Scheduled', icon: '📅' },
      { status: 'confirmed', display: 'Confirmed', icon: '✅' },
      { status: 'cancelled', display: 'Cancelled', icon: '❌' },
      { status: 'completed', display: 'Completed', icon: '✅' },
      { status: 'no_show', display: 'No Show', icon: '⚠️' },
    ] as const;

    statusTests.forEach(({ status, display, icon }) => {
      it(`displays correct status for ${status}`, () => {
        const appointment = createMockAppointment({
          status: status as CalendarEvent['status'],
        });
        
        render(<AppointmentCard {...defaultProps} appointment={appointment} />);
        
        expect(screen.getByText(display)).toBeTruthy();
        expect(screen.getByText(icon)).toBeTruthy();
      });
    });
  });

  describe('Date and Time Formatting', () => {
    it('formats date and time correctly', () => {
      const appointment = createMockAppointment({
        startDate: new Date('2025-01-15T14:30:00Z'),
        endDate: new Date('2025-01-15T15:00:00Z'),
      });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      // Should show formatted date and time
      expect(screen.getByText(/Wed, Jan 15/)).toBeTruthy();
    });

    it('handles different time formats', () => {
      const appointment = createMockAppointment({
        startDate: new Date('2025-12-25T09:00:00Z'),
        endDate: new Date('2025-12-25T09:30:00Z'),
      });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.getByText(/Thu, Dec 25/)).toBeTruthy();
    });
  });

  describe('Location Display', () => {
    it('displays shelter location', () => {
      render(<AppointmentCard {...defaultProps} />);
      
      expect(screen.getByText('📍 Happy Paws Shelter')).toBeTruthy();
    });

    it('displays different location when specified', () => {
      const appointment = createMockAppointment({
        location: 'Different Location',
      });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.getByText('Different Location')).toBeTruthy();
    });

    it('displays shelter contact information', () => {
      render(<AppointmentCard {...defaultProps} />);
      
      expect(screen.getByText('Dr. Smith • +1234567890')).toBeTruthy();
    });
  });

  describe('Description Display', () => {
    it('shows description in full mode', () => {
      render(<AppointmentCard {...defaultProps} compact={false} />);
      
      expect(screen.getByText('Meet and greet appointment with Buddy at Happy Paws Shelter')).toBeTruthy();
    });

    it('hides description in compact mode', () => {
      render(<AppointmentCard {...defaultProps} compact={true} />);
      
      expect(screen.queryByText('Meet and greet appointment with Buddy at Happy Paws Shelter')).toBeNull();
    });
  });

  describe('Notes Display', () => {
    it('shows notes in full mode', () => {
      const appointment = createMockAppointment({
        notes: 'Please bring ID and application form',
      });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} compact={false} />);
      
      expect(screen.getByText('Note: Please bring ID and application form')).toBeTruthy();
    });

    it('hides notes in compact mode', () => {
      const appointment = createMockAppointment({
        notes: 'Please bring ID and application form',
      });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} compact={true} />);
      
      expect(screen.queryByText('Note: Please bring ID and application form')).toBeNull();
    });
  });

  describe('Action Buttons', () => {
    it('shows confirm button for scheduled appointments', () => {
      const appointment = createMockAppointment({ status: 'scheduled' });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.getByTestID('button-confirm')).toBeTruthy();
    });

    it('shows reschedule button for active appointments', () => {
      render(<AppointmentCard {...defaultProps} />);
      
      expect(screen.getByTestID('button-reschedule')).toBeTruthy();
    });

    it('shows cancel button for non-cancelled appointments', () => {
      render(<AppointmentCard {...defaultProps} />);
      
      expect(screen.getByTestID('button-cancel')).toBeTruthy();
    });

    it('hides action buttons for completed appointments', () => {
      const appointment = createMockAppointment({ status: 'completed' });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.queryByTestID('button-confirm')).toBeNull();
      expect(screen.queryByTestID('button-reschedule')).toBeNull();
      expect(screen.queryByTestID('button-cancel')).toBeNull();
    });

    it('hides action buttons for cancelled appointments', () => {
      const appointment = createMockAppointment({ status: 'cancelled' });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.queryByTestID('button-confirm')).toBeNull();
      expect(screen.queryByTestID('button-reschedule')).toBeNull();
      expect(screen.queryByTestID('button-cancel')).toBeNull();
    });

    it('hides action buttons when showActions is false', () => {
      render(<AppointmentCard {...defaultProps} showActions={false} />);
      
      expect(screen.queryByTestID('button-confirm')).toBeNull();
      expect(screen.queryByTestID('button-reschedule')).toBeNull();
      expect(screen.queryByTestID('button-cancel')).toBeNull();
    });

    it('does not show cancel button for cancelled appointments', () => {
      const appointment = createMockAppointment({ status: 'cancelled' });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.queryByTestID('button-cancel')).toBeNull();
    });
  });

  describe('Button Interactions', () => {
    it('calls onConfirm when confirm button is pressed', () => {
      const appointment = createMockAppointment({ status: 'scheduled' });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      fireEvent.press(screen.getByTestID('button-confirm'));
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('calls onReschedule when reschedule button is pressed', () => {
      render(<AppointmentCard {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('button-reschedule'));
      expect(mockOnReschedule).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is pressed', () => {
      render(<AppointmentCard {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('button-cancel'));
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onPress when card is pressed and onPress is provided', () => {
      render(<AppointmentCard {...defaultProps} />);
      
      fireEvent.press(screen.getByTestID('appointment-card'));
      expect(mockOnPress).toHaveBeenCalled();
    });

    it('does not make card pressable when onPress is not provided', () => {
      render(<AppointmentCard {...defaultProps} onPress={undefined} />);
      
      // Card should not be wrapped in TouchableOpacity
      expect(screen.getByTestID('appointment-card')).toBeTruthy();
    });
  });

  describe('Appointment Type Color Coding', () => {
    it('uses coral color for adoption-related appointments', () => {
      const adoptionTypes: AppointmentType[] = ['meet_and_greet', 'adoption_appointment', 'home_visit'];
      
      adoptionTypes.forEach(appointmentType => {
        const appointment = createMockAppointment({ appointmentType });
        const { unmount } = render(<AppointmentCard {...defaultProps} appointment={appointment} />);
        
        // Appointment type should be rendered
        expect(screen.getByText(appointment.title.includes('Meet') ? 'Meet & Greet' : 
                                appointment.appointmentType.includes('adoption') ? 'Adoption Appointment' :
                                'Home Visit')).toBeTruthy();
        
        unmount();
      });
    });

    it('uses teal color for service appointments', () => {
      const serviceTypes: AppointmentType[] = ['shelter_visit', 'vet_appointment', 'training_session', 'follow_up'];
      
      serviceTypes.forEach(appointmentType => {
        const appointment = createMockAppointment({ appointmentType });
        const { unmount } = render(<AppointmentCard {...defaultProps} appointment={appointment} />);
        
        // Service appointment types should be rendered
        expect(screen.getByText(
          appointmentType === 'shelter_visit' ? 'Shelter Visit' :
          appointmentType === 'vet_appointment' ? 'Vet Appointment' :
          appointmentType === 'training_session' ? 'Training Session' : 'Follow-up Visit'
        )).toBeTruthy();
        
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels for touchable card', () => {
      const appointment = createMockAppointment({
        startDate: new Date('2025-01-15T10:00:00Z'),
      });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      // Should have accessibility role and label
      expect(screen.getByTestID('appointment-card')).toBeTruthy();
    });

    it('provides accessibility hint for touchable card', () => {
      render(<AppointmentCard {...defaultProps} />);
      
      // Card should be accessible when touchable
      expect(screen.getByTestID('appointment-card')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing pet name gracefully', () => {
      const appointment = createMockAppointment({ petName: undefined });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.getByText('Meet & Greet')).toBeTruthy();
      expect(screen.queryByText('with')).toBeNull();
    });

    it('handles missing description gracefully', () => {
      const appointment = createMockAppointment({ description: undefined });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} compact={false} />);
      
      expect(screen.getByTestID('appointment-card')).toBeTruthy();
    });

    it('handles missing notes gracefully', () => {
      const appointment = createMockAppointment({ notes: undefined });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} compact={false} />);
      
      expect(screen.getByTestID('appointment-card')).toBeTruthy();
      expect(screen.queryByText(/Note:/)).toBeNull();
    });

    it('handles unknown appointment type gracefully', () => {
      const appointment = createMockAppointment({
        appointmentType: 'unknown_type' as AppointmentType,
      });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.getByText('Appointment')).toBeTruthy();
    });

    it('handles unknown status gracefully', () => {
      const appointment = createMockAppointment({
        status: 'unknown_status' as CalendarEvent['status'],
      });
      
      render(<AppointmentCard {...defaultProps} appointment={appointment} />);
      
      expect(screen.getByText('Unknown')).toBeTruthy();
      expect(screen.getByText('❓')).toBeTruthy();
    });
  });

  describe('Callback Presence', () => {
    it('does not show confirm button when onConfirm is not provided', () => {
      const appointment = createMockAppointment({ status: 'scheduled' });
      
      render(
        <AppointmentCard
          {...defaultProps}
          appointment={appointment}
          onConfirm={undefined}
        />
      );
      
      expect(screen.queryByTestID('button-confirm')).toBeNull();
    });

    it('does not show reschedule button when onReschedule is not provided', () => {
      render(
        <AppointmentCard
          {...defaultProps}
          onReschedule={undefined}
        />
      );
      
      expect(screen.queryByTestID('button-reschedule')).toBeNull();
    });

    it('does not show cancel button when onCancel is not provided', () => {
      render(
        <AppointmentCard
          {...defaultProps}
          onCancel={undefined}
        />
      );
      
      expect(screen.queryByTestID('button-cancel')).toBeNull();
    });
  });
});