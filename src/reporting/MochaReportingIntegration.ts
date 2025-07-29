/**
 * Mocha Reporting Integration for RestifiedTS
 * 
 * This module provides integration between RestifiedTS's reporting system
 * and Mocha test reports, ensuring request/response payloads and error
 * details are attached to Mochawesome reports.
 */

import { RestifiedTS } from '../core/dsl/RestifiedTS';
import { ReportingManager } from './ReportingManager';
import { TestStatus } from './ReportingTypes';

export interface MochaContext {
  test?: {
    title: string;
    fullTitle(): string;
    pending?: boolean;
    state?: 'passed' | 'failed' | 'pending';
    err?: Error;
    parent?: {
      title: string;
      fullTitle(): string;
    };
  };
  currentTest?: {
    title: string;
    fullTitle(): string;
    pending?: boolean;
    state?: 'passed' | 'failed' | 'pending';  
    err?: Error;
    parent?: {
      title: string;
      fullTitle(): string;
    };
  };
  parent?: {
    title: string;
    fullTitle(): string;
  };
}

/**
 * Mocha reporting integration class
 */
export class MochaReportingIntegration {
  private reportingManager: ReportingManager;
  private currentExecutionId?: string;
  private currentSuiteId?: string;
  private currentTestId?: string;
  private initialized = false;

  constructor(restifiedInstance: RestifiedTS) {
    this.reportingManager = restifiedInstance.getReportingManager();
  }

  /**
   * Initialize Mocha hooks for automatic reporting
   */
  setupHooks() {
    if (this.initialized) {
      return;
    }

    // Only setup hooks if we're in a Mocha environment
    if (typeof global !== 'undefined' && (global as any).before && (global as any).after) {
      this.setupMochaHooks();
      this.initialized = true;
    }
  }

  /**
   * Setup Mocha hooks
   */
  private setupMochaHooks() {
    const self = this;

    // Global before hook - start execution
    (global as any).before(async function(this: MochaContext) {
      try {
        const executionName = process.env.npm_lifecycle_event || 'RestifiedTS Test Execution';
        self.currentExecutionId = await self.reportingManager.startExecution(
          executionName,
          'Automated test execution with RestifiedTS'
        );
      } catch (error) {
        console.warn('Failed to start test execution tracking:', (error as Error).message);
      }
    });

    // Global after hook - end execution
    (global as any).after(async function(this: MochaContext) {
      try {
        if (self.currentExecutionId) {
          await self.reportingManager.endExecution();
        }
      } catch (error) {
        console.warn('Failed to end test execution tracking:', (error as Error).message);
      }
    });

    // Suite before hook - start suite
    (global as any).beforeEach(async function(this: MochaContext) {
      try {
        const currentTest = this.currentTest || this.test;
        if (currentTest && currentTest.parent) {
          const suiteTitle = currentTest.parent.title || 'Unknown Suite';
          
          // Only start a new suite if it's different from the current one
          if (!self.currentSuiteId || suiteTitle !== self.getLastSuiteTitle()) {
            // End previous suite if exists
            if (self.currentSuiteId) {
              await self.reportingManager.endSuite();
            }
            
            self.currentSuiteId = await self.reportingManager.startSuite(
              suiteTitle,
              `Test suite: ${suiteTitle}`
            );
            self.setLastSuiteTitle(suiteTitle);
          }
        }

        // Start individual test
        if (currentTest) {
          self.currentTestId = await self.reportingManager.startTest(
            currentTest.title,
            `Test: ${currentTest.fullTitle()}`
          );
        }
      } catch (error) {
        console.warn('Failed to start test/suite tracking:', (error as Error).message);
      }
    });

    // Test after hook - end test
    (global as any).afterEach(async function(this: MochaContext) {
      try {
        if (self.currentTestId) {
          const currentTest = this.currentTest || this.test;
          let status = TestStatus.PASSED;
          let error: Error | undefined;

          if (currentTest) {
            if (currentTest.pending) {
              status = TestStatus.PENDING;
            } else if (currentTest.state === 'failed') {
              status = TestStatus.FAILED;
              error = currentTest.err;
            } else if (currentTest.state === 'passed') {
              status = TestStatus.PASSED;
            }
          }

          await self.reportingManager.endTest(status, error);
          self.currentTestId = undefined;
        }
      } catch (error) {
        console.warn('Failed to end test tracking:', (error as Error).message);
      }
    });
  }

