/**
 * Assertion Types for RestifiedTS
 * 
 * This module defines the core types and interfaces for assertion and validation
 * utilities used throughout the RestifiedTS testing framework.
 */

import { RestifiedResponse } from '../types/RestifiedTypes';

/**
 * Assertion result interface
 */
export interface AssertionResult {
  success: boolean;
  message: string;
  actual?: any;
  expected?: any;
  timestamp: Date;
  path?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: Date;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  rule?: string;
  severity: 'error' | 'warning';
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
  rule?: string;
}

/**
 * JSON Schema validation options
 */
export interface SchemaValidationOptions {
  strict?: boolean;
  allowUnknownProperties?: boolean;
  customFormats?: Record<string, (value: any) => boolean>;
  errorLimit?: number;
}

/**
 * Response assertion options
 */
export interface ResponseAssertionOptions {
  ignoreCase?: boolean;
  ignoreWhitespace?: boolean;
  timeout?: number;
  customMatchers?: Record<string, (actual: any, expected: any) => boolean>;
}

/**
 * Custom assertion function type
 */
export type CustomAssertion<T = any> = (actual: T, expected?: T, options?: any) => AssertionResult;

/**
 * Assertion severity levels
 */
export enum AssertionSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Assertion types for different data formats
 */
export enum AssertionType {
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  MATCHES = 'matches',
  NOT_MATCHES = 'notMatches',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
  LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',
  HAS_LENGTH = 'hasLength',
  HAS_PROPERTY = 'hasProperty',
  HAS_TYPE = 'hasType',
  IS_ARRAY = 'isArray',
  IS_OBJECT = 'isObject',
  IS_STRING = 'isString',
  IS_NUMBER = 'isNumber',
  IS_BOOLEAN = 'isBoolean',
  IS_DATE = 'isDate',
  IS_VALID_EMAIL = 'isValidEmail',
  IS_VALID_URL = 'isValidUrl',
  IS_VALID_UUID = 'isValidUuid',
  IS_VALID_JSON = 'isValidJson',
  IS_VALID_XML = 'isValidXml'
}

/**
 * JSON Path assertion interface
 */
export interface JsonPathAssertion {
  path: string;
  type: AssertionType;
  expected?: any;
  options?: ResponseAssertionOptions;
}

/**
 * XML Path assertion interface
 */
export interface XmlPathAssertion {
  xpath: string;
  type: AssertionType;
  expected?: any;
  options?: ResponseAssertionOptions;
}

/**
 * Response time assertion interface
 */
export interface ResponseTimeAssertion {
  maxTime: number;
  unit: 'ms' | 's' | 'min';
  tolerance?: number;
}

/**
 * Header assertion interface
 */
export interface HeaderAssertion {
  name: string;
  type: AssertionType;
  expected?: any;
  options?: ResponseAssertionOptions;
}

/**
 * Status code assertion interface
 */
export interface StatusCodeAssertion {
  code: number | number[];
  allowedRange?: [number, number];
}

/**
 * Content type assertion interface
 */
export interface ContentTypeAssertion {
  type: string;
  charset?: string;
  boundary?: string;
}

/**
 * Cookie assertion interface
 */
export interface CookieAssertion {
  name: string;
  value?: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  expires?: Date;
}

/**
 * File assertion interface for multipart responses
 */
export interface FileAssertion {
  filename?: string;
  mimetype?: string;
  size?: number;
  minSize?: number;
  maxSize?: number;
  content?: string | Buffer;
  encoding?: string;
}

/**
 * Batch assertion interface
 */
export interface BatchAssertion {
  name: string;
  assertions: Array<{
    type: 'jsonPath' | 'xmlPath' | 'header' | 'statusCode' | 'contentType' | 'cookie' | 'responseTime' | 'custom';
    assertion: JsonPathAssertion | XmlPathAssertion | HeaderAssertion | StatusCodeAssertion | ContentTypeAssertion | CookieAssertion | ResponseTimeAssertion | CustomAssertion;
  }>;
  continueOnFailure?: boolean;
}

/**
 * Assertion context for maintaining state across assertions
 */
export interface AssertionContext {
  response: RestifiedResponse;
  variables: Record<string, any>;
  previousAssertions: AssertionResult[];
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

/**
 * Assertion report interface
 */
export interface AssertionReport {
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  warningAssertions: number;
  executionTime: number;
  results: AssertionResult[];
  context: AssertionContext;
  summary: {
    successRate: number;
    criticalFailures: number;
    performanceIssues: number;
  };
}

/**
 * Assertion configuration interface
 */
export interface AssertionConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  failFast: boolean;
  collectAllErrors: boolean;
  severity: AssertionSeverity;
  customMatchers: Record<string, CustomAssertion>;
  schemaValidation: SchemaValidationOptions;
  responseAssertion: ResponseAssertionOptions;
}

/**
 * Assertion matcher interface
 */
export interface AssertionMatcher {
  name: string;
  description: string;
  match: (actual: any, expected: any, options?: any) => AssertionResult;
  supportedTypes: string[];
  examples: Array<{
    actual: any;
    expected: any;
    result: boolean;
  }>;
}

/**
 * Assertion plugin interface
 */
export interface AssertionPlugin {
  name: string;
  version: string;
  description: string;
  matchers: AssertionMatcher[];
  validators: Array<{
    name: string;
    validate: (value: any, options?: any) => ValidationResult;
  }>;
  initialize?: (config: AssertionConfig) => void;
  cleanup?: () => void;
}

// Export for CommonJS compatibility
export default {
  AssertionSeverity,
  AssertionType
};