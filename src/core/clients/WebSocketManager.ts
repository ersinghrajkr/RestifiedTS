/**
 * WebSocket Manager for RestifiedTS
 * 
 * This module provides centralized WebSocket connection management
 * with support for multiple connections, testing scenarios, and real-time monitoring.
 */

import { WebSocketClient, WebSocketMessage, WebSocketConnectionInfo, MessageMatcher } from './WebSocketClient';
import { WebSocketConfig } from '../../types/RestifiedTypes';

/**
 * WebSocket connection definition
 */
export interface WebSocketConnection extends WebSocketConfig {
  name: string;
  description?: string;
  tags?: string[];
}

/**
 * WebSocket test scenario
 */
export interface WebSocketScenario {
  name: string;
  description?: string;
  steps: WebSocketStep[];
  timeout?: number;
  beforeConnect?: () => Promise<void>;
  afterDisconnect?: () => Promise<void>;
}

/**
 * WebSocket test step
 */
export interface WebSocketStep {
  type: 'connect' | 'disconnect' | 'send' | 'wait' | 'expect' | 'delay';
  connection?: string;
  data?: any;
  matcher?: MessageMatcher;
  delay?: number;
  description?: string;
}

/**
 * WebSocket test result
 */
export interface WebSocketTestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  steps: Array<{
    step: WebSocketStep;
    passed: boolean;
    duration: number;
    error?: string;
    message?: WebSocketMessage;
  }>;
  error?: string;
}

/**
 * WebSocket manager for handling multiple connections
 */
export class WebSocketManager {
  private connections: Map<string, WebSocketClient> = new Map();
  private connectionConfigs: Map<string, WebSocketConnection> = new Map();
  private scenarios: Map<string, WebSocketScenario> = new Map();
  private activeConnection?: string;

  /**
   * Add a WebSocket connection
   */
  addConnection(config: WebSocketConnection): void {
    const client = new WebSocketClient(config);
    this.connections.set(config.name, client);
    this.connectionConfigs.set(config.name, config);
    
    // Set as active if it's the first connection
    if (!this.activeConnection) {
      this.activeConnection = config.name;
    }

    // Forward events with connection name
    client.on('connection', (info) => {
      console.log(`[WebSocket:${config.name}] Connected to ${info.url}`);
    });

    client.on('message', (message) => {
      console.log(`[WebSocket:${config.name}] Received ${message.type} message: ${this.formatMessageData(message.data)}`);
    });

    client.on('close', (code, reason) => {
      console.log(`[WebSocket:${config.name}] Connection closed: ${code} ${reason}`);
    });

    client.on('error', (error) => {
      console.error(`[WebSocket:${config.name}] Error:`, error.message);
    });

    client.on('reconnect', (attempt) => {
      console.log(`[WebSocket:${config.name}] Reconnecting (attempt ${attempt})`);
    });
  }

  /**
   * Remove a WebSocket connection
   */
  async removeConnection(name: string): Promise<boolean> {
    const client = this.connections.get(name);
    if (!client) {
      return false;
    }

    // Disconnect if connected
    try {
      await client.disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }

    this.connections.delete(name);
    this.connectionConfigs.delete(name);

    // Update active connection if needed
    if (this.activeConnection === name) {
      this.activeConnection = undefined;
      const firstConnection = this.connections.keys().next().value;
      if (firstConnection) {
        this.activeConnection = firstConnection;
      }
    }

    return true;
  }

  /**
   * Set active WebSocket connection
   */
  setActiveConnection(name: string): void {
    if (!this.connections.has(name)) {
      throw new Error(`WebSocket connection '${name}' not found`);
    }
    this.activeConnection = name;
  }

  /**
   * Get active WebSocket client
   */
  getActiveClient(): WebSocketClient | undefined {
    if (!this.activeConnection) {
      return undefined;
    }
    return this.connections.get(this.activeConnection);
  }

  /**
   * Get WebSocket client by name
   */
  getClient(name: string): WebSocketClient | undefined {
    return this.connections.get(name);
  }

