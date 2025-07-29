/**
 * Diff Reporter for RestifiedTS
 * 
 * Generates detailed diff reports for snapshot comparisons, response comparisons,
 * and data validation. Provides visual representation of differences with
 * syntax highlighting and interactive features.
 */

import * as fs from 'fs';
import * as path from 'path';

export class DiffReporter {
  /**
   * Generate comprehensive diff report for snapshots
   */
  async generateDiffReport(snapshots: Map<string, any>): Promise<string> {
    const template = this.getDiffTemplate();
    if (!template || typeof template !== 'string') {
      throw new Error('Invalid template returned from getDiffTemplate');
    }
    
    const diffs = String(this.generateDiffSections(snapshots) || '');
    const snapshotData = String(JSON.stringify(Array.from(snapshots.entries()), null, 2) || '[]');
    
    const html = template
      .replace('{{TITLE}}', 'RestifiedTS Snapshot Diff Report')
      .replace('{{DIFF_SECTIONS}}', diffs)
      .replace('{{SNAPSHOT_DATA}}', snapshotData);

    return html;
  }

  /**
   * Generate diff report for response comparisons
   */
  async generateResponseDiffReport(
    expected: any,
    actual: any,
    testName: string
  ): Promise<string> {
    const template = this.getResponseDiffTemplate();
    if (!template || typeof template !== 'string') {
      throw new Error('Invalid template returned from getResponseDiffTemplate');
    }
    
    const diffAnalysis = this.analyzeResponseDiff(expected, actual);
    
    // Safely generate content with null checks
    const safeTestName = String(testName || 'Untitled');
    const safeDiffAnalysis = String(this.generateDiffAnalysisSection(diffAnalysis) || '');
    const safeSideBySide = String(this.generateSideBySideDiff(expected, actual) || '');
    const safeUnified = String(this.generateUnifiedDiff(expected, actual) || '');
    const safeExpected = String(JSON.stringify(expected, null, 2) || 'null');
    const safeActual = String(JSON.stringify(actual, null, 2) || 'null');
    
    const html = template
      .replace('{{TITLE}}', `Response Diff Report - ${safeTestName}`)
      .replace('{{TEST_NAME}}', safeTestName)
      .replace('{{DIFF_ANALYSIS}}', safeDiffAnalysis)
      .replace('{{SIDE_BY_SIDE_DIFF}}', safeSideBySide)
      .replace('{{UNIFIED_DIFF}}', safeUnified)
      .replace('{{EXPECTED_DATA}}', safeExpected)
      .replace('{{ACTUAL_DATA}}', safeActual);

    return html;
  }

  /**
   * Generate batch diff report for multiple comparisons
   */
  async generateBatchDiffReport(
    comparisons: Array<{
      name: string;
      expected: any;
      actual: any;
      passed: boolean;
    }>
  ): Promise<string> {
    const template = this.getBatchDiffTemplate();
    if (!template || typeof template !== 'string') {
      throw new Error('Invalid template returned from getBatchDiffTemplate');
    }
    
    const safeBatchSummary = String(this.generateBatchSummary(comparisons) || '');
    const safeBatchSections = String(this.generateBatchSections(comparisons) || '');
    const safeComparisonsData = String(JSON.stringify(comparisons, null, 2) || '[]');
    
    const html = template
      .replace('{{TITLE}}', 'RestifiedTS Batch Diff Report')
      .replace('{{BATCH_SUMMARY}}', safeBatchSummary)
      .replace('{{BATCH_SECTIONS}}', safeBatchSections)
      .replace('{{COMPARISONS_DATA}}', safeComparisonsData);

    return html;
  }

  // ==========================================
  // PRIVATE METHODS - DIFF GENERATION
  // ==========================================

  private generateDiffSections(snapshots: Map<string, any>): string {
    const snapshotArray = Array.from(snapshots.entries());
    
    if (snapshotArray.length === 0) {
      return `
      <div class="no-snapshots">
        <h2>No Snapshots Available</h2>
        <p>No snapshots were found for comparison.</p>
      </div>`;
    }

    // Group snapshots by base name to find versions
    const snapshotGroups = this.groupSnapshotsByBaseName(snapshotArray);
    
    return Object.entries(snapshotGroups)
      .map(([baseName, versions]) => this.generateSnapshotGroupDiff(baseName, versions))
      .join('');
  }

