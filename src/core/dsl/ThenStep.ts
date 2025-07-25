/**
 * Then Step Implementation for RestifiedTS
 * 
 * This module implements the "Then" step of the fluent DSL, providing methods for:
 * - Response assertions (status, headers, body)
 * - JSON path assertions
 * - Custom validation
 * - Data extraction
 * - Response storage
 * - Performance validation
 */

import { expect } from 'chai';
import { query as jsonpathQuery } from 'jsonpath';
import { IncomingHttpHeaders } from 'http';
import { 
  IThenStep, 
  RestifiedResponse, 
  RestifiedError,
  AssertionResult,
  ExtractionResult
} from '../../types/RestifiedTypes';
import { VariableStore } from '../stores/VariableStore';
import { Config } from '../config/Config';

export class ThenStep implements IThenStep {
  private response?: RestifiedResponse;
  private error?: RestifiedError;
  private variableStore: VariableStore;
  private config: Config;
  private extractedData: Record<string, any> = {};
  private assertionResults: AssertionResult[] = [];
  private waitOperations: (() => Promise<void>)[] = [];

  constructor(
    response: RestifiedResponse | undefined,
    variableStore: VariableStore,
    config: Config,
    error?: RestifiedError
  ) {
    this.response = response;
    this.variableStore = variableStore;
    this.config = config;
    this.error = error;
  }

