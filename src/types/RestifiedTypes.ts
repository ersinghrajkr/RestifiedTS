/**
 * RestifiedTS Core Types
 * 
 * This file contains all the core type definitions for RestifiedTS
 * including configuration, response, request, and DSL-related types.
 */

import { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import { IncomingHttpHeaders } from 'http';

// ==========================================
// CORE CONFIGURATION TYPES
// ==========================================

// New Playwright-style configuration extensions
export interface PlaywrightStyleConfig {
  // Test Discovery (Playwright-style)
  testDir?: string;
  testMatch?: string | string[];
  testIgnore?: string | string[];
  
  // Execution Settings (Playwright-style)
  fullyParallel?: boolean;
  workers?: number | string;
  forbidOnly?: boolean;
  
  // Global Setup/Teardown (Playwright-style)
  globalSetup?: string;
  globalTeardown?: string;
  
  // Multi-project support (Playwright-style)
  projects?: ProjectConfig[];
  
  // Reporting (Playwright-style)
  reporter?: string | ReporterConfig | (string | ReporterConfig)[];
  
  // Enterprise extensions
  enterprise?: EnterpriseConfigExtended;
}

export interface ProjectConfig {
  name: string;
  baseURL?: string;
  testMatch?: string | string[];
  testIgnore?: string | string[];
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  auth?: RestifiedConfig['auth'];
  environment?: string;
}

export interface ReporterConfig {
  type: 'html' | 'json' | 'junit' | 'console' | 'github' | 'list';
  options?: {
    outputFile?: string;
    outputFolder?: string;
    open?: boolean;
    inline?: boolean;
  };
}

export interface EnterpriseConfigExtended {
  roles?: string[];
  dataGeneration?: boolean;
  boundaryTesting?: boolean;
  performanceTracking?: boolean;
  securityTesting?: boolean;
  loadBalancing?: 'round-robin' | 'random' | 'least-connections';
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
  };
}

export interface RestifiedConfig extends PlaywrightStyleConfig {
  // Base configuration
  baseURL?: string;
  timeout?: number;
  maxRedirects?: number;
  
  // Headers
  headers?: Record<string, string>;
  defaultHeaders?: Record<string, string>;
  
  // Authentication
  auth?: {
    type: 'basic' | 'bearer' | 'oauth2' | 'apikey' | 'custom';
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    headerName?: string;
    customAuth?: (config: AxiosRequestConfig) => AxiosRequestConfig;
  };
  
  // Retry configuration
  retry?: {
    retries?: number;
    retryDelay?: number;
    retryCondition?: (error: any) => boolean;
    retryOnStatusCodes?: number[];
  };
  
  // Proxy configuration
  proxy?: {
    host: string;
    port: number;
    protocol?: 'http' | 'https' | 'socks4' | 'socks5';
    username?: string;
    password?: string;
  };
  
  // SSL/TLS configuration
  ssl?: {
    rejectUnauthorized?: boolean;
    cert?: string;
    key?: string;
    ca?: string;
    passphrase?: string;
  };
  
  // Logging configuration
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
    format?: 'json' | 'text' | 'structured';
    includeHeaders?: boolean;
    includeBody?: boolean;
    maxBodyLength?: number;
    outputFile?: string;
  };
  
  // Storage configuration
  storage?: {
    maxResponses?: number;
    maxVariables?: number;
    maxSnapshots?: number;
    persistOnDisk?: boolean;
    storageDir?: string;
  };
  
  // Snapshot configuration
  snapshots?: {
    enabled?: boolean;
    directory?: string;
    updateOnMismatch?: boolean;
    ignoreFields?: string[];
  };
  
  // Performance configuration
  performance?: {
    trackMetrics?: boolean;
    slowThreshold?: number;
    enableProfiling?: boolean;
  };
  
  // Validation configuration
  validation?: {
    strictMode?: boolean;
    validateResponseSchema?: boolean;
    validateRequestSchema?: boolean;
    customValidators?: Record<string, (value: any) => boolean>;
  };
  
  // Plugin configuration
  plugins?: {
    enabled?: string[];
    disabled?: string[];
    config?: Record<string, any>;
  };
  
  // Environment configuration
  environment?: string;
  
  // Miscellaneous
  followRedirects?: boolean;
  validateStatus?: (status: number) => boolean;
  userAgent?: string;
  
  // WebSocket configuration
  websocket?: {
    timeout?: number;
    pingInterval?: number;
    maxReconnectAttempts?: number;
    protocols?: string[];
  };
  
  // GraphQL configuration
  graphql?: {
    endpoint?: string;
    introspection?: boolean;
    defaultVariables?: Record<string, any>;
  };
}

