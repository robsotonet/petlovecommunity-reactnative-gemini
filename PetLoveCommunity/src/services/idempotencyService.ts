import AsyncStorage from '@react-native-async-storage/async-storage';

const PROCESSED_IDS_KEY = 'PROCESSED_IDS';

class IdempotencyService {
  private processedIds: Set<string> = new Set();

  constructor() {
    this.loadProcessedIds();
  }

  private async loadProcessedIds() {
    const storedIds = await AsyncStorage.getItem(PROCESSED_IDS_KEY);
    if (storedIds) {
      this.processedIds = new Set(JSON.parse(storedIds));
    }
  }

  public async isProcessed(id: string): Promise<boolean> {
    return this.processedIds.has(id);
  }

  public async markAsProcessed(id: string) {
    this.processedIds.add(id);
    await AsyncStorage.setItem(PROCESSED_IDS_KEY, JSON.stringify(Array.from(this.processedIds)));
  }
}

export { IdempotencyService };

const idempotencyService = new IdempotencyService();
export default idempotencyService;
