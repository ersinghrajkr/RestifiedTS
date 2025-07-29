/**
 * Snapshot Storage System for RestifiedTS
 * 
 * This module provides snapshot testing functionality for API responses
 * with comparison, diffing, and update capabilities.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { SnapshotData, SnapshotDiff } from '../../types/RestifiedTypes';

/**
 * Snapshot storage manager for response comparison testing
 */
export class SnapshotStore {
  private snapshots: Map<string, SnapshotData> = new Map();
  private snapshotDir: string;
  private updateMode: boolean;
  private ignoreFields: string[];

  constructor(options: {
    snapshotDir?: string;
    updateMode?: boolean;
    ignoreFields?: string[];
    autoLoad?: boolean;
  } = {}) {
    this.snapshotDir = options.snapshotDir || './output/snapshots';
    this.updateMode = options.updateMode || false;
    this.ignoreFields = options.ignoreFields || [];

    // Auto-load existing snapshots
    if (options.autoLoad !== false) {
      this.loadSnapshots().catch(err => {
        console.warn('Failed to auto-load snapshots:', err.message);
      });
    }
  }

  /**
   * Create or update a snapshot
   */
  async snapshot(key: string, data: any, metadata?: Record<string, any>): Promise<SnapshotData> {
    const processedData = this.processData(data);
    const checksum = this.calculateChecksum(processedData);
    
    const snapshotData: SnapshotData = {
      key,
      data: processedData,
      timestamp: new Date(),
      metadata: metadata || {},
      checksum
    };

    this.snapshots.set(key, snapshotData);
    
    // Save to disk
    await this.saveSnapshot(snapshotData);
    
    return snapshotData;
  }

  /**
   * Compare data against stored snapshot
   */
  async compare(key: string, data: any): Promise<SnapshotDiff> {
    const existingSnapshot = this.snapshots.get(key);
    
    if (!existingSnapshot) {
      if (this.updateMode) {
        // Create new snapshot in update mode
        await this.snapshot(key, data);
        return { equal: true };
      } else {
        throw new Error(`Snapshot '${key}' not found. Run with update mode to create it.`);
      }
    }

    const processedData = this.processData(data);
    const newChecksum = this.calculateChecksum(processedData);

    // Quick checksum comparison
    if (existingSnapshot.checksum === newChecksum) {
      return { equal: true };
    }

    // Detailed comparison
    const diff = this.createDiff(existingSnapshot.data, processedData);

    if (this.updateMode) {
      // Update snapshot in update mode
      await this.snapshot(key, data);
    }

    return diff;
  }

  /**
   * Get a stored snapshot
   */
  get(key: string): SnapshotData | null {
    return this.snapshots.get(key) || null;
  }

  /**
   * Check if a snapshot exists
   */
  has(key: string): boolean {
    return this.snapshots.has(key);
  }

  /**
   * Remove a snapshot
   */
  async remove(key: string): Promise<boolean> {
    const removed = this.snapshots.delete(key);
    
    if (removed) {
      await this.deleteSnapshotFile(key);
    }
    
    return removed;
  }

  /**
   * Clear all snapshots
   */
  async clear(): Promise<void> {
    this.snapshots.clear();
    
    try {
      await fs.rm(this.snapshotDir, { recursive: true });
    } catch (error) {
      // Ignore error if directory doesn't exist
    }
  }

  /**
   * List all snapshot keys
   */
  keys(): string[] {
    return Array.from(this.snapshots.keys());
  }

  /**
   * Get snapshot statistics
   */
  getStats(): {
    count: number;
    totalSize: number;
    oldestSnapshot?: Date;
    newestSnapshot?: Date;
  } {
    let totalSize = 0;
    let oldestSnapshot: Date | undefined;
    let newestSnapshot: Date | undefined;

    this.snapshots.forEach(snapshot => {
      totalSize += this.estimateSnapshotSize(snapshot);
      
      if (!oldestSnapshot || snapshot.timestamp < oldestSnapshot) {
        oldestSnapshot = snapshot.timestamp;
      }
      
      if (!newestSnapshot || snapshot.timestamp > newestSnapshot) {
        newestSnapshot = snapshot.timestamp;
      }
    });

    return {
      count: this.snapshots.size,
      totalSize,
      oldestSnapshot,
      newestSnapshot
    };
  }

  /**
   * Find snapshots by predicate
   */
  find(predicate: (key: string, snapshot: SnapshotData) => boolean): SnapshotData[] {
    const results: SnapshotData[] = [];
    
    this.snapshots.forEach((snapshot, key) => {
      if (predicate(key, snapshot)) {
        results.push({ ...snapshot });
      }
    });

    return results;
  }

  /**
   * Find snapshots by metadata
   */
  findByMetadata(key: string, value: any): SnapshotData[] {
    return this.find((_, snapshot) => snapshot.metadata?.[key] === value);
  }

  /**
   * Find snapshots by time range
   */
  findByTimeRange(startTime: Date, endTime: Date): SnapshotData[] {
    return this.find((_, snapshot) => 
      snapshot.timestamp >= startTime && snapshot.timestamp <= endTime
    );
  }

