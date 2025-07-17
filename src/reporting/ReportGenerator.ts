/**
 * Report Generator for RestifiedTS
 * 
 * This module provides comprehensive report generation capabilities
 * for test results, performance metrics, and analytics.
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  ReportGenerator,
  ReportFormat,
  ReportOutput,
  ReportConfig,
  TestExecutionResult,
  TestStatus,
  TestSeverity,
  TestStatistics,
  PerformanceMetrics,
  TestAnalytics,
  DashboardData,
  CustomReportSection,
  ReportTemplate
} from './ReportingTypes';
import { LogEntry } from '../logging/LoggingTypes';

/**
 * HTML Report Generator
 */
export class HtmlReportGenerator implements ReportGenerator {
  format = ReportFormat.HTML;

  async generate(result: TestExecutionResult, config: ReportConfig): Promise<ReportOutput> {
    const template = await this.loadTemplate(config.template);
    const html = await this.renderTemplate(template, result, config);
    
    const filename = this.generateFilename(config, 'html');
    const outputPath = path.join(config.outputDirectory, filename);
    
    await fs.promises.writeFile(outputPath, html, 'utf8');
    
    return {
      format: ReportFormat.HTML,
      filename,
      content: html,
      size: Buffer.byteLength(html),
      generated: new Date(),
      metadata: {
        testCount: result.globalStatistics.total,
        duration: result.duration,
        successRate: result.globalStatistics.successRate
      }
    };
  }

  supports(format: ReportFormat): boolean {
    return format === ReportFormat.HTML;
  }

  private async loadTemplate(templatePath?: string): Promise<string> {
    if (templatePath && fs.existsSync(templatePath)) {
      return fs.promises.readFile(templatePath, 'utf8');
    }
    
    return this.getDefaultTemplate();
  }

  private async renderTemplate(template: string, result: TestExecutionResult, config: ReportConfig): Promise<string> {
    const data = {
      result,
      config,
      summary: this.generateSummary(result),
      performance: this.generatePerformanceSection(result),
      environment: this.generateEnvironmentSection(result),
      testDetails: this.generateTestDetailsSection(result, config),
      charts: this.generateChartsSection(result),
      timestamp: new Date().toISOString()
    };

    return this.interpolateTemplate(template, data);
  }

  private generateSummary(result: TestExecutionResult): any {
    const stats = result.globalStatistics;
    
    return {
      executionName: result.name,
      duration: this.formatDuration(result.duration),
      testCount: stats.total,
      passedCount: stats.passed,
      failedCount: stats.failed,
      skippedCount: stats.skipped,
      successRate: `${stats.successRate.toFixed(1)}%`,
      startTime: result.startTime.toISOString(),
      endTime: result.endTime.toISOString(),
      environment: result.environment.name,
      status: stats.failed > 0 ? 'FAILED' : 'PASSED'
    };
  }

  private generatePerformanceSection(result: TestExecutionResult): any {
    // Calculate performance metrics from test results
    const responseTimes = result.suites.flatMap(suite => 
      suite.testCases.map(test => test.duration)
    );
    
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    
    return {
      averageResponseTime: this.formatDuration(avgResponseTime),
      minResponseTime: this.formatDuration(Math.min(...responseTimes)),
      maxResponseTime: this.formatDuration(Math.max(...responseTimes)),
      p50: this.formatDuration(sortedTimes[Math.floor(sortedTimes.length * 0.5)]),
      p95: this.formatDuration(sortedTimes[Math.floor(sortedTimes.length * 0.95)]),
      p99: this.formatDuration(sortedTimes[Math.floor(sortedTimes.length * 0.99)])
    };
  }

  private generateEnvironmentSection(result: TestExecutionResult): any {
    const env = result.environment;
    return {
      name: env.name,
      platform: env.platform,
      os: `${env.os} ${env.osVersion || ''}`,
      nodeVersion: env.nodeVersion,
      dependencies: Object.entries(env.dependencies)
        .map(([name, version]) => ({ name, version }))
        .slice(0, 10), // Limit to top 10
      customProperties: env.customProperties
    };
  }

  private generateTestDetailsSection(result: TestExecutionResult, config: ReportConfig): any {
    return result.suites.map(suite => ({
      name: suite.name,
      description: suite.description,
      duration: this.formatDuration(suite.duration),
      statistics: suite.statistics,
      tests: suite.testCases.map(test => ({
        name: test.name,
        status: test.status,
        duration: this.formatDuration(test.duration),
        severity: test.severity,
        tags: test.tags,
        error: test.error ? {
          message: test.error.message,
          stack: test.error.stack
        } : null,
        steps: config.includeDetailedSteps ? test.steps.map(step => ({
          name: step.name,
          status: step.status,
          duration: this.formatDuration(step.duration),
          assertions: step.assertions,
          error: step.error
        })) : []
      }))
    }));
  }

