// src/utils/PerformanceTracker.ts

import { PerformanceMetrics } from '../types/RestifiedTypes';

/**
 * Comprehensive performance tracking and metrics collection system
 * 
 * Features:
 * - Detailed timing metrics (DNS, TCP, TLS, TTFB, download)
 * - Statistical analysis (percentiles, averages, distributions)
 * - Performance thresholds and SLA monitoring
 * - Memory and resource usage tracking
 * - Historical performance data
 * - Performance regression detection
 * - Real-time performance monitoring
 * 
 * @example
 * ```typescript
 * const tracker = new PerformanceTracker();
 * 
 * // Record a request
 * tracker.recordRequest(250, 200, {
 *   dnsLookupTime: 5,
 *   tcpConnectTime: 10,
 *   tlsHandshakeTime: 15,
 *   firstByteTime: 200,
 *   downloadTime: 50
 * });
 * 
 * // Get comprehensive metrics
 * const metrics = tracker.getDetailedMetrics();
 * console.log(`P95 response time: ${metrics.percentiles.p95}ms`);
 * ```
 */
export class PerformanceTracker {
  private metrics: PerformanceData;
  private readonly maxSamples: number;
  private readonly performanceThresholds: PerformanceThresholds;
  private readonly performanceHistory: PerformanceSnapshot[] = [];
  private readonly maxHistorySize: number = 100;

  constructor(options: PerformanceTrackerOptions = {}) {
    this.maxSamples = options.maxSamples || 1000;
    this.performanceThresholds = {
      responseTime: { warning: 1000, critical: 3000 },
      errorRate: { warning: 0.05, critical: 0.1 },
      throughput: { warning: 10, critical: 5 },
      ...options.thresholds
    };
    
    this.reset();
  }

  /**
   * Record a request's performance metrics
   * 
   * @param responseTime - Total response time in milliseconds
   * @param statusCode - HTTP status code
   * @param timingDetails - Optional detailed timing breakdown
   * @param metadata - Optional request metadata
   */
  recordRequest(
    responseTime: number, 
    statusCode: number,
    timingDetails?: Partial<DetailedTimings>,
    metadata?: RequestMetadata
  ): void {
    this.validateInput(responseTime, statusCode);

    const timestamp = Date.now();
    const isSuccess = statusCode >= 200 && statusCode < 400;
    const isError = statusCode >= 400;

    // Update basic counters
    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += responseTime;

    if (isSuccess) {
      this.metrics.successfulRequests++;
    }

    if (isError) {
      this.metrics.failedRequests++;
    }

    // Update min/max response times
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);

    // Record response time sample
    this.addResponseTimeSample(responseTime, timestamp);

    // Update status code distribution
    this.updateStatusCodeDistribution(statusCode);

    // Record detailed timings if provided
    if (timingDetails) {
      this.recordDetailedTimings(timingDetails);
    }

    // Record request metadata
    if (metadata) {
      this.recordRequestMetadata(metadata);
    }

    // Update performance bands
    this.updatePerformanceBands(responseTime);

    // Check for performance issues
    this.checkPerformanceThresholds();

    // Update throughput calculation
    this.updateThroughput(timestamp);

