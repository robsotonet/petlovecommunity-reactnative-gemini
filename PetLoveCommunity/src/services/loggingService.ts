// Pet Love Community - Logging Service
// Enterprise logging service with configurable levels and production safety

import { ENV } from '../config/constants';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  correlationId?: string;
}

class LoggingService {
  private logLevel: LogLevel;
  private enableConsoleOutput: boolean;
  private logQueue: LogEntry[] = [];
  private maxQueueSize: number = 100;

  constructor() {
    // Configure based on environment
    this.logLevel = ENV.IS_DEV ? LogLevel.DEBUG : LogLevel.WARN;
    this.enableConsoleOutput = ENV.IS_DEV;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      context,
      metadata,
      timestamp: new Date().toISOString(),
    };
  }

  private addToQueue(entry: LogEntry): void {
    this.logQueue.push(entry);
    
    // Maintain queue size limit
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue.shift();
    }
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const prefix = entry.context ? `[${entry.context}]` : '';
    const metadataStr = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    return `${prefix} ${entry.message}${metadataStr}`;
  }

  private outputToConsole(entry: LogEntry): void {
    if (!this.enableConsoleOutput) return;

    const message = this.formatConsoleMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, metadata);
    this.addToQueue(entry);
    this.outputToConsole(entry);

    // In production, you might want to send logs to a remote service
    // this.sendToRemoteService(entry);
  }

  public debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  public info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  public warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  public error(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, metadata);
  }

  // Analytics-specific methods with controlled verbosity
  public logAnalyticsWarning(message: string, metadata?: Record<string, any>): void {
    // In production, reduce frequency by only logging every nth occurrence
    if (!ENV.IS_DEV) {
      // Implement throttling logic here if needed
      // For now, just log as debug level in production
      this.debug(message, 'Analytics', metadata);
    } else {
      this.warn(message, 'Analytics', metadata);
    }
  }

  public logAnalyticsError(message: string, metadata?: Record<string, any>): void {
    this.error(message, 'Analytics', metadata);
  }

  public logAnalyticsInfo(message: string, metadata?: Record<string, any>): void {
    this.info(message, 'Analytics', metadata);
  }

  // Utility methods
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public enableConsole(enable: boolean): void {
    this.enableConsoleOutput = enable;
  }

  public getRecentLogs(count: number = 50): LogEntry[] {
    return this.logQueue.slice(-count);
  }

  public clearLogs(): void {
    this.logQueue = [];
  }

  // Performance logging for critical paths
  public logPerformance(
    operation: string,
    duration: number,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.info(
      `Performance: ${operation} completed in ${duration}ms`,
      context || 'Performance',
      { duration, ...metadata }
    );
  }
}

const loggingService = new LoggingService();
export default loggingService;