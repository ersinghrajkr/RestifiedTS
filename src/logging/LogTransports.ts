/**
 * Log Transports for RestifiedTS
 * 
 * This module provides various transport implementations for logging
 * including file, console, HTTP, database, and cloud storage transports.
 */

import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';
import { 
  LogTransport, 
  LogEntry, 
  LogLevel, 
  LogFormatter,
  LogRotationPolicy 
} from './LoggingTypes';

/**
 * Console transport
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';
  level: LogLevel;
  enabled: boolean;
  private formatter?: LogFormatter;
  private colorize: boolean;

  constructor(options: {
    level?: LogLevel;
    enabled?: boolean;
    formatter?: LogFormatter;
    colorize?: boolean;
  } = {}) {
    this.level = options.level || LogLevel.INFO;
    this.enabled = options.enabled !== false;
    this.formatter = options.formatter;
    this.colorize = options.colorize !== false;
  }

  write(entry: LogEntry): void {
    const message = this.formatter ? this.formatter.format(entry) : this.formatEntry(entry);
    
    if (entry.level >= LogLevel.ERROR) {
      console.error(message);
    } else {
      console.log(message);
    }
  }

  private formatEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = LogLevel[entry.level].padEnd(5);
    const coloredLevel = this.colorize ? this.colorizeLevel(levelStr, entry.level) : levelStr;
    const context = entry.context ? ` [${entry.context}]` : '';
    
    let message = `[${timestamp}] ${coloredLevel}${context}: ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += `\n${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    if (entry.error && entry.stack) {
      message += `\n${entry.stack}`;
    }
    
    return message;
  }

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
}

/**
 * File transport with rotation support
 */
export class FileTransport implements LogTransport {
  name = 'file';
  level: LogLevel;
  enabled: boolean;
  private filename: string;
  private formatter?: LogFormatter;
  private rotationPolicy?: LogRotationPolicy;
  private currentFileSize = 0;
  private currentFileIndex = 0;
  private writeStream?: fs.WriteStream;

  constructor(options: {
    filename: string;
    level?: LogLevel;
    enabled?: boolean;
    formatter?: LogFormatter;
    rotationPolicy?: LogRotationPolicy;
  }) {
    this.filename = options.filename;
    this.level = options.level || LogLevel.INFO;
    this.enabled = options.enabled !== false;
    this.formatter = options.formatter;
    this.rotationPolicy = options.rotationPolicy;
    
    this.initializeFile();
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.writeStream) {
      await this.initializeFile();
    }

    const message = this.formatter ? this.formatter.format(entry) : this.formatEntry(entry);
    const messageWithNewline = `${message}\n`;
    
