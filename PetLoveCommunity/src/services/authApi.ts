// Pet Love Community - Authentication API Service
// Handles server-side authentication with enterprise patterns

import apiClient from './apiClient';
import { API_CONFIG } from '../config/constants';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user?: {
    id: string;
    username: string;
    email: string;
    displayName: string;
  };
  expiresAt: string;
}

export interface AuthError {
  message: string;
  code: string;
  details?: any;
}

class AuthApi {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Input validation - Security Fix
      if (!credentials.username || credentials.username.trim().length === 0) {
        throw new Error('Username is required');
      }
      
      if (!credentials.password || credentials.password.trim().length === 0) {
        throw new Error('Password is required');
      }
      
      // Additional security validation
      if (credentials.username.trim().length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }
      
      if (credentials.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // Sanitize inputs
      const sanitizedUsername = credentials.username.trim().toLowerCase();
      const sanitizedCredentials = {
        username: sanitizedUsername,
        password: credentials.password
      };
      
      console.log('AuthApi: Attempting server authentication for:', sanitizedCredentials.username);
      
      // For development/demo purposes, simulate different response scenarios
      if (sanitizedCredentials.username === 'demo' && sanitizedCredentials.password === 'demo123') {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return {
          success: true,
          token: 'demo_jwt_token_' + Date.now(),
          user: {
            id: 'demo_user_123',
            username: sanitizedCredentials.username,
            email: 'demo@petlovecommunity.com',
            displayName: 'Demo User',
          },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        };
      }
      
      // Simulate API validation failure for invalid credentials
      if (sanitizedCredentials.username === 'invalid' || sanitizedCredentials.password === 'wrongpass') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error('Invalid username or password');
      }
      
      // For any other credentials, simulate successful login
      // In production, this would make a real API call to your authentication endpoint
      const response = await this.simulateApiCall(sanitizedCredentials);
      
      console.log('AuthApi: Authentication successful');
      return response;
      
    } catch (error) {
      // Log security violations for monitoring
      if (error instanceof Error) {
        if (error.message.includes('Username is required') || 
            error.message.includes('Password is required') ||
            error.message.includes('must be at least')) {
          console.warn('AuthApi: Input validation failed:', {
            username: credentials?.username ? '[PROVIDED]' : '[EMPTY]',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('AuthApi: Authentication failed:', error.message);
        }
        throw error;
      }
      
      console.error('AuthApi: Unexpected authentication error:', error);
      throw new Error('Authentication service unavailable. Please try again later.');
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // Input validation for logout
      if (!token || token.trim().length === 0) {
        console.warn('AuthApi: Logout attempted with empty token');
        return; // Allow logout to proceed for security (local cleanup)
      }
      
      console.log('AuthApi: Logging out user');
      
      // Simulate logout API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('AuthApi: Logout successful');
    } catch (error) {
      console.error('AuthApi: Logout failed:', error);
      // Don't throw logout errors - allow local logout to proceed
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      console.log('AuthApi: Validating token');
      
      // Simulate token validation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // For demo purposes, consider all non-empty tokens valid
      const isValid = !!token && token.length > 10;
      
      console.log('AuthApi: Token validation result:', isValid);
      return isValid;
      
    } catch (error) {
      console.error('AuthApi: Token validation failed:', error);
      return false;
    }
  }

  private async simulateApiCall(credentials: LoginRequest): Promise<LoginResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Mock successful response for any valid-looking credentials
    return {
      success: true,
      token: 'jwt_token_' + btoa(credentials.username) + '_' + Date.now(),
      user: {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        username: credentials.username,
        email: `${credentials.username}@petlovecommunity.com`,
        displayName: credentials.username.charAt(0).toUpperCase() + credentials.username.slice(1),
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // In production, this would make actual API calls like:
  /*
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', credentials);
    return response;
  }

  async logout(token: string): Promise<void> {
    await apiClient.post('/auth/logout', { token });
  }

  async validateToken(token: string): Promise<boolean> {
    const response = await apiClient.post('/auth/validate', { token });
    return response.valid;
  }
  */
}

const authApi = new AuthApi();
export default authApi;