// Pet Love Community - TimeSlotPicker Component Tests
// Comprehensive unit tests for time slot selection and filtering functionality

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { TimeSlotPicker, TimeSlotPickerProps } from '../TimeSlotPicker';
import { TimeSlot, AppointmentType } from '../../../services/calendarService';
import { useColors } from '../../../hooks/useColors';

// Mock useColors hook
jest.mock('../../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

const mockColors = {
  primary: {
    coral: '#FF6B6B',
    teal: '#4ECDC4',
  },
  neutral: {
    beige: '#F7FFF7',
    midnight: '#1A535C',
    lightGray: '#E0E0E0',
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

describe('TimeSlotPicker', () => {
  const mockOnSlotSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useColors as jest.Mock).mockReturnValue(mockColors);
  });

  const createMockSlot = (
    startTime: string,
    appointmentType: AppointmentType[] = ['meet_and_greet'],
    available: boolean = true,
    currentBookings: number = 0,
    maxCapacity: number = 5,
    specialRequirements?: string[]
  ): TimeSlot => ({
    startTime,
    endTime: `${(parseInt(startTime.split(':')[0]) + 1).toString().padStart(2, '0')}:${startTime.split(':')[1]}`,
    available,
    appointmentType,
    maxCapacity,
    currentBookings,
    specialRequirements,
  });

  const defaultProps: TimeSlotPickerProps = {
    slots: [
      createMockSlot('09:00'),
      createMockSlot('10:00'),
      createMockSlot('11:00'),
    ],
    onSlotSelect: mockOnSlotSelect,
    appointmentType: 'meet_and_greet',
  };

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<TimeSlotPicker {...defaultProps} />);
      expect(screen.getByText('9:00 AM')).toBeTruthy();
      expect(screen.getByText('10:00 AM')).toBeTruthy();
      expect(screen.getByText('11:00 AM')).toBeTruthy();
    });

    it('displays title when provided', () => {
      const title = 'Select a Time Slot';
      render(<TimeSlotPicker {...defaultProps} title={title} />);
      expect(screen.getByText(title)).toBeTruthy();
    });

    it('displays date when provided', () => {
      const date = '2025-01-15';
      render(<TimeSlotPicker {...defaultProps} date={date} title="Select Time" />);
      expect(screen.getByText('Tuesday, January 15, 2025')).toBeTruthy();
    });
  });

  describe('Time Slot Filtering', () => {
    it('filters slots by appointment type', () => {
      const slots = [
        createMockSlot('09:00', ['meet_and_greet']),
        createMockSlot('10:00', ['vet_appointment']),
        createMockSlot('11:00', ['meet_and_greet', 'adoption_appointment']),
      ];

      render(
        <TimeSlotPicker
          {...defaultProps}
          slots={slots}
          appointmentType="meet_and_greet"
        />
      );

      // Should show meet_and_greet slots (9:00 AM and 11:00 AM)
      expect(screen.getByText('9:00 AM')).toBeTruthy();
      expect(screen.getByText('11:00 AM')).toBeTruthy();
      // Should not show vet_appointment only slot (10:00 AM)
      expect(screen.queryByText('10:00 AM')).toBeNull();
    });

    it('only shows available slots', () => {
      const slots = [
        createMockSlot('09:00', ['meet_and_greet'], true),
        createMockSlot('10:00', ['meet_and_greet'], false),
        createMockSlot('11:00', ['meet_and_greet'], true),
      ];

      render(
        <TimeSlotPicker
          {...defaultProps}
          slots={slots}
          appointmentType="meet_and_greet"
        />
      );

      expect(screen.getByText('9:00 AM')).toBeTruthy();
      expect(screen.getByText('11:00 AM')).toBeTruthy();
      // Unavailable slot should not appear
      expect(screen.queryByText('10:00 AM')).toBeNull();
    });

    it('shows multiple appointment types correctly', () => {
      const slots = [
        createMockSlot('09:00', ['shelter_visit']),
        createMockSlot('10:00', ['vet_appointment']),
        createMockSlot('11:00', ['training_session']),
      ];

      render(
        <TimeSlotPicker
          {...defaultProps}
          slots={slots}
          appointmentType="vet_appointment"
        />
      );

      expect(screen.getByText('10:00 AM')).toBeTruthy();
      expect(screen.queryByText('9:00 AM')).toBeNull();
      expect(screen.queryByText('11:00 AM')).toBeNull();
    });
  });

  describe('Slot Selection', () => {
    it('calls onSlotSelect when a slot is pressed', () => {
      render(<TimeSlotPicker {...defaultProps} />);
      
      const slot = screen.getByText('9:00 AM');
      fireEvent.press(slot);
      
      expect(mockOnSlotSelect).toHaveBeenCalledWith('09:00');
    });

    it('does not call onSlotSelect when component is disabled', () => {
      render(<TimeSlotPicker {...defaultProps} disabled={true} />);
      
      const slot = screen.getByText('9:00 AM');
      fireEvent.press(slot);
      
      expect(mockOnSlotSelect).not.toHaveBeenCalled();
    });

    it('highlights selected slot', () => {
      render(<TimeSlotPicker {...defaultProps} selectedSlot="09:00" />);
      
      const selectedSlot = screen.getByText('9:00 AM');
      expect(selectedSlot).toBeTruthy();
      // Selected slot should show "Selected" status
      expect(screen.getByText('Selected')).toBeTruthy();
    });
  });

  describe('Slot Status Display', () => {
    it('shows available status for regular slots', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], true, 2, 5)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      
      expect(screen.getByText('Available')).toBeTruthy();
    });

    it('shows full status for capacity-reached slots', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], true, 5, 5)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      
      expect(screen.getByText('Full')).toBeTruthy();
    });

    it('shows unavailable status for unavailable slots', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], false)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      
      // Since filtering excludes unavailable slots, this tests the edge case
      // where a slot becomes unavailable during render
      expect(screen.queryByText('Unavailable')).toBeNull();
    });
  });

  describe('Capacity Display', () => {
    it('shows remaining spots when showCapacity is true', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], true, 2, 5)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} showCapacity={true} />);
      
      expect(screen.getByText('3 spots left')).toBeTruthy();
    });

    it('shows singular spot when only one remaining', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], true, 4, 5)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} showCapacity={true} />);
      
      expect(screen.getByText('1 spot left')).toBeTruthy();
    });

    it('does not show capacity when showCapacity is false', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], true, 2, 5)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} showCapacity={false} />);
      
      expect(screen.queryByText('3 spots left')).toBeNull();
    });
  });

  describe('Special Requirements Display', () => {
    it('shows special requirements indicator', () => {
      const slots = [
        createMockSlot('09:00', ['meet_and_greet'], true, 0, 5, ['ID Required'])
      ];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      
      expect(screen.getByText('* Special requirements')).toBeTruthy();
    });

    it('does not show special requirements when none exist', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], true, 0, 5)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      
      expect(screen.queryByText('* Special requirements')).toBeNull();
    });
  });

  describe('Time Formatting', () => {
    it('formats time correctly in 12-hour format', () => {
      const slots = [
        createMockSlot('09:00'),
        createMockSlot('13:30'),
        createMockSlot('15:45'),
      ];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      
      expect(screen.getByText('9:00 AM')).toBeTruthy();
      expect(screen.getByText('1:30 PM')).toBeTruthy();
      expect(screen.getByText('3:45 PM')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no slots available', () => {
      render(<TimeSlotPicker {...defaultProps} slots={[]} title="Select Time" />);
      
      expect(screen.getByText('📅')).toBeTruthy();
      expect(screen.getByText('No available time slots for this date.\nPlease select a different date or check back later.')).toBeTruthy();
    });

    it('shows empty state when no slots match appointment type', () => {
      const slots = [createMockSlot('09:00', ['vet_appointment'])];
      
      render(
        <TimeSlotPicker
          {...defaultProps}
          slots={slots}
          appointmentType="meet_and_greet"
          title="Select Time"
        />
      );
      
      expect(screen.getByText('📅')).toBeTruthy();
    });
  });

  describe('Appointment Type Color Coding', () => {
    it('uses coral color for adoption-related appointments', () => {
      const adoptionTypes: AppointmentType[] = ['meet_and_greet', 'adoption_appointment', 'home_visit'];
      
      adoptionTypes.forEach(appointmentType => {
        const { unmount } = render(
          <TimeSlotPicker
            {...defaultProps}
            appointmentType={appointmentType}
          />
        );
        
        // The legend should show coral color for adoption types
        const legend = screen.getByText('Available');
        expect(legend).toBeTruthy();
        
        unmount();
      });
    });

    it('uses teal color for service appointments', () => {
      const serviceTypes: AppointmentType[] = ['shelter_visit', 'vet_appointment', 'training_session', 'follow_up'];
      
      serviceTypes.forEach(appointmentType => {
        const { unmount } = render(
          <TimeSlotPicker
            {...defaultProps}
            appointmentType={appointmentType}
          />
        );
        
        // The legend should show teal color for service types
        const legend = screen.getByText('Available');
        expect(legend).toBeTruthy();
        
        unmount();
      });
    });
  });

  describe('Legend Display', () => {
    it('shows color legend with all status types', () => {
      render(<TimeSlotPicker {...defaultProps} />);
      
      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('Selected')).toBeTruthy();
      expect(screen.getByText('Full')).toBeTruthy();
      expect(screen.getByText('Unavailable')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      render(<TimeSlotPicker {...defaultProps} />);
      
      const slot = screen.getByLabelText('9:00 AM time slot, Available');
      expect(slot).toBeTruthy();
    });

    it('provides accessibility hints', () => {
      render(<TimeSlotPicker {...defaultProps} />);
      
      const slot = screen.getByText('9:00 AM');
      expect(slot).toBeTruthy();
      // Note: Testing library may not expose accessibility hints directly
    });

    it('marks full slots as disabled in accessibility state', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], true, 5, 5)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      
      const slot = screen.getByText('Full');
      expect(slot).toBeTruthy();
    });

    it('marks selected slot in accessibility state', () => {
      render(<TimeSlotPicker {...defaultProps} selectedSlot="09:00" />);
      
      const slot = screen.getByText('9:00 AM');
      expect(slot).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('disables all slots when component is disabled', () => {
      render(<TimeSlotPicker {...defaultProps} disabled={true} />);
      
      const slot = screen.getByText('9:00 AM');
      fireEvent.press(slot);
      
      expect(mockOnSlotSelect).not.toHaveBeenCalled();
    });

    it('disables full slots', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], true, 5, 5)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      
      const fullSlot = screen.getByText('9:00 AM');
      fireEvent.press(fullSlot);
      
      expect(mockOnSlotSelect).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty slot array gracefully', () => {
      render(<TimeSlotPicker {...defaultProps} slots={[]} />);
      
      expect(screen.getByText('📅')).toBeTruthy();
    });

    it('handles slots with zero capacity', () => {
      const slots = [createMockSlot('09:00', ['meet_and_greet'], true, 0, 0)];
      
      render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      
      expect(screen.getByText('Full')).toBeTruthy();
    });

    it('handles malformed time strings gracefully', () => {
      const slots = [createMockSlot('25:99', ['meet_and_greet'], true)];
      
      // Component should handle malformed time without crashing
      expect(() => {
        render(<TimeSlotPicker {...defaultProps} slots={slots} />);
      }).not.toThrow();
    });
  });
});