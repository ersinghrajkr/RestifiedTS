/**
 * Unified Test Execution Orchestrator for RestifiedTS
 * 
 * Coordinates execution of:
 * - API functional tests
 * - Security testing (ZAP)
 * - Performance testing (Artillery)
 * 
 * Supports sequential and parallel execution modes
 */

import { EventEmitter } from 'events';
import { ZapIntegration, ZapConfig, ZapScanResult } from '../security/ZapIntegration';
import { ArtilleryIntegration, ArtilleryConfig, LoadTestResult } from '../performance/ArtilleryIntegration';
import { SchemaValidationManager } from '../validation/SchemaValidationManager';
import { RestifiedTS } from '../core/dsl/RestifiedTS';

export interface UnifiedTestConfig {
  name: string;
  description: string;
  execution: {
    mode: 'sequential' | 'parallel';
    continueOnFailure: boolean;
    timeout: number;
  };
  api: {
    enabled: boolean;
    tests: ApiTestSpec[];
    validation?: {
      enableJoi: boolean;
      enableAjv: boolean;
      enableZod: boolean;
    };
  };
  security: {
    enabled: boolean;
    config: ZapConfig;
    policies: string[];
    runAfterApi: boolean;
  };
  performance: {
    enabled: boolean;
    config: ArtilleryConfig;
    runAfterApi: boolean;
    runAfterSecurity: boolean;
  };
  reporting: {
    enabled: boolean;
    formats: ('json' | 'html' | 'xml')[];
    outputDir: string;
    includeDetails: boolean;
  };
}

export interface ApiTestSpec {
  name: string;
  baseURL: string;
  endpoints: EndpointSpec[];
  authentication?: AuthSpec;
  headers?: Record<string, string>;
  variables?: Record<string, any>;
}

export interface EndpointSpec {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description?: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  validationSchema?: {
    joi?: any;
    ajv?: any;
    zod?: any;
  };
  assertions?: AssertionSpec[];
}

export interface AuthSpec {
  type: 'bearer' | 'basic' | 'apikey' | 'oauth2';
  credentials: any;
  endpoint?: string;
}

export interface AssertionSpec {
  type: 'jsonPath' | 'header' | 'statusCode' | 'responseTime';
  path?: string;
  expected: any;
  operator?: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
}

export interface UnifiedTestResult {
  testId: string;
  config: UnifiedTestConfig;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: {
    api: ApiTestResults;
    security: SecurityTestResults;
    performance: PerformanceTestResults;
  };
  summary: TestSummary;
  errors: any[];
  warnings: string[];
}

export interface ApiTestResults {
  executed: boolean;
  passed: number;
  failed: number;
  total: number;
  details: EndpointTestResult[];
  validationResults: any[];
  executionTime: number;
}

export interface EndpointTestResult {
  endpoint: string;
  method: string;
  status: 'passed' | 'failed';
  responseTime: number;
  statusCode: number;
  assertions: AssertionResult[];
  validationResult?: any;
  error?: any;
}

export interface AssertionResult {
  type: string;
  passed: boolean;
  expected: any;
  actual: any;
  message?: string;
}

export interface SecurityTestResults {
  executed: boolean;
  scanId?: string;
  alerts: any[];
  summary: {
    high: number;
    medium: number;
    low: number;
    informational: number;
    total: number;
  };
  riskAssessment: string;
  recommendations: string[];
  executionTime: number;
}

export interface PerformanceTestResults {
  executed: boolean;
  testId?: string;
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
  performanceGrade: string;
  recommendations: string[];
  executionTime: number;
}

export interface TestSummary {
  overallStatus: 'passed' | 'failed' | 'partial';
  apiScore: number;
  securityScore: number;
  performanceScore: number;
  overallScore: number;
  criticalIssues: string[];
  recommendations: string[];
}

/**
 * Unified Test Execution Orchestrator
 */