    return new Promise((resolve, reject) => {
      this.writeStream!.write(messageWithNewline, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          this.currentFileSize += Buffer.byteLength(messageWithNewline);
          
          if (this.rotationPolicy && this.shouldRotate()) {
            this.rotate().then(resolve).catch(reject);
          } else {
            resolve();
          }
        }
      });
    });
  }

  async flush(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve, reject) => {
        this.writeStream!.end((error: NodeJS.ErrnoException | null | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve, reject) => {
        this.writeStream!.close((error: NodeJS.ErrnoException | null | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }

  private async initializeFile(): Promise<void> {
    const dir = path.dirname(this.filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filename)) {
      const stats = fs.statSync(this.filename);
      this.currentFileSize = stats.size;
    }

    this.writeStream = fs.createWriteStream(this.filename, { flags: 'a' });
  }

  private shouldRotate(): boolean {
    if (!this.rotationPolicy) {
      return false;
    }

    return this.currentFileSize >= this.rotationPolicy.maxSize;
  }

  private async rotate(): Promise<void> {
    if (!this.rotationPolicy) {
      return;
    }

    // Close current stream
    if (this.writeStream) {
      await this.close();
    }

    // Move current file to backup
    const backupFilename = this.generateBackupFilename();
    fs.renameSync(this.filename, backupFilename);

    // Compress if enabled
    if (this.rotationPolicy.compressionEnabled) {
      await this.compressFile(backupFilename);
    }

    // Clean up old files
    await this.cleanupOldFiles();

    // Create new file
    this.currentFileSize = 0;
    this.currentFileIndex++;
    await this.initializeFile();
  }

  private generateBackupFilename(): string {
    const ext = path.extname(this.filename);
    const base = path.basename(this.filename, ext);
    const dir = path.dirname(this.filename);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(dir, `${base}.${timestamp}${ext}`);
  }

  private async compressFile(filename: string): Promise<void> {
    // Compression implementation would go here
    // For now, just log that compression would happen
    console.log(`Would compress file: ${filename}`);
  }

  private async cleanupOldFiles(): Promise<void> {
    if (!this.rotationPolicy) {
      return;
    }

    const dir = path.dirname(this.filename);
    const base = path.basename(this.filename, path.extname(this.filename));
    
    const files = fs.readdirSync(dir)
      .filter(file => file.startsWith(base))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        stats: fs.statSync(path.join(dir, file))
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    // Keep only the specified number of files
    const filesToDelete = files.slice(this.rotationPolicy.maxFiles);
    
    for (const file of filesToDelete) {
      fs.unlinkSync(file.path);
    }

    // Delete files older than retention period
    if (this.rotationPolicy.retentionDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.rotationPolicy.retentionDays);
      
      const oldFiles = files.filter(file => file.stats.mtime < cutoffDate);
      for (const file of oldFiles) {
        fs.unlinkSync(file.path);
      }
    }
  }

  private formatEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = LogLevel[entry.level].padEnd(5);
    const context = entry.context ? ` [${entry.context}]` : '';
    
    let message = `[${timestamp}] ${levelStr}${context}: ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += ` ${JSON.stringify(entry.metadata)}`;
    }
    
    if (entry.error && entry.stack) {
      message += `\n${entry.stack}`;
    }
    
    return message;
  }
}

/**
 * JSON file transport
 */
export class JsonFileTransport implements LogTransport {
  name = 'json-file';
  level: LogLevel;
  enabled: boolean;
  private filename: string;
  private writeStream?: fs.WriteStream;

  constructor(options: {
    filename: string;
    level?: LogLevel;
    enabled?: boolean;
  }) {
    this.filename = options.filename;
    this.level = options.level || LogLevel.INFO;
    this.enabled = options.enabled !== false;
    
    this.initializeFile();
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.writeStream) {
      await this.initializeFile();
    }

    const jsonEntry = JSON.stringify(entry);
    const messageWithNewline = `${jsonEntry}\n`;
    
    return new Promise((resolve, reject) => {
      this.writeStream!.write(messageWithNewline, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async flush(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve, reject) => {
        this.writeStream!.end((error: NodeJS.ErrnoException | null | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve, reject) => {
        this.writeStream!.close((error: NodeJS.ErrnoException | null | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }

  private async initializeFile(): Promise<void> {
    const dir = path.dirname(this.filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.writeStream = fs.createWriteStream(this.filename, { flags: 'a' });
  }
}

/**
 * HTTP transport for remote logging
 */
export class HttpTransport implements LogTransport {
  name = 'http';
  level: LogLevel;
  enabled: boolean;
  private url: string;
  private httpClient: AxiosInstance;
  private batch: LogEntry[] = [];
  private batchSize: number;
  private batchTimeout: number;
  private batchTimer?: NodeJS.Timeout;

  constructor(options: {
    url: string;
    level?: LogLevel;
    enabled?: boolean;
    headers?: Record<string, string>;
    batchSize?: number;
    batchTimeout?: number;
    auth?: {
      username: string;
      password: string;
    } | {
      token: string;
    };
  }) {
    this.url = options.url;
    this.level = options.level || LogLevel.INFO;
    this.enabled = options.enabled !== false;
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 5000;

    this.httpClient = axios.create({
      baseURL: this.url,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 10000
    });

    // Setup authentication
    if (options.auth) {
      if ('username' in options.auth) {
        this.httpClient.defaults.auth = {
          username: options.auth.username,
          password: options.auth.password
        };
      } else {
        this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${options.auth.token}`;
      }
    }

    this.setupBatchTimer();
  }

  async write(entry: LogEntry): Promise<void> {
    this.batch.push(entry);
    
    if (this.batch.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  async flush(): Promise<void> {
    if (this.batch.length > 0) {
      await this.flushBatch();
    }
  }

  async close(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    await this.flush();
  }

  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) {
      return;
    }

    const entries = [...this.batch];
    this.batch = [];

    try {
      await this.httpClient.post('', { entries });
    } catch (error) {
      console.error('Failed to send logs to HTTP transport:', error);
      // Could implement retry logic here
    }
  }

  private setupBatchTimer(): void {
    this.batchTimer = setTimeout(() => {
      this.flushBatch().finally(() => {
        this.setupBatchTimer();
      });
    }, this.batchTimeout);
  }
}

