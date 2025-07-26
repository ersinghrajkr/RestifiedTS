/**
 * Client Manager for RestifiedTS
 * 
 * Manages multiple HTTP clients for different services and endpoints.
 * Provides centralized client configuration, lifecycle management, and routing.
 */

import { HttpClient } from './HttpClient';
import { GraphQLManager } from './GraphQLManager';
import { WebSocketManager } from './WebSocketManager';
import { VariableStore } from '../stores/VariableStore';
import { Config } from '../config/Config';
import { 
  RestifiedConfig, 
  HttpClientConfig, 
  GraphQLConfig, 
  WebSocketConfig,
  ClientInfo,
  ClientType 
} from '../../types/RestifiedTypes';

export interface ClientManagerConfig {
  defaultConfig?: Partial<RestifiedConfig>;
  variableStore?: VariableStore;
  enableMetrics?: boolean;
  enableLogging?: boolean;
}

export interface ManagedClient {
  name: string;
  type: ClientType;
  client: HttpClient | GraphQLManager | WebSocketManager;
  config: any;
  createdAt: Date;
  lastUsed?: Date;
  requestCount?: number;
  active: boolean;
}

export class ClientManager {
  private clients: Map<string, ManagedClient> = new Map();
  private activeClientName: string = 'default';
  private config: Config;
  private variableStore: VariableStore;
  private defaultHttpClient: HttpClient;
  private enableMetrics: boolean;
  private enableLogging: boolean;

  constructor(options: ClientManagerConfig = {}) {
    this.config = new Config(options.defaultConfig);
    this.variableStore = options.variableStore || new VariableStore();
    this.enableMetrics = options.enableMetrics ?? true;
    this.enableLogging = options.enableLogging ?? true;

    // Create default HTTP client
    this.defaultHttpClient = new HttpClient(this.config.getConfig());
    this.registerClient('default', this.defaultHttpClient, 'http', this.config.getConfig());
  }

  /**
   * Create and register a new HTTP client
   */
  createHttpClient(name: string, config: Partial<HttpClientConfig>): HttpClient {
    if (this.clients.has(name)) {
      throw new Error(`Client '${name}' already exists`);
    }

    const mergedConfig = { ...this.config.getConfig(), ...config };
    const client = new HttpClient(mergedConfig);
    
    this.registerClient(name, client, 'http', mergedConfig);
    return client;
  }

  /**
   * Create and register a new GraphQL manager
   */
  createGraphQLClient(name: string, config: GraphQLConfig): GraphQLManager {
    if (this.clients.has(name)) {
      throw new Error(`Client '${name}' already exists`);
    }

    const httpClient = config.httpClient || this.getActiveHttpClient();
    const graphQLManager = new GraphQLManager(httpClient);
    
    if (config.endpoint) {
      graphQLManager.addEndpoint({
        name: 'default',
        ...config
      });
    }

    this.registerClient(name, graphQLManager, 'graphql', config);
    return graphQLManager;
  }

  /**
   * Create and register a new WebSocket client
   */
  createWebSocketClient(name: string, config: WebSocketConfig): WebSocketManager {
    if (this.clients.has(name)) {
      throw new Error(`Client '${name}' already exists`);
    }

    const webSocketManager = new WebSocketManager();
    this.registerClient(name, webSocketManager, 'websocket', config);
    return webSocketManager;
  }

  /**
   * Get a client by name
   */
  getClient<T = HttpClient | GraphQLManager | WebSocketManager>(name: string): T {
    const managedClient = this.clients.get(name);
    if (!managedClient) {
      throw new Error(`Client '${name}' not found`);
    }

    // Update usage metrics
    if (this.enableMetrics) {
      managedClient.lastUsed = new Date();
      managedClient.requestCount = (managedClient.requestCount || 0) + 1;
    }

    return managedClient.client as T;
  }

  /**
   * Get HTTP client by name
   */
  getHttpClient(name: string = this.activeClientName): HttpClient {
    const client = this.getClient<HttpClient>(name);
    if (this.getClientInfo(name).type !== 'http') {
      throw new Error(`Client '${name}' is not an HTTP client`);
    }
    return client;
  }

  /**
   * Get GraphQL client by name
   */
  getGraphQLClient(name: string): GraphQLManager {
    const client = this.getClient<GraphQLManager>(name);
    if (this.getClientInfo(name).type !== 'graphql') {
      throw new Error(`Client '${name}' is not a GraphQL client`);
    }
    return client;
  }

  /**
   * Get WebSocket client by name
   */
  getWebSocketClient(name: string): WebSocketManager {
    const client = this.getClient<WebSocketManager>(name);
    if (this.getClientInfo(name).type !== 'websocket') {
      throw new Error(`Client '${name}' is not a WebSocket client`);
    }
    return client;
  }

  /**
   * Get the currently active HTTP client
   */
  getActiveHttpClient(): HttpClient {
    return this.getHttpClient(this.activeClientName);
  }

  /**
   * Set the active client
   */
  setActiveClient(name: string): this {
    if (!this.clients.has(name)) {
      throw new Error(`Client '${name}' not found`);
    }

    const clientInfo = this.getClientInfo(name);
    if (clientInfo.type !== 'http') {
      throw new Error(`Client '${name}' is not an HTTP client and cannot be set as active`);
    }

    this.activeClientName = name;
    return this;
  }

