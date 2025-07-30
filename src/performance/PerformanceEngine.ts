/**
 * Unified Performance Testing Engine for RestifiedTS
 * 
 * Provides a unified interface for multiple performance testing backends:
 * - K6 Integration (modern, JavaScript-based, cloud-ready)
 * - Artillery Integration (Node.js-based, flexible)
 * - Auto-detection and fallback capabilities
 */

import { EventEmitter } from 'events';
import { K6Integration, K6Config, K6TestResult } from './K6Integration';
import { ArtilleryIntegration, ArtilleryConfig, LoadTestResult } from './ArtilleryIntegration';
import { K6FakerScenario, K6UserJourney } from './K6FakerIntegration';

export type PerformanceEngineType = 'k6' | 'artillery' | 'auto';

export interface UnifiedTestConfig {
  name: string;
  engine?: PerformanceEngineType;
  baseUrl: string;
  endpoints: Array<{
    path: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
    expectedStatus?: number;
  }>;
  authentication?: {
    type: 'bearer' | 'basic' | 'oauth2';
    credentials: any;
  };
  scenarios: {
    smoke?: boolean;
    load?: boolean;
    stress?: boolean;
    spike?: boolean;
    soak?: boolean;
  };
  thresholds?: {
    responseTime?: number;
    errorRate?: number;
    throughput?: number;
  };
  duration?: string;
  users?: number;
  rampUp?: string;
}

export interface UnifiedTestResult {
  testId: string;
  engine: PerformanceEngineType;
  config: UnifiedTestConfig;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    maxResponseTime: number;
    minResponseTime: number;
  };
  thresholds: {
    passed: boolean;
    results: Record<string, { passed: boolean; value: any; threshold: any }>;
  };
  recommendations: string[];
  grade: string;
  duration: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  rawResults: K6TestResult | LoadTestResult;
}

/**
 * Unified Performance Testing Engine
 */
export class PerformanceEngine extends EventEmitter {
  private k6Integration: K6Integration;
  private artilleryIntegration: ArtilleryIntegration;
  private availableEngines: PerformanceEngineType[] = [];

  constructor(options: {
    tempDir?: string;
    k6Binary?: string;
  } = {}) {
    super();
    
    this.k6Integration = new K6Integration({
      tempDir: options.tempDir ? `${options.tempDir}/k6` : undefined,
      k6Binary: options.k6Binary
    });
    
    this.artilleryIntegration = new ArtilleryIntegration(
      options.tempDir ? `${options.tempDir}/artillery` : undefined
    );

    // Forward events from underlying engines
    this.setupEventForwarding();
    
    // Initialize available engines
    this.initializeEngines();
  }

  /**
   * Setup event forwarding from underlying engines
   */
  private setupEventForwarding(): void {
    // K6 events
    this.k6Integration.on('test:progress', (data) => {
      this.emit('test:progress', { ...data, engine: 'k6' });
    });
    this.k6Integration.on('test:completed', (data) => {
      this.emit('test:completed', { ...data, engine: 'k6' });
    });
    this.k6Integration.on('test:failed', (data) => {
      this.emit('test:failed', { ...data, engine: 'k6' });
    });

    // Artillery events
    this.artilleryIntegration.on('test:progress', (data) => {
      this.emit('test:progress', { ...data, engine: 'artillery' });
    });
    this.artilleryIntegration.on('test:completed', (data) => {
      this.emit('test:completed', { ...data, engine: 'artillery' });
    });
    this.artilleryIntegration.on('test:failed', (data) => {
      this.emit('test:failed', { ...data, engine: 'artillery' });
    });
  }

  /**
   * Initialize and detect available engines
   */
  private async initializeEngines(): Promise<void> {
    // Check K6 availability
    const k6Available = await this.k6Integration.checkK6Availability();
    if (k6Available) {
      this.availableEngines.push('k6');
    }

    // Artillery is always available (uses spawn with fallback)
    this.availableEngines.push('artillery');

    if (this.availableEngines.length === 0) {
      console.warn('[PerformanceEngine] No performance testing engines available');
    } else {
      console.log(`[PerformanceEngine] Available engines: ${this.availableEngines.join(', ')}`);
    }
  }

