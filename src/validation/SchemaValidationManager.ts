/**
 * Enhanced Schema Validation Manager for RestifiedTS
 * 
 * Supports multiple validation libraries:
 * - Joi (existing, maintained for backward compatibility)
 * - AJV (JSON Schema validation)
 * - Zod (TypeScript-first schema validation)
 */

import Joi from 'joi';
import Ajv, { JSONSchemaType, Schema } from 'ajv';
// import addFormats from 'ajv-formats';
import { z, ZodSchema, ZodError } from 'zod';

export type ValidationType = 'joi' | 'ajv' | 'zod';

export interface ValidationResult {
  isValid: boolean;
  errors: any[];
  validatedData?: any;
  validationType: ValidationType;
  executionTime: number;
}

export interface SchemaValidationConfig {
  enableJoi: boolean;
  enableAjv: boolean;
  enableZod: boolean;
  defaultValidator: ValidationType;
  strictMode: boolean;
  coerceTypes: boolean;
  removeAdditional: boolean;
}

/**
 * Multi-library schema validation manager
 */
export class SchemaValidationManager {
  private joiValidator: typeof Joi;
  private ajvValidator: Ajv;
  private config: SchemaValidationConfig;

  constructor(config: Partial<SchemaValidationConfig> = {}) {
    this.config = {
      enableJoi: true,
      enableAjv: true,
      enableZod: true,
      defaultValidator: 'joi',
      strictMode: false,
      coerceTypes: true,
      removeAdditional: false,
      ...config
    };

    // Initialize Joi (existing)
    this.joiValidator = Joi;

    // Initialize AJV
    this.ajvValidator = new Ajv({
      allErrors: true,
      coerceTypes: this.config.coerceTypes,
      removeAdditional: this.config.removeAdditional,
      strict: this.config.strictMode
    });
    
    // Add formats support if available
    try {
      const addFormats = require('ajv-formats');
      addFormats(this.ajvValidator);
    } catch (error) {
      console.warn('ajv-formats not available, some format validations may not work');
    }
  }

