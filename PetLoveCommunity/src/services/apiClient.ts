import correlationIdService from './correlationIdService';

class ApiClient {
  private async getHeaders() {
    const correlationId = await correlationIdService.getCorrelationId();
    return {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    };
  }

  public async post(url: string, data: any) {
    const headers = await this.getHeaders();
    // In a real app, you would use fetch or another library to make the request
    console.log(`POST to ${url} with headers:`, headers);
    console.log('Body:', data);
    return Promise.resolve();
  }
}

const apiClient = new ApiClient();
export default apiClient;