// ==========================================
// REQUEST AND RESPONSE TYPES
// ==========================================

export interface RestifiedRequest {
  method: Method;
  url: string;
  headers: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  queryParams?: Record<string, any>;
  formData?: FormData;
  timestamp: Date;
  id: string;
  metadata?: Record<string, any>;
}

export interface RestifiedResponse {
  status: number;
  statusText: string;
  headers: IncomingHttpHeaders;
  data: any;
  config: AxiosRequestConfig;
  request: RestifiedRequest;
  responseTime: number;
  size: number;
  timestamp: Date;
  id: string;
  metadata?: Record<string, any>;
}

export interface RestifiedError extends Error {
  request?: RestifiedRequest;
  response?: RestifiedResponse;
  config?: AxiosRequestConfig;
  code?: string;
  isAxiosError?: boolean;
}

// ==========================================
// DSL STEP INTERFACES
// ==========================================

/**
 * Given Step Interface - Request Configuration
 * 
 * The Given step allows you to configure the request before execution.
 * This includes setting headers, authentication, request body, parameters, and more.
 * 
 * @example
 * ```typescript
 * const response = await restified
 *   .given()
 *     .baseURL('https://api.example.com')
 *     .bearerToken('your-token-here')
 *     .header('Content-Type', 'application/json')
 *     .body({ name: 'John Doe', email: 'john@example.com' })
 *   .when()
 *     .post('/users')
 *     .execute();
 * ```
 */
export interface IGivenStep {
  // =============================================
  // CONFIGURATION METHODS
  // =============================================
  
  /**
   * Set the base URL for the API request
   * 
   * @param url - The base URL (supports variable templating like {{baseURL}})
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .baseURL('https://api.example.com')
   * .baseURL('{{API_BASE_URL}}') // Using template variable
   * .baseURL(process.env.API_BASE_URL || 'https://localhost:3000')
   * ```
   */
  baseURL(url: string): IGivenStep;

  /**
   * Set the request timeout in milliseconds
   * 
   * @param ms - Timeout in milliseconds (default: 30000)
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .timeout(5000)  // 5 seconds
   * .timeout(30000) // 30 seconds (default)
   * ```
   */
  timeout(ms: number): IGivenStep;

  /**
   * Use a specific named HTTP client
   * 
   * @param clientName - Name of the client to use (must be created first)
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * // First create the client
   * restified.createClient('authService', { baseURL: 'https://auth.example.com' });
   * 
   * // Then use it
   * .client('authService')
   * ```
   */
  client(clientName: string): IGivenStep;
  
  // =============================================
  // HEADER METHODS
  // =============================================

  /**
   * Set a single HTTP header
   * 
   * @param name - Header name (case-insensitive)
   * @param value - Header value (supports variable templating)
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .header('Content-Type', 'application/json')
   * .header('Authorization', 'Bearer {{authToken}}')
   * .header('X-Request-ID', '{{$random.uuid}}')
   * ```
   */
  header(name: string, value: string): IGivenStep;

  /**
   * Set multiple HTTP headers at once
   * 
   * @param headers - Object containing header name-value pairs
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .headers({
   *   'Content-Type': 'application/json',
   *   'Authorization': 'Bearer {{token}}',
   *   'X-API-Key': '{{apiKey}}'
   * })
   * ```
   */
  headers(headers: Record<string, string>): IGivenStep;

  /**
   * Set the Content-Type header
   * 
   * @param contentType - MIME type for the request body
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .contentType('application/json')
   * .contentType('application/xml')
   * .contentType('multipart/form-data')
   * ```
   */
  contentType(contentType: string): IGivenStep;

  /**
   * Set the Accept header
   * 
   * @param accept - MIME type(s) the client accepts
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .accept('application/json')
   * .accept('application/xml')
   * .accept('text/plain, application/json')
   * ```
   */
  accept(accept: string): IGivenStep;

