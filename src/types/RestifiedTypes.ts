// src/types/RestifiedTypes.ts

/**
 * Core type definitions for RestifiedTS framework
 * Provides comprehensive typing for all framework components
 */

// ==========================================
// CORE CONFIGURATION TYPES
// ==========================================

export interface RestifiedConfig {
  baseURL: string;
  timeout: number;
  retryConfig: RetryConfig;
  logging: LoggingConfig;
  reporting: ReportingConfig;
  auth?: AuthConfig;
  proxy?: ProxyConfig;
  ssl?: SSLConfig;
  storage?: StorageConfig;
  snapshots?: SnapshotConfig;
}

export interface RetryConfig {
  maxRetries: number;
  backoffFactor: number;
  retryDelay: number;
  retryStatusCodes: number[];
}

export interface LoggingConfig {
  level: LogLevel;
  auditEnabled: boolean;
  auditPath: string;
  console: boolean;
}

export interface ReportingConfig {
  enabled: boolean;
  format: 'html' | 'json' | 'both';
  outputPath: string;
  includeSnapshots: boolean;
}

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'custom';
  credentials: Record<string, any>;
}

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  auth?: {
    username: string;
    password: string;
  };
}

export interface SSLConfig {
  rejectUnauthorized: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface StorageConfig {
  maxResponses: number;
  maxVariables: number;
}

export interface SnapshotConfig {
  directory: string;
  autoSave: boolean;
  compression: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type ContentType = 'application/json' | 'application/xml' | 'text/plain' | 'text/html' | 'multipart/form-data' | string;

// ==========================================
// DSL INTERFACE TYPES
// ==========================================

export interface IGivenStep {
  baseURL(url: string): IGivenStep;
  header(key: string, value: string): IGivenStep;
  headers(headers: Record<string, string>): IGivenStep;
  auth(provider: AuthProvider): IGivenStep;
  timeout(ms: number): IGivenStep;
  variable(key: string, value: any): IGivenStep;
  variables(vars: Record<string, any>): IGivenStep;
  queryParams(params: Record<string, any>): IGivenStep;
  queryParam(key: string, value: any): IGivenStep;
  contentType(contentType: string): IGivenStep;
  accept(accept: string): IGivenStep;
  useClient(clientName: string): IGivenStep;
  log(message: string): IGivenStep;
  userAgent(userAgent: string): IGivenStep;
  authorization(token: string): IGivenStep;
  bearerToken(token: string): IGivenStep;
  when(): IWhenStep;
}

export interface IWhenStep {
  get(url: string): IWhenStep;
  post(url: string, data?: any): IWhenStep;
  put(url: string, data?: any): IWhenStep;
  delete(url: string): IWhenStep;
  patch(url: string, data?: any): IWhenStep;
  head(url: string): IWhenStep;
  options(url: string): IWhenStep;
  graphql(request: GraphQLRequest): IWhenStep;
  websocket(config: WebSocketConfig): IWhenStep;
  body(data: any): IWhenStep;
  headers(headers: Record<string, string>): IWhenStep;
  queryParams(params: Record<string, any>): IWhenStep;
  responseType(responseType: 'json' | 'text' | 'blob' | 'arraybuffer'): IWhenStep;
  execute(): Promise<IThenStep>;
}

export interface IThenStep {
  statusCode(code: number): IThenStep;
  statusCodeIn(codes: number[]): IThenStep;
  contentType(type: ContentType): IThenStep;
  header(key: string, value: string): IThenStep;
  body(matcher: any): IThenStep;
  jsonPath(path: string, value: any): IThenStep;
  responseTime(maxMs: number): IThenStep;
  storeResponse(key: string): IThenStep;
  saveSnapshot(key: string): IThenStep;
  compareSnapshot(key: string): IThenStep;
  log(message?: string): IThenStep;
  extract(path: string, variable: string): IThenStep;
  getResponse(): RestifiedResponse;
  getStats(): {
    assertionCount: number;
    extractedVariables: Record<string, any>;
    responseTime: number;
    statusCode: number;
  };
}

// ==========================================
// HTTP REQUEST/RESPONSE TYPES
// ==========================================

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

export interface RestifiedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  responseTime: number;
  url: string;
  config: RequestConfig;
}

export interface PerformanceMetrics {
  responseTime: number;
  dnsLookupTime: number;
  tcpConnectTime: number;
  tlsHandshakeTime: number;
  firstByteTime: number;
  downloadTime: number;
}

// ==========================================
// GRAPHQL TYPES
// ==========================================

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLResponse {
  data?: any;
  errors?: GraphQLError[];
  extensions?: Record<string, any>;
}

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, any>;
}

// ==========================================
// WEBSOCKET TYPES
// ==========================================

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  headers?: Record<string, string>;
  timeout?: number;
}

export interface WebSocketMessage {
  type: 'text' | 'binary';
  data: any;
  timestamp: Date;
}

// ==========================================
// AUTHENTICATION TYPES
// ==========================================

export interface AuthProvider {
  authenticate(config: RequestConfig): Promise<RequestConfig>;
  refreshToken?(): Promise<void>;
}

// ==========================================
// STORAGE TYPES
// ==========================================

export interface VariableScope {
  global: Map<string, any>;
  local: Map<string, any>;
}

export interface SnapshotDiff {
  hasDifferences: boolean;
  added: any[];
  removed: any[];
  modified: any[];
}

// ==========================================
// AUDIT AND LOGGING TYPES
// ==========================================

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  duration?: number;
  requestId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  auditEnabled: boolean;
  auditPath: string;
  console: boolean;
  maxFileSize?: number;
  maxFiles?: number;
}

