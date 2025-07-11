// src/assertions/ChaiExtensions.ts

import { expect as chaiExpect, use } from 'chai';
import { RestifiedResponse } from '../types/RestifiedTypes';
import { JsonPathExtractor } from '../utils/JsonPathExtractor';

/**
 * Custom Chai extensions for RestifiedTS
 * Provides fluent assertions for HTTP responses, JSON data, and API testing scenarios
 * 
 * @example
 * ```typescript
 * import { expect } from '@assertions/ChaiExtensions';
 * 
 * expect(response).to.have.statusCode(200);
 * expect(response).to.have.jsonPath('$.user.name', 'John Doe');
 * expect(response.data).to.have.jsonSchema(userSchema);
 * expect(response).to.have.responseTime.below(1000);
 * ```
 */

declare global {
  namespace Chai {
    interface Assertion {
      statusCode(expected: number): Assertion;
      statusCodeIn(expected: number[]): Assertion;
      contentType(expected: string): Assertion;
      responseTime: Assertion;
      header(key: string, value?: string): Assertion;
      jsonPath(path: string, expected?: any): Assertion;
      jsonSchema(schema: any): Assertion;
      jsonType(path: string, expectedType: string): Assertion;
      jsonContaining(expected: any): Assertion;
      jsonLength(path: string, expected: number): Assertion;
      validJSON(): Assertion;
      validXML(): Assertion;
      validEmail(): Assertion;
      validURL(): Assertion;
      validUUID(): Assertion;
      validISO8601(): Assertion;
      empty(): Assertion;
      ascendingOrder(path?: string): Assertion;
      descendingOrder(path?: string): Assertion;
      uniqueItems(path?: string): Assertion;
      base64Encoded(): Assertion;
      httpSuccess(): Assertion;
      httpError(): Assertion;
      httpRedirect(): Assertion;
    }
  }
}

/**
 * RestifiedTS Chai plugin
 */