  /**
   * Get all connection names
   */
  getConnectionNames(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Connect to a WebSocket
   */
  async connect(connectionName?: string): Promise<void> {
    const client = this.getClientForOperation(connectionName);
    await client.connect();
  }

  /**
   * Disconnect from a WebSocket
   */
  async disconnect(connectionName?: string, code?: number, reason?: string): Promise<void> {
    const client = this.getClientForOperation(connectionName);
    await client.disconnect(code, reason);
  }

  /**
   * Send text message
   */
  async sendText(text: string, connectionName?: string): Promise<WebSocketMessage> {
    const client = this.getClientForOperation(connectionName);
    return client.sendText(text);
  }

  /**
   * Send JSON message
   */
  async sendJSON(data: any, connectionName?: string): Promise<WebSocketMessage> {
    const client = this.getClientForOperation(connectionName);
    return client.sendJSON(data);
  }

  /**
   * Send binary message
   */
  async sendBinary(data: Buffer, connectionName?: string): Promise<WebSocketMessage> {
    const client = this.getClientForOperation(connectionName);
    return client.sendBinary(data);
  }

  /**
   * Wait for message
   */
  async waitForMessage(matcher: MessageMatcher, connectionName?: string): Promise<WebSocketMessage> {
    const client = this.getClientForOperation(connectionName);
    return client.waitForMessage(matcher);
  }

  /**
   * Add a test scenario
   */
  addScenario(scenario: WebSocketScenario): void {
    this.scenarios.set(scenario.name, scenario);
  }

  /**
   * Remove a test scenario
   */
  removeScenario(name: string): boolean {
    return this.scenarios.delete(name);
  }

  /**
   * Get a test scenario
   */
  getScenario(name: string): WebSocketScenario | undefined {
    return this.scenarios.get(name);
  }

  /**
   * List all scenario names
   */
  getScenarioNames(): string[] {
    return Array.from(this.scenarios.keys());
  }

  /**
   * Execute a test scenario
   */
  async executeScenario(scenarioName: string): Promise<WebSocketTestResult> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`WebSocket scenario '${scenarioName}' not found`);
    }

    const startTime = Date.now();
    const result: WebSocketTestResult = {
      scenario: scenarioName,
      passed: false,
      duration: 0,
      steps: []
    };

    try {
      // Execute before connect hook
      if (scenario.beforeConnect) {
        await scenario.beforeConnect();
      }

      // Execute steps
      for (const step of scenario.steps) {
        const stepResult = await this.executeStep(step);
        result.steps.push(stepResult);
        
        if (!stepResult.passed) {
          result.passed = false;
          result.error = stepResult.error;
          break;
        }
      }

      // If all steps passed
      if (result.steps.every(s => s.passed)) {
        result.passed = true;
      }

      // Execute after disconnect hook
      if (scenario.afterDisconnect) {
        await scenario.afterDisconnect();
      }

    } catch (error) {
      result.passed = false;
      result.error = error instanceof Error ? error.message : String(error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Execute multiple scenarios
   */
  async executeScenarios(scenarioNames: string[]): Promise<WebSocketTestResult[]> {
    const results: WebSocketTestResult[] = [];
    
    for (const scenarioName of scenarioNames) {
      const result = await this.executeScenario(scenarioName);
      results.push(result);
    }

    return results;
  }

  /**
   * Get connection statistics for all connections
   */
  getAllStats(): Record<string, ReturnType<WebSocketClient['getStats']>> {
    const stats: Record<string, ReturnType<WebSocketClient['getStats']>> = {};
    
    this.connections.forEach((client, name) => {
      stats[name] = client.getStats();
    });

    return stats;
  }

  /**
   * Get connection info for all connections
   */
  getAllConnectionInfo(): Record<string, WebSocketConnectionInfo> {
    const info: Record<string, WebSocketConnectionInfo> = {};
    
    this.connections.forEach((client, name) => {
      info[name] = client.getConnectionInfo();
    });

    return info;
  }

  /**
   * Get message history for all connections
   */
  getAllMessageHistory(): Record<string, WebSocketMessage[]> {
    const history: Record<string, WebSocketMessage[]> = {};
    
    this.connections.forEach((client, name) => {
      history[name] = [...client.getMessageHistory()];
    });

    return history;
  }

  /**
   * Clear message history for all connections
   */
  clearAllMessageHistory(): void {
    this.connections.forEach(client => {
      client.clearMessageHistory();
    });
  }

  /**
   * Find connections by tag
   */
  findConnectionsByTag(tag: string): string[] {
    const results: string[] = [];
    
    this.connectionConfigs.forEach((config, name) => {
      if (config.tags && config.tags.includes(tag)) {
        results.push(name);
      }
    });

    return results;
  }

  /**
   * Connect to all connections
   */
  async connectAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    this.connections.forEach((client) => {
      promises.push(client.connect());
    });

    await Promise.all(promises);
  }

  /**
   * Disconnect from all connections
   */
  async disconnectAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    this.connections.forEach((client) => {
      promises.push(client.disconnect());
    });

    await Promise.all(promises);
  }

  /**
   * Broadcast message to all connected WebSockets
   */
  async broadcast(message: string | any): Promise<WebSocketMessage[]> {
    const results: WebSocketMessage[] = [];
    
    for (const [name, client] of this.connections) {
      try {
        if (client.getConnectionInfo().state === 'open') {
          const result = typeof message === 'string' 
            ? await client.sendText(message)
            : await client.sendJSON(message);
          results.push(result);
        }
      } catch (error) {
        console.warn(`Failed to broadcast to ${name}:`, error instanceof Error ? error.message : String(error));
      }
    }

    return results;
  }

  /**
   * Get manager summary
   */
  getSummary(): {
    connectionCount: number;
    scenarioCount: number;
    activeConnection?: string;
    connections: Array<{
      name: string;
      url: string;
      state: string;
      tags?: string[];
    }>;
  } {
    const connections: Array<{ name: string; url: string; state: string; tags?: string[] }> = [];
    
    this.connectionConfigs.forEach((config, name) => {
      const client = this.connections.get(name);
      connections.push({
        name,
        url: config.url,
        state: client ? client.getConnectionInfo().state : 'not_initialized',
        tags: config.tags
      });
    });

    return {
      connectionCount: this.connections.size,
      scenarioCount: this.scenarios.size,
      activeConnection: this.activeConnection,
      connections
    };
  }

  /**
   * Clear all connections and scenarios
   */
  async clear(): Promise<void> {
    await this.disconnectAll();
    this.connections.clear();
    this.connectionConfigs.clear();
    this.scenarios.clear();
    this.activeConnection = undefined;
  }

  /**
   * Execute a single test step
   */
  private async executeStep(step: WebSocketStep): Promise<{
    step: WebSocketStep;
    passed: boolean;
    duration: number;
    error?: string;
    message?: WebSocketMessage;
  }> {
    const startTime = Date.now();
    
    try {
      switch (step.type) {
        case 'connect':
          await this.connect(step.connection);
          break;
          
        case 'disconnect':
          await this.disconnect(step.connection);
          break;
          
        case 'send':
          const message = typeof step.data === 'string' 
            ? await this.sendText(step.data, step.connection)
            : await this.sendJSON(step.data, step.connection);
          return {
            step,
            passed: true,
            duration: Date.now() - startTime,
            message
          };
          
        case 'wait':
          if (step.matcher) {
            const receivedMessage = await this.waitForMessage(step.matcher, step.connection);
            return {
              step,
              passed: true,
              duration: Date.now() - startTime,
              message: receivedMessage
            };
          }
          break;
          
        case 'expect':
          // This would be used for assertions on received messages
          // Implementation depends on specific requirements
          break;
          
        case 'delay':
          if (step.delay) {
            await new Promise(resolve => setTimeout(resolve, step.delay));
          }
          break;
      }

      return {
        step,
        passed: true,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        step,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get client for operation
   */
  private getClientForOperation(connectionName?: string): WebSocketClient {
    const targetConnection = connectionName || this.activeConnection;
    
    if (!targetConnection) {
      throw new Error('No active WebSocket connection. Add a connection first.');
    }

    const client = this.connections.get(targetConnection);
    if (!client) {
      throw new Error(`WebSocket connection '${targetConnection}' not found`);
    }

    return client;
  }

  /**
   * Format message data for logging
   */
  private formatMessageData(data: any): string {
    if (typeof data === 'string') {
      return data.length > 100 ? data.substring(0, 100) + '...' : data;
    }
    if (Buffer.isBuffer(data)) {
      return `[Binary: ${data.length} bytes]`;
    }
    return String(data);
  }
}

export default WebSocketManager;