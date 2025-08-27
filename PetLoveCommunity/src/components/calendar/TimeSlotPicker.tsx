// Pet Love Community - Time Slot Picker Component
// Allows users to select available time slots for appointment scheduling

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { TimeSlot, AppointmentType } from '../../services/calendarService';

export interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot?: string; // startTime of selected slot
  onSlotSelect: (startTime: string) => void;
  appointmentType: AppointmentType;
  date?: string; // YYYY-MM-DD format for display
  title?: string;
  showCapacity?: boolean;
  disabled?: boolean;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  onSlotSelect,
  appointmentType,
  date,
  title,
  showCapacity = true,
  disabled = false,
}) => {
  const colors = useColors();

  // Filter slots by appointment type and availability
  const filteredSlots = slots.filter(slot => 
    slot.appointmentType.includes(appointmentType) && slot.available
  );

  // Format time for display
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

  // Get slot display status
  const getSlotStatus = (slot: TimeSlot) => {
    if (!slot.available) {
      return {
        status: 'unavailable',
        text: 'Unavailable',
        color: colors.neutral.lightGray,
        textColor: colors.neutral.darkGray,
        disabled: true,
      };
    }

    if (slot.currentBookings >= slot.maxCapacity) {
      return {
        status: 'full',
        text: 'Full',
        color: colors.semantic.warning + '30',
        textColor: colors.semantic.warning,
        disabled: true,
      };
    }

    const isSelected = selectedSlot === slot.startTime;
    const remainingSpots = slot.maxCapacity - slot.currentBookings;

    if (isSelected) {
      return {
        status: 'selected',
        text: 'Selected',
        color: colors.primary.coral,
        textColor: colors.neutral.beige,
        disabled: false,
        remainingSpots,
      };
    }

    // Get appointment type color
    const backgroundColor = appointmentType === 'meet_and_greet' || 
                          appointmentType === 'adoption_appointment' || 
                          appointmentType === 'home_visit'
      ? colors.primary.coral + '20'
      : colors.primary.teal + '20';

    const borderColor = appointmentType === 'meet_and_greet' || 
                       appointmentType === 'adoption_appointment' || 
                       appointmentType === 'home_visit'
      ? colors.primary.coral
      : colors.primary.teal;

    return {
      status: 'available',
      text: 'Available',
      color: backgroundColor,
      textColor: colors.neutral.midnight,
      borderColor,
      disabled: false,
      remainingSpots,
    };
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.neutral.midnight,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.extended.textVariations.secondary,
    },
    slotsContainer: {
      flex: 1,
    },
    slotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingBottom: 20,
    },
    slotButton: {
      minWidth: 100,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotTime: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    slotStatus: {
      fontSize: 12,
      fontWeight: '500',
    },
    slotCapacity: {
      fontSize: 10,
      opacity: 0.8,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.extended.textVariations.tertiary,
      textAlign: 'center',
      lineHeight: 24,
    },
    emptyStateIcon: {
      fontSize: 48,
      marginBottom: 16,
      opacity: 0.5,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.extended.tealVariations.background,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    legendText: {
      fontSize: 12,
      color: colors.extended.textVariations.secondary,
    },
  });

  if (filteredSlots.length === 0) {
    return (
      <View style={styles.container}>
        {title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {date && (
              <Text style={styles.subtitle}>
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📅</Text>
          <Text style={styles.emptyStateText}>
            No available time slots for this date.{'\n'}
            Please select a different date or check back later.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {date && (
            <Text style={styles.subtitle}>
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          )}
        </View>
      )}

      <ScrollView 
        style={styles.slotsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.slotsGrid}>
          {filteredSlots.map((slot) => {
            const slotInfo = getSlotStatus(slot);
            
            return (
              <TouchableOpacity
                key={slot.startTime}
                style={[
                  styles.slotButton,
                  {
                    backgroundColor: slotInfo.color,
                    borderColor: slotInfo.borderColor || slotInfo.color,
                    opacity: disabled ? 0.5 : slotInfo.disabled ? 0.6 : 1.0,
                  },
                ]}
                onPress={() => !slotInfo.disabled && !disabled && onSlotSelect(slot.startTime)}
                disabled={slotInfo.disabled || disabled}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${formatTime(slot.startTime)} time slot, ${slotInfo.text}`}
                accessibilityHint={
                  slotInfo.disabled 
                    ? `This time slot is ${slotInfo.text.toLowerCase()}`
                    : `Tap to select this time slot`
                }
                accessibilityState={{
                  selected: selectedSlot === slot.startTime,
                  disabled: slotInfo.disabled || disabled,
                }}
              >
                <Text 
                  style={[
                    styles.slotTime,
                    { color: slotInfo.textColor }
                  ]}
                >
                  {formatTime(slot.startTime)}
                </Text>
                
                <Text 
                  style={[
                    styles.slotStatus,
                    { color: slotInfo.textColor, opacity: 0.8 }
                  ]}
                >
                  {slotInfo.text}
                </Text>
                
                {showCapacity && slotInfo.remainingSpots !== undefined && (
                  <Text 
                    style={[
                      styles.slotCapacity,
                      { color: slotInfo.textColor }
                    ]}
                  >
                    {slotInfo.remainingSpots} spot{slotInfo.remainingSpots !== 1 ? 's' : ''} left
                  </Text>
                )}

                {slot.specialRequirements && slot.specialRequirements.length > 0 && (
                  <Text 
                    style={[
                      styles.slotCapacity,
                      { color: slotInfo.textColor }
                    ]}
                  >
                    * Special requirements
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View 
              style={[
                styles.legendColor, 
                { 
                  backgroundColor: appointmentType === 'meet_and_greet' || 
                                  appointmentType === 'adoption_appointment' || 
                                  appointmentType === 'home_visit'
                    ? colors.primary.coral + '20'
                    : colors.primary.teal + '20'
                }
              ]} 
            />
            <Text style={styles.legendText}>Available</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.primary.coral }]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.semantic.warning + '30' }]} />
            <Text style={styles.legendText}>Full</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.neutral.lightGray }]} />
            <Text style={styles.legendText}>Unavailable</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};