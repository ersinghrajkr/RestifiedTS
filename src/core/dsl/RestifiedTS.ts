/**
 * RestifiedTS - Main Framework Entry Point
 * 
 * This is the main class that provides the fluent DSL interface for API testing.
 * It coordinates between all the different components and provides a clean,
 * easy-to-use interface for developers.
 */

import { IGivenStep, RestifiedConfig, GraphQLConfig, WebSocketConfig } from '../../types/RestifiedTypes';
import { GivenStep } from './GivenStep';
import { VariableStore } from '../stores/VariableStore';
import { HttpClient } from '../clients/HttpClient';
import { GraphQLManager, GraphQLEndpoint } from '../clients/GraphQLManager';
import { WebSocketManager, WebSocketConnection } from '../clients/WebSocketManager';
import { Config } from '../config/Config';
import { ReportingManager } from '../../reporting/ReportingManager';
import { setupMochaReporting } from '../../reporting/MochaReportingIntegration';

export class RestifiedTS {
  private config: Config;
  private variableStore: VariableStore;
  private httpClient: HttpClient;
  private clients: Map<string, HttpClient> = new Map();
  private activeClientName: string = 'default';
  private graphQLManager: GraphQLManager;
  private webSocketManager: WebSocketManager;
  private reportingManager: ReportingManager;

  constructor(userConfig?: Partial<RestifiedConfig>) {
    // Initialize configuration
    this.config = new Config(userConfig);
    
    // Initialize variable store
    this.variableStore = new VariableStore();
    
    // Initialize reporting manager
    this.reportingManager = new ReportingManager();
    
    // Initialize default HTTP client with reporting manager
    this.httpClient = new HttpClient(this.config.getConfig(), this.reportingManager);
    this.clients.set('default', this.httpClient);
    
    // Initialize GraphQL manager
    this.graphQLManager = new GraphQLManager(this.httpClient);
    
    // Setup default GraphQL endpoint if configured
    const graphqlConfig = this.config.get('graphql');
    if (graphqlConfig?.endpoint) {
      this.graphQLManager.addEndpoint({
        name: 'default',
        ...graphqlConfig
      });
    }
    
    // Initialize WebSocket manager
    this.webSocketManager = new WebSocketManager();
    
    // Setup default WebSocket connection if configured
    const websocketConfig = this.config.get('websocket');
    if (websocketConfig) {
      // WebSocket config would need a URL, but it's not in the base config
      // This would be added when someone explicitly adds a WebSocket connection
    }
    
    // Automatically setup Mocha reporting integration if Mocha is detected
    this.autoDetectAndSetupMochaIntegration();
    
    // Log initialization
    if (this.config.get('logging.level') === 'debug') {
      console.log('[RestifiedTS] Framework initialized');
    }
  }

  /**
   * Start a new test chain with the fluent DSL
   * 
   * This is the entry point for RestifiedTS's fluent API following the given().when().then() pattern.
   * The "given" step is where you configure the request (headers, auth, body, etc.)
   * 
   * @returns IGivenStep - The Given step for request configuration
   * 
   * @example
   * ```typescript
   * const response = await restified
   *   .given()
   *     .baseURL('https://api.example.com')
   *     .bearerToken('your-token-here')
   *     .header('Content-Type', 'application/json')
   *     .body({ name: 'John Doe', email: 'john@example.com' })
   *   .when()
   *     .post('/users')
   *     .execute();
   * 
   * await response
   *   .statusCode(201)
   *   .jsonPath('$.name', 'John Doe')
   *   .execute();
   * ```
   */
  given(): IGivenStep {
    return new GivenStep(
      this.variableStore,
      this.getActiveClient(),
      this.config
    );
  }

