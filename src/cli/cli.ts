/**
 * CLI Module Exports
 * 
 * This file exports all CLI components for use both as a command-line tool
 * and as importable modules for programmatic use.
 */

export { TestGenerator } from './TestGenerator';
export { ProjectScaffolder } from './ProjectScaffolder';
export { ConfigGenerator } from './ConfigGenerator';
export { ModernTestGenerator } from './ModernTestGenerator';

// Export interfaces for TypeScript users
export type { ScaffoldOptions } from './ProjectScaffolder';
export type { ConfigOptions } from './ConfigGenerator';
export type { TestGenerationOptions } from './TestGenerator';