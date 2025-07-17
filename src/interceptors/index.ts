/**
 * Interceptor and Plugin System for RestifiedTS
 * 
 * This module provides comprehensive interceptor and plugin management
 * capabilities for request/response processing, authentication, logging,
 * caching, monitoring, and extensibility.
 */

// Core interceptor types
export * from './InterceptorTypes';

// Interceptor and plugin managers
export { InterceptorManager } from './InterceptorManager';
export { PluginManager } from './PluginManager';
export { InterceptorPluginSystem } from './InterceptorPluginSystem';

// Built-in interceptors
export * from './BuiltInInterceptors';

// Re-export default classes for convenience
export { default as InterceptorManagerDefault } from './InterceptorManager';
export { default as PluginManagerDefault } from './PluginManager';
export { default as InterceptorPluginSystemDefault } from './InterceptorPluginSystem';
export { default as BuiltInInterceptorFactoryDefault } from './BuiltInInterceptors';

// Import for default export
import { InterceptorManager } from './InterceptorManager';
import { PluginManager } from './PluginManager';
import { InterceptorPluginSystem } from './InterceptorPluginSystem';
import { BuiltInInterceptorFactory } from './BuiltInInterceptors';

// Export for backward compatibility
export default {
  InterceptorManager,
  PluginManager,
  InterceptorPluginSystem,
  BuiltInInterceptorFactory
};