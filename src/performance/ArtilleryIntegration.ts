/**
 * Artillery Integration for RestifiedTS
 * 
 * Provides load testing capabilities including:
 * - Load testing existing API endpoints
 * - Rate limiting validation
 * - Authentication stress testing
 * - Custom performance scenarios
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ArtilleryConfig {
  target: string;
  phases: LoadPhase[];
  scenarios: LoadScenario[];
  config?: ArtilleryEngineConfig;
  plugins?: ArtilleryPlugin[];
  variables?: Record<string, any>;
  functions?: Record<string, string>;
}

export interface LoadPhase {
  name: string;
  duration: number;
  arrivalRate?: number;
  arrivalCount?: number;
  rampTo?: number;
  weight?: number;
}

export interface LoadScenario {
  name: string;
  weight: number;
  flow: LoadStep[];
}

export interface LoadStep {
  type: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'think' | 'loop' | 'log';
  url?: string;
  method?: string;
  json?: any;
  form?: any;
  headers?: Record<string, string>;
  capture?: CaptureRule[];
  expect?: ExpectationRule[];
  think?: number;
  count?: number;
  over?: string;
}

export interface CaptureRule {
  json: string;
  as: string;
}

export interface ExpectationRule {
  statusCode?: number;
  contentType?: string;
  hasProperty?: string;
  equals?: any;
}

export interface ArtilleryEngineConfig {
  http?: {
    timeout: number;
    maxSockets: number;
  };
  ws?: {
    timeout: number;
  };
  socketio?: {
    timeout: number;
  };
}

export interface ArtilleryPlugin {
  name: string;
  config?: any;
}

export interface LoadTestResult {
  testId: string;
  config: ArtilleryConfig;
  results: {
    aggregate: AggregateStats;
    intermediate: IntermediateStats[];
    phases: PhaseStats[];
  };
  errors: any[];
  warnings: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface AggregateStats {
  counters: Record<string, number>;
  rates: Record<string, number>;
  summaries: Record<string, StatsSummary>;
  histograms: Record<string, StatsHistogram>;
}

export interface IntermediateStats {
  timestamp: string;
  counters: Record<string, number>;
  rates: Record<string, number>;
  summaries: Record<string, StatsSummary>;
  histograms: Record<string, StatsHistogram>;
}

export interface PhaseStats {
  phase: string;
  duration: number;
  counters: Record<string, number>;
  rates: Record<string, number>;
  summaries: Record<string, StatsSummary>;
}

export interface StatsSummary {
  min: number;
  max: number;
  count: number;
  mean: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface StatsHistogram {
  min: number;
  max: number;
  count: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

/**
 * Artillery Load Testing Integration
 */
export class ArtilleryIntegration extends EventEmitter {
  private activeTests: Map<string, LoadTestResult> = new Map();
  private tempDir: string;

  constructor(tempDir: string = './output/temp/artillery') {
    super();
    this.tempDir = tempDir;
    this.ensureTempDir();
  }

  /**
   * Ensure temporary directory exists
   */
  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Create load test from API test specifications
   */
  createLoadTestFromApiSpecs(apiSpecs: {
    baseUrl: string;
    endpoints: Array<{
      path: string;
      method: string;
      headers?: Record<string, string>;
      body?: any;
      auth?: any;
    }>;
    authentication?: {
      type: 'bearer' | 'basic' | 'oauth2';
      credentials: any;
    };
  }): ArtilleryConfig {
    const scenarios: LoadScenario[] = [];

    // Create scenarios for each endpoint
    apiSpecs.endpoints.forEach((endpoint, index) => {
      const flow: LoadStep[] = [];

      // Add authentication if needed
      if (apiSpecs.authentication) {
        flow.push(this.createAuthStep(apiSpecs.authentication));
      }

      // Add the main request
      flow.push({
        type: endpoint.method.toLowerCase() as any,
        url: endpoint.path,
        headers: endpoint.headers,
        json: endpoint.method !== 'GET' ? endpoint.body : undefined,
        expect: [
          { statusCode: 200 },
          { contentType: 'application/json' }
        ]
      });

      scenarios.push({
        name: `${endpoint.method} ${endpoint.path}`,
        weight: Math.floor(100 / apiSpecs.endpoints.length),
        flow
      });
    });

    return {
      target: apiSpecs.baseUrl,
      phases: [
        {
          name: 'warmup',
          duration: 60,
          arrivalRate: 1,
          rampTo: 5
        },
        {
          name: 'ramp-up',
          duration: 120,
          arrivalRate: 5,
          rampTo: 20
        },
        {
          name: 'sustain',
          duration: 300,
          arrivalRate: 20
        },
        {
          name: 'ramp-down',
          duration: 60,
          arrivalRate: 20,
          rampTo: 1
        }
      ],
      scenarios,
      config: {
        http: {
          timeout: 30,
          maxSockets: 50
        }
      }
    };
  }

