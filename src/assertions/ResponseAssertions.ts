// src/assertions/ResponseAssertions.ts

import { expect } from './ChaiExtensions';
import { JsonAssertions } from './JsonAssertions';
import { RestifiedResponse } from '../types/RestifiedTypes';

/**
 * HTTP Response-specific assertion utilities
 * 
 * Features:
 * - Status code assertions with semantic helpers
 * - Header validation and extraction
 * - Content type verification
 * - Response time performance assertions
 * - Body content validation
 * - Security header checks
 * - CORS header validation
 * - Custom response matchers
 * 
 * @example
 * ```typescript
 * const assertions = new ResponseAssertions(response);
 * 
 * assertions
 *   .isSuccessful()
 *   .hasStatusCode(200)
 *   .hasContentType('application/json')
 *   .hasHeader('X-Request-ID')
 *   .respondedWithin(1000)
 *   .hasSecurityHeaders()
 *   .bodyContains('success')
 *   .jsonPath('$.status', 'ok');
 * ```
 */
export class ResponseAssertions {
  private readonly response: RestifiedResponse;
  private readonly jsonAssertions: JsonAssertions;

  constructor(response: RestifiedResponse) {
    this.response = response;
    this.jsonAssertions = new JsonAssertions(response.data);
  }

  // ==========================================
  // STATUS CODE ASSERTIONS
  // ==========================================