  /**
   * Determine which engine to use based on configuration and availability
   */
  private selectEngine(preferredEngine?: PerformanceEngineType): PerformanceEngineType {
    if (preferredEngine === 'auto' || !preferredEngine) {
      // Prefer K6 if available, fallback to Artillery
      return this.availableEngines.includes('k6') ? 'k6' : 'artillery';
    }

    if (this.availableEngines.includes(preferredEngine)) {
      return preferredEngine;
    }

    // Fallback to available engine
    console.warn(`[PerformanceEngine] Requested engine '${preferredEngine}' not available, using fallback`);
    return this.availableEngines[0] || 'artillery';
  }

  /**
   * Run performance test with unified interface
   */
  async runPerformanceTest(config: UnifiedTestConfig): Promise<string> {
    const engine = this.selectEngine(config.engine);
    console.log(`[PerformanceEngine] Running test '${config.name}' with ${engine} engine`);

    switch (engine) {
      case 'k6':
        return await this.runK6Test(config);
      
      case 'artillery':
        return await this.runArtilleryTest(config);
      
      default:
        throw new Error(`Unsupported engine: ${engine}`);
    }
  }

  /**
   * Run test with K6 engine
   */
  private async runK6Test(config: UnifiedTestConfig): Promise<string> {
    // Convert unified config to K6 test script
    const testScript = this.k6Integration.convertRestifiedTestToK6TypeScript({
      name: config.name,
      baseUrl: config.baseUrl,
      endpoints: config.endpoints,
      authentication: config.authentication
    });

    // Create K6 configuration based on scenarios
    let k6Config: K6Config;
    const scenarios = this.k6Integration.createLoadTestScenarios();

    if (config.scenarios.smoke) {
      k6Config = scenarios.smoke;
    } else if (config.scenarios.stress) {
      k6Config = scenarios.stress;
    } else if (config.scenarios.spike) {
      k6Config = scenarios.spike;
    } else if (config.scenarios.soak) {
      k6Config = scenarios.soak;
    } else {
      k6Config = scenarios.load; // Default to load test
    }

    // Apply custom thresholds if specified
    if (config.thresholds) {
      k6Config.thresholds = {
        http_req_duration: config.thresholds.responseTime ? 
          [{ threshold: `p(95)<${config.thresholds.responseTime}` }] : 
          k6Config.thresholds?.http_req_duration || [],
        http_req_failed: config.thresholds.errorRate ? 
          [{ threshold: `rate<${config.thresholds.errorRate}` }] : 
          k6Config.thresholds?.http_req_failed || []
      };
    }

    return await this.k6Integration.runK6Test(testScript, k6Config);
  }

  /**
   * Run test with Artillery engine
   */
  private async runArtilleryTest(config: UnifiedTestConfig): Promise<string> {
    // Convert unified config to Artillery configuration
    const artilleryConfig = this.artilleryIntegration.createLoadTestFromApiSpecs({
      baseUrl: config.baseUrl,
      endpoints: config.endpoints,
      authentication: config.authentication
    });

    // Modify phases based on scenarios
    if (config.scenarios.stress) {
      artilleryConfig.phases = [
        { name: 'warmup', duration: 60, arrivalRate: 1, rampTo: 5 },
        { name: 'ramp-up', duration: 120, arrivalRate: 5, rampTo: 50 },
        { name: 'sustain', duration: 300, arrivalRate: 50 },
        { name: 'ramp-down', duration: 60, arrivalRate: 50, rampTo: 1 }
      ];
    } else if (config.scenarios.spike) {
      artilleryConfig.phases = [
        { name: 'baseline', duration: 60, arrivalRate: 5 },
        { name: 'spike', duration: 30, arrivalRate: 100 },
        { name: 'recovery', duration: 60, arrivalRate: 5 }
      ];
    }

    return await this.artilleryIntegration.runLoadTest(artilleryConfig);
  }

  /**
   * Get unified test result
   */
  async getUnifiedTestResult(testId: string): Promise<UnifiedTestResult | null> {
    // Try to get result from K6 first
    const k6Result = this.k6Integration.getTestResult(testId);
    if (k6Result) {
      return this.convertK6ResultToUnified(k6Result);
    }

    // Try Artillery
    const artilleryResult = this.artilleryIntegration.getTestResult(testId);
    if (artilleryResult) {
      return this.convertArtilleryResultToUnified(artilleryResult);
    }

    return null;
  }

