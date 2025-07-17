/**
 * Assertion Manager for RestifiedTS
 * 
 * This module provides centralized management of assertion utilities,
 * including response assertions, schema validation, and custom matchers.
 */

import { AssertionEngine } from './AssertionEngine';
import { ResponseAssertions } from './ResponseAssertions';
import { SchemaValidator } from './SchemaValidator';
import { 
  AssertionResult, 
  AssertionReport, 
  AssertionConfig, 
  AssertionPlugin,
  AssertionMatcher,
  ValidationResult,
  BatchAssertion,
  JsonPathAssertion,
  XmlPathAssertion,
  HeaderAssertion,
  StatusCodeAssertion,
  ContentTypeAssertion,
  CookieAssertion,
  ResponseTimeAssertion,
  AssertionSeverity
} from './AssertionTypes';
import { RestifiedResponse } from '../types/RestifiedTypes';
import { EventEmitter } from 'events';

/**
 * Assertion manager events
 */
interface AssertionManagerEvents {
  'assertion:executed': (result: AssertionResult) => void;
  'assertion:batch:completed': (results: AssertionResult[]) => void;
  'validation:completed': (result: ValidationResult) => void;
  'plugin:registered': (plugin: AssertionPlugin) => void;
  'plugin:unregistered': (pluginName: string) => void;
  'matcher:added': (matcher: AssertionMatcher) => void;
  'report:generated': (report: AssertionReport) => void;
}

/**
 * Centralized assertion manager
 */
export class AssertionManager extends EventEmitter {
  private engine: AssertionEngine;
  private schemaValidator: SchemaValidator;
  private config: AssertionConfig;
  private plugins: Map<string, AssertionPlugin> = new Map();
  private responseAssertions?: ResponseAssertions;

  constructor(config: Partial<AssertionConfig> = {}) {
    super();
    
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      failFast: false,
      collectAllErrors: true,
      severity: AssertionSeverity.ERROR,
      customMatchers: {},
      schemaValidation: {
        strict: true,
        allowUnknownProperties: false,
        errorLimit: 100
      },
      responseAssertion: {
        ignoreCase: false,
        ignoreWhitespace: false,
        timeout: 5000
      },
      ...config
    };

    this.engine = new AssertionEngine(this.config);
    this.schemaValidator = new SchemaValidator(this.config.schemaValidation);
    
