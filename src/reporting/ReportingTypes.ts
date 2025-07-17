/**
 * Reporting Types for RestifiedTS
 * 
 * This module defines the core types and interfaces for comprehensive
 * reporting including test results, performance metrics, and analytics.
 */

import { RestifiedResponse } from '../types/RestifiedTypes';
import { AssertionResult } from '../assertions/AssertionTypes';
import { LogEntry } from '../logging/LoggingTypes';

/**
 * Test result status
 */
export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  PENDING = 'pending',
  BROKEN = 'broken'
}

/**
 * Test severity levels
 */
export enum TestSeverity {
  BLOCKER = 'blocker',
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
  TRIVIAL = 'trivial'
}

/**
 * Report formats
 */
export enum ReportFormat {
  HTML = 'html',
  JSON = 'json',
  XML = 'xml',
  CSV = 'csv',
  PDF = 'pdf',
  JUNIT = 'junit',
  ALLURE = 'allure',
  MARKDOWN = 'markdown'
}

/**
 * Test step result
 */
export interface TestStepResult {
  id: string;
  name: string;
  status: TestStatus;
  startTime: Date;
  endTime: Date;
  duration: number;
  error?: Error;
  assertions: AssertionResult[];
  attachments: TestAttachment[];
  metadata: Record<string, any>;
}

/**
 * Test case result
 */
export interface TestCaseResult {
  id: string;
  name: string;
  description?: string;
  status: TestStatus;
  severity: TestSeverity;
  startTime: Date;
  endTime: Date;
  duration: number;
  steps: TestStepResult[];
  tags: string[];
  categories: string[];
  error?: Error;
  retryCount: number;
  flaky: boolean;
  metadata: Record<string, any>;
  author?: string;
  assignee?: string;
  environment?: string;
  version?: string;
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  id: string;
  name: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  testCases: TestCaseResult[];
  status: TestStatus;
  statistics: TestStatistics;
  metadata: Record<string, any>;
  environment: TestEnvironment;
  configuration: Record<string, any>;
}

/**
 * Test execution result
 */
export interface TestExecutionResult {
  id: string;
  name: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  suites: TestSuiteResult[];
  globalStatistics: TestStatistics;
  environment: TestEnvironment;
  configuration: Record<string, any>;
  metadata: Record<string, any>;
  warnings: string[];
  errors: string[];
}

/**
 * Test statistics
 */
export interface TestStatistics {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  broken: number;
  flaky: number;
  successRate: number;
  flakyRate: number;
  averageDuration: number;
  totalDuration: number;
  assertionStats: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}

/**
 * Test environment information
 */
export interface TestEnvironment {
  name: string;
  url?: string;
  version?: string;
  browser?: string;
  browserVersion?: string;
  platform: string;
  os: string;
  osVersion?: string;
  nodeVersion: string;
  dependencies: Record<string, string>;
  customProperties: Record<string, any>;
}

/**
 * Test attachment
 */
export interface TestAttachment {
  id: string;
  name: string;
  type: 'screenshot' | 'log' | 'video' | 'json' | 'xml' | 'html' | 'text' | 'binary';
  mimeType: string;
  content: Buffer | string;
  size: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  responseTime: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  errorMetrics: {
    totalErrors: number;
    errorRate: number;
    errorsByType: Record<string, number>;
    errorsByStatus: Record<number, number>;
  };
  networkMetrics: {
    bytesReceived: number;
    bytesSent: number;
    connectionTime: number;
    dnsLookupTime: number;
    sslHandshakeTime: number;
  };
  resourceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
}

/**
 * Test trend data
 */
export interface TestTrendData {
  timestamp: Date;
  executionId: string;
  statistics: TestStatistics;
  performance: PerformanceMetrics;
  duration: number;
  environment: string;
  version: string;
}

/**
 * Historical test data
 */
export interface HistoricalTestData {
  testName: string;
  history: Array<{
    timestamp: Date;
    status: TestStatus;
    duration: number;
    executionId: string;
    environment: string;
    version: string;
  }>;
  trends: {
    successRate: number;
    averageDuration: number;
    stability: number;
    lastFailure?: Date;
    consecutiveFailures: number;
  };
}

/**
 * Report configuration
 */
export interface ReportConfig {
  format: ReportFormat[];
  outputDirectory: string;
  filename?: string;
  template?: string;
  includeAttachments: boolean;
  includeEnvironment: boolean;
  includeHistoricalData: boolean;
  includeTrends: boolean;
  includePerformanceMetrics: boolean;
  includeDetailedSteps: boolean;
  includeMetadata: boolean;
  customProperties: Record<string, any>;
  branding?: {
    logo?: string;
    title?: string;
    company?: string;
    theme?: string;
  };
}

/**
 * Report generator interface
 */