  /**
   * Set the User-Agent header
   * 
   * @param userAgent - User agent string
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .userAgent('RestifiedTS/1.0.0')
   * .userAgent('MyApp/2.1.0 (RestifiedTS)')
   * ```
   */
  userAgent(userAgent: string): IGivenStep;
  
  // =============================================
  // AUTHENTICATION METHODS
  // =============================================

  /**
   * Set authentication configuration
   * 
   * @param auth - Authentication configuration object
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .auth({ type: 'bearer', token: 'your-token' })
   * .auth({ type: 'basic', username: 'user', password: 'pass' })
   * ```
   */
  auth(auth: RestifiedConfig['auth']): IGivenStep;

  /**
   * Set Basic Authentication
   * 
   * @param username - Username for basic auth
   * @param password - Password for basic auth
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .basicAuth('admin', 'password123')
   * .basicAuth('{{username}}', '{{password}}')
   * ```
   */
  basicAuth(username: string, password: string): IGivenStep;

  /**
   * Set Bearer Token Authentication
   * 
   * @param token - JWT or other bearer token (supports variable templating)
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .bearerToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
   * .bearerToken('{{authToken}}')
   * .bearerToken(process.env.AUTH_TOKEN!)
   * ```
   */
  bearerToken(token: string): IGivenStep;

  /**
   * Set API Key Authentication
   * 
   * @param key - API key value (supports variable templating)
   * @param headerName - Header name for the API key (default: 'X-API-Key')
   * @returns The current Given step for method chaining
   * 
   * @example
   * ```typescript
   * .apiKey('sk_test_1234567890')
   * .apiKey('{{apiKey}}', 'X-Custom-API-Key')
   * .apiKey(process.env.API_KEY!, 'Authorization')
   * ```
   */
  apiKey(key: string, headerName?: string): IGivenStep;
  
  // Body methods
  body(body: any): IGivenStep;
  jsonBody(body: any): IGivenStep;
  formBody(body: Record<string, any>): IGivenStep;
  multipartBody(body: FormData): IGivenStep;
  
  // Parameter methods
  queryParam(name: string, value: any): IGivenStep;
  queryParams(params: Record<string, any>): IGivenStep;
  pathParam(name: string, value: any): IGivenStep;
  pathParams(params: Record<string, any>): IGivenStep;
  
  // Context Variable methods
  contextVariable(name: string, value: any): IGivenStep;
  contextVariables(variables: Record<string, any>): IGivenStep;
  
  // File methods
  file(name: string, filePath: string): IGivenStep;
  files(files: Array<{ name: string; filePath: string }>): IGivenStep;
  
  // Configuration methods
  setConfig(config: Partial<RestifiedConfig>): IGivenStep;
  
  // Proxy methods
  proxy(proxy: RestifiedConfig['proxy']): IGivenStep;
  
  // SSL methods
  ssl(ssl: RestifiedConfig['ssl']): IGivenStep;
  
  // Validation methods
  validateRequest(enabled: boolean): IGivenStep;
  schema(schema: any): IGivenStep;
  
  // Utility methods
  log(message: string): IGivenStep;
  tag(tag: string): IGivenStep;
  tags(tags: string[]): IGivenStep;
  
  // Wait methods
  wait(ms: number): Promise<IGivenStep>;
  
  // Transition to when step
  when(): IWhenStep;
}

export interface IWhenStep {
  // HTTP methods
  get(path?: string): IWhenStep;
  post(path?: string): IWhenStep;
  put(path?: string): IWhenStep;
  patch(path?: string): IWhenStep;
  delete(path?: string): IWhenStep;
  head(path?: string): IWhenStep;
  options(path?: string): IWhenStep;
  
  // Custom method
  request(method: Method, path?: string): IWhenStep;
  
  // GraphQL methods
  graphql(query: string, variables?: Record<string, any>): IWhenStep;
  graphqlQuery(query: string, variables?: Record<string, any>): IWhenStep;
  graphqlMutation(mutation: string, variables?: Record<string, any>): IWhenStep;
  
  // WebSocket methods
  websocket(path?: string): IWhenStep;
  
  // Wait methods
  wait(ms: number): Promise<IWhenStep>;
  
