// src/reporting/ReportGenerator.ts

import * as fs from 'fs';
import * as path from 'path';
import { AuditLogEntry, ReportingConfig } from '../types/RestifiedTypes';
import { HtmlReporter } from './HtmlReporter';
import { DiffReporter } from './DiffReporter';

/**
 * Main report generator that orchestrates different reporting formats
 * 
 * Features:
 * - HTML reports with interactive charts and filtering
 * - JSON reports for machine consumption
 * - Diff reports for snapshot comparisons
 * - Performance metrics visualization
 * - Test trend analysis
 * - Configurable report templates
 * - Export capabilities
 * 
 * @example
 * ```typescript
 * const generator = new ReportGenerator(config);
 * 
 * await generator.generateHtmlReport(auditEntries, snapshots);
 * await generator.generateJsonReport(auditEntries, snapshots);
 * await generator.generateDiffReport(snapshots);
 * ```
 */
export class ReportGenerator {
  private readonly config: ReportingConfig;
  private readonly htmlReporter: HtmlReporter;
  private readonly diffReporter: DiffReporter;

  constructor(config: ReportingConfig) {
    this.config = { ...config };
    this.htmlReporter = new HtmlReporter();
    this.diffReporter = new DiffReporter();
    
    this.ensureOutputDirectory();
  }

  /**
   * Generate HTML report
   * 
   * @param auditEntries - Test execution audit entries
   * @param snapshots - Snapshot data
   * @param outputPath - Optional custom output path
   * @returns Promise resolving to report file path
   */
  async generateHtmlReport(
    auditEntries: AuditLogEntry[],
    snapshots?: Map<string, any>,
    outputPath?: string
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Reporting is disabled in configuration');
    }

    const reportPath = outputPath || this.getDefaultHtmlPath();
    const reportData = this.prepareReportData(auditEntries, snapshots);
    
    const htmlContent = await this.htmlReporter.generateReport(reportData);
    
    await this.writeFile(reportPath, htmlContent);
    
