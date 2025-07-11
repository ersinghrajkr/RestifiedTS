// src/types/RestifiedTypes.ts

export interface RestifiedConfig {
  baseURL: string;
  timeout: number;
  retryConfig: RetryConfig;
  logging: LoggingConfig;
  reporting: ReportingConfig;
  auth?: AuthConfig;
  proxy?: ProxyConfig;
  ssl?: SSLConfig;
}

export interface RetryConfig {
  maxRetries: number;
  backoffFactor: number;
  retryDelay: number;
  retryStatusCodes: number[];
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
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

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
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

export interface SnapshotDiff {
  hasDifferences: boolean;
  added: any[];
  removed: any[];
  modified: any[];
}

export interface TestMetadata {
  tags: string[];
  description?: string;
  timeout?: number;
  retries?: number;
}

export interface VariableScope {
  global: Map<string, any>;
  local: Map<string, any>;
}

export interface InterceptorConfig {
  request?: Array<(config: RequestConfig) => RequestConfig | Promise<RequestConfig>>;
  response?: Array<(response: RestifiedResponse) => RestifiedResponse | Promise<RestifiedResponse>>;
}

export interface PerformanceMetrics {
  responseTime: number;
  dnsLookupTime: number;
  tcpConnectTime: number;
  tlsHandshakeTime: number;
  firstByteTime: number;
  downloadTime: number;
}

export interface AuditLogEntry {
  timestamp: Date;
  testName: string;
  request: RequestConfig;
  response: RestifiedResponse;
  error?: Error;
  duration: number;
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type ContentType = 'application/json' | 'application/xml' | 'text/plain' | 'multipart/form-data';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// DSL Step interfaces
export interface IGivenStep {
  baseURL(url: string): IGivenStep;
  header(key: string, value: string): IGivenStep;
  headers(headers: Record<string, string>): IGivenStep;
  auth(provider: AuthProvider): IGivenStep;
  timeout(ms: number): IGivenStep;
  variable(key: string, value: any): IGivenStep;
  variables(vars: Record<string, any>): IGivenStep;
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
  graphql(query: GraphQLRequest): IWhenStep;
  websocket(config: WebSocketConfig): IWhenStep;
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
}

export interface AuthProvider {
  authenticate(config: RequestConfig): Promise<RequestConfig>;
  refreshToken?(): Promise<void>;
}

export interface RestifiedPlugin {
  name: string;
  version: string;
  initialize(restified: RestifiedTS): void;
  beforeRequest?(config: RequestConfig): void | Promise<void>;
  afterResponse?(response: RestifiedResponse): void | Promise<void>;
  onError?(error: Error): void | Promise<void>;
}

// Custom error types
export class RestifiedError extends Error {
  constructor(message: string, public response?: RestifiedResponse) {
    super(message);
    this.name = 'RestifiedError';
  }
}

export class AssertionError extends RestifiedError {
  constructor(message: string, public expected: any, public actual: any) {
    super(message);
    this.name = 'AssertionError';
  }
}

export class TimeoutError extends RestifiedError {
  constructor(message: string, public timeout: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RetryError extends RestifiedError {
  constructor(message: string, public attempts: number) {
    super(message);
    this.name = 'RetryError';
  }
}

// Re-export for convenience
export { RestifiedTS } from '../core/dsl/RestifiedTS';
export { smoke, regression, tag } from '../decorators/TestTags';
export { expect } from '../assertions/ChaiExtensions';