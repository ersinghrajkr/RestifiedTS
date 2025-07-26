/**
 * Variable Store for RestifiedTS
 * 
 * This module provides comprehensive variable management with support for:
 * - Global and local variable scopes
 * - Variable resolution with template syntax
 * - Type-safe variable access
 * - Variable persistence and restoration
 * - Faker.js integration
 * - Built-in variable generators
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { VariableScope, TemplateContext } from '../../types/RestifiedTypes';

export class VariableStore {
  private globalVariables: Map<string, any> = new Map();
  private localVariables: Map<string, any> = new Map();
  private templateContext: TemplateContext;

  constructor() {
    this.templateContext = this.createTemplateContext();
  }

  /**
   * Set a global variable
   */
  setGlobal(key: string, value: any): void {
    this.globalVariables.set(key, value);
  }

  /**
   * Get a global variable
   */
  getGlobal(key: string): any {
    return this.globalVariables.get(key);
  }

  /**
   * Set multiple global variables
   */
  setGlobalBatch(variables: Record<string, any>): void {
    Object.entries(variables).forEach(([key, value]) => {
      this.globalVariables.set(key, value);
    });
  }

  /**
   * Get all global variables
   */
  getAllGlobal(): Record<string, any> {
    return Object.fromEntries(this.globalVariables);
  }

  /**
   * Clear all global variables
   */
  clearGlobal(): void {
    this.globalVariables.clear();
  }

  /**
   * Set a local variable
   */
  setLocal(key: string, value: any): void {
    this.localVariables.set(key, value);
  }

  /**
   * Get a local variable
   */
  getLocal(key: string): any {
    return this.localVariables.get(key);
  }

  /**
   * Set multiple local variables
   */
  setLocalBatch(variables: Record<string, any>): void {
    Object.entries(variables).forEach(([key, value]) => {
      this.localVariables.set(key, value);
    });
  }

  /**
   * Get all local variables
   */
  getAllLocal(): Record<string, any> {
    return Object.fromEntries(this.localVariables);
  }

  /**
   * Clear all local variables
   */
  clearLocal(): void {
    this.localVariables.clear();
  }

  /**
   * Get variable with scope resolution (local first, then global)
   * Supports dot notation for nested object access (e.g., 'user.profile.name')
   */
  get(key: string): any {
    // Handle simple key first - check existence to distinguish null from undefined
    if (this.localVariables.has(key)) {
      return this.localVariables.get(key);
    }
    if (this.globalVariables.has(key)) {
      return this.globalVariables.get(key);
    }
    
    if (!key.includes('.')) {
      return undefined;
    }

    // Handle dot notation for nested access
    const parts = key.split('.');
    const rootKey = parts[0];
    let rootValue: any;
    
    if (this.localVariables.has(rootKey)) {
      rootValue = this.localVariables.get(rootKey);
    } else if (this.globalVariables.has(rootKey)) {
      rootValue = this.globalVariables.get(rootKey);
    } else {
      return undefined;
    }
    
    if (rootValue === undefined || rootValue === null) {
      return undefined;
    }

    // Navigate through the nested properties
    let current = rootValue;
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      
      if (current === null || current === undefined) {
        return undefined;
      }
      
      // Handle array access (e.g., colors.0)
      if (Array.isArray(current) && /^\d+$/.test(part)) {
        const index = parseInt(part, 10);
        current = current[index];
      } else if (typeof current === 'object' && current.hasOwnProperty(part)) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Set variable (local scope by default)
   */
  set(key: string, value: any, scope: 'local' | 'global' = 'local'): void {
    if (scope === 'global') {
      this.setGlobal(key, value);
    } else {
      this.setLocal(key, value);
    }
  }

  /**
   * Check if variable exists
   */
  has(key: string): boolean {
    return this.localVariables.has(key) || this.globalVariables.has(key);
  }

  /**
   * Delete variable
   */
  delete(key: string): boolean {
    return this.localVariables.delete(key) || this.globalVariables.delete(key);
  }

  /**
   * Get all variables with scope information
   */
  getAll(): VariableScope {
    return {
      global: this.getAllGlobal(),
      local: this.getAllLocal()
    };
  }

  /**
   * Get all variable keys
   */
  getKeys(): string[] {
    const globalKeys = Array.from(this.globalVariables.keys());
    const localKeys = Array.from(this.localVariables.keys());
    return [...new Set([...globalKeys, ...localKeys])];
  }

  /**
   * Clear all variables
   */
  clearAll(): void {
    this.clearGlobal();
    this.clearLocal();
  }

  /**
   * Resolve template string with variables
   */
  resolve(template: string, resolvedKeys: Set<string> = new Set()): string {
    if (typeof template !== 'string' || template === null || template === undefined) {
      return template;
    }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      const trimmed = expression.trim();
      
      try {
        // Handle built-in functions
        if (trimmed.startsWith('$faker.')) {
          return this.resolveFaker(trimmed);
        }
        
        if (trimmed.startsWith('$random.')) {
          return this.resolveRandom(trimmed);
        }
        
        if (trimmed.startsWith('$date.')) {
          return this.resolveDate(trimmed);
        }
        
        if (trimmed.startsWith('$env.')) {
          return this.resolveEnvironment(trimmed);
        }
        
        if (trimmed.startsWith('$math.')) {
          return this.resolveMath(trimmed);
        }
        
        if (trimmed.startsWith('$string.')) {
          return this.resolveString(trimmed);
        }
        
        // Handle regular variables
        if (resolvedKeys.has(trimmed)) {
          // Prevent infinite recursion
          return match;
        }
        
        const value = this.get(trimmed);
        if (value !== undefined) {
          const stringValue = String(value);
          // Check if the resolved value itself contains templates and resolve recursively
          if (stringValue.includes('{{') && stringValue.includes('}}')) {
            resolvedKeys.add(trimmed);
            const resolved = this.resolve(stringValue, resolvedKeys);
            resolvedKeys.delete(trimmed);
            return resolved;
          }
          return stringValue;
        }
        return match;
        
      } catch (error) {
        console.warn(`[VariableStore] Failed to resolve template: ${trimmed}`, error);
        return match;
      }
    });
  }

  /**
   * Resolve object with template variables
   */
  resolveObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.resolve(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObject(value);
      }
      return resolved;
    }
    
    return obj;
  }

  /**
   * Resolve Faker.js expressions
   */
  private resolveFaker(expression: string): string {
    const path = expression.substring(7); // Remove '$faker.'
    const parts = path.split('.');
    
    let current: any = faker;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        throw new Error(`Invalid faker path: ${path}`);
      }
    }
    
    if (typeof current === 'function') {
      return current();
    }
    
    return current;
  }

  /**
   * Resolve random generators
   */
  private resolveRandom(expression: string): string {
    const path = expression.substring(8); // Remove '$random.'
    
    switch (path) {
      case 'uuid':
        return uuidv4();
      case 'int':
        return Math.floor(Math.random() * 1000).toString();
      case 'float':
        return Math.random().toString();
      case 'boolean':
        return Math.random() > 0.5 ? 'true' : 'false';
      case 'string':
        return Math.random().toString(36).substring(2, 15);
      default:
        // Handle parameterized functions like int(1,100)
        const match = path.match(/^(\w+)\(([^)]+)\)$/);
        if (match) {
          const [, func, params] = match;
          const args = params.split(',').map(p => p.trim());
          
          switch (func) {
            case 'int':
              const min = parseInt(args[0], 10);
              const max = parseInt(args[1], 10);
              return Math.floor(Math.random() * (max - min + 1) + min).toString();
            case 'float':
              const fMin = parseFloat(args[0]);
              const fMax = parseFloat(args[1]);
              return (Math.random() * (fMax - fMin) + fMin).toString();
            case 'string':
              const length = parseInt(args[0], 10) || 10;
              return Math.random().toString(36).substring(2, 2 + length);
            default:
              throw new Error(`Unknown random function: ${func}`);
          }
        }
        
        throw new Error(`Unknown random generator: ${path}`);
    }
  }

  /**
   * Resolve date expressions
   */
  private resolveDate(expression: string): string {
    const path = expression.substring(6); // Remove '$date.'
    
    switch (path) {
      case 'now':
        return new Date().toISOString();
      case 'iso':
        return new Date().toISOString();
      case 'today':
        return moment().format('YYYY-MM-DD');
      case 'yesterday':
        return moment().subtract(1, 'day').format('YYYY-MM-DD');
      case 'tomorrow':
        return moment().add(1, 'day').format('YYYY-MM-DD');
      case 'timestamp':
        return Date.now().toString();
      default:
        // Handle parameterized functions like format('YYYY-MM-DD')
        const match = path.match(/^(\w+)\(([^)]+)\)$/);
        if (match) {
          const [, func, params] = match;
          const args = params.split(',').map(p => p.trim().replace(/['"]/g, ''));
          
          switch (func) {
            case 'format':
              return moment().format(args[0]);
            case 'add':
              return moment().add(parseInt(args[0], 10), args[1] as any).toISOString();
            case 'subtract':
              return moment().subtract(parseInt(args[0], 10), args[1] as any).toISOString();
            default:
              throw new Error(`Unknown date function: ${func}`);
          }
        }
        
        throw new Error(`Unknown date generator: ${path}`);
    }
  }

  /**
   * Resolve environment variables
   */
  private resolveEnvironment(expression: string): string {
    const envVar = expression.substring(5); // Remove '$env.'
    return process.env[envVar] || '';
  }

  /**
   * Resolve math expressions
   */
  private resolveMath(expression: string): string {
    const path = expression.substring(6); // Remove '$math.'
    
    // Handle math constants
    switch (path) {
      case 'pi':
        return Math.PI.toString();
      case 'e':
        return Math.E.toString();
    }
    
    const match = path.match(/^(\w+)\(([^)]+)\)$/);
    if (match) {
      const [, func, params] = match;
      const args = params.split(',').map(p => parseFloat(p.trim()));
      
      switch (func) {
        case 'random':
          const [min, max] = args;
          return (Math.random() * (max - min) + min).toString();
        case 'round':
          return Math.round(args[0]).toString();
        case 'floor':
          return Math.floor(args[0]).toString();
        case 'ceil':
          return Math.ceil(args[0]).toString();
        case 'abs':
          return Math.abs(args[0]).toString();
        case 'min':
          return Math.min(...args).toString();
        case 'max':
          return Math.max(...args).toString();
        default:
          throw new Error(`Unknown math function: ${func}`);
      }
    }
    
    throw new Error(`Invalid math expression: ${path}`);
  }

  /**
   * Resolve string expressions
   */
  private resolveString(expression: string): string {
    const path = expression.substring(8); // Remove '$string.'
    
    const match = path.match(/^(\w+)\(([^)]+)\)$/);
    if (match) {
      const [, func, params] = match;
      // Parse parameters, handling both quoted strings and variable references
      const args = params.split(',').map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          return trimmed.slice(1, -1); // Remove quotes
        } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
          return trimmed.slice(1, -1); // Remove quotes
        } else {
          // Assume it's a variable reference
          const varValue = this.get(trimmed);
          return varValue !== undefined ? String(varValue) : trimmed;
        }
      });
      
      switch (func) {
        case 'upper':
          return args[0].toUpperCase();
        case 'lower':
          return args[0].toLowerCase();
        case 'capitalize':
          return args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();
        case 'trim':
          return args[0].trim();
        case 'length':
          return args[0].length.toString();
        case 'substring':
          const start = parseInt(args[1], 10) || 0;
          const end = args[2] ? parseInt(args[2], 10) : undefined;
          return args[0].substring(start, end);
        case 'replace':
          return args[0].replace(args[1], args[2] || '');
        default:
          throw new Error(`Unknown string function: ${func}`);
      }
    }
    
    throw new Error(`Invalid string expression: ${path}`);
  }

  /**
   * Create template context for advanced templating
   */
  private createTemplateContext(): TemplateContext {
    return {
      variables: this.getAll(),
      environment: process.env,
      faker,
      moment,
      uuid: uuidv4,
      random: {
        int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min),
        float: (min: number, max: number) => Math.random() * (max - min) + min,
        string: (length: number = 10) => Math.random().toString(36).substring(2, 2 + length),
        boolean: () => Math.random() > 0.5,
        uuid: uuidv4
      }
    };
  }

  /**
   * Export variables to JSON
   */
  exportToJson(): string {
    return JSON.stringify({
      global: this.getAllGlobal(),
      local: this.getAllLocal(),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import variables from JSON
   */
  importFromJson(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.global) {
        this.setGlobalBatch(data.global);
      }
      
      if (data.local) {
        this.setLocalBatch(data.local);
      }
      
    } catch (error) {
      throw new Error(`Failed to import variables: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get variable statistics
   */
  getStats(): {
    global: number;
    local: number;
    total: number;
    memoryUsage: number;
  } {
    return {
      global: this.globalVariables.size,
      local: this.localVariables.size,
      total: this.globalVariables.size + this.localVariables.size,
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  /**
   * Calculate approximate memory usage
   */
  private calculateMemoryUsage(): number {
    let size = 0;
    
    const calculateObjectSize = (obj: any): number => {
      if (typeof obj === 'string') {
        return obj.length * 2; // 2 bytes per character in UTF-16
      }
      if (typeof obj === 'number') {
        return 8;
      }
      if (typeof obj === 'boolean') {
        return 4;
      }
      if (obj === null || obj === undefined) {
        return 0;
      }
      if (Array.isArray(obj)) {
        return obj.reduce((sum, item) => sum + calculateObjectSize(item), 0);
      }
      if (typeof obj === 'object') {
        return Object.entries(obj).reduce((sum, [key, value]) => {
          return sum + key.length * 2 + calculateObjectSize(value);
        }, 0);
      }
      return 0;
    };
    
    this.globalVariables.forEach((value, key) => {
      size += key.length * 2 + calculateObjectSize(value);
    });
    
    this.localVariables.forEach((value, key) => {
      size += key.length * 2 + calculateObjectSize(value);
    });
    
    return size;
  }

  /**
   * Create a snapshot of current variables
   */
  createSnapshot(): VariableScope {
    return {
      global: { ...this.getAllGlobal() },
      local: { ...this.getAllLocal() }
    };
  }

  /**
   * Restore variables from snapshot
   */
  restoreSnapshot(snapshot: VariableScope): void {
    this.clearAll();
    if (snapshot.global) {
      this.setGlobalBatch(snapshot.global);
    }
    if (snapshot.local) {
      this.setLocalBatch(snapshot.local);
    }
  }
}

export default VariableStore;