  private lastSuiteTitle?: string;

  private getLastSuiteTitle(): string | undefined {
    return this.lastSuiteTitle;
  }

  private setLastSuiteTitle(title: string) {
    this.lastSuiteTitle = title;
  }

  /**
   * Attach request/response data to current test
   */
  async attachRequestResponse(requestData: any, responseData?: any) {
    try {
      // Try to use Mochawesome addContext function directly
      const currentMochaTest = this.getCurrentMochaTest();
      console.log('[RestifiedTS] Current Mocha test:', currentMochaTest?.title);
      if (currentMochaTest) {
        try {
          const addContext = require('mochawesome/addContext');
          
          // Attach request details with better formatting
          const requestDetails = {
            method: requestData.method,
            url: requestData.url,
            headers: requestData.headers,
            body: requestData.data || requestData.body,
            timestamp: new Date().toISOString()
          };
          
          // Try using the object directly instead of HTML formatting
          addContext(currentMochaTest, {
            title: '🔍 HTTP Request Details',
            value: requestDetails
          });

          // Attach response details if available
          if (responseData) {
            const responseDetails = {
              status: responseData.status,
              statusText: responseData.statusText,
              headers: responseData.headers,
              data: responseData.data,
              responseTime: responseData.responseTime,
              timestamp: new Date().toISOString()
            };
            
            addContext(currentMochaTest, {
              title: '✅ HTTP Response Details',
              value: responseDetails
            });
          }
          
          console.log('[RestifiedTS] Request/Response data attached to Mochawesome report');
          return;
          
        } catch (mochaError) {
          console.debug('[RestifiedTS] Mochawesome addContext not available:', (mochaError as Error).message);
        }
      }

      // Fallback to internal reporting system
      if (this.currentTestId) {
        // Add request attachment
        await this.reportingManager.addAttachment({
          id: `req-${Date.now()}`,
          name: 'HTTP Request',
          type: 'json',
          mimeType: 'application/json',
          content: JSON.stringify(requestData, null, 2),
          size: JSON.stringify(requestData).length,
          timestamp: new Date(),
          metadata: {
            type: 'request',
            testId: this.currentTestId
          }
        });

        // Add response attachment if available
        if (responseData) {
          await this.reportingManager.addAttachment({
            id: `res-${Date.now()}`,
            name: 'HTTP Response',
            type: 'json',
            mimeType: 'application/json',
            content: JSON.stringify(responseData, null, 2),
            size: JSON.stringify(responseData).length,
            timestamp: new Date(),
            metadata: {
              type: 'response',
              testId: this.currentTestId,
              statusCode: responseData.status,
              responseTime: responseData.responseTime
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to attach request/response data:', (error as Error).message);
    }
  }

  /**
   * Attach error details to current test
   */
  async attachError(error: Error, context?: any) {
    try {
      // Try to use Mochawesome addContext function directly
      const currentMochaTest = this.getCurrentMochaTest();
      if (currentMochaTest) {
        try {
          const addContext = require('mochawesome/addContext');
          
          const errorData = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            context: context || {},
            timestamp: new Date().toISOString()
          };

          addContext(currentMochaTest, {
            title: '❌ Error Details',
            value: this.formatContextData(errorData)
          });
          
          console.log('[RestifiedTS] Error details attached to Mochawesome report');
          return;
          
        } catch (mochaError) {
          console.debug('[RestifiedTS] Mochawesome addContext not available for error:', (mochaError as Error).message);
        }
      }

      // Fallback to internal reporting system
      if (this.currentTestId) {
        const errorData = {
          message: error.message,
          name: error.name,
          stack: error.stack,
          context: context || {},
          timestamp: new Date().toISOString()
        };

        await this.reportingManager.addAttachment({
          id: `err-${Date.now()}`,
          name: 'Error Details',
          type: 'json',
          mimeType: 'application/json',
          content: JSON.stringify(errorData, null, 2),
          size: JSON.stringify(errorData).length,
          timestamp: new Date(),
          metadata: {
            type: 'error',
            testId: this.currentTestId,
            errorType: error.name
          }
        });
      }
    } catch (attachError) {
      console.warn('Failed to attach error details:', (attachError as Error).message);
    }
  }

  /**
   * Format context data for better display in Mochawesome
   */
  private formatContextData(data: any): string {
    try {
      // Try to format as HTML table for better readability
      if (typeof data === 'object' && data !== null) {
        let html = '<div style="font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 5px 0;">';
        
        // Handle different types of data
        if (data.method && data.url) {
          // HTTP Request format
          html += `<div style="margin-bottom: 8px;"><strong style="color: #2196F3;">${data.method}</strong> <code>${data.url}</code></div>`;
          if (data.headers && Object.keys(data.headers).length > 0) {
            html += '<div style="margin-bottom: 8px;"><strong>Headers:</strong></div>';
            html += '<div style="margin-left: 10px; margin-bottom: 8px;">';
            for (const [key, value] of Object.entries(data.headers)) {
              html += `<div><code>${key}</code>: <code>${value}</code></div>`;
            }
            html += '</div>';
          }
          if (data.body && Object.keys(data.body).length > 0) {
            html += '<div style="margin-bottom: 8px;"><strong>Body:</strong></div>';
            html += `<pre style="margin-left: 10px; background: white; padding: 8px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(data.body, null, 2)}</pre>`;
          }
        } else if (data.status !== undefined) {
          // HTTP Response format
          const statusColor = data.status >= 200 && data.status < 300 ? '#4CAF50' : '#F44336';
          html += `<div style="margin-bottom: 8px;"><strong style="color: ${statusColor};">${data.status}</strong> <span style="color: #666;">${data.statusText}</span>`;
          if (data.responseTime) {
            html += ` <span style="color: #FF9800; font-weight: bold;">(${data.responseTime}ms)</span>`;
          }
          html += '</div>';
          
          if (data.headers && Object.keys(data.headers).length > 0) {
            html += '<div style="margin-bottom: 8px;"><strong>Headers:</strong></div>';
            html += '<div style="margin-left: 10px; margin-bottom: 8px;">';
            for (const [key, value] of Object.entries(data.headers)) {
              html += `<div><code>${key}</code>: <code>${value}</code></div>`;
            }
            html += '</div>';
          }
          
          if (data.data) {
            html += '<div style="margin-bottom: 8px;"><strong>Response Data:</strong></div>';
            html += `<pre style="margin-left: 10px; background: white; padding: 8px; border-radius: 3px; overflow-x: auto; max-height: 300px;">${JSON.stringify(data.data, null, 2)}</pre>`;
          }
        } else {
          // Generic object format
          html += `<pre style="background: white; padding: 8px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>`;
        }
        
        if (data.timestamp) {
          html += `<div style="margin-top: 8px; color: #999; font-size: 12px;">⏰ ${data.timestamp}</div>`;
        }
        
        html += '</div>';
        return html;
      }
      
      // Fallback to JSON string
      return JSON.stringify(data, null, 2);
    } catch (error) {
      // If formatting fails, return JSON string
      return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Get current Mocha test instance
   */
  private getCurrentMochaTest() {
    try {
      // Try to get current test from global context
      if (typeof global !== 'undefined') {
        // Check if we have a global reference to the current test from RestifiedTS wrapping
        if ((global as any).restifiedCurrentTest) {
          return (global as any).restifiedCurrentTest;
        }
        
        // Check if we have a global reference to the current test
        if ((global as any).currentMochaTest) {
          return (global as any).currentMochaTest;
        }
        
        // Try to get from mochaContext
        if ((global as any).mochaContext && (global as any).mochaContext.currentTest) {
          return (global as any).mochaContext.currentTest;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current test context
   */
  getCurrentContext() {
    return {
      executionId: this.currentExecutionId,
      suiteId: this.currentSuiteId,
      testId: this.currentTestId
    };
  }

  /**
   * Check if reporting is active
   */
  isActive(): boolean {
    return this.initialized && !!this.currentExecutionId;
  }
}

// Global instance for automatic setup
let globalIntegration: MochaReportingIntegration | undefined;

/**
 * Initialize Mocha reporting integration
 */
export function setupMochaReporting(restifiedInstance: RestifiedTS) {
  if (!globalIntegration) {
    globalIntegration = new MochaReportingIntegration(restifiedInstance);
    globalIntegration.setupHooks();
  }
  return globalIntegration;
}

/**
 * Get the global Mocha integration instance
 */
export function getMochaIntegration(): MochaReportingIntegration | undefined {
  return globalIntegration;
}

export default MochaReportingIntegration;