  private groupSnapshotsByBaseName(snapshots: Array<[string, any]>): Record<string, Array<[string, any]>> {
    const groups: Record<string, Array<[string, any]>> = {};
    
    snapshots.forEach(([key, data]) => {
      // Extract base name (remove version/timestamp suffixes)
      const baseName = key.replace(/[-_](v\d+|\d{4}-\d{2}-\d{2}.*|latest)$/i, '');
      
      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push([key, data]);
    });
    
    return groups;
  }

  private generateSnapshotGroupDiff(baseName: string, versions: Array<[string, any]>): string {
    if (versions.length < 2) {
      return `
      <div class="snapshot-group">
        <h2>${baseName}</h2>
        <div class="single-version">
          <p>Only one version available: ${versions[0][0]}</p>
          <pre class="snapshot-content">${JSON.stringify(versions[0][1], null, 2)}</pre>
        </div>
      </div>`;
    }

    // Sort versions and compare latest two
    const sortedVersions = versions.sort((a, b) => a[0].localeCompare(b[0]));
    const [prevKey, prevData] = sortedVersions[sortedVersions.length - 2];
    const [currentKey, currentData] = sortedVersions[sortedVersions.length - 1];
    
    const diffAnalysis = this.analyzeResponseDiff(prevData, currentData);
    const hasChanges = diffAnalysis.differences.length > 0;

    return `
    <div class="snapshot-group ${hasChanges ? 'has-changes' : 'no-changes'}">
      <h2>${baseName}</h2>
      <div class="version-comparison">
        <div class="version-info">
          <span class="previous">Previous: ${prevKey}</span>
          <span class="current">Current: ${currentKey}</span>
          <span class="status ${hasChanges ? 'changed' : 'unchanged'}">
            ${hasChanges ? `${diffAnalysis.differences.length} changes` : 'No changes'}
          </span>
        </div>
        
        ${hasChanges ? `
          <div class="changes-summary">
            <h3>Changes Summary</h3>
            <ul>
              ${diffAnalysis.differences.map(diff => `
                <li class="change-item ${diff.type}">
                  <strong>${diff.type.toUpperCase()}</strong> at <code>${diff.path}</code>
                  ${diff.type === 'modified' ? 
                    `<br>From: <code>${JSON.stringify(diff.oldValue)}</code><br>To: <code>${JSON.stringify(diff.newValue)}</code>` :
                    diff.type === 'added' ?
                    `<br>Value: <code>${JSON.stringify(diff.newValue)}</code>` :
                    `<br>Was: <code>${JSON.stringify(diff.oldValue)}</code>`
                  }
                </li>
              `).join('')}
            </ul>
          </div>
          
          <div class="diff-visualization">
            ${this.generateSideBySideDiff(prevData, currentData)}
          </div>
        ` : `
          <div class="no-changes-message">
            <p>✓ No differences found between versions</p>
          </div>
        `}
      </div>
    </div>`;
  }

  private analyzeResponseDiff(expected: any, actual: any): DiffAnalysis {
    const differences: DiffItem[] = [];
    this.compareDeeply('', expected, actual, differences);
    
    return {
      hasDifferences: differences.length > 0,
      totalDifferences: differences.length,
      differences,
      addedCount: differences.filter(d => d.type === 'added').length,
      removedCount: differences.filter(d => d.type === 'removed').length,
      modifiedCount: differences.filter(d => d.type === 'modified').length
    };
  }