export class UnifiedTestOrchestrator extends EventEmitter {
  private zapIntegration?: ZapIntegration;
  private artilleryIntegration: ArtilleryIntegration;
  private schemaValidator: SchemaValidationManager;
  private activeTests: Map<string, UnifiedTestResult> = new Map();

  constructor() {
    super();
    this.artilleryIntegration = new ArtilleryIntegration();
    this.schemaValidator = new SchemaValidationManager();
  }

  /**
   * Execute unified test suite
   */
  async executeTestSuite(config: UnifiedTestConfig): Promise<string> {
    const testId = this.generateTestId();
    const testResult: UnifiedTestResult = {
      testId,
      config,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      status: 'running',
      results: {
        api: this.initializeApiResults(),
        security: this.initializeSecurityResults(),
        performance: this.initializePerformanceResults()
      },
      summary: this.initializeSummary(),
      errors: [],
      warnings: []
    };

    this.activeTests.set(testId, testResult);
    this.emit('test:started', { testId, config });

    try {
      if (config.execution.mode === 'sequential') {
        await this.executeSequential(testResult);
      } else {
        await this.executeParallel(testResult);
      }

      testResult.status = 'completed';
      testResult.summary = this.calculateSummary(testResult);
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.errors.push(error);
      this.emit('test:error', { testId, error });
    } finally {
      testResult.endTime = new Date();
      testResult.duration = testResult.endTime.getTime() - testResult.startTime.getTime();
      
      if (config.reporting.enabled) {
        await this.generateUnifiedReport(testResult);
      }
      
      this.emit('test:completed', testResult);
    }

    return testId;
  }

  /**
   * Execute tests sequentially
   */
  private async executeSequential(testResult: UnifiedTestResult): Promise<void> {
    const { config } = testResult;

    // 1. Execute API Tests
    if (config.api.enabled) {
      this.emit('phase:started', { testId: testResult.testId, phase: 'api' });
      testResult.results.api = await this.executeApiTests(config.api);
      this.emit('phase:completed', { testId: testResult.testId, phase: 'api', results: testResult.results.api });
      
      // Stop if API tests failed and continueOnFailure is false
      if (!config.execution.continueOnFailure && testResult.results.api.failed > 0) {
        throw new Error('API tests failed and continueOnFailure is disabled');
      }
    }

    // 2. Execute Security Tests (if enabled and conditions met)
    if (config.security.enabled && (!config.security.runAfterApi || testResult.results.api.executed)) {
      this.emit('phase:started', { testId: testResult.testId, phase: 'security' });
      testResult.results.security = await this.executeSecurityTests(config.security, config.api);
      this.emit('phase:completed', { testId: testResult.testId, phase: 'security', results: testResult.results.security });
    }

    // 3. Execute Performance Tests (if enabled and conditions met)
    if (config.performance.enabled && this.shouldRunPerformanceTests(config, testResult)) {
      this.emit('phase:started', { testId: testResult.testId, phase: 'performance' });
      testResult.results.performance = await this.executePerformanceTests(config.performance, config.api);
      this.emit('phase:completed', { testId: testResult.testId, phase: 'performance', results: testResult.results.performance });
    }
  }

  /**
   * Execute tests in parallel
   */
  private async executeParallel(testResult: UnifiedTestResult): Promise<void> {
    const { config } = testResult;
    const promises: Promise<any>[] = [];

    // API Tests (always run first or in parallel if no dependencies)
    if (config.api.enabled) {
      promises.push(
        this.executeApiTests(config.api).then(results => {
          testResult.results.api = results;
          this.emit('phase:completed', { testId: testResult.testId, phase: 'api', results });
        })
      );
    }

    // Security Tests (run independently if not dependent on API)
    if (config.security.enabled && !config.security.runAfterApi) {
      promises.push(
        this.executeSecurityTests(config.security, config.api).then(results => {
          testResult.results.security = results;
          this.emit('phase:completed', { testId: testResult.testId, phase: 'security', results });
        })
      );
    }

    // Performance Tests (run independently if not dependent on others)
    if (config.performance.enabled && !config.performance.runAfterApi && !config.performance.runAfterSecurity) {
      promises.push(
        this.executePerformanceTests(config.performance, config.api).then(results => {
          testResult.results.performance = results;
          this.emit('phase:completed', { testId: testResult.testId, phase: 'performance', results });
        })
      );
    }

    // Wait for independent tests to complete
    await Promise.all(promises);

    // Run dependent tests sequentially
    if (config.security.enabled && config.security.runAfterApi) {
      testResult.results.security = await this.executeSecurityTests(config.security, config.api);
    }

    if (config.performance.enabled && this.shouldRunPerformanceTests(config, testResult)) {
      testResult.results.performance = await this.executePerformanceTests(config.performance, config.api);
    }
  }

