/**
 * Interceptor Plugin System for RestifiedTS
 * 
 * This module provides a unified system for managing interceptors and plugins
 * with integration into the main RestifiedTS framework.
 */

import { EventEmitter } from 'events';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { InterceptorManager } from './InterceptorManager';
import { PluginManager } from './PluginManager';
import { BuiltInInterceptorFactory } from './BuiltInInterceptors';
import { 
  Interceptor,
  RestifiedPlugin,
  InterceptorConfig,
  PluginManagerConfig,
  PluginServices,
  InterceptorPhase,
  InterceptorPriority,
  PluginCapability,
  PluginStatus,
  BuiltInInterceptorType
} from './InterceptorTypes';

/**
 * System configuration
 */
export interface SystemConfig {
  interceptors: Partial<InterceptorConfig>;
  plugins: Partial<PluginManagerConfig>;
  enableBuiltInInterceptors: boolean;
  enabledBuiltInTypes: BuiltInInterceptorType[];
}

/**
 * System events
 */
export interface SystemEvents {
  'system:ready': () => void;
  'system:error': (error: any) => void;
  'interceptor:registered': (interceptor: Interceptor) => void;
  'plugin:loaded': (plugin: RestifiedPlugin) => void;
  'performance:warning': (message: string, metrics: any) => void;
}

/**
 * Interceptor and Plugin System Manager
 */
export class InterceptorPluginSystem extends EventEmitter {
  private interceptorManager: InterceptorManager;
  private pluginManager: PluginManager;
  private config: SystemConfig;
  private services: PluginServices;
  private initialized = false;

  constructor(services: PluginServices, config: Partial<SystemConfig> = {}) {
    super();
    
    this.services = services;
    this.config = {
      interceptors: {
        enabled: true,
        priority: InterceptorPriority.NORMAL,
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        skipOnError: false,
        preserveOrder: true,
        allowDuplicates: false
      },
      plugins: {
        autoLoadPlugins: true,
        pluginTimeout: 30000,
        maxConcurrentPlugins: 10,
        healthCheckInterval: 60000,
        enableStatistics: true,
        allowDynamicLoading: true,
        defaultPriority: InterceptorPriority.NORMAL
      },
      enableBuiltInInterceptors: true,
      enabledBuiltInTypes: [
        BuiltInInterceptorType.AUTHENTICATION,
        BuiltInInterceptorType.LOGGING,
        BuiltInInterceptorType.RETRY,
        BuiltInInterceptorType.TIMEOUT,
        BuiltInInterceptorType.USER_AGENT,
        BuiltInInterceptorType.COMPRESSION,
        BuiltInInterceptorType.VALIDATION,
        BuiltInInterceptorType.MONITORING
      ],
      ...config
    };

    this.interceptorManager = new InterceptorManager(this.config.interceptors);
    this.pluginManager = new PluginManager(this.interceptorManager, this.services, this.config.plugins);
    
    this.setupEventListeners();
  }

  /**
   * Initialize the system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Register built-in interceptors
      if (this.config.enableBuiltInInterceptors) {
        await this.registerBuiltInInterceptors();
      }

      // Load auto-load plugins
      if (this.config.plugins.autoLoadPlugins) {
        await this.loadAutoLoadPlugins();
      }

      this.initialized = true;
      this.emit('system:ready');

    } catch (error) {
      this.emit('system:error', error);
      throw error;
    }
  }

  /**
   * Register interceptor
   */
  registerInterceptor(interceptor: Interceptor): void {
    this.interceptorManager.registerInterceptor(interceptor);
  }

  /**
   * Unregister interceptor
   */
  unregisterInterceptor(name: string): boolean {
    return this.interceptorManager.unregisterInterceptor(name);
  }

  /**
   * Register plugin
   */
  async registerPlugin(plugin: RestifiedPlugin): Promise<void> {
    await this.pluginManager.registerPlugin(plugin);
  }

  /**
   * Unregister plugin
   */
  async unregisterPlugin(name: string): Promise<boolean> {
    return this.pluginManager.unregisterPlugin(name);
  }