  /**
   * Create a new HTTP client instance for multi-service testing
   * 
   * This allows you to create named clients with different configurations for testing
   * multiple APIs or services within the same test suite.
   * 
   * @param name - Unique name for the client
   * @param config - Configuration specific to this client (baseURL, headers, timeout, etc.)
   * @returns RestifiedTS instance for method chaining
   * 
   * @example
   * ```typescript
   * // Create clients for different services
   * restified.createClient('authService', {
   *   baseURL: 'https://auth.example.com',
   *   timeout: 5000,
   *   headers: { 'X-Service': 'auth' }
   * });
   * 
   * restified.createClient('userService', {
   *   baseURL: 'https://users.example.com',
   *   timeout: 10000,
   *   headers: { 'X-Service': 'users' }
   * });
   * 
   * // Use different clients in tests
   * const authResponse = await restified
   *   .given()
   *     .useClient('authService')
   *     .body({ username: 'user', password: 'pass' })
   *   .when()
   *     .post('/login')
   *     .execute();
   * 
   * const userResponse = await restified
   *   .given()
   *     .useClient('userService')
   *     .bearerToken('{{token}}')
   *   .when()
   *     .get('/profile')
   *     .execute();
   * ```
   */
  createClient(name: string, config: Partial<RestifiedConfig>): RestifiedTS {
    const mergedConfig = { ...this.config.getConfig(), ...config };
    const client = new HttpClient(mergedConfig, this.reportingManager);
    this.clients.set(name, client);
    
    if (this.config.get('logging.level') === 'debug') {
      console.log(`[RestifiedTS] Created client: ${name}`);
    }
    
    return this;
  }

  /**
   * Switch to a different HTTP client
   */
  useClient(name: string): RestifiedTS {
    if (!this.clients.has(name)) {
      throw new Error(`Client '${name}' not found. Available clients: ${Array.from(this.clients.keys()).join(', ')}`);
    }
    
    this.activeClientName = name;
    
    if (this.config.get('logging.level') === 'debug') {
      console.log(`[RestifiedTS] Switched to client: ${name}`);
    }
    
    return this;
  }

  /**
   * Get the currently active client
   */
  private getActiveClient(): HttpClient {
    const client = this.clients.get(this.activeClientName);
    if (!client) {
      throw new Error(`Active client '${this.activeClientName}' not found`);
    }
    return client;
  }

  /**
   * Set a global variable
   */
  setGlobalVariable(key: string, value: any): RestifiedTS {
    this.variableStore.setGlobal(key, value);
    return this;
  }

  /**
   * Get a global variable
   */
  getGlobalVariable(key: string): any {
    return this.variableStore.getGlobal(key);
  }

  /**
   * Set multiple global variables
   */
  setGlobalVariables(variables: Record<string, any>): RestifiedTS {
    this.variableStore.setGlobalBatch(variables);
    return this;
  }

  /**
   * Get all global variables
   */
  getAllGlobalVariables(): Record<string, any> {
    return this.variableStore.getAllGlobal();
  }

  /**
   * Clear all global variables
   */
  clearGlobalVariables(): RestifiedTS {
    this.variableStore.clearGlobal();
    return this;
  }

   /**
   * Set a Local variable
   */
  setLocalVariable(key: string, value: any): RestifiedTS {
    this.variableStore.setLocal(key, value);
    return this;
  }

  /**
   * Get a Local variable
   */
  getLocalVariable(key: string): any {
    return this.variableStore.getLocal(key);
  }

  /**
   * Set multiple Local variables
   */
  setLocalVariables(variables: Record<string, any>): RestifiedTS {
    this.variableStore.setLocalBatch(variables);
    return this;
  }

  /**
   * Get all Local variables
   */
  getAllLocalVariables(): Record<string, any> {
    return this.variableStore.getAllLocal();
  }

  /**
   * Clear all Local variables
   */
  clearLocalVariables(): RestifiedTS {
    this.variableStore.clearLocal();
    return this;
  }


  /**
   * Get current configuration
   */
  getConfig(): Readonly<RestifiedConfig> {
    return this.config.getConfig();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RestifiedConfig>): RestifiedTS {
    this.config.update(updates);
    
    // Update all clients with new config
    this.clients.forEach((client, name) => {
      client.updateConfig(updates);
    });
    
    return this;
  }

  /**
   * Load configuration from file
   */
  async loadConfigFromFile(filePath: string): Promise<RestifiedTS> {
    await this.config.loadFromFile(filePath);
    return this;
  }

  /**
   * Load configuration from environment variables
   */
  loadConfigFromEnvironment(): RestifiedTS {
    this.config.loadFromEnvironment();
    return this;
  }

