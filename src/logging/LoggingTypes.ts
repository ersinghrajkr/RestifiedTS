/**
 * Logging Types for RestifiedTS
 * 
 * This module defines the core types and interfaces for structured logging,
 * log levels, formatters, and transport mechanisms.
 */

import { RestifiedResponse } from '../types/RestifiedTypes';

/**
 * Log levels
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  testId?: string;
  sessionId?: string;
  tags?: string[];
  error?: Error;
  stack?: string;
  duration?: number;
  userId?: string;
  source?: string;
  category?: string;
}

/**
 * Log formatter interface
 */
export interface LogFormatter {
  format(entry: LogEntry): string;
}

/**
 * Log transport interface
 */
export interface LogTransport {
  name: string;
  level: LogLevel;
  enabled: boolean;
  write(entry: LogEntry): Promise<void> | void;
  flush?(): Promise<void> | void;
  close?(): Promise<void> | void;
}

/**
 * Logger interface
 */
export interface Logger {
  trace(message: string, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void;
  
  child(context: string, metadata?: Record<string, any>): Logger;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  isEnabled(level: LogLevel): boolean;
  
  startTimer(name: string): LogTimer;
  addTransport(transport: LogTransport): void;
  removeTransport(name: string): boolean;
  flush(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Log timer interface
 */
export interface LogTimer {
  name: string;
  startTime: Date;
  end(message?: string, level?: LogLevel): void;
  getDuration(): number;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  context?: string;
  defaultMetadata?: Record<string, any>;
  transports?: LogTransport[];
  formatters?: Record<string, LogFormatter>;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableJSON?: boolean;
  fileOptions?: {
    filename?: string;
    maxSize?: number;
    maxFiles?: number;
    rotationPattern?: string;
  };
  consoleOptions?: {
    colorize?: boolean;
    timestamp?: boolean;
    prettyPrint?: boolean;
  };
}

/**
 * HTTP request/response logging
 */
export interface HttpLogEntry extends LogEntry {
  type: 'request' | 'response';
  method?: string;
  url?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: any;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
  userAgent?: string;
  ip?: string;
}

/**
 * Test execution logging
 */
export interface TestLogEntry extends LogEntry {
  type: 'test_start' | 'test_end' | 'test_step' | 'assertion' | 'error';
  testName?: string;
  testSuite?: string;
  stepName?: string;
  assertionType?: string;
  expected?: any;
  actual?: any;
  passed?: boolean;
  skipped?: boolean;
  retryCount?: number;
  executionTime?: number;
}

/**
 * Performance logging
 */
export interface PerformanceLogEntry extends LogEntry {
  type: 'performance';
  operation: string;
  duration: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
  throughput?: number;
  concurrency?: number;
  errorRate?: number;
}

/**
 * Audit logging
 */
export interface AuditLogEntry extends LogEntry {
  type: 'audit';
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  actor?: string;
  target?: string;
  changes?: Record<string, any>;
  permissions?: string[];
  location?: string;
  deviceInfo?: string;
}

/**
 * Security logging
 */
export interface SecurityLogEntry extends LogEntry {
  type: 'security';
  eventType: 'authentication' | 'authorization' | 'data_access' | 'configuration_change' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  actor?: string;
  resource?: string;
  outcome: 'success' | 'failure' | 'blocked';
  reason?: string;
  riskScore?: number;
  mitigation?: string;
  alertId?: string;
}

/**
 * Log aggregation and metrics
 */
export interface LogMetrics {
  totalEntries: number;
  entriesByLevel: Record<LogLevel, number>;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  diskUsage: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Log query interface
 */
export interface LogQuery {
  startTime?: Date;
  endTime?: Date;
  level?: LogLevel | LogLevel[];
  context?: string;
  requestId?: string;
  testId?: string;
  tags?: string[];
  message?: string | RegExp;
  metadata?: Record<string, any>;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'level' | 'context';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Log search result
 */
export interface LogSearchResult {
  entries: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  metrics?: LogMetrics;
}

/**
 * Log storage interface
 */
export interface LogStorage {
  store(entry: LogEntry): Promise<void>;
  query(query: LogQuery): Promise<LogSearchResult>;
  getMetrics(startTime: Date, endTime: Date): Promise<LogMetrics>;
  deleteOldEntries(olderThan: Date): Promise<number>;
  createIndex(fields: string[]): Promise<void>;
  backup(destination: string): Promise<void>;
  restore(source: string): Promise<void>;
}

/**
 * Log event interface
 */
export interface LogEvent {
  type: 'entry' | 'error' | 'flush' | 'rotate';
  timestamp: Date;
  data: any;
  transport?: string;
  error?: Error;
}

/**
 * Log event handler
 */
export type LogEventHandler = (event: LogEvent) => void;

/**
 * Log rotation policy
 */
export interface LogRotationPolicy {
  maxSize: number;
  maxFiles: number;
  rotationPattern: string;
  compressionEnabled: boolean;
  archiveDirectory?: string;
  retentionDays?: number;
}

/**
 * Log filter interface
 */
export interface LogFilter {
  name: string;
  enabled: boolean;
  filter(entry: LogEntry): boolean;
}

/**
 * Log middleware interface
 */
export interface LogMiddleware {
  name: string;
  enabled: boolean;
  process(entry: LogEntry): LogEntry | Promise<LogEntry>;
}

/**
 * Structured logging context
 */
export interface LogContext {
  requestId?: string;
  testId?: string;
  sessionId?: string;
  userId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  parentId?: string;
  baggage?: Record<string, any>;
}

/**
 * Log sampling configuration
 */
export interface LogSamplingConfig {
  enabled: boolean;
  rate: number;
  rules: Array<{
    level: LogLevel;
    rate: number;
    context?: string;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Log buffer configuration
 */
export interface LogBufferConfig {
  enabled: boolean;
  size: number;
  flushInterval: number;
  flushOnLevel?: LogLevel;
  flushOnShutdown: boolean;
}

/**
 * Log analytics interface
 */
export interface LogAnalytics {
  generateReport(startTime: Date, endTime: Date): Promise<LogAnalyticsReport>;
  detectAnomalies(startTime: Date, endTime: Date): Promise<LogAnomaly[]>;
  getTopErrors(limit: number): Promise<Array<{ error: string; count: number }>>;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
}

/**
 * Log analytics report
 */
export interface LogAnalyticsReport {
  summary: {
    totalEntries: number;
    timeRange: { start: Date; end: Date };
    errorRate: number;
    avgResponseTime: number;
    topContexts: Array<{ context: string; count: number }>;
    topErrors: Array<{ error: string; count: number }>;
  };
  trends: {
    entriesOverTime: Array<{ timestamp: Date; count: number }>;
    errorRateOverTime: Array<{ timestamp: Date; rate: number }>;
    responseTimeOverTime: Array<{ timestamp: Date; avgTime: number }>;
  };
  alerts: LogAlert[];
}

/**
 * Log anomaly detection
 */
export interface LogAnomaly {
  type: 'spike' | 'drop' | 'unusual_pattern' | 'error_surge';
  timestamp: Date;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedMetrics: string[];
  suggestedActions: string[];
}

/**
 * Log alert configuration
 */
export interface LogAlert {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    type: 'threshold' | 'rate' | 'pattern';
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'contains';
    value: any;
    timeWindow: number;
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'log';
    config: Record<string, any>;
  }>;
  cooldown: number;
  lastTriggered?: Date;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  errorRates: {
    total: number;
    byStatusCode: Record<number, number>;
    byErrorType: Record<string, number>;
  };
  systemMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkIO: number;
  };
}

export default {
  LogLevel
};