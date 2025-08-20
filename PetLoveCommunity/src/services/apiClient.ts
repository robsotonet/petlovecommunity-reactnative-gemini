// Pet Love Community - Enterprise API Client
// RTK Query base client with enterprise headers and correlation tracking

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import correlationIdService from './correlationIdService';
import { generateTransactionId, generateIdempotencyKey } from '../transactions/transactionService';
import { API_CONFIG, ENV } from '../config/constants';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

// Enterprise headers factory
const getEnterpriseHeaders = async (): Promise<Record<string, string>> => {
  const correlationId = await correlationIdService.getCorrelationId();
  const deviceId = await DeviceInfo.getUniqueId();
  const appVersion = DeviceInfo.getVersion();
  
  return {
    'X-Correlation-ID': correlationId,
    'X-Transaction-ID': generateTransactionId(),
    'X-Device-ID': deviceId,
    'X-Platform': Platform.OS,
    'X-App-Version': appVersion,
    'Content-Type': 'application/json',
  };
};

// Base query with enterprise headers
export const baseQueryWithEnterpriseHeaders: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const enterpriseHeaders = await getEnterpriseHeaders();
  
  // Create base query with enterprise configuration
  const baseQuery = fetchBaseQuery({
    baseUrl: API_CONFIG.BASE_URL,
    prepareHeaders: async (headers, { getState }) => {
      // Add enterprise headers
      Object.entries(enterpriseHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      // Add authentication if available
      const state = getState() as any;
      const token = state.auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // Add idempotency key for POST/PUT/PATCH requests
      const method = typeof args === 'string' ? 'GET' : args.method;
      if (method && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        headers.set('X-Idempotency-Key', generateIdempotencyKey());
      }

      return headers;
    },
    timeout: API_CONFIG.TIMEOUT,
  });

  const result = await baseQuery(args, api, extraOptions);

  // Log enterprise tracking information
  if (ENV.IS_DEV) {
    console.log('API Request:', {
      url: typeof args === 'string' ? args : args.url,
      method: typeof args === 'string' ? 'GET' : args.method,
      correlationId: enterpriseHeaders['X-Correlation-ID'],
      transactionId: enterpriseHeaders['X-Transaction-ID'],
    });
  }

  return result;
};

// Legacy API Client for non-RTK Query usage
class ApiClient {
  private async getHeaders() {
    const enterpriseHeaders = await getEnterpriseHeaders();
    return enterpriseHeaders;
  }

  public async get(url: string) {
    const headers = await this.getHeaders();
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
        method: 'GET',
        headers,
      });
      
      return await response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  }

  public async post(url: string, data: any) {
    const headers = await this.getHeaders();
    headers['X-Idempotency-Key'] = generateIdempotencyKey();
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      
      return await response.json();
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }

  public async put(url: string, data: any) {
    const headers = await this.getHeaders();
    headers['X-Idempotency-Key'] = generateIdempotencyKey();
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      
      return await response.json();
    } catch (error) {
      console.error('API PUT Error:', error);
      throw error;
    }
  }

  public async delete(url: string) {
    const headers = await this.getHeaders();
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
        method: 'DELETE',
        headers,
      });
      
      return await response.json();
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  }
}

const apiClient = new ApiClient();
export default apiClient;