  /**
   * Assert specific status code
   * 
   * @param code - Expected status code
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasStatusCode(code: number, message?: string): ResponseAssertions {
    if (this.response.status !== code) {
      throw new Error(message || `Expected status code ${code} but got ${this.response.status}`);
    }
    return this;
  }

  /**
   * Assert status code is one of the provided values
   * 
   * @param codes - Array of acceptable status codes
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasStatusCodeIn(codes: number[], message?: string): ResponseAssertions {
    if (!codes.includes(this.response.status)) {
      throw new Error(message || `Expected status code to be one of [${codes.join(', ')}] but got ${this.response.status}`);
    }
    return this;
  }

  /**
   * Assert response is successful (2xx status codes)
   * 
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  isSuccessful(message?: string): ResponseAssertions {
    if (this.response.status < 200 || this.response.status >= 300) {
      throw new Error(message || `Expected successful response (2xx) but got ${this.response.status}`);
    }
    return this;
  }

  /**
   * Assert response is a client error (4xx status codes)
   * 
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  isClientError(message?: string): ResponseAssertions {
    if (this.response.status < 400 || this.response.status >= 500) {
      throw new Error(message || `Expected client error (4xx) but got ${this.response.status}`);
    }
    return this;
  }

  /**
   * Assert response is a server error (5xx status codes)
   * 
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  isServerError(message?: string): ResponseAssertions {
    if (this.response.status < 500 || this.response.status >= 600) {
      throw new Error(message || `Expected server error (5xx) but got ${this.response.status}`);
    }
    return this;
  }

  /**
   * Assert response is a redirect (3xx status codes)
   * 
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  isRedirect(message?: string): ResponseAssertions {
    if (this.response.status < 300 || this.response.status >= 400) {
      throw new Error(message || `Expected redirect (3xx) but got ${this.response.status}`);
    }
    return this;
  }

  // ==========================================
  // HEADER ASSERTIONS
  // ==========================================

  /**
   * Assert response has specific header
   * 
   * @param headerName - Header name (case-insensitive)
   * @param expectedValue - Optional expected header value
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasHeader(headerName: string, expectedValue?: string, message?: string): ResponseAssertions {
    const actualValue = this.getHeaderValue(headerName);
    
    if (actualValue === undefined) {
      throw new Error(message || `Expected header '${headerName}' to be present`);
    }
    
    if (expectedValue !== undefined && actualValue !== expectedValue) {
      throw new Error(message || `Expected header '${headerName}' to have value '${expectedValue}' but got '${actualValue}'`);
    }
    
    return this;
  }

  /**
   * Assert response does not have specific header
   * 
   * @param headerName - Header name (case-insensitive)
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  doesNotHaveHeader(headerName: string, message?: string): ResponseAssertions {
    const actualValue = this.getHeaderValue(headerName);
    
    if (actualValue !== undefined) {
      throw new Error(message || `Expected header '${headerName}' not to be present but found '${actualValue}'`);
    }
    
    return this;
  }

  /**
   * Assert header value matches pattern
   * 
   * @param headerName - Header name (case-insensitive)
   * @param pattern - RegExp pattern to match
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  headerMatches(headerName: string, pattern: RegExp, message?: string): ResponseAssertions {
    const actualValue = this.getHeaderValue(headerName);
    
    if (actualValue === undefined) {
      throw new Error(message || `Expected header '${headerName}' to be present`);
    }
    
    if (!pattern.test(actualValue)) {
      throw new Error(message || `Expected header '${headerName}' value '${actualValue}' to match pattern ${pattern}`);
    }
    
    return this;
  }

  /**
   * Assert response has content type
   * 
   * @param expectedType - Expected content type (partial match)
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasContentType(expectedType: string, message?: string): ResponseAssertions {
    const contentType = this.getHeaderValue('content-type') || '';
    
    if (!contentType.includes(expectedType)) {
      throw new Error(message || `Expected content-type to include '${expectedType}' but got '${contentType}'`);
    }
    
    return this;
  }

  /**
   * Assert response has security headers
   * 
   * @param headers - Optional specific security headers to check
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasSecurityHeaders(headers?: string[], message?: string): ResponseAssertions {
    const securityHeaders = headers || [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security'
    ];
    
    const missingHeaders = securityHeaders.filter(header => 
      this.getHeaderValue(header) === undefined
    );
    
    if (missingHeaders.length > 0) {
      throw new Error(message || `Missing security headers: ${missingHeaders.join(', ')}`);
    }
    
    return this;
  }

  /**
   * Assert CORS headers are present
   * 
   * @param origin - Optional expected origin
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasCorsHeaders(origin?: string, message?: string): ResponseAssertions {
    const corsHeaders = ['Access-Control-Allow-Origin'];
    
    if (origin) {
      const allowOrigin = this.getHeaderValue('Access-Control-Allow-Origin');
      if (allowOrigin !== origin && allowOrigin !== '*') {
        throw new Error(message || `Expected Access-Control-Allow-Origin to be '${origin}' or '*' but got '${allowOrigin}'`);
      }
    } else {
      const missingHeaders = corsHeaders.filter(header => 
        this.getHeaderValue(header) === undefined
      );
      
      if (missingHeaders.length > 0) {
        throw new Error(message || `Missing CORS headers: ${missingHeaders.join(', ')}`);
      }
    }
    
    return this;
  }

  // ==========================================
  // PERFORMANCE ASSERTIONS
  // ==========================================

  /**
   * Assert response time is within limit
   * 
   * @param maxMs - Maximum response time in milliseconds
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  respondedWithin(maxMs: number, message?: string): ResponseAssertions {
    if (this.response.responseTime > maxMs) {
      throw new Error(message || `Expected response time to be within ${maxMs}ms but got ${this.response.responseTime}ms`);
    }
    return this;
  }

  /**
   * Assert response time is at least a certain duration
   * 
   * @param minMs - Minimum response time in milliseconds
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  respondedAfter(minMs: number, message?: string): ResponseAssertions {
    if (this.response.responseTime < minMs) {
      throw new Error(message || `Expected response time to be at least ${minMs}ms but got ${this.response.responseTime}ms`);
    }
    return this;
  }

  /**
   * Assert response time is within range
   * 
   * @param minMs - Minimum response time in milliseconds
   * @param maxMs - Maximum response time in milliseconds
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  respondedBetween(minMs: number, maxMs: number, message?: string): ResponseAssertions {
    if (this.response.responseTime < minMs || this.response.responseTime > maxMs) {
      throw new Error(message || `Expected response time to be between ${minMs}ms and ${maxMs}ms but got ${this.response.responseTime}ms`);
    }
    return this;
  }

  // ==========================================
  // BODY ASSERTIONS
  // ==========================================

  /**
   * Assert response body equals expected value
   * 
   * @param expected - Expected body content
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasBody(expected: any, message?: string): ResponseAssertions {
    try {
      expect(this.response.data).to.deep.equal(expected);
    } catch (error) {
      throw new Error(message || `Body assertion failed: ${(error as Error).message}`);
    }
    return this;
  }

  /**
   * Assert response body contains text/substring
   * 
   * @param text - Text to search for
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  bodyContains(text: string, message?: string): ResponseAssertions {
    const bodyString = typeof this.response.data === 'string' 
      ? this.response.data 
      : JSON.stringify(this.response.data);
    
    if (!bodyString.includes(text)) {
      throw new Error(message || `Expected response body to contain '${text}'`);
    }
    
    return this;
  }

  /**
   * Assert response body matches regex pattern
   * 
   * @param pattern - RegExp pattern to match
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  bodyMatches(pattern: RegExp, message?: string): ResponseAssertions {
    const bodyString = typeof this.response.data === 'string' 
      ? this.response.data 
      : JSON.stringify(this.response.data);
    
    if (!pattern.test(bodyString)) {
      throw new Error(message || `Expected response body to match pattern ${pattern}`);
    }
    
    return this;
  }

  /**
   * Assert response body is empty
   * 
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasEmptyBody(message?: string): ResponseAssertions {
    const isEmpty = this.response.data === null || 
                   this.response.data === undefined || 
                   this.response.data === '' ||
                   (Array.isArray(this.response.data) && this.response.data.length === 0) ||
                   (typeof this.response.data === 'object' && Object.keys(this.response.data).length === 0);
    
    if (!isEmpty) {
      throw new Error(message || 'Expected response body to be empty');
    }
    
    return this;
  }

  /**
   * Assert response body is valid JSON
   * 
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasValidJsonBody(message?: string): ResponseAssertions {
    try {
      if (typeof this.response.data === 'string') {
        JSON.parse(this.response.data);
      } else if (typeof this.response.data === 'object') {
        JSON.stringify(this.response.data);
      } else {
        throw new Error('Body is not JSON-compatible');
      }
    } catch (error) {
      throw new Error(message || `Expected valid JSON body but got parse error: ${(error as Error).message}`);
    }
    
    return this;
  }

  // ==========================================
  // JSON-SPECIFIC ASSERTIONS (DELEGATION)
  // ==========================================

  /**
   * Assert JSONPath exists in response data
   * 
   * @param path - JSONPath expression
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  jsonPath(path: string, expectedValue?: any, message?: string): ResponseAssertions {
    if (expectedValue !== undefined) {
      this.jsonAssertions.pathEquals(path, expectedValue, message);
    } else {
      this.jsonAssertions.hasPath(path, message);
    }
    return this;
  }

  /**
   * Assert JSON schema compliance
   * 
   * @param schema - JSON schema to validate against
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  matchesJsonSchema(schema: any, message?: string): ResponseAssertions {
    this.jsonAssertions.matchesSchema(schema, message);
    return this;
  }

  /**
   * Assert array length in JSON response
   * 
   * @param path - JSONPath to array
   * @param expectedLength - Expected array length
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  jsonArrayLength(path: string, expectedLength: number, message?: string): ResponseAssertions {
    this.jsonAssertions.arrayLengthEquals(path, expectedLength, message);
    return this;
  }

  /**
   * Assert JSON array contains value
   * 
   * @param path - JSONPath to array
   * @param expectedValue - Value that should be in the array
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  jsonArrayContains(path: string, expectedValue: any, message?: string): ResponseAssertions {
    this.jsonAssertions.arrayContains(path, expectedValue, message);
    return this;
  }

  // ==========================================
  // COOKIE ASSERTIONS
  // ==========================================

  /**
   * Assert response sets specific cookie
   * 
   * @param cookieName - Name of the cookie
   * @param expectedValue - Optional expected cookie value
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  setsCookie(cookieName: string, expectedValue?: string, message?: string): ResponseAssertions {
    const setCookieHeader = this.getHeaderValue('set-cookie');
    
    if (!setCookieHeader) {
      throw new Error(message || 'Expected response to set cookies but no Set-Cookie header found');
    }
    
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const cookieFound = cookies.some(cookie => {
      const cookieParts = cookie.split(';')[0].split('=');
      const name = cookieParts[0].trim();
      const value = cookieParts[1]?.trim();
      
      if (name === cookieName) {
        return expectedValue === undefined || value === expectedValue;
      }
      return false;
    });
    
    if (!cookieFound) {
      const errorMsg = expectedValue 
        ? `Expected cookie '${cookieName}' with value '${expectedValue}' to be set`
        : `Expected cookie '${cookieName}' to be set`;
      throw new Error(message || errorMsg);
    }
    
    return this;
  }

  // ==========================================
  // CUSTOM ASSERTIONS
  // ==========================================

  /**
   * Custom assertion with user-defined logic
   * 
   * @param assertion - Custom assertion function
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  customAssertion(assertion: (response: RestifiedResponse) => boolean, message?: string): ResponseAssertions {
    const result = assertion(this.response);
    
    if (!result) {
      throw new Error(message || 'Custom assertion failed');
    }
    
    return this;
  }

  /**
   * Assert response matches all conditions
   * 
   * @param conditions - Array of condition functions
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  matchesAllConditions(conditions: Array<(response: RestifiedResponse) => boolean>, message?: string): ResponseAssertions {
    const failedConditions = conditions.filter(condition => !condition(this.response));
    
    if (failedConditions.length > 0) {
      throw new Error(message || `${failedConditions.length} out of ${conditions.length} conditions failed`);
    }
    
    return this;
  }

  /**
   * Assert response matches at least one condition
   * 
   * @param conditions - Array of condition functions
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  matchesAnyCondition(conditions: Array<(response: RestifiedResponse) => boolean>, message?: string): ResponseAssertions {
    const matchingConditions = conditions.filter(condition => condition(this.response));
    
    if (matchingConditions.length === 0) {
      throw new Error(message || 'None of the provided conditions were met');
    }
    
    return this;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Get the actual response object
   * 
   * @returns RestifiedResponse object
   */
  getResponse(): RestifiedResponse {
    return this.response;
  }

