import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Button from '../components/Button';
import { useAuth } from '../hooks/AuthProvider';
import { useColors } from '../hooks/useColors';
import authService from '../services/authService';

const HomeScreen: React.FC = () => {
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
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.neutral.beige,
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.neutral.midnight,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 18,
      color: colors.neutral.midnight,
      textAlign: 'center',
      marginBottom: 40,
      opacity: 0.8,
    },
    userInfo: {
      backgroundColor: colors.primary.teal,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginBottom: 30,
    },
    userText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
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
      
      <Button 
        title={isLoggingOut ? 'Logging out...' : 'Logout'} 
        onPress={handleLogout}
        disabled={isLoggingOut}
        type="secondary"
      />
    </View>
  );
};


export default HomeScreen;
