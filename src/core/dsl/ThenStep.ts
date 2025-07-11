// src/core/dsl/ThenStep.ts

import { 
  IThenStep, 
  RestifiedResponse, 
  ContentType,
  SnapshotDiff,
  AssertionError
} from '../../types/RestifiedTypes';
import { VariableStore } from '../stores/VariableStore';
import { ResponseStore } from '../stores/ResponseStore';
import { SnapshotStore } from '../stores/SnapshotStore';
import { AuditLogger } from '../../logging/AuditLogger';
import { Config } from '../config/Config';
import { JsonPathExtractor } from '../../utils/JsonPathExtractor';
import { expect } from 'chai';

/**
 * Implementation of the "then" step in the fluent DSL
 * Handles response assertions, data extraction, and storage operations
 * 
 * @example
 * ```typescript
 * await restified
 *   .given()
 *   .when()
 *   .get('/users/123')
 *   .execute()
 *   .then()
 *   .statusCode(200)
 *   .contentType('application/json')
 *   .jsonPath('$.name', 'John Doe')
 *   .responseTime(1000)
 *   .storeResponse('userResponse')
 *   .extract('$.id', 'userId');
 * ```
 */
export class ThenStep implements IThenStep {
  private jsonPathExtractor: JsonPathExtractor;
  private assertionCount: number = 0;
  private extractedVariables: Record<string, any> = {};

  constructor(
    private readonly response: RestifiedResponse,
    private readonly variableStore: VariableStore,
    private readonly responseStore: ResponseStore,
    private readonly snapshotStore: SnapshotStore,
    private readonly auditLogger: AuditLogger,
    private readonly config: Config
  ) {
    this.jsonPathExtractor = new JsonPathExtractor();
    this.auditLogger.debug(`[THEN] Initializing ThenStep for response with status: ${response.status}`);
  }

  /**
   * Assert response status code
   * 
   * @param code - Expected status code
   * @returns Current ThenStep instance for chaining
   * @throws AssertionError if status code doesn't match
   */
  statusCode(code: number): IThenStep {
    this.validateStatusCode(code);
    
    try {
      expect(this.response.status).to.equal(code);
      this.assertionCount++;
      this.auditLogger.debug(`[THEN] ✓ Status code assertion passed: ${this.response.status} === ${code}`);
    } catch (error) {
      this.auditLogger.error(`[THEN] ✗ Status code assertion failed: expected ${code}, got ${this.response.status}`);
      throw new AssertionError(
        `Expected status code ${code}, but got ${this.response.status}`,
        code,
        this.response.status
      );
    }
    
    return this;
  }

  /**
   * Assert response status code is one of the provided codes
   * 
   * @param codes - Array of acceptable status codes
   * @returns Current ThenStep instance for chaining
   * @throws AssertionError if status code is not in the array
   */
  statusCodeIn(codes: number[]): IThenStep {
    this.validateStatusCodes(codes);
    
    try {
      expect(codes).to.include(this.response.status);
      this.assertionCount++;
      this.auditLogger.debug(`[THEN] ✓ Status code in range assertion passed: ${this.response.status} in [${codes.join(', ')}]`);
    } catch (error) {
      this.auditLogger.error(`[THEN] ✗ Status code not in range: expected one of [${codes.join(', ')}], got ${this.response.status}`);
      throw new AssertionError(
        `Expected status code to be one of [${codes.join(', ')}], but got ${this.response.status}`,
        codes,
        this.response.status
      );
    }
    
    return this;
  }

  /**
   * Assert response content type
   * 
   * @param type - Expected content type
   * @returns Current ThenStep instance for chaining
   * @throws AssertionError if content type doesn't match
   */
  contentType(type: ContentType): IThenStep {
    this.validateContentType(type);
    
    const actualContentType = this.getContentType();
    
    try {
      expect(actualContentType).to.include(type);
      this.assertionCount++;
      this.auditLogger.debug(`[THEN] ✓ Content type assertion passed: ${actualContentType} includes ${type}`);
    } catch (error) {
      this.auditLogger.error(`[THEN] ✗ Content type assertion failed: expected ${type}, got ${actualContentType}`);
      throw new AssertionError(
        `Expected content type to include '${type}', but got '${actualContentType}'`,
        type,
        actualContentType
      );
    }
    
    return this;
  }

