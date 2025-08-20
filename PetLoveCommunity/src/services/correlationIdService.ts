import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const CORRELATION_ID_KEY = 'CORRELATION_ID';

class CorrelationIdService {
  private correlationId: string | null = null;

  public async getCorrelationId(): Promise<string> {
    if (this.correlationId) {
      return this.correlationId;
    }

    let storedId = await AsyncStorage.getItem(CORRELATION_ID_KEY);

    if (!storedId) {
      storedId = uuid.v4() as string;
      await AsyncStorage.setItem(CORRELATION_ID_KEY, storedId);
    }

    this.correlationId = storedId;
    return this.correlationId;
  }
}

const correlationIdService = new CorrelationIdService();
export default correlationIdService;
