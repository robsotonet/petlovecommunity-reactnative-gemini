// Pet Love Community - Base Query Utility
// Enterprise RTK Query base query with correlation tracking and headers

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import correlationIdService from '../services/correlationIdService';
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

// Export enterprise headers factory for legacy API client usage
export { getEnterpriseHeaders };