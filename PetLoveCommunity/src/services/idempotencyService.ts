import AsyncStorage from '@react-native-async-storage/async-storage';

const PROCESSED_IDS_KEY = 'PROCESSED_IDS';

class IdempotencyService {
  private processedIds: Set<string> = new Set();
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.loadPromise = this.loadProcessedIds();
  }

  private async loadProcessedIds(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      const storedIds = await AsyncStorage.getItem(PROCESSED_IDS_KEY);
      if (storedIds) {
        this.processedIds = new Set(JSON.parse(storedIds));
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load processed IDs:', error);
      this.processedIds = new Set();
      this.isLoaded = true;
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loadPromise) {
      await this.loadPromise;
      this.loadPromise = null;
    }
  }

  public async isProcessed(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.processedIds.has(id);
  }

  public async markAsProcessed(id: string) {
    await this.ensureLoaded();
    this.processedIds.add(id);
    await AsyncStorage.setItem(PROCESSED_IDS_KEY, JSON.stringify(Array.from(this.processedIds)));
  }
}

export { IdempotencyService };

const idempotencyService = new IdempotencyService();
export default idempotencyService;