    this.setupEventListeners();
  }

  /**
   * Initialize response assertions for a specific response
   */
  forResponse(response: RestifiedResponse): ResponseAssertions {
    this.responseAssertions = new ResponseAssertions(response, this.engine);
    return this.responseAssertions;
  }

  /**
   * Execute a batch of assertions
   */
  async executeBatch(batch: BatchAssertion, response?: RestifiedResponse): Promise<AssertionResult[]> {
    const results: AssertionResult[] = [];
    const targetResponse = response || this.responseAssertions?.['response'];
    
    if (!targetResponse) {
      throw new Error('No response provided for batch assertion execution');
    }

    const responseAssertions = this.forResponse(targetResponse);
    
    for (const assertion of batch.assertions) {
      try {
        let result: AssertionResult;
        
        switch (assertion.type) {
          case 'jsonPath':
            result = await responseAssertions.assertJsonPath(assertion.assertion as JsonPathAssertion);
            break;
          case 'xmlPath':
            result = await responseAssertions.assertXmlPath(assertion.assertion as XmlPathAssertion);
            break;
          case 'header':
            result = await responseAssertions.assertHeader(assertion.assertion as HeaderAssertion);
            break;
          case 'statusCode':
            result = await responseAssertions.assertStatusCode(assertion.assertion as unknown as number | number[]);
            break;
          case 'contentType':
            result = await responseAssertions.assertContentType(assertion.assertion as ContentTypeAssertion);
            break;
          case 'cookie':
            result = await responseAssertions.assertCookie(assertion.assertion as CookieAssertion);
            break;
          case 'responseTime':
            result = await responseAssertions.assertResponseTime(assertion.assertion as ResponseTimeAssertion);
            break;
          case 'custom':
            result = await this.engine.assert('custom', undefined, undefined, assertion.assertion);
            break;
          default:
            result = {
              success: false,
              message: `Unknown assertion type: ${assertion.type}`,
              timestamp: new Date()
            };
        }
        
        results.push(result);
        this.emit('assertion:executed', result);
        
        // Stop on first failure if continueOnFailure is false
        if (!result.success && !batch.continueOnFailure) {
          break;
        }
        
      } catch (error) {
        const result: AssertionResult = {
          success: false,
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        };
        
        results.push(result);
        this.emit('assertion:executed', result);
        
        if (!batch.continueOnFailure) {
          break;
        }
      }
    }
    
    this.emit('assertion:batch:completed', results);
    return results;
  }

  /**
   * Validate data against schema
   */
  async validateSchema(data: any, schema: any, type: 'json' | 'joi' | 'openapi' = 'json', statusCode?: number): Promise<ValidationResult> {
    let result: ValidationResult;
    
    switch (type) {
      case 'joi':
        result = await this.schemaValidator.validateJoiSchema(data, schema);
        break;
      case 'openapi':
        if (statusCode === undefined) {
          throw new Error('Status code is required for OpenAPI validation');
        }
        result = await this.schemaValidator.validateOpenApiResponse(data, schema, statusCode);
        break;
      case 'json':
      default:
        result = await this.schemaValidator.validateJsonSchema(data, schema);
        break;
    }
    
    this.emit('validation:completed', result);
    return result;
  }

  /**
   * Validate array of objects
   */
  async validateArray(data: any[], itemSchema: any, schemaType: 'json' | 'joi' = 'json'): Promise<ValidationResult> {
    const result = await this.schemaValidator.validateArray(data, itemSchema, schemaType);
    this.emit('validation:completed', result);
    return result;
  }

  /**
   * Register assertion plugin
   */
  registerPlugin(plugin: AssertionPlugin): void {
    this.plugins.set(plugin.name, plugin);
    this.engine.registerPlugin(plugin);
    this.emit('plugin:registered', plugin);
  }

  /**
   * Unregister assertion plugin
   */
  unregisterPlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }
    
    this.plugins.delete(name);
    this.engine.unregisterPlugin(name);
    this.emit('plugin:unregistered', name);
    return true;
  }

  /**
   * Add custom matcher
   */
  addMatcher(matcher: AssertionMatcher): void {
    this.engine.addMatcher(matcher);
    this.emit('matcher:added', matcher);
  }

  /**
   * Add custom schema format
   */
  addSchemaFormat(name: string, validator: (value: any) => boolean): void {
    this.schemaValidator.addCustomFormat(name, validator);
  }

  /**
   * Create assertion report
   */
  generateReport(): AssertionReport {
    const report = this.engine.getReport();
    this.emit('report:generated', report);
    return report;
  }

  /**
   * Get assertion statistics
   */
  getStatistics(): {
    totalAssertions: number;
    successRate: number;
    averageExecutionTime: number;
    failureRate: number;
    pluginCount: number;
    matcherCount: number;
  } {
    const report = this.engine.getReport();
    
    return {
      totalAssertions: report.totalAssertions,
      successRate: report.summary.successRate,
      averageExecutionTime: report.totalAssertions > 0 ? report.executionTime / report.totalAssertions : 0,
      failureRate: report.totalAssertions > 0 ? (report.failedAssertions / report.totalAssertions) * 100 : 0,
      pluginCount: this.plugins.size,
      matcherCount: this.engine.getMatchers().length
    };
  }

  /**
   * Reset assertion state
   */
  reset(): void {
    this.engine.reset();
    this.responseAssertions = undefined;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AssertionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.engine.updateConfig(this.config);
    this.schemaValidator.updateOptions(this.config.schemaValidation || {});
  }

  /**
   * Get current configuration
   */
  getConfig(): AssertionConfig {
    return { ...this.config };
  }

  /**
   * Get available plugins
   */
  getPlugins(): AssertionPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get available matchers
   */
  getMatchers(): AssertionMatcher[] {
    return this.engine.getMatchers();
  }

  /**
   * Get assertion engine
   */
  getEngine(): AssertionEngine {
    return this.engine;
  }

  /**
   * Get schema validator
   */
  getSchemaValidator(): SchemaValidator {
    return this.schemaValidator;
  }

  /**
   * Create fluent assertion builder
   */
  expect(actual: any): AssertionBuilder {
    return new AssertionBuilder(actual, this.engine);
  }

  /**
   * Create batch assertion builder
   */
  batch(name: string): BatchAssertionBuilder {
    return new BatchAssertionBuilder(name, this);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.engine.on('assertion', (result: AssertionResult) => {
      this.emit('assertion:executed', result);
    });
    
    this.engine.on('plugin:registered', (plugin: AssertionPlugin) => {
      this.emit('plugin:registered', plugin);
    });
    
    this.engine.on('plugin:unregistered', (pluginName: string) => {
      this.emit('plugin:unregistered', pluginName);
    });
    
    this.engine.on('matcher:added', (matcher: AssertionMatcher) => {
      this.emit('matcher:added', matcher);
    });
  }
}