    console.log(`HTML report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Generate JSON report
   * 
   * @param auditEntries - Test execution audit entries
   * @param snapshots - Snapshot data
   * @param outputPath - Optional custom output path
   * @returns Promise resolving to report file path
   */
  async generateJsonReport(
    auditEntries: AuditLogEntry[],
    snapshots?: Map<string, any>,
    outputPath?: string
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Reporting is disabled in configuration');
    }

    const reportPath = outputPath || this.getDefaultJsonPath();
    const reportData = this.prepareReportData(auditEntries, snapshots);
    
    const jsonContent = JSON.stringify(reportData, null, 2);
    
    await this.writeFile(reportPath, jsonContent);
    
    console.log(`JSON report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Generate diff report for snapshot comparisons
   * 
   * @param snapshots - Snapshot data with versions
   * @param outputPath - Optional custom output path
   * @returns Promise resolving to report file path
   */
  async generateDiffReport(
    snapshots: Map<string, any>,
    outputPath?: string
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Reporting is disabled in configuration');
    }

    const reportPath = outputPath || this.getDefaultDiffPath();
    
    const diffContent = await this.diffReporter.generateDiffReport(snapshots);
    
    await this.writeFile(reportPath, diffContent);
    
    console.log(`Diff report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Generate all configured report formats
   * 
   * @param auditEntries - Test execution audit entries
   * @param snapshots - Snapshot data
   * @returns Promise resolving to array of generated report paths
   */
  async generateAllReports(
    auditEntries: AuditLogEntry[],
    snapshots?: Map<string, any>
  ): Promise<string[]> {
    const reports: string[] = [];

    if (this.config.format === 'html' || this.config.format === 'both') {
      const htmlPath = await this.generateHtmlReport(auditEntries, snapshots);
      reports.push(htmlPath);
    }

    if (this.config.format === 'json' || this.config.format === 'both') {
      const jsonPath = await this.generateJsonReport(auditEntries, snapshots);
      reports.push(jsonPath);
    }

    if (snapshots && snapshots.size > 0 && this.config.includeSnapshots) {
      const diffPath = await this.generateDiffReport(snapshots);
      reports.push(diffPath);
    }

    return reports;
  }

  /**
   * Generate performance report
   * 
   * @param auditEntries - Test execution audit entries
   * @param outputPath - Optional custom output path
   * @returns Promise resolving to report file path
   */
  async generatePerformanceReport(
    auditEntries: AuditLogEntry[],
    outputPath?: string
  ): Promise<string> {
    const reportPath = outputPath || this.getDefaultPerformancePath();
    const performanceData = this.extractPerformanceData(auditEntries);
    
    const htmlContent = await this.htmlReporter.generatePerformanceReport(performanceData);
    
    await this.writeFile(reportPath, htmlContent);
    
    console.log(`Performance report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Generate trend analysis report
   * 
   * @param auditEntries - Test execution audit entries from multiple runs
   * @param outputPath - Optional custom output path
   * @returns Promise resolving to report file path
   */
  async generateTrendReport(
    auditEntries: AuditLogEntry[][],
    outputPath?: string
  ): Promise<string> {
    const reportPath = outputPath || this.getDefaultTrendPath();
    const trendData = this.analyzeTrends(auditEntries);
    
    const htmlContent = await this.htmlReporter.generateTrendReport(trendData);
    
    await this.writeFile(reportPath, htmlContent);
    
    console.log(`Trend report generated: ${reportPath}`);
    return reportPath;
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Prepare comprehensive report data
   */
  private prepareReportData(
    auditEntries: AuditLogEntry[],
    snapshots?: Map<string, any>
  ): TestReportData {
    const summary = this.calculateSummary(auditEntries);
    const testResults = this.processTestResults(auditEntries);
    const performanceMetrics = this.extractPerformanceData(auditEntries);
    const errorAnalysis = this.analyzeErrors(auditEntries);
    
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTests: summary.totalTests,
        totalDuration: summary.totalDuration,
        framework: 'RestifiedTS',
        version: '1.0.0'
      },
      summary,
      testResults,
      performanceMetrics,
      errorAnalysis,
      snapshots: snapshots ? this.processSnapshots(snapshots) : undefined,
      rawData: auditEntries
    };
  }

  /**
   * Calculate test execution summary
   */
  private calculateSummary(auditEntries: AuditLogEntry[]): TestSummary {
    const testsByName = new Map<string, AuditLogEntry[]>();
    
    // Group entries by test name
    auditEntries.forEach(entry => {
      if (!testsByName.has(entry.testName)) {
        testsByName.set(entry.testName, []);
      }
      testsByName.get(entry.testName)!.push(entry);
    });

    let successfulTests = 0;
    let failedTests = 0;
    let totalDuration = 0;
    let totalRequests = 0;
    const statusCodeCounts: Record<number, number> = {};
    let totalResponseTime = 0;

    testsByName.forEach(entries => {
      const hasFailure = entries.some(entry => entry.error);
      if (hasFailure) {
        failedTests++;
      } else {
        successfulTests++;
      }

      entries.forEach(entry => {
        totalDuration += entry.duration;
        totalRequests++;
        totalResponseTime += entry.duration;
        
        const statusCode = entry.response.status;
        statusCodeCounts[statusCode] = (statusCodeCounts[statusCode] || 0) + 1;
      });
    });

    return {
      totalTests: testsByName.size,
      successfulTests,
      failedTests,
      successRate: testsByName.size > 0 ? (successfulTests / testsByName.size) * 100 : 0,
      totalDuration,
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      statusCodeDistribution: statusCodeCounts,
      startTime: auditEntries.length > 0 ? auditEntries[0].timestamp : new Date(),
      endTime: auditEntries.length > 0 ? auditEntries[auditEntries.length - 1].timestamp : new Date()
    };
  }

  /**
   * Process individual test results
   */
  private processTestResults(auditEntries: AuditLogEntry[]): TestResult[] {
    const testsByName = new Map<string, AuditLogEntry[]>();
    
    auditEntries.forEach(entry => {
      if (!testsByName.has(entry.testName)) {
        testsByName.set(entry.testName, []);
      }
      testsByName.get(entry.testName)!.push(entry);
    });

    return Array.from(testsByName.entries()).map(([testName, entries]) => {
      const hasFailure = entries.some(entry => entry.error);
      const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
      const errors = entries.filter(entry => entry.error).map(entry => entry.error!);

      return {
        testName,
        status: hasFailure ? 'failed' : 'passed',
        duration: totalDuration,
        requestCount: entries.length,
        averageResponseTime: entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length,
        errors: errors.map(error => ({
          message: error.message,
          stack: error.stack
        })),
        requests: entries.map(entry => ({
          method: entry.request.method,
          url: entry.request.url,
          statusCode: entry.response.status,
          responseTime: entry.duration,
          timestamp: entry.timestamp
        }))
      };
    });
  }

  /**
   * Extract performance metrics
   */
  private extractPerformanceData(auditEntries: AuditLogEntry[]): PerformanceMetrics {
    if (auditEntries.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        timeSeriesData: []
      };
    }

    const responseTimes = auditEntries.map(entry => entry.duration);
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    
    const startTime = auditEntries[0].timestamp.getTime();
    const endTime = auditEntries[auditEntries.length - 1].timestamp.getTime();
    const durationSeconds = (endTime - startTime) / 1000;

    const errorCount = auditEntries.filter(entry => entry.error).length;

    return {
      totalRequests: auditEntries.length,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50ResponseTime: this.calculatePercentile(sortedTimes, 0.5),
      p95ResponseTime: this.calculatePercentile(sortedTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(sortedTimes, 0.99),
      requestsPerSecond: durationSeconds > 0 ? auditEntries.length / durationSeconds : 0,
      errorRate: (errorCount / auditEntries.length) * 100,
      timeSeriesData: this.generateTimeSeriesData(auditEntries)
    };
  }

  /**
   * Analyze errors and group by type
   */
  private analyzeErrors(auditEntries: AuditLogEntry[]): ErrorAnalysis {
    const errors = auditEntries.filter(entry => entry.error);
    
    if (errors.length === 0) {
      return {
        totalErrors: 0,
        errorTypes: {},
        errorsByTest: {},
        commonErrors: []
      };
    }

    const errorTypes: Record<string, number> = {};
    const errorsByTest: Record<string, number> = {};
    const errorMessages: Record<string, number> = {};

    errors.forEach(entry => {
      const error = entry.error!;
      const errorType = error.constructor.name || 'Unknown';
      const testName = entry.testName;
      const message = error.message;

      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      errorsByTest[testName] = (errorsByTest[testName] || 0) + 1;
      errorMessages[message] = (errorMessages[message] || 0) + 1;
    });

    const commonErrors = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));

