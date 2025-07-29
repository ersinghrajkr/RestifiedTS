/**
 * Interceptor Types for RestifiedTS
 * 
 * This module defines the core types and interfaces for request/response
 * interception, plugins, and middleware functionality.
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { RestifiedResponse } from '../types/RestifiedTypes';

/**
 * Interceptor execution phase
 */
export enum InterceptorPhase {
  REQUEST = 'request',
  RESPONSE = 'response',
  ERROR = 'error',
  BEFORE_REQUEST = 'beforeRequest',
  AFTER_RESPONSE = 'afterResponse'
}

/**
 * Interceptor priority levels
 */
export enum InterceptorPriority {
  HIGHEST = 1000,
  HIGH = 750,
  NORMAL = 500,
  LOW = 250,
  LOWEST = 0
}

/**
 * Interceptor context
 */
export interface InterceptorContext {
  requestId: string;
  timestamp: Date;
  phase: InterceptorPhase;
  attempt: number;
  metadata: Record<string, any>;
  variables: Record<string, any>;
  config: any;
}

/**
 * Request interceptor interface
 */
export interface RequestInterceptor {
  name: string;
  priority: InterceptorPriority;
  enabled: boolean;
  description?: string;
  phase: InterceptorPhase.REQUEST | InterceptorPhase.BEFORE_REQUEST;
  execute: (
    config: AxiosRequestConfig,
    context: InterceptorContext
  ) => Promise<AxiosRequestConfig> | AxiosRequestConfig;
  onError?: (error: any, context: InterceptorContext) => Promise<any> | any;
}

/**
 * Response interceptor interface
 */
export interface ResponseInterceptor {
  name: string;
  priority: InterceptorPriority;
  enabled: boolean;
  description?: string;
  phase: InterceptorPhase.RESPONSE | InterceptorPhase.AFTER_RESPONSE;
  execute: (
    response: AxiosResponse,
    context: InterceptorContext
  ) => Promise<AxiosResponse> | AxiosResponse;
  onError?: (error: any, context: InterceptorContext) => Promise<any> | any;
}

/**
 * Error interceptor interface
 */
export interface ErrorInterceptor {
  name: string;
  priority: InterceptorPriority;
  enabled: boolean;
  description?: string;
  phase: InterceptorPhase.ERROR;
  execute: (
    error: any,
    context: InterceptorContext
  ) => Promise<any> | any;
  shouldHandle?: (error: any, context: InterceptorContext) => boolean;
}

/**
 * Generic interceptor type
 */
export type Interceptor = RequestInterceptor | ResponseInterceptor | ErrorInterceptor;

/**
 * Interceptor configuration
 */
export interface InterceptorConfig {
  enabled: boolean;
  priority: InterceptorPriority;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  skipOnError: boolean;
  preserveOrder: boolean;
  allowDuplicates: boolean;
}

/**
 * Interceptor execution result
 */
export interface InterceptorResult {
  success: boolean;
  interceptorName: string;
  phase: InterceptorPhase;
  executionTime: number;
  error?: any;
  skipped: boolean;
  modified: boolean;
  metadata: Record<string, any>;
}

/**
 * Interceptor chain result
 */
export interface InterceptorChainResult {
  success: boolean;
  totalExecutionTime: number;
  results: InterceptorResult[];
  finalData: any;
  errors: any[];
  skippedCount: number;
  modifiedCount: number;
}

/**
 * Plugin interface
 */
export interface RestifiedPlugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  enabled?: boolean;
  priority?: InterceptorPriority;
  
  // Plugin lifecycle hooks
  initialize?: (context: PluginContext) => Promise<void> | void;
  configure?: (config: any) => Promise<void> | void;
  activate?: () => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
  cleanup?: () => Promise<void> | void;
  destroy?: () => Promise<void> | void;
  
  // Interceptors provided by the plugin
  interceptors?: Interceptor[];
  
  // Plugin-specific configuration
  config?: Record<string, any>;
  
  // Plugin capabilities
  capabilities?: PluginCapability[];
  
  // Health check
  healthCheck?: () => Promise<PluginHealthStatus> | PluginHealthStatus;
}

/**
 * Plugin context
 */
export interface PluginContext {
  pluginName: string;
  restifiedVersion: string;
  environment: string;
  logger: any;
  config: any;
  services: PluginServices;
}

/**
 * Plugin services available to plugins
 */
export interface PluginServices {
  httpClient: any;
  variableStore: any;
  responseStore: any;
  assertionManager: any;
  logger: any;
  config: any;
  registerInterceptor?: (interceptor: any) => void;
}

/**
 * Plugin capabilities
 */
