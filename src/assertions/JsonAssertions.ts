// src/assertions/JsonAssertions.ts

import { expect } from './ChaiExtensions';
import { JsonPathExtractor } from '../utils/JsonPathExtractor';
import { ValidationUtils } from '../utils/ValidationUtils';

/**
 * JSON-specific assertion utilities for deep validation and complex checks
 * 
 * Features:
 * - Schema validation with detailed error reporting
 * - JSONPath-based assertions with custom matchers
 * - Deep object comparison and partial matching
 * - Array validation (ordering, uniqueness, filtering)
 * - Format validation (dates, emails, UUIDs, etc.)
 * - Performance-optimized assertions
 * 
 * @example
 * ```typescript
 * const assertions = new JsonAssertions(responseData);
 * 
 * assertions
 *   .hasPath('$.users[*].id')
 *   .pathEquals('$.users[0].name', 'John Doe')
 *   .pathMatches('$.users[*].email', /^[\w.-]+@[\w.-]+\.\w+$/)
 *   .arrayLengthEquals('$.users', 3)
 *   .hasUniqueValues('$.users[*].id')
 *   .isAscendingOrder('$.users[*].createdAt')
 *   .matchesSchema(userListSchema);
 * ```
 */
export class JsonAssertions {
  private readonly jsonPathExtractor: JsonPathExtractor;
  private readonly data: any;

  constructor(data: any) {
    this.data = data;
    this.jsonPathExtractor = new JsonPathExtractor();
  }

