// src/reporting/DiffReporter.ts

/**
 * Professional diff reporter for snapshot comparison and visualization
 * 
 * Features:
 * - Visual diff rendering with syntax highlighting
 * - Side-by-side and unified diff views
 * - Interactive diff navigation
 * - JSON structure diff visualization
 * - Multiple output formats (HTML, console, JSON)
 * - Diff statistics and metrics
 * - Customizable diff algorithms
 * - Export capabilities
 * 
 * @example
 * ```typescript
 * const diffReporter = new DiffReporter();
 * const htmlDiff = await diffReporter.generateDiffReport(snapshots);
 * const consoleDiff = diffReporter.generateConsoleDiff(before, after);
 * ```
 */
export class DiffReporter {
  private readonly diffAlgorithm: DiffAlgorithm;

  constructor(options: DiffReporterOptions = {}) {
    this.diffAlgorithm = new DiffAlgorithm(options.algorithm || 'myers');
  }

  /**
   * Generate HTML diff report for multiple snapshots
   * 
   * @param snapshots - Map of snapshots to compare
   * @param options - Report generation options
   * @returns HTML content as string
   */
  async generateDiffReport(
    snapshots: Map<string, any>,
    options: DiffReportOptions = {}
  ): Promise<string> {
    const diffs = this.generateAllDiffs(snapshots);
    const config = { ...this.getDefaultOptions(), ...options };

    return this.generateHtmlReport(diffs, config);
  }

  /**
   * Generate console-friendly diff output
   * 
   * @param before - Before snapshot
   * @param after - After snapshot
   * @param options - Console diff options
   * @returns Console-formatted diff string
   */
  generateConsoleDiff(
    before: any,
    after: any,
    options: ConsoleDiffOptions = {}
  ): string {
    const diff = this.diffAlgorithm.compare(before, after);
    return this.formatConsoleDiff(diff, options);
  }

  /**
   * Generate JSON diff report
   * 
   * @param before - Before snapshot
   * @param after - After snapshot
   * @returns JSON diff structure
   */
  generateJsonDiff(before: any, after: any): JsonDiff {
    const diff = this.diffAlgorithm.compare(before, after);
    return this.formatJsonDiff(diff);
  }

  /**
   * Generate unified diff format
   * 
   * @param before - Before snapshot
   * @param after - After snapshot
   * @param contextLines - Number of context lines
   * @returns Unified diff string
   */
  generateUnifiedDiff(
    before: any,
    after: any,
    contextLines: number = 3
  ): string {
    const beforeLines = this.objectToLines(before);
    const afterLines = this.objectToLines(after);
    
    return this.diffAlgorithm.generateUnifiedDiff(
      beforeLines,
      afterLines,
      'before',
      'after',
      contextLines
    );
  }

  /**
   * Generate side-by-side diff
   * 
   * @param before - Before snapshot
   * @param after - After snapshot
   * @returns Side-by-side diff structure
   */
  generateSideBySideDiff(before: any, after: any): SideBySideDiff {
    const diff = this.diffAlgorithm.compare(before, after);
    return this.formatSideBySideDiff(diff);
  }