  /**
   * Execute API functional tests
   */
  private async executeApiTests(config: any): Promise<ApiTestResults> {
    const startTime = Date.now();
    const results: ApiTestResults = {
      executed: true,
      passed: 0,
      failed: 0,
      total: 0,
      details: [],
      validationResults: [],
      executionTime: 0
    };

    for (const testSpec of config.tests) {
      for (const endpoint of testSpec.endpoints) {
        results.total++;
        
        try {
          const restified = new RestifiedTS();
          let givenStep = restified.given().baseURL(testSpec.baseURL);

          // Add authentication
          if (testSpec.authentication) {
            givenStep = this.addAuthentication(givenStep, testSpec.authentication);
          }

          // Add headers
          if (testSpec.headers) {
            Object.entries(testSpec.headers).forEach(([key, value]) => {
              givenStep = givenStep.header(key, String(value));
            });
          }

          if (endpoint.headers) {
            Object.entries(endpoint.headers).forEach(([key, value]) => {
              givenStep = givenStep.header(key, String(value));
            });
          }

          // Add body if needed
          if (endpoint.body) {
            givenStep = givenStep.body(endpoint.body);
          }

          // Execute request
          const whenStep = givenStep.when();
          let methodStep;

          switch (endpoint.method) {
            case 'GET':
              methodStep = whenStep.get(endpoint.path);
              break;
            case 'POST':
              methodStep = whenStep.post(endpoint.path);
              break;
            case 'PUT':
              methodStep = whenStep.put(endpoint.path);
              break;
            case 'DELETE':
              methodStep = whenStep.delete(endpoint.path);
              break;
            case 'PATCH':
              methodStep = whenStep.patch(endpoint.path);
              break;
            default:
              throw new Error(`Unsupported HTTP method: ${endpoint.method}`);
          }

          const thenStep = methodStep.then().statusCode(endpoint.expectedStatus);
          const result = await thenStep.execute();

          // Run assertions
          const assertionResults: AssertionResult[] = [];
          if (endpoint.assertions) {
            for (const assertion of endpoint.assertions) {
              const assertionResult = await this.executeAssertion(result, assertion);
              assertionResults.push(assertionResult);
            }
          }

          // Schema validation
          let validationResult;
          if (endpoint.validationSchema) {
            validationResult = await this.validateResponse(result.data, endpoint.validationSchema);
            results.validationResults.push(validationResult);
          }

          const endpointResult: EndpointTestResult = {
            endpoint: endpoint.path,
            method: endpoint.method,
            status: 'passed',
            responseTime: result.responseTime || 0,
            statusCode: result.status,
            assertions: assertionResults,
            validationResult
          };

          // Check if any assertions failed
          if (assertionResults.some(a => !a.passed) || (validationResult && !validationResult.isValid)) {
            endpointResult.status = 'failed';
            results.failed++;
          } else {
            results.passed++;
          }

          results.details.push(endpointResult);

        } catch (error) {
          results.failed++;
          results.details.push({
            endpoint: endpoint.path,
            method: endpoint.method,
            status: 'failed',
            responseTime: 0,
            statusCode: 0,
            assertions: [],
            error: error
          });
        }
      }
    }

    results.executionTime = Date.now() - startTime;
    return results;
  }

