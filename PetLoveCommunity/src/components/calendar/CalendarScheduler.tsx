// Pet Love Community - Calendar Scheduler Component
// Main scheduling interface using react-native-calendars with Pet Love Community design system

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { colors } from '../../styles/colors';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import useCalendar from '../../hooks/useCalendar';
import { AppointmentType, AvailableSlots } from '../../services/calendarService';

export interface CalendarSchedulerProps {
  petId?: string;
  petName?: string;
  shelterId: string;
  shelterName: string;
  shelterContact: {
    name: string;
    phone: string;
    email: string;
  };
  adopterId: string;
  appointmentType: AppointmentType;
  onAppointmentScheduled?: (eventId: string) => void;
  onCancel?: () => void;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
}

interface MarkedDates {
  [date: string]: {
    selected?: boolean;
    selectedColor?: string;
    marked?: boolean;
    dotColor?: string;
    disabled?: boolean;
    disableTouchEvent?: boolean;
  };
}

export const CalendarScheduler: React.FC<CalendarSchedulerProps> = ({
  petId,
  petName,
  shelterId,
  shelterName,
  shelterContact,
  adopterId,
  appointmentType,
  onAppointmentScheduled,
  onCancel,
  minDate,
  maxDate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  
  const { 
    getAvailableAppointments, 
    scheduleAppointment, 
    scheduleMeetAndGreet,
    error: calendarError,
    isLoading: calendarLoading,
  } = useCalendar({ autoSync: true });

  // Generate marked dates for calendar
  const getMarkedDates = (): MarkedDates => {
    const marked: MarkedDates = {};

    // Mark available dates
    availableSlots.forEach((slot) => {
      if (slot.slots.length > 0) {
        marked[slot.date] = {
          marked: true,
          dotColor: colors.primary.teal,
        };
      }
    });

    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary.coral,
      };
    }

    return marked;
  };

  // Load available appointments when component mounts or when date range changes
  useEffect(() => {
    if (shelterId) {
      loadAvailableSlots();
    }
  }, [shelterId, appointmentType]);

  const loadAvailableSlots = async () => {
    if (!shelterId) return;

    setIsLoading(true);
    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Next 30 days
      endDate.setHours(23, 59, 59, 999);

      const slots = await getAvailableAppointments(
        shelterId,
        appointmentType,
        startDate,
        endDate
      );

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
      Alert.alert(
        'Error',
        'Failed to load available appointment times. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date selection
  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    setSelectedTimeSlot(''); // Reset time slot selection
  };

  // Get available time slots for selected date
  const getTimeSlotsForDate = () => {
    if (!selectedDate) return [];
    
    const daySlots = availableSlots.find(slot => slot.date === selectedDate);
    return daySlots?.slots.filter(slot => slot.available && slot.appointmentType.includes(appointmentType)) || [];
  };

  // Handle time slot selection
  const onTimeSlotPress = (startTime: string) => {
    setSelectedTimeSlot(startTime);
  };

  // Handle appointment scheduling
  const handleScheduleAppointment = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert(
        'Missing Information',
        'Please select both a date and time for your appointment.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsScheduling(true);
    try {
      // Create appointment datetime
      const appointmentDate = new Date(`${selectedDate}T${selectedTimeSlot}:00`);
      const appointmentEndDate = new Date(appointmentDate.getTime() + 30 * 60000); // 30 minutes

      let result;

      if (appointmentType === 'meet_and_greet' && petId && petName) {
        // Use the specialized meet & greet method
        result = await scheduleMeetAndGreet(
          petId,
          petName,
          shelterId,
          shelterName,
          shelterContact,
          appointmentDate,
          adopterId,
          []
        );
      } else {
        // Use the general appointment scheduling method
        result = await scheduleAppointment({
          title: `${getAppointmentTypeDisplayName(appointmentType)} - ${shelterName}`,
          description: petName 
            ? `${getAppointmentTypeDisplayName(appointmentType)} with ${petName} at ${shelterName}`
            : `${getAppointmentTypeDisplayName(appointmentType)} at ${shelterName}`,
          startDate: appointmentDate,
          endDate: appointmentEndDate,
          location: shelterName,
          attendees: [shelterContact.email],
          reminders: [
            { minutes: 60, method: 'alert' }, // 1 hour before
            { minutes: 15, method: 'alert' }, // 15 minutes before
          ],
          allDay: false,
          appointmentType,
          petId,
          petName,
          shelterId,
          shelterName,
          shelterContact,
          adopterId,
        });
      }

      if (result.success && result.eventId) {
        Alert.alert(
          'Appointment Scheduled!',
          `Your ${getAppointmentTypeDisplayName(appointmentType).toLowerCase()} has been scheduled for ${formatDateTime(appointmentDate)}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                onAppointmentScheduled?.(result.eventId!);
              },
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to schedule appointment');
      }
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      Alert.alert(
        'Scheduling Failed',
        error instanceof Error ? error.message : 'Failed to schedule appointment. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsScheduling(false);
    }
  };

  // Helper function to get display name for appointment type
  const getAppointmentTypeDisplayName = (type: AppointmentType): string => {
    switch (type) {
      case 'meet_and_greet':
        return 'Meet & Greet';
      case 'adoption_visit':
        return 'Adoption Visit';
      case 'follow_up':
        return 'Follow-up Visit';
      default:
        return 'Appointment';
    }
  };

  // Helper function to format date and time
  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Helper function to format time
  const formatTime = (time: string): string => {
    const [hour, minute] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hour), parseInt(minute));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const timeSlots = getTimeSlotsForDate();

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>
          Schedule {getAppointmentTypeDisplayName(appointmentType)}
        </Text>
        
        {petName && (
          <Text style={styles.subtitle}>
            with {petName} at {shelterName}
          </Text>
        )}

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.coral} />
              <Text style={styles.loadingText}>Loading available dates...</Text>
            </View>
          ) : (
            <Calendar
              onDayPress={onDayPress}
              markedDates={getMarkedDates()}
              minDate={minDate || new Date().toISOString().split('T')[0]}
              maxDate={maxDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              theme={{
                backgroundColor: colors.neutral.beige,
                calendarBackground: colors.neutral.beige,
                textSectionTitleColor: colors.neutral.midnight,
                selectedDayBackgroundColor: colors.primary.coral,
                selectedDayTextColor: colors.neutral.beige,
                todayTextColor: colors.primary.coral,
                dayTextColor: colors.neutral.midnight,
                textDisabledColor: colors.neutral.midnight + '40', // 25% opacity
                dotColor: colors.primary.teal,
                selectedDotColor: colors.neutral.beige,
                arrowColor: colors.primary.coral,
                monthTextColor: colors.neutral.midnight,
                indicatorColor: colors.primary.coral,
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13,
              }}
              enableSwipeMonths={true}
              hideExtraDays={false}
              disableMonthChange={false}
            />
          )}
        </View>

        {/* Time Slots */}
        {selectedDate && (
          <View style={styles.timeSlotsContainer}>
            <Text style={styles.sectionTitle}>
              Available Times for {selectedDate}
            </Text>
            
            {timeSlots.length === 0 ? (
              <Text style={styles.noSlotsText}>
                No available times for this date. Please select another date.
              </Text>
            ) : (
              <View style={styles.timeSlotsList}>
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.startTime}
                    title={formatTime(slot.startTime)}
                    onPress={() => onTimeSlotPress(slot.startTime)}
                    variant={selectedTimeSlot === slot.startTime ? 'primary' : 'secondary'}
                    size="small"
                    style={styles.timeSlotButton}
                    disabled={slot.currentBookings >= slot.maxCapacity}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Cancel"
            onPress={onCancel}
            variant="secondary"
            style={[styles.button, styles.cancelButton]}
            disabled={isScheduling}
          />
          <Button
            title="Schedule Appointment"
            onPress={handleScheduleAppointment}
            variant="primary"
            style={[styles.button, styles.scheduleButton]}
            disabled={!selectedDate || !selectedTimeSlot || isScheduling}
            loading={isScheduling}
          />
        </View>

        {/* Error Display */}
        {calendarError && (
          <Text style={styles.errorText}>{calendarError}</Text>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.neutral.beige,
  },
  card: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral.midnight,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral.midnight,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  calendarContainer: {
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.neutral.midnight,
    opacity: 0.7,
  },
  timeSlotsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.midnight,
    marginBottom: 12,
  },
  noSlotsText: {
    fontSize: 16,
    color: colors.neutral.midnight,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
    padding: 20,
  },
  timeSlotsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotButton: {
    minWidth: 80,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: colors.neutral.midnight + '20', // 12.5% opacity
  },
  scheduleButton: {
    backgroundColor: colors.primary.coral,
  },
  errorText: {
    color: colors.primary.coral,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.9,
  },
});