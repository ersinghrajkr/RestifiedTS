// src/core/stores/VariableStore.ts

import { VariableScope } from '../../types/RestifiedTypes';

/**
 * Variable store for managing global and local test variables
 * Supports scoped variable resolution with local override capability
 */
export class VariableStore {
  private globalVariables: Map<string, any> = new Map();
  private localVariables: Map<string, any> = new Map();
  private readonly reservedKeys = new Set(['this', 'global', 'local', 'undefined', 'null']);

  /**
   * Set a global variable
   * @param key Variable name
   * @param value Variable value
   * @throws Error if key is reserved
   */
  setGlobal(key: string, value: any): void {
    this.validateKey(key);
    this.globalVariables.set(key, this.cloneValue(value));
  }

  /**
   * Set a local variable (overrides global if exists)
   * @param key Variable name
   * @param value Variable value
   * @throws Error if key is reserved
   */
  setLocal(key: string, value: any): void {
    this.validateKey(key);
    this.localVariables.set(key, this.cloneValue(value));
  }

  /**
   * Set multiple global variables
   * @param variables Object containing key-value pairs
   */
  setGlobalBatch(variables: Record<string, any>): void {
    Object.entries(variables).forEach(([key, value]) => {
      this.setGlobal(key, value);
    });
  }

  /**
   * Set multiple local variables
   * @param variables Object containing key-value pairs
   */
  setLocalBatch(variables: Record<string, any>): void {
    Object.entries(variables).forEach(([key, value]) => {
      this.setLocal(key, value);
    });
  }

  /**
   * Get a variable value (local takes precedence over global)
   * @param key Variable name
   * @returns Variable value or undefined if not found
   */
  get(key: string): any {
    if (this.localVariables.has(key)) {
      return this.cloneValue(this.localVariables.get(key));
    }
    if (this.globalVariables.has(key)) {
      return this.cloneValue(this.globalVariables.get(key));
    }
    return undefined;
  }

  /**
   * Get a global variable (ignores local scope)
   * @param key Variable name
   * @returns Global variable value or undefined
   */
  getGlobal(key: string): any {
    const value = this.globalVariables.get(key);
    return value !== undefined ? this.cloneValue(value) : undefined;
  }

  /**
   * Get a local variable (ignores global scope)
   * @param key Variable name
   * @returns Local variable value or undefined
   */
  getLocal(key: string): any {
    const value = this.localVariables.get(key);
    return value !== undefined ? this.cloneValue(value) : undefined;
  }

  /**
   * Check if a variable exists (in either scope)
   * @param key Variable name
   * @returns True if variable exists
   */
  has(key: string): boolean {
    return this.localVariables.has(key) || this.globalVariables.has(key);
  }

  /**
   * Check if a global variable exists
   * @param key Variable name
   * @returns True if global variable exists
   */
  hasGlobal(key: string): boolean {
    return this.globalVariables.has(key);
  }

  /**
   * Check if a local variable exists
   * @param key Variable name
   * @returns True if local variable exists
   */
  hasLocal(key: string): boolean {
    return this.localVariables.has(key);
  }

  /**
   * Delete a variable from both scopes
   * @param key Variable name
   * @returns True if any variable was deleted
   */
  delete(key: string): boolean {
    const deletedLocal = this.localVariables.delete(key);
    const deletedGlobal = this.globalVariables.delete(key);
    return deletedLocal || deletedGlobal;
  }

  /**
   * Delete a global variable
   * @param key Variable name
   * @returns True if variable was deleted
   */
  deleteGlobal(key: string): boolean {
    return this.globalVariables.delete(key);
  }

  /**
   * Delete a local variable
   * @param key Variable name
   * @returns True if variable was deleted
   */
  deleteLocal(key: string): boolean {
    return this.localVariables.delete(key);
  }

  /**
   * Clear all variables
   */
  clearAll(): void {
    this.globalVariables.clear();
    this.localVariables.clear();
  }

  /**
   * Clear global variables
   */
  clearGlobal(): void {
    this.globalVariables.clear();
  }

  /**
   * Clear local variables
   */
  clearLocal(): void {
    this.localVariables.clear();
  }

  /**
   * Get all variables merged (local overrides global)
   * @returns Object containing all variables
   */
  getAll(): Record<string, any> {
    const merged: Record<string, any> = {};
    
    // Add global variables first
    this.globalVariables.forEach((value, key) => {
      merged[key] = this.cloneValue(value);
    });
    
    // Local variables override global
    this.localVariables.forEach((value, key) => {
      merged[key] = this.cloneValue(value);
    });
    
    return merged;
  }