const restifiedChaiPlugin = (chai: any, utils: any) => {
  const { Assertion } = chai;
  const jsonPathExtractor = new JsonPathExtractor();

  /**
   * Assert HTTP status code
   */
  Assertion.addMethod('statusCode', function(expected: number) {
    const response = this._obj as RestifiedResponse;
    
    this.assert(
      response && typeof response.status === 'number',
      'expected #{this} to be a RestifiedResponse with status code',
      'expected #{this} not to be a RestifiedResponse with status code'
    );

    this.assert(
      response.status === expected,
      `expected status code to be ${expected} but got ${response.status}`,
      `expected status code not to be ${expected}`,
      expected,
      response.status
    );
  });

  /**
   * Assert status code is one of the provided values
   */
  Assertion.addMethod('statusCodeIn', function(expected: number[]) {
    const response = this._obj as RestifiedResponse;
    
    this.assert(
      response && typeof response.status === 'number',
      'expected #{this} to be a RestifiedResponse with status code',
      'expected #{this} not to be a RestifiedResponse with status code'
    );

    this.assert(
      expected.includes(response.status),
      `expected status code to be one of [${expected.join(', ')}] but got ${response.status}`,
      `expected status code not to be one of [${expected.join(', ')}]`,
      expected,
      response.status
    );
  });

  /**
   * Assert content type
   */
  Assertion.addMethod('contentType', function(expected: string) {
    const response = this._obj as RestifiedResponse;
    
    this.assert(
      response && response.headers,
      'expected #{this} to be a RestifiedResponse with headers',
      'expected #{this} not to be a RestifiedResponse with headers'
    );

    const contentType = getHeaderValue(response.headers, 'content-type') || '';

    this.assert(
      contentType.includes(expected),
      `expected content-type to include '${expected}' but got '${contentType}'`,
      `expected content-type not to include '${expected}'`,
      expected,
      contentType
    );
  });

  /**
   * Assert response time (chainable property)
   */
  Object.defineProperty(Assertion.prototype, 'responseTime', {
    get: function() {
      const response = this._obj as RestifiedResponse;
      
      this.assert(
        response && typeof response.responseTime === 'number',
        'expected #{this} to be a RestifiedResponse with responseTime',
        'expected #{this} not to be a RestifiedResponse with responseTime'
      );

      // Return a new assertion for the response time value
      return chaiExpect(response.responseTime);
    }
  });

  /**
   * Assert header value
   */
  Assertion.addMethod('header', function(key: string, expected?: string) {
    const response = this._obj as RestifiedResponse;
    
    this.assert(
      response && response.headers,
      'expected #{this} to be a RestifiedResponse with headers',
      'expected #{this} not to be a RestifiedResponse with headers'
    );

    const headerValue = getHeaderValue(response.headers, key);

    if (expected === undefined) {
      // Just check if header exists
      this.assert(
        headerValue !== undefined,
        `expected header '${key}' to exist`,
        `expected header '${key}' not to exist`,
        true,
        false
      );
    } else {
      // Check header value
      this.assert(
        headerValue === expected,
        `expected header '${key}' to have value '${expected}' but got '${headerValue}'`,
        `expected header '${key}' not to have value '${expected}'`,
        expected,
        headerValue
      );
    }
  });

  /**
   * Assert JSONPath value
   */
  Assertion.addMethod('jsonPath', function(path: string, expected?: any) {
    const obj = this._obj;
    let data: any;

    // Handle both RestifiedResponse and direct data
    if (obj && obj.data !== undefined) {
      data = obj.data;
    } else {
      data = obj;
    }

    let extractedValue: any;
    try {
      extractedValue = jsonPathExtractor.extract(data, path);
    } catch (error) {
      this.assert(
        false,
        `JSONPath extraction failed: ${(error as Error).message}`,
        `JSONPath extraction should have failed but succeeded`,
        undefined,
        undefined
      );
      return;
    }

    if (expected === undefined) {
      // Just check if path exists
      this.assert(
        extractedValue !== undefined,
        `expected JSONPath '${path}' to exist`,
        `expected JSONPath '${path}' not to exist`,
        true,
        false
      );
    } else if (typeof expected === 'function') {
      // Custom assertion function
      this.assert(
        expected(extractedValue),
        `expected JSONPath '${path}' value to pass custom assertion`,
        `expected JSONPath '${path}' value not to pass custom assertion`,
        true,
        false
      );
    } else {
      // Direct value comparison
      this.assert(
        utils.eql(extractedValue, expected),
        `expected JSONPath '${path}' to have value #{exp} but got #{act}`,
        `expected JSONPath '${path}' not to have value #{exp}`,
        expected,
        extractedValue
      );
    }
  });

  /**
   * Assert JSON schema compliance
   */
  Assertion.addMethod('jsonSchema', function(schema: any) {
    const obj = this._obj;
    let data: any;

    if (obj && obj.data !== undefined) {
      data = obj.data;
    } else {
      data = obj;
    }

    const isValid = validateJsonSchema(data, schema);

    this.assert(
      isValid.valid,
      `expected data to match JSON schema but got validation errors: ${isValid.errors.join(', ')}`,
      `expected data not to match JSON schema`,
      true,
      false
    );
  });

  /**
   * Assert JSONPath value type
   */
  Assertion.addMethod('jsonType', function(path: string, expectedType: string) {
    const obj = this._obj;
    let data: any;

    if (obj && obj.data !== undefined) {
      data = obj.data;
    } else {
      data = obj;
    }

    const extractedValue = jsonPathExtractor.extract(data, path);
    const actualType = getJavaScriptType(extractedValue);

    this.assert(
      actualType === expectedType,
      `expected JSONPath '${path}' to have type '${expectedType}' but got '${actualType}'`,
      `expected JSONPath '${path}' not to have type '${expectedType}'`,
      expectedType,
      actualType
    );
  });

  /**
   * Assert JSON contains values (deep partial match)
   */
  Assertion.addMethod('jsonContaining', function(expected: any) {
    const obj = this._obj;
    let data: any;

    if (obj && obj.data !== undefined) {
      data = obj.data;
    } else {
      data = obj;
    }

    const contains = deepContains(data, expected);

    this.assert(
      contains,
      `expected JSON to contain #{exp} but it was not found`,
      `expected JSON not to contain #{exp}`,
      expected,
      data
    );
  });

  /**
   * Assert array length at JSONPath
   */
  Assertion.addMethod('jsonLength', function(path: string, expected: number) {
    const obj = this._obj;
    let data: any;

    if (obj && obj.data !== undefined) {
      data = obj.data;
    } else {
      data = obj;
    }

    const extractedValue = jsonPathExtractor.extract(data, path);

    this.assert(
      Array.isArray(extractedValue),
      `expected JSONPath '${path}' to return an array`,
      `expected JSONPath '${path}' not to return an array`,
      true,
      false
    );

    this.assert(
      extractedValue.length === expected,
      `expected array at JSONPath '${path}' to have length ${expected} but got ${extractedValue.length}`,
      `expected array at JSONPath '${path}' not to have length ${expected}`,
      expected,
      extractedValue.length
    );
  });

  /**
   * Assert valid JSON string
   */
  Assertion.addMethod('validJSON', function() {
    const str = this._obj;

    this.assert(
      typeof str === 'string',
      'expected #{this} to be a string',
      'expected #{this} not to be a string'
    );

    let isValid = false;
    try {
      JSON.parse(str);
      isValid = true;
    } catch (error) {
      // Invalid JSON
    }

    this.assert(
      isValid,
      'expected #{this} to be valid JSON',
      'expected #{this} not to be valid JSON'
    );
  });

  /**
   * Assert valid XML string
   */
  Assertion.addMethod('validXML', function() {
    const str = this._obj;

    this.assert(
      typeof str === 'string',
      'expected #{this} to be a string',
      'expected #{this} not to be a string'
    );

    const isValid = isValidXML(str);

    this.assert(
      isValid,
      'expected #{this} to be valid XML',
      'expected #{this} not to be valid XML'
    );
  });

  /**
   * Assert valid email format
   */
  Assertion.addMethod('validEmail', function() {
    const str = this._obj;

    this.assert(
      typeof str === 'string',
      'expected #{this} to be a string',
      'expected #{this} not to be a string'
    );

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(str);

    this.assert(
      isValid,
      'expected #{this} to be a valid email address',
      'expected #{this} not to be a valid email address'
    );
  });

  /**
   * Assert valid URL format
   */
  Assertion.addMethod('validURL', function() {
    const str = this._obj;

    this.assert(
      typeof str === 'string',
      'expected #{this} to be a string',
      'expected #{this} not to be a string'
    );

    let isValid = false;
    try {
      new URL(str);
      isValid = true;
    } catch (error) {
      // Invalid URL
    }

    this.assert(
      isValid,
      'expected #{this} to be a valid URL',
      'expected #{this} not to be a valid URL'
    );
  });

  /**
   * Assert valid UUID format
   */
  Assertion.addMethod('validUUID', function() {
    const str = this._obj;

    this.assert(
      typeof str === 'string',
      'expected #{this} to be a string',
      'expected #{this} not to be a string'
    );

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(str);

    this.assert(
      isValid,
      'expected #{this} to be a valid UUID',
      'expected #{this} not to be a valid UUID'
    );
  });

  /**
   * Assert valid ISO8601 date format
   */
  Assertion.addMethod('validISO8601', function() {
    const str = this._obj;

    this.assert(
      typeof str === 'string',
      'expected #{this} to be a string',
      'expected #{this} not to be a string'
    );

    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    const isValid = iso8601Regex.test(str);

    this.assert(
      isValid,
      'expected #{this} to be a valid ISO8601 date',
      'expected #{this} not to be a valid ISO8601 date'
    );
  });

  /**
   * Assert array is in ascending order
   */
  Assertion.addMethod('ascendingOrder', function(path?: string) {
    let arr = this._obj;

    if (path) {
      arr = jsonPathExtractor.extract(this._obj, path);
    }

    this.assert(
      Array.isArray(arr),
      'expected #{this} to be an array',
      'expected #{this} not to be an array'
    );

    const isAscending = arr.every((val: any, i: number) => 
      i === 0 || arr[i - 1] <= val
    );

    this.assert(
      isAscending,
      'expected array to be in ascending order',
      'expected array not to be in ascending order'
    );
  });

  /**
   * Assert array is in descending order
   */
  Assertion.addMethod('descendingOrder', function(path?: string) {
    let arr = this._obj;

    if (path) {
      arr = jsonPathExtractor.extract(this._obj, path);
    }

    this.assert(
      Array.isArray(arr),
      'expected #{this} to be an array',
      'expected #{this} not to be an array'
    );

    const isDescending = arr.every((val: any, i: number) => 
      i === 0 || arr[i - 1] >= val
    );

    this.assert(
      isDescending,
      'expected array to be in descending order',
      'expected array not to be in descending order'
    );
  });

  /**
   * Assert array has unique items
   */
  Assertion.addMethod('uniqueItems', function(path?: string) {
    let arr = this._obj;

    if (path) {
      arr = jsonPathExtractor.extract(this._obj, path);
    }

    this.assert(
      Array.isArray(arr),
      'expected #{this} to be an array',
      'expected #{this} not to be an array'
    );

    const uniqueItems = new Set(arr.map((item: any) => JSON.stringify(item)));
    const hasUniqueItems = uniqueItems.size === arr.length;

    this.assert(
      hasUniqueItems,
      'expected array to have unique items',
      'expected array not to have unique items'
    );
  });

  /**
   * Assert string is base64 encoded
   */
  Assertion.addMethod('base64Encoded', function() {
    const str = this._obj;

    this.assert(
      typeof str === 'string',
      'expected #{this} to be a string',
      'expected #{this} not to be a string'
    );

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    const isValid = base64Regex.test(str) && str.length % 4 === 0;

    this.assert(
      isValid,
      'expected #{this} to be base64 encoded',
      'expected #{this} not to be base64 encoded'
    );
  });

  /**
   * Assert HTTP success status (2xx)
   */
  Assertion.addMethod('httpSuccess', function() {
    const response = this._obj as RestifiedResponse;
    
    this.assert(
      response && typeof response.status === 'number',
      'expected #{this} to be a RestifiedResponse with status code',
      'expected #{this} not to be a RestifiedResponse with status code'
    );

    const isSuccess = response.status >= 200 && response.status < 300;

    this.assert(
      isSuccess,
      `expected HTTP status to be successful (2xx) but got ${response.status}`,
      `expected HTTP status not to be successful (2xx) but got ${response.status}`,
      '2xx',
      response.status
    );
  });

  /**
   * Assert HTTP error status (4xx or 5xx)
   */
  Assertion.addMethod('httpError', function() {
    const response = this._obj as RestifiedResponse;
    
    this.assert(
      response && typeof response.status === 'number',
      'expected #{this} to be a RestifiedResponse with status code',
      'expected #{this} not to be a RestifiedResponse with status code'
    );

    const isError = response.status >= 400;

    this.assert(
      isError,
      `expected HTTP status to be an error (4xx or 5xx) but got ${response.status}`,
      `expected HTTP status not to be an error (4xx or 5xx) but got ${response.status}`,
      '4xx or 5xx',
      response.status
    );
  });

  /**
   * Assert HTTP redirect status (3xx)
   */
  Assertion.addMethod('httpRedirect', function() {
    const response = this._obj as RestifiedResponse;
    
    this.assert(
      response && typeof response.status === 'number',
      'expected #{this} to be a RestifiedResponse with status code',
      'expected #{this} not to be a RestifiedResponse with status code'
    );

    const isRedirect = response.status >= 300 && response.status < 400;

    this.assert(
      isRedirect,
      `expected HTTP status to be a redirect (3xx) but got ${response.status}`,
      `expected HTTP status not to be a redirect (3xx) but got ${response.status}`,
      '3xx',
      response.status
    );
  });
};

