// Pet Love Community - Enterprise API Client
// Legacy API client for non-RTK Query usage

import { getEnterpriseHeaders } from '../utils/baseQuery';
import { generateIdempotencyKey } from '../transactions/transactionService';
import { API_CONFIG } from '../config/constants';

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