export interface ReportGenerator {
  format: ReportFormat;
  generate(result: TestExecutionResult, config: ReportConfig): Promise<ReportOutput>;
  supports(format: ReportFormat): boolean;
}

/**
 * Report output
 */
export interface ReportOutput {
  format: ReportFormat;
  filename: string;
  content: Buffer | string;
  size: number;
  generated: Date;
  metadata: Record<string, any>;
}

/**
 * Dashboard data
 */
export interface DashboardData {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    averageExecutionTime: number;
    lastExecution: Date;
  };
  trends: {
    successRateTrend: Array<{ date: Date; rate: number }>;
    executionTimeTrend: Array<{ date: Date; time: number }>;
    testCountTrend: Array<{ date: Date; count: number }>;
  };
  topFailures: Array<{
    testName: string;
    failureCount: number;
    lastFailure: Date;
    errorMessage: string;
  }>;
  environmentStats: Array<{
    environment: string;
    successRate: number;
    averageTime: number;
    lastExecution: Date;
  }>;
  performance: PerformanceMetrics;
  recentExecutions: Array<{
    id: string;
    name: string;
    timestamp: Date;
    duration: number;
    status: TestStatus;
    environment: string;
  }>;
}

/**
 * Test analytics
 */
export interface TestAnalytics {
  flakyTests: Array<{
    testName: string;
    flakyRate: number;
    totalExecutions: number;
    lastFlaky: Date;
    pattern: string;
  }>;
  slowTests: Array<{
    testName: string;
    averageDuration: number;
    maxDuration: number;
    slowdownTrend: number;
  }>;
  errorPatterns: Array<{
    pattern: string;
    occurrences: number;
    affectedTests: string[];
    firstSeen: Date;
    lastSeen: Date;
  }>;
  testStability: Array<{
    testName: string;
    stabilityScore: number;
    successRate: number;
    variance: number;
  }>;
  coverage: {
    endpointsCovered: number;
    totalEndpoints: number;
    coverageRate: number;
    uncoveredEndpoints: string[];
  };
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  enabled: boolean;
  channels: Array<{
    type: 'email' | 'slack' | 'webhook' | 'sms';
    config: Record<string, any>;
    events: Array<'test_failed' | 'test_passed' | 'execution_completed' | 'flaky_test_detected'>;
    conditions: Array<{
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
      value: any;
    }>;
  }>;
}

/**
 * Custom report section
 */
export interface CustomReportSection {
  name: string;
  title: string;
  order: number;
  enabled: boolean;
  generator: (result: TestExecutionResult) => Promise<string | Buffer>;
}

/**
 * Report template
 */
export interface ReportTemplate {
  name: string;
  format: ReportFormat;
  template: string;
  styles?: string;
  scripts?: string;
  sections: CustomReportSection[];
  metadata: Record<string, any>;
}

/**
 * Test metrics collector
 */
export interface TestMetricsCollector {
  collectMetrics(result: TestExecutionResult): Promise<void>;
  getMetrics(timeRange: { start: Date; end: Date }): Promise<TestAnalytics>;
  getHistoricalData(testName: string): Promise<HistoricalTestData>;
  getTrendData(timeRange: { start: Date; end: Date }): Promise<TestTrendData[]>;
  getDashboardData(): Promise<DashboardData>;
}

/**
 * Test results storage
 */
export interface TestResultsStorage {
  store(result: TestExecutionResult): Promise<void>;
  retrieve(id: string): Promise<TestExecutionResult | null>;
  query(filters: TestResultsQuery): Promise<TestExecutionResult[]>;
  delete(id: string): Promise<boolean>;
  deleteOldResults(olderThan: Date): Promise<number>;
  createIndex(fields: string[]): Promise<void>;
}

/**
 * Test results query
 */
export interface TestResultsQuery {
  startTime?: Date;
  endTime?: Date;
  status?: TestStatus[];
  environment?: string[];
  tags?: string[];
  testName?: string;
  executionId?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Report scheduler
 */
export interface ReportScheduler {
  scheduleReport(config: {
    name: string;
    schedule: string; // cron expression
    reportConfig: ReportConfig;
    enabled: boolean;
  }): Promise<void>;
  cancelScheduledReport(name: string): Promise<boolean>;
  getScheduledReports(): Promise<Array<{
    name: string;
    schedule: string;
    nextRun: Date;
    enabled: boolean;
  }>>;
}

/**
 * Test execution listener
 */
export interface TestExecutionListener {
  onTestStart(testCase: TestCaseResult): void;
  onTestEnd(testCase: TestCaseResult): void;
  onTestStep(step: TestStepResult): void;
  onSuiteStart(suite: TestSuiteResult): void;
  onSuiteEnd(suite: TestSuiteResult): void;
  onExecutionStart(execution: TestExecutionResult): void;
  onExecutionEnd(execution: TestExecutionResult): void;
}

export default {
  TestStatus,
  TestSeverity,
  ReportFormat
};