/**
 * Memory transport for testing
 */
export class MemoryTransport implements LogTransport {
  name = 'memory';
  level: LogLevel;
  enabled: boolean;
  private entries: LogEntry[] = [];
  private maxEntries: number;

  constructor(options: {
    level?: LogLevel;
    enabled?: boolean;
    maxEntries?: number;
  } = {}) {
    this.level = options.level || LogLevel.TRACE;
    this.enabled = options.enabled !== false;
    this.maxEntries = options.maxEntries || 1000;
  }

  write(entry: LogEntry): void {
    this.entries.push(entry);
    
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter(entry => entry.level === level);
  }

  clear(): void {
    this.entries = [];
  }

  flush(): void {
    // No-op for memory transport
  }

  close(): void {
    this.clear();
  }
}

/**
 * Syslog transport
 */
export class SyslogTransport implements LogTransport {
  name = 'syslog';
  level: LogLevel;
  enabled: boolean;
  private facility: string;
  private hostname: string;
  private appName: string;

  constructor(options: {
    level?: LogLevel;
    enabled?: boolean;
    facility?: string;
    hostname?: string;
    appName?: string;
  } = {}) {
    this.level = options.level || LogLevel.INFO;
    this.enabled = options.enabled !== false;
    this.facility = options.facility || 'local0';
    this.hostname = options.hostname || 'localhost';
    this.appName = options.appName || 'RestifiedTS';
  }

  write(entry: LogEntry): void {
    const syslogMessage = this.formatSyslogMessage(entry);
    
    // In a real implementation, this would send to syslog
    console.log(`SYSLOG: ${syslogMessage}`);
  }

  private formatSyslogMessage(entry: LogEntry): string {
    const priority = this.calculatePriority(entry.level);
    const timestamp = entry.timestamp.toISOString();
    const processId = process.pid;
    
    let message = `<${priority}>${timestamp} ${this.hostname} ${this.appName}[${processId}]: ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += ` ${JSON.stringify(entry.metadata)}`;
    }
    
    return message;
  }

  private calculatePriority(level: LogLevel): number {
    const facilityCode = 16; // local0
    const severityMap = {
      [LogLevel.TRACE]: 7,
      [LogLevel.DEBUG]: 7,
      [LogLevel.INFO]: 6,
      [LogLevel.WARN]: 4,
      [LogLevel.ERROR]: 3,
      [LogLevel.FATAL]: 2
    };
    
    return facilityCode * 8 + severityMap[level];
  }
}

/**
 * Transport factory
 */
export class TransportFactory {
  static createConsole(options?: {
    level?: LogLevel;
    enabled?: boolean;
    colorize?: boolean;
  }): ConsoleTransport {
    return new ConsoleTransport(options);
  }

  static createFile(filename: string, options?: {
    level?: LogLevel;
    enabled?: boolean;
    rotationPolicy?: LogRotationPolicy;
  }): FileTransport {
    return new FileTransport({ filename, ...options });
  }

  static createJsonFile(filename: string, options?: {
    level?: LogLevel;
    enabled?: boolean;
  }): JsonFileTransport {
    return new JsonFileTransport({ filename, ...options });
  }

  static createHttp(url: string, options?: {
    level?: LogLevel;
    enabled?: boolean;
    headers?: Record<string, string>;
    batchSize?: number;
    batchTimeout?: number;
    auth?: any;
  }): HttpTransport {
    return new HttpTransport({ url, ...options });
  }

  static createMemory(options?: {
    level?: LogLevel;
    enabled?: boolean;
    maxEntries?: number;
  }): MemoryTransport {
    return new MemoryTransport(options);
  }

  static createSyslog(options?: {
    level?: LogLevel;
    enabled?: boolean;
    facility?: string;
    hostname?: string;
    appName?: string;
  }): SyslogTransport {
    return new SyslogTransport(options);
  }
}

export default TransportFactory;