    return {
      totalErrors: errors.length,
      errorTypes,
      errorsByTest,
      commonErrors
    };
  }

  /**
   * Process snapshots for reporting
   */
  private processSnapshots(snapshots: Map<string, any>): SnapshotSummary[] {
    return Array.from(snapshots.entries()).map(([key, data]) => ({
      key,
      size: JSON.stringify(data).length,
      lastModified: new Date(), // Would need to track this properly
      hasChanges: false // Would need to compare with previous version
    }));
  }

  /**
   * Analyze trends across multiple test runs
   */
  private analyzeTrends(auditEntriesArray: AuditLogEntry[][]): TrendData {
    const runs = auditEntriesArray.map((entries, index) => {
      const summary = this.calculateSummary(entries);
      const performance = this.extractPerformanceData(entries);
      
      return {
        runIndex: index + 1,
        timestamp: entries.length > 0 ? entries[0].timestamp : new Date(),
        summary,
        performance
      };
    });

    return {
      runs,
      trends: {
        successRate: this.calculateTrend(runs.map(r => r.summary.successRate)),
        averageResponseTime: this.calculateTrend(runs.map(r => r.performance.averageResponseTime)),
        errorRate: this.calculateTrend(runs.map(r => r.performance.errorRate)),
        requestsPerSecond: this.calculateTrend(runs.map(r => r.performance.requestsPerSecond))
      }
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = percentile * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    return sortedArray[lower] * (upper - index) + sortedArray[upper] * (index - lower);
  }

  /**
   * Generate time series data for charts
   */
  private generateTimeSeriesData(auditEntries: AuditLogEntry[]): TimeSeriesPoint[] {
    const windowSize = Math.max(1, Math.floor(auditEntries.length / 50)); // Max 50 points
    const timeSeriesData: TimeSeriesPoint[] = [];

    for (let i = 0; i < auditEntries.length; i += windowSize) {
      const window = auditEntries.slice(i, i + windowSize);
      const avgResponseTime = window.reduce((sum, entry) => sum + entry.duration, 0) / window.length;
      const errorCount = window.filter(entry => entry.error).length;
      
      timeSeriesData.push({
        timestamp: window[0].timestamp,
        averageResponseTime: avgResponseTime,
        requestCount: window.length,
        errorCount,
        successRate: ((window.length - errorCount) / window.length) * 100
      });
    }

    return timeSeriesData;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: number[]): TrendDirection {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const changePercent = Math.abs((last - first) / first) * 100;
    
    if (changePercent < 5) return 'stable';
    return last > first ? 'increasing' : 'decreasing';
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputPath)) {
      fs.mkdirSync(this.config.outputPath, { recursive: true });
    }
  }

  /**
   * Write file with proper error handling
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Get default file paths
   */
  private getDefaultHtmlPath(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.config.outputPath, `test-report-${timestamp}.html`);
  }

  private getDefaultJsonPath(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.config.outputPath, `test-report-${timestamp}.json`);
  }

  private getDefaultDiffPath(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.config.outputPath, `diff-report-${timestamp}.html`);
  }

  private getDefaultPerformancePath(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.config.outputPath, `performance-report-${timestamp}.html`);
  }

  private getDefaultTrendPath(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.config.outputPath, `trend-report-${timestamp}.html`);
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