  /**
   * Get available client names
   */
  getClientNames(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get active client name
   */
  getActiveClientName(): string {
    return this.activeClientName;
  }

  /**
   * Get variable store statistics
   */
  getVariableStats(): any {
    return this.variableStore.getStats();
  }

  // ==========================================
  // GRAPHQL METHODS
  // ==========================================

  /**
   * Add a GraphQL endpoint
   */
  addGraphQLEndpoint(config: GraphQLEndpoint): RestifiedTS {
    this.graphQLManager.addEndpoint(config);
    return this;
  }

  /**
   * Remove a GraphQL endpoint
   */
  removeGraphQLEndpoint(name: string): RestifiedTS {
    this.graphQLManager.removeEndpoint(name);
    return this;
  }

  /**
   * Set active GraphQL endpoint
   */
  setActiveGraphQLEndpoint(name: string): RestifiedTS {
    this.graphQLManager.setActiveEndpoint(name);
    return this;
  }

  /**
   * Execute a GraphQL query
   */
  async graphql(
    query: string,
    variables?: Record<string, any>,
    options?: {
      endpoint?: string;
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ) {
    return this.graphQLManager.query(query, variables, options);
  }

  /**
   * Execute a GraphQL query
   */
  async graphqlQuery(
    query: string,
    variables?: Record<string, any>,
    options?: {
      endpoint?: string;
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ) {
    return this.graphQLManager.query(query, variables, options);
  }

  /**
   * Execute a GraphQL mutation
   */
  async graphqlMutation(
    mutation: string,
    variables?: Record<string, any>,
    options?: {
      endpoint?: string;
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ) {
    return this.graphQLManager.mutation(mutation, variables, options);
  }

  /**
   * Execute a GraphQL subscription
   */
  async graphqlSubscription(
    subscription: string,
    variables?: Record<string, any>,
    options?: {
      endpoint?: string;
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ) {
    return this.graphQLManager.subscription(subscription, variables, options);
  }

  /**
   * Get GraphQL manager instance
   */
  getGraphQLManager(): GraphQLManager {
    return this.graphQLManager;
  }

  /**
   * Perform GraphQL schema introspection
   */
  async introspectGraphQL(endpointName?: string) {
    return this.graphQLManager.introspect(endpointName);
  }

  /**
   * Validate a GraphQL query
   */
  validateGraphQLQuery(query: string, endpointName?: string) {
    return this.graphQLManager.validateQuery(query, endpointName);
  }

  /**
   * Create a GraphQL query builder
   */
  graphqlBuilder(endpointName?: string) {
    return this.graphQLManager.queryBuilder(endpointName);
  }

  // ==========================================
  // WEBSOCKET METHODS
  // ==========================================

  /**
   * Add a WebSocket connection
   */
  addWebSocketConnection(config: WebSocketConnection): RestifiedTS {
    this.webSocketManager.addConnection(config);
    return this;
  }

  /**
   * Remove a WebSocket connection
   */
  async removeWebSocketConnection(name: string): Promise<RestifiedTS> {
    await this.webSocketManager.removeConnection(name);
    return this;
  }

  /**
   * Set active WebSocket connection
   */
  setActiveWebSocketConnection(name: string): RestifiedTS {
    this.webSocketManager.setActiveConnection(name);
    return this;
  }

  /**
   * Connect to WebSocket
   */
  async connectWebSocket(connectionName?: string): Promise<RestifiedTS> {
    await this.webSocketManager.connect(connectionName);
    return this;
  }

  /**
   * Disconnect from WebSocket
   */
  async disconnectWebSocket(connectionName?: string, code?: number, reason?: string): Promise<RestifiedTS> {
    await this.webSocketManager.disconnect(connectionName, code, reason);
    return this;
  }

  /**
   * Send WebSocket text message
   */
  async sendWebSocketText(text: string, connectionName?: string) {
    return this.webSocketManager.sendText(text, connectionName);
  }

  /**
   * Send WebSocket JSON message
   */
  async sendWebSocketJSON(data: any, connectionName?: string) {
    return this.webSocketManager.sendJSON(data, connectionName);
  }

  /**
   * Send WebSocket binary message
   */
  async sendWebSocketBinary(data: Buffer, connectionName?: string) {
    return this.webSocketManager.sendBinary(data, connectionName);
  }

  /**
   * Wait for WebSocket message
   */
  async waitForWebSocketMessage(matcher: any, connectionName?: string) {
    return this.webSocketManager.waitForMessage(matcher, connectionName);
  }

  /**
   * Get WebSocket manager instance
   */
  getWebSocketManager(): WebSocketManager {
    return this.webSocketManager;
  }

  /**
   * Broadcast message to all WebSocket connections
   */
  async broadcastWebSocket(message: string | any) {
    return this.webSocketManager.broadcast(message);
  }

  /**
   * Connect to all WebSocket connections
   */
  async connectAllWebSockets(): Promise<RestifiedTS> {
    await this.webSocketManager.connectAll();
    return this;
  }

  /**
   * Disconnect from all WebSocket connections
   */
  async disconnectAllWebSockets(): Promise<RestifiedTS> {
    await this.webSocketManager.disconnectAll();
    return this;
  }

  // ==========================================
  // REPORTING METHODS
  // ==========================================

  /**
   * Get reporting manager instance
   */
  getReportingManager(): ReportingManager {
    return this.reportingManager;
  }

  /**
   * Start test execution tracking
   */
  async startExecution(name: string, description?: string): Promise<string> {
    return await this.reportingManager.startExecution(name, description);
  }

  /**
   * End test execution tracking
   */
  async endExecution() {
    return await this.reportingManager.endExecution();
  }

  /**
   * Start test suite tracking
   */
  async startSuite(name: string, description?: string): Promise<string> {
    return await this.reportingManager.startSuite(name, description);
  }

  /**
   * End test suite tracking
   */
  async endSuite() {
    return await this.reportingManager.endSuite();
  }

  /**
   * Start test case tracking
   */
  async startTest(name: string, description?: string): Promise<string> {
    return await this.reportingManager.startTest(name, description);
  }

  /**
   * End test case tracking
   */
  async endTest(status: any, error?: Error) {
    return await this.reportingManager.endTest(status, error);
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Auto-detect and setup Mocha integration without user configuration
   */
  private autoDetectAndSetupMochaIntegration(): void {
    // Check if we're in a Mocha environment
    if (this.isMochaEnvironment()) {
      try {
        // Setup automatic test tracking
        this.setupAutomaticMochaTracking();
        
        // Setup Mocha reporting integration
        setupMochaReporting(this);
        
        if (this.config.get('logging.level') === 'debug') {
          console.log('[RestifiedTS] Auto-detected Mocha environment, reporting enabled');
        }
      } catch (error) {
        // Silently ignore if setup fails
        if (this.config.get('logging.level') === 'debug') {
          console.log('[RestifiedTS] Mocha integration setup failed:', (error as Error).message);
        }
      }
    }
  }

  /**
   * Setup automatic Mocha test tracking
   */
  private setupAutomaticMochaTracking(): void {
    if (typeof global !== 'undefined' && (global as any).beforeEach && (global as any).it) {
      try {
        // Global beforeEach to track current test for automatic context attachment
        (global as any).beforeEach(function(this: any) {
          (global as any).currentMochaTest = this.currentTest;
          (global as any).mochaContext = this;
        });

        // Wrap the global 'it' function to capture the actual test context
        const originalIt = (global as any).it;
        if (originalIt && !originalIt._restifiedWrapped) {
          (global as any).it = function(title: string, fn?: any) {
            if (typeof fn === 'function') {
              const wrappedFn = function(this: any) {
                // Set the current test context that Mochawesome can use
                (global as any).restifiedCurrentTest = this;
                try {
                  const result = fn.call(this);
                  // If it's a promise, clear the context after it resolves
                  if (result && typeof result.then === 'function') {
                    return result.finally(() => {
                      (global as any).restifiedCurrentTest = null;
                    });
                  } else {
                    // For synchronous tests, clear immediately
                    (global as any).restifiedCurrentTest = null;
                    return result;
                  }
                } catch (error) {
                  (global as any).restifiedCurrentTest = null;
                  throw error;
                }
              };
              return originalIt.call(this, title, wrappedFn);
            } else {
              return originalIt.call(this, title, fn);
            }
          };
          
          // Copy over any properties from the original function
          Object.setPrototypeOf((global as any).it, originalIt);
          Object.keys(originalIt).forEach(key => {
            if (key !== 'length' && key !== 'name') {
              (global as any).it[key] = originalIt[key];
            }
          });
          
          // Mark as wrapped to avoid double-wrapping
          (global as any).it._restifiedWrapped = true;
        }
      } catch (error) {
        // Ignore setup errors
        if (this.config.get('logging.level') === 'debug') {
          console.debug('[RestifiedTS] Mocha tracking setup failed:', (error as Error).message);
        }
      }
    }
  }

  /**
   * Check if we're in a Mocha environment
   */
  private isMochaEnvironment(): boolean {
    return (
      // Check for Mocha globals
      (typeof global !== 'undefined' && 
       (global as any).describe && 
       (global as any).it && 
       (global as any).beforeEach) ||
      // Check for test environment
      process.env.NODE_ENV === 'test' || 
      process.env.NODE_ENV === 'testing' ||
      // Check if we're running via mocha command
      process.argv.some(arg => arg.includes('mocha'))
    );
  }

  /**
   * Check if running in test environment (legacy method)
   */
  private isTestEnvironment(): boolean {
    return this.isMochaEnvironment();
  }

  /**
   * Clear all data
   */
  clearAll(): RestifiedTS {
    this.variableStore.clearAll();
    
    // Clear performance metrics from all clients
    this.clients.forEach(client => {
      client.clearPerformanceMetrics();
    });
    
    return this;
  }

  /**
   * Wait for specified amount of time
   */
  async wait(ms: number): Promise<RestifiedTS> {
    if (ms < 0) {
      throw new Error('Wait time cannot be negative');
    }
    await new Promise(resolve => setTimeout(resolve, ms));
    return this;
  }

  /**
   * Wait until condition is met
   */
  async waitUntil(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<RestifiedTS> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        return this;
      }
      await this.wait(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Get session information
   */
  getSessionInfo(): any {
    return {
      activeClient: this.activeClientName,
      availableClients: this.getClientNames(),
      config: this.config.getConfig(),
      variableStats: this.variableStore.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup all clients
      this.clients.forEach(client => {
        try {
          client.cleanup();
        } catch (error) {
          console.debug('Client cleanup warning:', (error as Error).message);
        }
      });
      
      // Disconnect all WebSocket connections to clean up their intervals
      try {
        await Promise.race([
          this.disconnectAllWebSockets(),
          new Promise<void>(resolve => setTimeout(resolve, 2000)) // 2 second timeout
        ]);
      } catch (error) {
        console.debug('WebSocket cleanup warning:', (error as Error).message);
      }
      
      // Clean up WebSocketManager resources
      if (this.webSocketManager && typeof (this.webSocketManager as any).destroy === 'function') {
        try {
          await Promise.race([
            (this.webSocketManager as any).destroy(),
            new Promise<void>(resolve => setTimeout(resolve, 1000)) // 1 second timeout
          ]);
        } catch (error) {
          console.debug('WebSocketManager cleanup warning:', (error as Error).message);
        }
      }
      
      // Clean up GraphQLManager resources
      if (this.graphQLManager && typeof (this.graphQLManager as any).destroy === 'function') {
        try {
          await Promise.race([
            (this.graphQLManager as any).destroy(),
            new Promise<void>(resolve => setTimeout(resolve, 1000)) // 1 second timeout
          ]);
        } catch (error) {
          console.debug('GraphQLManager cleanup warning:', (error as Error).message);
        }
      }
      
      // Clear all data
      this.clearAll();
      
      // Close reporting manager
      if (this.reportingManager) {
        try {
          await this.reportingManager.close();
        } catch (error) {
          console.debug('ReportingManager cleanup warning:', (error as Error).message);
        }
      }
      
      // Force cleanup of any remaining timers
      if (typeof global !== 'undefined' && (global as any)._restifiedTimers) {
        const timers = (global as any)._restifiedTimers;
        timers.forEach((timer: NodeJS.Timeout) => {
          try {
            clearTimeout(timer);
            clearInterval(timer);
          } catch (error) {
            // Ignore timer cleanup errors
          }
        });
        (global as any)._restifiedTimers = [];
      }
      
      if (this.config.get('logging.level') === 'debug') {
        console.log('[RestifiedTS] Cleanup completed');
      }
    } catch (error) {
      console.debug('Cleanup error:', (error as Error).message);
    }
  }
}

// Export singleton instance for convenient usage
export const restified = new RestifiedTS();

/**
 * Global cleanup function for test environments
 * This function ensures all resources are properly cleaned up and the process can exit
 */
export const forceCleanup = async (): Promise<void> => {
  try {
    // Clean up the main RestifiedTS instance
    await restified.cleanup();
    
    // Force cleanup of any remaining global resources
    if (typeof global !== 'undefined') {
      // Clear any global timers
      const globalTimers = (global as any)._restifiedTimers || [];
      globalTimers.forEach((timer: NodeJS.Timeout) => {
        try {
          clearTimeout(timer);
          clearInterval(timer);
        } catch (error) {
          // Ignore cleanup errors
        }
      });
      (global as any)._restifiedTimers = [];
    }
    
    // Force process exit after a brief delay
    setTimeout(() => {
      process.exit(0);
    }, 100);
    
  } catch (error) {
    console.debug('Force cleanup error:', (error as Error).message);
    // Force exit even if cleanup fails
    setTimeout(() => {
      process.exit(0);
    }, 200);
  }
};

// Export the class as default
export default RestifiedTS;