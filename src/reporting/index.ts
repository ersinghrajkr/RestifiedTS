/**
 * RestifiedTS Reporting Module
 * 
 * Comprehensive reporting system for test results, performance analysis,
 * and visual diff comparisons. Provides multiple output formats including
 * interactive HTML reports, JSON data exports, and detailed diff reports.
 */

// Main report generator (temporarily commented out due to type issues)
// export { ReportGenerator } from './ReportGenerator';

// Specialized reporters (HtmlReporter temporarily commented out due to type issues)
// export { HtmlReporter } from './HtmlReporter';
export { DiffReporter } from './DiffReporter';

// Re-export reporting types for convenience
export type {
  ReportingConfig,
  AuditLogEntry,
  TestReportData,
  TestSummary,
  TestResult,
  PerformanceMetrics,
  ErrorAnalysis,
  SnapshotSummary,
  TimeSeriesPoint,
  TrendData,
  TrendDirection
} from '../types/RestifiedTypes';