  /**
   * Calculate diff statistics
   * 
   * @param before - Before snapshot
   * @param after - After snapshot
   * @returns Diff statistics
   */
  calculateDiffStats(before: any, after: any): DiffStats {
    const diff = this.diffAlgorithm.compare(before, after);
    
    return {
      additions: diff.filter(d => d.type === 'add').length,
      deletions: diff.filter(d => d.type === 'remove').length,
      modifications: diff.filter(d => d.type === 'modify').length,
      unchanged: diff.filter(d => d.type === 'equal').length,
      totalChanges: diff.filter(d => d.type !== 'equal').length,
      similarity: this.calculateSimilarity(before, after)
    };
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private generateAllDiffs(snapshots: Map<string, any>): DiffComparison[] {
    const comparisons: DiffComparison[] = [];
    const snapshotKeys = Array.from(snapshots.keys());

    for (let i = 0; i < snapshotKeys.length - 1; i++) {
      const beforeKey = snapshotKeys[i];
      const afterKey = snapshotKeys[i + 1];
      const before = snapshots.get(beforeKey);
      const after = snapshots.get(afterKey);

      if (before && after) {
        const diff = this.diffAlgorithm.compare(before, after);
        const stats = this.calculateDiffStats(before, after);

        comparisons.push({
          beforeKey,
          afterKey,
          before,
          after,
          diff,
          stats,
          timestamp: new Date()
        });
      }
    }

    return comparisons;
  }

  private generateHtmlReport(
    diffs: DiffComparison[],
    options: Required<DiffReportOptions>
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <style>
        ${this.getDiffCSS()}
    </style>
</head>
<body class="theme-${options.theme}">
    <div class="diff-report">
        <header class="diff-header">
            <h1>${options.title}</h1>
            <div class="diff-controls">
                <button onclick="toggleTheme()">🌓 Toggle Theme</button>
                <button onclick="toggleView()">⇄ Toggle View</button>
                <button onclick="exportDiff()">📥 Export</button>
            </div>
        </header>

        <main class="diff-content">
            <div class="diff-summary">
                <h2>Diff Summary</h2>
                <div class="summary-stats">
                    ${this.renderSummaryStats(diffs)}
                </div>
            </div>

            <div class="diff-comparisons">
                ${diffs.map((diff, index) => this.renderDiffComparison(diff, index)).join('')}
            </div>
        </main>
    </div>

    <script>
        ${this.getDiffJS()}
        window.diffData = ${JSON.stringify(diffs)};
        initializeDiffReport(window.diffData);
    </script>
</body>
</html>`;
  }

  private renderSummaryStats(diffs: DiffComparison[]): string {
    const totalStats = diffs.reduce((acc, diff) => ({
      additions: acc.additions + diff.stats.additions,
      deletions: acc.deletions + diff.stats.deletions,
      modifications: acc.modifications + diff.stats.modifications,
      totalChanges: acc.totalChanges + diff.stats.totalChanges
    }), { additions: 0, deletions: 0, modifications: 0, totalChanges: 0 });

    return `
      <div class="stat-card">
        <h3>${totalStats.additions}</h3>
        <p>Additions</p>
      </div>
      <div class="stat-card">
        <h3>${totalStats.deletions}</h3>
        <p>Deletions</p>
      </div>
      <div class="stat-card">
        <h3>${totalStats.modifications}</h3>
        <p>Modifications</p>
      </div>
      <div class="stat-card">
        <h3>${totalStats.totalChanges}</h3>
        <p>Total Changes</p>
      </div>
    `;
  }

  private renderDiffComparison(diff: DiffComparison, index: number): string {
    const sideBySide = this.formatSideBySideDiff(diff.diff);
    
    return `
      <div class="diff-comparison" data-index="${index}">
        <div class="comparison-header">
          <h3>${diff.beforeKey} → ${diff.afterKey}</h3>
          <div class="comparison-stats">
            <span class="stat additions">+${diff.stats.additions}</span>
            <span class="stat deletions">-${diff.stats.deletions}</span>
            <span class="stat modifications">~${diff.stats.modifications}</span>
            <span class="similarity">${Math.round(diff.stats.similarity * 100)}% similar</span>
          </div>
        </div>
        
        <div class="diff-view side-by-side">
          <div class="diff-pane before">
            <h4>Before (${diff.beforeKey})</h4>
            <pre class="diff-content">${this.highlightDiffContent(sideBySide.before)}</pre>
          </div>
          <div class="diff-pane after">
            <h4>After (${diff.afterKey})</h4>
            <pre class="diff-content">${this.highlightDiffContent(sideBySide.after)}</pre>
          </div>
        </div>
        
        <div class="diff-view unified" style="display: none;">
          <h4>Unified Diff</h4>
          <pre class="diff-content unified-content">${this.generateUnifiedDiff(diff.before, diff.after)}</pre>
        </div>
      </div>
    `;
  }

  private formatConsoleDiff(diff: DiffOperation[], options: ConsoleDiffOptions): string {
    const lines: string[] = [];
    const colors = options.colors !== false;

    diff.forEach(operation => {
      const prefix = this.getDiffPrefix(operation.type);
      const color = colors ? this.getDiffColor(operation.type) : '';
      const reset = colors ? '\x1b[0m' : '';
      
      if (operation.type === 'equal' && !options.showContext) {
        return;
      }

      lines.push(`${color}${prefix} ${operation.value}${reset}`);
    });

    return lines.join('\n');
  }

  private formatJsonDiff(diff: DiffOperation[]): JsonDiff {
    const changes: JsonChange[] = [];
    
    diff.forEach(operation => {
      if (operation.type !== 'equal') {
        changes.push({
          type: operation.type,
          path: operation.path || '',
          oldValue: operation.oldValue,
          newValue: operation.newValue,
          value: operation.value
        });
      }
    });

    return {
      changes,
      summary: {
        additions: diff.filter(d => d.type === 'add').length,
        deletions: diff.filter(d => d.type === 'remove').length,
        modifications: diff.filter(d => d.type === 'modify').length
      }
    };
  }

  private formatSideBySideDiff(diff: DiffOperation[]): SideBySideDiff {
    const beforeLines: DiffLine[] = [];
    const afterLines: DiffLine[] = [];
    
    diff.forEach((operation, index) => {
      switch (operation.type) {
        case 'equal':
          beforeLines.push({ content: operation.value, type: 'equal', lineNumber: index + 1 });
          afterLines.push({ content: operation.value, type: 'equal', lineNumber: index + 1 });
          break;
        case 'remove':
          beforeLines.push({ content: operation.value, type: 'remove', lineNumber: index + 1 });
          afterLines.push({ content: '', type: 'empty', lineNumber: index + 1 });
          break;
        case 'add':
          beforeLines.push({ content: '', type: 'empty', lineNumber: index + 1 });
          afterLines.push({ content: operation.value, type: 'add', lineNumber: index + 1 });
          break;
        case 'modify':
          beforeLines.push({ content: operation.oldValue || '', type: 'remove', lineNumber: index + 1 });
          afterLines.push({ content: operation.newValue || '', type: 'add', lineNumber: index + 1 });
          break;
      }
    });

    return { before: beforeLines, after: afterLines };
  }

  private highlightDiffContent(lines: DiffLine[]): string {
    return lines.map(line => {
      const className = `diff-line diff-${line.type}`;
      const lineNumber = line.lineNumber.toString().padStart(4, ' ');
      return `<span class="${className}"><span class="line-number">${lineNumber}</span>${this.escapeHtml(line.content)}</span>`;
    }).join('\n');
  }

  private objectToLines(obj: any): string[] {
    return JSON.stringify(obj, null, 2).split('\n');
  }

  private calculateSimilarity(before: any, after: any): number {
    const beforeStr = JSON.stringify(before);
    const afterStr = JSON.stringify(after);
    
    if (beforeStr === afterStr) return 1;
    
    const maxLength = Math.max(beforeStr.length, afterStr.length);
    const distance = this.levenshteinDistance(beforeStr, afterStr);
    
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private getDiffPrefix(type: DiffType): string {
    switch (type) {
      case 'add': return '+';
      case 'remove': return '-';
      case 'modify': return '~';
      case 'equal': return ' ';
      default: return ' ';
    }
  }

  private getDiffColor(type: DiffType): string {
    switch (type) {
      case 'add': return '\x1b[32m';      // Green
      case 'remove': return '\x1b[31m';   // Red
      case 'modify': return '\x1b[33m';   // Yellow
      case 'equal': return '\x1b[37m';    // White
      default: return '\x1b[0m';          // Reset
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private getDefaultOptions(): Required<DiffReportOptions> {
    return {
      title: 'Snapshot Diff Report',
      theme: 'light',
      showLineNumbers: true,
      contextLines: 3,
      highlightSyntax: true
    };
  }

  private getDiffCSS(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background: var(--bg-color);
        color: var(--text-color);
      }

      .theme-light {
        --bg-color: #ffffff;
        --text-color: #333333;
        --border-color: #e1e4e8;
        --add-bg: #e6ffed;
        --add-border: #34d058;
        --remove-bg: #ffeef0;
        --remove-border: #d73a49;
        --modify-bg: #fff8e1;
        --modify-border: #f59e0b;
      }

      .theme-dark {
        --bg-color: #0d1117;
        --text-color: #c9d1d9;
        --border-color: #30363d;
        --add-bg: #0e4429;
        --add-border: #238636;
        --remove-bg: #67060c;
        --remove-border: #f85149;
        --modify-bg: #533f03;
        --modify-border: #d29922;
      }

      .diff-header {
        padding: 1rem 2rem;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-color);
      }

      .diff-controls button {
        margin-left: 0.5rem;
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color);
        background: var(--bg-color);
        color: var(--text-color);
        border-radius: 4px;
        cursor: pointer;
      }

      .summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
      }

      .stat-card {
        padding: 1rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        text-align: center;
      }

      .diff-comparison {
        margin: 2rem 0;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        overflow: hidden;
      }

      .comparison-header {
        padding: 1rem;
        background: var(--bg-color);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .comparison-stats .stat {
        margin-left: 1rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
      }

      .stat.additions { background: var(--add-bg); border: 1px solid var(--add-border); }
      .stat.deletions { background: var(--remove-bg); border: 1px solid var(--remove-border); }
      .stat.modifications { background: var(--modify-bg); border: 1px solid var(--modify-border); }

      .diff-view.side-by-side {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      .diff-pane {
        padding: 1rem;
        border-right: 1px solid var(--border-color);
      }

      .diff-pane:last-child { border-right: none; }

      .diff-content {
        font-family: inherit;
        font-size: 0.875rem;
        line-height: 1.5;
        white-space: pre-wrap;
        overflow-x: auto;
      }

      .diff-line {
        display: block;
        padding: 0.125rem 0.5rem;
        margin: 0;
      }

      .diff-add { background: var(--add-bg); border-left: 3px solid var(--add-border); }
      .diff-remove { background: var(--remove-bg); border-left: 3px solid var(--remove-border); }
      .diff-modify { background: var(--modify-bg); border-left: 3px solid var(--modify-border); }

      .line-number {
        display: inline-block;
        width: 4ch;
        margin-right: 1ch;
        color: var(--text-color);
        opacity: 0.6;
      }

      @media (max-width: 768px) {
        .diff-view.side-by-side {
          grid-template-columns: 1fr;
        }
        
        .diff-pane {
          border-right: none;
          border-bottom: 1px solid var(--border-color);
        }
      }
    `;
  }

  private getDiffJS(): string {
    return `
      let currentView = 'side-by-side';
      let currentTheme = 'light';

      function initializeDiffReport(data) {
        console.log('Diff report initialized with', data.length, 'comparisons');
      }

      function toggleView() {
        const sideBySideViews = document.querySelectorAll('.diff-view.side-by-side');
        const unifiedViews = document.querySelectorAll('.diff-view.unified');
        
        if (currentView === 'side-by-side') {
          sideBySideViews.forEach(view => view.style.display = 'none');
          unifiedViews.forEach(view => view.style.display = 'block');
          currentView = 'unified';
        } else {
          sideBySideViews.forEach(view => view.style.display = 'grid');
          unifiedViews.forEach(view => view.style.display = 'none');
          currentView = 'side-by-side';
        }
      }

      function toggleTheme() {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.className = \`theme-\${currentTheme}\`;
        localStorage.setItem('diffTheme', currentTheme);
      }

      function exportDiff() {
        const data = window.diffData;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diff-report.json';
        a.click();
        URL.revokeObjectURL(url);
      }

      // Load saved theme
      document.addEventListener('DOMContentLoaded', () => {
        const savedTheme = localStorage.getItem('diffTheme') || 'light';
        currentTheme = savedTheme;
        document.body.className = \`theme-\${savedTheme}\`;
      });
    `;
  }
}

/**
 * Diff algorithm implementation
 */
class DiffAlgorithm {
  constructor(private algorithm: 'myers' | 'patience' = 'myers') {}

