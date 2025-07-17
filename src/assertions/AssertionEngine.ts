/**
 * Assertion Engine for RestifiedTS
 * 
 * This module provides the core assertion engine that handles assertion execution,
 * validation, and reporting with support for custom matchers and plugins.
 */

import { 
  AssertionResult, 
  AssertionReport, 
  AssertionContext, 
  AssertionConfig, 
  AssertionMatcher, 
  AssertionPlugin,
  CustomAssertion,
  AssertionSeverity,
  AssertionType
} from './AssertionTypes';
import { RestifiedResponse } from '../types/RestifiedTypes';
import { EventEmitter } from 'events';

/**
 * Core assertion engine class
 */
export class AssertionEngine extends EventEmitter {
  private config: AssertionConfig;
  private matchers: Map<string, AssertionMatcher> = new Map();
  private plugins: Map<string, AssertionPlugin> = new Map();
  private context?: AssertionContext;
  private results: AssertionResult[] = [];

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

    this.initializeDefaultMatchers();
  }

  /**
   * Set assertion context
   */
  setContext(response: RestifiedResponse, variables: Record<string, any> = {}): void {
    this.context = {
      response,
      variables,
      previousAssertions: [...this.results],
      startTime: new Date(),
      metadata: {}
    };
  }

  /**
   * Execute a single assertion
   */
  async assert(
    type: AssertionType | string,
    actual: any,
    expected?: any,
    options?: any
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    
    try {
      let result: AssertionResult;

      if (this.matchers.has(type)) {
        const matcher = this.matchers.get(type)!;
        result = matcher.match(actual, expected, options);
      } else {
        result = this.executeBuiltInAssertion(type as AssertionType, actual, expected, options);
      }

      result.timestamp = new Date();
      this.results.push(result);

      // Emit events
      this.emit('assertion', result);
      if (result.success) {
        this.emit('assertion:success', result);
      } else {
        this.emit('assertion:failure', result);
        if (this.config.failFast) {
          throw new Error(`Assertion failed: ${result.message}`);
        }
      }

      return result;

    } catch (error) {
      const result: AssertionResult = {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        actual,
        expected,
        timestamp: new Date()
      };

      this.results.push(result);
      this.emit('assertion:error', result);
      return result;
    }
  }

  /**
   * Execute multiple assertions in batch
   */
  async assertBatch(assertions: Array<{
    type: AssertionType | string;
    actual: any;
    expected?: any;
    options?: any;
  }>): Promise<AssertionResult[]> {
    const results: AssertionResult[] = [];
    
    for (const assertion of assertions) {
      try {
        const result = await this.assert(
          assertion.type,
          assertion.actual,
          assertion.expected,
          assertion.options
        );
        results.push(result);
        
        if (!result.success && this.config.failFast) {
          break;
        }
      } catch (error) {
        if (this.config.failFast) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Execute assertion with retry logic
   */
  async assertWithRetry(
    type: AssertionType | string,
    actual: any,
    expected?: any,
    options?: any
  ): Promise<AssertionResult> {
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < this.config.retryAttempts) {
      try {
        const result = await this.assert(type, actual, expected, options);
        if (result.success) {
          return result;
        }
        lastError = new Error(result.message);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      attempts++;
      if (attempts < this.config.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }

    throw lastError || new Error('Assertion failed after retries');
  }

  /**
   * Add custom matcher
   */
  addMatcher(matcher: AssertionMatcher): void {
    this.matchers.set(matcher.name, matcher);
    this.emit('matcher:added', matcher);
  }

  /**
   * Remove custom matcher
   */
  removeMatcher(name: string): boolean {
    const result = this.matchers.delete(name);
    if (result) {
      this.emit('matcher:removed', name);
    }
    return result;
  }

  /**
   * Register plugin
   */
  registerPlugin(plugin: AssertionPlugin): void {
    this.plugins.set(plugin.name, plugin);
    
    // Add plugin matchers
    plugin.matchers.forEach(matcher => {
      this.addMatcher(matcher);
    });

    // Initialize plugin
    if (plugin.initialize) {
      plugin.initialize(this.config);
    }

    this.emit('plugin:registered', plugin);
  }

  /**
   * Unregister plugin
   */
  unregisterPlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }

    // Remove plugin matchers
    plugin.matchers.forEach(matcher => {
      this.removeMatcher(matcher.name);
    });

    // Cleanup plugin
    if (plugin.cleanup) {
      plugin.cleanup();
    }

    this.plugins.delete(name);
    this.emit('plugin:unregistered', name);
    return true;
  }

  /**
   * Get assertion report
   */
  getReport(): AssertionReport {
    const totalAssertions = this.results.length;
    const passedAssertions = this.results.filter(r => r.success).length;
    const failedAssertions = totalAssertions - passedAssertions;
    const warningAssertions = 0; // TODO: Implement warning detection

    const endTime = new Date();
    const executionTime = this.context 
      ? endTime.getTime() - this.context.startTime.getTime()
      : 0;

    if (this.context) {
      this.context.endTime = endTime;
    }

    return {
      totalAssertions,
      passedAssertions,
      failedAssertions,
      warningAssertions,
      executionTime,
      results: [...this.results],
      context: this.context!,
      summary: {
        successRate: totalAssertions > 0 ? (passedAssertions / totalAssertions) * 100 : 0,
        criticalFailures: failedAssertions,
        performanceIssues: 0 // TODO: Implement performance issue detection
      }
    };
  }

  /**
   * Clear results and reset context
   */
  reset(): void {
    this.results = [];
    this.context = undefined;
    this.emit('reset');
  }

  /**
   * Get available matchers
   */
  getMatchers(): AssertionMatcher[] {
    return Array.from(this.matchers.values());
  }

  /**
   * Get registered plugins
   */
  getPlugins(): AssertionPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AssertionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config:updated', this.config);
  }

  /**
   * Execute built-in assertion
   */
  private executeBuiltInAssertion(
    type: AssertionType,
    actual: any,
    expected?: any,
    options?: any
  ): AssertionResult {
    switch (type) {
      case AssertionType.EQUALS:
        return this.assertEqual(actual, expected, options);
      
      case AssertionType.NOT_EQUALS:
        return this.assertNotEqual(actual, expected, options);
      
      case AssertionType.CONTAINS:
        return this.assertContains(actual, expected, options);
      
      case AssertionType.NOT_CONTAINS:
        return this.assertNotContains(actual, expected, options);
      
      case AssertionType.MATCHES:
        return this.assertMatches(actual, expected, options);
      
      case AssertionType.NOT_MATCHES:
        return this.assertNotMatches(actual, expected, options);
      
      case AssertionType.GREATER_THAN:
        return this.assertGreaterThan(actual, expected, options);
      
      case AssertionType.LESS_THAN:
        return this.assertLessThan(actual, expected, options);
      
      case AssertionType.GREATER_THAN_OR_EQUAL:
        return this.assertGreaterThanOrEqual(actual, expected, options);
      
      case AssertionType.LESS_THAN_OR_EQUAL:
        return this.assertLessThanOrEqual(actual, expected, options);
      
      case AssertionType.IS_NULL:
        return this.assertIsNull(actual, options);
      
      case AssertionType.IS_NOT_NULL:
        return this.assertIsNotNull(actual, options);
      
      case AssertionType.IS_EMPTY:
        return this.assertIsEmpty(actual, options);
      
      case AssertionType.IS_NOT_EMPTY:
        return this.assertIsNotEmpty(actual, options);
      
      case AssertionType.HAS_LENGTH:
        return this.assertHasLength(actual, expected, options);
      
      case AssertionType.HAS_PROPERTY:
        return this.assertHasProperty(actual, expected, options);
      
      case AssertionType.HAS_TYPE:
        return this.assertHasType(actual, expected, options);
      
      case AssertionType.IS_ARRAY:
        return this.assertIsArray(actual, options);
      
      case AssertionType.IS_OBJECT:
        return this.assertIsObject(actual, options);
      
      case AssertionType.IS_STRING:
        return this.assertIsString(actual, options);
      
      case AssertionType.IS_NUMBER:
        return this.assertIsNumber(actual, options);
      
      case AssertionType.IS_BOOLEAN:
        return this.assertIsBoolean(actual, options);
      
      case AssertionType.IS_DATE:
        return this.assertIsDate(actual, options);
      
      case AssertionType.IS_VALID_EMAIL:
        return this.assertIsValidEmail(actual, options);
      
      case AssertionType.IS_VALID_URL:
        return this.assertIsValidUrl(actual, options);
      
      case AssertionType.IS_VALID_UUID:
        return this.assertIsValidUuid(actual, options);
      
      case AssertionType.IS_VALID_JSON:
        return this.assertIsValidJson(actual, options);
      
      case AssertionType.IS_VALID_XML:
        return this.assertIsValidXml(actual, options);
      
      default:
        throw new Error(`Unknown assertion type: ${type}`);
    }
  }

  /**
   * Initialize default matchers
   */
  private initializeDefaultMatchers(): void {
    // Add any default custom matchers here
    // This is where you would add framework-specific matchers
  }

  // Built-in assertion methods
  private assertEqual(actual: any, expected: any, options?: any): AssertionResult {
    const ignoreCase = options?.ignoreCase || this.config.responseAssertion.ignoreCase;
    const ignoreWhitespace = options?.ignoreWhitespace || this.config.responseAssertion.ignoreWhitespace;
    
    let processedActual = actual;
    let processedExpected = expected;
    
    if (typeof actual === 'string' && typeof expected === 'string') {
      if (ignoreCase) {
        processedActual = actual.toLowerCase();
        processedExpected = expected.toLowerCase();
      }
      if (ignoreWhitespace) {
        processedActual = processedActual.replace(/\s+/g, '');
        processedExpected = processedExpected.replace(/\s+/g, '');
      }
    }
    
    const success = processedActual === processedExpected;
    return {
      success,
      message: success 
        ? `Values are equal: ${processedActual}` 
        : `Expected '${processedExpected}' but got '${processedActual}'`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertNotEqual(actual: any, expected: any, options?: any): AssertionResult {
    const equalResult = this.assertEqual(actual, expected, options);
    return {
      success: !equalResult.success,
      message: equalResult.success 
        ? `Values should not be equal: ${actual}` 
        : `Values are not equal: ${actual} != ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertContains(actual: any, expected: any, options?: any): AssertionResult {
    const success = Array.isArray(actual) 
      ? actual.includes(expected)
      : typeof actual === 'string' && actual.includes(expected);
    
    return {
      success,
      message: success 
        ? `Value contains expected: ${expected}` 
        : `Value does not contain expected: ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertNotContains(actual: any, expected: any, options?: any): AssertionResult {
    const containsResult = this.assertContains(actual, expected, options);
    return {
      success: !containsResult.success,
      message: containsResult.success 
        ? `Value should not contain: ${expected}` 
        : `Value does not contain: ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertMatches(actual: any, expected: any, options?: any): AssertionResult {
    const regex = expected instanceof RegExp ? expected : new RegExp(expected);
    const success = regex.test(String(actual));
    
    return {
      success,
      message: success 
        ? `Value matches pattern: ${regex}` 
        : `Value does not match pattern: ${regex}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertNotMatches(actual: any, expected: any, options?: any): AssertionResult {
    const matchResult = this.assertMatches(actual, expected, options);
    return {
      success: !matchResult.success,
      message: matchResult.success 
        ? `Value should not match pattern: ${expected}` 
        : `Value does not match pattern: ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertGreaterThan(actual: any, expected: any, options?: any): AssertionResult {
    const success = Number(actual) > Number(expected);
    return {
      success,
      message: success 
        ? `${actual} is greater than ${expected}` 
        : `${actual} is not greater than ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertLessThan(actual: any, expected: any, options?: any): AssertionResult {
    const success = Number(actual) < Number(expected);
    return {
      success,
      message: success 
        ? `${actual} is less than ${expected}` 
        : `${actual} is not less than ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertGreaterThanOrEqual(actual: any, expected: any, options?: any): AssertionResult {
    const success = Number(actual) >= Number(expected);
    return {
      success,
      message: success 
        ? `${actual} is greater than or equal to ${expected}` 
        : `${actual} is not greater than or equal to ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertLessThanOrEqual(actual: any, expected: any, options?: any): AssertionResult {
    const success = Number(actual) <= Number(expected);
    return {
      success,
      message: success 
        ? `${actual} is less than or equal to ${expected}` 
        : `${actual} is not less than or equal to ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertIsNull(actual: any, options?: any): AssertionResult {
    const success = actual === null;
    return {
      success,
      message: success ? 'Value is null' : `Value is not null: ${actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsNotNull(actual: any, options?: any): AssertionResult {
    const success = actual !== null;
    return {
      success,
      message: success ? 'Value is not null' : 'Value is null',
      actual,
      timestamp: new Date()
    };
  }

  private assertIsEmpty(actual: any, options?: any): AssertionResult {
    let success = false;
    if (Array.isArray(actual)) {
      success = actual.length === 0;
    } else if (typeof actual === 'string') {
      success = actual.length === 0;
    } else if (actual && typeof actual === 'object') {
      success = Object.keys(actual).length === 0;
    }
    
    return {
      success,
      message: success ? 'Value is empty' : `Value is not empty: ${actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsNotEmpty(actual: any, options?: any): AssertionResult {
    const emptyResult = this.assertIsEmpty(actual, options);
    return {
      success: !emptyResult.success,
      message: emptyResult.success ? 'Value should not be empty' : 'Value is not empty',
      actual,
      timestamp: new Date()
    };
  }

  private assertHasLength(actual: any, expected: any, options?: any): AssertionResult {
    const length = actual?.length || 0;
    const success = length === expected;
    return {
      success,
      message: success 
        ? `Value has expected length: ${expected}` 
        : `Value has length ${length}, expected ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertHasProperty(actual: any, expected: any, options?: any): AssertionResult {
    const success = actual && typeof actual === 'object' && expected in actual;
    return {
      success,
      message: success 
        ? `Object has property: ${expected}` 
        : `Object does not have property: ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertHasType(actual: any, expected: any, options?: any): AssertionResult {
    const actualType = typeof actual;
    const success = actualType === expected;
    return {
      success,
      message: success 
        ? `Value has expected type: ${expected}` 
        : `Value has type ${actualType}, expected ${expected}`,
      actual,
      expected,
      timestamp: new Date()
    };
  }

  private assertIsArray(actual: any, options?: any): AssertionResult {
    const success = Array.isArray(actual);
    return {
      success,
      message: success ? 'Value is an array' : `Value is not an array: ${typeof actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsObject(actual: any, options?: any): AssertionResult {
    const success = actual !== null && typeof actual === 'object' && !Array.isArray(actual);
    return {
      success,
      message: success ? 'Value is an object' : `Value is not an object: ${typeof actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsString(actual: any, options?: any): AssertionResult {
    const success = typeof actual === 'string';
    return {
      success,
      message: success ? 'Value is a string' : `Value is not a string: ${typeof actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsNumber(actual: any, options?: any): AssertionResult {
    const success = typeof actual === 'number' && !isNaN(actual);
    return {
      success,
      message: success ? 'Value is a number' : `Value is not a number: ${typeof actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsBoolean(actual: any, options?: any): AssertionResult {
    const success = typeof actual === 'boolean';
    return {
      success,
      message: success ? 'Value is a boolean' : `Value is not a boolean: ${typeof actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsDate(actual: any, options?: any): AssertionResult {
    const success = actual instanceof Date && !isNaN(actual.getTime());
    return {
      success,
      message: success ? 'Value is a date' : `Value is not a date: ${typeof actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsValidEmail(actual: any, options?: any): AssertionResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const success = typeof actual === 'string' && emailRegex.test(actual);
    return {
      success,
      message: success ? 'Value is a valid email' : `Value is not a valid email: ${actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsValidUrl(actual: any, options?: any): AssertionResult {
    try {
      new URL(actual);
      return {
        success: true,
        message: 'Value is a valid URL',
        actual,
        timestamp: new Date()
      };
    } catch {
      return {
        success: false,
        message: `Value is not a valid URL: ${actual}`,
        actual,
        timestamp: new Date()
      };
    }
  }

  private assertIsValidUuid(actual: any, options?: any): AssertionResult {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const success = typeof actual === 'string' && uuidRegex.test(actual);
    return {
      success,
      message: success ? 'Value is a valid UUID' : `Value is not a valid UUID: ${actual}`,
      actual,
      timestamp: new Date()
    };
  }

  private assertIsValidJson(actual: any, options?: any): AssertionResult {
    try {
      JSON.parse(actual);
      return {
        success: true,
        message: 'Value is valid JSON',
        actual,
        timestamp: new Date()
      };
    } catch {
      return {
        success: false,
        message: `Value is not valid JSON: ${actual}`,
        actual,
        timestamp: new Date()
      };
    }
  }

  private assertIsValidXml(actual: any, options?: any): AssertionResult {
    try {
      // Basic XML validation (would need xml parser for full validation)
      const xmlRegex = /^<\?xml.*\?>[\s\S]*<\/\w+>$|^<\w+[\s\S]*<\/\w+>$/;
      const success = typeof actual === 'string' && xmlRegex.test(actual.trim());
      return {
        success,
        message: success ? 'Value is valid XML' : `Value is not valid XML: ${actual}`,
        actual,
        timestamp: new Date()
      };
    } catch {
      return {
        success: false,
        message: `Value is not valid XML: ${actual}`,
        actual,
        timestamp: new Date()
      };
    }
  }
}

export default AssertionEngine;