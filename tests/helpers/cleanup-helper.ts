/**
 * Test Cleanup Helper
 * 
 * This helper ensures proper cleanup after all tests complete to prevent
 * process hanging issues. It automatically registers global cleanup hooks.
 */

import { forceCleanup } from '../../src/core/dsl/RestifiedTS';

// Global flag to ensure we only register cleanup once
let cleanupRegistered = false;

/**
 * Register global cleanup hooks for Mocha
 * This should be called once at the start of test execution
 */
export function registerGlobalCleanup(): void {
  if (cleanupRegistered) {
    return;
  }
  
  cleanupRegistered = true;
  
  // Register cleanup for when all tests are done
  if (typeof after === 'function') {
    after(async function() {
      this.timeout(5000);
      try {
        console.log('🧹 Running global cleanup...');
        await forceCleanup();
      } catch (error) {
        console.warn('Global cleanup warning:', error);
        // Force exit anyway
        setTimeout(() => process.exit(0), 500);
      }
    });
  }
  
  // Also register for uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    forceCleanup().finally(() => process.exit(1));
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    forceCleanup().finally(() => process.exit(1));
  });
}

// Auto-register when this module is imported
registerGlobalCleanup();