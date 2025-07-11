// src/utils/JsonPlaceholderResolver.ts

import { VariableStore } from '../core/stores/VariableStore';
import { faker } from '@faker-js/faker';

/**
 * Advanced JSON placeholder resolver with support for:
 * - Variable substitution {{variableName}}
 * - Faker.js integration {{$faker.name.firstName}}
 * - Nested object access {{user.profile.name}}
 * - Array access {{users[0].name}}
 * - Default values {{variableName|defaultValue}}
 * - Mathematical expressions {{$math.random(1,100)}}
 * - Date/time functions {{$date.now}}, {{$date.format('YYYY-MM-DD')}}
 * 
 * @example
 * ```typescript
 * const resolver = new JsonPlaceholderResolver(variableStore);
 * 
 * const template = {
 *   id: "{{userId}}",
 *   name: "{{$faker.name.fullName}}",
 *   email: "{{userEmail|default@example.com}}",
 *   createdAt: "{{$date.now}}",
 *   score: "{{$math.random(1,100)}}"
 * };
 * 
 * const resolved = resolver.resolve(template);
 * ```
 */
export class JsonPlaceholderResolver {
  private readonly builtinFunctions: Map<string, Function> = new Map();

  constructor(private readonly variableStore: VariableStore) {
    this.initializeBuiltinFunctions();
  }

