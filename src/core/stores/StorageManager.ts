/**
 * Storage Manager for RestifiedTS
 * 
 * This module provides centralized storage management
 * coordinating between response storage, snapshot storage, and variable storage.
 */

import { RestifiedResponse, RestifiedConfig } from '../../types/RestifiedTypes';
import { ResponseStore } from './ResponseStore';
import { SnapshotStore } from './SnapshotStore';
import { VariableStore } from './VariableStore';

/**
 * Centralized storage manager
 */
export class StorageManager {
  private responseStore: ResponseStore;
  private snapshotStore: SnapshotStore;
  private variableStore: VariableStore;
  private config: RestifiedConfig['storage'];

  constructor(config?: RestifiedConfig['storage']) {
    this.config = {
      maxResponses: 100,
      maxVariables: 1000,
      maxSnapshots: 50,
      persistOnDisk: false,
      storageDir: './restified-storage',
      ...config
    };

    // Initialize storage systems
    this.responseStore = new ResponseStore({
      maxSize: this.config.maxResponses,
      defaultTtl: 300000, // 5 minutes
      enableCleanup: true
    });

    this.snapshotStore = new SnapshotStore({
      snapshotDir: `${this.config.storageDir}/snapshots`,
      updateMode: false,
      autoLoad: this.config.persistOnDisk
    });

    this.variableStore = new VariableStore();
  }

  /**
   * Get the response store instance
   */
  getResponseStore(): ResponseStore {
    return this.responseStore;
  }

  /**
   * Get the snapshot store instance
   */
  getSnapshotStore(): SnapshotStore {
    return this.snapshotStore;
  }

  /**
   * Get the variable store instance
   */
  getVariableStore(): VariableStore {
    return this.variableStore;
  }

  /**
   * Store a response with automatic key generation
   */
  storeResponse(response: RestifiedResponse, customKey?: string): string {
    const key = customKey || this.generateResponseKey(response);
    this.responseStore.store(key, response);
    return key;
  }

  /**
   * Retrieve a stored response
   */
  getResponse(key: string): RestifiedResponse | null {
    return this.responseStore.get(key);
  }

  /**
   * Create or update a snapshot
   */
  async createSnapshot(key: string, data: any, metadata?: Record<string, any>): Promise<void> {
    await this.snapshotStore.snapshot(key, data, metadata);
  }

  /**
   * Compare data against a snapshot
   */
  async compareSnapshot(key: string, data: any): Promise<{ equal: boolean; diff?: any }> {
    const result = await this.snapshotStore.compare(key, data);
    return {
      equal: result.equal,
      diff: result.equal ? undefined : result
    };
  }

  /**
   * Store a variable in the global scope
   */
  setVariable(name: string, value: any): void {
    this.variableStore.setGlobal(name, value);
  }

  /**
   * Get a variable value
   */
  getVariable(name: string): any {
    return this.variableStore.get(name);
  }

  /**
   * Get comprehensive storage statistics
   */
  getStats(): {
    responses: ReturnType<ResponseStore['getStats']>;
    snapshots: ReturnType<SnapshotStore['getStats']>;
    variables: ReturnType<VariableStore['getStats']>;
    totalMemoryUsage: number;
  } {
    const responseStats = this.responseStore.getStats();
    const snapshotStats = this.snapshotStore.getStats();
    const variableStats = this.variableStore.getStats();

    return {
      responses: responseStats,
      snapshots: snapshotStats,
      variables: variableStats,
      totalMemoryUsage: responseStats.memoryUsage + snapshotStats.totalSize + variableStats.memoryUsage
    };
  }

  /**
   * Clear all storage systems
   */
  async clearAll(): Promise<void> {
    this.responseStore.clear();
    await this.snapshotStore.clear();
    this.variableStore.clearAll();
  }