export interface TestReportData {
  metadata: {
    generatedAt: string;
    totalTests: number;
    totalDuration: number;
    framework: string;
    version: string;
  };
  summary: TestSummary;
  testResults: TestResult[];
  performanceMetrics: PerformanceMetrics;
  errorAnalysis: ErrorAnalysis;
  snapshots?: SnapshotSummary[];
  rawData: AuditLogEntry[];
}

export interface TestSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  successRate: number;
  totalDuration: number;
  totalRequests: number;
  averageResponseTime: number;
  statusCodeDistribution: Record<number, number>;
  startTime: Date;
  endTime: Date;
}

export interface TestResult {
  testName: string;
  status: 'passed' | 'failed';
  duration: number;
  requestCount: number;
  averageResponseTime: number;
  errors: Array<{
    message: string;
    stack?: string;
  }>;
  requests: Array<{
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    timestamp: Date;
  }>;
}

export interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  timeSeriesData: TimeSeriesPoint[];
}

export interface ErrorAnalysis {
  totalErrors: number;
  errorTypes: Record<string, number>;
  errorsByTest: Record<string, number>;
  commonErrors: Array<{
    message: string;
    count: number;
  }>;
}

export interface SnapshotSummary {
  key: string;
  size: number;
  lastModified: Date;
  hasChanges: boolean;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  averageResponseTime: number;
  requestCount: number;
  errorCount: number;
  successRate: number;
}

export interface TrendData {
  runs: Array<{
    runIndex: number;
    timestamp: Date;
    summary: TestSummary;
    performance: PerformanceMetrics;
  }>;
  trends: {
    successRate: TrendDirection;
    averageResponseTime: TrendDirection;
    errorRate: TrendDirection;
    requestsPerSecond: TrendDirection;
  };
}

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';