  // Execution
  execute(): Promise<IThenStep>;
  
  // Transition to then step
  then(): IThenStep;
}

export interface IThenStep {
  // Status assertions
  statusCode(expectedStatus: number): IThenStep;
  statusCodeIn(expectedStatuses: number[]): IThenStep;
  statusText(expectedStatusText: string): IThenStep;
  
  // Header assertions
  header(name: string, expectedValue: string | RegExp | ((value: string) => boolean)): IThenStep;
  headers(expectedHeaders: Record<string, string | RegExp | ((value: string) => boolean)>): IThenStep;
  headerExists(name: string): IThenStep;
  headerNotExists(name: string): IThenStep;
  contentType(expectedContentType: string): IThenStep;
  
  // Body assertions
  body(expectedBody: any): IThenStep;
  bodyContains(expectedSubstring: string): IThenStep;
  bodyMatches(pattern: RegExp): IThenStep;
  bodyType(expectedType: 'json' | 'xml' | 'text' | 'html'): IThenStep;
  
  // JSON assertions
  jsonPath(path: string, expectedValue: any): IThenStep;
  jsonPathExists(path: string): IThenStep;
  jsonPathNotExists(path: string): IThenStep;
  jsonPathMatches(path: string, pattern: RegExp): IThenStep;
  jsonPathContains(path: string, expectedValue: any): IThenStep;
  jsonSchema(schema: any): IThenStep;
  
  // XML assertions
  xmlPath(path: string, expectedValue: any): IThenStep;
  xmlPathExists(path: string): IThenStep;
  xmlSchema(schema: any): IThenStep;
  
  // Custom assertions
  assert(assertion: (response: RestifiedResponse) => boolean, message?: string): IThenStep;
  custom(validator: (response: RestifiedResponse) => void): IThenStep;
  
  // Performance assertions
  responseTime(expectedTime: number): IThenStep;
  responseTimeIn(minTime: number, maxTime: number): IThenStep;
  responseSize(expectedSize: number): IThenStep;
  
  // Data extraction
  extract(path: string, variableName: string): IThenStep;
  extractAll(extractions: Record<string, string>): IThenStep;
  
  // Response storage
  store(key: string): IThenStep;
  storeResponse(key: string): IThenStep;
  
  // Snapshot testing
  snapshot(key: string): IThenStep;
  snapshotUpdate(key: string): IThenStep;
  
  // Logging
  log(message?: string): IThenStep;
  logResponse(): IThenStep;
  
  // Utility methods
  wait(ms: number): IThenStep;
  waitUntil(condition: () => boolean | Promise<boolean>, timeout?: number): IThenStep;
  
  // Get response data
  getResponse(): RestifiedResponse;
  getData(): any;
  getHeaders(): IncomingHttpHeaders;
  getStatus(): number;
  getExtractedData(): Record<string, any>;
  
  // Chaining
  and(): IThenStep;
  also(): IThenStep;
  
  // Final execution
  execute(): Promise<RestifiedResponse>;
}

// ==========================================
// STORAGE TYPES
// ==========================================

export interface VariableScope {
  global: Record<string, any>;
  local: Record<string, any>;
}

export interface ResponseStorage {
  key: string;
  response: RestifiedResponse;
  timestamp: Date;
  ttl?: number;
}

export interface SnapshotData {
  key: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
  checksum: string;
}

export interface SnapshotDiff {
  added?: Record<string, any>;
  removed?: Record<string, any>;
  changed?: Record<string, any>;
  equal: boolean;
}

// ==========================================
// AUTHENTICATION TYPES
// ==========================================

export interface AuthProvider {
  name: string;
  authenticate(config: AxiosRequestConfig): Promise<AxiosRequestConfig>;
  refresh?(): Promise<void>;
  isValid?(): boolean;
}

export interface BearerAuthConfig {
  token: string;
  headerName?: string;
  prefix?: string;
}

export interface BasicAuthConfig {
  username: string;
  password: string;
}

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope?: string;
  grantType?: 'client_credentials' | 'authorization_code' | 'password' | 'refresh_token';
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: Date;
}

export interface ApiKeyConfig {
  key: string;
  headerName?: string;
  queryParamName?: string;
  location?: 'header' | 'query';
}