  /**
   * Resolve placeholders in any data structure
   * Supports objects, arrays, strings, and nested structures
   * 
   * @param data - Data containing placeholders to resolve
   * @returns Resolved data with placeholders replaced
   * @throws Error if placeholder resolution fails
   */
  resolve(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.resolveString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.resolve(item));
    }

    if (typeof data === 'object') {
      const resolved: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Resolve both key and value
        const resolvedKey = typeof key === 'string' ? this.resolveString(key) : key;
        resolved[resolvedKey] = this.resolve(value);
      }
      
      return resolved;
    }

    // Return primitive values as-is
    return data;
  }

  /**
   * Resolve placeholders in a string
   * Supports multiple placeholder types and complex expressions
   * 
   * @param str - String containing placeholders
   * @returns Resolved string
   * @throws Error if placeholder is invalid or variable not found
   */
  resolveString(str: string): any {
    if (typeof str !== 'string') {
      return str;
    }

    // Check if the entire string is a single placeholder
    const singlePlaceholderMatch = str.match(/^\{\{(.+)\}\}$/);
    if (singlePlaceholderMatch) {
      // Return the actual resolved value (could be non-string)
      return this.resolvePlaceholder(singlePlaceholderMatch[1].trim());
    }

    // Replace multiple placeholders within the string
    return str.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
      const resolved = this.resolvePlaceholder(placeholder.trim());
      return String(resolved);
    });
  }

  /**
   * Resolve a single placeholder expression
   * 
   * @param placeholder - Placeholder expression without {{ }}
   * @returns Resolved value
   * @throws Error if placeholder cannot be resolved
   */
  private resolvePlaceholder(placeholder: string): any {
    try {
      // Handle default values (e.g., variableName|defaultValue)
      const [expression, defaultValue] = this.parseDefaultValue(placeholder);

      // Handle different placeholder types
      if (expression.startsWith('$faker.')) {
        return this.resolveFakerPlaceholder(expression);
      }

      if (expression.startsWith('$math.')) {
        return this.resolveMathPlaceholder(expression);
      }

      if (expression.startsWith('$date.')) {
        return this.resolveDatePlaceholder(expression);
      }

      if (expression.startsWith('$random.')) {
        return this.resolveRandomPlaceholder(expression);
      }

      if (expression.startsWith('$env.')) {
        return this.resolveEnvironmentPlaceholder(expression);
      }

      // Handle variable resolution with dot notation and array access
      const variableValue = this.resolveVariablePlaceholder(expression);
      
      if (variableValue !== undefined) {
        return variableValue;
      }

      // Return default value if provided
      if (defaultValue !== undefined) {
        return this.parseValue(defaultValue);
      }

      throw new Error(`Variable '${expression}' is not defined and no default value provided`);

    } catch (error) {
      throw new Error(`Failed to resolve placeholder '${placeholder}': ${(error as Error).message}`);
    }
  }

  /**
   * Parse placeholder with default value syntax
   * 
   * @param placeholder - Placeholder that may contain default value
   * @returns Tuple of [expression, defaultValue]
   */
  private parseDefaultValue(placeholder: string): [string, string | undefined] {
    const pipeIndex = placeholder.indexOf('|');
    
    if (pipeIndex === -1) {
      return [placeholder, undefined];
    }

    const expression = placeholder.substring(0, pipeIndex).trim();
    const defaultValue = placeholder.substring(pipeIndex + 1).trim();
    
    return [expression, defaultValue];
  }

  /**
   * Resolve Faker.js placeholder
   * 
   * @param expression - Faker expression (e.g., $faker.name.firstName)
   * @returns Generated fake value
   */
  private resolveFakerPlaceholder(expression: string): any {
    const path = expression.substring(7); // Remove '$faker.'
    const pathParts = path.split('.');

    let current: any = faker;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        throw new Error(`Invalid Faker.js path: ${path}`);
      }
    }

    if (typeof current === 'function') {
      return current();
    }

    return current;
  }

  /**
   * Resolve mathematical expression placeholder
   * 
   * @param expression - Math expression (e.g., $math.random(1,100))
   * @returns Calculated value
   */
  private resolveMathPlaceholder(expression: string): any {
    const functionCall = expression.substring(6); // Remove '$math.'
    
    // Parse function name and arguments
    const match = functionCall.match(/^(\w+)\((.*)\)$/);
    if (!match) {
      throw new Error(`Invalid math expression: ${functionCall}`);
    }

    const [, functionName, argsString] = match;
    const args = this.parseArguments(argsString);

    switch (functionName) {
      case 'random':
        if (args.length === 0) {
          return Math.random();
        } else if (args.length === 2) {
          const [min, max] = args.map(Number);
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        throw new Error('random() expects 0 or 2 arguments');

      case 'round':
        if (args.length === 1) {
          return Math.round(Number(args[0]));
        }
        throw new Error('round() expects 1 argument');

      case 'floor':
        if (args.length === 1) {
          return Math.floor(Number(args[0]));
        }
        throw new Error('floor() expects 1 argument');

      case 'ceil':
        if (args.length === 1) {
          return Math.ceil(Number(args[0]));
        }
        throw new Error('ceil() expects 1 argument');

      case 'abs':
        if (args.length === 1) {
          return Math.abs(Number(args[0]));
        }
        throw new Error('abs() expects 1 argument');

      default:
        throw new Error(`Unknown math function: ${functionName}`);
    }
  }

  /**
   * Resolve date/time placeholder
   * 
   * @param expression - Date expression (e.g., $date.now, $date.format('YYYY-MM-DD'))
   * @returns Date/time value
   */
  private resolveDatePlaceholder(expression: string): any {
    const dateFunction = expression.substring(6); // Remove '$date.'

    if (dateFunction === 'now') {
      return new Date().toISOString();
    }

    if (dateFunction === 'timestamp') {
      return Date.now();
    }

    if (dateFunction.startsWith('format(')) {
      const match = dateFunction.match(/^format\('(.+)'\)$/);
      if (!match) {
        throw new Error(`Invalid date format expression: ${dateFunction}`);
      }

      const format = match[1];
      return this.formatDate(new Date(), format);
    }

    if (dateFunction.startsWith('add(')) {
      const match = dateFunction.match(/^add\((\d+),\s*'(\w+)'\)$/);
      if (!match) {
        throw new Error(`Invalid date add expression: ${dateFunction}`);
      }

      const [, amount, unit] = match;
      return this.addToDate(new Date(), parseInt(amount), unit);
    }

    throw new Error(`Unknown date function: ${dateFunction}`);
  }

  /**
   * Resolve random data placeholder
   * 
   * @param expression - Random expression (e.g., $random.uuid, $random.string(10))
   * @returns Random value
   */
  private resolveRandomPlaceholder(expression: string): any {
    const randomFunction = expression.substring(8); // Remove '$random.'

    if (randomFunction === 'uuid') {
      return this.generateUUID();
    }

    if (randomFunction.startsWith('string(')) {
      const match = randomFunction.match(/^string\((\d+)\)$/);
      if (!match) {
        throw new Error(`Invalid random string expression: ${randomFunction}`);
      }

      const length = parseInt(match[1]);
      return this.generateRandomString(length);
    }

    if (randomFunction.startsWith('number(')) {
      const match = randomFunction.match(/^number\((\d+),\s*(\d+)\)$/);
      if (!match) {
        throw new Error(`Invalid random number expression: ${randomFunction}`);
      }

      const [, min, max] = match;
      return Math.floor(Math.random() * (parseInt(max) - parseInt(min) + 1)) + parseInt(min);
    }

    throw new Error(`Unknown random function: ${randomFunction}`);
  }

  /**
   * Resolve environment variable placeholder
   * 
   * @param expression - Environment expression (e.g., $env.NODE_ENV)
   * @returns Environment variable value
   */
  private resolveEnvironmentPlaceholder(expression: string): string {
    const envVar = expression.substring(5); // Remove '$env.'
    const value = process.env[envVar];
    
    if (value === undefined) {
      throw new Error(`Environment variable '${envVar}' is not defined`);
    }
    
    return value;
  }

  /**
   * Resolve variable placeholder with dot notation and array access
   * 
   * @param expression - Variable expression (e.g., user.profile.name, users[0].email)
   * @returns Variable value
   */
  private resolveVariablePlaceholder(expression: string): any {
    // Handle array access notation
    const normalizedPath = this.normalizeArrayAccess(expression);
    const pathParts = normalizedPath.split('.');
    
    const rootVariable = pathParts[0];
    let value = this.variableStore.get(rootVariable);
    
    if (value === undefined) {
      return undefined;
    }
    
    // Navigate through nested properties
    for (let i = 1; i < pathParts.length; i++) {
      const part = pathParts[i];
      
      if (value && typeof value === 'object') {
        // Handle array index access
        if (/^\d+$/.test(part)) {
          const index = parseInt(part);
          if (Array.isArray(value) && index >= 0 && index < value.length) {
            value = value[index];
          } else {
            return undefined;
          }
        } else {
          // Handle object property access
          if (part in value) {
            value = value[part];
          } else {
            return undefined;
          }
        }
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Normalize array access notation from bracket to dot notation
   * Example: users[0].name becomes users.0.name
   * 
   * @param expression - Expression that may contain array access
   * @returns Normalized expression
   */
  private normalizeArrayAccess(expression: string): string {
    return expression.replace(/\[(\d+)\]/g, '.$1');
  }

  /**
   * Parse function arguments from string
   * 
   * @param argsString - Comma-separated arguments string
   * @returns Array of parsed arguments
   */
  private parseArguments(argsString: string): any[] {
    if (!argsString.trim()) {
      return [];
    }

    return argsString.split(',').map(arg => {
      const trimmed = arg.trim();
      
      // Remove quotes from string arguments
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
      }
      
      // Parse numbers
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return parseFloat(trimmed);
      }
      
      // Parse booleans
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      if (trimmed === 'null') return null;
      
      return trimmed;
    });
  }

  /**
   * Parse string value, converting to appropriate type
   * 
   * @param value - String value to parse
   * @returns Parsed value
   */
  private parseValue(value: string): any {
    const trimmed = value.trim();
    
    // Handle quoted strings
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    
    // Handle numbers
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    
    // Handle booleans and null
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    
    return trimmed;
  }

  /**
   * Format date according to simple format string
   * 
   * @param date - Date to format
   * @param format - Format string (simplified)
   * @returns Formatted date string
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace(/YYYY/g, String(year))
      .replace(/MM/g, month)
      .replace(/DD/g, day)
      .replace(/HH/g, hour)
      .replace(/mm/g, minute)
      .replace(/ss/g, second);
  }

  /**
   * Add time to date
   * 
   * @param date - Base date
   * @param amount - Amount to add
   * @param unit - Time unit
   * @returns New date
   */
  private addToDate(date: Date, amount: number, unit: string): string {
    const newDate = new Date(date);
    
    switch (unit) {
      case 'days':
        newDate.setDate(newDate.getDate() + amount);
        break;
      case 'hours':
        newDate.setHours(newDate.getHours() + amount);
        break;
      case 'minutes':
        newDate.setMinutes(newDate.getMinutes() + amount);
        break;
      case 'seconds':
        newDate.setSeconds(newDate.getSeconds() + amount);
        break;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
    
    return newDate.toISOString();
  }

  /**
   * Generate UUID v4
   * 
   * @returns UUID string
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate random string
   * 
   * @param length - String length
   * @returns Random string
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Initialize built-in functions
   */
  private initializeBuiltinFunctions(): void {
    // Built-in functions can be added here for custom extensions
    this.builtinFunctions.set('now', () => new Date().toISOString());
    this.builtinFunctions.set('timestamp', () => Date.now());
    this.builtinFunctions.set('uuid', () => this.generateUUID());
  }
}