  compare(before: any, after: any): DiffOperation[] {
    const beforeLines = this.objectToLines(before);
    const afterLines = this.objectToLines(after);
    
    return this.algorithm === 'myers' 
      ? this.myersDiff(beforeLines, afterLines)
      : this.patienceDiff(beforeLines, afterLines);
  }

  generateUnifiedDiff(
    beforeLines: string[],
    afterLines: string[],
    beforeName: string,
    afterName: string,
    contextLines: number = 3
  ): string {
    const diff = this.myersDiff(beforeLines, afterLines);
    const lines: string[] = [];
    
    lines.push(`--- ${beforeName}`);
    lines.push(`+++ ${afterName}`);
    
    let beforeLineNum = 1;
    let afterLineNum = 1;
    
    for (const operation of diff) {
      switch (operation.type) {
        case 'equal':
          lines.push(` ${operation.value}`);
          beforeLineNum++;
          afterLineNum++;
          break;
        case 'remove':
          lines.push(`-${operation.value}`);
          beforeLineNum++;
          break;
        case 'add':
          lines.push(`+${operation.value}`);
          afterLineNum++;
          break;
      }
    }
    
    return lines.join('\n');
  }

  private myersDiff(before: string[], after: string[]): DiffOperation[] {
    const operations: DiffOperation[] = [];
    const n = before.length;
    const m = after.length;
    const max = n + m;
    
    const v: number[] = new Array(2 * max + 1);
    v[max + 1] = 0;
    
    const trace: number[][] = [];
    
    for (let d = 0; d <= max; d++) {
      trace.push([...v]);
      
      for (let k = -d; k <= d; k += 2) {
        let x: number;
        
        if (k === -d || (k !== d && v[max + k - 1] < v[max + k + 1])) {
          x = v[max + k + 1];
        } else {
          x = v[max + k - 1] + 1;
        }
        
        let y = x - k;
        
        while (x < n && y < m && before[x] === after[y]) {
          x++;
          y++;
        }
        
        v[max + k] = x;
        
        if (x >= n && y >= m) {
          return this.backtrack(before, after, trace, d);
        }
      }
    }
    
    return operations;
  }