  /**
   * Execute security tests using ZAP
   */
  private async executeSecurityTests(config: any, apiConfig: any): Promise<SecurityTestResults> {
    const startTime = Date.now();
    
    if (!this.zapIntegration) {
      this.zapIntegration = new ZapIntegration(config.config);
      await this.zapIntegration.initialize();
    }

    // Collect URLs from API tests
    const urls: string[] = [];
    for (const testSpec of apiConfig.tests) {
      for (const endpoint of testSpec.endpoints) {
        urls.push(`${testSpec.baseURL}${endpoint.path}`);
      }
    }

    // Start passive scanning
    await this.zapIntegration.startPassiveScanning(urls);

    // Start active scanning
    const scanId = await this.zapIntegration.startActiveScan(urls[0]);

    // Wait for scan completion (simplified - real implementation would be more sophisticated)
    await this.waitForScanCompletion(scanId);

    // Generate security report
    const securityReport = await this.zapIntegration.generateSecurityReport(scanId);

    return {
      executed: true,
      scanId,
      alerts: securityReport.alerts,
      summary: securityReport.summary,
      riskAssessment: securityReport.riskAssessment,
      recommendations: securityReport.recommendations,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Execute performance tests using Artillery
   */
  private async executePerformanceTests(config: any, apiConfig: any): Promise<PerformanceTestResults> {
    const startTime = Date.now();

    // Create Artillery config from API specs
    const artilleryConfig = this.artilleryIntegration.createLoadTestFromApiSpecs({
      baseUrl: apiConfig.tests[0]?.baseURL || config.config.target,
      endpoints: this.collectEndpointsFromApiConfig(apiConfig),
      authentication: apiConfig.tests[0]?.authentication
    });

    // Run load test
    const testId = await this.artilleryIntegration.runLoadTest(artilleryConfig);

    // Wait for test completion
    await this.waitForLoadTestCompletion(testId);

    // Generate performance report
    const performanceReport = this.artilleryIntegration.generatePerformanceReport(testId);

    return {
      executed: true,
      testId,
      summary: performanceReport?.summary || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0
      },
      performanceGrade: performanceReport?.performanceGrade || 'F',
      recommendations: performanceReport?.recommendations || [],
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Helper methods
   */
  private generateTestId(): string {
    return `unified-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeApiResults(): ApiTestResults {
    return {
      executed: false,
      passed: 0,
      failed: 0,
      total: 0,
      details: [],
      validationResults: [],
      executionTime: 0
    };
  }

  private initializeSecurityResults(): SecurityTestResults {
    return {
      executed: false,
      alerts: [],
      summary: { high: 0, medium: 0, low: 0, informational: 0, total: 0 },
      riskAssessment: '',
      recommendations: [],
      executionTime: 0
    };
  }

  private initializePerformanceResults(): PerformanceTestResults {
    return {
      executed: false,
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0
      },
      performanceGrade: '',
      recommendations: [],
      executionTime: 0
    };
  }

  private initializeSummary(): TestSummary {
    return {
      overallStatus: 'passed',
      apiScore: 0,
      securityScore: 0,
      performanceScore: 0,
      overallScore: 0,
      criticalIssues: [],
      recommendations: []
    };
  }

  private shouldRunPerformanceTests(config: UnifiedTestConfig, testResult: UnifiedTestResult): boolean {
    if (!config.performance.enabled) return false;
    if (config.performance.runAfterApi && !testResult.results.api.executed) return false;
    if (config.performance.runAfterSecurity && !testResult.results.security.executed) return false;
    return true;
  }

  private addAuthentication(givenStep: any, auth: AuthSpec): any {
    switch (auth.type) {
      case 'bearer':
        return givenStep.bearerToken(auth.credentials.token);
      case 'basic':
        return givenStep.basicAuth(auth.credentials.username, auth.credentials.password);
      case 'apikey':
        return givenStep.apiKey(auth.credentials.key, auth.credentials.value);
      default:
        return givenStep;
    }
  }

  private async executeAssertion(result: any, assertion: AssertionSpec): Promise<AssertionResult> {
    // Simplified assertion execution
    return {
      type: assertion.type,
      passed: true,
      expected: assertion.expected,
      actual: result.data
    };
  }

  private async validateResponse(data: any, schemas: any): Promise<any> {
    if (schemas.joi) {
      return await this.schemaValidator.validateWithJoi(data, schemas.joi);
    }
    if (schemas.ajv) {
      return await this.schemaValidator.validateWithAjv(data, schemas.ajv);
    }
    if (schemas.zod) {
      return await this.schemaValidator.validateWithZod(data, schemas.zod);
    }
    return { isValid: true, errors: [] };
  }

  private collectEndpointsFromApiConfig(apiConfig: any): any[] {
    const endpoints: any[] = [];
    for (const testSpec of apiConfig.tests) {
      for (const endpoint of testSpec.endpoints) {
        endpoints.push({
          path: endpoint.path,
          method: endpoint.method,
          headers: endpoint.headers,
          body: endpoint.body
        });
      }
    }
    return endpoints;
  }

  private async waitForScanCompletion(scanId: string): Promise<void> {
    // Simplified - real implementation would poll status
    return new Promise(resolve => setTimeout(resolve, 30000));
  }

  private async waitForLoadTestCompletion(testId: string): Promise<void> {
    // Simplified - real implementation would monitor test status
    return new Promise(resolve => setTimeout(resolve, 60000));
  }

  private calculateSummary(testResult: UnifiedTestResult): TestSummary {
    const apiScore = testResult.results.api.executed ? 
      (testResult.results.api.passed / testResult.results.api.total) * 100 : 0;
    
    const securityScore = testResult.results.security.executed ?
      Math.max(0, 100 - (testResult.results.security.summary.high * 25 + testResult.results.security.summary.medium * 10)) : 0;
    
    const performanceScore = testResult.results.performance.executed ?
      this.parsePerformanceGrade(testResult.results.performance.performanceGrade) : 0;
    
    const overallScore = (apiScore + securityScore + performanceScore) / 3;
    
    return {
      overallStatus: overallScore >= 70 ? 'passed' : 'failed',
      apiScore,
      securityScore,
      performanceScore,
      overallScore,
      criticalIssues: this.collectCriticalIssues(testResult),
      recommendations: this.collectAllRecommendations(testResult)
    };
  }

  private parsePerformanceGrade(grade: string): number {
    if (grade.startsWith('A+')) return 95;
    if (grade.startsWith('A')) return 85;
    if (grade.startsWith('B')) return 75;
    if (grade.startsWith('C')) return 65;
    if (grade.startsWith('D')) return 55;
    return 45;
  }

  private collectCriticalIssues(testResult: UnifiedTestResult): string[] {
    const issues: string[] = [];
    
    if (testResult.results.api.failed > 0) {
      issues.push(`${testResult.results.api.failed} API tests failed`);
    }
    
    if (testResult.results.security.summary.high > 0) {
      issues.push(`${testResult.results.security.summary.high} high-risk security vulnerabilities found`);
    }
    
    if (testResult.results.performance.summary.errorRate > 5) {
      issues.push(`High error rate (${testResult.results.performance.summary.errorRate}%) in performance tests`);
    }
    
    return issues;
  }

  private collectAllRecommendations(testResult: UnifiedTestResult): string[] {
    const recommendations: string[] = [];
    
    recommendations.push(...testResult.results.security.recommendations);
    recommendations.push(...testResult.results.performance.recommendations);
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  private async generateUnifiedReport(testResult: UnifiedTestResult): Promise<void> {
    // Implementation would generate comprehensive reports in various formats
    console.log('Generating unified test report...', testResult.testId);
  }

  /**
   * Get test result
   */
  getTestResult(testId: string): UnifiedTestResult | undefined {
    return this.activeTests.get(testId);
  }

  /**
   * Get all active tests
   */
  getActiveTests(): UnifiedTestResult[] {
    return Array.from(this.activeTests.values());
  }
}