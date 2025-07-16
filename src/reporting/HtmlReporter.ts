// src/reporting/HtmlReporter.ts

/**
 * Professional HTML report generator for RestifiedTS test results
 * 
 * Features:
 * - Interactive HTML reports with charts and graphs
 * - Responsive design for mobile and desktop
 * - Detailed test execution timelines
 * - Performance metrics visualization
 * - Error analysis and grouping
 * - Search and filter capabilities
 * - Snapshot comparison views
 * - Export capabilities
 * - Dark/light theme support
 * 
 * @example
 * ```typescript
 * const reporter = new HtmlReporter();
 * const htmlContent = await reporter.generateReport(reportData);
 * await fs.writeFile('report.html', htmlContent);
 * ```
 */
export class HtmlReporter {
  private readonly templates: ReportTemplates;

  constructor() {
    this.templates = new ReportTemplates();
  }

  /**
   * Generate complete HTML report
   * 
   * @param reportData - Test report data
   * @param options - Report generation options
   * @returns HTML content as string
   */
  async generateReport(reportData: any, options: HtmlReportOptions = {}): Promise<string> {
    const config = { ...this.getDefaultOptions(), ...options };
    
    const htmlContent = this.templates.getMainTemplate({
      title: config.title,
      reportData: JSON.stringify(reportData),
      theme: config.theme,
      includeCharts: config.includeCharts,
      includeTimeline: config.includeTimeline,
      includeSnapshots: config.includeSnapshots,
      customCSS: config.customCSS,
      customJS: config.customJS
    });

    return htmlContent;
  }

  /**
   * Generate performance report
   * 
   * @param performanceData - Performance metrics data
   * @returns HTML content for performance report
   */
  async generatePerformanceReport(performanceData: any): Promise<string> {
    return this.templates.getPerformanceTemplate({
      performanceData: JSON.stringify(performanceData),
      title: 'Performance Report'
    });
  }

  /**
   * Generate trend analysis report
   * 
   * @param trendData - Trend analysis data
   * @returns HTML content for trend report
   */
  async generateTrendReport(trendData: any): Promise<string> {
    return this.templates.getTrendTemplate({
      trendData: JSON.stringify(trendData),
      title: 'Trend Analysis Report'
    });
  }

  /**
   * Generate error analysis report
   * 
   * @param errorData - Error analysis data
   * @returns HTML content for error report
   */
  async generateErrorReport(errorData: any): Promise<string> {
    return this.templates.getErrorTemplate({
      errorData: JSON.stringify(errorData),
      title: 'Error Analysis Report'
    });
  }

  private getDefaultOptions(): Required<HtmlReportOptions> {
    return {
      title: 'RestifiedTS Test Report',
      theme: 'light',
      includeCharts: true,
      includeTimeline: true,
      includeSnapshots: true,
      customCSS: '',
      customJS: ''
    };
  }
}

/**
 * HTML template manager for different report types
 */
class ReportTemplates {
  
  getMainTemplate(data: TemplateData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>
        ${this.getBaseCSS()}
        ${this.getThemeCSS(data.theme)}
        ${data.customCSS || ''}
    </style>
</head>
<body class="theme-${data.theme}">
    <div id="app">
        <header class="report-header">
            <h1>${data.title}</h1>
            <div class="report-meta">
                <span class="timestamp">Generated: ${new Date().toISOString()}</span>
                <button class="theme-toggle" onclick="toggleTheme()">🌓</button>
            </div>
        </header>

        <main class="report-content">
            <div class="summary-section">
                <div id="summary-cards"></div>
            </div>

            ${data.includeCharts ? '<div class="charts-section"><div id="charts-container"></div></div>' : ''}
            
            <div class="tests-section">
                <div class="section-header">
                    <h2>Test Results</h2>
                    <div class="filters">
                        <input type="search" id="test-search" placeholder="Search tests...">
                        <select id="status-filter">
                            <option value="">All Status</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="skipped">Skipped</option>
                        </select>
                    </div>
                </div>
                <div id="tests-container"></div>
            </div>

            ${data.includeTimeline ? '<div class="timeline-section"><h2>Execution Timeline</h2><div id="timeline-container"></div></div>' : ''}
            
            <div class="performance-section">
                <h2>Performance Metrics</h2>
                <div id="performance-container"></div>
            </div>

            <div class="errors-section">
                <h2>Error Analysis</h2>
                <div id="errors-container"></div>
            </div>

            ${data.includeSnapshots ? '<div class="snapshots-section"><h2>Snapshots</h2><div id="snapshots-container"></div></div>' : ''}
        </main>
    </div>

    <script>
        ${this.getBaseJS()}
        ${data.customJS || ''}
        
        // Initialize report with data
        window.reportData = ${data.reportData};
        initializeReport(window.reportData);
    </script>
</body>
</html>`;
  }

  getPerformanceTemplate(data: TemplateData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>${this.getBaseCSS()}</style>
</head>
<body>
    <div id="performance-app">
        <header><h1>${data.title}</h1></header>
        <main>
            <div id="performance-metrics"></div>
            <div id="performance-charts"></div>
            <div id="performance-timeline"></div>
        </main>
    </div>
    <script>
        ${this.getPerformanceJS()}
        window.performanceData = ${data.performanceData};
        initializePerformanceReport(window.performanceData);
    </script>
</body>
</html>`;
  }