  /**
   * Assert response header value
   * 
   * @param key - Header name (case-insensitive)
   * @param value - Expected header value
   * @returns Current ThenStep instance for chaining
   * @throws AssertionError if header doesn't exist or value doesn't match
   */
  header(key: string, value: string): IThenStep {
    this.validateHeaderKey(key);
    
    const actualValue = this.getHeaderValue(key);
    
    if (actualValue === undefined) {
      this.auditLogger.error(`[THEN] ✗ Header assertion failed: header '${key}' not found`);
      throw new AssertionError(
        `Expected header '${key}' to exist`,
        value,
        undefined
      );
    }
    
    try {
      expect(actualValue).to.equal(value);
      this.assertionCount++;
      this.auditLogger.debug(`[THEN] ✓ Header assertion passed: ${key} = ${actualValue}`);
    } catch (error) {
      this.auditLogger.error(`[THEN] ✗ Header assertion failed: ${key} expected '${value}', got '${actualValue}'`);
      throw new AssertionError(
        `Expected header '${key}' to have value '${value}', but got '${actualValue}'`,
        value,
        actualValue
      );
    }
    
    return this;
  }

  /**
   * Assert response body content
   * Supports various assertion types including deep equality, contains, and custom matchers
   * 
   * @param matcher - Expected body content or matcher function
   * @returns Current ThenStep instance for chaining
   * @throws AssertionError if body doesn't match
   */
  body(matcher: any): IThenStep {
    try {
      if (typeof matcher === 'function') {
        // Custom matcher function
        const result = matcher(this.response.data);
        if (result !== true) {
          throw new Error('Custom matcher returned false');
        }
      } else if (typeof matcher === 'object' && matcher !== null) {
        // Deep equality check for objects
        expect(this.response.data).to.deep.equal(matcher);
      } else {
        // Direct equality check for primitives
        expect(this.response.data).to.equal(matcher);
      }
      
      this.assertionCount++;
      this.auditLogger.debug(`[THEN] ✓ Body assertion passed`);
    } catch (error) {
      this.auditLogger.error(`[THEN] ✗ Body assertion failed: ${(error as Error).message}`);
      throw new AssertionError(
        `Body assertion failed: ${(error as Error).message}`,
        matcher,
        this.response.data
      );
    }
    
    return this;
  }

  /**
   * Assert value at JSONPath expression
   * 
   * @param path - JSONPath expression (e.g., '$.user.name')
   * @param value - Expected value or matcher function
   * @returns Current ThenStep instance for chaining
   * @throws AssertionError if JSONPath value doesn't match
   */
  jsonPath(path: string, value: any): IThenStep {
    this.validateJsonPath(path);
    
    try {
      const extractedValue = this.jsonPathExtractor.extract(this.response.data, path);
      
      if (typeof value === 'function') {
        // Custom matcher function
        const result = value(extractedValue);
        if (result !== true) {
          throw new Error('Custom matcher returned false');
        }
      } else {
        // Direct comparison
        expect(extractedValue).to.deep.equal(value);
      }
      
      this.assertionCount++;
      this.auditLogger.debug(`[THEN] ✓ JSONPath assertion passed: ${path} = ${JSON.stringify(extractedValue)}`);
    } catch (error) {
      this.auditLogger.error(`[THEN] ✗ JSONPath assertion failed: ${path} - ${(error as Error).message}`);
      throw new AssertionError(
        `JSONPath assertion failed for '${path}': ${(error as Error).message}`,
        value,
        this.jsonPathExtractor.extract(this.response.data, path)
      );
    }
    
    return this;
  }