  private compareDeeply(path: string, expected: any, actual: any, differences: DiffItem[]): void {
    if (expected === actual) return;

    const expectedType = typeof expected;
    const actualType = typeof actual;

    // Type mismatch
    if (expectedType !== actualType) {
      differences.push({
        type: 'modified',
        path: path || 'root',
        oldValue: expected,
        newValue: actual,
        message: `Type changed from ${expectedType} to ${actualType}`
      });
      return;
    }

    // Handle null/undefined
    if (expected == null || actual == null) {
      differences.push({
        type: 'modified',
        path: path || 'root',
        oldValue: expected,
        newValue: actual,
        message: 'Null/undefined value changed'
      });
      return;
    }

    // Handle arrays
    if (Array.isArray(expected) && Array.isArray(actual)) {
      const maxLength = Math.max(expected.length, actual.length);
      
      for (let i = 0; i < maxLength; i++) {
        const currentPath = path ? `${path}[${i}]` : `[${i}]`;
        
        if (i >= expected.length) {
          differences.push({
            type: 'added',
            path: currentPath,
            newValue: actual[i],
            message: 'Array item added'
          });
        } else if (i >= actual.length) {
          differences.push({
            type: 'removed',
            path: currentPath,
            oldValue: expected[i],
            message: 'Array item removed'
          });
        } else {
          this.compareDeeply(currentPath, expected[i], actual[i], differences);
        }
      }
      return;
    }

    // Handle objects
    if (expectedType === 'object') {
      const expectedKeys = Object.keys(expected);
      const actualKeys = Object.keys(actual);
      const allKeys = new Set([...expectedKeys, ...actualKeys]);

      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!(key in expected)) {
          differences.push({
            type: 'added',
            path: currentPath,
            newValue: actual[key],
            message: 'Property added'
          });
        } else if (!(key in actual)) {
          differences.push({
            type: 'removed',
            path: currentPath,
            oldValue: expected[key],
            message: 'Property removed'
          });
        } else {
          this.compareDeeply(currentPath, expected[key], actual[key], differences);
        }
      }
      return;
    }

    // Primitive value difference
    differences.push({
      type: 'modified',
      path: path || 'root',
      oldValue: expected,
      newValue: actual,
      message: 'Value changed'
    });
  }

  private generateDiffAnalysisSection(analysis: DiffAnalysis): string {
    if (!analysis.hasDifferences) {
      return `
      <div class="diff-analysis no-differences">
        <h3>✓ No Differences Found</h3>
        <p>The expected and actual responses are identical.</p>
      </div>`;
    }

    return `
    <div class="diff-analysis has-differences">
      <h3>Diff Analysis Summary</h3>
      <div class="diff-stats">
        <div class="stat-item">
          <span class="count">${analysis.totalDifferences}</span>
          <span class="label">Total Changes</span>
        </div>
        <div class="stat-item added">
          <span class="count">${analysis.addedCount}</span>
          <span class="label">Added</span>
        </div>
        <div class="stat-item removed">
          <span class="count">${analysis.removedCount}</span>
          <span class="label">Removed</span>
        </div>
        <div class="stat-item modified">
          <span class="count">${analysis.modifiedCount}</span>
          <span class="label">Modified</span>
        </div>
      </div>
      
      <div class="differences-list">
        <h4>Detailed Changes</h4>
        ${analysis.differences.map(diff => `
          <div class="diff-item ${diff.type}">
            <div class="diff-path"><code>${diff.path}</code></div>
            <div class="diff-change">
              ${diff.type === 'added' ? 
                `<span class="added">+ ${JSON.stringify(diff.newValue)}</span>` :
                diff.type === 'removed' ?
                `<span class="removed">- ${JSON.stringify(diff.oldValue)}</span>` :
                `<span class="removed">- ${JSON.stringify(diff.oldValue)}</span><br><span class="added">+ ${JSON.stringify(diff.newValue)}</span>`
              }
            </div>
            <div class="diff-message">${diff.message}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  private generateSideBySideDiff(expected: any, actual: any): string {
    const expectedJson = JSON.stringify(expected, null, 2);
    const actualJson = JSON.stringify(actual, null, 2);
    
    return `
    <div class="side-by-side-diff">
      <div class="diff-pane expected">
        <h4>Expected</h4>
        <pre class="diff-content"><code>${this.escapeHtml(expectedJson)}</code></pre>
      </div>
      <div class="diff-pane actual">
        <h4>Actual</h4>
        <pre class="diff-content"><code>${this.escapeHtml(actualJson)}</code></pre>
      </div>
    </div>`;
  }

  private generateUnifiedDiff(expected: any, actual: any): string {
    // Simplified unified diff representation
    const expectedLines = JSON.stringify(expected, null, 2).split('\n');
    const actualLines = JSON.stringify(actual, null, 2).split('\n');
    
    return `
    <div class="unified-diff">
      <h4>Unified Diff</h4>
      <pre class="diff-content">${this.generateUnifiedDiffContent(expectedLines, actualLines)}</pre>
    </div>`;
  }

  private generateUnifiedDiffContent(expectedLines: string[], actualLines: string[]): string {
    // Simple line-by-line comparison
    const maxLines = Math.max(expectedLines.length, actualLines.length);
    const diffLines: string[] = [];
    
    for (let i = 0; i < maxLines; i++) {
      const expectedLine = expectedLines[i] || '';
      const actualLine = actualLines[i] || '';
      
      if (expectedLine === actualLine) {
        diffLines.push(`  ${this.escapeHtml(expectedLine)}`);
      } else {
        if (expectedLine) {
          diffLines.push(`<span class="removed">- ${this.escapeHtml(expectedLine)}</span>`);
        }
        if (actualLine) {
          diffLines.push(`<span class="added">+ ${this.escapeHtml(actualLine)}</span>`);
        }
      }
    }
    
    return diffLines.join('\n');
  }

  private generateBatchSummary(comparisons: Array<any>): string {
    const totalComparisons = comparisons.length;
    const passedComparisons = comparisons.filter(c => c.passed).length;
    const failedComparisons = totalComparisons - passedComparisons;
    
    return `
    <div class="batch-summary">
      <h2>Batch Comparison Summary</h2>
      <div class="summary-stats">
        <div class="stat-card">
          <span class="stat-number">${totalComparisons}</span>
          <span class="stat-label">Total Comparisons</span>
        </div>
        <div class="stat-card success">
          <span class="stat-number">${passedComparisons}</span>
          <span class="stat-label">Passed</span>
        </div>
        <div class="stat-card danger">
          <span class="stat-number">${failedComparisons}</span>
          <span class="stat-label">Failed</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${((passedComparisons / totalComparisons) * 100).toFixed(1)}%</span>
          <span class="stat-label">Success Rate</span>
        </div>
      </div>
    </div>`;
  }

  private generateBatchSections(comparisons: Array<any>): string {
    return comparisons.map((comparison, index) => {
      const diffAnalysis = this.analyzeResponseDiff(comparison.expected, comparison.actual);
      
      return `
      <div class="comparison-section ${comparison.passed ? 'passed' : 'failed'}">
        <h3>
          ${comparison.name}
          <span class="comparison-status ${comparison.passed ? 'passed' : 'failed'}">
            ${comparison.passed ? '✓ PASSED' : '✗ FAILED'}
          </span>
        </h3>
        
        ${!comparison.passed ? `
          ${this.generateDiffAnalysisSection(diffAnalysis)}
          ${this.generateSideBySideDiff(comparison.expected, comparison.actual)}
        ` : `
          <div class="passed-message">
            <p>✓ No differences found - comparison passed</p>
          </div>
        `}
      </div>`;
    }).join('');
  }

  private escapeHtml(text: string): string {
    // Node.js compatible HTML escaping
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // ==========================================
  // TEMPLATES
  // ==========================================

  private getDiffTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        ${this.getDiffStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header class="diff-header">
            <h1>{{TITLE}}</h1>
            <div class="generated-time">Generated: ${new Date().toLocaleString()}</div>
        </header>
        
        <main class="diff-content">
            {{DIFF_SECTIONS}}
        </main>
        
        <footer class="diff-footer">
            <p>Generated by RestifiedTS Framework</p>
        </footer>
    </div>

    <script>
        const snapshotData = {{SNAPSHOT_DATA}};
        ${this.getDiffScripts()}
    </script>
</body>
</html>`;
  }

  private getResponseDiffTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>${this.getDiffStyles()}</style>
</head>
<body>
    <div class="container">
        <header class="diff-header">
            <h1>Response Diff Report</h1>
            <h2>{{TEST_NAME}}</h2>
        </header>
        
        <main class="diff-content">
            {{DIFF_ANALYSIS}}
            {{SIDE_BY_SIDE_DIFF}}
            {{UNIFIED_DIFF}}
        </main>
    </div>
    
    <script>
        const expectedData = {{EXPECTED_DATA}};
        const actualData = {{ACTUAL_DATA}};
    </script>
</body>
</html>`;
  }

  private getBatchDiffTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>${this.getDiffStyles()}</style>
</head>
<body>
    <div class="container">
        <header class="diff-header">
            <h1>{{TITLE}}</h1>
        </header>
        
        <main class="diff-content">
            {{BATCH_SUMMARY}}
            {{BATCH_SECTIONS}}
        </main>
    </div>
    
    <script>
        const comparisonsData = {{COMPARISONS_DATA}};
    </script>
</body>
</html>`;
  }

  private getDiffStyles(): string {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
        }
        
        .diff-header {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .diff-content {
            padding: 2rem;
        }
        
        .snapshot-group {
            margin-bottom: 3rem;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .snapshot-group.has-changes {
            border-color: #f39c12;
        }
        
        .snapshot-group.no-changes {
            border-color: #27ae60;
        }
        
        .snapshot-group h2 {
            background: #f8f9fa;
            padding: 1rem;
            margin: 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .version-comparison {
            padding: 1rem;
        }
        
        .version-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding: 0.5rem;
            background: #f8f9fa;
            border-radius: 4px;
        }
        
        .status.changed {
            color: #e74c3c;
            font-weight: bold;
        }
        
        .status.unchanged {
            color: #27ae60;
            font-weight: bold;
        }
        
        .changes-summary {
            margin-bottom: 2rem;
        }
        
        .change-item {
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            border-radius: 4px;
            border-left: 4px solid #e0e0e0;
        }
        
        .change-item.added {
            background: #d4edda;
            border-left-color: #28a745;
        }
        
        .change-item.removed {
            background: #f8d7da;
            border-left-color: #dc3545;
        }
        
        .change-item.modified {
            background: #fff3cd;
            border-left-color: #ffc107;
        }
        
        .side-by-side-diff {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .diff-pane {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .diff-pane h4 {
            background: #f8f9fa;
            padding: 0.75rem;
            margin: 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .diff-pane.expected h4 {
            background: #f8d7da;
            color: #721c24;
        }
        
        .diff-pane.actual h4 {
            background: #d4edda;
            color: #155724;
        }
        
        .diff-content {
            padding: 1rem;
            background: #f8f9fa;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.875rem;
            line-height: 1.4;
            overflow-x: auto;
            max-height: 500px;
            overflow-y: auto;
        }
        
        .diff-content code {
            background: none;
            color: inherit;
        }
        
        .unified-diff {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 2rem;
        }
        
        .unified-diff h4 {
            background: #f8f9fa;
            padding: 0.75rem;
            margin: 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .removed {
            background: #ffeef0;
            color: #d73a49;
            display: block;
            padding: 0.125rem 0.25rem;
            margin: 0.125rem 0;
        }
        
        .added {
            background: #e6ffed;
            color: #28a745;
            display: block;
            padding: 0.125rem 0.25rem;
            margin: 0.125rem 0;
        }
        
        .diff-analysis {
            margin-bottom: 2rem;
            padding: 1rem;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
        }
        
        .diff-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .stat-item {
            text-align: center;
            padding: 1rem;
            border-radius: 8px;
            background: #f8f9fa;
        }
        
        .stat-item.added {
            background: #d4edda;
            color: #155724;
        }
        
        .stat-item.removed {
            background: #f8d7da;
            color: #721c24;
        }
        
        .stat-item.modified {
            background: #fff3cd;
            color: #856404;
        }
        
        .count {
            display: block;
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .label {
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .diff-item {
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            border-radius: 4px;
            border-left: 4px solid #e0e0e0;
        }
        
        .diff-path {
            font-weight: bold;
            margin-bottom: 0.25rem;
        }
        
        .diff-change {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            margin-bottom: 0.25rem;
        }
        
        .diff-message {
            font-size: 0.875rem;
            color: #666;
        }
        
        .comparison-section {
            margin-bottom: 3rem;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .comparison-section.passed {
            border-color: #28a745;
        }
        
        .comparison-section.failed {
            border-color: #dc3545;
        }
        
        .comparison-section h3 {
            background: #f8f9fa;
            padding: 1rem;
            margin: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .comparison-status.passed {
            color: #28a745;
            font-weight: bold;
        }
        
        .comparison-status.failed {
            color: #dc3545;
            font-weight: bold;
        }
        
        .passed-message {
            padding: 2rem;
            text-align: center;
            color: #28a745;
        }
        
        @media (max-width: 768px) {
            .side-by-side-diff {
                grid-template-columns: 1fr;
            }
            
            .version-info {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .diff-stats {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    `;
  }

  private getDiffScripts(): string {
    return `
        // Toggle diff sections
        document.querySelectorAll('.snapshot-group h2').forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', function() {
                const content = this.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            });
        });
        
        // Initialize collapse/expand functionality
        document.addEventListener('DOMContentLoaded', function() {
            // All groups expanded by default
            console.log('Diff report loaded');
        });
    `;
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

export interface DiffAnalysis {
  hasDifferences: boolean;
  totalDifferences: number;
  differences: DiffItem[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

export interface DiffItem {
  type: 'added' | 'removed' | 'modified';
  path: string;
  oldValue?: any;
  newValue?: any;
  message: string;
}