  /**
   * Convert K6 result to unified format
   */
  private convertK6ResultToUnified(k6Result: K6TestResult): UnifiedTestResult {
    const metrics = k6Result.metrics;
    
    return {
      testId: k6Result.testId,
      engine: 'k6',
      config: {} as UnifiedTestConfig, // Would need to store original config
      metrics: {
        totalRequests: metrics.http_reqs?.values.count || 0,
        successfulRequests: Math.floor((metrics.http_reqs?.values.count || 0) * (1 - (metrics.http_req_failed?.values.rate || 0))),
        failedRequests: Math.floor((metrics.http_reqs?.values.count || 0) * (metrics.http_req_failed?.values.rate || 0)),
        averageResponseTime: metrics.http_req_duration?.values.avg || 0,
        p95ResponseTime: metrics.http_req_duration?.values['p(95)'] || 0,
        p99ResponseTime: metrics.http_req_duration?.values['p(99)'] || 0,
        requestsPerSecond: metrics.http_reqs?.values.rate || 0,
        errorRate: metrics.http_req_failed?.values.rate || 0,
        maxResponseTime: metrics.http_req_duration?.values.max || 0,
        minResponseTime: metrics.http_req_duration?.values.min || 0
      },
      thresholds: {
        passed: Object.values(k6Result.thresholds).every(t => t.ok),
        results: Object.entries(k6Result.thresholds).reduce((acc, [key, value]) => {
          acc[key] = { passed: value.ok, value: value.okCount, threshold: value.failureCount };
          return acc;
        }, {} as any)
      },
      recommendations: [], // Would be generated based on metrics
      grade: 'N/A', // Would be calculated
      duration: k6Result.duration,
      status: k6Result.status === 'aborted' ? 'cancelled' : k6Result.status,
      rawResults: k6Result
    };
  }

  /**
   * Convert Artillery result to unified format
   */
  private convertArtilleryResultToUnified(artilleryResult: LoadTestResult): UnifiedTestResult {
    const aggregate = artilleryResult.results.aggregate;
    
    return {
      testId: artilleryResult.testId,
      engine: 'artillery',
      config: {} as UnifiedTestConfig, // Would need to store original config
      metrics: {
        totalRequests: aggregate.counters['http.requests'] || 0,
        successfulRequests: aggregate.counters['http.responses'] || 0,
        failedRequests: (aggregate.counters['http.requests'] || 0) - (aggregate.counters['http.responses'] || 0),
        averageResponseTime: aggregate.summaries['http.response_time']?.mean || 0,
        p95ResponseTime: aggregate.summaries['http.response_time']?.p95 || 0,
        p99ResponseTime: aggregate.summaries['http.response_time']?.p99 || 0,
        requestsPerSecond: aggregate.rates['http.request_rate'] || 0,
        errorRate: 0, // Would need to calculate
        maxResponseTime: aggregate.summaries['http.response_time']?.max || 0,
        minResponseTime: aggregate.summaries['http.response_time']?.min || 0
      },
      thresholds: {
        passed: true, // Would need threshold evaluation
        results: {}
      },
      recommendations: [], // Would be generated
      grade: 'N/A', // Would be calculated
      duration: artilleryResult.duration,
      status: artilleryResult.status,
      rawResults: artilleryResult
    };
  }