// ==========================================
// PLUGIN TYPES
// ==========================================

export interface RestifiedPlugin {
  name: string;
  version: string;
  description?: string;
  
  // Lifecycle hooks
  initialize?(instance: any): void;
  beforeRequest?(config: AxiosRequestConfig): Promise<AxiosRequestConfig>;
  afterResponse?(response: RestifiedResponse): Promise<RestifiedResponse>;
  onError?(error: RestifiedError): Promise<void>;
  cleanup?(): Promise<void>;
  
  // Configuration
  config?: Record<string, any>;
}

// ==========================================
// LOGGING TYPES
// ==========================================

export interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
  SILENT: 'silent';
}

export interface LogEntry {
  timestamp: Date;
  level: keyof LogLevel;
  message: string;
  metadata?: Record<string, any>;
  requestId?: string;
  sessionId?: string;
}

export interface AuditLogEntry extends LogEntry {
  type: 'request' | 'response' | 'error' | 'assertion' | 'extraction' | 'storage' | 'system';
  request?: RestifiedRequest;
  response?: RestifiedResponse;
  error?: RestifiedError;
  assertion?: AssertionResult;
  extraction?: ExtractionResult;
  duration?: number;
}

// ==========================================
// ASSERTION TYPES
// ==========================================

export interface AssertionResult {
  passed: boolean;
  message: string;
  actual?: any;
  expected?: any;
  operator?: string;
  path?: string;
  timestamp: Date;
}

export interface ExtractionResult {
  path: string;
  value: any;
  variableName: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// ==========================================
// PERFORMANCE TYPES
// ==========================================

export interface PerformanceMetrics {
  requestTime: number;
  responseTime: number;
  totalTime: number;
  dnsLookupTime?: number;
  connectionTime?: number;
  tlsTime?: number;
  firstByteTime?: number;
  downloadTime?: number;
  size: {
    request: number;
    response: number;
    headers: number;
  };
}

export interface PerformanceThresholds {
  responseTime?: number;
  totalTime?: number;
  size?: number;
}

// ==========================================
// CLIENT TYPES
// ==========================================

export interface HttpClientConfig extends RestifiedConfig {
  name: string;
  baseURL: string;
  retryConfig?: {
    retries: number;
    retryDelay: number;
    retryCondition?: (error: any) => boolean;
    retryOnStatusCodes?: number[];
  };
  circuitBreaker?: {
    enabled: boolean;
    threshold: number;
    timeout: number;
    resetTimeout: number;
  };
  rateLimiting?: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  timeout?: number;
  pingInterval?: number;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  headers?: Record<string, string>;
}

export interface GraphQLConfig {
  endpoint: string;
  headers?: Record<string, string>;
  introspection?: boolean;
  defaultVariables?: Record<string, any>;
  httpClient?: any; // HttpClient type - avoid circular dependency
}

// ==========================================
// VALIDATION TYPES
// ==========================================

export interface ValidationRule {
  name: string;
  validator: (value: any) => boolean;
  message: string;
}

export interface SchemaValidation {
  type: 'json' | 'xml' | 'custom';
  schema: any;
  strict?: boolean;
}

// ==========================================
// REPORTING TYPES
// ==========================================

export interface TestReport {
  sessionId: string;
  timestamp: Date;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  tests: TestResult[];
  performance: PerformanceMetrics;
  environment: Record<string, any>;
}

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  assertions: AssertionResult[];
  extractions: ExtractionResult[];
  request?: RestifiedRequest;
  response?: RestifiedResponse;
  error?: RestifiedError;
  tags: string[];
  metadata?: Record<string, any>;
}

// ==========================================
// UTILITY TYPES
// ==========================================

export interface WaitCondition {
  condition: () => boolean | Promise<boolean>;
  timeout?: number;
  interval?: number;
  timeoutMessage?: string;
}

export interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
  retryOnStatusCodes?: number[];
  onRetry?: (error: any, attempt: number) => void;
}

export interface MockServerConfig {
  port: number;
  routes: MockRoute[];
  middleware?: any[];
  cors?: boolean;
  staticFiles?: string;
}

export interface MockRoute {
  method: Method;
  path: string;
  response: any;
  status?: number;
  headers?: Record<string, string>;
  delay?: number;
  condition?: (req: any) => boolean;
}

