/**
 * RestifiedLogger - Core Logger Implementation
 * 
 * This module provides a comprehensive logging system with structured logging,
 * multiple transports, filtering, and performance monitoring capabilities.
 */

import { EventEmitter } from 'events';
import { 
  Logger, 
  LogEntry, 
  LogLevel, 
  LogTransport, 
  LogFormatter, 
  LoggerConfig, 
  LogTimer, 
  LogContext,
  LogFilter,
  LogMiddleware,
  LogEvent,
  LogEventHandler,
  LogSamplingConfig,
  LogBufferConfig
} from './LoggingTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Timer implementation
 */
class RestifiedLogTimer implements LogTimer {
  public readonly name: string;
  public readonly startTime: Date;
  private logger: RestifiedLogger;

  constructor(name: string, logger: RestifiedLogger) {
    this.name = name;
    this.startTime = new Date();
    this.logger = logger;
  }

  end(message?: string, level: LogLevel = LogLevel.INFO): void {
    const duration = this.getDuration();
    const logMessage = message || `Timer '${this.name}' completed`;
    
    this.logger.log(level, logMessage, {
      timer: this.name,
      duration,
      startTime: this.startTime,
      endTime: new Date()
    });
  }

  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }
}

/**
 * Core logger implementation
 */
export class RestifiedLogger extends EventEmitter implements Logger {
  private config: Required<LoggerConfig>;
  private transports: Map<string, LogTransport> = new Map();
  private formatters: Map<string, LogFormatter> = new Map();
  private context: LogContext = {};
  private filters: LogFilter[] = [];
  private middleware: LogMiddleware[] = [];
  private buffer: LogEntry[] = [];
  private bufferTimer?: NodeJS.Timeout;
  private samplingConfig?: LogSamplingConfig;
  private bufferConfig?: LogBufferConfig;
  private isShuttingDown = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    super();
    
    this.config = {
      level: LogLevel.INFO,
      context: '',
      defaultMetadata: {},
      transports: [],
      formatters: {},
      enableConsole: true,
      enableFile: false,
      enableJSON: false,
      fileOptions: {
        filename: 'restifiedts.log',
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        rotationPattern: 'yyyy-MM-dd'
      },
      consoleOptions: {
        colorize: true,
        timestamp: true,
        prettyPrint: true
      },
      ...config
    };