  /**
   * Generate comprehensive performance report
   */
  async generateUnifiedReport(testId: string): Promise<{
    summary: UnifiedTestResult;
    analysis: {
      performanceScore: number;
      bottlenecks: string[];
      scalabilityAssessment: string;
      recommendations: string[];
    };
    trends: {
      responseTimeOverTime: Array<{ timestamp: number; value: number }>;
      throughputOverTime: Array<{ timestamp: number; value: number }>;
      errorRateOverTime: Array<{ timestamp: number; value: number }>;
    };
  } | null> {
    const result = await this.getUnifiedTestResult(testId);
    if (!result) return null;

    // Generate analysis based on metrics
    const performanceScore = this.calculatePerformanceScore(result.metrics);
    const bottlenecks = this.identifyBottlenecks(result.metrics);
    const scalabilityAssessment = this.assessScalability(result.metrics);
    const recommendations = this.generateRecommendations(result.metrics);

    return {
      summary: result,
      analysis: {
        performanceScore,
        bottlenecks,
        scalabilityAssessment,
        recommendations
      },
      trends: {
        responseTimeOverTime: [], // Would be extracted from raw results
        throughputOverTime: [],
        errorRateOverTime: []
      }
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(metrics: UnifiedTestResult['metrics']): number {
    let score = 100;

    // Penalize high error rates
    score -= metrics.errorRate * 100;

    // Penalize slow response times
    if (metrics.p95ResponseTime > 5000) score -= 40;
    else if (metrics.p95ResponseTime > 2000) score -= 20;
    else if (metrics.p95ResponseTime > 1000) score -= 10;

    // Penalize low throughput
    if (metrics.requestsPerSecond < 5) score -= 30;
    else if (metrics.requestsPerSecond < 10) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(metrics: UnifiedTestResult['metrics']): string[] {
    const bottlenecks: string[] = [];

    if (metrics.errorRate > 0.05) {
      bottlenecks.push('High error rate indicates server-side issues');
    }

    if (metrics.p95ResponseTime > 3000) {
      bottlenecks.push('Slow response times in 95th percentile');
    }

    if (metrics.requestsPerSecond < 10) {
      bottlenecks.push('Low throughput suggests capacity limitations');
    }

    return bottlenecks;
  }

  /**
   * Assess scalability
   */
  private assessScalability(metrics: UnifiedTestResult['metrics']): string {
    if (metrics.errorRate < 0.01 && metrics.p95ResponseTime < 1000 && metrics.requestsPerSecond > 50) {
      return 'Excellent scalability - system handles load well';
    } else if (metrics.errorRate < 0.05 && metrics.p95ResponseTime < 2000 && metrics.requestsPerSecond > 20) {
      return 'Good scalability - minor optimizations recommended';
    } else if (metrics.errorRate < 0.1 && metrics.p95ResponseTime < 5000) {
      return 'Moderate scalability - significant optimizations needed';
    } else {
      return 'Poor scalability - major performance issues detected';
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: UnifiedTestResult['metrics']): string[] {
    const recommendations: string[] = [];

    if (metrics.errorRate > 0.01) {
      recommendations.push('Investigate and fix errors causing high failure rate');
    }

    if (metrics.p95ResponseTime > 2000) {
      recommendations.push('Optimize slow endpoints and consider caching strategies');
    }

    if (metrics.requestsPerSecond < 20) {
      recommendations.push('Consider horizontal scaling or server optimization');
    }

    if (metrics.averageResponseTime > 1000) {
      recommendations.push('Profile application for performance bottlenecks');
    }

    return recommendations;
  }

  /**
   * Get available engines
   */
  getAvailableEngines(): PerformanceEngineType[] {
    return [...this.availableEngines];
  }

  /**
   * Run faker-powered performance test
   */
  async runFakerTest(config: {
    baseUrl: string;
    scenarios: K6FakerScenario[];
    users?: number;
    duration?: string;
    engine?: PerformanceEngineType;
  }): Promise<string> {
    const engine = this.selectEngine(config.engine);
    
    if (engine === 'k6') {
      const k6Config: K6Config = {
        scenarios: {
          faker_test: {
            executor: 'ramping-vus',
            stages: [
              { duration: '30s', target: config.users || 10 },
              { duration: config.duration || '2m', target: config.users || 10 },
              { duration: '30s', target: 0 }
            ]
          }
        },
        thresholds: {
          http_req_duration: [{ threshold: 'p(95)<2000' }],
          http_req_failed: [{ threshold: 'rate<0.01' }],
          faker_errors: [{ threshold: 'rate<0.005' }]
        }
      };

      return await this.k6Integration.runK6FakerTest(config.scenarios, k6Config, {
        baseUrl: config.baseUrl,
        users: config.users,
        duration: config.duration
      });
    } else {
      throw new Error('Faker tests currently only supported with K6 engine');
    }
  }

  /**
   * Generate realistic e-commerce test
   */
  generateEcommerceTest(baseUrl: string): { script: string; config: K6Config } {
    return this.k6Integration.createEcommerceScenario(baseUrl);
  }

  /**
   * Get available faker data providers
   */
  getFakerProviders(): Record<string, string[]> {
    return this.k6Integration.getFakerProviders();
  }

  /**
   * Generate user journey test
   */
  generateUserJourneyTest(journey: K6UserJourney, baseUrl: string): string {
    return this.k6Integration.generateUserJourneyTest(journey, baseUrl);
  }

  /**
   * Get engine status
   */
  async getEngineStatus(): Promise<{
    k6: { available: boolean; version?: string };
    artillery: { available: boolean; version?: string };
  }> {
    const k6Available = await this.k6Integration.checkK6Availability();
    
    return {
      k6: { available: k6Available },
      artillery: { available: true } // Artillery is always available
    };
  }
}