/**
 * Fluent assertion builder
 */
export class AssertionBuilder {
  constructor(private actual: any, private engine: AssertionEngine) {}

  async toEqual(expected: any): Promise<AssertionResult> {
    return this.engine.assert('equals', this.actual, expected);
  }

  async toNotEqual(expected: any): Promise<AssertionResult> {
    return this.engine.assert('notEquals', this.actual, expected);
  }

  async toContain(expected: any): Promise<AssertionResult> {
    return this.engine.assert('contains', this.actual, expected);
  }

  async toMatch(pattern: string | RegExp): Promise<AssertionResult> {
    return this.engine.assert('matches', this.actual, pattern);
  }

  async toBeNull(): Promise<AssertionResult> {
    return this.engine.assert('isNull', this.actual);
  }

  async toBeEmpty(): Promise<AssertionResult> {
    return this.engine.assert('isEmpty', this.actual);
  }

  async toHaveLength(expected: number): Promise<AssertionResult> {
    return this.engine.assert('hasLength', this.actual, expected);
  }

  async toHaveProperty(property: string): Promise<AssertionResult> {
    return this.engine.assert('hasProperty', this.actual, property);
  }

  async toBeOfType(type: string): Promise<AssertionResult> {
    return this.engine.assert('hasType', this.actual, type);
  }

  async toBeGreaterThan(expected: number): Promise<AssertionResult> {
    return this.engine.assert('greaterThan', this.actual, expected);
  }

  async toBeLessThan(expected: number): Promise<AssertionResult> {
    return this.engine.assert('lessThan', this.actual, expected);
  }
}

/**
 * Batch assertion builder
 */
export class BatchAssertionBuilder {
  private assertions: BatchAssertion['assertions'] = [];

  constructor(private name: string, private manager: AssertionManager) {}

  jsonPath(path: string, type: any, expected?: any): BatchAssertionBuilder {
    this.assertions.push({
      type: 'jsonPath',
      assertion: { path, type, expected }
    });
    return this;
  }

  header(name: string, type: any, expected?: any): BatchAssertionBuilder {
    this.assertions.push({
      type: 'header',
      assertion: { name, type, expected }
    });
    return this;
  }

  statusCode(code: number | number[]): BatchAssertionBuilder {
    this.assertions.push({
      type: 'statusCode',
      assertion: code as any
    });
    return this;
  }

  contentType(type: string, charset?: string): BatchAssertionBuilder {
    this.assertions.push({
      type: 'contentType',
      assertion: { type, charset }
    });
    return this;
  }

  responseTime(maxTime: number, unit: 'ms' | 's' | 'min' = 'ms'): BatchAssertionBuilder {
    this.assertions.push({
      type: 'responseTime',
      assertion: { maxTime, unit }
    });
    return this;
  }

  async execute(response: RestifiedResponse, continueOnFailure: boolean = true): Promise<AssertionResult[]> {
    const batch: BatchAssertion = {
      name: this.name,
      assertions: this.assertions,
      continueOnFailure
    };
    
    return this.manager.executeBatch(batch, response);
  }
}

export default AssertionManager;