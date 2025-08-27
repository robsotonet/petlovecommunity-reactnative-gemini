// Pet Love Community - Appointment Card Component
// Displays appointment information in a card format following the design system

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../Card';
import Button from '../Button';
import { useColors } from '../../hooks/useColors';
import { CalendarEvent, AppointmentType } from '../../services/calendarService';

export interface AppointmentCardProps {
  appointment: CalendarEvent;
  onPress?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
  onConfirm?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onPress,
  onCancel,
  onReschedule,
  onConfirm,
  showActions = true,
  compact = false,
}) => {
  const colors = useColors();

  // Get display name for appointment type
  const getAppointmentTypeDisplayName = (type: AppointmentType): string => {
    switch (type) {
      case 'meet_and_greet':
        return 'Meet & Greet';
      case 'shelter_visit':
        return 'Shelter Visit';
      case 'home_visit':
        return 'Home Visit';
      case 'adoption_appointment':
        return 'Adoption Appointment';
      case 'follow_up':
        return 'Follow-up Visit';
      case 'vet_appointment':
        return 'Vet Appointment';
      case 'training_session':
        return 'Training Session';
      default:
        return 'Appointment';
    }
  };

  // Get status display information
  const getStatusInfo = () => {
    switch (appointment.status) {
      case 'scheduled':
        return { text: 'Scheduled', color: colors.semantic.info, icon: '📅' };
      case 'confirmed':
        return { text: 'Confirmed', color: colors.semantic.success, icon: '✅' };
      case 'cancelled':
        return { text: 'Cancelled', color: colors.semantic.error, icon: '❌' };
      case 'completed':
        return { text: 'Completed', color: colors.semantic.success, icon: '✅' };
      case 'no_show':
        return { text: 'No Show', color: colors.semantic.warning, icon: '⚠️' };
      default:
        return { text: 'Unknown', color: colors.neutral.darkGray, icon: '❓' };
    }
  };

  // Get appointment type color (coral for adoption-related, teal for services)
  const getAppointmentTypeColor = (type: AppointmentType): string => {
    switch (type) {
      case 'meet_and_greet':
      case 'adoption_appointment':
      case 'home_visit':
        return colors.primary.coral;
      case 'shelter_visit':
      case 'vet_appointment':
      case 'training_session':
      case 'follow_up':
        return colors.primary.teal;
      default:
        return colors.neutral.midnight;
    }
  };

  // Format date and time
  const formatDateTime = () => {
    const date = new Date(appointment.startDate);
    const endDate = new Date(appointment.endDate);
    
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    const endTimeStr = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return { dateStr, timeStr, endTimeStr };
  };

  const { dateStr, timeStr, endTimeStr } = formatDateTime();
  const statusInfo = getStatusInfo();
  const typeColor = getAppointmentTypeColor(appointment.appointmentType);

  const styles = StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: compact ? 8 : 12,
    },
    typeContainer: {
      flex: 1,
    },
    appointmentType: {
      fontSize: compact ? 16 : 18,
      fontWeight: 'bold',
      color: typeColor,
      marginBottom: 4,
    },
    petName: {
      fontSize: compact ? 14 : 16,
      fontWeight: '600',
      color: colors.neutral.midnight,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: statusInfo.color + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: statusInfo.color + '40',
    },
    statusIcon: {
      fontSize: 12,
      marginRight: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: statusInfo.color,
    },
    dateTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: compact ? 6 : 8,
    },
    dateTime: {
      fontSize: 14,
      color: colors.neutral.midnight,
      fontWeight: '500',
    },
    locationContainer: {
      marginBottom: compact ? 6 : 8,
    },
    location: {
      fontSize: 14,
      color: colors.extended.textVariations.secondary,
    },
    shelterContact: {
      fontSize: 12,
      color: colors.extended.textVariations.tertiary,
      marginTop: 2,
    },
    description: {
      fontSize: 14,
      color: colors.extended.textVariations.secondary,
      lineHeight: 20,
      marginBottom: compact ? 8 : 12,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    actionButton: {
      flex: 1,
      minWidth: 0,
    },
    notes: {
      fontSize: 12,
      color: colors.extended.textVariations.tertiary,
      fontStyle: 'italic',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.extended.tealVariations.background,
    },
  });

  const CardContent = (
    <View>
      {/* Header with type and status */}
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Text style={styles.appointmentType}>
            {getAppointmentTypeDisplayName(appointment.appointmentType)}
          </Text>
          {appointment.petName && (
            <Text style={styles.petName}>with {appointment.petName}</Text>
          )}
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
          <Text style={styles.statusText}>{statusInfo.text}</Text>
        </View>
      </View>

      {/* Date and Time */}
      <View style={styles.dateTimeContainer}>
        <Text style={styles.dateTime}>
          {dateStr} • {timeStr} - {endTimeStr}
        </Text>
      </View>

      {/* Location */}
      <View style={styles.locationContainer}>
        <Text style={styles.location}>📍 {appointment.shelterName}</Text>
        {appointment.location !== appointment.shelterName && (
          <Text style={styles.location}>{appointment.location}</Text>
        )}
        <Text style={styles.shelterContact}>
          {appointment.shelterContact.name} • {appointment.shelterContact.phone}
        </Text>
      </View>

      {/* Description */}
      {!compact && appointment.description && (
        <Text style={styles.description}>{appointment.description}</Text>
      )}

      {/* Action Buttons */}
      {showActions && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
        <View style={styles.actions}>
          {appointment.status === 'scheduled' && onConfirm && (
            <Button
              title="Confirm"
              onPress={onConfirm}
              type="primary"
              style={[styles.actionButton, { backgroundColor: colors.semantic.success }]}
            />
          )}
          {onReschedule && appointment.status !== 'completed' && (
            <Button
              title="Reschedule"
              onPress={onReschedule}
              type="secondary"
              style={styles.actionButton}
            />
          )}
          {onCancel && appointment.status !== 'cancelled' && (
            <Button
              title="Cancel"
              onPress={onCancel}
              type="secondary"
              style={[styles.actionButton, { backgroundColor: colors.semantic.error + '20', borderColor: colors.semantic.error, borderWidth: 1 }]}
            />
          )}
        </View>
      )}

      {/* Notes */}
      {!compact && appointment.notes && (
        <Text style={styles.notes}>Note: {appointment.notes}</Text>
      )}
    </View>
  );

  // If onPress is provided, make the card touchable
  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${getAppointmentTypeDisplayName(appointment.appointmentType)} appointment${appointment.petName ? ` with ${appointment.petName}` : ''} on ${dateStr} at ${timeStr}`}
        accessibilityHint="Tap to view appointment details"
      >
        <Card>{CardContent}</Card>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Card>{CardContent}</Card>
    </View>
  );
};