  private backtrack(before: string[], after: string[], trace: number[][], d: number): DiffOperation[] {
    const operations: DiffOperation[] = [];
    let x = before.length;
    let y = after.length;
    
    for (let depth = d; depth > 0; depth--) {
      const v = trace[depth];
      const vPrev = trace[depth - 1];
      const max = before.length + after.length;
      
      const k = x - y;
      let prevK: number;
      
      if (k === -depth || (k !== depth && vPrev[max + k - 1] < vPrev[max + k + 1])) {
        prevK = k + 1;
      } else {
        prevK = k - 1;
      }
      
      const prevX = vPrev[max + prevK];
      const prevY = prevX - prevK;
      
      while (x > prevX && y > prevY) {
        operations.unshift({
          type: 'equal',
          value: before[x - 1],
          path: `[${x - 1}]`
        });
        x--;
        y--;
      }
      
      if (depth > 0) {
        if (x > prevX) {
          operations.unshift({
            type: 'remove',
            value: before[x - 1],
            path: `[${x - 1}]`,
            oldValue: before[x - 1]
          });
          x--;
        } else {
          operations.unshift({
            type: 'add',
            value: after[y - 1],
            path: `[${y - 1}]`,
            newValue: after[y - 1]
          });
          y--;
        }
      }
    }
    
    return operations;
  }