  /**
   * Get all global variables
   * @returns Object containing global variables
   */
  getAllGlobal(): Record<string, any> {
    const global: Record<string, any> = {};
    this.globalVariables.forEach((value, key) => {
      global[key] = this.cloneValue(value);
    });
    return global;
  }

  /**
   * Get all local variables
   * @returns Object containing local variables
   */
  getAllLocal(): Record<string, any> {
    const local: Record<string, any> = {};
    this.localVariables.forEach((value, key) => {
      local[key] = this.cloneValue(value);
    });
    return local;
  }

  /**
   * Get variable scope information
   * @returns Variable scope details
   */
  getScope(): VariableScope {
    return {
      global: new Map(this.globalVariables),
      local: new Map(this.localVariables)
    };
  }

  /**
   * Get variable keys
   * @returns Array of all variable keys
   */
  getKeys(): string[] {
    const allKeys = new Set<string>();
    this.globalVariables.forEach((_, key) => allKeys.add(key));
    this.localVariables.forEach((_, key) => allKeys.add(key));
    return Array.from(allKeys);
  }

  /**
   * Export variables to JSON
   * @returns JSON string representation
   */
  toJSON(): string {
    return JSON.stringify({
      global: this.getAllGlobal(),
      local: this.getAllLocal()
    }, null, 2);
  }

  /**
   * Import variables from JSON
   * @param json JSON string containing variables
   * @param clearExisting Whether to clear existing variables
   */
  fromJSON(json: string, clearExisting: boolean = false): void {
    try {
      const data = JSON.parse(json);
      
      if (clearExisting) {
        this.clearAll();
      }
      
      if (data.global) {
        this.setGlobalBatch(data.global);
      }
      
      if (data.local) {
        this.setLocalBatch(data.local);
      }
    } catch (error) {
      throw new Error(`Failed to import variables from JSON: ${(error as Error).message}`);
    }
  }

  /**
   * Validate variable key
   * @param key Variable name to validate
   * @throws Error if key is invalid
   */
  private validateKey(key: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Variable key must be a non-empty string');
    }

    if (this.reservedKeys.has(key)) {
      throw new Error(`Variable key '${key}' is reserved`);
    }

    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      throw new Error(`Variable key '${key}' must be a valid identifier`);
    }
  }

  /**
   * Deep clone a value to prevent mutations
   * @param value Value to clone
   * @returns Cloned value
   */
  private cloneValue(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    if (Array.isArray(value)) {
      return value.map(item => this.cloneValue(item));
    }

    if (typeof value === 'object') {
      const cloned: any = {};
      for (const [key, val] of Object.entries(value)) {
        cloned[key] = this.cloneValue(val);
      }
      return cloned;
    }

    return value;
  }
}

// src/core/stores/ResponseStore.ts

import { RestifiedResponse } from '../../types/RestifiedTypes';

/**
 * Response store for managing HTTP responses
 * Provides storage, retrieval, and management of API responses
 */
export class ResponseStore {
  private responses: Map<string, RestifiedResponse> = new Map();
  private readonly maxStoredResponses: number;
  private readonly insertionOrder: string[] = [];

  constructor(maxStoredResponses: number = 100) {
    this.maxStoredResponses = maxStoredResponses;
  }

  /**
   * Store a response with a key
   * @param key Unique identifier for the response
   * @param response Response object to store
   * @throws Error if key already exists
   */
  store(key: string, response: RestifiedResponse): void {
    this.validateKey(key);
    
    if (this.responses.has(key)) {
      throw new Error(`Response with key '${key}' already exists. Use update() to modify existing responses.`);
    }

    this.addResponse(key, response);
  }

  /**
   * Store or update a response (overwrites if exists)
   * @param key Unique identifier for the response
   * @param response Response object to store
   */
  storeOrUpdate(key: string, response: RestifiedResponse): void {
    this.validateKey(key);
    this.addResponse(key, response);
  }

  /**
   * Update an existing response
   * @param key Response key
   * @param response New response object
   * @throws Error if response doesn't exist
   */
  update(key: string, response: RestifiedResponse): void {
    if (!this.responses.has(key)) {
      throw new Error(`Response with key '${key}' does not exist. Use store() to add new responses.`);
    }
    
    this.responses.set(key, this.cloneResponse(response));
  }