// ==========================================
// ERROR TYPES
// ==========================================

export class RestifiedError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'RestifiedError';
  }
}

export class AssertionError extends RestifiedError {
  constructor(
    message: string,
    public actual?: any,
    public expected?: any,
    public operator?: string,
    public path?: string
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

export class TimeoutError extends RestifiedError {
  constructor(message: string, public timeout?: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RetryError extends RestifiedError {
  constructor(
    message: string,
    public attempts: number,
    public lastError?: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export class ValidationError extends RestifiedError {
  constructor(
    message: string,
    public validationErrors: any[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends RestifiedError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ClientError extends RestifiedError {
  constructor(
    message: string,
    public clientName?: string
  ) {
    super(message);
    this.name = 'ClientError';
  }
}

export class PluginError extends RestifiedError {
  constructor(
    message: string,
    public pluginName?: string
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

// ==========================================
// MATCHER TYPES
// ==========================================

export interface Matcher<T> {
  (actual: T): boolean;
}

export interface StringMatcher extends Matcher<string> {
  description: string;
}

export interface NumberMatcher extends Matcher<number> {
  description: string;
}

export interface ObjectMatcher extends Matcher<any> {
  description: string;
}

export interface ArrayMatcher extends Matcher<any[]> {
  description: string;
}

// ==========================================
// TEMPLATE TYPES
// ==========================================

export interface TemplateContext {
  variables: Record<string, any>;
  environment: Record<string, any>;
  faker: any;
  moment: any;
  uuid: () => string;
  random: {
    int: (min: number, max: number) => number;
    float: (min: number, max: number) => number;
    string: (length?: number) => string;
    boolean: () => boolean;
    uuid: () => string;
  };
}

// ==========================================
// REPORTING TYPES
// ==========================================

export interface ReportingConfig {
  enabled: boolean;
  format: 'html' | 'json' | 'both';
  outputPath: string;
  includeSnapshots?: boolean;
  includePerformanceMetrics?: boolean;
  includeTrends?: boolean;
  autoGenerate?: boolean;
  customTemplate?: string;
}

// Duplicate AuditLogEntry interface removed - using the one defined earlier around line 455

export interface TestReportData {
  metadata: {
    generatedAt: string;
    totalTests: number;
    totalDuration: number;
    framework: string;
    version: string;
  };
  summary: TestSummary;
  testResults: TestResult[];
  performanceMetrics: PerformanceMetrics;
  errorAnalysis: ErrorAnalysis;
  snapshots?: SnapshotSummary[];
  rawData: AuditLogEntry[];
}

export interface TestSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  successRate: number;
  totalDuration: number;
  totalRequests: number;
  averageResponseTime: number;
  statusCodeDistribution: Record<number, number>;
  startTime: Date;
  endTime: Date;
}

// Duplicate TestResult interface removed - using the one defined earlier around line 590

// Duplicate PerformanceMetrics interface removed - using the one defined earlier around line 490

export interface ErrorAnalysis {
  totalErrors: number;
  errorTypes: Record<string, number>;
  errorsByTest: Record<string, number>;
  commonErrors: Array<{
    message: string;
    count: number;
  }>;
}

export interface SnapshotSummary {
  key: string;
  size: number;
  lastModified: Date;
  hasChanges: boolean;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  averageResponseTime: number;
  requestCount: number;
  errorCount: number;
  successRate: number;
}

export interface TrendData {
  runs: Array<{
    runIndex: number;
    timestamp: Date;
    summary: TestSummary;
    performance: PerformanceMetrics;
  }>;
  trends: {
    successRate: TrendDirection;
    averageResponseTime: TrendDirection;
    errorRate: TrendDirection;
    requestsPerSecond: TrendDirection;
  };
}

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

// ==========================================
// CLIENT MANAGEMENT TYPES
// ==========================================

export type ClientType = 'http' | 'graphql' | 'websocket';

export interface ClientInfo {
  name: string;
  type: ClientType;
  active: boolean;
  createdAt: Date;
  lastUsed?: Date;
  requestCount: number;
}

// ==========================================
// EXPORT TYPES
// ==========================================

// Re-export Axios types for convenience
export type { AxiosRequestConfig, AxiosResponse, Method } from 'axios';