/**
 * Enterprise Logging System
 * Structured logging with multiple transports and security considerations
 */

import { config } from './config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  userId?: string;
  organizationId?: string;
  jobId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  stack?: string;
  performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
}

export interface LogTransport {
  name: string;
  level: LogLevel;
  write(entry: LogEntry): Promise<void>;
}

/**
 * Console Transport for development
 */
class ConsoleTransport implements LogTransport {
  name = 'console';
  level: LogLevel = 'debug';

  private getColorCode(level: LogLevel): string {
    switch (level) {
      case 'debug': return '\x1b[36m'; // Cyan
      case 'info': return '\x1b[32m';  // Green
      case 'warn': return '\x1b[33m';  // Yellow
      case 'error': return '\x1b[31m'; // Red
      case 'security': return '\x1b[35m'; // Magenta
      default: return '\x1b[0m';       // Reset
    }
  }

  async write(entry: LogEntry): Promise<void> {
    const color = this.getColorCode(entry.level);
    const reset = '\x1b[0m';
    
    const prefix = `${color}[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.service}]${reset}`;
    const message = `${prefix} ${entry.message}`;
    
    if (entry.level === 'error' || entry.level === 'security') {
      console.error(message);
      if (entry.stack) {
        console.error(entry.stack);
      }
    } else if (entry.level === 'warn') {
      console.warn(message);
    } else {
      console.log(message);
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log(`${color}  Metadata:${reset}`, JSON.stringify(entry.metadata, null, 2));
    }
  }
}

/**
 * File Transport for persistent logging
 */
class FileTransport implements LogTransport {
  name = 'file';
  level: LogLevel = 'info';
  private logPath: string;

  constructor(logPath: string = 'logs/application.log') {
    this.logPath = logPath;
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      // In a real implementation, this would write to actual files
      // For now, we'll use console with a file-like format
      const logLine = JSON.stringify(entry) + '\n';
      
      // In production, you'd write to actual files or send to logging service
      if (process.env.NODE_ENV === 'production') {
        // TODO: Implement actual file writing or send to logging service
        // e.g., AWS CloudWatch, Datadog, Splunk, etc.
        console.log(`[FILE_LOG] ${logLine}`);
      }
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }
}

/**
 * Remote Transport for external logging services
 */
class RemoteTransport implements LogTransport {
  name = 'remote';
  level: LogLevel = 'warn';
  private endpoint: string;
  private apiKey: string;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      // In production, send to external logging service
      if (process.env.NODE_ENV === 'production') {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(entry),
        });

        if (!response.ok) {
          throw new Error(`Remote logging failed: ${response.statusText}`);
        }
      }
    } catch (error) {
      // Fallback to console if remote logging fails
      console.error('Remote logging failed:', error);
      console.error('Log entry:', entry);
    }
  }
}

/**
 * Main Logger Class
 */
export class Logger {
  private static instance: Logger;
  private transports: LogTransport[] = [];
  private service: string;

  constructor(service: string = 'supaclone') {
    this.service = service;
    this.initializeTransports();
  }

  static getInstance(service?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(service);
    }
    return Logger.instance;
  }

  private initializeTransports(): void {
    // Always add console transport for development
    if (process.env.NODE_ENV === 'development') {
      this.addTransport(new ConsoleTransport());
    }

    // Add file transport for persistent logging
    this.addTransport(new FileTransport());

    // Add remote transport for production
    if (process.env.NODE_ENV === 'production' && process.env.LOG_ENDPOINT && process.env.LOG_API_KEY) {
      this.addTransport(new RemoteTransport(process.env.LOG_ENDPOINT, process.env.LOG_API_KEY));
    }
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }

  private shouldLog(level: LogLevel, transportLevel: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'security'];
    return levels.indexOf(level) >= levels.indexOf(transportLevel);
  }

  private async writeToTransports(entry: LogEntry): Promise<void> {
    const promises = this.transports
      .filter(transport => this.shouldLog(entry.level, transport.level))
      .map(transport => transport.write(entry).catch(error => {
        console.error(`Transport ${transport.name} failed:`, error);
      }));

    await Promise.allSettled(promises);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      metadata,
    };

    if (error) {
      entry.stack = error.stack;
    }

    // Add performance metrics if available
    if (process.memoryUsage) {
      const memUsage = process.memoryUsage();
      entry.performance = {
        memory: memUsage.heapUsed,
      };
    }

    return entry;
  }

  async debug(message: string, metadata?: Record<string, any>): Promise<void> {
    const entry = this.createLogEntry('debug', message, metadata);
    await this.writeToTransports(entry);
  }

  async info(message: string, metadata?: Record<string, any>): Promise<void> {
    const entry = this.createLogEntry('info', message, metadata);
    await this.writeToTransports(entry);
  }

  async warn(message: string, metadata?: Record<string, any>): Promise<void> {
    const entry = this.createLogEntry('warn', message, metadata);
    await this.writeToTransports(entry);
  }

  async error(message: string, error?: Error, metadata?: Record<string, any>): Promise<void> {
    const entry = this.createLogEntry('error', message, metadata, error);
    await this.writeToTransports(entry);
  }

  async security(message: string, metadata?: Record<string, any>): Promise<void> {
    const entry = this.createLogEntry('security', message, metadata);
    await this.writeToTransports(entry);
  }

  /**
   * Create child logger with additional context
   */
  child(context: { userId?: string; organizationId?: string; jobId?: string; requestId?: string }): Logger {
    const childLogger = new Logger(this.service);
    childLogger.transports = this.transports;

    // Override createLogEntry to include context
    const originalCreateLogEntry = childLogger.createLogEntry.bind(childLogger);
    childLogger.createLogEntry = (level, message, metadata, error) => {
      const entry = originalCreateLogEntry(level, message, metadata, error);
      return { ...entry, ...context };
    };

    return childLogger;
  }

  /**
   * Log with performance timing
   */
  async withTiming<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      await this.debug(`Starting ${operation}`, metadata);
      const result = await fn();
      
      const duration = Date.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;

      await this.info(`Completed ${operation}`, {
        ...metadata,
        performance: { duration, memoryDelta },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.error(`Failed ${operation}`, error as Error, {
        ...metadata,
        performance: { duration },
      });
      throw error;
    }
  }

  /**
   * Batch logging for high-frequency operations
   */
  private logBatch: LogEntry[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  batchLog(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(level, message, metadata);
    this.logBatch.push(entry);

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
    }, 1000); // Flush every second

    // Flush immediately if batch gets too large
    if (this.logBatch.length >= 100) {
      this.flushBatch();
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.logBatch.length === 0) return;

    const batch = [...this.logBatch];
    this.logBatch = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Write all batch entries
    await Promise.allSettled(
      batch.map(entry => this.writeToTransports(entry))
    );
  }

  /**
   * Graceful shutdown - flush all pending logs
   */
  async shutdown(): Promise<void> {
    await this.flushBatch();
    await this.info('Logger shutdown completed');
  }
}

// Create default logger instance
export const logger = Logger.getInstance();

// Export convenience functions
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const security = logger.security.bind(logger);

// Setup process event handlers for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await logger.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await logger.shutdown();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    await logger.error('Uncaught Exception', error);
    await logger.shutdown();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    await logger.error('Unhandled Rejection', reason as Error, { promise: promise.toString() });
  });
}
