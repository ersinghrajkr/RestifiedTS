/**
 * Response Assertions for RestifiedTS
 * 
 * This module provides specialized assertion utilities for HTTP responses,
 * including JSON path, XML path, headers, status codes, and response time assertions.
 */

import { RestifiedResponse } from '../types/RestifiedTypes';
import { AssertionEngine } from './AssertionEngine';
import { 
  AssertionResult, 
  JsonPathAssertion, 
  XmlPathAssertion, 
  HeaderAssertion, 
  StatusCodeAssertion, 
  ContentTypeAssertion, 
  CookieAssertion,
  ResponseTimeAssertion,
  AssertionType
} from './AssertionTypes';
import * as jsonpath from 'jsonpath';
import { XMLParser } from 'fast-xml-parser';

/**
 * Response assertion utilities
 */
export class ResponseAssertions {
  private engine: AssertionEngine;
  private response: RestifiedResponse;
  private xmlParser: XMLParser;

  constructor(response: RestifiedResponse, engine?: AssertionEngine) {
    this.response = response;
    this.engine = engine || new AssertionEngine();
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true
    });
  }

  /**
   * Assert status code
   */
  async assertStatusCode(expected: number | number[], options?: any): Promise<AssertionResult> {
    const actual = this.response.status;
    const expectedArray = Array.isArray(expected) ? expected : [expected];
    const success = expectedArray.includes(actual);
    
    return this.engine.assert(
      AssertionType.EQUALS,
      actual,
      expected,
      {
        ...options,
        customMessage: success
          ? `Status code is ${actual}`
          : `Expected status code ${expectedArray.join(' or ')}, but got ${actual}`
      }
    );
  }

  /**
   * Assert status code is in range
   */
  async assertStatusCodeInRange(min: number, max: number, options?: any): Promise<AssertionResult> {
    const actual = this.response.status;
    const success = actual >= min && actual <= max;
    
    return {
      success,
      message: success
        ? `Status code ${actual} is in range ${min}-${max}`
        : `Status code ${actual} is not in range ${min}-${max}`,
      actual,
      expected: `${min}-${max}`,
      timestamp: new Date()
    };
  }

  /**
   * Assert response time
   */
  async assertResponseTime(assertion: ResponseTimeAssertion, options?: any): Promise<AssertionResult> {
    const actual = this.response.responseTime || 0;
    let expectedMs = assertion.maxTime;
    
    switch (assertion.unit) {
      case 's':
        expectedMs = assertion.maxTime * 1000;
        break;
      case 'min':
        expectedMs = assertion.maxTime * 60 * 1000;
        break;
      case 'ms':
      default:
        expectedMs = assertion.maxTime;
    }

    const tolerance = assertion.tolerance || 0;
    const success = actual <= (expectedMs + tolerance);
    
    return {
      success,
      message: success
        ? `Response time ${actual}ms is within limit ${expectedMs}ms`
        : `Response time ${actual}ms exceeds limit ${expectedMs}ms`,
      actual,
      expected: expectedMs,
      timestamp: new Date()
    };
  }

  /**
   * Assert header value
   */
  async assertHeader(assertion: HeaderAssertion, options?: any): Promise<AssertionResult> {
    const actual = this.response.headers?.[assertion.name.toLowerCase()];
    
    if (assertion.type === AssertionType.HAS_PROPERTY) {
      const success = actual !== undefined;
      return {
        success,
        message: success
          ? `Header '${assertion.name}' exists`
          : `Header '${assertion.name}' does not exist`,
        actual,
        expected: assertion.expected,
        timestamp: new Date()
      };
    }

    return this.engine.assert(
      assertion.type,
      actual,
      assertion.expected,
      { ...options, ...assertion.options }
    );
  }

  /**
   * Assert content type
   */
  async assertContentType(assertion: ContentTypeAssertion, options?: any): Promise<AssertionResult> {
    const contentType = this.response.headers?.['content-type'] || '';
    const success = contentType.includes(assertion.type);
    
    let message = success
      ? `Content type contains '${assertion.type}'`
      : `Content type '${contentType}' does not contain '${assertion.type}'`;
    
    if (assertion.charset) {
      const charsetMatch = contentType.includes(`charset=${assertion.charset}`);
      if (!charsetMatch) {
        return {
          success: false,
          message: `Content type charset '${assertion.charset}' not found in '${contentType}'`,
          actual: contentType,
          expected: assertion.charset,
          timestamp: new Date()
        };
      }
    }
    
    return {
      success,
      message,
      actual: contentType,
      expected: assertion.type,
      timestamp: new Date()
    };
  }

  /**
   * Assert cookie
   */
  async assertCookie(assertion: CookieAssertion, options?: any): Promise<AssertionResult> {
    const setCookieHeader = this.response.headers?.['set-cookie'];
    if (!setCookieHeader) {
      return {
        success: false,
        message: 'No cookies found in response',
        actual: undefined,
        expected: assertion.name,
        timestamp: new Date()
      };
    }

    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const targetCookie = cookies.find(cookie => cookie.includes(`${assertion.name}=`));
    
    if (!targetCookie) {
      return {
        success: false,
        message: `Cookie '${assertion.name}' not found`,
        actual: cookies,
        expected: assertion.name,
        timestamp: new Date()
      };
    }

    // Parse cookie attributes
    const cookieParts = targetCookie.split(';').map(part => part.trim());
    const nameValue = cookieParts[0].split('=');
    const cookieName = nameValue[0];
    const cookieValue = nameValue[1];

    // Check value if specified
    if (assertion.value !== undefined) {
      const success = cookieValue === assertion.value;
      return {
        success,
        message: success
          ? `Cookie '${cookieName}' has expected value`
          : `Cookie '${cookieName}' has value '${cookieValue}', expected '${assertion.value}'`,
        actual: cookieValue,
        expected: assertion.value,
        timestamp: new Date()
      };
    }

    return {
      success: true,
      message: `Cookie '${cookieName}' found`,
      actual: cookieValue,
      timestamp: new Date()
    };
  }

  /**
   * Assert JSON path
   */
  async assertJsonPath(assertion: JsonPathAssertion, options?: any): Promise<AssertionResult> {
    try {
      const data = typeof this.response.data === 'string' 
        ? JSON.parse(this.response.data)
        : this.response.data;
      
      const results = jsonpath.query(data, assertion.path);
      
      if (results.length === 0) {
        return {
          success: false,
          message: `JSON path '${assertion.path}' not found`,
          actual: undefined,
          expected: assertion.expected,
          path: assertion.path,
          timestamp: new Date()
        };
      }

      const actual = results.length === 1 ? results[0] : results;
      
      if (assertion.expected === undefined) {
        return {
          success: true,
          message: `JSON path '${assertion.path}' exists`,
          actual,
          path: assertion.path,
          timestamp: new Date()
        };
      }

      return this.engine.assert(
        assertion.type,
        actual,
        assertion.expected,
        { ...options, ...assertion.options, path: assertion.path }
      );

    } catch (error) {
      return {
        success: false,
        message: `JSON path assertion failed: ${error instanceof Error ? error.message : String(error)}`,
        actual: this.response.data,
        expected: assertion.expected,
        path: assertion.path,
        timestamp: new Date()
      };
    }
  }

  /**
   * Assert XML path
   */
  async assertXmlPath(assertion: XmlPathAssertion, options?: any): Promise<AssertionResult> {
    try {
      const xmlData = typeof this.response.data === 'string'
        ? this.response.data
        : String(this.response.data);
      
      const parsedXml = this.xmlParser.parse(xmlData);
      
      // Simple XPath evaluation (basic implementation)
      const result = this.evaluateXPath(parsedXml, assertion.xpath);
      
      if (result === undefined) {
        return {
          success: false,
          message: `XML path '${assertion.xpath}' not found`,
          actual: undefined,
          expected: assertion.expected,
          path: assertion.xpath,
          timestamp: new Date()
        };
      }

      if (assertion.expected === undefined) {
        return {
          success: true,
          message: `XML path '${assertion.xpath}' exists`,
          actual: result,
          path: assertion.xpath,
          timestamp: new Date()
        };
      }

      return this.engine.assert(
        assertion.type,
        result,
        assertion.expected,
        { ...options, ...assertion.options, path: assertion.xpath }
      );

    } catch (error) {
      return {
        success: false,
        message: `XML path assertion failed: ${error instanceof Error ? error.message : String(error)}`,
        actual: this.response.data,
        expected: assertion.expected,
        path: assertion.xpath,
        timestamp: new Date()
      };
    }
  }

  /**
   * Assert response body contains text
   */
  async assertBodyContains(text: string, options?: any): Promise<AssertionResult> {
    const body = String(this.response.data);
    return this.engine.assert(
      AssertionType.CONTAINS,
      body,
      text,
      options
    );
  }

  /**
   * Assert response body matches regex
   */
  async assertBodyMatches(pattern: string | RegExp, options?: any): Promise<AssertionResult> {
    const body = String(this.response.data);
    return this.engine.assert(
      AssertionType.MATCHES,
      body,
      pattern,
      options
    );
  }

  /**
   * Assert response body is empty
   */
  async assertBodyIsEmpty(options?: any): Promise<AssertionResult> {
    return this.engine.assert(
      AssertionType.IS_EMPTY,
      this.response.data,
      undefined,
      options
    );
  }

  /**
   * Assert response body is not empty
   */
  async assertBodyIsNotEmpty(options?: any): Promise<AssertionResult> {
    return this.engine.assert(
      AssertionType.IS_NOT_EMPTY,
      this.response.data,
      undefined,
      options
    );
  }

  /**
   * Assert response body is valid JSON
   */
  async assertBodyIsValidJson(options?: any): Promise<AssertionResult> {
    return this.engine.assert(
      AssertionType.IS_VALID_JSON,
      this.response.data,
      undefined,
      options
    );
  }

  /**
   * Assert response body is valid XML
   */
  async assertBodyIsValidXml(options?: any): Promise<AssertionResult> {
    return this.engine.assert(
      AssertionType.IS_VALID_XML,
      this.response.data,
      undefined,
      options
    );
  }

  /**
   * Assert response size
   */
  async assertResponseSize(expectedSize: number, options?: any): Promise<AssertionResult> {
    const bodySize = Buffer.byteLength(String(this.response.data), 'utf8');
    return this.engine.assert(
      AssertionType.EQUALS,
      bodySize,
      expectedSize,
      options
    );
  }

  /**
   * Assert response size is less than
   */
  async assertResponseSizeLessThan(maxSize: number, options?: any): Promise<AssertionResult> {
    const bodySize = Buffer.byteLength(String(this.response.data), 'utf8');
    return this.engine.assert(
      AssertionType.LESS_THAN,
      bodySize,
      maxSize,
      options
    );
  }

  /**
   * Chain multiple assertions
   */
  async assertAll(assertions: Array<{
    type: 'statusCode' | 'header' | 'jsonPath' | 'xmlPath' | 'contentType' | 'cookie' | 'responseTime' | 'bodyContains' | 'bodyMatches';
    assertion: any;
    options?: any;
  }>): Promise<AssertionResult[]> {
    const results: AssertionResult[] = [];
    
    for (const { type, assertion, options } of assertions) {
      let result: AssertionResult;
      
      switch (type) {
        case 'statusCode':
          result = await this.assertStatusCode(assertion, options);
          break;
        case 'header':
          result = await this.assertHeader(assertion, options);
          break;
        case 'jsonPath':
          result = await this.assertJsonPath(assertion, options);
          break;
        case 'xmlPath':
          result = await this.assertXmlPath(assertion, options);
          break;
        case 'contentType':
          result = await this.assertContentType(assertion, options);
          break;
        case 'cookie':
          result = await this.assertCookie(assertion, options);
          break;
        case 'responseTime':
          result = await this.assertResponseTime(assertion, options);
          break;
        case 'bodyContains':
          result = await this.assertBodyContains(assertion, options);
          break;
        case 'bodyMatches':
          result = await this.assertBodyMatches(assertion, options);
          break;
        default:
          result = {
            success: false,
            message: `Unknown assertion type: ${type}`,
            actual: type,
            timestamp: new Date()
          };
      }
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get assertion engine
   */
  getEngine(): AssertionEngine {
    return this.engine;
  }

  /**
   * Simple XPath evaluation (basic implementation)
   */
  private evaluateXPath(data: any, xpath: string): any {
    // This is a simplified XPath evaluator
    // In a production environment, you'd want to use a proper XPath library
    const parts = xpath.split('/').filter(part => part.length > 0);
    let current = data;
    
    for (const part of parts) {
      if (part === '*') {
        // Handle wildcard
        if (typeof current === 'object' && current !== null) {
          const keys = Object.keys(current);
          if (keys.length > 0) {
            current = current[keys[0]];
          } else {
            return undefined;
          }
        } else {
          return undefined;
        }
      } else if (part.includes('[') && part.includes(']')) {
        // Handle array indexing
        const bracketIndex = part.indexOf('[');
        const elementName = part.substring(0, bracketIndex);
        const indexStr = part.substring(bracketIndex + 1, part.length - 1);
        const index = parseInt(indexStr, 10);
        
        if (current && current[elementName] && Array.isArray(current[elementName])) {
          current = current[elementName][index];
        } else {
          return undefined;
        }
      } else {
        // Handle normal property access
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return undefined;
        }
      }
    }
    
    return current;
  }
}

export default ResponseAssertions;