  /**
   * Export all snapshots
   */
  export(): Record<string, SnapshotData> {
    const exported: Record<string, SnapshotData> = {};
    
    this.snapshots.forEach((snapshot, key) => {
      exported[key] = { ...snapshot };
    });

    return exported;
  }

  /**
   * Import snapshots from export data
   */
  async import(data: Record<string, SnapshotData>): Promise<void> {
    for (const [key, snapshot] of Object.entries(data)) {
      this.snapshots.set(key, {
        ...snapshot,
        timestamp: new Date(snapshot.timestamp)
      });
      
      await this.saveSnapshot(snapshot);
    }
  }

  /**
   * Load all snapshots from disk
   */
  async loadSnapshots(): Promise<void> {
    try {
      await fs.access(this.snapshotDir);
    } catch {
      // Directory doesn't exist, nothing to load
      return;
    }

    try {
      const files = await fs.readdir(this.snapshotDir);
      const snapshotFiles = files.filter(file => file.endsWith('.json'));

      for (const file of snapshotFiles) {
        try {
          const content = await fs.readFile(join(this.snapshotDir, file), 'utf8');
          const snapshot: SnapshotData = JSON.parse(content);
          snapshot.timestamp = new Date(snapshot.timestamp);
          this.snapshots.set(snapshot.key, snapshot);
        } catch (error) {
          console.warn(`Failed to load snapshot file ${file}:`, error instanceof Error ? error.message : String(error));
        }
      }
    } catch (error) {
      throw new Error(`Failed to load snapshots: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save all snapshots to disk
   */
  async saveSnapshots(): Promise<void> {
    await this.ensureSnapshotDir();
    
    const savePromises: Promise<void>[] = [];
    
    this.snapshots.forEach(snapshot => {
      savePromises.push(this.saveSnapshot(snapshot));
    });

    await Promise.all(savePromises);
  }

  /**
   * Set update mode
   */
  setUpdateMode(updateMode: boolean): void {
    this.updateMode = updateMode;
  }

  /**
   * Get update mode status
   */
  isUpdateMode(): boolean {
    return this.updateMode;
  }

  /**
   * Set fields to ignore during comparison
   */
  setIgnoreFields(fields: string[]): void {
    this.ignoreFields = fields;
  }

  /**
   * Get ignored fields
   */
  getIgnoreFields(): string[] {
    return [...this.ignoreFields];
  }

  /**
   * Process data by removing ignored fields and normalizing
   */
  private processData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.processData(item));
    }

    const processed: any = {};
    
    Object.keys(data).forEach(key => {
      if (!this.ignoreFields.includes(key)) {
        processed[key] = this.processData(data[key]);
      }
    });

    return processed;
  }

  /**
   * Calculate checksum for data
   */
  private calculateChecksum(data: any): string {
    if (data === null || data === undefined) {
      data = { __null: true };
    }
    
    const keys = typeof data === 'object' && data !== null ? Object.keys(data).sort() : null;
    const serialized = JSON.stringify(data, keys);
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Create detailed diff between two objects
   */
  private createDiff(expected: any, actual: any): SnapshotDiff {
    const diff: SnapshotDiff = { equal: false };

    if (JSON.stringify(expected) === JSON.stringify(actual)) {
      return { equal: true };
    }

    // Simple diff implementation
    const added: Record<string, any> = {};
    const removed: Record<string, any> = {};
    const changed: Record<string, any> = {};

    // Find added and changed properties
    Object.keys(actual).forEach(key => {
      if (!(key in expected)) {
        added[key] = actual[key];
      } else if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) {
        changed[key] = {
          expected: expected[key],
          actual: actual[key]
        };
      }
    });

    // Find removed properties
    Object.keys(expected).forEach(key => {
      if (!(key in actual)) {
        removed[key] = expected[key];
      }
    });

    if (Object.keys(added).length > 0) {
      diff.added = added;
    }

    if (Object.keys(removed).length > 0) {
      diff.removed = removed;
    }

    if (Object.keys(changed).length > 0) {
      diff.changed = changed;
    }

    return diff;
  }

  /**
   * Save a single snapshot to disk
   */
  private async saveSnapshot(snapshot: SnapshotData): Promise<void> {
    await this.ensureSnapshotDir();
    
    const filename = this.getSnapshotFilename(snapshot.key);
    const filepath = join(this.snapshotDir, filename);
    
    try {
      await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save snapshot '${snapshot.key}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a snapshot file from disk
   */
  private async deleteSnapshotFile(key: string): Promise<void> {
    const filename = this.getSnapshotFilename(key);
    const filepath = join(this.snapshotDir, filename);
    
    try {
      await fs.unlink(filepath);
    } catch (error) {
      // Ignore error if file doesn't exist
    }
  }

  /**
   * Ensure snapshot directory exists
   */
  private async ensureSnapshotDir(): Promise<void> {
    try {
      await fs.mkdir(this.snapshotDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create snapshot directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate filename for snapshot
   */
  private getSnapshotFilename(key: string): string {
    // Sanitize key for filename
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${sanitized}.json`;
  }

  /**
   * Estimate memory usage of a snapshot
   */
  private estimateSnapshotSize(snapshot: SnapshotData): number {
    try {
      return JSON.stringify(snapshot).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default estimate if serialization fails
    }
  }
}

export default SnapshotStore;