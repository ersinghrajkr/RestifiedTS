// src/core/dsl/RestifiedTS.ts

import { 
  RestifiedConfig, 
  IGivenStep, 
  RestifiedPlugin,
  RestifiedResponse,
  AuditLogEntry
} from '../../types/RestifiedTypes';
import { GivenStep } from './GivenStep';
import { ClientManager } from '../clients/ClientManager';
import { ResponseStore } from '../stores/ResponseStore';
import { VariableStore } from '../stores/VariableStore';
import { SnapshotStore } from '../stores/SnapshotStore';
import { Config } from '../config/Config';
import { AuditLogger } from '../../logging/AuditLogger';
import { ReportGenerator } from '../../reporting/ReportGenerator';

/**
 * Main entry point for RestifiedTS - A powerful TypeScript API testing framework
 * 
 * RestifiedTS provides a fluent DSL for API testing inspired by Java's RestAssured
 * but built specifically for TypeScript with modern features and best practices.
 * 
 * Key Features:
 * - Fluent DSL with given().when().then() pattern
 * - Multi-service HTTP client management
 * - Advanced response assertions and data extraction
 * - Variable and response storage systems
 * - Snapshot testing for API responses
 * - Comprehensive audit logging
 * - JSON placeholder resolution with Faker.js integration
 * - Plugin architecture for extensibility
 * - Performance metrics and reporting
 * - CI/CD integration support
 * 
// src/core/dsl/RestifiedTS.ts

import { 
  RestifiedConfig, 
  IGivenStep, 
  RestifiedPlugin,
  RestifiedResponse,
  AuditLogEntry
} from '../../types/RestifiedTypes';
import { GivenStep } from './GivenStep';
import { ClientManager } from '../clients/ClientManager';
import { ResponseStore } from '../stores/ResponseStore';
import { VariableStore } from '../stores/VariableStore';
import { SnapshotStore } from '../stores/SnapshotStore';
import { Config } from '../config/Config';
import { AuditLogger } from '../../logging/AuditLogger';
import { ReportGenerator } from '../../reporting/ReportGenerator';

/**
 * Main entry point for RestifiedTS - A powerful TypeScript API testing framework
 * 
 * RestifiedTS provides a fluent DSL for API testing inspired by Java's RestAssured
 * but built specifically for TypeScript with modern features and best practices.
 * 
 * Key Features:
 * - Fluent DSL with given().when().then() pattern
 * - Multi-service HTTP client management
 * - Advanced response assertions and data extraction
 * - Variable and response storage systems
 * - Snapshot testing for API responses
 * - Comprehensive audit logging
 * - JSON placeholder resolution with Faker.js integration
 * - Plugin architecture for extensibility
 * - Performance metrics and reporting
 * - CI/CD integration support
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const restified = new RestifiedTS({
 *   baseURL: 'https://api.example.com',
 *   timeout: 5000
 * });
 * 
 * await restified
 *   .given()
 *     .header('Authorization', 'Bearer {{token}}')
 *     .variable('userId', '12345')
 *   .when()
 *     .get('/users/{{userId}}')
 *     .execute()
 *   .then()
 *     .statusCode(200)
 *     .jsonPath('$.name', 'John Doe')
 *     .storeResponse('userDetails')
 *     .extract('$.id', 'extractedUserId');
 * 
 * // Advanced usage with multiple services
 * restified.createClient('authService', {
 *   baseURL: 'https://auth.example.com'
 * });
 * 
 * restified.createClient('userService', {
 *   baseURL: 'https://users.example.com'
 * });
 * ```
 */
export class RestifiedTS {
  private readonly config: Config;
  private readonly clientManager: ClientManager;
  private readonly responseStore: ResponseStore;
  private readonly variableStore: VariableStore;
  private readonly snapshotStore: SnapshotStore;
  private readonly auditLogger: AuditLogger;
  private readonly reportGenerator: ReportGenerator;
  private readonly plugins: Map<string, RestifiedPlugin> = new Map();
  private readonly sessionId: string;

