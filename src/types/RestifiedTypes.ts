// src/types/RestifiedTypes.ts

/**
 * Core type definitions for RestifiedTS framework
 * Contains all interfaces, types, and error classes used throughout the framework
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
  maxResponses?: number;
  maxVariables?: number;
  persistToDisk?: boolean;
}

export interface SnapshotConfig {
  directory?: string;
  autoCleanup?: boolean;
  maxSnapshots?: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ==========================================
// REQUEST/RESPONSE TYPES
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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'WEBSOCKET';
export type ContentType = string;

// ==========================================
// DSL INTERFACES
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
  getStats(): any;
}

// ==========================================
// AUTHENTICATION TYPES
// ==========================================

export interface AuthProvider {
  authenticate(config: RequestConfig): Promise<RequestConfig>;
  refreshToken?(): Promise<void>;
}

// ==========================================
// GRAPHQL TYPES
// ==========================================

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
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
// LOGGING AND AUDIT TYPES
// ==========================================

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  testName: string;
  request: RequestConfig;
  response: RestifiedResponse;
  duration: number;
  error?: Error;
  metadata?: Record<string, any>;
}

// ==========================================
// PERFORMANCE TYPES
// ==========================================

export interface PerformanceMetrics {
  responseTime: number;
  dnsLookupTime: number;
  tcpConnectTime: number;
  tlsHandshakeTime: number;
  firstByteTime: number;
  downloadTime: number;
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
// ERROR CLASSES
// ==========================================

export class RestifiedError extends Error {
  constructor(
    message: string,
    public readonly response?: RestifiedResponse
  ) {
    super(message);
    this.name = 'RestifiedError';
  }
}

export class AssertionError extends Error {
  constructor(
    message: string,
    public readonly expected: any,
    public readonly actual: any
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError?: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

// ==========================================
// TEST DECORATOR TYPES
// ==========================================

export interface TestMetadata {
  tags: string[];
  timeout?: number;
  retries?: number;
  priority?: number;
  description?: string;
  author?: string;
  issue?: string;
  skipReason?: string;
  dependencies?: string[];
  group?: string;
  environment?: string[];
  feature?: string;
}

export interface TestMethod {
  name: string;
  target: any;
  descriptor: PropertyDescriptor;
  metadata: TestMetadata;
}

// ==========================================
// VALIDATION TYPES
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface JSONParseResult {
  isValid: boolean;
  data: any;
  errors: ParseError[];
}

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface XMLParseResult {
  isValid: boolean;
  document: Document | null;
  errors: ParseError[];
}

export interface XMLValidationResult {
  isValid: boolean;
  errors: XMLValidationError[];
}

export interface XMLValidationError extends ParseError {
  type: string;
}

export interface APIResponseStructure {
  required?: string[];
  fields?: Record<string, FieldSchema>;
}

export interface FieldSchema {
  type: DataType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
}

export interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export type DataType = 
  | 'string' 
  | 'number' 
  | 'integer' 
  | 'boolean' 
  | 'array' 
  | 'object' 
  | 'null' 
  | 'undefined' 
  | 'date' 
  | 'email' 
  | 'url' 
  | 'uuid';

export type DateFormat = 'ISO' | 'US' | 'EU' | 'custom';

// ==========================================
// CLI TYPES
// ==========================================

export interface CLIOptions {
  config?: string;
  tags?: string[];
  timeout?: number;
  parallel?: boolean;
  output?: string;
  verbose?: boolean;
  watch?: boolean;
}

export interface GenerateOptions {
  output: string;
  template?: string;
  openapi?: string;
  interactive?: boolean;
}

// ==========================================
// MOCK SERVER TYPES
// ==========================================

export interface MockEndpoint {
  method: HttpMethod;
  path: string;
  response: MockResponse;
  delay?: number;
  statusCode?: number;
}

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: any;
  file?: string;
}

export interface MockServerConfig {
  port: number;
  host?: string;
  endpoints: MockEndpoint[];
  cors?: boolean;
  logging?: boolean;
}

// ==========================================
// FILE UPLOAD TYPES
// ==========================================

export interface FileUploadOptions {
  field: string;
  filename: string;
  contentType?: string;
  encoding?: string;
}

export interface MultipartFormData {
  fields: Record<string, string>;
  files: FileUpload[];
}

export interface FileUpload {
  field: string;
  filename: string;
  content: Buffer;
  contentType: string;
}

// ==========================================
// REPORTING TYPES
// ==========================================

export interface ReportData {
  summary: TestSummary;
  tests: TestResult[];
  performance: PerformanceMetrics;
  errors: ErrorSummary[];
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  successRate: number;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  assertions: number;
}

export interface ErrorSummary {
  type: string;
  count: number;
  percentage: number;
  examples: string[];
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Awaitable<T> = T | Promise<T>;

export type Constructor<T = {}> = new (...args: any[]) => T;

export type AnyFunction = (...args: any[]) => any;

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

// ==========================================
// CONSTANTS
// ==========================================

export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY = 1000;
export const DEFAULT_MAX_REDIRECTS = 5;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;

export const CONTENT_TYPES = {
  JSON: 'application/json',
  XML: 'application/xml',
  HTML: 'text/html',
  PLAIN: 'text/plain',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data'
} as const;