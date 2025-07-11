// src/logging/AuditLogger.ts

import * as fs from 'fs';
import * as path from 'path';
import { 
  LogLevel, 
  LoggingConfig, 
  AuditLogEntry, 
  RequestConfig, 
  RestifiedResponse 
} from '../types/RestifiedTypes';

/**
 * Production-grade audit logger with comprehensive logging capabilities
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - File-based persistent logging
 * - Console logging with colors
 * - Request/response audit trail
 * - Log rotation and size management
 * - Structured JSON logging
 * - Performance metrics logging
 * 
 * @example
 * ```typescript
 * const logger = new AuditLogger(config);
 * 
 * logger.info('Test started');
 * logger.logRequest(requestConfig, response);
 * logger.logError(requestConfig, error);
 * logger.debug('Debug information');
 * ```
 */
export class AuditLogger {
  private readonly config: LoggingConfig;
  private readonly logFile: string;
  private readonly logStream: fs.WriteStream;
  private readonly auditEntries: AuditLogEntry[] = [];
  private readonly maxLogFileSize: number = 10 * 1024 * 1024; // 10MB
  private readonly maxAuditEntries: number = 1000;

  // ANSI color codes for console output
  private readonly colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  };

  constructor(config: LoggingConfig) {
    this.config = { ...config };
    this.logFile = path.resolve(config.auditPath);
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Initialize log stream if audit is enabled
    if (config.auditEnabled) {
      this.logStream = this.createLogStream();
      this.writeLogHeader();
    }
  }

  /**
   * Log debug message
   * 
   * @param message - Debug message
   * @param meta - Optional metadata
   */
  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  /**
   * Log info message
   * 
   * @param message - Info message
   * @param meta - Optional metadata
   */
  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  /**
   * Log warning message
   * 
   * @param message - Warning message
   * @param meta - Optional metadata
   */
  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  /**
   * Log error message
   * 
   * @param message - Error message
   * @param meta - Optional metadata
   */
  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  /**
   * Log HTTP request and response for audit trail
   * 
   * @param requestConfig - Request configuration
   * @param response - HTTP response
   * @param testName - Optional test name
   */
  async logRequest(
    requestConfig: RequestConfig, 
    response: RestifiedResponse, 
    testName: string = 'Unknown'
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      timestamp: new Date(),
      testName,
      request: this.sanitizeRequestConfig(requestConfig),
      response: this.sanitizeResponse(response),
      duration: response.responseTime
    };

    // Add to in-memory audit entries
    this.addAuditEntry(auditEntry);

    // Log to console if enabled
    if (this.config.console && this.shouldLog('info')) {
      this.logToConsole('info', this.formatRequestLog(auditEntry));
    }

    // Log to file if audit is enabled
    if (this.config.auditEnabled && this.logStream) {
      await this.writeToLogFile(auditEntry);
    }
  }

  /**
   * Log HTTP request error for audit trail
   * 
   * @param requestConfig - Request configuration
   * @param error - Error that occurred
   * @param testName - Optional test name
   */
  async logError(
    requestConfig: RequestConfig, 
    error: Error, 
    testName: string = 'Unknown'
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      timestamp: new Date(),
      testName,
      request: this.sanitizeRequestConfig(requestConfig),
      response: {
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        data: null,
        responseTime: 0,
        url: requestConfig.url,
        config: requestConfig
      },
      error,
      duration: 0
    };

    // Add to in-memory audit entries
    this.addAuditEntry(auditEntry);

    // Log to console if enabled
    if (this.config.console && this.shouldLog('error')) {
      this.logToConsole('error', this.formatErrorLog(auditEntry));
    }

    // Log to file if audit is enabled
    if (this.config.auditEnabled && this.logStream) {
      await this.writeToLogFile(auditEntry);
    }
  }

  /**
   * Get all audit entries
   * 
   * @returns Array of audit log entries
   */
  getEntries(): AuditLogEntry[] {
    return [...this.auditEntries];
  }

  /**
   * Get audit entries for a specific test
   * 
   * @param testName - Test name to filter by
   * @returns Array of audit log entries for the test
   */
  getEntriesForTest(testName: string): AuditLogEntry[] {
    return this.auditEntries.filter(entry => entry.testName === testName);
  }

  /**
   * Get audit statistics
   * 
   * @returns Object containing audit statistics
   */
  getStats(): {
    totalEntries: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    statusCodeDistribution: Record<number, number>;
    testNames: string[];
  } {
    const stats = {
      totalEntries: this.auditEntries.length,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      statusCodeDistribution: {} as Record<number, number>,
      testNames: [] as string[]
    };

    let totalResponseTime = 0;
    const testNameSet = new Set<string>();

    for (const entry of this.auditEntries) {
      testNameSet.add(entry.testName);
      
      if (entry.error) {
        stats.failedRequests++;
      } else {
        stats.successfulRequests++;
        totalResponseTime += entry.duration;
        
        const statusCode = entry.response.status;
        stats.statusCodeDistribution[statusCode] = (stats.statusCodeDistribution[statusCode] || 0) + 1;
      }
    }

    stats.averageResponseTime = stats.successfulRequests > 0 ? totalResponseTime / stats.successfulRequests : 0;
    stats.testNames = Array.from(testNameSet);

    return stats;
  }

  /**
   * Clear all audit entries
   */
  clearEntries(): void {
    this.auditEntries.length = 0;
  }

  /**
   * Export audit entries to JSON file
   * 
   * @param filePath - Output file path
   * @returns Promise resolving to file path
   */
  async exportEntries(filePath: string): Promise<string> {
    const exportData = {
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      entries: this.auditEntries
    };

    const outputPath = path.resolve(filePath);
    await fs.promises.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
    
    this.info(`Audit entries exported to: ${outputPath}`);
    return outputPath;
  }

  /**
   * Close logger and cleanup resources
   */
  async close(): Promise<void> {
    if (this.logStream) {
      await new Promise<void>((resolve) => {
        this.logStream.end(() => {
          resolve();
        });
      });
    }
  }

  /**
   * Rotate log file if it exceeds size limit
   */
  async rotateLogFile(): Promise<void> {
    if (!this.config.auditEnabled || !fs.existsSync(this.logFile)) {
      return;
    }

    try {
      const stats = await fs.promises.stat(this.logFile);
      
      if (stats.size > this.maxLogFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${this.logFile}.${timestamp}`;
        
        await fs.promises.rename(this.logFile, rotatedFile);
        this.info(`Log file rotated to: ${rotatedFile}`);
        
        // Create new log stream
        if (this.logStream) {
          this.logStream.end();
        }
        
        this.logStream = this.createLogStream();
        this.writeLogHeader();
      }
    } catch (error) {
      this.error(`Failed to rotate log file: ${(error as Error).message}`);
    }
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Core logging method
   * 
   * @param level - Log level
   * @param message - Log message
   * @param meta - Optional metadata
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta
    };

    // Log to console if enabled
    if (this.config.console) {
      this.logToConsole(level, message, meta);
    }

    // Log to file if audit is enabled
    if (this.config.auditEnabled && this.logStream) {
      this.writeSimpleLogToFile(logEntry);
    }
  }

  /**
   * Check if message should be logged based on current log level
   * 
   * @param level - Message log level
   * @returns True if message should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.config.level];
  }

  /**
   * Log message to console with colors
   * 
   * @param level - Log level
   * @param message - Message to log
   * @param meta - Optional metadata
   */
  private logToConsole(level: LogLevel, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const coloredLevel = this.colorizeLevel(level);
    const coloredMessage = `${this.colors.dim}${timestamp}${this.colors.reset} ${coloredLevel} ${message}`;
    
    console.log(coloredMessage);
    
    if (meta && this.config.level === 'debug') {
      console.log(`${this.colors.dim}${JSON.stringify(meta, null, 2)}${this.colors.reset}`);
    }
  }

  /**
   * Colorize log level for console output
   * 
   * @param level - Log level
   * @returns Colorized level string
   */
  private colorizeLevel(level: LogLevel): string {
    const levelColors: Record<LogLevel, string> = {
      debug: this.colors.cyan,
      info: this.colors.green,
      warn: this.colors.yellow,
      error: this.colors.red
    };

    const color = levelColors[level] || this.colors.white;
    return `${color}${this.colors.bright}[${level.toUpperCase()}]${this.colors.reset}`;
  }

  /**
   * Add audit entry to in-memory collection
   * 
   * @param entry - Audit entry to add
   */
  private addAuditEntry(entry: AuditLogEntry): void {
    this.auditEntries.push(entry);
    
    // Remove oldest entries if limit exceeded
    if (this.auditEntries.length > this.maxAuditEntries) {
      this.auditEntries.shift();
    }
  }

  /**
   * Format request log for display
   * 
   * @param entry - Audit log entry
   * @returns Formatted log message
   */
  private formatRequestLog(entry: AuditLogEntry): string {
    const { request, response, duration } = entry;
    const statusColor = response.status >= 400 ? this.colors.red : this.colors.green;
    
    return `${request.method} ${request.url} → ${statusColor}${response.status}${this.colors.reset} (${duration}ms)`;
  }

  /**
   * Format error log for display
   * 
   * @param entry - Audit log entry
   * @returns Formatted error message
   */
  private formatErrorLog(entry: AuditLogEntry): string {
    const { request, error } = entry;
    return `${this.colors.red}ERROR${this.colors.reset} ${request.method} ${request.url} → ${error?.message}`;
  }

  /**
   * Sanitize request config for logging (remove sensitive data)
   * 
   * @param config - Request configuration
   * @returns Sanitized configuration
   */
  private sanitizeRequestConfig(config: RequestConfig): RequestConfig {
    const sanitized = { ...config };
    
    // Remove authorization headers for security
    if (sanitized.headers) {
      sanitized.headers = { ...sanitized.headers };
      
      Object.keys(sanitized.headers).forEach(key => {
        if (key.toLowerCase() === 'authorization') {
          sanitized.headers![key] = '[REDACTED]';
        }
      });
    }
    
    return sanitized;
  }

  /**
   * Sanitize response for logging
   * 
   * @param response - HTTP response
   * @returns Sanitized response
   */
  private sanitizeResponse(response: RestifiedResponse): RestifiedResponse {
    const sanitized = { ...response };
    
    // Limit response data size for logging
    if (sanitized.data && typeof sanitized.data === 'string' && sanitized.data.length > 1000) {
      sanitized.data = sanitized.data.substring(0, 1000) + '... [TRUNCATED]';
    }
    
    return sanitized;
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logFile);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Create log file write stream
   * 
   * @returns Write stream for log file
   */
  private createLogStream(): fs.WriteStream {
    return fs.createWriteStream(this.logFile, { flags: 'a', encoding: 'utf-8' });
  }

  /**
   * Write log file header
   */
  private writeLogHeader(): void {
    if (this.logStream) {
      const header = `\n=== RestifiedTS Audit Log Started: ${new Date().toISOString()} ===\n`;
      this.logStream.write(header);
    }
  }

  /**
   * Write audit entry to log file
   * 
   * @param entry - Audit entry to write
   */
  private async writeToLogFile(entry: AuditLogEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const logLine = JSON.stringify(entry) + '\n';
      
      this.logStream.write(logLine, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Write simple log entry to file
   * 
   * @param entry - Simple log entry
   */
  private writeSimpleLogToFile(entry: any): void {
    if (this.logStream) {
      const logLine = JSON.stringify(entry) + '\n';
      this.logStream.write(logLine);
    }
  }
}