  /**
   * Get a stored response
   * @param key Response key
   * @returns Cloned response object or undefined if not found
   */
  get(key: string): RestifiedResponse | undefined {
    const response = this.responses.get(key);
    return response ? this.cloneResponse(response) : undefined;
  }

  /**
   * Check if a response exists
   * @param key Response key
   * @returns True if response exists
   */
  has(key: string): boolean {
    return this.responses.has(key);
  }

  /**
   * Delete a stored response
   * @param key Response key
   * @returns True if response was deleted
   */
  delete(key: string): boolean {
    const deleted = this.responses.delete(key);
    if (deleted) {
      const index = this.insertionOrder.indexOf(key);
      if (index > -1) {
        this.insertionOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  /**
   * Clear all stored responses
   */
  clear(): void {
    this.responses.clear();
    this.insertionOrder.length = 0;
  }

  /**
   * Get all stored responses
   * @returns Map of all responses (cloned)
   */
  getAll(): Map<string, RestifiedResponse> {
    const clonedMap = new Map<string, RestifiedResponse>();
    this.responses.forEach((response, key) => {
      clonedMap.set(key, this.cloneResponse(response));
    });
    return clonedMap;
  }

  /**
   * Get all response keys
   * @returns Array of response keys in insertion order
   */
  getKeys(): string[] {
    return [...this.insertionOrder];
  }

  /**
   * Get response keys matching a pattern
   * @param pattern RegExp or string pattern to match
   * @returns Array of matching keys
   */
  getKeysMatching(pattern: RegExp | string): string[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return this.insertionOrder.filter(key => regex.test(key));
  }

  /**
   * Get responses by status code
   * @param statusCode HTTP status code
   * @returns Array of responses with matching status code
   */
  getByStatusCode(statusCode: number): { key: string; response: RestifiedResponse }[] {
    const results: { key: string; response: RestifiedResponse }[] = [];
    
    this.responses.forEach((response, key) => {
      if (response.status === statusCode) {
        results.push({ key, response: this.cloneResponse(response) });
      }
    });
    
    return results;
  }

  /**
   * Get responses by status code range
   * @param minStatus Minimum status code (inclusive)
   * @param maxStatus Maximum status code (inclusive)
   * @returns Array of responses within status code range
   */
  getByStatusRange(minStatus: number, maxStatus: number): { key: string; response: RestifiedResponse }[] {
    const results: { key: string; response: RestifiedResponse }[] = [];
    
    this.responses.forEach((response, key) => {
      if (response.status >= minStatus && response.status <= maxStatus) {
        results.push({ key, response: this.cloneResponse(response) });
      }
    });
    
    return results;
  }

  /**
   * Get the most recent response
   * @returns Most recently stored response or undefined
   */
  getLatest(): { key: string; response: RestifiedResponse } | undefined {
    if (this.insertionOrder.length === 0) {
      return undefined;
    }
    
    const latestKey = this.insertionOrder[this.insertionOrder.length - 1];
    const response = this.responses.get(latestKey);
    
    return response ? { key: latestKey, response: this.cloneResponse(response) } : undefined;
  }

  /**
   * Get response count
   * @returns Number of stored responses
   */
  size(): number {
    return this.responses.size;
  }

  /**
   * Check if store is empty
   * @returns True if no responses are stored
   */
  isEmpty(): boolean {
    return this.responses.size === 0;
  }

  /**
   * Check if store is at capacity
   * @returns True if store is at maximum capacity
   */
  isFull(): boolean {
    return this.responses.size >= this.maxStoredResponses;
  }

  /**
   * Get store statistics
   * @returns Object containing store statistics
   */
  getStats(): {
    totalResponses: number;
    maxCapacity: number;
    utilizationPercentage: number;
    oldestKey: string | undefined;
    newestKey: string | undefined;
    statusCodeDistribution: Record<number, number>;
  } {
    const statusCodeDistribution: Record<number, number> = {};
    
    this.responses.forEach(response => {
      statusCodeDistribution[response.status] = (statusCodeDistribution[response.status] || 0) + 1;
    });

    return {
      totalResponses: this.responses.size,
      maxCapacity: this.maxStoredResponses,
      utilizationPercentage: (this.responses.size / this.maxStoredResponses) * 100,
      oldestKey: this.insertionOrder[0],
      newestKey: this.insertionOrder[this.insertionOrder.length - 1],
      statusCodeDistribution
    };
  }

  /**
   * Export responses to JSON
   * @param keys Optional array of keys to export (exports all if not provided)
   * @returns JSON string representation
   */
  toJSON(keys?: string[]): string {
    const exportData: Record<string, RestifiedResponse> = {};
    const keysToExport = keys || this.insertionOrder;
    
    keysToExport.forEach(key => {
      const response = this.responses.get(key);
      if (response) {
        exportData[key] = response;
      }
    });
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import responses from JSON
   * @param json JSON string containing responses
   * @param clearExisting Whether to clear existing responses
   * @param overwriteExisting Whether to overwrite existing keys
   */
  fromJSON(json: string, clearExisting: boolean = false, overwriteExisting: boolean = false): void {
    try {
      const data = JSON.parse(json);
      
      if (clearExisting) {
        this.clear();
      }
      
      Object.entries(data).forEach(([key, response]) => {
        if (this.responses.has(key) && !overwriteExisting) {
          throw new Error(`Response with key '${key}' already exists and overwriteExisting is false`);
        }
        
        this.addResponse(key, response as RestifiedResponse);
      });
    } catch (error) {
      throw new Error(`Failed to import responses from JSON: ${(error as Error).message}`);
    }
  }

  /**
   * Validate response key
   * @param key Key to validate
   * @throws Error if key is invalid
   */
  private validateKey(key: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Response key must be a non-empty string');
    }
  }

  /**
   * Add response to store with capacity management
   * @param key Response key
   * @param response Response object
   */
  private addResponse(key: string, response: RestifiedResponse): void {
    // Remove oldest response if at capacity and adding a new key
    if (!this.responses.has(key) && this.responses.size >= this.maxStoredResponses) {
      const oldestKey = this.insertionOrder.shift();
      if (oldestKey) {
        this.responses.delete(oldestKey);
      }
    }

    // Update insertion order
    if (!this.responses.has(key)) {
      this.insertionOrder.push(key);
    }

    this.responses.set(key, this.cloneResponse(response));
  }

  /**
   * Deep clone a response to prevent mutations
   * @param response Response to clone
   * @returns Cloned response
   */
  private cloneResponse(response: RestifiedResponse): RestifiedResponse {
    return {
      status: response.status,
      statusText: response.statusText,
      headers: { ...response.headers },
      data: this.cloneValue(response.data),
      responseTime: response.responseTime,
      url: response.url,
      config: { ...response.config }
    };
  }

  /**
   * Deep clone a value
   * @param value Value to clone
   * @returns Cloned value
   */
  private cloneValue(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    if (Array.isArray(value)) {
      return value.map(item => this.cloneValue(item));
    }

    if (typeof value === 'object') {
      const cloned: any = {};
      for (const [key, val] of Object.entries(value)) {
        cloned[key] = this.cloneValue(val);
      }
      return cloned;
    }

    return value;
  }
}

// src/core/stores/SnapshotStore.ts

import { SnapshotDiff } from '../../types/RestifiedTypes';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Snapshot store for managing response snapshots and comparisons
 * Provides snapshot storage, comparison, and diff generation
 */
export class SnapshotStore {
  private snapshots: Map<string, any> = new Map();
  private snapshotMetadata: Map<string, SnapshotMetadata> = new Map();
  private readonly snapshotDirectory: string;

  constructor(snapshotDirectory: string = './snapshots') {
    this.snapshotDirectory = snapshotDirectory;
    this.ensureSnapshotDirectory();
  }

  /**
   * Save a snapshot
   * @param key Snapshot identifier
   * @param data Data to snapshot
   * @param metadata Optional metadata
   */
  save(key: string, data: any, metadata?: Partial<SnapshotMetadata>): void {
    this.validateKey(key);
    
    const snapshotData = this.cloneValue(data);
    const snapshotMeta: SnapshotMetadata = {
      key,
      timestamp: new Date(),
      version: this.getNextVersion(key),
      size: JSON.stringify(snapshotData).length,
      ...metadata
    };

    this.snapshots.set(key, snapshotData);
    this.snapshotMetadata.set(key, snapshotMeta);
  }

  /**
   * Get a snapshot
   * @param key Snapshot identifier
   * @returns Cloned snapshot data or undefined
   */
  get(key: string): any {
    const snapshot = this.snapshots.get(key);
    return snapshot ? this.cloneValue(snapshot) : undefined;
  }

  /**
   * Check if snapshot exists
   * @param key Snapshot identifier
   * @returns True if snapshot exists
   */
  has(key: string): boolean {
    return this.snapshots.has(key);
  }

  /**
   * Delete a snapshot
   * @param key Snapshot identifier
   * @returns True if snapshot was deleted
   */
  delete(key: string): boolean {
    const deleted = this.snapshots.delete(key);
    if (deleted) {
      this.snapshotMetadata.delete(key);
    }
    return deleted;
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots.clear();
    this.snapshotMetadata.clear();
  }

  /**
   * Compare current data with stored snapshot
   * @param key Snapshot identifier
   * @param currentData Current data to compare
   * @returns Snapshot diff result
   */
  compare(key: string, currentData: any): SnapshotDiff {
    const storedSnapshot = this.get(key);
    
    if (!storedSnapshot) {
      return {
        hasDifferences: true,
        added: [currentData],
        removed: [],
        modified: []
      };
    }

    return this.generateDiff(storedSnapshot, currentData);
  }

  /**
   * Update existing snapshot
   * @param key Snapshot identifier
   * @param data New data
   * @param metadata Optional metadata updates
   * @throws Error if snapshot doesn't exist
   */
  update(key: string, data: any, metadata?: Partial<SnapshotMetadata>): void {
    if (!this.has(key)) {
      throw new Error(`Snapshot with key '${key}' does not exist`);
    }
    
    this.save(key, data, metadata);
  }

  /**
   * Get all snapshots
   * @returns Map of all snapshots (cloned)
   */
  getAll(): Map<string, any> {
    const clonedMap = new Map<string, any>();
    this.snapshots.forEach((snapshot, key) => {
      clonedMap.set(key, this.cloneValue(snapshot));
    });
    return clonedMap;
  }

  /**
   * Get snapshot metadata
   * @param key Snapshot identifier
   * @returns Snapshot metadata or undefined
   */
  getMetadata(key: string): SnapshotMetadata | undefined {
    return this.snapshotMetadata.get(key);
  }

  /**
   * Get all snapshot keys
   * @returns Array of snapshot keys
   */
  getKeys(): string[] {
    return Array.from(this.snapshots.keys());
  }

  /**
   * Get snapshots by pattern
   * @param pattern RegExp or string pattern to match
   * @returns Array of matching snapshot keys
   */
  getKeysMatching(pattern: RegExp | string): string[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return this.getKeys().filter(key => regex.test(key));
  }

  /**
   * Export snapshot to file
   * @param key Snapshot identifier
   * @param filePath Optional file path (defaults to snapshot directory)
   * @returns Promise resolving to file path
   */
  async exportToFile(key: string, filePath?: string): Promise<string> {
    const snapshot = this.get(key);
    const metadata = this.getMetadata(key);
    
    if (!snapshot) {
      throw new Error(`Snapshot with key '${key}' does not exist`);
    }

    const fileName = filePath || path.join(this.snapshotDirectory, `${key}.json`);
    const exportData = {
      metadata,
      data: snapshot
    };

    await fs.promises.writeFile(fileName, JSON.stringify(exportData, null, 2), 'utf-8');
    return fileName;
  }

  /**
   * Import snapshot from file
   * @param filePath File path to import from
   * @param key Optional key override
   * @returns Promise resolving to snapshot key
   */
  async importFromFile(filePath: string, key?: string): Promise<string> {
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      const importData = JSON.parse(fileContent);
      
      const snapshotKey = key || importData.metadata?.key || path.basename(filePath, '.json');
      this.save(snapshotKey, importData.data, importData.metadata);
      
      return snapshotKey;
    } catch (error) {
      throw new Error(`Failed to import snapshot from ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Get snapshot statistics
   * @returns Object containing snapshot statistics
   */
  getStats(): {
    totalSnapshots: number;
    totalSize: number;
    averageSize: number;
    oldestSnapshot: SnapshotMetadata | undefined;
    newestSnapshot: SnapshotMetadata | undefined;
  } {
    const metadataArray = Array.from(this.snapshotMetadata.values());
    const totalSize = metadataArray.reduce((sum, meta) => sum + meta.size, 0);
    
    const sortedByDate = metadataArray.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return {
      totalSnapshots: this.snapshots.size,
      totalSize,
      averageSize: this.snapshots.size > 0 ? totalSize / this.snapshots.size : 0,
      oldestSnapshot: sortedByDate[0],
      newestSnapshot: sortedByDate[sortedByDate.length - 1]
    };
  }

  /**
   * Generate diff between two objects
   * @param original Original object
   * @param current Current object
   * @returns Snapshot diff
   */
  private generateDiff(original: any, current: any): SnapshotDiff {
    const added: any[] = [];
    const removed: any[] = [];
    const modified: any[] = [];

    const diff = this.deepDiff(original, current, '');
    
    return {
      hasDifferences: diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0,
      added: diff.added,
      removed: diff.removed,
      modified: diff.modified
    };
  }

  /**
   * Perform deep diff on two objects
   * @param obj1 First object
   * @param obj2 Second object
   * @param path Current path in object tree
   * @returns Detailed diff information
   */
  private deepDiff(obj1: any, obj2: any, path: string): {
    added: any[];
    removed: any[];
    modified: any[];
  } {
    const result = { added: [] as any[], removed: [] as any[], modified: [] as any[] };

    if (obj1 === obj2) {
      return result;
    }

    if (typeof obj1 !== typeof obj2) {
      result.modified.push({ path, original: obj1, current: obj2 });
      return result;
    }

    if (obj1 === null || obj2 === null || typeof obj1 !== 'object') {
      if (obj1 !== obj2) {
        result.modified.push({ path, original: obj1, current: obj2 });
      }
      return result;
    }

    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      return this.diffArrays(obj1, obj2, path);
    }

    if (Array.isArray(obj1) || Array.isArray(obj2)) {
      result.modified.push({ path, original: obj1, current: obj2 });
      return result;
    }

    return this.diffObjects(obj1, obj2, path);
  }

  /**
   * Diff two arrays
   * @param arr1 First array
   * @param arr2 Second array
   * @param path Current path
   * @returns Diff result
   */
  private diffArrays(arr1: any[], arr2: any[], path: string): {
    added: any[];
    removed: any[];
    modified: any[];
  } {
    const result = { added: [] as any[], removed: [] as any[], modified: [] as any[] };

    const maxLength = Math.max(arr1.length, arr2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const currentPath = `${path}[${i}]`;
      
      if (i >= arr1.length) {
        result.added.push({ path: currentPath, value: arr2[i] });
      } else if (i >= arr2.length) {
        result.removed.push({ path: currentPath, value: arr1[i] });
      } else {
        const itemDiff = this.deepDiff(arr1[i], arr2[i], currentPath);
        result.added.push(...itemDiff.added);
        result.removed.push(...itemDiff.removed);
        result.modified.push(...itemDiff.modified);
      }
    }

    return result;
  }

  /**
   * Diff two objects
   * @param obj1 First object
   * @param obj2 Second object
   * @param path Current path
   * @returns Diff result
   */
  private diffObjects(obj1: Record<string, any>, obj2: Record<string, any>, path: string): {
    added: any[];
    removed: any[];
    modified: any[];
  } {
    const result = { added: [] as any[], removed: [] as any[], modified: [] as any[] };
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in obj1)) {
        result.added.push({ path: currentPath, value: obj2[key] });
      } else if (!(key in obj2)) {
        result.removed.push({ path: currentPath, value: obj1[key] });
      } else {
        const keyDiff = this.deepDiff(obj1[key], obj2[key], currentPath);
        result.added.push(...keyDiff.added);
        result.removed.push(...keyDiff.removed);
        result.modified.push(...keyDiff.modified);
      }
    }

    return result;
  }

  /**
   * Get next version number for a snapshot key
   * @param key Snapshot identifier
   * @returns Next version number
   */
  private getNextVersion(key: string): number {
    const existing = this.snapshotMetadata.get(key);
    return existing ? existing.version + 1 : 1;
  }

  /**
   * Ensure snapshot directory exists
   */
  private ensureSnapshotDirectory(): void {
    try {
      if (!fs.existsSync(this.snapshotDirectory)) {
        fs.mkdirSync(this.snapshotDirectory, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create snapshot directory: ${(error as Error).message}`);
    }
  }

  /**
   * Validate snapshot key
   * @param key Key to validate
   * @throws Error if key is invalid
   */
  private validateKey(key: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Snapshot key must be a non-empty string');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      throw new Error('Snapshot key must contain only alphanumeric characters, underscores, and hyphens');
    }
  }

  /**
   * Deep clone a value
   * @param value Value to clone
   * @returns Cloned value
   */
  private cloneValue(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    if (Array.isArray(value)) {
      return value.map(item => this.cloneValue(item));
    }

    if (typeof value === 'object') {
      const cloned: any = {};
      for (const [key, val] of Object.entries(value)) {
        cloned[key] = this.cloneValue(val);
      }
      return cloned;
    }

    return value;
  }
}

interface SnapshotMetadata {
  key: string;
  timestamp: Date;
  version: number;
  size: number;
  description?: string;
  tags?: string[];
}