  /**
   * Get the name of the active client
   */
  getActiveClientName(): string {
    return this.activeClientName;
  }

  /**
   * Check if a client exists
   */
  hasClient(name: string): boolean {
    return this.clients.has(name);
  }

  /**
   * Remove a client
   */
  removeClient(name: string): boolean {
    if (name === 'default') {
      throw new Error('Cannot remove the default client');
    }

    if (name === this.activeClientName) {
      this.activeClientName = 'default';
    }

    const managedClient = this.clients.get(name);
    if (managedClient) {
      managedClient.active = false;
      return this.clients.delete(name);
    }

    return false;
  }

  /**
   * Get information about a client
   */
  getClientInfo(name: string): ClientInfo {
    const managedClient = this.clients.get(name);
    if (!managedClient) {
      throw new Error(`Client '${name}' not found`);
    }

    return {
      name: managedClient.name,
      type: managedClient.type,
      active: managedClient.active,
      createdAt: managedClient.createdAt,
      lastUsed: managedClient.lastUsed,
      requestCount: managedClient.requestCount || 0
    };
  }

  /**
   * List all clients
   */
  listClients(): ClientInfo[] {
    return Array.from(this.clients.values()).map(client => ({
      name: client.name,
      type: client.type,
      active: client.active,
      createdAt: client.createdAt,
      lastUsed: client.lastUsed,
      requestCount: client.requestCount || 0
    }));
  }

  /**
   * List clients by type
   */
  listClientsByType(type: ClientType): ClientInfo[] {
    return this.listClients().filter(client => client.type === type);
  }

  /**
   * Get client statistics
   */
  getStatistics(): {
    totalClients: number;
    activeClients: number;
    clientsByType: Record<ClientType, number>;
    totalRequests: number;
    mostUsedClient?: string;
  } {
    const clients = Array.from(this.clients.values());
    const activeClients = clients.filter(c => c.active);
    
    const clientsByType = clients.reduce((acc, client) => {
      acc[client.type] = (acc[client.type] || 0) + 1;
      return acc;
    }, {} as Record<ClientType, number>);

    const totalRequests = clients.reduce((sum, client) => sum + (client.requestCount || 0), 0);
    
    const mostUsedClient = clients
      .filter(c => c.requestCount && c.requestCount > 0)
      .sort((a, b) => (b.requestCount || 0) - (a.requestCount || 0))[0]?.name;

    return {
      totalClients: clients.length,
      activeClients: activeClients.length,
      clientsByType,
      totalRequests,
      mostUsedClient
    };
  }

  /**
   * Update client configuration
   */
  updateClientConfig(name: string, config: Partial<any>): void {
    const managedClient = this.clients.get(name);
    if (!managedClient) {
      throw new Error(`Client '${name}' not found`);
    }

    // Update the stored config
    managedClient.config = { ...managedClient.config, ...config };

    // For HTTP clients, we need to update the actual client config
    if (managedClient.type === 'http') {
      const httpClient = managedClient.client as HttpClient;
      // HttpClient would need an updateConfig method for this to work
      // For now, we just store the updated config
    }
  }

  /**
   * Clone a client with a new name
   */
  cloneClient(existingName: string, newName: string, configOverrides?: Partial<any>): void {
    const managedClient = this.clients.get(existingName);
    if (!managedClient) {
      throw new Error(`Client '${existingName}' not found`);
    }

    if (this.clients.has(newName)) {
      throw new Error(`Client '${newName}' already exists`);
    }

    const newConfig = { ...managedClient.config, ...configOverrides };

    switch (managedClient.type) {
      case 'http':
        this.createHttpClient(newName, newConfig);
        break;
      case 'graphql':
        this.createGraphQLClient(newName, newConfig);
        break;
      case 'websocket':
        this.createWebSocketClient(newName, newConfig);
        break;
    }
  }

  /**
   * Close all clients and cleanup resources
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.clients.values()).map(async (managedClient) => {
      try {
        if (managedClient.type === 'websocket') {
          const wsManager = managedClient.client as WebSocketManager;
          await wsManager.disconnectAll();
        }
        managedClient.active = false;
      } catch (error) {
        if (this.enableLogging) {
          console.warn(`Error closing client '${managedClient.name}':`, error);
        }
      }
    });

    await Promise.all(promises);
    this.clients.clear();
    
    // Recreate default client
    this.defaultHttpClient = new HttpClient(this.config.getConfig());
    this.registerClient('default', this.defaultHttpClient, 'http', this.config.getConfig());
    this.activeClientName = 'default';
  }

  /**
   * Get the variable store
   */
  getVariableStore(): VariableStore {
    return this.variableStore;
  }

  /**
   * Set a new variable store
   */
  setVariableStore(variableStore: VariableStore): void {
    this.variableStore = variableStore;
  }

  private registerClient(
    name: string, 
    client: HttpClient | GraphQLManager | WebSocketManager, 
    type: ClientType, 
    config: any
  ): void {
    const managedClient: ManagedClient = {
      name,
      type,
      client,
      config,
      createdAt: new Date(),
      requestCount: 0,
      active: true
    };

    this.clients.set(name, managedClient);

    if (this.enableLogging) {
      console.log(`Registered ${type} client: ${name}`);
    }
  }
}

export default ClientManager;