#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ReportOptions {
  outputDir?: string;
  reportName?: string;
  openInBrowser?: boolean;
  includePerformance?: boolean;
  includeSecurity?: boolean;
}

export class UserReportGenerator {
  private readonly defaultOutputDir = 'reports';

  /**
   * Generate HTML test report from Mocha test results
   */
  async generateReport(options: ReportOptions = {}): Promise<string> {
    const {
      outputDir = this.defaultOutputDir,
      reportName = 'test-report',
      openInBrowser = false,
      includePerformance = false,
      includeSecurity = false
    } = options;

    try {
      // Ensure output directory exists
      this.ensureDirectory(outputDir);

      // Run tests and generate JSON output
      console.log('🔍 Running tests and collecting results...');
      
      const testCommand = this.buildTestCommand(outputDir, reportName);
      await execAsync(testCommand);

      // Generate HTML report
      console.log('📊 Generating HTML report...');
      
      const reportCommand = this.buildReportCommand(outputDir, reportName);
      await execAsync(reportCommand);

      const reportPath = path.join(outputDir, `${reportName}.html`);

      if (openInBrowser && fs.existsSync(reportPath)) {
        console.log('🌐 Opening report in browser...');
        await this.openInBrowser(reportPath);
      }

      console.log(`✅ Report generated successfully: ${reportPath}`);
      return reportPath;

    } catch (error: any) {
      console.error('❌ Failed to generate report:', error.message);
      throw error;
    }
  }

  /**
   * Build test command for running tests and generating JSON output
   */
  private buildTestCommand(outputDir: string, reportName: string): string {
    const jsonPath = path.join(outputDir, `${reportName}.json`);
    
    return [
      'npx mocha',
      '--require ts-node/register',
      '--require tsconfig-paths/register',
      '"tests/**/*.test.ts"',
      '--reporter mochawesome',
      `--reporter-options reportDir=${outputDir},reportFilename=${reportName},json=true,html=false`
    ].join(' ');
  }

  /**
   * Build report generation command for creating HTML from JSON
   */
  private buildReportCommand(outputDir: string, reportName: string): string {
    const jsonPath = path.join(outputDir, `${reportName}.json`);
    
    return [
      'npx marge',
      `"${jsonPath}"`,
      `--reportDir ${outputDir}`,
      `--reportFilename ${reportName}`,
      '--inline',
      '--charts',
      '--code',
      '--timestamp'
    ].join(' ');
  }

  /**
   * Generate comprehensive report with performance and security data
   */
  async generateComprehensiveReport(options: ReportOptions = {}): Promise<string> {
    const {
      outputDir = this.defaultOutputDir,
      reportName = 'comprehensive-report'
    } = options;

    try {
      this.ensureDirectory(outputDir);

      console.log('🔍 Running comprehensive test suite...');

      // Run different test types
      const testResults = await Promise.allSettled([
        this.runTestSuite('unit', outputDir),
        this.runTestSuite('integration', outputDir),
        this.runTestSuite('smoke', outputDir)
      ]);

      // Merge all results
      console.log('📊 Merging test results...');
      const mergeCommand = [
        'npx mochawesome-merge',
        `"${outputDir}/*.json"`,
        '-o',
        `"${path.join(outputDir, `${reportName}-merged.json`)}"`
      ].join(' ');

      await execAsync(mergeCommand);

      // Generate final HTML report
      const finalReportCommand = [
        'npx marge',
        `"${path.join(outputDir, `${reportName}-merged.json`)}"`,
        `--reportDir ${outputDir}`,
        `--reportFilename ${reportName}`,
        '--inline',
        '--charts',
        '--code',
        '--timestamp',
        '--reportTitle "RestifiedTS Comprehensive Test Report"'
      ].join(' ');

      await execAsync(finalReportCommand);

      const reportPath = path.join(outputDir, `${reportName}.html`);
      console.log(`✅ Comprehensive report generated: ${reportPath}`);
      
      return reportPath;

    } catch (error: any) {
      console.error('❌ Failed to generate comprehensive report:', error.message);
      throw error;
    }
  }

  /**
   * Run specific test suite and generate JSON output
   */
  private async runTestSuite(suiteType: string, outputDir: string): Promise<void> {
    let testPattern = '';
    let grepPattern = '';

    switch (suiteType) {
      case 'unit':
        testPattern = '"tests/unit/**/*.test.ts"';
        break;
      case 'integration':
        testPattern = '"tests/integration/**/*.test.ts"';
        break;
      case 'smoke':
        testPattern = '"tests/**/*.test.ts"';
        grepPattern = '--grep "@smoke"';
        break;
      default:
        testPattern = '"tests/**/*.test.ts"';
    }

    const command = [
      'npx mocha',
      '--require ts-node/register',
      '--require tsconfig-paths/register',
      testPattern,
      grepPattern,
      '--reporter mochawesome',
      `--reporter-options reportDir=${outputDir},reportFilename=mochawesome-${suiteType},json=true,html=false`
    ].filter(Boolean).join(' ');

    await execAsync(command);
  }

