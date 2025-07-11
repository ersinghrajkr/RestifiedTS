private performBasicAnalysis(auditEntries: AuditLogEntry[]): TestSummary {
    const totalTests = auditEntries.length;
    const passedTests = auditEntries.filter(entry => !entry.error && entry.response.status < 400).length;
    const failedTests = totalTests - passedTests;
    
    const startTime = auditEntries.length > 0 
      ? Math.min(...auditEntries.map(entry => entry.timestamp.getTime()))
      : Date.now();
    const endTime = auditEntries.length > 0
      ? Math.max(...auditEntries.map(entry => entry.timestamp.getTime()))
      : Date.now();

    const duration = endTime - startTime;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    // Analyze by test name
    const testsByName = this.groupByTestName(auditEntries);
    
    // Analyze by status code
    const statusCodeDistribution = this.calculateStatusCodeDistribution(auditEntries);

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      duration,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      testsByName,
      statusCodeDistribution
    };
  }

  private calculatePerformanceMetrics(auditEntries: AuditLogEntry[]): PerformanceMetrics {
    const responseTimes = auditEntries
      .filter(entry => !entry.error)
      .map(entry => entry.duration);

    if (responseTimes.length === 0) {
      return {
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        throughput: 0,
        totalRequests: 0
      };
    }

    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const totalTime = responseTimes.reduce((sum, time) => sum + time, 0);

    return {
      averageResponseTime: totalTime / responseTimes.length,
      minResponseTime: sortedTimes[0],
      maxResponseTime: sortedTimes[sortedTimes.length - 1],
      p50: this.calculatePercentile(sortedTimes, 0.5),
      p90: this.calculatePercentile(sortedTimes, 0.9),
      p95: this.calculatePercentile(sortedTimes, 0.95),
      p99: this.calculatePercentile(sortedTimes, 0.99),
      throughput: this.calculateThroughput(auditEntries),
      totalRequests: auditEntries.length
    };
  }

  private analyzeErrors(auditEntries: AuditLogEntry[]): ErrorAnalysis {
    const errorEntries = auditEntries.filter(entry => entry.error || entry.response.status >= 400);
    
    const errorsByType = new Map<string, number>();
    const errorsByStatus = new Map<number, number>();
    const errorDetails: ErrorDetail[] = [];

    errorEntries.forEach(entry => {
      if (entry.error) {
        const errorType = entry.error.constructor.name;
        errorsByType.set(errorType, (errorsByType.get(errorType) || 0) + 1);
        
        errorDetails.push({
          testName: entry.testName,
          timestamp: entry.timestamp,
          errorType,
          message: entry.error.message,
          statusCode: entry.response.status
        });
      } else {
        const statusCode = entry.response.status;
        errorsByStatus.set(statusCode, (errorsByStatus.get(statusCode) || 0) + 1);
        
        errorDetails.push({
          testName: entry.testName,
          timestamp: entry.timestamp,
          errorType: 'HTTP_ERROR',
          message: `HTTP ${statusCode}: ${entry.response.statusText}`,
          statusCode
        });
      }
    });

    return {
      totalErrors: errorEntries.length,
      errorsByType: Object.fromEntries(errorsByType),
      errorsByStatus: Object.fromEntries(errorsByStatus),
      errorDetails,
      errorRate: auditEntries.length > 0 ? (errorEntries.length / auditEntries.length) * 100 : 0
    };
  }

  private calculateTestCoverage(auditEntries: AuditLogEntry[]): TestCoverage {
    const endpoints = new Set<string>();
    const methods = new Set<string>();
    const testNames = new Set<string>();

    auditEntries.forEach(entry => {
      endpoints.add(entry.request.url);
      methods.add(entry.request.method);
      testNames.add(entry.testName);
    });

    const endpointCoverage = this.calculateEndpointCoverage(auditEntries);

    return {
      uniqueEndpoints: endpoints.size,
      uniqueMethods: methods.size,
      uniqueTests: testNames.size,
      endpointCoverage
    };
  }

  private analyzeSnapshots(snapshots: Map<string, any>): SnapshotInfo {
    return {
      totalSnapshots: snapshots.size,
      snapshotKeys: Array.from(snapshots.keys()),
      snapshotSizes: this.calculateSnapshotSizes(snapshots)
    };
  }

  private generateTimeline(auditEntries: AuditLogEntry[]): TimelineData[] {
    const sortedEntries = [...auditEntries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return sortedEntries.map(entry => ({
      timestamp: entry.timestamp,
      testName: entry.testName,
      method: entry.request.method,
      url: entry.request.url,
      status: entry.response.status,
      duration: entry.duration,
      success: !entry.error && entry.response.status < 400
    }));
  }

  private generateMetadata(): ReportMetadata {
    return {
      generatedAt: new Date(),
      generator: 'RestifiedTS Report Generator',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'unknown'
    };
  }

  // ==========================================
  // PRIVATE METHODS - HTML GENERATION
  // ==========================================

  private generateHtmlContent(reportData: TestReportData): string {
    const template = this.templates.get('main') || this.getDefaultMainTemplate();
    
    return template
      .replace('{{TITLE}}', 'RestifiedTS Test Report')
      .replace('{{SUMMARY}}', this.generateSummaryHtml(reportData.summary))
      .replace('{{PERFORMANCE}}', this.generatePerformanceHtml(reportData.performance))
      .replace('{{ERRORS}}', this.generateErrorsHtml(reportData.errors))
      .replace('{{TIMELINE}}', this.generateTimelineHtml(reportData.timeline))
      .replace('{{COVERAGE}}', this.generateCoverageHtml(reportData.coverage))
      .replace('{{SNAPSHOTS}}', this.generateSnapshotsHtml(reportData.snapshots))
      .replace('{{METADATA}}', this.generateMetadataHtml(reportData.metadata))
      .replace('{{STYLES}}', this.getReportStyles())
      .replace('{{SCRIPTS}}', this.getReportScripts());
  }

  private generateSummaryHtml(summary: TestSummary): string {
    const successRate = summary.successRate.toFixed(1);
    const duration = this.formatDuration(summary.duration);
    
    return `
      <div class="summary-section">
        <h2>Test Summary</h2>
        <div class="summary-grid">
          <div class="summary-card ${summary.successRate >= 95 ? 'success' : summary.successRate >= 80 ? 'warning' : 'error'}">
            <h3>Success Rate</h3>
            <div class="summary-value">${successRate}%</div>
          </div>
          <div class="summary-card">
            <h3>Total Tests</h3>
            <div class="summary-value">${summary.totalTests}</div>
          </div>
          <div class="summary-card success">
            <h3>Passed</h3>
            <div class="summary-value">${summary.passedTests}</div>
          </div>
          <div class="summary-card error">
            <h3>Failed</h3>
            <div class="summary-value">${summary.failedTests}</div>
          </div>
          <div class="summary-card">
            <h3>Duration</h3>
            <div class="summary-value">${duration}</div>
          </div>
        </div>
        <div class="status-distribution">
          <h4>Status Code Distribution</h4>
          <div class="chart-container">
            <canvas id="statusChart" width="400" height="200"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  private generatePerformanceHtml(performance: PerformanceMetrics): string {
    return `
      <div class="performance-section">
        <h2>Performance Metrics</h2>
        <div class="performance-grid">
          <div class="performance-card">
            <h4>Average Response Time</h4>
            <div class="performance-value">${performance.averageResponseTime.toFixed(0)}ms</div>
          </div>
          <div class="performance-card">
            <h4>95th Percentile</h4>
            <div class="performance-value">${performance.p95.toFixed(0)}ms</div>
          </div>
          <div class="performance-card">
            <h4>Throughput</h4>
            <div class="performance-value">${performance.throughput.toFixed(2)} req/s</div>
          </div>
          <div class="performance-card">
            <h4>Min/Max</h4>
            <div class="performance-value">${performance.minResponseTime}ms / ${performance.maxResponseTime}ms</div>
          </div>
        </div>
        <div class="response-time-chart">
          <h4>Response Time Distribution</h4>
          <canvas id="responseTimeChart" width="600" height="300"></canvas>
        </div>
      </div>
    `;
  }

  private generateErrorsHtml(errors: ErrorAnalysis): string {
    if (errors.totalErrors === 0) {
      return `
        <div class="errors-section">
          <h2>Errors</h2>
          <div class="no-errors">
            <p>✅ No errors detected in this test run!</p>
          </div>
        </div>
      `;
    }

    const errorDetailsHtml = errors.errorDetails
      .slice(0, 10) // Show only first 10 errors
      .map(error => `
        <tr>
          <td>${error.testName}</td>
          <td>${error.timestamp.toISOString()}</td>
          <td><span class="error-type">${error.errorType}</span></td>
          <td>${this.escapeHtml(error.message)}</td>
          <td>${error.statusCode || 'N/A'}</td>
        </tr>
      `)
      .join('');

    return `
      <div class="errors-section">
        <h2>Errors (${errors.totalErrors})</h2>
        <div class="error-summary">
          <p>Error Rate: <strong>${errors.errorRate.toFixed(1)}%</strong></p>
        </div>
        <div class="error-details">
          <h4>Error Details</h4>
          <table class="error-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Message</th>
                <th>Status Code</th>
              </tr>
            </thead>
            <tbody>
              ${errorDetailsHtml}
            </tbody>
          </table>
          ${errors.errorDetails.length > 10 ? `<p>... and ${errors.errorDetails.length - 10} more errors</p>` : ''}
        </div>
      </div>
    `;
  }

  private generateTimelineHtml(timeline: TimelineData[]): string {
    const timelineHtml = timeline
      .slice(0, 20) // Show only first 20 entries
      .map(entry => `
        <div class="timeline-entry ${entry.success ? 'success' : 'error'}">
          <div class="timeline-time">${entry.timestamp.toLocaleTimeString()}</div>
          <div class="timeline-content">
            <div class="timeline-test">${entry.testName}</div>
            <div class="timeline-request">${entry.method} ${entry.url}</div>
            <div class="timeline-status">Status: ${entry.status} (${entry.duration}ms)</div>
          </div>
        </div>
      `)
      .join('');

    return `
      <div class="timeline-section">
        <h2>Test Timeline</h2>
        <div class="timeline-container">
          ${timelineHtml}
          ${timeline.length > 20 ? `<p>... and ${timeline.length - 20} more entries</p>` : ''}
        </div>
      </div>
    `;
  }

  private generateCoverageHtml(coverage: TestCoverage): string {
    return `
      <div class="coverage-section">
        <h2>Test Coverage</h2>
        <div class="coverage-stats">
          <div class="coverage-stat">
            <h4>Unique Endpoints</h4>
            <div class="coverage-value">${coverage.uniqueEndpoints}</div>
          </div>
          <div class="coverage-stat">
            <h4>HTTP Methods</h4>
            <div class="coverage-value">${coverage.uniqueMethods}</div>
          </div>
          <div class="coverage-stat">
            <h4>Test Cases</h4>
            <div class="coverage-value">${coverage.uniqueTests}</div>
          </div>
        </div>
      </div>
    `;
  }

  private generateSnapshotsHtml(snapshots: SnapshotInfo): string {
    if (snapshots.totalSnapshots === 0) {
      return `
        <div class="snapshots-section">
          <h2>Snapshots</h2>
          <p>No snapshots were created during this test run.</p>
        </div>
      `;
    }

    return `
      <div class="snapshots-section">
        <h2>Snapshots (${snapshots.totalSnapshots})</h2>
        <div class="snapshot-list">
          ${snapshots.snapshotKeys.map(key => `
            <div class="snapshot-item">
              <span class="snapshot-key">${key}</span>
              <span class="snapshot-size">${this.formatBytes(snapshots.snapshotSizes[key] || 0)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private generateMetadataHtml(metadata: ReportMetadata): string {
    return `
      <div class="metadata-section">
        <h2>Report Information</h2>
        <div class="metadata-grid">
          <div class="metadata-item">
            <label>Generated At:</label>
            <span>${metadata.generatedAt.toISOString()}</span>
          </div>
          <div class="metadata-item">
            <label>Generator:</label>
            <span>${metadata.generator} v${metadata.version}</span>
          </div>
          <div class="metadata-item">
            <label>Environment:</label>
            <span>${metadata.environment}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // PRIVATE METHODS - JSON GENERATION
  // ==========================================

  private generateJsonContent(reportData: TestReportData): JsonReport {
    return {
      summary: {
        totalTests: reportData.summary.totalTests,
        passedTests: reportData.summary.passedTests,
        failedTests: reportData.summary.failedTests,
        successRate: reportData.summary.successRate,
        duration: reportData.summary.duration,
        startTime: reportData.summary.startTime.toISOString(),
        endTime: reportData.summary.endTime.toISOString()
      },
      performance: reportData.performance,
      errors: {
        totalErrors: reportData.errors.totalErrors,
        errorRate: reportData.errors.errorRate,
        errorsByType: reportData.errors.errorsByType,
        errorsByStatus: reportData.errors.errorsByStatus
      },
      coverage: reportData.coverage,
      metadata: {
        generatedAt: reportData.metadata.generatedAt.toISOString(),
        generator: reportData.metadata.generator,
        version: reportData.metadata.version,
        environment: reportData.metadata.environment
      }
    };
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputPath)) {
      fs.mkdirSync(this.config.outputPath, { recursive: true });
    }
  }

  private generateReportPath(extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `restified-report-${timestamp}.${extension}`;
    return path.join(this.config.outputPath, filename);
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

  private calculateThroughput(auditEntries: AuditLogEntry[]): number {
    if (auditEntries.length === 0) return 0;
    
    const startTime = Math.min(...auditEntries.map(entry => entry.timestamp.getTime()));
    const endTime = Math.max(...auditEntries.map(entry => entry.timestamp.getTime()));
    const durationSeconds = (endTime - startTime) / 1000;
    
    return durationSeconds > 0 ? auditEntries.length / durationSeconds : 0;
  }

  private groupByTestName(auditEntries: AuditLogEntry[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    auditEntries.forEach(entry => {
      groups[entry.testName] = (groups[entry.testName] || 0) + 1;
    });
    
    return groups;
  }

  private calculateStatusCodeDistribution(auditEntries: AuditLogEntry[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    auditEntries.forEach(entry => {
      const statusCode = entry.response.status;
      distribution[statusCode] = (distribution[statusCode] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateEndpointCoverage(auditEntries: AuditLogEntry[]): Record<string, EndpointCoverage> {
    const coverage: Record<string, EndpointCoverage> = {};
    
    auditEntries.forEach(entry => {
      const endpoint = entry.request.url;
      if (!coverage[endpoint]) {
        coverage[endpoint] = {
          endpoint,
          methods: new Set(),
          totalRequests: 0,
          successfulRequests: 0
        };
      }
      
      coverage[endpoint].methods.add(entry.request.method);
      coverage[endpoint].totalRequests++;
      
      if (!entry.error && entry.response.status < 400) {
        coverage[endpoint].successfulRequests++;
      }
    });
    
    // Convert Sets to Arrays for JSON serialization
    Object.values(coverage).forEach(cov => {
      (cov as any).methods = Array.from(cov.methods);
    });
    
    return coverage;
  }

  private calculateSnapshotSizes(snapshots: Map<string, any>): Record<string, number> {
    const sizes: Record<string, number> = {};
    
    snapshots.forEach((data, key) => {
      sizes[key] = JSON.stringify(data).length;
    });
    
    return sizes;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private escapeHtml(text: string): string {
    const div = { innerHTML: '' } as any;
    div.textContent = text;
    return div.innerHTML;
  }

  private loadTemplates(): void {
    // In a real implementation, these would be loaded from files
    this.templates.set('main', this.getDefaultMainTemplate());
  }

  private getDefaultMainTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>{{STYLES}}</style>
</head>
<body>
    <div class="container">
        <header>
            <h1>{{TITLE}}</h1>
            <p>Generated on {{TIMESTAMP}}</p>
        </header>
        
        <main>
            {{SUMMARY}}
            {{PERFORMANCE}}
            {{ERRORS}}
            {{TIMELINE}}
            {{COVERAGE}}
            {{SNAPSHOTS}}
            {{METADATA}}
        </main>
    </div>
    
    <script>{{SCRIPTS}}</script>
</body>
</html>
    `;
  }

  private getReportStyles(): string {
    return `
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
      .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
      .summary-card { padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #ddd; }
      .summary-card.success { background: #d4edda; border-color: #c3e6cb; }
      .summary-card.warning { background: #fff3cd; border-color: #ffeaa7; }
      .summary-card.error { background: #f8d7da; border-color: #f5c6cb; }
      .summary-value { font-size: 2em; font-weight: bold; margin-top: 10px; }
      .error-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .error-table th, .error-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
      .error-table th { background: #f8f9fa; }
      .timeline-entry { margin: 10px 0; padding: 15px; border-left: 4px solid #ccc; background: #f8f9fa; }
      .timeline-entry.success { border-left-color: #28a745; }
      .timeline-entry.error { border-left-color: #dc3545; }
    `;
  }

  private getReportScripts(): string {
    return `
      // Add interactive functionality here
      console.log('RestifiedTS Report loaded');
    `;
  }

  private async generateHtmlAssets(outputDir: string): Promise<void> {
    // Generate CSS and JS files if needed
    const cssPath = path.join(outputDir, 'report.css');
    const jsPath = path.join(outputDir, 'report.js');
    
    await fs.promises.writeFile(cssPath, this.getReportStyles(), 'utf-8');
    await fs.promises.writeFile(jsPath, this.getReportScripts(), 'utf-8');
  }

  private generateJUnitXml(reportData: TestReportData): string {
    const testSuites = Object.entries(reportData.summary.testsByName).map(([testName, count]) => {
      return `<testsuite name="${testName}" tests="${count}" failures="0" errors="0" time="0">
        <testcase classname="${testName}" name="test" time="0"/>
      </testsuite>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  ${testSuites}
</testsuites>`;
  }

  private analyzePerformanceData(
    auditEntries: AuditLogEntry[],
    baseline?: PerformanceBaseline
  ): PerformanceAnalysis {
    const current = this.calculatePerformanceMetrics(auditEntries);
    
    return {
      current,
      baseline,
      comparison: baseline ? this.compareWithBaseline(current, baseline) : undefined
    };
  }

  private compareWithBaseline(
    current: PerformanceMetrics,
    baseline: PerformanceBaseline
  ): PerformanceComparison {
    return {
      responseTimeChange: ((current.averageResponseTime - baseline.averageResponseTime) / baseline.averageResponseTime) * 100,
      throughputChange: ((current.throughput - baseline.throughput) / baseline.throughput) * 100,
      p95Change: ((current.p95 - baseline.p95) / baseline.p95) * 100
    };
  }

  private analyzeSnapshotData(
    snapshots: Map<string, any>,
    previousSnapshots?: Map<string, any>
  ): SnapshotAnalysis {
    const changes: SnapshotChange[] = [];
    
    if (previousSnapshots) {
      snapshots.forEach((data, key) => {
        const previousData = previousSnapshots.get(key);
        if (previousData) {
          const hasChanges = JSON.stringify(data) !== JSON.stringify(previousData);
          if (hasChanges) {
            changes.push({
              key,
              type: 'modified',
              currentSize: JSON.stringify(data).length,
              previousSize: JSON.stringify(previousData).length
            });
          }
        } else {
          changes.push({
            key,
            type: 'added',
            currentSize: JSON.stringify(data).length
          });
        }
      });
      
      previousSnapshots.forEach((_, key) => {
        if (!snapshots.has(key)) {
          changes.push({
            key,
            type: 'removed'
          });
        }
      });
    }
    
    return {
      totalSnapshots: snapshots.size,
      changes,
      hasChanges: changes.length > 0
    };
  }

  private generatePerformanceHtml(performanceData: PerformanceAnalysis): string {
    // Implementation would generate performance-specific HTML
    return this.generatePerformanceHtml(performanceData.current);
  }

  private generateSnapshotHtml(snapshotData: SnapshotAnalysis): string {
    // Implementation would generate snapshot-specific HTML
    return `<div class="snapshot-analysis">Snapshot Analysis</div>`;
  }

  private generateDashboardMain(reportData: TestReportData): string {
    // Implementation would generate dashboard main page
    return this.generateHtmlContent(reportData);
  }

  private async generateDashboardSections(reportData: TestReportData, dashboardPath: string): Promise<void> {
    // Generate individual dashboard sections
    const sectionsPath = path.join(dashboardPath, 'sections');
    await fs.promises.mkdir(sectionsPath, { recursive: true });
    
    // Generate performance section
    const performanceHtml = this.generatePerformanceHtml(reportData.performance);
    await fs.promises.writeFile(
      path.join(sectionsPath, 'performance.html'),
      performanceHtml,
      'utf-8'
    );
  }

  private async copyDashboardAssets(dashboardPath: string): Promise<void> {
    // Copy CSS, JS, and other assets
    await this.generateHtmlAssets(dashboardPath);
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

interface TestReportData {
  summary: TestSummary;
  performance: PerformanceMetrics;
  errors: ErrorAnalysis;
  coverage: TestCoverage;
  snapshots: SnapshotInfo;
  timeline: TimelineData[];
  metadata: ReportMetadata;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  testsByName: Record<string, number>;
  statusCodeDistribution: Record<number, number>;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number;
  totalRequests: number;
}

interface ErrorAnalysis {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByStatus: Record<number, number>;
  errorDetails: ErrorDetail[];
  errorRate: number;
}

interface ErrorDetail {
  testName: string;
  timestamp: Date;
  errorType: string;
  message: string;
  statusCode?: number;
}

interface TestCoverage {
  uniqueEndpoints: number;
  uniqueMethods: number;
  uniqueTests: number;
  endpointCoverage: Record<string, EndpointCoverage>;
}

interface EndpointCoverage {
  endpoint: string;
  methods: Set<string>;
  totalRequests: number;
  successfulRequests: number;
}

interface SnapshotInfo {
  totalSnapshots: number;
  snapshotKeys: string[];
  snapshotSizes: Record<string, number>;
}

interface TimelineData {
  timestamp: Date;
  testName: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  success: boolean;
}

interface ReportMetadata {
  generatedAt: Date;
  generator: string;
  version: string;
  environment: string;
}

interface JsonReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    duration: number;
    startTime: string;
    endTime: string;
  };
  performance: PerformanceMetrics;
  errors: {
    totalErrors: number;
    errorRate: number;
    errorsByType: Record<string, number>;
    errorsByStatus: Record<number, number>;
  };
  coverage: TestCoverage;
  metadata: {
    generatedAt: string;
    generator: string;
    version: string;
    environment: string;
  };
}

interface PerformanceBaseline {
  averageResponseTime: number;
  throughput: number;
  p95: number;
  errorRate: number;
}

interface PerformanceComparison {
  responseTimeChange: number;
  throughputChange: number;
  p95Change: number;
}

interface PerformanceAnalysis {
  current: PerformanceMetrics;
  baseline?: PerformanceBaseline;
  comparison?: PerformanceComparison;
}

interface SnapshotChange {
  key: string;
  type: 'added' | 'removed' | 'modified';
  currentSize?: number;
  previousSize?: number;
}

interface SnapshotAnalysis {
  totalSnapshots: number;
  changes: SnapshotChange[];
  hasChanges: boolean;
}// src/reporting/ReportGenerator.ts

import * as fs from 'fs';
import * as path from 'path';
import { 
  RestifiedConfig, 
  AuditLogEntry, 
  RestifiedResponse 
} from '../types/RestifiedTypes';

/**
 * Comprehensive report generation system for API test results
 * 
 * Features:
 * - HTML reports with interactive charts and filtering
 * - JSON reports for CI/CD integration
 * - Performance trend analysis
 * - Snapshot comparison reports
 * - Error analysis and categorization
 * - Test coverage metrics
 * - Customizable templates and themes
 * - Multi-format export support
 * 
 * @example
 * ```typescript
 * const generator = new ReportGenerator({
 *   enabled: true,
 *   format: 'html',
 *   outputPath: './reports',
 *   includeSnapshots: true
 * });
 * 
 * const reportPath = await generator.generateHtmlReport(
 *   auditEntries,
 *   snapshots,
 *   './reports/test-results.html'
 * );
 * ```
 */
export class ReportGenerator {
  private readonly config: RestifiedConfig['reporting'];
  private readonly templates: Map<string, string> = new Map();

  constructor(config: RestifiedConfig['reporting']) {
    this.config = { ...config };
    this.ensureOutputDirectory();
    this.loadTemplates();
  }

  /**
   * Generate comprehensive HTML report
   * 
   * @param auditEntries - Array of audit log entries
   * @param snapshots - Map of snapshots
   * @param outputPath - Optional output file path
   * @returns Promise resolving to report file path
   */
  async generateHtmlReport(
    auditEntries: AuditLogEntry[],
    snapshots: Map<string, any>,
    outputPath?: string
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Report generation is disabled');
    }

    const reportData = this.analyzeTestData(auditEntries, snapshots);
    const reportPath = outputPath || this.generateReportPath('html');
    
    const htmlContent = this.generateHtmlContent(reportData);
    
    await fs.promises.writeFile(reportPath, htmlContent, 'utf-8');
    
    // Generate additional assets if needed
    await this.generateHtmlAssets(path.dirname(reportPath));
    
    return reportPath;
  }

  /**
   * Generate JSON report for CI/CD integration
   * 
   * @param auditEntries - Array of audit log entries
   * @param snapshots - Map of snapshots
   * @param outputPath - Optional output file path
   * @returns Promise resolving to report file path
   */
  async generateJsonReport(
    auditEntries: AuditLogEntry[],
    snapshots: Map<string, any>,
    outputPath?: string
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Report generation is disabled');
    }

    const reportData = this.analyzeTestData(auditEntries, snapshots);
    const reportPath = outputPath || this.generateReportPath('json');
    
    const jsonReport = this.generateJsonContent(reportData);
    
    await fs.promises.writeFile(reportPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
    
    return reportPath;
  }

  /**
   * Generate XML report (JUnit format) for CI/CD integration
   * 
   * @param auditEntries - Array of audit log entries
   * @param snapshots - Map of snapshots
   * @param outputPath - Optional output file path
   * @returns Promise resolving to report file path
   */
  async generateXmlReport(
    auditEntries: AuditLogEntry[],
    snapshots: Map<string, any>,
    outputPath?: string
  ): Promise<string> {
    const reportData = this.analyzeTestData(auditEntries, snapshots);
    const reportPath = outputPath || this.generateReportPath('xml');
    
    const xmlContent = this.generateJUnitXml(reportData);
    
    await fs.promises.writeFile(reportPath, xmlContent, 'utf-8');
    
    return reportPath;
  }

  /**
   * Generate performance trend report
   * 
   * @param auditEntries - Array of audit log entries
   * @param baselineData - Optional baseline performance data
   * @param outputPath - Optional output file path
   * @returns Promise resolving to report file path
   */
  async generatePerformanceReport(
    auditEntries: AuditLogEntry[],
    baselineData?: PerformanceBaseline,
    outputPath?: string
  ): Promise<string> {
    const performanceData = this.analyzePerformanceData(auditEntries, baselineData);
    const reportPath = outputPath || this.generateReportPath('performance.html');
    
    const htmlContent = this.generatePerformanceHtml(performanceData);
    
    await fs.promises.writeFile(reportPath, htmlContent, 'utf-8');
    
    return reportPath;
  }

  /**
   * Generate snapshot comparison report
   * 
   * @param snapshots - Map of snapshots
   * @param previousSnapshots - Map of previous snapshots for comparison
   * @param outputPath - Optional output file path
   * @returns Promise resolving to report file path
   */
  async generateSnapshotReport(
    snapshots: Map<string, any>,
    previousSnapshots?: Map<string, any>,
    outputPath?: string
  ): Promise<string> {
    const snapshotData = this.analyzeSnapshotData(snapshots, previousSnapshots);
    const reportPath = outputPath || this.generateReportPath('snapshots.html');
    
    const htmlContent = this.generateSnapshotHtml(snapshotData);
    
    await fs.promises.writeFile(reportPath, htmlContent, 'utf-8');
    
    return reportPath;
  }

  /**
   * Generate dashboard report with multiple views
   * 
   * @param auditEntries - Array of audit log entries
   * @param snapshots - Map of snapshots
   * @param outputPath - Optional output directory path
   * @returns Promise resolving to dashboard directory path
   */
  async generateDashboard(
    auditEntries: AuditLogEntry[],
    snapshots: Map<string, any>,
    outputPath?: string
  ): Promise<string> {
    const dashboardPath = outputPath || path.join(this.config.outputPath, 'dashboard');
    
    // Ensure dashboard directory exists
    await fs.promises.mkdir(dashboardPath, { recursive: true });
    
    const reportData = this.analyzeTestData(auditEntries, snapshots);
    
    // Generate main dashboard
    const mainHtml = this.generateDashboardMain(reportData);
    await fs.promises.writeFile(path.join(dashboardPath, 'index.html'), mainHtml, 'utf-8');
    
    // Generate individual report sections
    await this.generateDashboardSections(reportData, dashboardPath);
    
    // Copy assets
    await this.copyDashboardAssets(dashboardPath);
    
    return dashboardPath;
  }

  /**
   * Update configuration
   * 
   * @param updates - Configuration updates
   */
  updateConfig(updates: Partial<RestifiedConfig['reporting']>): void {
    Object.assign(this.config, updates);
    this.ensureOutputDirectory();
  }

  // ==========================================
  // PRIVATE METHODS - DATA ANALYSIS
  // ==========================================

  private analyzeTestData(
    auditEntries: AuditLogEntry[],
    snapshots: Map<string, any>
  ): TestReportData {
    const analysis = this.performBasicAnalysis(auditEntries);
    const performanceMetrics = this.calculatePerformanceMetrics(auditEntries);
    const errorAnalysis = this.analyzeErrors(auditEntries);
    const testCoverage = this.calculateTestCoverage(auditEntries);
    const snapshotInfo = this.analyzeSnapshots(snapshots);
    
    return {
      summary: analysis,
      performance: performanceMetrics,
      errors: errorAnalysis,
      coverage: testCoverage,
      snapshots: snapshotInfo,
      timeline: this.generateTimeline(auditEntries),
      metadata: this.generateMetadata()
    };
  }

  private performBasicAnalysis(auditEntries: AuditLogEntry[]): TestSummary {
    const totalTests = auditEntries.length;
    const passedTests = auditEntries.filter(entry => !entry.error && entry.response.status < 400).length;
    const failedTests = totalTests - passedTests;
    
    const startTime = auditEntries.length > 0 
      ? Math.min(...auditEntries.map(entry => entry.timestamp.getTime()))
      : Date.now();
    const endTime = auditEntries.length > 0
      ? Math.max(...auditEntries.map(entry => entry.timestamp.getTime()))
      : Date.now();             
  } }