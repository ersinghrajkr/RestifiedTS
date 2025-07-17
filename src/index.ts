/**
 * RestifiedTS - Production-Grade API Testing Framework
 * 
 * A powerful, TypeScript-first API testing framework inspired by Java's RestAssured
 * but built specifically for modern JavaScript/TypeScript environments.
 * 
 * @author Raj Kumar
 * @version 1.0.0
 * @license MIT
 */

// Core DSL exports
export { RestifiedTS, restified } from './core/dsl/RestifiedTS';
export { GivenStep } from './core/dsl/GivenStep';
export { WhenStep } from './core/dsl/WhenStep';
export { ThenStep } from './core/dsl/ThenStep';

// Client exports
export { 
  HttpClient, 
  GraphQLClient, 
  GraphQLManager, 
  GraphQLQueryBuilder,
  WebSocketClient,
  WebSocketManager
} from './core/clients';

// Configuration exports
export { Config, ConfigLoader, ConfigValidator } from './core/config/Config';

// Storage exports
export { 
  VariableStore, 
  ResponseStore, 
  SnapshotStore, 
  StorageManager 
} from './core/stores';

// Authentication exports
export { 
  AuthManager, 
  BearerAuth, 
  BasicAuth, 
  ApiKeyAuth, 
  OAuth2Auth,
  BaseAuthProvider
} from './core/auth';

// Assertion exports
export { 
  AssertionEngine, 
  ResponseAssertions, 
  SchemaValidator, 
  AssertionManager,
  AssertionBuilder,
  BatchAssertionBuilder,
  assertionManager
} from './assertions';

// Interceptor and Plugin exports
export { 
  InterceptorManager,
  PluginManager,
  InterceptorPluginSystem,
  BuiltInInterceptorFactory
} from './interceptors';

// Logging and Reporting exports
export { 
  RestifiedLogger,
  TransportFactory
} from './logging';

export {
  ReportingManager,
  RestifiedReportGenerator,
  HtmlReportGenerator,
  JsonReportGenerator,
  JunitReportGenerator
} from './reporting';

// Type exports
export * from './types/RestifiedTypes';
export { 
  Logger, 
  LogLevel, 
  LogEntry, 
  LogTransport, 
  LogFormatter, 
  LoggerConfig,
  LogTimer,
  LogContext,
  LogFilter,
  LogMiddleware,
  LogEvent,
  LogEventHandler,
  LogSamplingConfig,
  LogBufferConfig,
  LogRotationPolicy,
  HttpLogEntry,
  TestLogEntry,
  PerformanceLogEntry,
  AuditLogEntry 
} from './logging/LoggingTypes';
export { 
  TestStatus, 
  TestSeverity, 
  ReportFormat,
  TestStepResult,
  TestCaseResult,
  TestSuiteResult,
  TestExecutionResult,
  TestStatistics,
  TestEnvironment,
  TestAttachment,
  ReportConfig,
  ReportGenerator,
  ReportOutput,
  DashboardData,
  TestAnalytics,
  NotificationConfig,
  CustomReportSection,
  ReportTemplate,
  TestMetricsCollector,
  TestResultsStorage,
  TestResultsQuery,
  ReportScheduler,
  TestExecutionListener,
  HistoricalTestData,
  TestTrendData
} from './reporting/ReportingTypes';

// Re-export for default
import { RestifiedTS } from './core/dsl/RestifiedTS';

// Default export
export default RestifiedTS;