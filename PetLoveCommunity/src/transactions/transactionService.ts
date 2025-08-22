import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';

interface Transaction {
  id: string;
  payload: any;
  // Add other relevant transaction metadata here
}

class TransactionService {
  private queue: Transaction[] = [];
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.loadPromise = this.loadQueue();
  }

  private async loadQueue(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      const storedQueue = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTION_QUEUE);
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load transaction queue:', error);
      this.queue = [];
      this.isLoaded = true;
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loadPromise) {
      await this.loadPromise;
      this.loadPromise = null;
    }
  }

  public async addTransaction(payload: any) {
    await this.ensureLoaded();
    // TODO: Add logic to add a transaction to the queue
    // and save the queue to AsyncStorage
  }

  public async processQueue() {
    await this.ensureLoaded();
    // TODO: Add logic to process the transaction queue
    // This should be called when the app comes online
  }

  public async getQueue(): Promise<Transaction[]> {
    await this.ensureLoaded();
    return this.queue;
  }
}

// Utility functions for enterprise features
export const generateTransactionId = (): string => {
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

export const generateIdempotencyKey = (): string => {
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

export { TransactionService };

const transactionService = new TransactionService();
export default transactionService;