  /**
   * Assert response time is within limit
   * 
   * @param maxMs - Maximum allowed response time in milliseconds
   * @returns Current ThenStep instance for chaining
   * @throws AssertionError if response time exceeds limit
   */
  responseTime(maxMs: number): IThenStep {
    this.validateResponseTime(maxMs);
    
    try {
      expect(this.response.responseTime).to.be.at.most(maxMs);
      this.assertionCount++;
      this.auditLogger.debug(`[THEN] ✓ Response time assertion passed: ${this.response.responseTime}ms <= ${maxMs}ms`);
    } catch (error) {
      this.auditLogger.error(`[THEN] ✗ Response time assertion failed: ${this.response.responseTime}ms > ${maxMs}ms`);
      throw new AssertionError(
        `Expected response time to be at most ${maxMs}ms, but got ${this.response.responseTime}ms`,
        maxMs,
        this.response.responseTime
      );
    }
    
    return this;
  }

  /**
   * Store the current response for later use
   * 
   * @param key - Unique key to store the response under
   * @returns Current ThenStep instance for chaining
   * @throws Error if key is invalid or already exists
   */
  storeResponse(key: string): IThenStep {
    this.validateStorageKey(key);
    
    try {
      this.responseStore.store(key, this.response);
      this.auditLogger.debug(`[THEN] Response stored with key: ${key}`);
    } catch (error) {
      this.auditLogger.error(`[THEN] Failed to store response: ${(error as Error).message}`);
      throw error;
    }
    
    return this;
  }

  /**
   * Save current response as a snapshot for comparison
   * 
   * @param key - Unique key to save the snapshot under
   * @returns Current ThenStep instance for chaining
   * @throws Error if key is invalid
   */
  saveSnapshot(key: string): IThenStep {
    this.validateStorageKey(key);
    
    try {
      this.snapshotStore.save(key, this.response.data, {
        description: `Snapshot from ${this.response.config.method} ${this.response.url}`,
        tags: ['auto-generated']
      });
      this.auditLogger.debug(`[THEN] Snapshot saved with key: ${key}`);
    } catch (error) {
      this.auditLogger.error(`[THEN] Failed to save snapshot: ${(error as Error).message}`);
      throw error;
    }
    
    return this;
  }

  /**
   * Compare current response with a previously saved snapshot
   * 
   * @param key - Snapshot key to compare against
   * @returns Current ThenStep instance for chaining
   * @throws AssertionError if snapshots don't match
   */
  compareSnapshot(key: string): IThenStep {
    this.validateStorageKey(key);
    
    try {
      const diff = this.snapshotStore.compare(key, this.response.data);
      
      if (diff.hasDifferences) {
        this.auditLogger.error(`[THEN] ✗ Snapshot comparison failed for key: ${key}`);
        this.auditLogger.debug(`[THEN] Snapshot diff: ${JSON.stringify(diff, null, 2)}`);
        
        throw new AssertionError(
          `Response doesn't match snapshot '${key}'. Found ${diff.added.length} additions, ${diff.removed.length} removals, ${diff.modified.length} modifications`,
          'matching snapshot',
          diff
        );
      }
      
      this.assertionCount++;
      this.auditLogger.debug(`[THEN] ✓ Snapshot comparison passed for key: ${key}`);
    } catch (error) {
      if (error instanceof AssertionError) {
        throw error;
      }
      
      this.auditLogger.error(`[THEN] Snapshot comparison error: ${(error as Error).message}`);
      throw new Error(`Failed to compare snapshot '${key}': ${(error as Error).message}`);
    }
    
    return this;
  }

  /**
   * Log a custom message with the current response details
   * 
   * @param message - Optional message to log
   * @returns Current ThenStep instance for chaining
   */
  log(message?: string): IThenStep {
    const logMessage = message || 'Response details';
    
    this.auditLogger.info(`[THEN] ${logMessage}`);
    this.auditLogger.info(`[THEN] Status: ${this.response.status} ${this.response.statusText}`);
    this.auditLogger.info(`[THEN] Response Time: ${this.response.responseTime}ms`);
    this.auditLogger.info(`[THEN] Content-Type: ${this.getContentType()}`);
    
    if (this.config.get('logging.level') === 'debug') {
      this.auditLogger.debug(`[THEN] Headers: ${JSON.stringify(this.response.headers, null, 2)}`);
      this.auditLogger.debug(`[THEN] Body: ${JSON.stringify(this.response.data, null, 2)}`);
    }
    
    return this;
  }

