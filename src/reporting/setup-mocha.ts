/**
 * Mocha Setup Helper for RestifiedTS
 * 
 * Include this file in your test setup to automatically enable
 * comprehensive request/response logging in Mochawesome reports.
 * 
 * Usage:
 * 1. Add to mocha command: --require restifiedts/dist/reporting/setup-mocha
 * 2. Or import in your test files: import 'restifiedts/dist/reporting/setup-mocha'
 * 3. Or include in your test setup file
 */

import { restified, setupMochaReporting } from '../index';

// Automatically setup Mocha reporting integration
try {
  setupMochaReporting(restified);
  
  // Add global hooks for enhanced reporting
  if (typeof global !== 'undefined' && (global as any).before) {
    
    // Global beforeEach to track current test for Mochawesome context
    (global as any).beforeEach(function(this: any) {
      (global as any).currentMochaTest = this.currentTest;
      (global as any).mochaContext = this;
      console.log('[RestifiedTS] Test started:', this.currentTest?.title);
    });
    
    // Enhanced logging for failed tests
    (global as any).afterEach(function(this: any) {
      if (this.currentTest && this.currentTest.state === 'failed') {
        const error = this.currentTest.err;
        if (error) {
          console.log('\n🔍 ENHANCED ERROR DETAILS:');
          console.log('=========================');
          console.log('Test:', this.currentTest.fullTitle());
          console.log('Error:', error.message);
          if (error.actual !== undefined && error.expected !== undefined) {
            console.log('Expected:', error.expected);
            console.log('Actual:', error.actual);
          }
          if (error.stack) {
            console.log('Stack Trace:');
            console.log(error.stack);
          }
          console.log('=========================\n');
        }
      }
    });

    // Add process cleanup for better test isolation
    (global as any).after(async function() {
      try {
        await restified.cleanup();
      } catch (error) {
        console.warn('RestifiedTS cleanup warning:', (error as Error).message);
      }
    });
  }
  
  console.log('[RestifiedTS] Mocha reporting integration enabled');
} catch (error) {
  console.warn('[RestifiedTS] Failed to setup Mocha reporting:', (error as Error).message);
}

export default true;