export enum PluginCapability {
  REQUEST_INTERCEPTION = 'requestInterception',
  RESPONSE_INTERCEPTION = 'responseInterception',
  ERROR_HANDLING = 'errorHandling',
  VARIABLE_MANIPULATION = 'variableManipulation',
  ASSERTION_ENHANCEMENT = 'assertionEnhancement',
  REPORTING = 'reporting',
  AUTHENTICATION = 'authentication',
  CACHING = 'caching',
  LOGGING = 'logging',
  MONITORING = 'monitoring',
  DATA_TRANSFORMATION = 'dataTransformation'
}

/**
 * Plugin health status
 */
export interface PluginHealthStatus {
  healthy: boolean;
  message?: string;
  details?: Record<string, any>;
  lastChecked: Date;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  plugin: RestifiedPlugin;
  context: PluginContext;
  status: PluginStatus;
  healthStatus?: PluginHealthStatus;
  loadTime: Date;
  statistics: PluginStatistics;
}

/**
 * Plugin status
 */
export enum PluginStatus {
  LOADING = 'loading',
  LOADED = 'loaded',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  UNLOADED = 'unloaded'
}

/**
 * Plugin statistics
 */
export interface PluginStatistics {
  interceptorExecutions: number;
  totalExecutionTime: number;
  errorCount: number;
  successCount: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
}

/**
 * Plugin manager configuration
 */
export interface PluginManagerConfig {
  autoLoadPlugins: boolean;
  pluginTimeout: number;
  maxConcurrentPlugins: number;
  healthCheckInterval: number;
  enableStatistics: boolean;
  allowDynamicLoading: boolean;
  pluginDirectory?: string;
  defaultPriority: InterceptorPriority;
}

/**
 * Interceptor manager events
 */
export interface InterceptorManagerEvents {
  'interceptor:registered': (interceptor: Interceptor) => void;
  'interceptor:unregistered': (name: string) => void;
  'interceptor:executed': (result: InterceptorResult) => void;
  'interceptor:error': (error: any, interceptor: Interceptor) => void;
  'chain:started': (phase: InterceptorPhase, context: InterceptorContext) => void;
  'chain:completed': (result: InterceptorChainResult) => void;
  'chain:error': (error: any, phase: InterceptorPhase) => void;
}

/**
 * Plugin manager events
 */
export interface PluginManagerEvents {
  'plugin:loading': (name: string) => void;
  'plugin:loaded': (plugin: RestifiedPlugin) => void;
  'plugin:activated': (name: string) => void;
  'plugin:deactivated': (name: string) => void;
  'plugin:error': (name: string, error: any) => void;
  'plugin:health:changed': (name: string, status: PluginHealthStatus) => void;
}

/**
 * Request transformation options
 */
export interface RequestTransformOptions {
  preserveOriginal: boolean;
  allowNullValues: boolean;
  deepMerge: boolean;
  customTransformers: Record<string, (value: any) => any>;
}

/**
 * Response transformation options
 */
export interface ResponseTransformOptions {
  preserveOriginal: boolean;
  transformData: boolean;
  transformHeaders: boolean;
  customTransformers: Record<string, (value: any) => any>;
}

/**
 * Interceptor middleware function
 */
export type InterceptorMiddleware = (
  data: any,
  context: InterceptorContext,
  next: () => Promise<any>
) => Promise<any>;

/**
 * Plugin loader interface
 */
export interface PluginLoader {
  load: (pluginPath: string) => Promise<RestifiedPlugin>;
  unload: (pluginName: string) => Promise<void>;
  reload: (pluginName: string) => Promise<RestifiedPlugin>;
  validate: (plugin: RestifiedPlugin) => Promise<boolean>;
  getDependencies: (plugin: RestifiedPlugin) => Promise<string[]>;
}

/**
 * Interceptor chain configuration
 */
export interface InterceptorChainConfig {
  phase: InterceptorPhase;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  skipOnError: boolean;
  preserveOrder: boolean;
  enableMetrics: boolean;
}

/**
 * Built-in interceptor types
 */
export enum BuiltInInterceptorType {
  AUTHENTICATION = 'authentication',
  RATE_LIMITING = 'rateLimiting',
  RETRY = 'retry',
  TIMEOUT = 'timeout',
  LOGGING = 'logging',
  CACHING = 'caching',
  COMPRESSION = 'compression',
  USER_AGENT = 'userAgent',
  CORS = 'cors',
  VALIDATION = 'validation',
  TRANSFORMATION = 'transformation',
  MONITORING = 'monitoring'
}

/**
 * Interceptor factory function
 */
export type InterceptorFactory<T extends Interceptor> = (
  config: any,
  context: InterceptorContext
) => T;

/**
 * Plugin factory function
 */
export type PluginFactory = (
  config: any,
  context: PluginContext
) => RestifiedPlugin;

export default {
  InterceptorPhase,
  InterceptorPriority,
  PluginCapability,
  PluginStatus,
  BuiltInInterceptorType
};