  /**
   * Extract value from response and store as variable
   * 
   * @param path - JSONPath expression to extract value from
   * @param variable - Variable name to store the extracted value
   * @returns Current ThenStep instance for chaining
   * @throws Error if extraction fails
   */
  extract(path: string, variable: string): IThenStep {
    this.validateJsonPath(path);
    this.validateVariableName(variable);
    
    try {
      const extractedValue = this.jsonPathExtractor.extract(this.response.data, path);
      
      this.variableStore.setLocal(variable, extractedValue);
      this.extractedVariables[variable] = extractedValue;
      
      this.auditLogger.debug(`[THEN] Extracted ${path} to variable '${variable}': ${JSON.stringify(extractedValue)}`);
    } catch (error) {
      this.auditLogger.error(`[THEN] Failed to extract ${path}: ${(error as Error).message}`);
      throw new Error(`Failed to extract '${path}' to variable '${variable}': ${(error as Error).message}`);
    }
    
    return this;
  }

  /**
   * Get the current response object
   * 
   * @returns Current RestifiedResponse
   */
  getResponse(): RestifiedResponse {
    return { ...this.response }; // Return a copy to prevent mutation
  }

  /**
   * Get assertion statistics
   * 
   * @returns Object containing assertion count and extracted variables
   */
  getStats(): {
    assertionCount: number;
    extractedVariables: Record<string, any>;
    responseTime: number;
    statusCode: number;
  } {
    return {
      assertionCount: this.assertionCount,
      extractedVariables: { ...this.extractedVariables },
      responseTime: this.response.responseTime,
      statusCode: this.response.status
    };
  }

  // ==========================================
  // PRIVATE UTILITY METHODS
  // ==========================================

  private getContentType(): string {
    return this.getHeaderValue('content-type') || 'unknown';
  }

  private getHeaderValue(key: string): string | undefined {
    // Case-insensitive header lookup
    const lowerKey = key.toLowerCase();
    const matchingKey = Object.keys(this.response.headers).find(
      headerKey => headerKey.toLowerCase() === lowerKey
    );
    
    return matchingKey ? this.response.headers[matchingKey] : undefined;
  }

  // ==========================================
  // VALIDATION METHODS
  // ==========================================

  private validateStatusCode(code: number): void {
    if (typeof code !== 'number' || !Number.isInteger(code)) {
      throw new Error('Status code must be an integer');
    }
    
    if (code < 100 || code > 599) {
      throw new Error('Status code must be between 100 and 599');
    }
  }

  private validateStatusCodes(codes: number[]): void {
    if (!Array.isArray(codes) || codes.length === 0) {
      throw new Error('Status codes must be a non-empty array');
    }
    
    codes.forEach(code => this.validateStatusCode(code));
  }

  private validateContentType(type: ContentType): void {
    if (typeof type !== 'string' || type.trim() === '') {
      throw new Error('Content type must be a non-empty string');
    }
  }

  private validateHeaderKey(key: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Header key must be a non-empty string');
    }
  }

  private validateJsonPath(path: string): void {
    if (typeof path !== 'string' || path.trim() === '') {
      throw new Error('JSONPath must be a non-empty string');
    }
    
    if (!path.startsWith('$')) {
      throw new Error('JSONPath must start with $');
    }
  }

  private validateResponseTime(maxMs: number): void {
    if (typeof maxMs !== 'number' || maxMs <= 0) {
      throw new Error('Response time limit must be a positive number');
    }
  }

  private validateStorageKey(key: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Storage key must be a non-empty string');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      throw new Error('Storage key must contain only alphanumeric characters, underscores, and hyphens');
    }
  }

  private validateVariableName(name: string): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Variable name must be a non-empty string');
    }
    
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      throw new Error('Variable name must be a valid JavaScript identifier');
    }
  }
}