import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../hooks/AuthProvider';
import { useColors } from '../hooks/useColors';
import authService from '../services/authService';
import type { RootStackNavigationProp } from '../types/navigation';

interface HomeScreenProps {
  navigation: RootStackNavigationProp<'Home'>;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { logout } = useAuth();
  const colors = useColors();
  const [username, setUsername] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const credentials = await authService.getCredentials();
        if (credentials) {
          setUsername(credentials.username);
        }
      } catch (error) {
        console.error('HomeScreen: Failed to load user info:', error);
      }
    };
    loadUserInfo();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } catch (error) {
              console.error('HomeScreen: Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.neutral.beige,
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.neutral.midnight,
      textAlign: 'center',
      marginBottom: 10,
      marginTop: 40,
    },
    subtitle: {
      fontSize: 18,
      color: colors.neutral.midnight,
      textAlign: 'center',
      marginBottom: 32,
      opacity: 0.8,
    },
    userInfo: {
      backgroundColor: colors.primary.teal,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginBottom: 16,
      alignSelf: 'center',
    },
    userText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
    },
    actionsContainer: {
      flex: 1,
      gap: 16,
      marginBottom: 32,
    },
    actionCard: {
      padding: 20,
    },
    actionTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
    },
    actionDescription: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 22,
    },
    actionButton: {
      marginTop: 4,
    },
    logoutButton: {
      marginTop: 16,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Pet Love Community!</Text>
      {username ? (
        <>
          <View style={styles.userInfo}>
            <Text style={styles.userText}>Logged in as: {username}</Text>
          </View>
          <Text style={styles.subtitle}>Ready to find your perfect pet companion?</Text>
        </>
      ) : (
        <Text style={styles.subtitle}>Welcome back!</Text>
      )}
      
      {/* Pet Discovery Section */}
      <View style={styles.actionsContainer}>
        <Card style={styles.actionCard}>
          <Text style={[styles.actionTitle, { color: colors.neutral.midnight }]}>
            🐾 Find Your Perfect Pet
          </Text>
          <Text style={[styles.actionDescription, { color: colors.extended.textVariations.secondary }]}>
            Browse available pets from local shelters and rescue organizations
          </Text>
          <Button 
            title="Find Pets ❤️"
            onPress={() => navigation.navigate('PetList')}
            type="primary"
            style={styles.actionButton}
          />
        </Card>

        <Card style={styles.actionCard}>
          <Text style={[styles.actionTitle, { color: colors.neutral.midnight }]}>
            🏠 Pet Services
          </Text>
          <Text style={[styles.actionDescription, { color: colors.extended.textVariations.secondary }]}>
            Book grooming, training, and veterinary services for your pets
          </Text>
          <Button 
            title="Browse Services"
            onPress={() => {
              Alert.alert('Coming Soon', 'Pet services will be available in the next update!');
            }}
            type="secondary"
            style={styles.actionButton}
          />
        </Card>
      </View>
      
      <Button 
        title={isLoggingOut ? 'Logging out...' : 'Logout'} 
        onPress={handleLogout}
        disabled={isLoggingOut}
        type="secondary"
        style={styles.logoutButton}
      />
    </View>
  );
};


export default HomeScreen;
