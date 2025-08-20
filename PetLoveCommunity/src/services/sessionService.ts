import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { AppState, AppStateStatus } from 'react-native';

const SESSION_KEY = 'CURRENT_SESSION';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export interface SessionData {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  userId?: string;
  isActive: boolean;
  deviceId?: string;
}

export interface SessionMetrics {
  sessionDuration: number;
  pageViews: number;
  transactions: string[];
}

class SessionService {
  private currentSession: SessionData | null = null;
  private activityTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSession();
    this.setupAppStateListener();
  }

  private async initializeSession() {
    await this.loadStoredSession();
    if (!this.currentSession || !this.isSessionValid()) {
      await this.startNewSession();
    } else {
      this.updateSessionActivity();
    }
  }

  private setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground - update activity
      this.updateSessionActivity();
    } else if (nextAppState === 'background') {
      // App went to background - persist session
      this.persistSession();
    }
  };

  private async loadStoredSession(): Promise<void> {
    try {
      const storedSession = await AsyncStorage.getItem(SESSION_KEY);
      if (storedSession) {
        this.currentSession = JSON.parse(storedSession);
      }
    } catch (error) {
      console.error('Failed to load stored session:', error);
    }
  }

  private isSessionValid(): boolean {
    if (!this.currentSession) return false;
    
    const now = Date.now();
    const timeSinceLastActivity = now - this.currentSession.lastActivity;
    
    return timeSinceLastActivity < SESSION_TIMEOUT && this.currentSession.isActive;
  }

  private async startNewSession(): Promise<void> {
    const now = Date.now();
    this.currentSession = {
      sessionId: uuid.v4() as string,
      startTime: now,
      lastActivity: now,
      isActive: true,
    };

    await this.persistSession();
    this.scheduleInactivityCheck();
  }

  private async persistSession(): Promise<void> {
    if (!this.currentSession) return;

    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(this.currentSession));
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  }

  private scheduleInactivityCheck(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    this.activityTimer = setTimeout(() => {
      this.endSession();
    }, SESSION_TIMEOUT);
  }

  public async getCurrentSession(): Promise<SessionData> {
    if (!this.currentSession || !this.isSessionValid()) {
      await this.startNewSession();
    }

    return this.currentSession!;
  }

  public getSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }

  public updateSessionActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now();
      this.persistSession();
      this.scheduleInactivityCheck();
    }
  }

  public async associateUser(userId: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.userId = userId;
      await this.persistSession();
    }
  }

  public async associateDevice(deviceId: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.deviceId = deviceId;
      await this.persistSession();
    }
  }

  public startSession(): void {
    this.startNewSession();
  }

  public async endSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.isActive = false;
      await this.persistSession();
      
      if (this.activityTimer) {
        clearTimeout(this.activityTimer);
        this.activityTimer = null;
      }
    }
  }

  public trackTransaction(transactionId: string): void {
    if (this.currentSession) {
      // Update activity on transaction
      this.updateSessionActivity();
    }
  }

  public getSessionMetrics(): SessionMetrics | null {
    if (!this.currentSession) return null;

    const now = Date.now();
    const sessionDuration = now - this.currentSession.startTime;

    return {
      sessionDuration,
      pageViews: 0, // Could be enhanced to track page views
      transactions: [], // Could be enhanced to track transactions
    };
  }

  public async clearSession(): Promise<void> {
    this.currentSession = null;
    await AsyncStorage.removeItem(SESSION_KEY);
    
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
  }
}

const sessionService = new SessionService();
export default sessionService;