  /**
   * Assert that a JSONPath exists
   * 
   * @param path - JSONPath expression
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasPath(path: string, message?: string): JsonAssertions {
    const exists = this.jsonPathExtractor.exists(this.data, path);
    
    if (!exists) {
      throw new Error(message || `Expected JSONPath '${path}' to exist in data`);
    }
    
    return this;
  }

  /**
   * Assert that a JSONPath does not exist
   * 
   * @param path - JSONPath expression
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  doesNotHavePath(path: string, message?: string): JsonAssertions {
    const exists = this.jsonPathExtractor.exists(this.data, path);
    
    if (exists) {
      throw new Error(message || `Expected JSONPath '${path}' not to exist in data`);
    }
    
    return this;
  }

  /**
   * Assert JSONPath value equals expected value
   * 
   * @param path - JSONPath expression
   * @param expected - Expected value
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  pathEquals(path: string, expected: any, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    try {
      expect(value).to.deep.equal(expected);
    } catch (error) {
      throw new Error(message || `JSONPath '${path}': ${(error as Error).message}`);
    }
    
    return this;
  }

  /**
   * Assert JSONPath value matches a pattern or custom matcher
   * 
   * @param path - JSONPath expression
   * @param matcher - RegExp pattern or custom matcher function
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  pathMatches(path: string, matcher: RegExp | ((value: any) => boolean), message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    let matches: boolean;
    if (matcher instanceof RegExp) {
      matches = matcher.test(String(value));
    } else {
      matches = matcher(value);
    }
    
    if (!matches) {
      throw new Error(message || `JSONPath '${path}' value '${value}' does not match the expected pattern/matcher`);
    }
    
    return this;
  }

  /**
   * Assert JSONPath value is of specific type
   * 
   * @param path - JSONPath expression
   * @param expectedType - Expected JavaScript type
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  pathType(path: string, expectedType: string, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    const actualType = this.getValueType(value);
    
    if (actualType !== expectedType) {
      throw new Error(message || `JSONPath '${path}' expected type '${expectedType}' but got '${actualType}'`);
    }
    
    return this;
  }

  /**
   * Assert array length at JSONPath
   * 
   * @param path - JSONPath expression pointing to an array
   * @param expectedLength - Expected array length
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  arrayLengthEquals(path: string, expectedLength: number, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (!Array.isArray(value)) {
      throw new Error(message || `JSONPath '${path}' does not point to an array`);
    }
    
    if (value.length !== expectedLength) {
      throw new Error(message || `JSONPath '${path}' array length expected ${expectedLength} but got ${value.length}`);
    }
    
    return this;
  }

  /**
   * Assert array length is within range
   * 
   * @param path - JSONPath expression pointing to an array
   * @param min - Minimum length (inclusive)
   * @param max - Maximum length (inclusive)
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  arrayLengthBetween(path: string, min: number, max: number, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (!Array.isArray(value)) {
      throw new Error(message || `JSONPath '${path}' does not point to an array`);
    }
    
    if (value.length < min || value.length > max) {
      throw new Error(message || `JSONPath '${path}' array length ${value.length} is not between ${min} and ${max}`);
    }
    
    return this;
  }

  /**
   * Assert array contains specific value
   * 
   * @param path - JSONPath expression pointing to an array
   * @param expected - Expected value to find in array
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  arrayContains(path: string, expected: any, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (!Array.isArray(value)) {
      throw new Error(message || `JSONPath '${path}' does not point to an array`);
    }
    
    const contains = value.some(item => this.deepEquals(item, expected));
    
    if (!contains) {
      throw new Error(message || `JSONPath '${path}' array does not contain expected value: ${JSON.stringify(expected)}`);
    }
    
    return this;
  }

  /**
   * Assert array has unique values
   * 
   * @param path - JSONPath expression pointing to an array
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasUniqueValues(path: string, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (!Array.isArray(value)) {
      throw new Error(message || `JSONPath '${path}' does not point to an array`);
    }
    
    const uniqueValues = new Set(value.map(item => JSON.stringify(item)));
    
    if (uniqueValues.size !== value.length) {
      throw new Error(message || `JSONPath '${path}' array contains duplicate values`);
    }
    
    return this;
  }

  /**
   * Assert array is in ascending order
   * 
   * @param path - JSONPath expression pointing to an array
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  isAscendingOrder(path: string, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (!Array.isArray(value)) {
      throw new Error(message || `JSONPath '${path}' does not point to an array`);
    }
    
    const isAscending = value.every((item, index) => 
      index === 0 || this.compareValues(value[index - 1], item) <= 0
    );
    
    if (!isAscending) {
      throw new Error(message || `JSONPath '${path}' array is not in ascending order`);
    }
    
    return this;
  }

  /**
   * Assert array is in descending order
   * 
   * @param path - JSONPath expression pointing to an array
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  isDescendingOrder(path: string, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (!Array.isArray(value)) {
      throw new Error(message || `JSONPath '${path}' does not point to an array`);
    }
    
    const isDescending = value.every((item, index) => 
      index === 0 || this.compareValues(value[index - 1], item) >= 0
    );
    
    if (!isDescending) {
      throw new Error(message || `JSONPath '${path}' array is not in descending order`);
    }
    
    return this;
  }

  /**
   * Assert all array items match a condition
   * 
   * @param path - JSONPath expression pointing to an array
   * @param condition - Function that should return true for all items
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  allItemsMatch(path: string, condition: (item: any, index: number) => boolean, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (!Array.isArray(value)) {
      throw new Error(message || `JSONPath '${path}' does not point to an array`);
    }
    
    const allMatch = value.every(condition);
    
    if (!allMatch) {
      throw new Error(message || `Not all items in JSONPath '${path}' array match the condition`);
    }
    
    return this;
  }

  /**
   * Assert at least one array item matches a condition
   * 
   * @param path - JSONPath expression pointing to an array
   * @param condition - Function that should return true for at least one item
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  someItemsMatch(path: string, condition: (item: any, index: number) => boolean, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (!Array.isArray(value)) {
      throw new Error(message || `JSONPath '${path}' does not point to an array`);
    }
    
    const someMatch = value.some(condition);
    
    if (!someMatch) {
      throw new Error(message || `No items in JSONPath '${path}' array match the condition`);
    }
    
    return this;
  }

  /**
   * Assert JSON data matches a schema
   * 
   * @param schema - JSON schema to validate against
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  matchesSchema(schema: any, message?: string): JsonAssertions {
    const result = ValidationUtils.validateSchema(this.data, schema);
    
    if (!result.isValid) {
      const errorMessage = message || `JSON schema validation failed: ${result.errors.map(e => e.message).join(', ')}`;
      throw new Error(errorMessage);
    }
    
    return this;
  }

  /**
   * Assert object has all required properties
   * 
   * @param path - JSONPath expression pointing to an object
   * @param requiredProperties - Array of required property names
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  hasRequiredProperties(path: string, requiredProperties: string[], message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(message || `JSONPath '${path}' does not point to an object`);
    }
    
    const missingProperties = requiredProperties.filter(prop => !(prop in value));
    
    if (missingProperties.length > 0) {
      throw new Error(message || `JSONPath '${path}' object is missing required properties: ${missingProperties.join(', ')}`);
    }
    
    return this;
  }

  /**
   * Assert string value matches format
   * 
   * @param path - JSONPath expression pointing to a string
   * @param format - Format type (email, url, uuid, date, etc.)
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  stringFormat(path: string, format: 'email' | 'url' | 'uuid' | 'date' | 'iso8601' | 'base64', message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (typeof value !== 'string') {
      throw new Error(message || `JSONPath '${path}' does not point to a string`);
    }
    
    let isValid: boolean;
    
    switch (format) {
      case 'email':
        isValid = ValidationUtils.isValidEmail(value);
        break;
      case 'url':
        isValid = ValidationUtils.isValidURL(value);
        break;
      case 'uuid':
        isValid = ValidationUtils.isValidUUID(value);
        break;
      case 'date':
      case 'iso8601':
        isValid = ValidationUtils.isValidDate(value, 'ISO');
        break;
      case 'base64':
        isValid = /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length % 4 === 0;
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
    
    if (!isValid) {
      throw new Error(message || `JSONPath '${path}' value '${value}' is not a valid ${format}`);
    }
    
    return this;
  }

  /**
   * Assert numeric value is within range
   * 
   * @param path - JSONPath expression pointing to a number
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  numberInRange(path: string, min: number, max: number, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (typeof value !== 'number') {
      throw new Error(message || `JSONPath '${path}' does not point to a number`);
    }
    
    if (value < min || value > max) {
      throw new Error(message || `JSONPath '${path}' value ${value} is not between ${min} and ${max}`);
    }
    
    return this;
  }

  /**
   * Assert date value is within time range
   * 
   * @param path - JSONPath expression pointing to a date string
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  dateInRange(path: string, startDate: Date, endDate: Date, message?: string): JsonAssertions {
    const value = this.jsonPathExtractor.extract(this.data, path);
    
    if (typeof value !== 'string') {
      throw new Error(message || `JSONPath '${path}' does not point to a string`);
    }
    
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      throw new Error(message || `JSONPath '${path}' value '${value}' is not a valid date`);
    }
    
    if (date < startDate || date > endDate) {
      throw new Error(message || `JSONPath '${path}' date ${value} is not between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    }
    
    return this;
  }

  /**
   * Custom assertion with user-defined logic
   * 
   * @param assertion - Custom assertion function
   * @param message - Optional custom error message
   * @returns Self for chaining
   */
  customAssertion(assertion: (data: any) => boolean, message?: string): JsonAssertions {
    const result = assertion(this.data);
    
    if (!result) {
      throw new Error(message || 'Custom assertion failed');
    }
    
    return this;
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    return typeof value;
  }

  private deepEquals(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return obj1 === obj2;
    
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
    
    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) return false;
      return obj1.every((item, index) => this.deepEquals(item, obj2[index]));
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => 
      keys2.includes(key) && this.deepEquals(obj1[key], obj2[key])
    );
  }

  private compareValues(a: any, b: any): number {
    if (a === b) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    
    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    
    // Handle numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    
    // Handle strings
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    
    // Convert to strings for comparison
    return String(a).localeCompare(String(b));
  }
}

/**
 * Factory function for creating JSON assertions
 * 
 * @param data - JSON data to assert against
 * @returns JsonAssertions instance
 */
export function assertJson(data: any): JsonAssertions {
  return new JsonAssertions(data);
}

/**
 * Convenience function for asserting response JSON
 * 
 * @param response - RestifiedResponse object
 * @returns JsonAssertions instance for response data
 */
export function assertResponseJson(response: any): JsonAssertions {
  const data = response && response.data !== undefined ? response.data : response;
  return new JsonAssertions(data);
}