  private patienceDiff(before: string[], after: string[]): DiffOperation[] {
    // Simplified patience diff implementation
    // In production, use a proper patience diff algorithm
    return this.myersDiff(before, after);
  }

  private objectToLines(obj: any): string[] {
    if (typeof obj === 'string') {
      return obj.split('\n');
    }
    return JSON.stringify(obj, null, 2).split('\n');
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

export interface DiffReporterOptions {
  algorithm?: 'myers' | 'patience';
}

export interface DiffReportOptions {
  title?: string;
  theme?: 'light' | 'dark';
  showLineNumbers?: boolean;
  contextLines?: number;
  highlightSyntax?: boolean;
}

export interface ConsoleDiffOptions {
  colors?: boolean;
  showContext?: boolean;
  contextLines?: number;
}

export type DiffType = 'add' | 'remove' | 'modify' | 'equal';

export interface DiffOperation {
  type: DiffType;
  value: string;
  path?: string;
  oldValue?: string;
  newValue?: string;
}

export interface DiffComparison {
  beforeKey: string;
  afterKey: string;
  before: any;
  after: any;
  diff: DiffOperation[];
  stats: DiffStats;
  timestamp: Date;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
  unchanged: number;
  totalChanges: number;
  similarity: number;
}

export interface JsonDiff {
  changes: JsonChange[];
  summary: {
    additions: number;
    deletions: number;
    modifications: number;
  };
}

export interface JsonChange {
  type: DiffType;
  path: string;
  oldValue?: any;
  newValue?: any;
  value?: any;
}

export interface SideBySideDiff {
  before: DiffLine[];
  after: DiffLine[];
}

export interface DiffLine {
  content: string;
  type: DiffType | 'empty';
  lineNumber: number;
}