  /**
   * Get JSON assertions instance for advanced JSON validation
   * 
   * @returns JsonAssertions instance
   */
  json(): JsonAssertions {
    return this.jsonAssertions;
  }

  /**
   * Get response summary for debugging
   * 
   * @returns Response summary object
   */
  getSummary(): ResponseSummary {
    return {
      status: this.response.status,
      statusText: this.response.statusText,
      contentType: this.getHeaderValue('content-type'),
      responseTime: this.response.responseTime,
      bodySize: this.getBodySize(),
      headerCount: Object.keys(this.response.headers).length
    };
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  /**
   * Get header value (case-insensitive)
   */
  private getHeaderValue(headerName: string): string | undefined {
    const lowerHeaderName = headerName.toLowerCase();
    const matchingKey = Object.keys(this.response.headers).find(
      key => key.toLowerCase() === lowerHeaderName
    );
    return matchingKey ? this.response.headers[matchingKey] : undefined;
  }

  /**
   * Get approximate body size
   */
  private getBodySize(): number {
    if (this.response.data === null || this.response.data === undefined) {
      return 0;
    }
    
    if (typeof this.response.data === 'string') {
      return this.response.data.length;
    }
    
    try {
      return JSON.stringify(this.response.data).length;
    } catch (error) {
      return 0;
    }
  }
}

/**
 * Factory function for creating response assertions
 * 
 * @param response - RestifiedResponse object
 * @returns ResponseAssertions instance
 */
export function assertResponse(response: RestifiedResponse): ResponseAssertions {
  return new ResponseAssertions(response);
}

/**
 * Response summary interface
 */
export interface ResponseSummary {
  status: number;
  statusText: string;
  contentType?: string;
  responseTime: number;
  bodySize: number;
  headerCount: number;
}