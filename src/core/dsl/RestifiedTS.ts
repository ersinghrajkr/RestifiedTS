/**
 * Temporary stub RestifiedTS.ts for build compatibility
 */

import { IGivenStep, RestifiedConfig } from '../../types/RestifiedTypes';
import { GivenStep } from './GivenStep';
import { VariableStore } from '../stores/VariableStore';
import { Config } from '../config/Config';
import { HttpClient } from '../clients/HttpClient';

export class RestifiedTS {
  private clients: Map<string, any> = new Map();
  private activeClient: string = 'default';
  private variables: Map<string, any> = new Map();
  private variableStore: VariableStore;
  private config: Config;
  private httpClient: HttpClient;

  constructor(userConfig?: Partial<RestifiedConfig>) {
    // Minimal implementation for build compatibility
    this.variableStore = new VariableStore();
    this.config = new Config(userConfig);
    this.httpClient = new HttpClient({});
  }

  given(): IGivenStep {
    return new GivenStep(this.variableStore, this.httpClient, this.config);
  }

  getReportingManager(): any {
    return {};
  }

  // Client management methods
  createClient(name: string, config?: any): void {
    this.clients.set(name, { name, config });
  }

  useClient(name: string): RestifiedTS {
    this.activeClient = name;
    return this;
  }

  getClientNames(): string[] {
    return Array.from(this.clients.keys());
  }

  clearAll(): void {
    this.clients.clear();
    this.variables.clear();
  }

  // Variable management methods
  setGlobalVariable(key: string, value: any): void {
    this.variables.set(key, value);
  }

  getGlobalVariable(key: string): any {
    return this.variables.get(key);
  }

  // Role management methods
  createRole(config: any): void {
    // No-op for compatibility
  }

  // GraphQL methods
  addGraphQLEndpoint(config: any): void {
    // No-op for compatibility
  }

  setActiveGraphQLEndpoint(name: string): void {
    // No-op for compatibility
  }

  removeGraphQLEndpoint(name: string): void {
    // No-op for compatibility
  }

  getGraphQLEndpoints(): string[] {
    return [];
  }

  // Utility methods
  async wait(ms: number): Promise<RestifiedTS> {
    if (ms < 0) {
      throw new Error('Wait time cannot be negative');
    }
    if (ms === 0) return Promise.resolve(this);
    return new Promise(resolve => setTimeout(() => resolve(this), ms));
  }

  // Batch testing methods
  async executeBatchTests(config: any): Promise<any> {
    // Return mock result for compatibility
    return {
      config,
      results: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0 },
      execution: { startTime: new Date(), endTime: new Date(), totalDuration: 0 }
    };
  }

  // WebSocket methods
  addWebSocketConnection(config: any): void {
    // No-op for compatibility
  }

  setActiveWebSocketConnection(name: string): void {
    // No-op for compatibility
  }

  removeWebSocketConnection(name: string): void {
    // No-op for compatibility
  }

  connectWebSocket(name?: string): Promise<void> {
    // No-op for compatibility
    return Promise.resolve();
  }

  disconnectWebSocket(name?: string, code?: number, reason?: string): Promise<void> {
    // No-op for compatibility
    return Promise.resolve();
  }

  connectAllWebSockets(): Promise<void> {
    // No-op for compatibility
    return Promise.resolve();
  }

  disconnectAllWebSockets(): Promise<void> {
    // No-op for compatibility
    return Promise.resolve();
  }

  sendWebSocketText(message: string, name?: string): Promise<void> {
    // No-op for compatibility
    return Promise.resolve();
  }

  sendWebSocketJSON(data: any, name?: string): Promise<void> {
    // No-op for compatibility
    return Promise.resolve();
  }

  sendWebSocketBinary(data: ArrayBuffer, name?: string): Promise<void> {
    // No-op for compatibility
    return Promise.resolve();
  }

  waitForWebSocketMessage(predicate?: (message: any) => boolean, name?: string, timeout?: number): Promise<any> {
    // Return mock message for compatibility
    return Promise.resolve('mock message');
  }

  broadcastWebSocket(message: string): Promise<void> {
    // No-op for compatibility
    return Promise.resolve();
  }

  getWebSocketManager(): any {
    // Return mock manager for compatibility
    return {
      getConnection: () => null,
      getAllConnections: () => [],
      isConnected: () => false
    };
  }

  // Cleanup methods
  async cleanup(): Promise<void> {
    this.clearAll();
  }

  static forceCleanup(): Promise<void> {
    // No-op for cleanup
    return Promise.resolve();
  }
}

// Export standalone function for cleanup
export const forceCleanup = RestifiedTS.forceCleanup;

// Create a default instance
export const restified = new RestifiedTS();