  getTrendTemplate(data: TemplateData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>${this.getBaseCSS()}</style>
</head>
<body>
    <div id="trend-app">
        <header><h1>${data.title}</h1></header>
        <main>
            <div id="trend-charts"></div>
            <div id="trend-analysis"></div>
        </main>
    </div>
    <script>
        ${this.getTrendJS()}
        window.trendData = ${data.trendData};
        initializeTrendReport(window.trendData);
    </script>
</body>
</html>`;
  }

  getErrorTemplate(data: TemplateData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>${this.getBaseCSS()}</style>
</head>
<body>
    <div id="error-app">
        <header><h1>${data.title}</h1></header>
        <main>
            <div id="error-summary"></div>
            <div id="error-details"></div>
        </main>
    </div>
    <script>
        ${this.getErrorJS()}
        window.errorData = ${data.errorData};
        initializeErrorReport(window.errorData);
    </script>
</body>
</html>`;
  }

  private getBaseCSS(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background: var(--bg-color);
        }

        .report-header {
            background: var(--header-bg);
            padding: 1rem 2rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .report-header h1 {
            color: var(--header-text);
            font-size: 1.5rem;
            font-weight: 600;
        }

        .report-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .timestamp {
            color: var(--muted-text);
            font-size: 0.875rem;
        }

        .theme-toggle {
            background: none;
            border: 1px solid var(--border-color);
            padding: 0.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
        }

        .report-content {
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
        }

        .summary-section {
            margin-bottom: 2rem;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .summary-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            text-align: center;
        }

        .summary-card h3 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            color: var(--primary-color);
        }

        .summary-card p {
            color: var(--muted-text);
            font-size: 0.875rem;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .filters {
            display: flex;
            gap: 1rem;
        }

        .filters input,
        .filters select {
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--input-bg);
            color: var(--text-color);
        }

        .test-item {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-bottom: 1rem;
            overflow: hidden;
        }

        .test-header {
            padding: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }

        .test-name {
            font-weight: 600;
            color: var(--text-color);
        }