  /**
   * Export all data from storage systems
   */
  async exportAll(): Promise<{
    responses: ReturnType<ResponseStore['export']>;
    snapshots: ReturnType<SnapshotStore['export']>;
    variables: any;
    metadata: {
      exportTime: Date;
      version: string;
    };
  }> {
    return {
      responses: this.responseStore.export(),
      snapshots: this.snapshotStore.export(),
      variables: JSON.parse(this.variableStore.exportToJson()),
      metadata: {
        exportTime: new Date(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Import data into storage systems
   */
  async importAll(data: {
    responses?: ReturnType<ResponseStore['export']>;
    snapshots?: ReturnType<SnapshotStore['export']>;
    variables?: any;
  }): Promise<void> {
    if (data.responses) {
      this.responseStore.import(data.responses);
    }

    if (data.snapshots) {
      await this.snapshotStore.import(data.snapshots);
    }

    if (data.variables) {
      this.variableStore.importFromJson(JSON.stringify(data.variables));
    }
  }

  /**
   * Save all persistent data to disk
   */
  async save(): Promise<void> {
    if (!this.config?.persistOnDisk) {
      return;
    }

    await this.snapshotStore.saveSnapshots();
    
    // Save other data if needed
    // Could extend to save responses and variables to disk as well
  }

  /**
   * Load all persistent data from disk
   */
  async load(): Promise<void> {
    if (!this.config?.persistOnDisk) {
      return;
    }

    await this.snapshotStore.loadSnapshots();
    
    // Load other data if needed
  }

  /**
   * Cleanup expired and old data
   */
  cleanup(): void {
    // Response store handles its own cleanup automatically
    // Could add cleanup logic for other stores if needed
  }

  /**
   * Update storage configuration
   */
  updateConfig(newConfig: Partial<RestifiedConfig['storage']>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update individual stores with new configuration
    if (newConfig?.maxResponses !== undefined) {
      this.responseStore.resize(newConfig.maxResponses);
    }

    if (newConfig?.storageDir !== undefined) {
      // Note: Would need to reinitialize snapshot store with new directory
      console.warn('Changing storage directory requires restart to take effect');
    }
  }

  /**
   * Get current storage configuration
   */
  getConfig(): Readonly<Required<NonNullable<RestifiedConfig['storage']>>> {
    return Object.freeze({ ...this.config }) as Required<NonNullable<RestifiedConfig['storage']>>;
  }

  /**
   * Destroy all storage systems and cleanup resources
   */
  async destroy(): Promise<void> {
    this.responseStore.destroy();
    this.variableStore.clearAll();
    // SnapshotStore doesn't need explicit cleanup
  }

  /**
   * Generate a unique key for storing responses
   */
  private generateResponseKey(response: RestifiedResponse): string {
    const method = response.request.method?.toUpperCase() || 'GET';
    const url = response.request.url || 'unknown';
    const status = response.status;
    const timestamp = response.timestamp.getTime();
    
    // Create a unique key based on request details
    const keyParts = [method, url, status, timestamp];
    return keyParts.join('-').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Find responses by criteria
   */
  findResponses(criteria: {
    status?: number;
    urlPattern?: string | RegExp;
    timeRange?: { start: Date; end: Date };
  }): Array<{ key: string; response: RestifiedResponse }> {
    let results = this.responseStore.export().map(item => ({
      key: item.key,
      response: item.response
    }));

    if (criteria.status !== undefined) {
      results = results.filter(item => item.response.status === criteria.status);
    }

    if (criteria.urlPattern) {
      const pattern = typeof criteria.urlPattern === 'string' 
        ? new RegExp(criteria.urlPattern) 
        : criteria.urlPattern;
      results = results.filter(item => pattern.test(item.response.request.url));
    }

    if (criteria.timeRange) {
      results = results.filter(item => 
        item.response.timestamp >= criteria.timeRange!.start && 
        item.response.timestamp <= criteria.timeRange!.end
      );
    }

    return results;
  }

  /**
   * Find snapshots by criteria
   */
  findSnapshots(criteria: {
    metadata?: Record<string, any>;
    timeRange?: { start: Date; end: Date };
  }): ReturnType<SnapshotStore['find']> {
    let results = this.snapshotStore.find(() => true);

    if (criteria.metadata) {
      Object.entries(criteria.metadata).forEach(([key, value]) => {
        results = results.filter(snapshot => snapshot.metadata?.[key] === value);
      });
    }

    if (criteria.timeRange) {
      results = results.filter(snapshot => 
        snapshot.timestamp >= criteria.timeRange!.start && 
        snapshot.timestamp <= criteria.timeRange!.end
      );
    }

    return results;
  }
}

export default StorageManager;