  /**
   * Execute request interceptors
   */
  async executeRequestInterceptors(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    return this.interceptorManager.executeRequestInterceptors(config);
  }

  /**
   * Execute response interceptors
   */
  async executeResponseInterceptors(response: AxiosResponse): Promise<AxiosResponse> {
    return this.interceptorManager.executeResponseInterceptors(response);
  }

  /**
   * Execute error interceptors
   */
  async executeErrorInterceptors(error: any): Promise<any> {
    return this.interceptorManager.executeErrorInterceptors(error);
  }

  /**
   * Get interceptor manager
   */
  getInterceptorManager(): InterceptorManager {
    return this.interceptorManager;
  }

  /**
   * Get plugin manager
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Get system summary
   */
  getSummary(): {
    interceptors: any;
    plugins: any;
    performance: any;
    health: any;
  } {
    const interceptorSummary = this.interceptorManager.getSummary();
    const pluginSummary = this.pluginManager.getSummary();
    const interceptorStats = this.interceptorManager.getGlobalStatistics();
    const pluginStats = this.pluginManager.getAllPluginStatistics();

    return {
      interceptors: {
        ...interceptorSummary,
        statistics: interceptorStats
      },
      plugins: {
        ...pluginSummary,
        statistics: pluginStats
      },
      performance: {
        averageInterceptorTime: interceptorStats.averageExecutionTime,
        totalInterceptorExecutions: interceptorStats.totalExecutions,
        errorRate: interceptorStats.totalExecutions > 0 
          ? (interceptorStats.totalErrors / interceptorStats.totalExecutions) * 100 
          : 0
      },
      health: {
        systemReady: this.initialized,
        interceptorManagerHealthy: interceptorStats.totalErrors === 0 || interceptorStats.totalExecutions === 0,
        pluginManagerHealthy: pluginSummary.errorPlugins === 0
      }
    };
  }

  /**
   * Enable interceptor
   */
  enableInterceptor(name: string): boolean {
    return this.interceptorManager.enableInterceptor(name);
  }

  /**
   * Disable interceptor
   */
  disableInterceptor(name: string): boolean {
    return this.interceptorManager.disableInterceptor(name);
  }

  /**
   * Enable plugin
   */
  async enablePlugin(name: string): Promise<boolean> {
    return this.pluginManager.enablePlugin(name);
  }

  /**
   * Disable plugin
   */
  async disablePlugin(name: string): Promise<boolean> {
    return this.pluginManager.disablePlugin(name);
  }

  /**
   * Get interceptor by name
   */
  getInterceptor(name: string): Interceptor | undefined {
    return this.interceptorManager.getInterceptor(name);
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): RestifiedPlugin | undefined {
    return this.pluginManager.getPlugin(name);
  }

  /**
   * Get all interceptors
   */
  getAllInterceptors(): Interceptor[] {
    return this.interceptorManager.getAllInterceptors();
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): RestifiedPlugin[] {
    return this.pluginManager.getAllPlugins();
  }

  /**
   * Get interceptors by phase
   */
  getInterceptorsByPhase(phase: InterceptorPhase): Interceptor[] {
    return this.interceptorManager.getInterceptorsByPhase(phase);
  }

  /**
   * Get plugins by capability
   */
  getPluginsByCapability(capability: PluginCapability): RestifiedPlugin[] {
    return this.pluginManager.getPluginsByCapability(capability);
  }

  /**
   * Clear all statistics
   */
  clearStatistics(): void {
    this.interceptorManager.clearStatistics();
    this.pluginManager.clearPluginStatistics();
  }

  /**
   * Update system configuration
   */
  updateConfig(newConfig: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.interceptors) {
      this.interceptorManager.updateConfig(newConfig.interceptors);
    }
    