  constructor(userConfig?: Partial<RestifiedConfig>) {
    // Generate unique session ID for this instance
    this.sessionId = this.generateSessionId();
    
    // Initialize core configuration
    this.config = new Config(userConfig);
    
    // Initialize storage systems
    this.responseStore = new ResponseStore(this.config.get('storage.maxResponses') || 100);
    this.variableStore = new VariableStore();
    this.snapshotStore = new SnapshotStore(this.config.get('snapshots.directory') || './snapshots');
    
    // Initialize logging and reporting
    this.auditLogger = new AuditLogger(this.config.get('logging'));
    this.reportGenerator = new ReportGenerator(this.config.get('reporting'));
    
    // Initialize client management
    this.clientManager = new ClientManager(this.config.getConfig());
    
    // Log initialization
    this.auditLogger.info(`RestifiedTS initialized with session ID: ${this.sessionId}`);
    this.auditLogger.debug(`Configuration: ${JSON.stringify(this.config.getConfig(), null, 2)}`);
    
    // Initialize default plugins
    this.initializeBuiltInPlugins();
    
    // Setup cleanup handlers
    this.setupCleanupHandlers();
  }

  /**
   * Start a new test chain with the fluent DSL
   * Entry point for the given().when().then() pattern
   * 
   * @returns GivenStep instance for method chaining
   */
  given(): IGivenStep {
    this.auditLogger.debug('[RESTIFIED] Starting new test chain');
    
    return new GivenStep(
      this.clientManager,
      this.variableStore,
      this.responseStore,
      this.snapshotStore,
      this.auditLogger,
      this.config
    );
  }

  // ==========================================
  // VARIABLE MANAGEMENT
  // ==========================================

  /**
   * Set a global variable accessible across all tests
   * 
   * @param key - Variable name
   * @param value - Variable value
   * @returns RestifiedTS instance for chaining
   */
  setGlobalVariable(key: string, value: any): RestifiedTS {
    this.variableStore.setGlobal(key, value);
    this.auditLogger.debug(`[RESTIFIED] Set global variable: ${key} = ${JSON.stringify(value)}`);
    return this;
  }

  /**
   * Get a global variable
   * 
   * @param key - Variable name
   * @returns Variable value or undefined
   */
  getGlobalVariable(key: string): any {
    return this.variableStore.getGlobal(key);
  }

  /**
   * Set multiple global variables at once
   * 
   * @param variables - Object containing variable key-value pairs
   * @returns RestifiedTS instance for chaining
   */
  setGlobalVariables(variables: Record<string, any>): RestifiedTS {
    this.variableStore.setGlobalBatch(variables);
    this.auditLogger.debug(`[RESTIFIED] Set global variables: ${JSON.stringify(variables)}`);
    return this;
  }

  /**
   * Get all global variables
   * 
   * @returns Object containing all global variables
   */
  getAllGlobalVariables(): Record<string, any> {
    return this.variableStore.getAllGlobal();
  }

  /**
   * Clear all global variables
   * 
   * @returns RestifiedTS instance for chaining
   */
  clearGlobalVariables(): RestifiedTS {
    this.variableStore.clearGlobal();
    this.auditLogger.debug('[RESTIFIED] Cleared all global variables');
    return this;
  }

  // ==========================================
  // RESPONSE MANAGEMENT
  // ==========================================

  /**
   * Get a stored response by key
   * 
   * @param key - Response storage key
   * @returns Stored response or undefined
   */
  getStoredResponse(key: string): RestifiedResponse | undefined {
    return this.responseStore.get(key);
  }

  /**
   * Get all stored responses
   * 
   * @returns Map of all stored responses
   */
  getAllStoredResponses(): Map<string, RestifiedResponse> {
    return this.responseStore.getAll();
  }

  /**
   * Clear all stored responses
   * 
   * @returns RestifiedTS instance for chaining
   */
  clearStoredResponses(): RestifiedTS {
    this.responseStore.clear();
    this.auditLogger.debug('[RESTIFIED] Cleared all stored responses');
    return this;
  }