  private generateChartsSection(result: TestExecutionResult): any {
    const stats = result.globalStatistics;
    
    return {
      statusChart: {
        passed: stats.passed,
        failed: stats.failed,
        skipped: stats.skipped,
        pending: stats.pending
      },
      severityChart: this.calculateSeverityDistribution(result),
      durationChart: this.calculateDurationDistribution(result),
      trendsChart: [] // Would be populated with historical data
    };
  }

  private calculateSeverityDistribution(result: TestExecutionResult): any {
    const severityCount = {
      [TestSeverity.BLOCKER]: 0,
      [TestSeverity.CRITICAL]: 0,
      [TestSeverity.MAJOR]: 0,
      [TestSeverity.MINOR]: 0,
      [TestSeverity.TRIVIAL]: 0
    };

    result.suites.forEach(suite => {
      suite.testCases.forEach(test => {
        severityCount[test.severity]++;
      });
    });

    return Object.entries(severityCount)
      .map(([severity, count]) => ({ severity, count }))
      .filter(item => item.count > 0);
  }

  private calculateDurationDistribution(result: TestExecutionResult): any {
    const durations = result.suites.flatMap(suite => 
      suite.testCases.map(test => test.duration)
    );

    const bins = [
      { range: '0-1s', count: 0 },
      { range: '1-5s', count: 0 },
      { range: '5-10s', count: 0 },
      { range: '10-30s', count: 0 },
      { range: '30s+', count: 0 }
    ];

    durations.forEach(duration => {
      if (duration < 1000) bins[0].count++;
      else if (duration < 5000) bins[1].count++;
      else if (duration < 10000) bins[2].count++;
      else if (duration < 30000) bins[3].count++;
      else bins[4].count++;
    });

    return bins.filter(bin => bin.count > 0);
  }

  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  private generateFilename(config: ReportConfig, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = config.filename || `test-report-${timestamp}`;
    return `${filename}.${extension}`;
  }

  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RestifiedTS Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 20px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 4px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .stat-label { color: #666; margin-top: 5px; }
        .section { margin: 20px; }
        .section h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .test-suite { margin: 20px 0; border: 1px solid #ddd; border-radius: 4px; }
        .suite-header { background: #ecf0f1; padding: 15px; font-weight: bold; }
        .test-case { padding: 10px 15px; border-bottom: 1px solid #eee; }
        .test-case:last-child { border-bottom: none; }
        .status-passed { color: #27ae60; }
        .status-failed { color: #e74c3c; }
        .status-skipped { color: #f39c12; }
        .error-details { background: #fdf2f2; border: 1px solid #f5c6cb; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .pre-wrap { white-space: pre-wrap; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{summary.executionName}}</h1>
            <p>Generated on {{timestamp}}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">{{summary.testCount}}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value status-passed">{{summary.passedCount}}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value status-failed">{{summary.failedCount}}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{summary.successRate}}</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{summary.duration}}</div>
                <div class="stat-label">Duration</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Environment</h2>
            <p><strong>Platform:</strong> {{environment.platform}}</p>
            <p><strong>OS:</strong> {{environment.os}}</p>
            <p><strong>Node Version:</strong> {{environment.nodeVersion}}</p>
        </div>
        
        <!-- Test details would be rendered here -->
    </div>
</body>
</html>`;
  }
}

/**
 * JSON Report Generator
 */
export class JsonReportGenerator implements ReportGenerator {
  format = ReportFormat.JSON;

  async generate(result: TestExecutionResult, config: ReportConfig): Promise<ReportOutput> {
    const jsonData = this.prepareJsonData(result, config);
    const jsonString = JSON.stringify(jsonData, null, 2);
    
    const filename = this.generateFilename(config, 'json');
    const outputPath = path.join(config.outputDirectory, filename);
    
    await fs.promises.writeFile(outputPath, jsonString, 'utf8');
    
    return {
      format: ReportFormat.JSON,
      filename,
      content: jsonString,
      size: Buffer.byteLength(jsonString),
      generated: new Date(),
      metadata: {
        testCount: result.globalStatistics.total,
        duration: result.duration,
        successRate: result.globalStatistics.successRate
      }
    };
  }

  supports(format: ReportFormat): boolean {
    return format === ReportFormat.JSON;
  }

  private prepareJsonData(result: TestExecutionResult, config: ReportConfig): any {
    return {
      execution: {
        id: result.id,
        name: result.name,
        description: result.description,
        startTime: result.startTime,
        endTime: result.endTime,
        duration: result.duration
      },
      statistics: result.globalStatistics,
      environment: config.includeEnvironment ? result.environment : undefined,
      configuration: result.configuration,
      suites: result.suites.map(suite => ({
        id: suite.id,
        name: suite.name,
        description: suite.description,
        startTime: suite.startTime,
        endTime: suite.endTime,
        duration: suite.duration,
        status: suite.status,
        statistics: suite.statistics,
        testCases: suite.testCases.map(test => ({
          id: test.id,
          name: test.name,
          description: test.description,
          status: test.status,
          severity: test.severity,
          startTime: test.startTime,
          endTime: test.endTime,
          duration: test.duration,
          tags: test.tags,
          categories: test.categories,
          error: test.error ? {
            name: test.error.name,
            message: test.error.message,
            stack: test.error.stack
          } : undefined,
          retryCount: test.retryCount,
          flaky: test.flaky,
          steps: config.includeDetailedSteps ? test.steps : undefined,
          metadata: config.includeMetadata ? test.metadata : undefined
        }))
      })),
      metadata: config.includeMetadata ? result.metadata : undefined,
      warnings: result.warnings,
      errors: result.errors,
      generated: new Date()
    };
  }

  private generateFilename(config: ReportConfig, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = config.filename || `test-report-${timestamp}`;
    return `${filename}.${extension}`;
  }
}

/**
 * JUnit XML Report Generator
 */
export class JunitReportGenerator implements ReportGenerator {
  format = ReportFormat.JUNIT;

  async generate(result: TestExecutionResult, config: ReportConfig): Promise<ReportOutput> {
    const xml = this.generateJunitXml(result);
    
    const filename = this.generateFilename(config, 'xml');
    const outputPath = path.join(config.outputDirectory, filename);
    
    await fs.promises.writeFile(outputPath, xml, 'utf8');
    
    return {
      format: ReportFormat.JUNIT,
      filename,
      content: xml,
      size: Buffer.byteLength(xml),
      generated: new Date(),
      metadata: {
        testCount: result.globalStatistics.total,
        duration: result.duration,
        successRate: result.globalStatistics.successRate
      }
    };
  }

  supports(format: ReportFormat): boolean {
    return format === ReportFormat.JUNIT;
  }

  private generateJunitXml(result: TestExecutionResult): string {
    const stats = result.globalStatistics;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuites name="${this.escapeXml(result.name)}" `;
    xml += `tests="${stats.total}" `;
    xml += `failures="${stats.failed}" `;
    xml += `errors="${stats.broken}" `;
    xml += `skipped="${stats.skipped}" `;
    xml += `time="${(result.duration / 1000).toFixed(3)}" `;
    xml += `timestamp="${result.startTime.toISOString()}">\n`;

    result.suites.forEach(suite => {
      xml += `  <testsuite name="${this.escapeXml(suite.name)}" `;
      xml += `tests="${suite.statistics.total}" `;
      xml += `failures="${suite.statistics.failed}" `;
      xml += `errors="${suite.statistics.broken}" `;
      xml += `skipped="${suite.statistics.skipped}" `;
      xml += `time="${(suite.duration / 1000).toFixed(3)}" `;
      xml += `timestamp="${suite.startTime.toISOString()}">\n`;

      suite.testCases.forEach(test => {
        xml += `    <testcase name="${this.escapeXml(test.name)}" `;
        xml += `classname="${this.escapeXml(suite.name)}" `;
        xml += `time="${(test.duration / 1000).toFixed(3)}"`;

        if (test.status === TestStatus.FAILED) {
          xml += `>\n`;
          xml += `      <failure message="${this.escapeXml(test.error?.message || 'Test failed')}"`;
          xml += ` type="${this.escapeXml(test.error?.name || 'AssertionError')}">\n`;
          xml += `        ${this.escapeXml(test.error?.stack || '')}\n`;
          xml += `      </failure>\n`;
          xml += `    </testcase>\n`;
        } else if (test.status === TestStatus.SKIPPED) {
          xml += `>\n`;
          xml += `      <skipped />\n`;
          xml += `    </testcase>\n`;
        } else {
          xml += ` />\n`;
        }
      });

      xml += `  </testsuite>\n`;
    });

    xml += `</testsuites>\n`;
    return xml;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private generateFilename(config: ReportConfig, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = config.filename || `junit-report-${timestamp}`;
    return `${filename}.${extension}`;
  }
}

/**
 * Main report generator that supports multiple formats
 */
export class RestifiedReportGenerator {
  private generators: Map<ReportFormat, ReportGenerator> = new Map();

  constructor() {
    this.registerGenerator(new HtmlReportGenerator());
    this.registerGenerator(new JsonReportGenerator());
    this.registerGenerator(new JunitReportGenerator());
  }

  registerGenerator(generator: ReportGenerator): void {
    this.generators.set(generator.format, generator);
  }

  async generateReports(result: TestExecutionResult, config: ReportConfig): Promise<ReportOutput[]> {
    const outputs: ReportOutput[] = [];

    // Ensure output directory exists
    await fs.promises.mkdir(config.outputDirectory, { recursive: true });

    for (const format of config.format) {
      const generator = this.generators.get(format);
      if (generator) {
        try {
          const output = await generator.generate(result, config);
          outputs.push(output);
        } catch (error) {
          console.error(`Failed to generate ${format} report:`, error);
        }
      } else {
        console.warn(`No generator found for format: ${format}`);
      }
    }

    return outputs;
  }

  getSupportedFormats(): ReportFormat[] {
    return Array.from(this.generators.keys());
  }
}

export default RestifiedReportGenerator;