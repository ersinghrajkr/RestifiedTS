/**
 * Plugin Manager for RestifiedTS
 * 
 * This module provides comprehensive plugin management capabilities including
 * loading, lifecycle management, health monitoring, and statistics tracking.
 */

import { EventEmitter } from 'events';
import { 
  RestifiedPlugin,
  PluginContext,
  PluginServices,
  PluginStatus,
  PluginRegistryEntry,
  PluginHealthStatus,
  PluginStatistics,
  PluginManagerConfig,
  PluginCapability,
  PluginManagerEvents,
  PluginLoader,
  InterceptorPriority
} from './InterceptorTypes';
import { InterceptorManager } from './InterceptorManager';

/**
 * Plugin manager class
 */
export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private config: PluginManagerConfig;
  private interceptorManager: InterceptorManager;
  private healthCheckInterval?: NodeJS.Timeout;
  private pluginLoader?: PluginLoader;
  private services: PluginServices;

  constructor(
    interceptorManager: InterceptorManager,
    services: PluginServices,
    config: Partial<PluginManagerConfig> = {}
  ) {
    super();
    
    this.interceptorManager = interceptorManager;
    this.services = services;
    this.config = {
      autoLoadPlugins: true,
      pluginTimeout: 30000,
      maxConcurrentPlugins: 10,
      healthCheckInterval: 60000,
      enableStatistics: true,
      allowDynamicLoading: true,
      defaultPriority: InterceptorPriority.NORMAL,
      ...config
    };

    this.setupHealthCheck();
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: RestifiedPlugin): Promise<void> {
    this.emit('plugin:loading', plugin.name);

    try {
      // Validate plugin
      await this.validatePlugin(plugin);

      // Check dependencies
      await this.checkDependencies(plugin);

      // Create plugin context
      const context = this.createPluginContext(plugin);

      // Create registry entry
      const entry: PluginRegistryEntry = {
        plugin,
        context,
        status: PluginStatus.LOADING,
        loadTime: new Date(),
        statistics: {
          interceptorExecutions: 0,
          totalExecutionTime: 0,
          errorCount: 0,
          successCount: 0,
          averageExecutionTime: 0
        }
      };

      this.plugins.set(plugin.name, entry);

      // Initialize plugin
      if (plugin.initialize) {
        await this.executeWithTimeout(
          () => plugin.initialize!(context),
          this.config.pluginTimeout,
          `Plugin ${plugin.name} initialization timeout`
        );
      }

      // Configure plugin
      if (plugin.configure && plugin.config) {
        await this.executeWithTimeout(
          () => plugin.configure!(plugin.config),
          this.config.pluginTimeout,
          `Plugin ${plugin.name} configuration timeout`
        );
      }

      // Register plugin interceptors
      if (plugin.interceptors) {
        for (const interceptor of plugin.interceptors) {
          this.interceptorManager.registerInterceptor(interceptor);
        }
      }

      // Update status
      entry.status = PluginStatus.LOADED;

      // Activate plugin if enabled
      if (plugin.enabled) {
        await this.activatePlugin(plugin.name);
      }

      this.emit('plugin:loaded', plugin);

    } catch (error) {
      const entry = this.plugins.get(plugin.name);
      if (entry) {
        entry.status = PluginStatus.ERROR;
      }
      
      this.emit('plugin:error', plugin.name, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(name: string): Promise<boolean> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return false;
    }

    try {
      // Deactivate plugin if active
      if (entry.status === PluginStatus.ACTIVE) {
        await this.deactivatePlugin(name);
      }

      // Unregister plugin interceptors
      if (entry.plugin.interceptors) {
        for (const interceptor of entry.plugin.interceptors) {
          this.interceptorManager.unregisterInterceptor(interceptor.name);
        }
      }

      // Destroy plugin
      if (entry.plugin.destroy) {
        await this.executeWithTimeout(
          () => entry.plugin.destroy!(),
          this.config.pluginTimeout,
          `Plugin ${name} destruction timeout`
        );
      }

      // Update status
      entry.status = PluginStatus.UNLOADED;

      // Remove from registry
      this.plugins.delete(name);

      return true;

    } catch (error) {
      this.emit('plugin:error', name, error);
      return false;
    }
  }

  /**
   * Activate a plugin
   */
  async activatePlugin(name: string): Promise<boolean> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return false;
    }

    if (entry.status === PluginStatus.ACTIVE) {
      return true;
    }

    try {
      // Activate plugin
      if (entry.plugin.activate) {
        await this.executeWithTimeout(
          () => entry.plugin.activate!(),
          this.config.pluginTimeout,
          `Plugin ${name} activation timeout`
        );
      }

      // Enable plugin interceptors
      if (entry.plugin.interceptors) {
        for (const interceptor of entry.plugin.interceptors) {
          this.interceptorManager.enableInterceptor(interceptor.name);
        }
      }

      entry.status = PluginStatus.ACTIVE;
      this.emit('plugin:activated', name);

      return true;

    } catch (error) {
      entry.status = PluginStatus.ERROR;
      this.emit('plugin:error', name, error);
      return false;
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(name: string): Promise<boolean> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return false;
    }

    if (entry.status === PluginStatus.INACTIVE) {
      return true;
    }

    try {
      // Disable plugin interceptors
      if (entry.plugin.interceptors) {
        for (const interceptor of entry.plugin.interceptors) {
          this.interceptorManager.disableInterceptor(interceptor.name);
        }
      }

      // Deactivate plugin
      if (entry.plugin.deactivate) {
        await this.executeWithTimeout(
          () => entry.plugin.deactivate!(),
          this.config.pluginTimeout,
          `Plugin ${name} deactivation timeout`
        );
      }

      entry.status = PluginStatus.INACTIVE;
      this.emit('plugin:deactivated', name);

      return true;

    } catch (error) {
      entry.status = PluginStatus.ERROR;
      this.emit('plugin:error', name, error);
      return false;
    }
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): RestifiedPlugin | undefined {
    const entry = this.plugins.get(name);
    return entry?.plugin;
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): RestifiedPlugin[] {
    return Array.from(this.plugins.values()).map(entry => entry.plugin);
  }

  /**
   * Get plugins by capability
   */
  getPluginsByCapability(capability: PluginCapability): RestifiedPlugin[] {
    return Array.from(this.plugins.values())
      .filter(entry => entry.plugin.capabilities?.includes(capability))
      .map(entry => entry.plugin);
  }

  /**
   * Get plugin status
   */
  getPluginStatus(name: string): PluginStatus | undefined {
    const entry = this.plugins.get(name);
    return entry?.status;
  }

  /**
   * Get plugin statistics
   */
  getPluginStatistics(name: string): PluginStatistics | undefined {
    const entry = this.plugins.get(name);
    return entry?.statistics;
  }

  /**
   * Get all plugin statistics
   */
  getAllPluginStatistics(): Record<string, PluginStatistics> {
    const stats: Record<string, PluginStatistics> = {};
    
    this.plugins.forEach((entry, name) => {
      stats[name] = { ...entry.statistics };
    });
    
    return stats;
  }

  /**
   * Check plugin health
   */
  async checkPluginHealth(name: string): Promise<PluginHealthStatus | undefined> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return undefined;
    }

    try {
      let healthStatus: PluginHealthStatus;

      if (entry.plugin.healthCheck) {
        healthStatus = await this.executeWithTimeout(
          () => entry.plugin.healthCheck!(),
          5000,
          `Plugin ${name} health check timeout`
        );
      } else {
        healthStatus = {
          healthy: entry.status === PluginStatus.ACTIVE,
          message: `Plugin is ${entry.status}`,
          lastChecked: new Date()
        };
      }

      entry.healthStatus = healthStatus;
      this.emit('plugin:health:changed', name, healthStatus);

      return healthStatus;

    } catch (error) {
      const healthStatus: PluginHealthStatus = {
        healthy: false,
        message: error instanceof Error ? error.message : String(error),
        lastChecked: new Date()
      };

      entry.healthStatus = healthStatus;
      this.emit('plugin:health:changed', name, healthStatus);

      return healthStatus;
    }
  }

  /**
   * Check health of all plugins
   */
  async checkAllPluginHealth(): Promise<Record<string, PluginHealthStatus>> {
    const healthStatuses: Record<string, PluginHealthStatus> = {};
    
    const promises = Array.from(this.plugins.keys()).map(async (name) => {
      const health = await this.checkPluginHealth(name);
      if (health) {
        healthStatuses[name] = health;
      }
    });

    await Promise.all(promises);
    return healthStatuses;
  }

  /**
   * Get plugin summary
   */
  getSummary(): {
    totalPlugins: number;
    activePlugins: number;
    inactivePlugins: number;
    errorPlugins: number;
    loadedPlugins: number;
    byCapability: Record<PluginCapability, number>;
    healthySummary: {
      healthy: number;
      unhealthy: number;
      unknown: number;
    };
  } {
    const entries = Array.from(this.plugins.values());
    
    const byStatus = {
      active: 0,
      inactive: 0,
      error: 0,
      loaded: 0
    };

    const byCapability: Record<PluginCapability, number> = {} as any;
    Object.values(PluginCapability).forEach(capability => {
      byCapability[capability] = 0;
    });

    const healthySummary = {
      healthy: 0,
      unhealthy: 0,
      unknown: 0
    };

    entries.forEach(entry => {
      // Count by status
      switch (entry.status) {
        case PluginStatus.ACTIVE:
          byStatus.active++;
          break;
        case PluginStatus.INACTIVE:
          byStatus.inactive++;
          break;
        case PluginStatus.ERROR:
          byStatus.error++;
          break;
        case PluginStatus.LOADED:
          byStatus.loaded++;
          break;
      }

      // Count by capability
      if (entry.plugin.capabilities) {
        entry.plugin.capabilities.forEach(capability => {
          byCapability[capability]++;
        });
      }

      // Count by health
      if (entry.healthStatus) {
        if (entry.healthStatus.healthy) {
          healthySummary.healthy++;
        } else {
          healthySummary.unhealthy++;
        }
      } else {
        healthySummary.unknown++;
      }
    });

    return {
      totalPlugins: entries.length,
      activePlugins: byStatus.active,
      inactivePlugins: byStatus.inactive,
      errorPlugins: byStatus.error,
      loadedPlugins: byStatus.loaded,
      byCapability,
      healthySummary
    };
  }

  /**
   * Enable plugin
   */
  async enablePlugin(name: string): Promise<boolean> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return false;
    }

    entry.plugin.enabled = true;
    
    if (entry.status === PluginStatus.LOADED || entry.status === PluginStatus.INACTIVE) {
      return this.activatePlugin(name);
    }

    return true;
  }

  /**
   * Disable plugin
   */
  async disablePlugin(name: string): Promise<boolean> {
    const entry = this.plugins.get(name);
    if (!entry) {
      return false;
    }

    entry.plugin.enabled = false;
    
    if (entry.status === PluginStatus.ACTIVE) {
      return this.deactivatePlugin(name);
    }

    return true;
  }

  /**
   * Update plugin statistics
   */
  updatePluginStatistics(
    pluginName: string,
    executionTime: number,
    success: boolean
  ): void {
    const entry = this.plugins.get(pluginName);
    if (!entry || !this.config.enableStatistics) {
      return;
    }

    const stats = entry.statistics;
    stats.interceptorExecutions++;
    stats.totalExecutionTime += executionTime;
    stats.lastExecuted = new Date();

    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }

    stats.averageExecutionTime = stats.totalExecutionTime / stats.interceptorExecutions;
  }

  /**
   * Clear plugin statistics
   */
  clearPluginStatistics(pluginName?: string): void {
    if (pluginName) {
      const entry = this.plugins.get(pluginName);
      if (entry) {
        entry.statistics = {
          interceptorExecutions: 0,
          totalExecutionTime: 0,
          errorCount: 0,
          successCount: 0,
          averageExecutionTime: 0
        };
      }
    } else {
      this.plugins.forEach(entry => {
        entry.statistics = {
          interceptorExecutions: 0,
          totalExecutionTime: 0,
          errorCount: 0,
          successCount: 0,
          averageExecutionTime: 0
        };
      });
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PluginManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update health check interval
    if (newConfig.healthCheckInterval) {
      this.setupHealthCheck();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PluginManagerConfig {
    return { ...this.config };
  }

  /**
   * Set plugin loader
   */
  setPluginLoader(loader: PluginLoader): void {
    this.pluginLoader = loader;
  }

  /**
   * Load plugin from path
   */
  async loadPlugin(pluginPath: string): Promise<void> {
    if (!this.pluginLoader) {
      throw new Error('Plugin loader not configured');
    }

    if (!this.config.allowDynamicLoading) {
      throw new Error('Dynamic plugin loading is disabled');
    }

    const plugin = await this.pluginLoader.load(pluginPath);
    await this.registerPlugin(plugin);
  }

  /**
   * Reload plugin
   */
  async reloadPlugin(name: string): Promise<boolean> {
    if (!this.pluginLoader) {
      throw new Error('Plugin loader not configured');
    }

    const entry = this.plugins.get(name);
    if (!entry) {
      return false;
    }

    try {
      // Unregister current plugin
      await this.unregisterPlugin(name);

      // Reload plugin
      const reloadedPlugin = await this.pluginLoader.reload(name);
      await this.registerPlugin(reloadedPlugin);

      return true;

    } catch (error) {
      this.emit('plugin:error', name, error);
      return false;
    }
  }

  /**
   * Validate plugin
   */
  private async validatePlugin(plugin: RestifiedPlugin): Promise<void> {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid version');
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin with name '${plugin.name}' already exists`);
    }

    // Validate using plugin loader if available
    if (this.pluginLoader) {
      const isValid = await this.pluginLoader.validate(plugin);
      if (!isValid) {
        throw new Error(`Plugin validation failed for '${plugin.name}'`);
      }
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(plugin: RestifiedPlugin): Promise<void> {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return;
    }

    const missingDependencies: string[] = [];

    for (const dependency of plugin.dependencies) {
      if (!this.plugins.has(dependency)) {
        missingDependencies.push(dependency);
      }
    }

    if (missingDependencies.length > 0) {
      throw new Error(`Missing dependencies for plugin '${plugin.name}': ${missingDependencies.join(', ')}`);
    }
  }

  /**
   * Create plugin context
   */
  private createPluginContext(plugin: RestifiedPlugin): PluginContext {
    return {
      pluginName: plugin.name,
      restifiedVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      logger: this.services.logger,
      config: plugin.config || {},
      services: this.services
    };
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeout: number,
    timeoutMessage: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeout);
    });

    return Promise.race([
      Promise.resolve(fn()),
      timeoutPromise
    ]);
  }

  /**
   * Setup health check
   */
  private setupHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.config.healthCheckInterval > 0) {
      this.healthCheckInterval = setInterval(() => {
        this.checkAllPluginHealth().catch(error => {
          // Log error but don't throw
          console.error('Health check failed:', error);
        });
      }, this.config.healthCheckInterval);
    }
  }

  /**
   * Destroy plugin manager
   */
  async destroy(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Unregister all plugins
    const pluginNames = Array.from(this.plugins.keys());
    for (const name of pluginNames) {
      await this.unregisterPlugin(name);
    }

    this.plugins.clear();
  }
}

export default PluginManager;