  /**
   * Open report in default browser
   */
  private async openInBrowser(reportPath: string): Promise<void> {
    const fullPath = path.resolve(reportPath);
    
    try {
      const platform = process.platform;
      let command = '';

      switch (platform) {
        case 'darwin': // macOS
          command = `open "${fullPath}"`;
          break;
        case 'win32': // Windows
          command = `start "" "${fullPath}"`;
          break;
        default: // Linux and others
          command = `xdg-open "${fullPath}"`;
          break;
      }

      await execAsync(command);
    } catch (error) {
      console.warn('⚠️  Could not open browser automatically. Please open the report manually.');
    }
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate performance report (if Artillery data is available)
   */
  async generatePerformanceReport(outputDir: string = this.defaultOutputDir): Promise<string | null> {
    try {
      // Check if performance data exists
      const perfDataPath = path.join(outputDir, 'performance-data.json');
      
      if (!fs.existsSync(perfDataPath)) {
        console.log('ℹ️  No performance data found. Run performance tests first.');
        return null;
      }

      console.log('📈 Generating performance report...');

      // Create performance HTML report
      const perfData = JSON.parse(fs.readFileSync(perfDataPath, 'utf8'));
      const htmlContent = this.generatePerformanceHTML(perfData);
      
      const reportPath = path.join(outputDir, 'performance-report.html');
      fs.writeFileSync(reportPath, htmlContent);

      console.log(`✅ Performance report generated: ${reportPath}`);
      return reportPath;

    } catch (error: any) {
      console.error('❌ Failed to generate performance report:', error.message);
      return null;
    }
  }

  /**
   * Generate security report (if ZAP data is available)
   */
  async generateSecurityReport(outputDir: string = this.defaultOutputDir): Promise<string | null> {
    try {
      // Check if security data exists
      const secDataPath = path.join(outputDir, 'security-data.json');
      
      if (!fs.existsSync(secDataPath)) {
        console.log('ℹ️  No security data found. Run security tests first.');
        return null;
      }

      console.log('🔒 Generating security report...');

      // Create security HTML report
      const secData = JSON.parse(fs.readFileSync(secDataPath, 'utf8'));
      const htmlContent = this.generateSecurityHTML(secData);
      
      const reportPath = path.join(outputDir, 'security-report.html');
      fs.writeFileSync(reportPath, htmlContent);

      console.log(`✅ Security report generated: ${reportPath}`);
      return reportPath;

    } catch (error: any) {
      console.error('❌ Failed to generate security report:', error.message);
      return null;
    }
  }

  /**
   * Generate performance HTML content
   */
  private generatePerformanceHTML(data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>RestifiedTS Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; color: #4CAF50; }
        .chart { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 RestifiedTS Performance Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Response Time (avg)</h3>
            <div class="value">${data.responseTime?.avg || 'N/A'}ms</div>
        </div>
        <div class="metric">
            <h3>Throughput</h3>
            <div class="value">${data.throughput || 'N/A'} req/s</div>
        </div>
        <div class="metric">
            <h3>Error Rate</h3>
            <div class="value">${data.errorRate || 'N/A'}%</div>
        </div>
        <div class="metric">
            <h3>Total Requests</h3>
            <div class="value">${data.totalRequests || 'N/A'}</div>
        </div>
    </div>

    <div class="chart">
        <h2>📊 Performance Summary</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
</body>
</html>`;
  }

  /**
   * Generate security HTML content
   */
  private generateSecurityHTML(data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>RestifiedTS Security Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #FF5722; color: white; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .risk { padding: 15px; border-radius: 5px; text-align: center; }
        .risk.high { background: #ffebee; border: 2px solid #f44336; }
        .risk.medium { background: #fff3e0; border: 2px solid #ff9800; }
        .risk.low { background: #e8f5e8; border: 2px solid #4caf50; }
        .risk h3 { margin: 0; }
        .risk .count { font-size: 24px; font-weight: bold; }
        .vulnerabilities { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0; }
        .vuln { padding: 10px; margin: 10px 0; border-left: 4px solid #ff9800; background: #fff3e0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 RestifiedTS Security Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="risk high">
            <h3>High Risk</h3>
            <div class="count">${data.summary?.highRisk || 0}</div>
        </div>
        <div class="risk medium">
            <h3>Medium Risk</h3>
            <div class="count">${data.summary?.mediumRisk || 0}</div>
        </div>
        <div class="risk low">
            <h3>Low Risk</h3>
            <div class="count">${data.summary?.lowRisk || 0}</div>
        </div>
    </div>

    <div class="vulnerabilities">
        <h2>🚨 Security Findings</h2>
        ${data.vulnerabilities?.map((vuln: any) => `
            <div class="vuln">
                <strong>${vuln.type || 'Unknown'}</strong> - ${vuln.risk || 'Unknown'} Risk<br>
                <small>${vuln.description || 'No description available'}</small>
            </div>
        `).join('') || '<p>No vulnerabilities found.</p>'}
    </div>
</body>
</html>`;
  }
}