  /**
   * Get response storage statistics
   * 
   * @returns Response storage statistics
   */
  getResponseStats(): any {
    return this.responseStore.getStats();
  }

  // ==========================================
  // SNAPSHOT MANAGEMENT
  // ==========================================

  /**
   * Get a snapshot by key
   * 
   * @param key - Snapshot key
   * @returns Snapshot data or undefined
   */
  getSnapshot(key: string): any {
    return this.snapshotStore.get(key);
  }

  /**
   * Save a custom snapshot
   * 
   * @param key - Snapshot key
   * @param data - Data to snapshot
   * @param metadata - Optional metadata
   * @returns RestifiedTS instance for chaining
   */
  saveSnapshot(key: string, data: any, metadata?: any): RestifiedTS {
    this.snapshotStore.save(key, data, metadata);
    this.auditLogger.debug(`[RESTIFIED] Saved snapshot: ${key}`);
    return this;
  }

  /**
   * Compare data with stored snapshot
   * 
   * @param key - Snapshot key
   * @param currentData - Data to compare
   * @returns Snapshot diff result
   */
  compareSnapshot(key: string, currentData: any): any {
    return this.snapshotStore.compare(key, currentData);
  }

  /**
   * Export snapshot to file
   * 
   * @param key - Snapshot key
   * @param filePath - Optional file path
   * @returns Promise resolving to file path
   */
  async exportSnapshot(key: string, filePath?: string): Promise<string> {
    const exportedPath = await this.snapshotStore.exportToFile(key, filePath);
    this.auditLogger.info(`[RESTIFIED] Exported snapshot ${key} to: ${exportedPath}`);
    return exportedPath;
  }

  /**
   * Get snapshot statistics
   * 
   * @returns Snapshot statistics
   */
  getSnapshotStats(): any {
    return this.snapshotStore.getStats();
  }

  // ==========================================
  // CLIENT MANAGEMENT
  // ==========================================

  /**
   * Create a new HTTP client instance for multi-service testing
   * 
   * @param name - Client instance name
   * @param config - Client configuration
   * @returns RestifiedTS instance for chaining
   */
  createClient(name: string, config: Partial<RestifiedConfig>): RestifiedTS {
    this.clientManager.createClient(name, config);
    this.auditLogger.info(`[RESTIFIED] Created client: ${name}`);
    return this;
  }

  /**
   * Switch to a different HTTP client instance
   * 
   * @param name - Client instance name
   * @returns RestifiedTS instance for chaining
   */
  useClient(name: string): RestifiedTS {
    this.clientManager.setActiveClient(name);
    this.auditLogger.debug(`[RESTIFIED] Switched to client: ${name}`);
    return this;
  }

  /**
   * Get the currently active client name
   * 
   * @returns Active client name
   */
  getActiveClient(): string {
    return this.clientManager.getActiveClientName();
  }

  /**
   * Get all available client names
   * 
   * @returns Array of client names
   */
  getClientNames(): string[] {
    return this.clientManager.getClientNames();
  }

  /**
   * Update client configuration
   * 
   * @param name - Client name
   * @param updates - Configuration updates
   * @returns RestifiedTS instance for chaining
   */
  updateClient(name: string, updates: Partial<RestifiedConfig>): RestifiedTS {
    this.clientManager.updateClient(name, updates);
    this.auditLogger.debug(`[RESTIFIED] Updated client: ${name}`);
    return this;
  }

  // ==========================================
  // CONFIGURATION MANAGEMENT
  // ==========================================

  /**
   * Get current configuration
   * 
   * @returns Current configuration (read-only)
   */
  getConfig(): Readonly<RestifiedConfig> {
    return this.config.getConfig();
  }

  /**
   * Update configuration
   * 
   * @param updates - Configuration updates
   * @returns RestifiedTS instance for chaining
   */
  updateConfig(updates: Partial<RestifiedConfig>): RestifiedTS {
    this.config.update(updates);
    this.auditLogger.debug(`[RESTIFIED] Updated configuration: ${JSON.stringify(updates)}`);
    return this;
  }

