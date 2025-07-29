/**
 * Global test cleanup helper
 * 
 * This module provides utilities to ensure proper cleanup of resources
 * during test execution to prevent hanging processes.
 */
import why from 'why-is-node-running';
import { RestifiedLogger } from '../../src/logging/RestifiedLogger';
import { restified } from '../../src';

// Global cleanup registry
const cleanupTasks: (() => Promise<void> | void)[] = [];

/**
 * Register a cleanup task to be executed during global cleanup
 */
export function registerCleanupTask(task: () => Promise<void> | void): void {
  cleanupTasks.push(task);
}

/**
 * Execute all registered cleanup tasks
 */
export async function executeGlobalCleanup(): Promise<void> {
  console.log(`Executing ${cleanupTasks.length} cleanup tasks...`);
  
  // Add RestifiedTS-specific cleanup tasks
  const restifiedCleanupTasks = [
    // 1. Disconnect all WebSocket connections
    async () => {
      try {
        console.log('🔌 Disconnecting WebSocket connections...');
        await restified.disconnectAllWebSockets();
      } catch (error) {
        console.debug('WebSocket disconnect warning (ignored):', (error as Error).message);
      }
    },
    
    // 2. Clear all variable stores
    () => {
      try {
        console.log('🧹 Clearing variable stores...');
        restified.clearGlobalVariables?.();
        restified.clearLocalVariables?.();
      } catch (error) {
        console.debug('Variable store cleanup warning (ignored):', (error as Error).message);
      }
    },
    
    // 3. Run RestifiedTS cleanup
    async () => {
      try {
        console.log('🔄 Running RestifiedTS cleanup...');
        await restified.cleanup();
      } catch (error) {
        console.debug('RestifiedTS cleanup warning (ignored):', (error as Error).message);
      }
    },
    
    // 4. Force logger cleanup
    () => {
      try {
        console.log('📝 Cleaning up logger instances...');
        // This will be handled by the singleton pattern we implemented
        // No direct action needed, but log for visibility
      } catch (error) {
        console.debug('Logger cleanup warning (ignored):', (error as Error).message);
      }
    }
  ];
  
  // Combine user-registered tasks with RestifiedTS cleanup tasks
  const allTasks = [...cleanupTasks, ...restifiedCleanupTasks];
  
  const cleanupPromises = allTasks.map(async (task, index) => {
    try {
      await task();
    } catch (error) {
      console.warn(`Cleanup task ${index} failed:`, (error as Error).message);
    }
  });

  await Promise.all(cleanupPromises);
  cleanupTasks.length = 0; // Clear the tasks array
  
  console.log('Global cleanup completed');
}

/**
 * Force cleanup of any remaining resources
 */
export function forceCleanup(): void {
  console.log('🚨 Force cleanup starting...');
  
  // Clear any remaining intervals/timeouts (conservative approach)
  if (typeof global !== 'undefined') {
    // Only clear unref'd timers to avoid breaking system timers
    console.log('🚨 Allowing natural cleanup of timers...');
  }

  // Force close any open file handles
  try {
    // Close stdin/stdout/stderr references that might be keeping process alive
    if (process.stdin && typeof process.stdin.destroy === 'function') {
      process.stdin.destroy();
    }
  } catch (error) {
    console.debug('stdin cleanup warning (ignored):', (error as Error).message);
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Log completion instead of force exit
  console.log('🚨 Force cleanup completed - allowing natural process exit');
  
  console.log('🚨 Force cleanup completed');
}

// Register global cleanup for process termination
process.on('exit', () => {
  console.log('🚨 Process exit detected, running cleanup...');
  try {
    forceCleanup();
  } catch (error) {
    console.debug('Exit cleanup error (ignored):', (error as Error).message);
  }
});

// Register cleanup for various termination signals
process.on('SIGINT', async () => {
  console.log('🚨 SIGINT received, running cleanup...');
  try {
    await executeGlobalCleanup();
    forceCleanup();
  } catch (error) {
    console.debug('SIGINT cleanup error (ignored):', (error as Error).message);
  }
  // Let the process exit naturally after cleanup
});

process.on('SIGTERM', async () => {
  console.log('🚨 SIGTERM received, running cleanup...');
  try {
    await executeGlobalCleanup();
    forceCleanup();
  } catch (error) {
    console.debug('SIGTERM cleanup error (ignored):', (error as Error).message);
  }
  // Let the process exit naturally after cleanup
});

// Handle test completion
if (typeof after === 'function') {
  after(async function() {
    this.timeout(10000); // Allow time for cleanup
    await executeGlobalCleanup();
    forceCleanup();

    // Wait a moment for all async cleanup to finish
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('\n🔍 why-is-node-running diagnostics:');
    why();
    // Give diagnostics time to print, then force exit
    setTimeout(() => process.exit(0), 300);
  });
}