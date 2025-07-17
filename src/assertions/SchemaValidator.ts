/**
 * Schema Validator for RestifiedTS
 * 
 * This module provides JSON Schema validation capabilities for API responses
 * with support for custom formats, draft versions, and detailed error reporting.
 */

import { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning, 
  SchemaValidationOptions 
} from './AssertionTypes';
import { Validator as JSONSchemaValidator } from 'jsonschema';
import * as Joi from 'joi';

/**
 * Schema validation engine
 */
export class SchemaValidator {
  private jsonSchemaValidator: JSONSchemaValidator;
  private options: Required<SchemaValidationOptions>;

  constructor(options: SchemaValidationOptions = {}) {
    this.jsonSchemaValidator = new JSONSchemaValidator();
    this.options = {
      strict: true,
      allowUnknownProperties: false,
      customFormats: {},
      errorLimit: 100,
      ...options
    };

    this.initializeCustomFormats();
  }

  /**
   * Validate data against JSON Schema
   */
  async validateJsonSchema(data: any, schema: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const result = this.jsonSchemaValidator.validate(data, schema);
      
      // Process validation errors
      for (const error of result.errors) {
        errors.push({
          field: error.property || 'root',
          message: error.message,
          value: error.instance,
          rule: error.name,
          severity: 'error'
        });
      }

      // Check for warnings (additional properties in strict mode)
      if (this.options.strict && !this.options.allowUnknownProperties) {
        const warnings = this.findUnknownProperties(data, schema);
        warnings.forEach(warning => {
          errors.push({
            field: warning.field,
            message: warning.message,
            value: warning.value,
            rule: 'additionalProperties',
            severity: 'warning'
          });
        });
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date()
      };

    } catch (error) {
      errors.push({
        field: 'schema',
        message: error instanceof Error ? error.message : String(error),
        rule: 'validation',
        severity: 'error'
      });

      return {
        valid: false,
        errors,
        warnings,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate data against Joi schema
   */
  async validateJoiSchema(data: any, schema: Joi.Schema): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const result = schema.validate(data, {
        abortEarly: false,
        allowUnknown: this.options.allowUnknownProperties,
        stripUnknown: false
      });

      if (result.error) {
        for (const detail of result.error.details) {
          errors.push({
            field: detail.path.join('.') || 'root',
            message: detail.message,
            value: detail.context?.value,
            rule: detail.type,
            severity: 'error'
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date()
      };

    } catch (error) {
      errors.push({
        field: 'schema',
        message: error instanceof Error ? error.message : String(error),
        rule: 'validation',
        severity: 'error'
      });

      return {
        valid: false,
        errors,
        warnings,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate OpenAPI response schema
   */
  async validateOpenApiResponse(data: any, responseSchema: any, statusCode: number): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Find the appropriate response schema for the status code
      const responses = responseSchema.responses || {};
      const statusCodeStr = statusCode.toString();
      
      let schema;
      if (responses[statusCodeStr]) {
        schema = responses[statusCodeStr];
      } else if (responses.default) {
        schema = responses.default;
      } else {
        // Try to find a matching range (e.g., 2xx, 4xx, 5xx)
        const statusRange = `${statusCodeStr[0]}xx`;
        if (responses[statusRange]) {
          schema = responses[statusRange];
        }
      }

      if (!schema) {
        errors.push({
          field: 'statusCode',
          message: `No response schema found for status code ${statusCode}`,
          value: statusCode,
          rule: 'openapi',
          severity: 'error'
        });
        
        return {
          valid: false,
          errors,
          warnings,
          timestamp: new Date()
        };
      }

      // Extract content schema
      const content = schema.content || {};
      const contentType = Object.keys(content)[0]; // Use first content type
      
      if (!contentType) {
        return {
          valid: true,
          errors,
          warnings,
          timestamp: new Date()
        };
      }

      const contentSchema = content[contentType].schema;
      if (contentSchema) {
        return this.validateJsonSchema(data, contentSchema);
      }

      return {
        valid: true,
        errors,
        warnings,
        timestamp: new Date()
      };

    } catch (error) {
      errors.push({
        field: 'openapi',
        message: error instanceof Error ? error.message : String(error),
        rule: 'validation',
        severity: 'error'
      });

      return {
        valid: false,
        errors,
        warnings,
        timestamp: new Date()
      };
    }
  }

  /**
   * Create common validation schemas
   */
  static createCommonSchemas() {
    return {
      // Email validation
      email: Joi.string().email().required(),
      
      // URL validation
      url: Joi.string().uri().required(),
      
      // UUID validation
      uuid: Joi.string().uuid().required(),
      
      // Date validation
      date: Joi.date().iso().required(),
      
      // Phone number validation
      phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
      
      // Postal code validation
      postalCode: Joi.string().pattern(/^[\d\w\s\-]+$/).required(),
      
      // Credit card validation
      creditCard: Joi.string().creditCard().required(),
      
      // Password validation
      password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
      
      // API response pagination
      pagination: Joi.object({
        page: Joi.number().integer().min(1).required(),
        limit: Joi.number().integer().min(1).max(100).required(),
        total: Joi.number().integer().min(0).required(),
        pages: Joi.number().integer().min(0).required()
      }),
      
      // API error response
      errorResponse: Joi.object({
        error: Joi.object({
          code: Joi.string().required(),
          message: Joi.string().required(),
          details: Joi.array().items(Joi.object()).optional()
        }).required(),
        timestamp: Joi.date().iso().required(),
        path: Joi.string().optional()
      }),
      
      // User object
      user: Joi.object({
        id: Joi.alternatives().try(Joi.string().uuid(), Joi.number().integer().positive()).required(),
        email: Joi.string().email().required(),
        name: Joi.string().min(1).max(100).required(),
        avatar: Joi.string().uri().optional(),
        createdAt: Joi.date().iso().required(),
        updatedAt: Joi.date().iso().required()
      }),
      
      // Product object
      product: Joi.object({
        id: Joi.alternatives().try(Joi.string().uuid(), Joi.number().integer().positive()).required(),
        name: Joi.string().min(1).max(200).required(),
        description: Joi.string().max(1000).optional(),
        price: Joi.number().positive().precision(2).required(),
        currency: Joi.string().length(3).uppercase().required(),
        category: Joi.string().min(1).max(100).required(),
        inStock: Joi.boolean().required(),
        tags: Joi.array().items(Joi.string()).optional()
      })
    };
  }

  /**
   * Validate array of objects
   */
  async validateArray(data: any[], itemSchema: any, schemaType: 'json' | 'joi' = 'json'): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!Array.isArray(data)) {
      errors.push({
        field: 'root',
        message: 'Expected array but got ' + typeof data,
        value: data,
        rule: 'type',
        severity: 'error'
      });
      
      return {
        valid: false,
        errors,
        warnings,
        timestamp: new Date()
      };
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let result: ValidationResult;
      
      if (schemaType === 'joi') {
        result = await this.validateJoiSchema(item, itemSchema);
      } else {
        result = await this.validateJsonSchema(item, itemSchema);
      }

      // Add array index to field paths
      for (const error of result.errors) {
        errors.push({
          ...error,
          field: `[${i}].${error.field}`.replace('.root', '')
        });
      }

      for (const warning of result.warnings) {
        warnings.push({
          ...warning,
          field: `[${i}].${warning.field}`.replace('.root', '')
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date()
    };
  }

  /**
   * Validate nested object properties
   */
  async validateNested(data: any, propertySchemas: Record<string, any>, schemaType: 'json' | 'joi' = 'json'): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const [property, schema] of Object.entries(propertySchemas)) {
      if (data && typeof data === 'object' && property in data) {
        const value = data[property];
        let result: ValidationResult;
        
        if (schemaType === 'joi') {
          result = await this.validateJoiSchema(value, schema);
        } else {
          result = await this.validateJsonSchema(value, schema);
        }

        // Add property prefix to field paths
        for (const error of result.errors) {
          errors.push({
            ...error,
            field: `${property}.${error.field}`.replace('.root', '')
          });
        }

        for (const warning of result.warnings) {
          warnings.push({
            ...warning,
            field: `${property}.${warning.field}`.replace('.root', '')
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date()
    };
  }

  /**
   * Add custom format validator
   */
  addCustomFormat(name: string, validator: (value: any) => boolean): void {
    this.options.customFormats[name] = validator;
    this.jsonSchemaValidator.customFormats[name] = validator;
  }

  /**
   * Update validation options
   */
  updateOptions(newOptions: Partial<SchemaValidationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current validation options
   */
  getOptions(): SchemaValidationOptions {
    return { ...this.options };
  }

  /**
   * Initialize custom formats
   */
  private initializeCustomFormats(): void {
    // Add built-in custom formats
    this.addCustomFormat('email', (value: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    });

    this.addCustomFormat('uuid', (value: string) => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    });

    this.addCustomFormat('url', (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    });

    this.addCustomFormat('date', (value: string) => {
      return !isNaN(Date.parse(value));
    });

    this.addCustomFormat('phone', (value: string) => {
      return /^\+?[\d\s\-\(\)]+$/.test(value);
    });

    // Add user-defined custom formats
    for (const [name, validator] of Object.entries(this.options.customFormats)) {
      this.jsonSchemaValidator.customFormats[name] = validator;
    }
  }

  /**
   * Find unknown properties in data
   */
  private findUnknownProperties(data: any, schema: any, path: string = ''): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    if (!data || typeof data !== 'object' || !schema || typeof schema !== 'object') {
      return warnings;
    }

    const properties = schema.properties || {};
    const additionalProperties = schema.additionalProperties;

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (!(key in properties) && additionalProperties === false) {
          warnings.push({
            field: fullPath,
            message: `Unknown property '${key}' is not allowed`,
            value: data[key],
            rule: 'additionalProperties'
          });
        } else if (key in properties && typeof data[key] === 'object' && data[key] !== null) {
          // Recursively check nested objects
          const nestedWarnings = this.findUnknownProperties(data[key], properties[key], fullPath);
          warnings.push(...nestedWarnings);
        }
      }
    }

    return warnings;
  }
}

export default SchemaValidator;