    if (newConfig.plugins) {
      this.pluginManager.updateConfig(newConfig.plugins);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SystemConfig {
    return { ...this.config };
  }

  /**
   * Check system health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    details: {
      interceptorManager: boolean;
      pluginManager: boolean;
      pluginHealth: Record<string, any>;
    };
  }> {
    const interceptorStats = this.interceptorManager.getGlobalStatistics();
    const pluginHealth = await this.pluginManager.checkAllPluginHealth();
    
    const interceptorManagerHealthy = interceptorStats.totalErrors === 0 || interceptorStats.totalExecutions === 0;
    const pluginManagerHealthy = Object.values(pluginHealth).every(health => health.healthy);
    
    return {
      healthy: interceptorManagerHealthy && pluginManagerHealthy,
      details: {
        interceptorManager: interceptorManagerHealthy,
        pluginManager: pluginManagerHealthy,
        pluginHealth
      }
    };
  }

  /**
   * Create built-in interceptor
   */
  createBuiltInInterceptor(type: BuiltInInterceptorType, config?: any): Interceptor | undefined {
    switch (type) {
      case BuiltInInterceptorType.AUTHENTICATION:
        return config?.authProvider ? BuiltInInterceptorFactory.createAuthenticationInterceptor(config.authProvider) : undefined;
      
      case BuiltInInterceptorType.LOGGING:
        return BuiltInInterceptorFactory.createRequestLoggingInterceptor(config?.logger);
      
      case BuiltInInterceptorType.RETRY:
        return BuiltInInterceptorFactory.createRetryInterceptor(
          config?.maxRetries,
          config?.baseDelay,
          config?.maxDelay
        );
      
      case BuiltInInterceptorType.RATE_LIMITING:
        return BuiltInInterceptorFactory.createRateLimitingInterceptor(
          config?.maxRequests,
          config?.windowMs
        );
      
      case BuiltInInterceptorType.TIMEOUT:
        return BuiltInInterceptorFactory.createTimeoutInterceptor(config?.timeoutMs);
      
      case BuiltInInterceptorType.USER_AGENT:
        return BuiltInInterceptorFactory.createUserAgentInterceptor(config?.userAgent);
      
      case BuiltInInterceptorType.COMPRESSION:
        return BuiltInInterceptorFactory.createCompressionInterceptor(config?.acceptedEncodings);
      
      case BuiltInInterceptorType.CORS:
        return BuiltInInterceptorFactory.createCORSInterceptor(config?.allowedOrigins);
      
      case BuiltInInterceptorType.VALIDATION:
        return BuiltInInterceptorFactory.createRequestValidationInterceptor(config?.validator);
      
      case BuiltInInterceptorType.CACHING:
        return BuiltInInterceptorFactory.createCacheInterceptor(config?.cacheTTL);
      
      case BuiltInInterceptorType.MONITORING:
        return BuiltInInterceptorFactory.createMonitoringInterceptor();
      
      default:
        return undefined;
    }
  }

  /**
   * Register built-in interceptors
   */
  private async registerBuiltInInterceptors(): Promise<void> {
    for (const type of this.config.enabledBuiltInTypes) {
      const interceptor = this.createBuiltInInterceptor(type);
      if (interceptor) {
        this.registerInterceptor(interceptor);
      }
    }
  }

  /**
   * Load auto-load plugins
   */
  private async loadAutoLoadPlugins(): Promise<void> {
    // This would load plugins from a configured directory
    // For now, we'll just log that auto-loading is enabled
    console.log('Auto-loading plugins is enabled');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Interceptor events
    this.interceptorManager.on('interceptor:registered', (interceptor) => {
      this.emit('interceptor:registered', interceptor);
    });

    this.interceptorManager.on('interceptor:executed', (result) => {
      // Check for performance warnings
      if (result.executionTime > 5000) {
        this.emit('performance:warning', 'Slow interceptor execution', {
          interceptor: result.interceptorName,
          executionTime: result.executionTime
        });
      }
    });

    this.interceptorManager.on('chain:error', (error, phase) => {
      this.emit('system:error', error);
    });

    // Plugin events
    this.pluginManager.on('plugin:loaded', (plugin) => {
      this.emit('plugin:loaded', plugin);
    });

    this.pluginManager.on('plugin:error', (name, error) => {
      this.emit('system:error', error);
    });
  }

  /**
   * Destroy the system
   */
  async destroy(): Promise<void> {
    await this.pluginManager.destroy();
    this.interceptorManager.reset();
    this.initialized = false;
  }
}

export default InterceptorPluginSystem;