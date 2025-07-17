/**
 * Storage Module Exports for RestifiedTS
 * 
 * This module exports all storage-related classes and utilities.
 */

// Storage classes
export { VariableStore } from './VariableStore';
export { ResponseStore } from './ResponseStore';
export { SnapshotStore } from './SnapshotStore';
export { StorageManager } from './StorageManager';

// Re-export types for convenience
export type {
  VariableScope,
  ResponseStorage,
  SnapshotData,
  SnapshotDiff
} from '../../types/RestifiedTypes';

// Default export
export { StorageManager as default } from './StorageManager';