  /**
   * Load configuration from file
   * 
   * @param filePath - Configuration file path
   * @returns Promise resolving to RestifiedTS instance
   */
  async loadConfigFromFile(filePath: string): Promise<RestifiedTS> {
    await this.config.loadFromFile(filePath);
    this.auditLogger.info(`[RESTIFIED] Loaded configuration from: ${filePath}`);
    return this;
  }

  /**
   * Load configuration from environment variables
   * 
   * @returns RestifiedTS instance for chaining
   */
  loadConfigFromEnvironment(): RestifiedTS {
    this.config.loadFromEnvironment();
    this.auditLogger.debug('[RESTIFIED] Loaded configuration from environment');
    return this;
  }

  // ==========================================
  // PLUGIN MANAGEMENT
  // ==========================================

  /**
   * Register a plugin to extend RestifiedTS functionality
   * 
   * @param plugin - Plugin instance
   * @returns RestifiedTS instance for chaining
   */
  registerPlugin(plugin: RestifiedPlugin): RestifiedTS {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    plugin.initialize(this);
    
    this.auditLogger.info(`[RESTIFIED] Registered plugin: ${plugin.name} v${plugin.version}`);
    return this;
  }

  /**
   * Unregister a plugin
   * 
   * @param pluginName - Name of plugin to unregister
   * @returns RestifiedTS instance for chaining
   */
  unregisterPlugin(pluginName: string): RestifiedTS {
    if (this.plugins.delete(pluginName)) {
      this.auditLogger.info(`[RESTIFIED] Unregistered plugin: ${pluginName}`);
    }
    return this;
  }

  /**
   * Get list of registered plugins
   * 
   * @returns Array of registered plugins
   */
  getPlugins(): RestifiedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is registered
   * 
   * @param pluginName - Plugin name
   * @returns True if plugin is registered
   */
  hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  // ==========================================
  // AUDIT AND REPORTING
  // ==========================================

  /**
   * Get audit log entries
   * 
   * @returns Array of audit log entries
   */
  getAuditEntries(): AuditLogEntry[] {
    return this.auditLogger.getEntries();
  }

  /**
   * Get audit statistics
   * 
   * @returns Audit statistics object
   */
  getAuditStats(): any {
    return this.auditLogger.getStats();
  }

  /**
   * Export audit log to file
   * 
   * @param filePath - Output file path
   * @returns Promise resolving to file path
   */
  async exportAuditLog(filePath: string): Promise<string> {
    const exportedPath = await this.auditLogger.exportEntries(filePath);
    this.auditLogger.info(`[RESTIFIED] Exported audit log to: ${exportedPath}`);
    return exportedPath;
  }

  /**
   * Generate HTML test report
   * 
   * @param outputPath - Optional output path
   * @returns Promise resolving to report file path
   */
  async generateHtmlReport(outputPath?: string): Promise<string> {
    const auditEntries = this.auditLogger.getEntries();
    const snapshots = this.snapshotStore.getAll();
    
    const reportPath = await this.reportGenerator.generateHtmlReport(
      auditEntries,
      snapshots,
      outputPath
    );
    
    this.auditLogger.info(`[RESTIFIED] Generated HTML report: ${reportPath}`);
    return reportPath;
  }

