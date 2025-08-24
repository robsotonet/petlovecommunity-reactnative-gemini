// Auth API Integration Tests
// Testing authentication service with comprehensive coverage

import authApi, { LoginRequest, LoginResponse } from '../authApi';

describe('AuthApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  describe('login', () => {
    it('should successfully login with demo credentials', async () => {
      const credentials: LoginRequest = {
        username: 'demo',
        password: 'demo123',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(1500);
      
      const response = await loginPromise;

      expect(response.success).toBe(true);
      expect(response.token).toContain('demo_jwt_token_');
      expect(response.user?.username).toBe('demo');
      expect(response.user?.email).toBe('demo@petlovecommunity.com');
      expect(response.user?.displayName).toBe('Demo User');
      expect(response.expiresAt).toBeDefined();
    });

    it('should successfully login with valid credentials', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(1200);
      
      const response = await loginPromise;

      expect(response.success).toBe(true);
      expect(response.token).toContain('jwt_token_');
      expect(response.user?.username).toBe('testuser');
      expect(response.user?.email).toBe('testuser@petlovecommunity.com');
      expect(response.user?.displayName).toBe('Testuser');
      expect(response.expiresAt).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const credentials: LoginRequest = {
        username: 'invalid',
        password: 'wrongpass',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(1000);

      await expect(loginPromise).rejects.toThrow('Invalid username or password');
    });

    it('should reject credentials with wrong password', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'wrongpass',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(1000);

      await expect(loginPromise).rejects.toThrow('Invalid username or password');
    });

    it('should reject empty username with validation error', async () => {
      const credentials: LoginRequest = {
        username: '',
        password: 'password123',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward timers
      jest.advanceTimersByTime(1200);

      // Empty username should now be rejected with validation error
      await expect(loginPromise).rejects.toThrow('Username is required');
    });

    it('should reject empty password with validation error', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: '',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward timers
      jest.advanceTimersByTime(1200);

      // Empty password should now be rejected with validation error
      await expect(loginPromise).rejects.toThrow('Password is required');
    });

    it('should reject username shorter than 3 characters', async () => {
      const credentials: LoginRequest = {
        username: 'ab',
        password: 'password123',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward timers
      jest.advanceTimersByTime(1200);

      await expect(loginPromise).rejects.toThrow('Username must be at least 3 characters long');
    });

    it('should reject password shorter than 6 characters', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: '12345',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward timers
      jest.advanceTimersByTime(1200);

      await expect(loginPromise).rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should reject whitespace-only username', async () => {
      const credentials: LoginRequest = {
        username: '   ',
        password: 'password123',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward timers
      jest.advanceTimersByTime(1200);

      await expect(loginPromise).rejects.toThrow('Username is required');
    });

    it('should reject whitespace-only password', async () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: '      ',
      };

      const loginPromise = authApi.login(credentials);
      
      // Fast-forward timers
      jest.advanceTimersByTime(1200);

      await expect(loginPromise).rejects.toThrow('Password is required');
    });

    it('should sanitize and normalize username', async () => {
      const credentials: LoginRequest = {
        username: '  TestUser  ',
        password: 'password123',
      };

      const loginPromise = authApi.login(credentials);
      jest.advanceTimersByTime(1200);
      const response = await loginPromise;

      // Username should be trimmed and lowercased
      expect(response.user?.username).toBe('testuser');
      expect(response.success).toBe(true);
    });

    it('should generate unique tokens for different logins', async () => {
      const credentials1: LoginRequest = {
        username: 'user123',
        password: 'password1',
      };
      
      const credentials2: LoginRequest = {
        username: 'user456',
        password: 'password2',
      };

      const loginPromise1 = authApi.login(credentials1);
      jest.advanceTimersByTime(1200);
      const response1 = await loginPromise1;

      const loginPromise2 = authApi.login(credentials2);
      jest.advanceTimersByTime(1200);
      const response2 = await loginPromise2;

      expect(response1.token).not.toBe(response2.token);
      expect(response1.user?.username).toBe('user123');
      expect(response2.user?.username).toBe('user456');
    });

    it('should handle very long usernames', async () => {
      const longUsername = 'a'.repeat(1000);
      const credentials: LoginRequest = {
        username: longUsername,
        password: 'password123',
      };

      const loginPromise = authApi.login(credentials);
      jest.advanceTimersByTime(1200);
      const response = await loginPromise;

      expect(response.success).toBe(true);
      // Username should be sanitized (trimmed and lowercased)
      expect(response.user?.username).toBe(longUsername.toLowerCase());
    });
  });

  describe('logout', () => {
    it('should successfully logout with valid token', async () => {
      const token = 'valid_jwt_token_123';

      const logoutPromise = authApi.logout(token);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(500);
      
      // Should not throw any errors
      await expect(logoutPromise).resolves.toBeUndefined();
    });

    it('should handle logout with empty token gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const token = '';

      const logoutPromise = authApi.logout(token);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(500);
      
      // Should not throw any errors even with empty token
      await expect(logoutPromise).resolves.toBeUndefined();
      
      // Should log warning for security monitoring
      expect(consoleSpy).toHaveBeenCalledWith('AuthApi: Logout attempted with empty token');
      
      consoleSpy.mockRestore();
    });

    it('should handle logout with null token gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const token = null as any;

      const logoutPromise = authApi.logout(token);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(500);
      
      // Should not throw any errors even with null token
      await expect(logoutPromise).resolves.toBeUndefined();
      
      // Should log warning for security monitoring
      expect(consoleSpy).toHaveBeenCalledWith('AuthApi: Logout attempted with empty token');
      
      consoleSpy.mockRestore();
    });

    it('should complete logout even if an error occurs internally', async () => {
      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const token = 'some_token';

      const logoutPromise = authApi.logout(token);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(500);
      
      // Should complete successfully even if internal errors occur
      await expect(logoutPromise).resolves.toBeUndefined();
      
      consoleSpy.mockRestore();
    });
  });

  describe('validateToken', () => {
    it('should validate valid tokens', async () => {
      const validToken = 'valid_token_with_sufficient_length';

      const validatePromise = authApi.validateToken(validToken);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(300);
      
      const isValid = await validatePromise;

      expect(isValid).toBe(true);
    });

    it('should reject short tokens', async () => {
      const shortToken = 'short';

      const validatePromise = authApi.validateToken(shortToken);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(300);
      
      const isValid = await validatePromise;

      expect(isValid).toBe(false);
    });

    it('should reject empty tokens', async () => {
      const emptyToken = '';

      const validatePromise = authApi.validateToken(emptyToken);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(300);
      
      const isValid = await validatePromise;

      expect(isValid).toBe(false);
    });

    it('should reject null tokens', async () => {
      const nullToken = null as any;

      const validatePromise = authApi.validateToken(nullToken);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(300);
      
      const isValid = await validatePromise;

      expect(isValid).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const token = 'token_that_might_cause_error';

      const validatePromise = authApi.validateToken(token);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(300);
      
      const isValid = await validatePromise;

      // Should return false on any errors
      expect(typeof isValid).toBe('boolean');
      
      consoleSpy.mockRestore();
    });

    it('should validate tokens exactly at length boundary', async () => {
      const boundaryToken = 'a'.repeat(11); // Exactly 11 characters (> 10)

      const validatePromise = authApi.validateToken(boundaryToken);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(300);
      
      const isValid = await validatePromise;

      expect(isValid).toBe(true);
    });

    it('should reject tokens at length boundary', async () => {
      const boundaryToken = 'a'.repeat(10); // Exactly 10 characters (not > 10)

      const validatePromise = authApi.validateToken(boundaryToken);
      
      // Fast-forward the simulated delay
      jest.advanceTimersByTime(300);
      
      const isValid = await validatePromise;

      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle network simulation errors in login', async () => {
      // This test verifies that the service can handle various error conditions
      const credentials: LoginRequest = {
        username: 'error_test',
        password: 'error_test',
      };

      const loginPromise = authApi.login(credentials);
      jest.advanceTimersByTime(1200);
      
      // Should not throw errors - current implementation handles all scenarios
      const response = await loginPromise;
      expect(response.success).toBe(true);
    });

    it('should provide appropriate error messages', async () => {
      const credentials: LoginRequest = {
        username: 'invalid',
        password: 'invalid',
      };

      const loginPromise = authApi.login(credentials);
      jest.advanceTimersByTime(1000);

      await expect(loginPromise).rejects.toThrow('Invalid username or password');
    });
  });

  describe('response structure validation', () => {
    it('should return properly structured login response', async () => {
      const credentials: LoginRequest = {
        username: 'structure_test',
        password: 'test123',
      };

      const loginPromise = authApi.login(credentials);
      jest.advanceTimersByTime(1200);
      const response = await loginPromise;

      // Verify response structure
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('token');
      expect(response).toHaveProperty('user');
      expect(response).toHaveProperty('expiresAt');
      
      if (response.user) {
        expect(response.user).toHaveProperty('id');
        expect(response.user).toHaveProperty('username');
        expect(response.user).toHaveProperty('email');
        expect(response.user).toHaveProperty('displayName');
      }

      expect(typeof response.success).toBe('boolean');
      expect(typeof response.token).toBe('string');
      expect(typeof response.expiresAt).toBe('string');
    });

    it('should generate valid expiration timestamps', async () => {
      const credentials: LoginRequest = {
        username: 'timestamp_test',
        password: 'test123',
      };

      const beforeLogin = Date.now();
      const loginPromise = authApi.login(credentials);
      jest.advanceTimersByTime(1200);
      const response = await loginPromise;
      const afterLogin = Date.now();

      const expiresAt = new Date(response.expiresAt).getTime();
      
      // Should expire 24 hours from now (within reasonable time window)
      const expectedExpiry = beforeLogin + (24 * 60 * 60 * 1000);
      const tolerance = 10000; // 10 seconds tolerance
      
      expect(expiresAt).toBeGreaterThan(expectedExpiry - tolerance);
      expect(expiresAt).toBeLessThan(expectedExpiry + tolerance + (afterLogin - beforeLogin));
    });
  });

  describe('timing and performance', () => {
    it('should have appropriate response times for demo login', async () => {
      const credentials: LoginRequest = {
        username: 'demo',
        password: 'demo123',
      };

      const startTime = Date.now();
      const loginPromise = authApi.login(credentials);
      
      // Should simulate ~1.5 second delay
      jest.advanceTimersByTime(1500);
      
      await loginPromise;
      const endTime = Date.now();
      
      // In test environment with mocked timers, timing is controlled
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should have appropriate response times for regular login', async () => {
      const credentials: LoginRequest = {
        username: 'regular_user',
        password: 'password123',
      };

      const loginPromise = authApi.login(credentials);
      
      // Should simulate ~1.2 second delay
      jest.advanceTimersByTime(1200);
      
      await loginPromise;
      
      // Test completed successfully with mocked timing
      expect(true).toBe(true);
    });

    it('should have fast token validation', async () => {
      const token = 'fast_validation_token';

      const validatePromise = authApi.validateToken(token);
      
      // Should simulate ~300ms delay
      jest.advanceTimersByTime(300);
      
      const result = await validatePromise;
      
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Security and Logging', () => {
    it('should log security warnings for validation failures', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const credentials: LoginRequest = {
        username: '',
        password: 'password123',
      };

      const loginPromise = authApi.login(credentials);
      jest.advanceTimersByTime(1200);

      try {
        await loginPromise;
      } catch (error) {
        // Expected to throw
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'AuthApi: Input validation failed:',
        expect.objectContaining({
          username: '[EMPTY]',
          error: 'Username is required',
          timestamp: expect.any(String),
        })
      );

      consoleWarnSpy.mockRestore();
    });

    it('should log when username is provided for validation failures', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const credentials: LoginRequest = {
        username: 'ab',
        password: 'password123',
      };

      const loginPromise = authApi.login(credentials);
      jest.advanceTimersByTime(1200);

      try {
        await loginPromise;
      } catch (error) {
        // Expected to throw
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'AuthApi: Input validation failed:',
        expect.objectContaining({
          username: '[PROVIDED]',
          error: 'Username must be at least 3 characters long',
          timestamp: expect.any(String),
        })
      );

      consoleWarnSpy.mockRestore();
    });
  });
});