// ==========================================
// PLUGIN TYPES
// ==========================================

export interface RestifiedPlugin {
  name: string;
  version: string;
  initialize(restified: any): void;
  beforeRequest?(config: RequestConfig): void | Promise<void>;
  afterResponse?(response: RestifiedResponse): void | Promise<void>;
  onError?(error: Error): void | Promise<void>;
}

// ==========================================
// ERROR TYPES
// ==========================================

export class RestifiedError extends Error {
  public readonly response?: RestifiedResponse;
  
  constructor(message: string, response?: RestifiedResponse) {
    super(message);
    this.name = 'RestifiedError';
    this.response = response;
  }
}

export class AssertionError extends RestifiedError {
  public readonly expected: any;
  public readonly actual: any;
  
  constructor(message: string, expected: any, actual: any) {
    super(message);
    this.name = 'AssertionError';
    this.expected = expected;
    this.actual = actual;
  }
}

export class TimeoutError extends RestifiedError {
  public readonly timeout: number;
  
  constructor(message: string, timeout: number) {
    super(message);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

export class RetryError extends RestifiedError {
  public readonly attempts: number;
  
  constructor(message: string, attempts: number) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
  }
}

export class ValidationError extends RestifiedError {
  public readonly field: string;
  
  constructor(message: string, field: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// ==========================================
// UTILITY TYPES
// ==========================================

export interface JsonPathResult {
  path: string;
  value: any;
  exists: boolean;
}

export interface TemplateResolver {
  resolve(template: any): any;
  addHelper(name: string, helper: Function): void;
  removeHelper(name: string): void;
}

export interface MockServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  addRoute(method: string, path: string, handler: Function): void;
  removeRoute(method: string, path: string): void;
  getPort(): number;
  isRunning(): boolean;
}

// ==========================================
// TESTING TYPES
// ==========================================

export interface TestMetadata {
  name: string;
  tags: string[];
  description?: string;
  author?: string;
  timeout?: number;
  retries?: number;
  skip?: boolean;
  only?: boolean;
}

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  assertions: number;
  error?: Error;
  metadata?: TestMetadata;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
}

// ==========================================
// REPORTING TYPES
// ==========================================

export interface ReportData {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    startTime: Date;
    endTime: Date;
  };
  suites: TestSuite[];
  environment: {
    node: string;
    os: string;
    arch: string;
  };
  configuration: RestifiedConfig;
}

export interface HtmlReportOptions {
  title?: string;
  theme?: 'light' | 'dark';
  includeConfig?: boolean;
  includeSnapshots?: boolean;
  includeAuditLog?: boolean;
}

// ==========================================
// VALIDATION TYPES
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SchemaValidator {
  validate(data: any, schema: any): ValidationResult;
  addSchema(id: string, schema: any): void;
  removeSchema(id: string): void;
}

// ==========================================
// INTERCEPTOR TYPES
// ==========================================

export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor {
  (response: RestifiedResponse): RestifiedResponse | Promise<RestifiedResponse>;
}

export interface ErrorInterceptor {
  (error: Error): Error | Promise<Error>;
}

// ==========================================
// SNAPSHOT TYPES
// ==========================================

export interface SnapshotOptions {
  name: string;
  description?: string;
  tags?: string[];
  threshold?: number;
  ignoreFields?: string[];
}

export interface SnapshotComparison {
  baseline: any;
  current: any;
  diff: SnapshotDiff;
  passed: boolean;
  threshold: number;
}

// ==========================================
// FILE UPLOAD TYPES
// ==========================================

export interface FileUpload {
  field: string;
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface MultipartFormData {
  fields: Record<string, string>;
  files: FileUpload[];
}

// ==========================================
// RATE LIMITING TYPES
// ==========================================

export interface RateLimitConfig {
  requests: number;
  window: number; // in milliseconds
  strategy: 'fixed' | 'sliding';
}

export interface RateLimiter {
  isAllowed(): boolean;
  getRemaining(): number;
  getResetTime(): Date;
  reset(): void;
}

// ==========================================
// PERFORMANCE TYPES
// ==========================================

export interface PerformanceProfile {
  name: string;
  thresholds: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  metrics: PerformanceMetrics;
}

export interface LoadTestConfig {
  concurrent: number;
  duration: number;
  rampUp: number;
  rampDown: number;
  target: string;
  profile: PerformanceProfile;
}

// ==========================================
// TYPE GUARDS AND UTILITIES
// ==========================================

export function isRestifiedResponse(obj: any): obj is RestifiedResponse {
  return obj && 
    typeof obj.status === 'number' &&
    typeof obj.statusText === 'string' &&
    typeof obj.headers === 'object' &&
    typeof obj.responseTime === 'number' &&
    typeof obj.url === 'string';
}

export function isGraphQLRequest(obj: any): obj is GraphQLRequest {
  return obj && typeof obj.query === 'string';
}

export function isWebSocketConfig(obj: any): obj is WebSocketConfig {
  return obj && typeof obj.url === 'string' && obj.url.startsWith('ws');
}

export function isAuthProvider(obj: any): obj is AuthProvider {
  return obj && typeof obj.authenticate === 'function';
}

export function isRestifiedError(error: any): error is RestifiedError {
  return error instanceof RestifiedError;
}

export function isAssertionError(error: any): error is AssertionError {
  return error instanceof AssertionError;
}

export function isTimeoutError(error: any): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isRetryError(error: any): error is RetryError {
  return error instanceof RetryError;
}

// ==========================================
// EXPORT ALL TYPES
// ==========================================

export * from './ConfigTypes';
export * from './ClientTypes';
export * from './ReportTypes';