// Helper functions

/**
 * Get header value (case-insensitive)
 */
function getHeaderValue(headers: Record<string, string>, key: string): string | undefined {
  const lowerKey = key.toLowerCase();
  const matchingKey = Object.keys(headers).find(
    headerKey => headerKey.toLowerCase() === lowerKey
  );
  return matchingKey ? headers[matchingKey] : undefined;
}

/**
 * Get JavaScript type of value
 */
function getJavaScriptType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  return typeof value;
}

/**
 * Check if object deeply contains expected properties
 */
function deepContains(obj: any, expected: any): boolean {
  if (expected === null || expected === undefined) {
    return obj === expected;
  }

  if (typeof expected !== 'object') {
    return obj === expected;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(obj)) return false;
    return expected.every(expectedItem => 
      obj.some((objItem: any) => deepContains(objItem, expectedItem))
    );
  }

  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  return Object.keys(expected).every(key => {
    if (!(key in obj)) return false;
    return deepContains(obj[key], expected[key]);
  });
}

/**
 * Simplified JSON schema validation
 */
function validateJsonSchema(data: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (schema.type) {
    const actualType = getJavaScriptType(data);
    if (actualType !== schema.type) {
      errors.push(`Expected type '${schema.type}' but got '${actualType}'`);
    }
  }

  if (schema.properties && typeof data === 'object' && data !== null) {
    Object.keys(schema.properties).forEach(key => {
      if (schema.required && schema.required.includes(key) && !(key in data)) {
        errors.push(`Required property '${key}' is missing`);
      }
      if (key in data) {
        const result = validateJsonSchema(data[key], schema.properties[key]);
        errors.push(...result.errors.map(err => `${key}.${err}`));
      }
    });
  }

  if (schema.items && Array.isArray(data)) {
    data.forEach((item, index) => {
      const result = validateJsonSchema(item, schema.items);
      errors.push(...result.errors.map(err => `[${index}].${err}`));
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if string is valid XML
 */
function isValidXML(str: string): boolean {
  try {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(str, 'text/xml');
      return !doc.querySelector('parsererror');
    } else {
      // Basic XML validation for Node.js
      const xmlRegex = /^<\?xml.*\?>|^<[^>]+>/;
      return xmlRegex.test(str.trim()) && str.includes('<') && str.includes('>');
    }
  } catch (error) {
    return false;
  }
}

// Register the plugin
use(restifiedChaiPlugin);

// Export enhanced expect
export const expect = chaiExpect;

// Export the plugin for manual registration if needed
export { restifiedChaiPlugin as ChaiExtensions };