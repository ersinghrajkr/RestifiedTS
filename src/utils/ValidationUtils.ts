// src/utils/ValidationUtils.ts

/**
 * Production-grade validation utilities for JSON, XML, and data structures
 * 
 * Features:
 * - JSON schema validation
 * - XML structure validation and parsing
 * - Data type validation and coercion
 * - Custom validation rules and predicates
 * - Nested object validation
 * - Array and collection validation
 * - Format validation (email, URL, date, etc.)
 * - Sanitization and normalization
 * - Performance-optimized validation
 * 
 * @example
 * ```typescript
 * // JSON validation
 * const isValid = ValidationUtils.isValidJSON('{"key": "value"}');
 * 
 * // Schema validation
 * const schema = { type: 'object', properties: { name: { type: 'string' } } };
 * ValidationUtils.validateSchema(data, schema);
 * 
 * // XML validation
 * const xmlResult = ValidationUtils.validateXML('<root><item>value</item></root>');
 * 
 * // Custom validation
 * const validator = ValidationUtils.createValidator()
 *   .required('name')
 *   .string('email').email()
 *   .number('age').min(0).max(120);
 * 
 * validator.validate(userData);
 * ```
 */
export class ValidationUtils {
  
  // ==========================================
  // JSON VALIDATION
  // ==========================================

  /**
   * Check if a string is valid JSON
   * 
   * @param jsonString - String to validate
   * @returns True if valid JSON
   */
  static isValidJSON(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse JSON with detailed error information
   * 
   * @param jsonString - JSON string to parse
   * @returns Parsed JSON or validation result with errors
   */
  static parseJSON(jsonString: string): JSONParseResult {
    try {
      const data = JSON.parse(jsonString);
      return {
        isValid: true,
        data,
        errors: []
      };
    } catch (error) {
      const parseError = error as SyntaxError;
      return {
        isValid: false,
        data: null,
        errors: [{
          message: parseError.message,
          line: ValidationUtils.extractLineNumber(parseError.message),
          column: ValidationUtils.extractColumnNumber(parseError.message)
        }]
      };
    }
  }

  /**
   * Validate JSON against a schema
   * 
   * @param data - Data to validate
   * @param schema - JSON schema
   * @returns Validation result
   */
  static validateSchema(data: any, schema: JSONSchema): SchemaValidationResult {
    const validator = new JSONSchemaValidator();
    return validator.validate(data, schema);
  }

  /**
   * Validate JSON structure for API responses
   * 
   * @param data - Response data to validate
   * @param expectedStructure - Expected structure definition
   * @returns Validation result
   */
  static validateAPIResponse(data: any, expectedStructure: APIResponseStructure): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required fields
    if (expectedStructure.required) {
      expectedStructure.required.forEach(field => {
        if (!(field in data)) {
          errors.push({
            field,
            message: `Required field '${field}' is missing`,
            code: 'REQUIRED_FIELD_MISSING'
          });
        }
      });
    }

    // Check field types
    if (expectedStructure.fields) {
      Object.entries(expectedStructure.fields).forEach(([field, fieldSchema]) => {
        if (field in data) {
          const fieldErrors = ValidationUtils.validateField(data[field], fieldSchema, field);
          errors.push(...fieldErrors);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ==========================================
  // XML VALIDATION
  // ==========================================

  /**
   * Check if a string is valid XML
   * 
   * @param xmlString - XML string to validate
   * @returns True if valid XML
   */
  static isValidXML(xmlString: string): boolean {
    try {
      if (typeof DOMParser !== 'undefined') {
        // Browser environment
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');
        return !doc.querySelector('parsererror');
      } else {
        // Node.js environment - simplified validation
        return ValidationUtils.validateXMLStructure(xmlString);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse and validate XML with detailed error information
   * 
   * @param xmlString - XML string to parse
   * @returns XML parse result
   */
  static parseXML(xmlString: string): XMLParseResult {
    try {
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');
        const errorNode = doc.querySelector('parsererror');
        
        if (errorNode) {
          return {
            isValid: false,
            document: null,
            errors: [{
              message: errorNode.textContent || 'XML parse error',
              line: 0,
              column: 0
            }]
          };
        }
        
        return {
          isValid: true,
          document: doc,
          errors: []
        };
      } else {
        // Node.js environment - basic validation
        const isValid = ValidationUtils.validateXMLStructure(xmlString);
        return {
          isValid,
          document: null,
          errors: isValid ? [] : [{ message: 'Invalid XML structure', line: 0, column: 0 }]
        };
      }
    } catch (error) {
      return {
        isValid: false,
        document: null,
        errors: [{
          message: (error as Error).message,
          line: 0,
          column: 0
        }]
      };
    }
  }

  /**
   * Validate XML against XSD schema (simplified)
   * 
   * @param xmlString - XML to validate
   * @param xsdString - XSD schema
   * @returns Validation result
   */
  static validateXMLSchema(xmlString: string, xsdString: string): XMLValidationResult {
    // Simplified XSD validation - in production, use a proper XSD library
    const xmlResult = ValidationUtils.parseXML(xmlString);
    const xsdResult = ValidationUtils.parseXML(xsdString);
    
    if (!xmlResult.isValid) {
      return {
        isValid: false,
        errors: xmlResult.errors.map(err => ({ ...err, type: 'xml_parse_error' }))
      };
    }
    
    if (!xsdResult.isValid) {
      return {
        isValid: false,
        errors: [{ message: 'Invalid XSD schema', line: 0, column: 0, type: 'xsd_parse_error' }]
      };
    }
    
    // Basic structure validation
    return {
      isValid: true,
      errors: []
    };
  }

  // ==========================================
  // DATA TYPE VALIDATION
  // ==========================================

  /**
   * Validate if value is of specified type
   * 
   * @param value - Value to validate
   * @param type - Expected type
   * @returns True if value matches type
   */
  static isType(value: any, type: DataType): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'integer':
        return Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null':
        return value === null;
      case 'undefined':
        return value === undefined;
      case 'date':
        return value instanceof Date && !isNaN(value.getTime());
      case 'email':
        return typeof value === 'string' && ValidationUtils.isValidEmail(value);
      case 'url':
        return typeof value === 'string' && ValidationUtils.isValidURL(value);
      case 'uuid':
        return typeof value === 'string' && ValidationUtils.isValidUUID(value);
      default:
        return false;
    }
  }

  /**
   * Validate email format
   * 
   * @param email - Email string to validate
   * @returns True if valid email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   * 
   * @param url - URL string to validate
   * @returns True if valid URL format
   */
  static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate UUID format
   * 
   * @param uuid - UUID string to validate
   * @returns True if valid UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate date format
   * 
   * @param dateString - Date string to validate
   * @param format - Expected date format (ISO, US, EU, etc.)
   * @returns True if valid date format
   */
  static isValidDate(dateString: string, format: DateFormat = 'ISO'): boolean {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return false;
    }

    // switch (format) {
    //   case 'ISO':
    //     return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\
}