  /**
   * Generate JSON test report
   * 
   * @param outputPath - Optional output path
   * @returns Promise resolving to report file path
   */
  async generateJsonReport(outputPath?: string): Promise<string> {
    const auditEntries = this.auditLogger.getEntries();
    const snapshots = this.snapshotStore.getAll();
    
    const reportPath = await this.reportGenerator.generateJsonReport(
      auditEntries,
      snapshots,
      outputPath
    );
    
    this.auditLogger.info(`[RESTIFIED] Generated JSON report: ${reportPath}`);
    return reportPath;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Wait for specified amount of time
   * 
   * @param ms - Milliseconds to wait
   * @returns Promise that resolves after delay
   */
  async wait(ms: number): Promise<void> {
    this.auditLogger.debug(`[RESTIFIED] Waiting ${ms}ms`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait until condition is met or timeout
   * 
   * @param condition - Function that returns true when condition is met
   * @param timeout - Maximum time to wait in milliseconds
   * @param interval - Check interval in milliseconds
   * @returns Promise that resolves when condition is met
   */
  async waitUntil(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    this.auditLogger.debug(`[RESTIFIED] Waiting until condition is met (timeout: ${timeout}ms)`);
    
    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        this.auditLogger.debug(`[RESTIFIED] Condition met after ${Date.now() - startTime}ms`);
        return;
      }
      await this.wait(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Clear all data (responses, variables, snapshots, audit entries)
   * 
   * @returns RestifiedTS instance for chaining
   */
  clearAll(): RestifiedTS {
    this.responseStore.clear();
    this.variableStore.clearAll();
    this.snapshotStore.clear();
    this.auditLogger.clearEntries();
    
    this.auditLogger.info('[RESTIFIED] Cleared all data');
    return this;
  }

  /**
   * Get session information
   * 
   * @returns Session information object
   */
  getSessionInfo(): {
    sessionId: string;
    startTime: Date;
    config: RestifiedConfig;
    stats: {
      responses: any;
      snapshots: any;
      audit: any;
      variables: number;
      plugins: number;
      clients: number;
    };
  } {
    return {
      sessionId: this.sessionId,
      startTime: new Date(), // TODO: Track actual start time
      config: this.config.getConfig(),
      stats: {
        responses: this.getResponseStats(),
        snapshots: this.getSnapshotStats(),
        audit: this.getAuditStats(),
        variables: this.variableStore.getKeys().length,
        plugins: this.plugins.size,
        clients: this.clientManager.getClientCount()
      }
    };
  }

  /**
   * Cleanup resources and close connections
   * 
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    this.auditLogger.info('[RESTIFIED] Starting cleanup');
    
    try {
      // Close audit logger
      await this.auditLogger.close();
      
      // Execute plugin cleanup if available
      for (const plugin of this.plugins.values()) {
        if (typeof (plugin as any).cleanup === 'function') {
          await (plugin as any).cleanup();
        }
      }
      
      this.auditLogger.info('[RESTIFIED] Cleanup completed');
    } catch (error) {
      this.auditLogger.error(`[RESTIFIED] Cleanup error: ${(error as Error).message}`);
      throw error;
    }
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Generate unique session ID
   * 
   * @returns Unique session identifier
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `restified_${timestamp}_${random}`;
  }

  /**
   * Initialize built-in plugins
   */
  private initializeBuiltInPlugins(): void {
    // Built-in plugins can be registered here
    // Example: Performance monitoring plugin, request/response logging plugin, etc.
  }

  /**
   * Setup cleanup handlers for graceful shutdown
   */
  private setupCleanupHandlers(): void {
    // Handle process termination
    const cleanup = async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }

  /**
   * Execute plugins before request
   * 
   * @param config - Request configuration
   */
  async executeBeforeRequestPlugins(config: any): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.beforeRequest) {
        await plugin.beforeRequest(config);
      }
    }
  }

  /**
   * Execute plugins after response
   * 
   * @param response - HTTP response
   */
  async executeAfterResponsePlugins(response: RestifiedResponse): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.afterResponse) {
        await plugin.afterResponse(response);
      }
    }
  }

  /**
   * Execute plugins on error
   * 
   * @param error - Error that occurred
   */
  async executeOnErrorPlugins(error: Error): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onError) {
        await plugin.onError(error);
      }
    }
  }
}

// Export default instance for convenient usage
export const restified = new RestifiedTS();

// Named exports for explicit imports
export { RestifiedTS as default };
export * from '../../types/RestifiedTypes';
export { BearerAuth, BasicAuth } from '../auth';
export { smoke, regression, tag } from '../../decorators/TestTags';