    // Maintain sample size limit
    this.maintainSampleLimit();
  }

  /**
   * Get basic performance metrics
   * 
   * @returns Basic performance metrics
   */
  getMetrics(): PerformanceMetrics & ExtendedMetrics {
    const avgResponseTime = this.calculateAverageResponseTime();
    const successRate = this.calculateSuccessRate();
    const errorRate = this.calculateErrorRate();
    const throughput = this.calculateThroughput();

    return {
      // Basic metrics from interface
      responseTime: avgResponseTime,
      dnsLookupTime: this.calculateAverageDetailedTiming('dnsLookupTime'),
      tcpConnectTime: this.calculateAverageDetailedTiming('tcpConnectTime'),
      tlsHandshakeTime: this.calculateAverageDetailedTiming('tlsHandshakeTime'),
      firstByteTime: this.calculateAverageDetailedTiming('firstByteTime'),
      downloadTime: this.calculateAverageDetailedTiming('downloadTime'),

      // Extended metrics
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      averageResponseTime: avgResponseTime,
      minResponseTime: this.metrics.minResponseTime === Infinity ? 0 : this.metrics.minResponseTime,
      maxResponseTime: this.metrics.maxResponseTime,
      successRate,
      errorRate,
      throughput,
      statusCodeDistribution: { ...this.metrics.statusCodeDistribution }
    };
  }

  /**
   * Get detailed performance metrics with statistical analysis
   * 
   * @returns Comprehensive performance metrics
   */
  getDetailedMetrics(): DetailedPerformanceMetrics {
    const basicMetrics = this.getMetrics();
    const percentiles = this.calculatePercentiles();
    const performanceBands = this.getPerformanceBands();
    const trends = this.calculateTrends();

    return {
      ...basicMetrics,
      percentiles,
      performanceBands,
      trends,
      detailedTimings: this.getDetailedTimingStats(),
      thresholdViolations: this.getThresholdViolations(),
      resourceUsage: this.getResourceUsage(),
      timeSeriesData: this.getTimeSeriesData()
    };
  }

  /**
   * Get performance percentiles
   * 
   * @returns Percentile calculations
   */
  getPercentiles(): PercentileMetrics {
    return this.calculatePercentiles();
  }

  /**
   * Check if performance meets SLA requirements
   * 
   * @param slaRequirements - SLA requirements to check against
   * @returns SLA compliance report
   */
  checkSLA(slaRequirements: SLARequirements): SLAComplianceReport {
    const metrics = this.getDetailedMetrics();
    
    return {
      overallCompliance: this.calculateOverallSLACompliance(metrics, slaRequirements),
      responseTimeCompliance: this.checkResponseTimeSLA(metrics, slaRequirements),
      availabilityCompliance: this.checkAvailabilitySLA(metrics, slaRequirements),
      throughputCompliance: this.checkThroughputSLA(metrics, slaRequirements),
      details: {
        averageResponseTime: metrics.averageResponseTime,
        p95ResponseTime: metrics.percentiles.p95,
        p99ResponseTime: metrics.percentiles.p99,
        successRate: metrics.successRate,
        throughput: metrics.throughput
      },
      violations: this.getThresholdViolations()
    };
  }

  /**
   * Get performance trend analysis
   * 
   * @returns Performance trend information
   */
  getTrends(): PerformanceTrends {
    return this.calculateTrends();
  }

  /**
   * Reset all performance metrics
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      statusCodeDistribution: {},
      responseTimes: [],
      responseTimeTimestamps: [],
      detailedTimings: {
        dnsLookupTime: [],
        tcpConnectTime: [],
        tlsHandshakeTime: [],
        firstByteTime: [],
        downloadTime: []
      },
      performanceBands: {
        fast: 0,      // < 500ms
        medium: 0,    // 500ms - 1000ms
        slow: 0,      // 1000ms - 3000ms
        verySlow: 0   // > 3000ms
      },
      requestMetadata: [],
      thresholdViolations: [],
      startTime: Date.now(),
      lastRequestTime: 0
    };
  }

  /**
   * Take a performance snapshot for historical tracking
   * 
   * @param label - Optional label for the snapshot
   */
  takeSnapshot(label?: string): PerformanceSnapshot {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      label: label || `Snapshot ${this.performanceHistory.length + 1}`,
      metrics: this.getDetailedMetrics(),
      duration: Date.now() - this.metrics.startTime,
      requestCount: this.metrics.totalRequests
    };

    this.performanceHistory.push(snapshot);

    // Maintain history size limit
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    return snapshot;
  }

  /**
   * Compare current performance with a previous snapshot
   * 
   * @param snapshot - Snapshot to compare against
   * @returns Performance comparison report
   */
  compareWithSnapshot(snapshot: PerformanceSnapshot): PerformanceComparison {
    const currentMetrics = this.getDetailedMetrics();
    const previousMetrics = snapshot.metrics;

    return {
      responseTimeChange: this.calculatePercentageChange(
        currentMetrics.averageResponseTime,
        previousMetrics.averageResponseTime
      ),
      throughputChange: this.calculatePercentageChange(
        currentMetrics.throughput,
        previousMetrics.throughput
      ),
      errorRateChange: this.calculatePercentageChange(
        currentMetrics.errorRate,
        previousMetrics.errorRate
      ),
      p95Change: this.calculatePercentageChange(
        currentMetrics.percentiles.p95,
        previousMetrics.percentiles.p95
      ),
      improvements: this.identifyImprovements(currentMetrics, previousMetrics),
      regressions: this.identifyRegressions(currentMetrics, previousMetrics),
      summary: this.generateComparisonSummary(currentMetrics, previousMetrics)
    };
  }

  /**
   * Get performance history
   * 
   * @returns Array of performance snapshots
   */
  getHistory(): PerformanceSnapshot[] {
    return [...this.performanceHistory];
  }

  /**
   * Export performance data for analysis
   * 
   * @param format - Export format
   * @returns Exported performance data
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      summary: this.getDetailedMetrics(),
      rawData: {
        responseTimes: this.metrics.responseTimes,
        timestamps: this.metrics.responseTimeTimestamps,
        statusCodes: this.metrics.statusCodeDistribution
      },
      history: this.performanceHistory
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private validateInput(responseTime: number, statusCode: number): void {
    if (typeof responseTime !== 'number' || responseTime < 0) {
      throw new Error('Response time must be a non-negative number');
    }

    if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
      throw new Error('Status code must be a valid HTTP status code (100-599)');
    }
  }

  private addResponseTimeSample(responseTime: number, timestamp: number): void {
    this.metrics.responseTimes.push(responseTime);
    this.metrics.responseTimeTimestamps.push(timestamp);
    this.metrics.lastRequestTime = timestamp;
  }

  private updateStatusCodeDistribution(statusCode: number): void {
    this.metrics.statusCodeDistribution[statusCode] = 
      (this.metrics.statusCodeDistribution[statusCode] || 0) + 1;
  }

  private recordDetailedTimings(timings: Partial<DetailedTimings>): void {
    Object.entries(timings).forEach(([key, value]) => {
      if (typeof value === 'number' && value >= 0) {
        const timingKey = key as keyof DetailedTimings;
        if (this.metrics.detailedTimings[timingKey]) {
          this.metrics.detailedTimings[timingKey].push(value);
        }
      }
    });
  }

  private recordRequestMetadata(metadata: RequestMetadata): void {
    this.metrics.requestMetadata.push({
      ...metadata,
      timestamp: Date.now()
    });

    // Maintain metadata limit
    if (this.metrics.requestMetadata.length > this.maxSamples) {
      this.metrics.requestMetadata.shift();
    }
  }

  private updatePerformanceBands(responseTime: number): void {
    if (responseTime < 500) {
      this.metrics.performanceBands.fast++;
    } else if (responseTime < 1000) {
      this.metrics.performanceBands.medium++;
    } else if (responseTime < 3000) {
      this.metrics.performanceBands.slow++;
    } else {
      this.metrics.performanceBands.verySlow++;
    }
  }

  private updateThroughput(timestamp: number): void {
    // Throughput is calculated as requests per second over the last minute
    const oneMinuteAgo = timestamp - 60000;
    const recentRequests = this.metrics.responseTimeTimestamps.filter(t => t > oneMinuteAgo);
    this.metrics.currentThroughput = recentRequests.length / 60; // requests per second
  }

  private maintainSampleLimit(): void {
    if (this.metrics.responseTimes.length > this.maxSamples) {
      const excessCount = this.metrics.responseTimes.length - this.maxSamples;
      this.metrics.responseTimes.splice(0, excessCount);
      this.metrics.responseTimeTimestamps.splice(0, excessCount);
    }

    // Maintain detailed timings limits
    Object.keys(this.metrics.detailedTimings).forEach(key => {
      const timingKey = key as keyof DetailedTimings;
      const timings = this.metrics.detailedTimings[timingKey];
      if (timings.length > this.maxSamples) {
        const excessCount = timings.length - this.maxSamples;
        timings.splice(0, excessCount);
      }
    });
  }

  private calculateAverageResponseTime(): number {
    return this.metrics.totalRequests > 0 
      ? this.metrics.totalResponseTime / this.metrics.totalRequests 
      : 0;
  }

  private calculateSuccessRate(): number {
    return this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
      : 0;
  }

  private calculateErrorRate(): number {
    return this.metrics.totalRequests > 0 
      ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100 
      : 0;
  }

  private calculateThroughput(): number {
    const duration = (this.metrics.lastRequestTime || Date.now()) - this.metrics.startTime;
    const durationInSeconds = duration / 1000;
    return durationInSeconds > 0 ? this.metrics.totalRequests / durationInSeconds : 0;
  }

  private calculateAverageDetailedTiming(timingType: keyof DetailedTimings): number {
    const timings = this.metrics.detailedTimings[timingType];
    return timings.length > 0 
      ? timings.reduce((sum, time) => sum + time, 0) / timings.length 
      : 0;
  }

  private calculatePercentiles(): PercentileMetrics {
    const sortedTimes = [...this.metrics.responseTimes].sort((a, b) => a - b);
    
    if (sortedTimes.length === 0) {
      return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
    }

    return {
      p50: this.calculatePercentile(sortedTimes, 0.5),
      p75: this.calculatePercentile(sortedTimes, 0.75),
      p90: this.calculatePercentile(sortedTimes, 0.9),
      p95: this.calculatePercentile(sortedTimes, 0.95),
      p99: this.calculatePercentile(sortedTimes, 0.99)
    };
  }

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

  private getPerformanceBands(): PerformanceBandMetrics {
    const total = this.metrics.totalRequests;
    
    return {
      fast: {
        count: this.metrics.performanceBands.fast,
        percentage: total > 0 ? (this.metrics.performanceBands.fast / total) * 100 : 0
      },
      medium: {
        count: this.metrics.performanceBands.medium,
        percentage: total > 0 ? (this.metrics.performanceBands.medium / total) * 100 : 0
      },
      slow: {
        count: this.metrics.performanceBands.slow,
        percentage: total > 0 ? (this.metrics.performanceBands.slow / total) * 100 : 0
      },
      verySlow: {
        count: this.metrics.performanceBands.verySlow,
        percentage: total > 0 ? (this.metrics.performanceBands.verySlow / total) * 100 : 0
      }
    };
  }

  private calculateTrends(): PerformanceTrends {
    const recentSamples = Math.min(100, this.metrics.responseTimes.length);
    const oldSamples = Math.min(100, this.metrics.responseTimes.length - recentSamples);
    
    if (recentSamples === 0 || oldSamples === 0) {
      return {
        responseTimetrend: 'stable',
        throughputTrend: 'stable',
        errorRateTrend: 'stable'
      };
    }

    const recentAvg = this.calculateAverageForRange(
      this.metrics.responseTimes.slice(-recentSamples)
    );
    const oldAvg = this.calculateAverageForRange(
      this.metrics.responseTimes.slice(0, oldSamples)
    );

    const responseTimeTrend = this.determineTrend(recentAvg, oldAvg);

    return {
      responseTimetrend: responseTimeTrend,
      throughputTrend: 'stable', // Simplified for now
      errorRateTrend: 'stable'   // Simplified for now
    };
  }

  private calculateAverageForRange(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private determineTrend(recent: number, old: number): 'improving' | 'degrading' | 'stable' {
    const changePercent = old > 0 ? ((recent - old) / old) * 100 : 0;
    
    if (changePercent > 10) return 'degrading';
    if (changePercent < -10) return 'improving';
    return 'stable';
  }

  private getDetailedTimingStats(): DetailedTimingStats {
    const stats: DetailedTimingStats = {} as DetailedTimingStats;
    
    Object.entries(this.metrics.detailedTimings).forEach(([key, values]) => {
      const timingKey = key as keyof DetailedTimings;
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        stats[timingKey] = {
          average: this.calculateAverageForRange(values),
          min: Math.min(...values),
          max: Math.max(...values),
          p95: this.calculatePercentile(sorted, 0.95),
          count: values.length
        };
      } else {
        stats[timingKey] = {
          average: 0,
          min: 0,
          max: 0,
          p95: 0,
          count: 0
        };
      }
    });
    
    return stats;
  }

  private checkPerformanceThresholds(): void {
    const currentMetrics = this.getMetrics();
    
    // Check response time thresholds
    if (currentMetrics.averageResponseTime > this.performanceThresholds.responseTime.critical) {
      this.recordThresholdViolation('responseTime', 'critical', currentMetrics.averageResponseTime);
    } else if (currentMetrics.averageResponseTime > this.performanceThresholds.responseTime.warning) {
      this.recordThresholdViolation('responseTime', 'warning', currentMetrics.averageResponseTime);
    }

    // Check error rate thresholds
    if (currentMetrics.errorRate > this.performanceThresholds.errorRate.critical * 100) {
      this.recordThresholdViolation('errorRate', 'critical', currentMetrics.errorRate);
    } else if (currentMetrics.errorRate > this.performanceThresholds.errorRate.warning * 100) {
      this.recordThresholdViolation('errorRate', 'warning', currentMetrics.errorRate);
    }

    // Check throughput thresholds
    if (currentMetrics.throughput < this.performanceThresholds.throughput.critical) {
      this.recordThresholdViolation('throughput', 'critical', currentMetrics.throughput);
    } else if (currentMetrics.throughput < this.performanceThresholds.throughput.warning) {
      this.recordThresholdViolation('throughput', 'warning', currentMetrics.throughput);
    }
  }

  private recordThresholdViolation(
    metric: string, 
    severity: 'warning' | 'critical', 
    value: number
  ): void {
    const violation: ThresholdViolation = {
      timestamp: Date.now(),
      metric,
      severity,
      value,
      threshold: this.performanceThresholds[metric as keyof PerformanceThresholds][severity]
    };

    this.metrics.thresholdViolations.push(violation);

    // Keep only recent violations (last 100)
    if (this.metrics.thresholdViolations.length > 100) {
      this.metrics.thresholdViolations.shift();
    }
  }

  private getThresholdViolations(): ThresholdViolation[] {
    return [...this.metrics.thresholdViolations];
  }

  private getResourceUsage(): ResourceUsage {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      return {
        memoryUsage: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
          external: memUsage.external
        },
        cpuUsage: process.cpuUsage ? process.cpuUsage() : undefined
      };
    }
    
    return { memoryUsage: { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 } };
  }

  private getTimeSeriesData(): TimeSeriesDataPoint[] {
    const timeSeriesData: TimeSeriesDataPoint[] = [];
    const windowSize = 10; // Group data into 10-request windows
    
    for (let i = 0; i < this.metrics.responseTimes.length; i += windowSize) {
      const window = this.metrics.responseTimes.slice(i, i + windowSize);
      const timestamps = this.metrics.responseTimeTimestamps.slice(i, i + windowSize);
      
      if (window.length > 0) {
        timeSeriesData.push({
          timestamp: timestamps[Math.floor(timestamps.length / 2)], // Middle timestamp
          averageResponseTime: this.calculateAverageForRange(window),
          requestCount: window.length,
          minResponseTime: Math.min(...window),
          maxResponseTime: Math.max(...window)
        });
      }
    }
    
    return timeSeriesData;
  }

  private calculateOverallSLACompliance(
    metrics: DetailedPerformanceMetrics, 
    sla: SLARequirements
  ): boolean {
    return this.checkResponseTimeSLA(metrics, sla) &&
           this.checkAvailabilitySLA(metrics, sla) &&
           this.checkThroughputSLA(metrics, sla);
  }

  private checkResponseTimeSLA(
    metrics: DetailedPerformanceMetrics, 
    sla: SLARequirements
  ): boolean {
    if (sla.maxAverageResponseTime && metrics.averageResponseTime > sla.maxAverageResponseTime) {
      return false;
    }
    if (sla.maxP95ResponseTime && metrics.percentiles.p95 > sla.maxP95ResponseTime) {
      return false;
    }
    return true;
  }

  private checkAvailabilitySLA(
    metrics: DetailedPerformanceMetrics, 
    sla: SLARequirements
  ): boolean {
    if (sla.minSuccessRate && metrics.successRate < sla.minSuccessRate) {
      return false;
    }
    return true;
  }

  private checkThroughputSLA(
    metrics: DetailedPerformanceMetrics, 
    sla: SLARequirements
  ): boolean {
    if (sla.minThroughput && metrics.throughput < sla.minThroughput) {
      return false;
    }
    return true;
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private identifyImprovements(
    current: DetailedPerformanceMetrics, 
    previous: DetailedPerformanceMetrics
  ): string[] {
    const improvements: string[] = [];
    
    if (current.averageResponseTime < previous.averageResponseTime * 0.9) {
      improvements.push('Response time improved significantly');
    }
    if (current.errorRate < previous.errorRate * 0.5) {
      improvements.push('Error rate reduced significantly');
    }
    if (current.throughput > previous.throughput * 1.1) {
      improvements.push('Throughput increased significantly');
    }
    
    return improvements;
  }

  private identifyRegressions(
    current: DetailedPerformanceMetrics, 
    previous: DetailedPerformanceMetrics
  ): string[] {
    const regressions: string[] = [];
    
    if (current.averageResponseTime > previous.averageResponseTime * 1.1) {
      regressions.push('Response time degraded significantly');
    }
    if (current.errorRate > previous.errorRate * 2) {
      regressions.push('Error rate increased significantly');
    }
    if (current.throughput < previous.throughput * 0.9) {
      regressions.push('Throughput decreased significantly');
    }
    
    return regressions;
  }

  private generateComparisonSummary(
    current: DetailedPerformanceMetrics, 
    previous: DetailedPerformanceMetrics
  ): string {
    const responseTimeChange = this.calculatePercentageChange(
      current.averageResponseTime, 
      previous.averageResponseTime
    );
    
    if (Math.abs(responseTimeChange) < 5) {
      return 'Performance remains stable';
    } else if (responseTimeChange < 0) {
      return 'Performance has improved';
    } else {
      return 'Performance has degraded';
    }
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion - in production, use a proper CSV library
    const headers = ['timestamp', 'responseTime', 'statusCode'];
    const rows = [headers.join(',')];
    
    data.rawData.responseTimes.forEach((time: number, index: number) => {
      const timestamp = data.rawData.timestamps[index] || Date.now();
      rows.push(`${timestamp},${time},200`); // Simplified status code
    });
    
    return rows.join('\n');
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

interface PerformanceData {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  statusCodeDistribution: Record<number, number>;
  responseTimes: number[];
  responseTimeTimestamps: number[];
  detailedTimings: {
    [K in keyof DetailedTimings]: number[];
  };
  performanceBands: {
    fast: number;
    medium: number;
    slow: number;
    verySlow: number;
  };
  requestMetadata: (RequestMetadata & { timestamp: number })[];
  thresholdViolations: ThresholdViolation[];
  startTime: number;
  lastRequestTime: number;
  currentThroughput?: number;
}

interface DetailedTimings {
  dnsLookupTime: number;
  tcpConnectTime: number;
  tlsHandshakeTime: number;
  firstByteTime: number;
  downloadTime: number;
}

interface RequestMetadata {
  url?: string;
  method?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
}

interface ExtendedMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  statusCodeDistribution: Record<number, number>;
}

interface PercentileMetrics {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

interface PerformanceBandMetrics {
  fast: { count: number; percentage: number };
  medium: { count: number; percentage: number };
  slow: { count: number; percentage: number };
  verySlow: { count: number; percentage: number };
}

interface PerformanceTrends {
  responseTimetrend: 'improving' | 'degrading' | 'stable';
  throughputTrend: 'improving' | 'degrading' | 'stable';
  errorRateTrend: 'improving' | 'degrading' | 'stable';
}

interface DetailedTimingStats {
  [K in keyof DetailedTimings]: {
    average: number;
    min: number;
    max: number;
    p95: number;
    count: number;
  };
}

interface ThresholdViolation {
  timestamp: number;
  metric: string;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
}

interface ResourceUsage {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
}

interface TimeSeriesDataPoint {
  timestamp: number;
  averageResponseTime: number;
  requestCount: number;
  minResponseTime: number;
  maxResponseTime: number;
}

interface DetailedPerformanceMetrics extends ExtendedMetrics {
  percentiles: PercentileMetrics;
  performanceBands: PerformanceBandMetrics;
  trends: PerformanceTrends;
  detailedTimings: DetailedTimingStats;
  thresholdViolations: ThresholdViolation[];
  resourceUsage: ResourceUsage;
  timeSeriesData: TimeSeriesDataPoint[];
}

interface PerformanceThresholds {
  responseTime: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  throughput: { warning: number; critical: number };
}

interface PerformanceTrackerOptions {
  maxSamples?: number;
  thresholds?: Partial<PerformanceThresholds>;
}

interface SLARequirements {
  maxAverageResponseTime?: number;
  maxP95ResponseTime?: number;
  minSuccessRate?: number;
  minThroughput?: number;
}

interface SLAComplianceReport {
  overallCompliance: boolean;
  responseTimeCompliance: boolean;
  availabilityCompliance: boolean;
  throughputCompliance: boolean;
  details: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    successRate: number;
    throughput: number;
  };
  violations: ThresholdViolation[];
}

interface PerformanceSnapshot {
  timestamp: number;
  label: string;
  metrics: DetailedPerformanceMetrics;
  duration: number;
  requestCount: number;
}

interface PerformanceComparison {
  responseTimeChange: number;
  throughputChange: number;
  errorRateChange: number;
  p95Change: number;
  improvements: string[];
  regressions: string[];
  summary: string;
}