  /**
   * Validate data using Joi schema
   */
  async validateWithJoi(data: any, schema: Joi.Schema): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        allowUnknown: !this.config.strictMode
      });

      return {
        isValid: !error,
        errors: error ? error.details : [],
        validatedData: value,
        validationType: 'joi',
        executionTime: Date.now() - startTime
      };
    } catch (err) {
      return {
        isValid: false,
        errors: [{ message: 'Joi validation failed', error: err }],
        validationType: 'joi',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate data using AJV (JSON Schema)
   */
  async validateWithAjv(data: any, schema: Schema): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const validate = this.ajvValidator.compile(schema);
      const isValid = validate(data);

      return {
        isValid,
        errors: validate.errors || [],
        validatedData: isValid ? data : undefined,
        validationType: 'ajv',
        executionTime: Date.now() - startTime
      };
    } catch (err) {
      return {
        isValid: false,
        errors: [{ message: 'AJV validation failed', error: err }],
        validationType: 'ajv',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate data using Zod schema
   */
  async validateWithZod<T>(data: any, schema: ZodSchema<T>): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const result = schema.safeParse(data);

      if (result.success) {
        return {
          isValid: true,
          errors: [],
          validatedData: result.data,
          validationType: 'zod',
          executionTime: Date.now() - startTime
        };
      } else {
        return {
          isValid: false,
          errors: result.error.issues,
          validationType: 'zod',
          executionTime: Date.now() - startTime
        };
      }
    } catch (err) {
      return {
        isValid: false,
        errors: [{ message: 'Zod validation failed', error: err }],
        validationType: 'zod',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Universal validation method that can handle all three types
   */
  async validate(data: any, schema: any, type?: ValidationType): Promise<ValidationResult> {
    const validationType = type || this.config.defaultValidator;

    switch (validationType) {
      case 'joi':
        if (!this.config.enableJoi) {
          throw new Error('Joi validation is disabled');
        }
        return this.validateWithJoi(data, schema);
      
      case 'ajv':
        if (!this.config.enableAjv) {
          throw new Error('AJV validation is disabled');
        }
        return this.validateWithAjv(data, schema);
      
      case 'zod':
        if (!this.config.enableZod) {
          throw new Error('Zod validation is disabled');
        }
        return this.validateWithZod(data, schema);
      
      default:
        throw new Error(`Unsupported validation type: ${validationType}`);
    }
  }

  /**
   * Multi-validator validation - validates with all enabled validators
   */
  async validateWithAll(data: any, schemas: {
    joi?: Joi.Schema;
    ajv?: Schema;
    zod?: ZodSchema<any>;
  }): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (this.config.enableJoi && schemas.joi) {
      results.push(await this.validateWithJoi(data, schemas.joi));
    }

    if (this.config.enableAjv && schemas.ajv) {
      results.push(await this.validateWithAjv(data, schemas.ajv));
    }

    if (this.config.enableZod && schemas.zod) {
      results.push(await this.validateWithZod(data, schemas.zod));
    }

    return results;
  }

  /**
   * Schema conversion utilities
   */
  convertJoiToAjv(joiSchema: Joi.Schema): Schema {
    // Basic conversion - this would need more sophisticated implementation
    const description = joiSchema.describe();
    return this.joiDescriptionToAjvSchema(description);
  }

  private joiDescriptionToAjvSchema(description: any): Schema {
    // Simplified conversion logic
    const schema: any = {
      type: this.mapJoiTypeToAjv(description.type)
    };

    if (description.rules) {
      description.rules.forEach((rule: any) => {
        switch (rule.name) {
          case 'min':
            schema.minimum = rule.args?.limit;
            break;
          case 'max':
            schema.maximum = rule.args?.limit;
            break;
          case 'email':
            schema.format = 'email';
            break;
        }
      });
    }

    return schema;
  }

  private mapJoiTypeToAjv(joiType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object'
    };
    return typeMap[joiType] || 'string';
  }

  /**
   * Performance benchmarking between validators
   */
  async benchmarkValidators(data: any, schemas: {
    joi?: Joi.Schema;
    ajv?: Schema;
    zod?: ZodSchema<any>;
  }, iterations: number = 1000): Promise<{
    joi?: { averageTime: number; totalTime: number };
    ajv?: { averageTime: number; totalTime: number };
    zod?: { averageTime: number; totalTime: number };
  }> {
    const results: any = {};

    // Benchmark Joi
    if (schemas.joi) {
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.validateWithJoi(data, schemas.joi);
      }
      const totalTime = Date.now() - startTime;
      results.joi = {
        totalTime,
        averageTime: totalTime / iterations
      };
    }

    // Benchmark AJV
    if (schemas.ajv) {
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.validateWithAjv(data, schemas.ajv);
      }
      const totalTime = Date.now() - startTime;
      results.ajv = {
        totalTime,
        averageTime: totalTime / iterations
      };
    }

    // Benchmark Zod
    if (schemas.zod) {
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.validateWithZod(data, schemas.zod);
      }
      const totalTime = Date.now() - startTime;
      results.zod = {
        totalTime,
        averageTime: totalTime / iterations
      };
    }

    return results;
  }
}

/**
 * Schema examples and utilities
 */
export class SchemaExamples {
  static getUserSchemas() {
    return {
      // Joi schema (existing)
      joi: Joi.object({
        id: Joi.number().integer().positive().required(),
        name: Joi.string().min(2).max(50).required(),
        email: Joi.string().email().required(),
        age: Joi.number().integer().min(0).max(120).optional(),
        roles: Joi.array().items(Joi.string()).default([])
      }),

      // AJV schema (JSON Schema)
      ajv: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 1 },
          name: { type: 'string', minLength: 2, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          age: { type: 'integer', minimum: 0, maximum: 120 },
          roles: { type: 'array', items: { type: 'string' }, default: [] }
        },
        required: ['id', 'name', 'email'],
        additionalProperties: false
      } as Schema,

      // Zod schema
      zod: z.object({
        id: z.number().int().positive(),
        name: z.string().min(2).max(50),
        email: z.string().email(),
        age: z.number().int().min(0).max(120).optional(),
        roles: z.array(z.string()).default([])
      })
    };
  }

  static getApiResponseSchemas() {
    return {
      joi: Joi.object({
        success: Joi.boolean().required(),
        data: Joi.any().optional(),
        message: Joi.string().optional(),
        timestamp: Joi.date().iso().required(),
        requestId: Joi.string().uuid().required()
      }),

      ajv: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {},
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string', format: 'uuid' }
        },
        required: ['success', 'timestamp', 'requestId'],
        additionalProperties: false
      } as Schema,

      zod: z.object({
        success: z.boolean(),
        data: z.any().optional(),
        message: z.string().optional(),
        timestamp: z.string().datetime(),
        requestId: z.string().uuid()
      })
    };
  }
}