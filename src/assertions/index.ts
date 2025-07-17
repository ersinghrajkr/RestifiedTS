/**
 * Assertion and Validation Utilities for RestifiedTS
 * 
 * This module provides comprehensive assertion and validation capabilities
 * for API testing with support for JSON Schema, custom matchers, and plugins.
 */

// Core assertion types
export * from './AssertionTypes';

// Assertion engine and core functionality
export { AssertionEngine } from './AssertionEngine';
export { ResponseAssertions } from './ResponseAssertions';
export { SchemaValidator } from './SchemaValidator';
export { AssertionManager, AssertionBuilder, BatchAssertionBuilder } from './AssertionManager';

// Re-export default classes for convenience
export { default as AssertionEngineDefault } from './AssertionEngine';
export { default as ResponseAssertionsDefault } from './ResponseAssertions';
export { default as SchemaValidatorDefault } from './SchemaValidator';
export { default as AssertionManagerDefault } from './AssertionManager';

// Create default instance
import { AssertionManager } from './AssertionManager';
export const assertionManager = new AssertionManager();

// Import for default export
import { AssertionEngine } from './AssertionEngine';
import { ResponseAssertions } from './ResponseAssertions';
import { SchemaValidator } from './SchemaValidator';
import { AssertionBuilder, BatchAssertionBuilder } from './AssertionManager';

// Export for backward compatibility
export default {
  AssertionEngine,
  ResponseAssertions,
  SchemaValidator,
  AssertionManager,
  AssertionBuilder,
  BatchAssertionBuilder,
  assertionManager
};