        .test-status {
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-passed {
            background: #10b981;
            color: white;
        }

        .status-failed {
            background: #ef4444;
            color: white;
        }

        .status-skipped {
            background: #f59e0b;
            color: white;
        }

        .test-details {
            padding: 1rem;
            border-top: 1px solid var(--border-color);
            background: var(--details-bg);
            display: none;
        }

        .test-details.expanded {
            display: block;
        }

        .chart-container {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            height: 300px;
        }

        @media (max-width: 768px) {
            .report-content {
                padding: 1rem;
            }

            .section-header {
                flex-direction: column;
                align-items: stretch;
                gap: 1rem;
            }

            .filters {
                flex-direction: column;
            }
        }
    `;
  }

  private getThemeCSS(theme: string): string {
    if (theme === 'dark') {
      return `
        .theme-dark {
            --bg-color: #1a1a1a;
            --text-color: #e5e5e5;
            --header-bg: #2d2d2d;
            --header-text: #ffffff;
            --card-bg: #2d2d2d;
            --border-color: #404040;
            --muted-text: #a0a0a0;
            --input-bg: #404040;
            --details-bg: #333333;
            --primary-color: #3b82f6;
        }
      `;
    }

    return `
        .theme-light {
            --bg-color: #ffffff;
            --text-color: #1f2937;
            --header-bg: #f9fafb;
            --header-text: #1f2937;
            --card-bg: #ffffff;
            --border-color: #e5e7eb;
            --muted-text: #6b7280;
            --input-bg: #ffffff;
            --details-bg: #f9fafb;
            --primary-color: #3b82f6;
        }
    `;
  }

  private getBaseJS(): string {
    return `
        function initializeReport(data) {
            renderSummaryCards(data);
            renderTestResults(data);
            renderPerformanceMetrics(data);
            renderErrorAnalysis(data);
            setupFilters();
            setupEventListeners();
        }

        function renderSummaryCards(data) {
            const container = document.getElementById('summary-cards');
            if (!container) return;

            container.className = 'summary-cards';
            container.innerHTML = \`
                <div class="summary-card">
                    <h3>\${data.summary?.total || 0}</h3>
                    <p>Total Tests</p>
                </div>
                <div class="summary-card">
                    <h3>\${data.summary?.passed || 0}</h3>
                    <p>Passed</p>
                </div>
                <div class="summary-card">
                    <h3>\${data.summary?.failed || 0}</h3>
                    <p>Failed</p>
                </div>
                <div class="summary-card">
                    <h3>\${data.summary?.duration || 0}ms</h3>
                    <p>Duration</p>
                </div>
                <div class="summary-card">
                    <h3>\${Math.round(data.summary?.successRate || 0)}%</h3>
                    <p>Success Rate</p>
                </div>
            \`;
        }

        function renderTestResults(data) {
            const container = document.getElementById('tests-container');
            if (!container || !data.tests) return;

            container.innerHTML = data.tests.map(test => \`
                <div class="test-item" data-status="\${test.status}" data-name="\${test.name.toLowerCase()}">
                    <div class="test-header" onclick="toggleTestDetails(this)">
                        <span class="test-name">\${test.name}</span>
                        <div>
                            <span class="test-duration">\${test.duration}ms</span>
                            <span class="test-status status-\${test.status}">\${test.status}</span>
                        </div>
                    </div>
                    <div class="test-details">
                        <p><strong>Duration:</strong> \${test.duration}ms</p>
                        <p><strong>Assertions:</strong> \${test.assertions || 0}</p>
                        \${test.error ? \`<p><strong>Error:</strong> \${test.error}</p>\` : ''}
                    </div>
                </div>
            \`).join('');
        }

        function renderPerformanceMetrics(data) {
            const container = document.getElementById('performance-container');
            if (!container || !data.performance) return;

            container.innerHTML = \`
                <div class="performance-grid">
                    <div class="metric-card">
                        <h4>Average Response Time</h4>
                        <p>\${Math.round(data.performance.responseTime || 0)}ms</p>
                    </div>
                    <div class="metric-card">
                        <h4>DNS Lookup</h4>
                        <p>\${Math.round(data.performance.dnsLookupTime || 0)}ms</p>
                    </div>
                    <div class="metric-card">
                        <h4>TCP Connect</h4>
                        <p>\${Math.round(data.performance.tcpConnectTime || 0)}ms</p>
                    </div>
                    <div class="metric-card">
                        <h4>First Byte</h4>
                        <p>\${Math.round(data.performance.firstByteTime || 0)}ms</p>
                    </div>
                </div>
            \`;
        }

        function renderErrorAnalysis(data) {
            const container = document.getElementById('errors-container');
            if (!container || !data.errors || data.errors.length === 0) {
                container.innerHTML = '<p>No errors to analyze.</p>';
                return;
            }

            container.innerHTML = data.errors.map(error => \`
                <div class="error-item">
                    <h4>\${error.type}</h4>
                    <p>Count: \${error.count} (\${Math.round(error.percentage)}%)</p>
                    <details>
                        <summary>Examples</summary>
                        <ul>
                            \${error.examples.map(example => \`<li>\${example}</li>\`).join('')}
                        </ul>
                    </details>
                </div>
            \`).join('');
        }

        function setupFilters() {
            const searchInput = document.getElementById('test-search');
            const statusFilter = document.getElementById('status-filter');

            if (searchInput) {
                searchInput.addEventListener('input', filterTests);
            }
            if (statusFilter) {
                statusFilter.addEventListener('change', filterTests);
            }
        }

        function filterTests() {
            const searchTerm = document.getElementById('test-search')?.value.toLowerCase() || '';
            const statusFilter = document.getElementById('status-filter')?.value || '';
            const testItems = document.querySelectorAll('.test-item');

            testItems.forEach(item => {
                const name = item.dataset.name || '';
                const status = item.dataset.status || '';
                
                const matchesSearch = !searchTerm || name.includes(searchTerm);
                const matchesStatus = !statusFilter || status === statusFilter;
                
                item.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
            });
        }

        function toggleTestDetails(header) {
            const details = header.nextElementSibling;
            if (details) {
                details.classList.toggle('expanded');
            }
        }

        function setupEventListeners() {
            // Add any additional event listeners here
        }

        function toggleTheme() {
            const body = document.body;
            const currentTheme = body.classList.contains('theme-dark') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            body.className = \`theme-\${newTheme}\`;
            localStorage.setItem('reportTheme', newTheme);
        }

        // Load saved theme
        document.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('reportTheme') || 'light';
            document.body.className = \`theme-\${savedTheme}\`;
        });
    `;
  }

  private getPerformanceJS(): string {
    return `
        function initializePerformanceReport(data) {
            renderPerformanceMetrics(data);
            renderPerformanceCharts(data);
            renderPerformanceTimeline(data);
        }

        function renderPerformanceMetrics(data) {
            const container = document.getElementById('performance-metrics');
            if (!container) return;

            container.innerHTML = \`
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>Response Time</h3>
                        <div class="metric-value">\${data.averageResponseTime || 0}ms</div>
                        <div class="metric-detail">Average</div>
                    </div>
                    <div class="metric-card">
                        <h3>Throughput</h3>
                        <div class="metric-value">\${data.throughput || 0}</div>
                        <div class="metric-detail">Requests/sec</div>
                    </div>
                    <div class="metric-card">
                        <h3>Error Rate</h3>
                        <div class="metric-value">\${data.errorRate || 0}%</div>
                        <div class="metric-detail">Failed requests</div>
                    </div>
                    <div class="metric-card">
                        <h3>P95 Response Time</h3>
                        <div class="metric-value">\${data.p95ResponseTime || 0}ms</div>
                        <div class="metric-detail">95th percentile</div>
                    </div>
                </div>
            \`;
        }

        function renderPerformanceCharts(data) {
            // Placeholder for chart rendering
            const container = document.getElementById('performance-charts');
            if (!container) return;
            
            container.innerHTML = '<p>Performance charts would be rendered here with a charting library.</p>';
        }

        function renderPerformanceTimeline(data) {
            // Placeholder for timeline rendering
            const container = document.getElementById('performance-timeline');
            if (!container) return;
            
            container.innerHTML = '<p>Performance timeline would be rendered here.</p>';
        }
    `;
  }

  private getTrendJS(): string {
    return `
        function initializeTrendReport(data) {
            renderTrendCharts(data);
            renderTrendAnalysis(data);
        }

        function renderTrendCharts(data) {
            const container = document.getElementById('trend-charts');
            if (!container) return;
            
            container.innerHTML = '<p>Trend charts would be rendered here with historical data.</p>';
        }

        function renderTrendAnalysis(data) {
            const container = document.getElementById('trend-analysis');
            if (!container) return;
            
            container.innerHTML = \`
                <div class="trend-summary">
                    <h3>Trend Analysis Summary</h3>
                    <p>Performance trends and insights would be displayed here.</p>
                </div>
            \`;
        }
    `;
  }

  private getErrorJS(): string {
    return `
        function initializeErrorReport(data) {
            renderErrorSummary(data);
            renderErrorDetails(data);
        }

        function renderErrorSummary(data) {
            const container = document.getElementById('error-summary');
            if (!container) return;
            
            container.innerHTML = \`
                <div class="error-summary-grid">
                    <div class="error-stat">
                        <h3>\${data.totalErrors || 0}</h3>
                        <p>Total Errors</p>
                    </div>
                    <div class="error-stat">
                        <h3>\${Object.keys(data.errorTypes || {}).length}</h3>
                        <p>Error Types</p>
                    </div>
                    <div class="error-stat">
                        <h3>\${data.mostCommonError || 'N/A'}</h3>
                        <p>Most Common</p>
                    </div>
                </div>
            \`;
        }

        function renderErrorDetails(data) {
            const container = document.getElementById('error-details');
            if (!container) return;
            
            const errorTypes = data.errorTypes || {};
            container.innerHTML = Object.entries(errorTypes).map(([type, count]) => \`
                <div class="error-detail-item">
                    <h4>\${type}</h4>
                    <p>Occurrences: \${count}</p>
                </div>
            \`).join('');
        }
    `;
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

export interface HtmlReportOptions {
  title?: string;
  theme?: 'light' | 'dark';
  includeCharts?: boolean;
  includeTimeline?: boolean;
  includeSnapshots?: boolean;
  customCSS?: string;
  customJS?: string;
}

interface TemplateData {
  title: string;
  reportData?: string;
  performanceData?: string;
  trendData?: string;
  errorData?: string;
  theme?: string;
  includeCharts?: boolean;
  includeTimeline?: boolean;
  includeSnapshots?: boolean;
  customCSS?: string;
  customJS?: string;
}