  /**
   * Create authentication step
   */
  private createAuthStep(auth: any): LoadStep {
    switch (auth.type) {
      case 'bearer':
        return {
          type: 'post',
          url: '/auth/login',
          json: auth.credentials,
          capture: [
            { json: '$.token', as: 'authToken' }
          ]
        };
      case 'basic':
        return {
          type: 'get',
          url: '/auth/basic',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${auth.credentials.username}:${auth.credentials.password}`).toString('base64')}`
          }
        };
      default:
        return {
          type: 'get',
          url: '/health'
        };
    }
  }

  /**
   * Create rate limiting test scenario
   */
  createRateLimitingTest(config: {
    targetUrl: string;
    endpoint: string;
    rateLimit: number;
    timeWindow: number;
    testDuration: number;
  }): ArtilleryConfig {
    const arrivalRate = Math.ceil(config.rateLimit * 1.5); // 50% over limit

    return {
      target: config.targetUrl,
      phases: [
        {
          name: 'rate-limit-test',
          duration: config.testDuration,
          arrivalRate
        }
      ],
      scenarios: [
        {
          name: 'Rate Limit Test',
          weight: 100,
          flow: [
            {
              type: 'get',
              url: config.endpoint,
              expect: [
                // Expect either success or rate limit
                { statusCode: 200 },
                { statusCode: 429 }
              ]
            }
          ]
        }
      ],
      config: {
        http: {
          timeout: 10,
          maxSockets: 100
        }
      }
    };
  }

  /**
   * Create authentication stress test
   */
  createAuthStressTest(config: {
    targetUrl: string;
    authEndpoint: string;
    credentials: Array<{ username: string; password: string }>;
    concurrentUsers: number;
    testDuration: number;
  }): ArtilleryConfig {
    return {
      target: config.targetUrl,
      phases: [
        {
          name: 'auth-stress-test',
          duration: config.testDuration,
          arrivalRate: config.concurrentUsers
        }
      ],
      scenarios: [
        {
          name: 'Authentication Stress Test',
          weight: 100,
          flow: [
            {
              type: 'post',
              url: config.authEndpoint,
              json: {
                username: '{{ $randomString() }}@test.com',
                password: '{{ $randomString() }}'
              },
              expect: [
                { statusCode: 200 },
                { statusCode: 401 },
                { statusCode: 422 }
              ]
            },
            {
              type: 'think',
              think: 1
            }
          ]
        }
      ],
      variables: {
        credentials: config.credentials
      }
    };
  }

  /**
   * Run load test
   */
  async runLoadTest(config: ArtilleryConfig): Promise<string> {
    const testId = uuidv4();
    const configPath = path.join(this.tempDir, `${testId}.yml`);
    const resultsPath = path.join(this.tempDir, `${testId}-results.json`);

    // Write Artillery config to file
    const yamlContent = this.convertConfigToYaml(config);
    fs.writeFileSync(configPath, yamlContent);

    // Initialize test result
    const testResult: LoadTestResult = {
      testId,
      config,
      results: {
        aggregate: {} as AggregateStats,
        intermediate: [],
        phases: []
      },
      errors: [],
      warnings: [],
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      status: 'running'
    };

    this.activeTests.set(testId, testResult);

    // Run Artillery
    const artilleryProcess = spawn('artillery', [
      'run',
      '--output',
      resultsPath,
      configPath
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    // Handle Artillery output
    artilleryProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.parseIntermediateResults(testId, output);
      this.emit('test:progress', { testId, output });
    });

    artilleryProcess.stderr.on('data', (data) => {
      const error = data.toString();
      testResult.errors.push(error);
      this.emit('test:error', { testId, error });
    });

    artilleryProcess.on('close', async (code) => {
      testResult.endTime = new Date();
      testResult.duration = testResult.endTime.getTime() - testResult.startTime.getTime();
      
      if (code === 0) {
        testResult.status = 'completed';
        // Parse final results
        if (fs.existsSync(resultsPath)) {
          const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
          testResult.results.aggregate = results.aggregate;
        }
        this.emit('test:completed', testResult);
      } else {
        testResult.status = 'failed';
        this.emit('test:failed', { testId, code });
      }

      // Cleanup temp files
      this.cleanupTempFiles(testId);
    });

    return testId;
  }

  /**
   * Parse intermediate results from Artillery output
   */
  private parseIntermediateResults(testId: string, output: string): void {
    const testResult = this.activeTests.get(testId);
    if (!testResult) return;

    // Look for intermediate stats in output
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('Summary report')) {
        // Extract stats from summary line
        // This is a simplified parser - real implementation would be more robust
        const statsMatch = line.match(/(\d+) responses?/);
        if (statsMatch) {
          const timestamp = new Date().toISOString();
          const intermediateStats: IntermediateStats = {
            timestamp,
            counters: { 'http.responses': parseInt(statsMatch[1]) },
            rates: {},
            summaries: {},
            histograms: {}
          };
          testResult.results.intermediate.push(intermediateStats);
        }
      }
    }
  }

  /**
   * Convert Artillery config to YAML
   */
  private convertConfigToYaml(config: ArtilleryConfig): string {
    let yaml = `config:
  target: ${config.target}
`;

    if (config.config?.http) {
      yaml += `  http:
    timeout: ${config.config.http.timeout}
    maxSockets: ${config.config.http.maxSockets}
`;
    }

    if (config.variables) {
      yaml += `  variables:
`;
      Object.entries(config.variables).forEach(([key, value]) => {
        yaml += `    ${key}: ${JSON.stringify(value)}
`;
      });
    }

    yaml += `  phases:
`;
    config.phases.forEach(phase => {
      yaml += `    - name: ${phase.name}
      duration: ${phase.duration}
      arrivalRate: ${phase.arrivalRate || 1}
`;
      if (phase.rampTo) {
        yaml += `      rampTo: ${phase.rampTo}
`;
      }
    });

    yaml += `scenarios:
`;
    config.scenarios.forEach(scenario => {
      yaml += `  - name: "${scenario.name}"
    weight: ${scenario.weight}
    flow:
`;
      scenario.flow.forEach(step => {
        yaml += `      - ${step.type}:
`;
        if (step.url) {
          yaml += `          url: "${step.url}"
`;
        }
        if (step.json) {
          yaml += `          json:
`;
          yaml += this.objectToYaml(step.json, 12);
        }
        if (step.headers) {
          yaml += `          headers:
`;
          Object.entries(step.headers).forEach(([key, value]) => {
            yaml += `            ${key}: "${value}"
`;
          });
        }
        if (step.expect) {
          yaml += `          expect:
`;
          step.expect.forEach(expectation => {
            if (expectation.statusCode) {
              yaml += `            - statusCode: ${expectation.statusCode}
`;
            }
            if (expectation.contentType) {
              yaml += `            - contentType: "${expectation.contentType}"
`;
            }
          });
        }
        if (step.capture) {
          yaml += `          capture:
`;
          step.capture.forEach(capture => {
            yaml += `            - json: "${capture.json}"
              as: "${capture.as}"
`;
          });
        }
        if (step.think) {
          yaml += `          seconds: ${step.think}
`;
        }
      });
    });

    return yaml;
  }

  /**
   * Convert object to YAML with indentation
   */
  private objectToYaml(obj: any, indent: number): string {
    let yaml = '';
    const spaces = ' '.repeat(indent);
    
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        yaml += `${spaces}${key}:
`;
        yaml += this.objectToYaml(value, indent + 2);
      } else {
        yaml += `${spaces}${key}: ${JSON.stringify(value)}
`;
      }
    });
    
    return yaml;
  }

  /**
   * Get test result
   */
  getTestResult(testId: string): LoadTestResult | undefined {
    return this.activeTests.get(testId);
  }

  /**
   * Get all active tests
   */
  getActiveTests(): LoadTestResult[] {
    return Array.from(this.activeTests.values());
  }

  /**
   * Cancel running test
   */
  async cancelTest(testId: string): Promise<void> {
    const testResult = this.activeTests.get(testId);
    if (testResult && testResult.status === 'running') {
      testResult.status = 'cancelled';
      // In a real implementation, we'd need to track the child process
      // and kill it here
      this.emit('test:cancelled', { testId });
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(testId: string): {
    summary: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
      requestsPerSecond: number;
      errorRate: number;
    };
    recommendations: string[];
    performanceGrade: string;
  } | null {
    const testResult = this.getTestResult(testId);
    if (!testResult || testResult.status !== 'completed') {
      return null;
    }

    const aggregate = testResult.results.aggregate;
    const totalRequests = aggregate.counters['http.requests'] || 0;
    const successfulRequests = aggregate.counters['http.responses'] || 0;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = aggregate.summaries['http.response_time']?.mean || 0;
    const requestsPerSecond = aggregate.rates['http.request_rate'] || 0;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    const summary = {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      requestsPerSecond,
      errorRate
    };

    const recommendations = this.generatePerformanceRecommendations(summary);
    const performanceGrade = this.calculatePerformanceGrade(summary);

    return {
      summary,
      recommendations,
      performanceGrade
    };
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.errorRate > 1) {
      recommendations.push('High error rate detected. Check server logs and error handling.');
    }

    if (summary.averageResponseTime > 1000) {
      recommendations.push('High response times detected. Consider optimizing database queries and caching.');
    }

    if (summary.requestsPerSecond < 10) {
      recommendations.push('Low throughput detected. Consider scaling horizontally or optimizing server performance.');
    }

    if (summary.averageResponseTime > 500 && summary.averageResponseTime <= 1000) {
      recommendations.push('Moderate response times. Monitor and consider performance optimizations.');
    }

    return recommendations;
  }

  /**
   * Calculate performance grade
   */
  private calculatePerformanceGrade(summary: any): string {
    let score = 100;

    // Deduct points for errors
    score -= summary.errorRate * 10;

    // Deduct points for slow response times
    if (summary.averageResponseTime > 2000) {
      score -= 40;
    } else if (summary.averageResponseTime > 1000) {
      score -= 20;
    } else if (summary.averageResponseTime > 500) {
      score -= 10;
    }

    // Deduct points for low throughput
    if (summary.requestsPerSecond < 5) {
      score -= 30;
    } else if (summary.requestsPerSecond < 10) {
      score -= 15;
    }

    if (score >= 90) return 'A+ (Excellent)';
    if (score >= 80) return 'A (Very Good)';
    if (score >= 70) return 'B (Good)';
    if (score >= 60) return 'C (Fair)';
    if (score >= 50) return 'D (Poor)';
    return 'F (Critical Issues)';
  }

  /**
   * Cleanup temporary files
   */
  private cleanupTempFiles(testId: string): void {
    try {
      const configPath = path.join(this.tempDir, `${testId}.yml`);
      const resultsPath = path.join(this.tempDir, `${testId}-results.json`);
      
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
      if (fs.existsSync(resultsPath)) fs.unlinkSync(resultsPath);
    } catch (error) {
      console.warn('Failed to cleanup temp files:', error);
    }
  }
}