    this.initializeDefaultTransports();
    this.setupBuffering();
    this.setupShutdownHandlers();
  }

  /**
   * Log at trace level
   */
  trace(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, metadata);
  }

  /**
   * Log at debug level
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log at info level
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log at warn level
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const combinedMetadata = { ...metadata };
    if (error) {
      combinedMetadata.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    this.log(LogLevel.ERROR, message, combinedMetadata, error);
  }

  /**
   * Log at fatal level
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    const combinedMetadata = { ...metadata };
    if (error) {
      combinedMetadata.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    this.log(LogLevel.FATAL, message, combinedMetadata, error);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string, metadata?: Record<string, any>): Logger {
    const childLogger = new RestifiedLogger({
      ...this.config,
      context: this.config.context ? `${this.config.context}:${context}` : context,
      defaultMetadata: { ...this.config.defaultMetadata, ...metadata }
    });

    // Copy transports and formatters
    this.transports.forEach((transport, name) => {
      childLogger.addTransport(transport);
    });

    this.formatters.forEach((formatter, name) => {
      childLogger.formatters.set(name, formatter);
    });

    return childLogger;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Check if level is enabled
   */
  isEnabled(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Start a timer
   */
  startTimer(name: string): LogTimer {
    return new RestifiedLogTimer(name, this);
  }

  /**
   * Add a transport
   */
  addTransport(transport: LogTransport): void {
    this.transports.set(transport.name, transport);
  }

  /**
   * Remove a transport
   */
  removeTransport(name: string): boolean {
    return this.transports.delete(name);
  }

  /**
   * Add a formatter
   */
  addFormatter(name: string, formatter: LogFormatter): void {
    this.formatters.set(name, formatter);
  }

  /**
   * Add a filter
   */
  addFilter(filter: LogFilter): void {
    this.filters.push(filter);
  }

  /**
   * Remove a filter
   */
  removeFilter(name: string): boolean {
    const index = this.filters.findIndex(f => f.name === name);
    if (index !== -1) {
      this.filters.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware: LogMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Remove middleware
   */
  removeMiddleware(name: string): boolean {
    const index = this.middleware.findIndex(m => m.name === name);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Set logging context
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear logging context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Configure sampling
   */
  configureSampling(config: LogSamplingConfig): void {
    this.samplingConfig = config;
  }

  /**
   * Configure buffering
   */
  configureBuffering(config: LogBufferConfig): void {
    this.bufferConfig = config;
    this.setupBuffering();
  }

  /**
   * Add event handler
   */
  onEvent(handler: LogEventHandler): void {
    this.on('log-event', handler);
  }

  /**
   * Remove event handler
   */
  offEvent(handler: LogEventHandler): void {
    this.off('log-event', handler);
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    // Flush buffer first
    if (this.buffer.length > 0) {
      await this.flushBuffer();
    }

    // Flush all transports
    const promises: Promise<void>[] = [];
    this.transports.forEach(transport => {
      if (transport.flush) {
        promises.push(Promise.resolve(transport.flush()));
      }
    });

    await Promise.all(promises);
    this.emitEvent('flush', {});
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    this.isShuttingDown = true;

    // Flush buffer before closing
    await this.flush();

    // Close all transports
    const promises: Promise<void>[] = [];
    this.transports.forEach(transport => {
      if (transport.close) {
        promises.push(Promise.resolve(transport.close()));
      }
    });

    await Promise.all(promises);

    // Clear timers
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
    }
  }

  /**
   * Core logging method
   */
  public log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    if (!this.isEnabled(level) || this.isShuttingDown) {
      return;
    }

    // Apply sampling
    if (this.samplingConfig && !this.shouldSample(level, metadata)) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.config.context,
      metadata: {
        ...this.config.defaultMetadata,
        ...this.context,
        ...metadata
      },
      error,
      stack: error?.stack,
      source: 'RestifiedTS'
    };

    // Apply filters
    if (!this.passesFilters(entry)) {
      return;
    }

    // Apply middleware
    this.processMiddleware(entry).then(processedEntry => {
      if (this.bufferConfig?.enabled) {
        this.addToBuffer(processedEntry);
      } else {
        this.writeToTransports(processedEntry);
      }
    }).catch(error => {
      this.emitEvent('error', { error });
    });
  }

  /**
   * Check if entry should be sampled
   */
  private shouldSample(level: LogLevel, metadata?: Record<string, any>): boolean {
    if (!this.samplingConfig || !this.samplingConfig.enabled) {
      return true;
    }

    // Check specific rules first
    for (const rule of this.samplingConfig.rules) {
      if (rule.level === level) {
        if (rule.context && this.config.context !== rule.context) {
          continue;
        }
        if (rule.metadata && !this.matchesMetadata(metadata, rule.metadata)) {
          continue;
        }
        return Math.random() < rule.rate;
      }
    }

    // Use default rate
    return Math.random() < this.samplingConfig.rate;
  }

  /**
   * Check if metadata matches criteria
   */
  private matchesMetadata(metadata?: Record<string, any>, criteria?: Record<string, any>): boolean {
    if (!criteria || !metadata) {
      return true;
    }

    return Object.entries(criteria).every(([key, value]) => {
      return metadata[key] === value;
    });
  }

  /**
   * Check if entry passes all filters
   */
  private passesFilters(entry: LogEntry): boolean {
    return this.filters.every(filter => {
      return !filter.enabled || filter.filter(entry);
    });
  }

  /**
   * Process middleware
   */
  private async processMiddleware(entry: LogEntry): Promise<LogEntry> {
    let processedEntry = entry;

    for (const middleware of this.middleware) {
      if (middleware.enabled) {
        try {
          processedEntry = await Promise.resolve(middleware.process(processedEntry));
        } catch (error) {
          this.emitEvent('error', { error, middleware: middleware.name });
        }
      }
    }

    return processedEntry;
  }

  /**
   * Add entry to buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);

    // Check if buffer should be flushed
    if (this.bufferConfig) {
      const shouldFlush = this.buffer.length >= this.bufferConfig.size ||
                         (this.bufferConfig.flushOnLevel && entry.level >= this.bufferConfig.flushOnLevel);

      if (shouldFlush) {
        this.flushBuffer();
      }
    }
  }

  /**
   * Flush buffer
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    for (const entry of entries) {
      this.writeToTransports(entry);
    }
  }

  /**
   * Write to all transports
   */
  private writeToTransports(entry: LogEntry): void {
    this.transports.forEach(transport => {
      if (transport.enabled && entry.level >= transport.level) {
        try {
          Promise.resolve(transport.write(entry)).catch(error => {
            this.emitEvent('error', { error, transport: transport.name });
          });
        } catch (error) {
          this.emitEvent('error', { error, transport: transport.name });
        }
      }
    });

    this.emitEvent('entry', entry);
  }

  /**
   * Emit log event
   */
  private emitEvent(type: string, data: any): void {
    const event: LogEvent = {
      type: type as any,
      timestamp: new Date(),
      data
    };

    this.emit('log-event', event);
  }

  /**
   * Initialize default transports
   */
  private initializeDefaultTransports(): void {
    if (this.config.enableConsole) {
      this.addTransport({
        name: 'console',
        level: this.config.level,
        enabled: true,
        write: (entry: LogEntry) => {
          const formatted = this.formatForConsole(entry);
          if (entry.level >= LogLevel.ERROR) {
            console.error(formatted);
          } else {
            console.log(formatted);
          }
        }
      });
    }
  }

  /**
   * Format entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const { colorize, timestamp, prettyPrint } = this.config.consoleOptions;
    
    let formatted = '';
    
    if (timestamp) {
      formatted += `[${entry.timestamp.toISOString()}] `;
    }
    
    const levelStr = LogLevel[entry.level].padEnd(5);
    if (colorize) {
      formatted += this.colorizeLevel(levelStr, entry.level);
    } else {
      formatted += levelStr;
    }
    
    if (entry.context) {
      formatted += ` [${entry.context}]`;
    }
    
    formatted += `: ${entry.message}`;
    
    if (prettyPrint && entry.metadata && Object.keys(entry.metadata).length > 0) {
      formatted += `\n${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    if (entry.error && entry.stack) {
      formatted += `\n${entry.stack}`;
    }
    
    return formatted;
  }

  /**
   * Colorize log level
   */
  private colorizeLevel(level: string, logLevel: LogLevel): string {
    const colors = {
      [LogLevel.TRACE]: '\x1b[90m', // Gray
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m'  // Magenta
    };
    
    const reset = '\x1b[0m';
    return `${colors[logLevel]}${level}${reset}`;
  }

  /**
   * Setup buffering
   */
  private setupBuffering(): void {
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
    }

    if (this.bufferConfig?.enabled && this.bufferConfig.flushInterval > 0) {
      this.bufferTimer = setInterval(() => {
        this.flushBuffer();
      }, this.bufferConfig.flushInterval);
    }
  }

  /**
   * Setup shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down logger...`);
      
      if (this.bufferConfig?.flushOnShutdown) {
        await this.flush();
      }
      
      await this.close();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));
  }
}

export default RestifiedLogger;