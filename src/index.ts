// src/index.ts

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
export { HttpClient } from './core/clients/HttpClient';
export { GraphQLClient } from './core/clients/GraphQLClient';
export { WebSocketClient, WebSocketPool } from './core/clients/WebSocketClient';
export { ClientManager } from './core/clients/ClientManager';

// Configuration exports
export { Config } from './core/config/Config';
export { ConfigLoader } from './core/config/ConfigLoader';
export { ConfigValidator } from './core/config/ConfigValidator';

// Storage exports
export { VariableStore } from './core/stores/VariableStore';
export { ResponseStore } from './core/stores/ResponseStore';
export { SnapshotStore } from './core/stores/SnapshotStore';

// Authentication exports
export { AuthProvider } from './core/auth/AuthProvider';
export { BearerAuth } from './core/auth/BearerAuth';
export { BasicAuth } from './core/auth/BasicAuth';

// Utility exports
export { JsonPlaceholderResolver } from './utils/JsonPlaceholderResolver';
export { JsonPathExtractor } from './utils/JsonPathExtractor';
export { PerformanceTracker } from './utils/PerformanceTracker';
export { RetryManager } from './utils/RetryManager';
export { ValidationUtils } from './utils/ValidationUtils';
export { WaitUtils, WaitBuilder, CancellationToken, sleep, waitUntil, waitForValue, waitFor } from './utils/WaitUtils';

// Decorator exports
export { 
  smoke, 
  regression, 
  integration, 
  unit, 
  e2e, 
  critical, 
  slow, 
  fast, 
  flaky, 
  skip, 
  tag, 
  tags,
  description,
  timeout,
  retry,
  priority,
  author,
  issue,
  dependsOn,
  group,
  env,
  feature,
  getTags,
  getTimeout,
  getRetries,
  getPriority,
  getSkipInfo,
  getTestMetadata,
  hasTag,
  hasAnyTag,
  hasAllTags,
  getTestMethods,
  filterTestsByTags,
  sortTestsByPriority,
  groupTestsByTag
} from './decorators/TestTags';

export { TestMetadataManager } from './decorators/TestMetadata';
export { TagFilter, TagFilterCLI } from './decorators/TagFilter';

// Logging exports
export { AuditLogger } from './logging/AuditLogger';

// Interceptor exports
export { InterceptorManager, BuiltInInterceptors } from './interceptors/InterceptorManager';

// Assertion exports
export { ChaiExtensions } from './assertions/ChaiExtensions';
export { JsonAssertions } from './assertions/JsonAssertions';
export { ResponseAssertions } from './assertions/ResponseAssertions';

// Reporting exports
export { ReportGenerator } from './reporting/ReportGenerator';
export { HtmlReporter } from './reporting/HtmlReporter';
export { DiffReporter } from './reporting/DiffReporter';

// CLI exports
export { RestifiedCLI } from './cli/RestifiedCLI';
export { TestGenerator } from './cli/TestGenerator';

// Mock server exports
export { MockServer } from './utils/MockServer';
export { FileUploadHandler } from './utils/FileUploadHandler';

// Type exports
export * from './types/RestifiedTypes';

// Error exports
export {
  RestifiedError,
  AssertionError,
  TimeoutError,
  RetryError
} from './types/RestifiedTypes';

// Default export
export default RestifiedTS;