import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../hooks/AuthProvider';
import { useColors } from '../hooks/useColors';

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const colors = useColors();

  const validateInputs = () => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setError('');
    
    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);
    try {
      await login(username, password);
      // Success feedback will be handled by navigation
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colors.neutral.beige,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.neutral.midnight,
      textAlign: 'center',
      marginBottom: 30,
    },
    errorText: {
      color: colors.primary.coral,
      fontSize: 14,
      textAlign: 'center',
      marginVertical: 10,
      paddingHorizontal: 20,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 15,
    },
    loadingText: {
      marginLeft: 8,
      color: colors.neutral.midnight,
      fontSize: 14,
    },
  });

  return (
    <View style={styles.container} testID="login-screen">
      <Text style={styles.title}>Welcome to Pet Love Community</Text>
      
      <Input 
        label="Username" 
        value={username} 
        onChangeText={(text) => {
          setUsername(text);
          if (error) setError('');
        }}
        editable={!isLoading}
      />
      
      <Input
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (error) setError('');
        }}
        secureTextEntry
        editable={!isLoading}
      />
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      
      <Button 
        title={isLoading ? 'Logging in...' : 'Login'} 
        onPress={handleLogin}
        disabled={isLoading}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary.teal} />
          <Text style={[styles.loadingText, { color: colors.neutral.midnight }]}>Authenticating...</Text>
        </View>
      )}
    </View>
  );
};


export default LoginScreen;