  /**
   * Assert response status code
   */
  statusCode(expectedStatus: number): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      expect(this.response?.status).to.equal(expectedStatus);
      return {
        passed: true,
        message: `Status code is ${expectedStatus}`,
        actual: this.response?.status,
        expected: expectedStatus,
        operator: 'equal',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert response status code is in array
   */
  statusCodeIn(expectedStatuses: number[]): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      expect(expectedStatuses).to.include(this.response?.status);
      return {
        passed: true,
        message: `Status code ${this.response?.status} is in expected list`,
        actual: this.response?.status,
        expected: expectedStatuses,
        operator: 'include',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert response status text
   */
  statusText(expectedStatusText: string): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      expect(this.response?.statusText).to.equal(expectedStatusText);
      return {
        passed: true,
        message: `Status text is ${expectedStatusText}`,
        actual: this.response?.statusText,
        expected: expectedStatusText,
        operator: 'equal',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert response header
   */
  header(name: string, expectedValue: string | RegExp | ((value: string) => boolean)): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const headerValue = this.response?.headers[name.toLowerCase()];
      expect(headerValue).to.exist;
      
      if (typeof expectedValue === 'string') {
        expect(headerValue).to.equal(expectedValue);
      } else if (expectedValue instanceof RegExp) {
        expect(headerValue).to.match(expectedValue);
      } else if (typeof expectedValue === 'function') {
        expect(expectedValue(headerValue as string)).to.be.true;
      }
      
      return {
        passed: true,
        message: `Header ${name} matches expected value`,
        actual: headerValue,
        expected: expectedValue,
        operator: 'match',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert multiple response headers
   */
  headers(expectedHeaders: Record<string, string | RegExp | ((value: string) => boolean)>): IThenStep {
    Object.entries(expectedHeaders).forEach(([name, expectedValue]) => {
      this.header(name, expectedValue);
    });
    return this;
  }

  /**
   * Assert header exists
   */
  headerExists(name: string): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const headerValue = this.response?.headers[name.toLowerCase()];
      expect(headerValue).to.exist;
      
      return {
        passed: true,
        message: `Header ${name} exists`,
        actual: headerValue,
        expected: 'exists',
        operator: 'exist',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert header does not exist
   */
  headerNotExists(name: string): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const headerValue = this.response?.headers[name.toLowerCase()];
      expect(headerValue).to.not.exist;
      
      return {
        passed: true,
        message: `Header ${name} does not exist`,
        actual: headerValue,
        expected: 'not exist',
        operator: 'not.exist',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert content type
   */
  contentType(expectedContentType: string): IThenStep {
    return this.header('content-type', (value: string) => {
      return value.includes(expectedContentType);
    });
  }

  /**
   * Assert response body
   */
  body(expectedBody: any): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      expect(this.response?.data).to.deep.equal(expectedBody);
      return {
        passed: true,
        message: 'Response body matches expected',
        actual: this.response?.data,
        expected: expectedBody,
        operator: 'deep.equal',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert response body contains substring
   */
  bodyContains(expectedSubstring: string): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const bodyString = typeof this.response?.data === 'string' 
        ? this.response.data 
        : JSON.stringify(this.response?.data);
      
      expect(bodyString).to.include(expectedSubstring);
      return {
        passed: true,
        message: `Response body contains "${expectedSubstring}"`,
        actual: bodyString,
        expected: expectedSubstring,
        operator: 'include',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert response body matches regex
   */
  bodyMatches(pattern: RegExp): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const bodyString = typeof this.response?.data === 'string' 
        ? this.response.data 
        : JSON.stringify(this.response?.data);
      
      expect(bodyString).to.match(pattern);
      return {
        passed: true,
        message: `Response body matches pattern ${pattern}`,
        actual: bodyString,
        expected: pattern,
        operator: 'match',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert response body type
   */
  bodyType(expectedType: 'json' | 'xml' | 'text' | 'html'): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const contentType = this.response?.headers['content-type'] as string;
      
      switch (expectedType) {
        case 'json':
          expect(contentType).to.include('application/json');
          break;
        case 'xml':
          expect(contentType).to.satisfy((ct: string) => 
            ct.includes('application/xml') || ct.includes('text/xml')
          );
          break;
        case 'text':
          expect(contentType).to.include('text/plain');
          break;
        case 'html':
          expect(contentType).to.include('text/html');
          break;
      }
      
      return {
        passed: true,
        message: `Response body type is ${expectedType}`,
        actual: contentType,
        expected: expectedType,
        operator: 'type',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert JSON path value
   */
  jsonPath(path: string, expectedValue: any): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const values = jsonpathQuery(this.response?.data, path);
      
      if (typeof expectedValue === 'function') {
        expect(expectedValue(values[0])).to.be.true;
      } else {
        expect(values[0]).to.deep.equal(expectedValue);
      }
      
      return {
        passed: true,
        message: `JSON path ${path} matches expected value`,
        actual: values[0],
        expected: expectedValue,
        operator: 'equal',
        path,
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert JSON path exists
   */
  jsonPathExists(path: string): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const values = jsonpathQuery(this.response?.data, path);
      expect(values).to.have.length.greaterThan(0);
      
      return {
        passed: true,
        message: `JSON path ${path} exists`,
        actual: values.length,
        expected: 'exists',
        operator: 'exist',
        path,
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert JSON path does not exist
   */
  jsonPathNotExists(path: string): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const values = jsonpathQuery(this.response?.data, path);
      expect(values).to.have.length(0);
      
      return {
        passed: true,
        message: `JSON path ${path} does not exist`,
        actual: values.length,
        expected: 'not exist',
        operator: 'not.exist',
        path,
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert JSON path matches regex
   */
  jsonPathMatches(path: string, pattern: RegExp): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const values = jsonpathQuery(this.response?.data, path);
      expect(values[0]).to.match(pattern);
      
      return {
        passed: true,
        message: `JSON path ${path} matches pattern ${pattern}`,
        actual: values[0],
        expected: pattern,
        operator: 'match',
        path,
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert JSON path contains value
   */
  jsonPathContains(path: string, expectedValue: any): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const values = jsonpathQuery(this.response?.data, path);
      expect(values).to.include(expectedValue);
      
      return {
        passed: true,
        message: `JSON path ${path} contains expected value`,
        actual: values,
        expected: expectedValue,
        operator: 'include',
        path,
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert JSON schema
   */
  jsonSchema(schema: any): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      // TODO: Implement JSON schema validation
      // This would require a schema validation library like Ajv
      throw new Error('JSON schema validation not yet implemented');
    });
    
    return this;
  }

  /**
   * Assert XML path value
   */
  xmlPath(path: string, expectedValue: any): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      // TODO: Implement XML path validation
      // This would require an XML parser and XPath library
      throw new Error('XML path validation not yet implemented');
    });
    
    return this;
  }

  /**
   * Assert XML path exists
   */
  xmlPathExists(path: string): IThenStep {
    // TODO: Implement XML path existence validation
    throw new Error('XML path existence validation not yet implemented');
  }

  /**
   * Assert XML schema
   */
  xmlSchema(schema: any): IThenStep {
    // TODO: Implement XML schema validation
    throw new Error('XML schema validation not yet implemented');
  }

  /**
   * Custom assertion
   */
  assert(assertion: (response: RestifiedResponse) => boolean, message?: string): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      const result = assertion(this.response!);
      expect(result).to.be.true;
      
      return {
        passed: true,
        message: message || 'Custom assertion passed',
        actual: result,
        expected: true,
        operator: 'custom',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Custom validation
   */
  custom(validator: (response: RestifiedResponse) => void): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      validator(this.response!);
      
      return {
        passed: true,
        message: 'Custom validation passed',
        actual: 'validated',
        expected: 'validated',
        operator: 'custom',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert response time
   */
  responseTime(expectedTime: number): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      expect(this.response?.responseTime).to.be.lessThan(expectedTime);
      
      return {
        passed: true,
        message: `Response time ${this.response?.responseTime}ms is less than ${expectedTime}ms`,
        actual: this.response?.responseTime,
        expected: expectedTime,
        operator: 'lessThan',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert response time is within range
   */
  responseTimeIn(minTime: number, maxTime: number): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      expect(this.response?.responseTime).to.be.within(minTime, maxTime);
      
      return {
        passed: true,
        message: `Response time ${this.response?.responseTime}ms is within range ${minTime}-${maxTime}ms`,
        actual: this.response?.responseTime,
        expected: `${minTime}-${maxTime}`,
        operator: 'within',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Assert response size
   */
  responseSize(expectedSize: number): IThenStep {
    this.addAssertion(() => {
      if (this.error) {
        throw this.error;
      }
      
      expect(this.response?.size).to.equal(expectedSize);
      
      return {
        passed: true,
        message: `Response size is ${expectedSize} bytes`,
        actual: this.response?.size,
        expected: expectedSize,
        operator: 'equal',
        timestamp: new Date()
      };
    });
    
    return this;
  }

  /**
   * Extract value from response
   */
  extract(path: string, variableName: string): IThenStep {
    try {
      if (this.error) {
        throw this.error;
      }
      
      const values = jsonpathQuery(this.response?.data, path);
      const extractedValue = values[0];
      
      this.variableStore.setLocal(variableName, extractedValue);
      this.extractedData[variableName] = extractedValue;
      
      const result: ExtractionResult = {
        path,
        value: extractedValue,
        variableName,
        timestamp: new Date(),
        success: true
      };
      
      // Log extraction if debug mode
      if (this.config.get('logging.level') === 'debug') {
        console.log(`[RestifiedTS] Extracted ${variableName} = ${JSON.stringify(extractedValue)} from ${path}`);
      }
      
    } catch (error) {
      const result: ExtractionResult = {
        path,
        value: undefined,
        variableName,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      console.error(`[RestifiedTS] Failed to extract ${variableName} from ${path}:`, error instanceof Error ? error.message : String(error));
    }
    
    return this;
  }

  /**
   * Extract multiple values from response
   */
  extractAll(extractions: Record<string, string>): IThenStep {
    Object.entries(extractions).forEach(([variableName, path]) => {
      this.extract(path, variableName);
    });
    return this;
  }

  /**
   * Store response with key
   */
  store(key: string): IThenStep {
    // TODO: Implement response storage
    return this;
  }

  /**
   * Store response with key
   */
  storeResponse(key: string): IThenStep {
    return this.store(key);
  }

  /**
   * Snapshot testing
   */
  snapshot(key: string): IThenStep {
    // TODO: Implement snapshot testing
    return this;
  }

  /**
   * Update snapshot
   */
  snapshotUpdate(key: string): IThenStep {
    // TODO: Implement snapshot update
    return this;
  }

  /**
   * Log message
   */
  log(message?: string): IThenStep {
    const logMessage = message || `Response: ${this.response?.status} ${this.response?.statusText}`;
    console.log(`[RestifiedTS] ${logMessage}`);
    return this;
  }

  /**
   * Log response details
   */
  logResponse(): IThenStep {
    console.log(`[RestifiedTS] Response:`, {
      status: this.response?.status,
      statusText: this.response?.statusText,
      headers: this.response?.headers,
      data: this.response?.data,
      responseTime: this.response?.responseTime
    });
    return this;
  }

  /**
   * Wait for specified time
   */
  wait(ms: number): IThenStep {
    if (ms < 0) {
      throw new Error('Wait time cannot be negative');
    }
    
    // Add wait as a deferred operation to be executed when execute() is called
    this.waitOperations.push(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
    });
    
    return this;
  }

  /**
   * Wait until condition is met
   */
  waitUntil(condition: () => boolean | Promise<boolean>, timeout: number = 5000): IThenStep {
    if (timeout < 0) {
      throw new Error('Timeout cannot be negative');
    }
    
    // Add waitUntil as a deferred operation
    this.waitOperations.push(async () => {
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        try {
          const result = await Promise.resolve(condition());
          if (result) {
            return; // Condition met, exit wait
          }
        } catch (error) {
          // If condition throws an error, treat as false and continue waiting
          console.warn('Condition evaluation failed:', error);
        }
        
        // Wait 100ms before checking condition again
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      throw new Error(`Condition not met within ${timeout}ms timeout`);
    });
    
    return this;
  }

  /**
   * Get response
   */
  getResponse(): RestifiedResponse {
    if (this.error) {
      throw this.error;
    }
    return this.response!;
  }

  /**
   * Get response data
   */
  getData(): any {
    if (this.error) {
      throw this.error;
    }
    return this.response?.data;
  }

  /**
   * Get response headers
   */
  getHeaders(): IncomingHttpHeaders {
    if (this.error) {
      throw this.error;
    }
    return this.response?.headers || {};
  }

  /**
   * Get response status
   */
  getStatus(): number {
    if (this.error) {
      throw this.error;
    }
    return this.response?.status || 0;
  }

  /**
   * Get extracted data
   */
  getExtractedData(): Record<string, any> {
    return { ...this.extractedData };
  }

  /**
   * Fluent chaining method
   */
  and(): IThenStep {
    return this;
  }

  /**
   * Fluent chaining method
   */
  also(): IThenStep {
    return this;
  }

  /**
   * Final execution method
   */
  async execute(): Promise<RestifiedResponse> {
    // Execute all wait operations first
    for (const waitOperation of this.waitOperations) {
      await waitOperation();
    }
    
    // Execute all assertions
    for (const assertion of this.assertionResults) {
      if (!assertion.passed) {
        throw new Error(assertion.message);
      }
    }
    
    if (this.error) {
      throw this.error;
    }
    
    return this.response!;
  }

  /**
   * Add assertion and execute it
   */
  private addAssertion(assertion: () => AssertionResult): void {
    try {
      const result = assertion();
      result.timestamp = new Date();
      this.assertionResults.push(result);
    } catch (error) {
      const result: AssertionResult = {
        passed: false,
        message: error instanceof Error ? error.message : String(error),
        actual: (error as any).actual,
        expected: (error as any).expected,
        operator: (error as any).operator,
        timestamp: new Date()
      };
      this.assertionResults.push(result);
      throw error;
    }
  }
}

export default ThenStep;