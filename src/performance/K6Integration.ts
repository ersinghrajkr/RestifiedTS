/**
 * K6 Integration for RestifiedTS
 * 
 * Provides modern load testing capabilities using K6 as the performance engine:
 * - JavaScript-based test scripts generation from RestifiedTS tests
 * - Advanced load testing scenarios (spike, stress, soak tests)
 * - Browser-based performance testing
 * - Real-time metrics and thresholds
 * - CI/CD integration support
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { K6FakerIntegration, K6FakerScenario, K6UserJourney } from './K6FakerIntegration';

export interface K6Config {
  scenarios: Record<string, K6Scenario>;
  thresholds?: Record<string, K6Threshold[]>;
  options?: K6Options;
  stages?: K6Stage[];
  ext?: Record<string, any>;
}

export interface K6Scenario {
  executor: 'constant-vus' | 'ramping-vus' | 'constant-arrival-rate' | 'ramping-arrival-rate' | 'per-vu-iterations' | 'shared-iterations';
  vus?: number;
  duration?: string;
  rate?: number;
  timeUnit?: string;
  preAllocatedVUs?: number;
  maxVUs?: number;
  stages?: K6Stage[];
  iterations?: number;
  gracefulStop?: string;
  env?: Record<string, string>;
  tags?: Record<string, string>;
  exec?: string;
}

export interface K6Stage {
  duration: string;
  target: number;
}

export interface K6Threshold {
  threshold: string;
  abortOnFail?: boolean;
  delayAbortEval?: string;
}

export interface K6Options {
  discardResponseBodies?: boolean;
  duration?: string;
  iterations?: number;
  rps?: number;
  vus?: number;
  stages?: K6Stage[];
  setupTimeout?: string;
  teardownTimeout?: string;
  maxRedirects?: number;
  userAgent?: string;
  throw?: boolean;
  thresholds?: Record<string, K6Threshold[]>;
  noConnectionReuse?: boolean;
  noVUConnectionReuse?: boolean;
  minIterationDuration?: string;
  batch?: number;
  batchPerHost?: number;
  httpDebug?: string;
  insecureSkipTLSVerify?: boolean;
  tlsVersion?: string;
}

export interface K6TestResult {
  testId: string;
  config: K6Config;
  metrics: K6Metrics;
  thresholds: Record<string, K6ThresholdResult>;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  startTime: Date;
  endTime: Date;
  duration: number;
  errors?: string[];
}

export interface K6Metrics {
  // Standard metrics
  http_reqs: K6MetricData;
  http_req_duration: K6MetricData;
  http_req_blocked: K6MetricData;
  http_req_connecting: K6MetricData;
  http_req_tls_handshaking: K6MetricData;
  http_req_sending: K6MetricData;
  http_req_waiting: K6MetricData;
  http_req_receiving: K6MetricData;
  http_req_failed: K6MetricData;
  iterations: K6MetricData;
  iteration_duration: K6MetricData;
  vus: K6MetricData;
  vus_max: K6MetricData;
  
  // Custom metrics
  [key: string]: K6MetricData;
}

export interface K6MetricData {
  type: 'counter' | 'gauge' | 'rate' | 'trend';
  contains: 'default' | 'time' | 'data';
  values: {
    count?: number;
    rate?: number;
    avg?: number;
    min?: number;
    med?: number;
    max?: number;
    'p(90)'?: number;
    'p(95)'?: number;
    'p(99)'?: number;
    'p(99.9)'?: number;
    value?: number;
  };
  thresholds?: Record<string, { ok: boolean }>;
}

export interface K6ThresholdResult {
  ok: boolean;
  okCount: number;
  failureCount: number;
}

/**
 * K6 Load Testing Integration
 */
export class K6Integration extends EventEmitter {
  private activeTests: Map<string, K6TestResult> = new Map();
  private tempDir: string;
  private k6Binary: string;
  private fakerIntegration: K6FakerIntegration;

  constructor(options: {
    tempDir?: string;
    k6Binary?: string;
    fakerConfig?: { locale?: string; seed?: number };
  } = {}) {
    super();
    this.tempDir = options.tempDir || './output/temp/k6';
    this.k6Binary = options.k6Binary || 'k6';
    this.fakerIntegration = new K6FakerIntegration(options.fakerConfig);
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
   * Convert RestifiedTS test to K6 TypeScript test
   */
  convertRestifiedTestToK6TypeScript(testSpec: {
    name: string;
    baseUrl: string;
    endpoints: Array<{
      path: string;
      method: string;
      headers?: Record<string, string>;
      body?: any;
      auth?: any;
      expectedStatus?: number;
      timeout?: number;
    }>;
    authentication?: {
      type: 'bearer' | 'basic' | 'oauth2';
      credentials: any;
    };
    variables?: Record<string, any>;
  }): string {
    const imports = [
      "import http from 'k6/http';",
      "import { check, sleep } from 'k6';",
      "import { Rate, Trend, Counter } from 'k6/metrics';",
      "import { Options } from 'k6/options';",
      "",
      "// RestifiedTS Faker Integration (xk6-faker compatible)",
      "// Global faker object available like xk6-faker",
      "import { faker } from '@faker-js/faker';",
      "globalThis.faker = faker;"
    ];

    // Custom metrics with TypeScript types
    const customMetrics = [
      "// Custom metrics",
      "const errorRate = new Rate('errors');",
      "const responseTime = new Trend('response_time');",
      "const requestCount = new Counter('requests');"
    ];

    // Setup function for authentication
    let setupFunction = '';
    if (testSpec.authentication) {
      setupFunction = this.generateSetupFunction(testSpec.authentication, testSpec.baseUrl);
    }

    // Main test function
    const testFunction = this.generateK6TestFunction(testSpec);

    return [
      ...imports,
      '',
      ...customMetrics,
      '',
      setupFunction,
      '',
      testFunction
    ].join('\n');
  }

  /**
   * Generate K6 setup function for authentication with TypeScript types
   */
  private generateSetupFunction(auth: any, baseUrl: string): string {
    switch (auth.type) {
      case 'bearer':
        return `export function setup(): { token: string } {
  const loginResponse = http.post('${baseUrl}/auth/login', JSON.stringify(${JSON.stringify(auth.credentials)}), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined
  });
  
  return { token: loginResponse.json('token') };
}`;

      case 'oauth2':
        return `export function setup(): { token: string } {
  const tokenResponse = http.post('${baseUrl}/oauth/token', {
    grant_type: 'client_credentials',
    client_id: '${auth.credentials.clientId}',
    client_secret: '${auth.credentials.clientSecret}'
  });
  
  check(tokenResponse, {
    'oauth successful': (r) => r.status === 200,
    'access token received': (r) => r.json('access_token') !== undefined
  });
  
  return { token: tokenResponse.json('access_token') };
}`;

      default:
        return '// No authentication setup required';
    }
  }

  /**
   * Generate K6 test function with TypeScript types
   */
  private generateK6TestFunction(testSpec: any): string {
    const hasAuth = testSpec.authentication;
    const functionSignature = hasAuth ? 'export default function(data: { token: string })' : 'export default function()';
    
    let testBody = `${functionSignature} {
  requestCount.add(1);
  const startTime = Date.now();
  
`;

    // Add authentication headers if needed
    let authHeaders = '';
    if (hasAuth) {
      switch (testSpec.authentication.type) {
        case 'bearer':
        case 'oauth2':
          authHeaders = `
  const headers = {
    'Authorization': \`Bearer \${data.token}\`,
    'Content-Type': 'application/json'
  };`;
          break;
        case 'basic':
          const { username, password } = testSpec.authentication.credentials;
          const encoded = Buffer.from(`${username}:${password}`).toString('base64');
          authHeaders = `
  const headers = {
    'Authorization': 'Basic ${encoded}',
    'Content-Type': 'application/json'
  };`;
          break;
      }
    } else {
      authHeaders = `
  const headers = {
    'Content-Type': 'application/json'
  };`;
    }

    testBody += authHeaders;

    // Add endpoint tests
    testSpec.endpoints.forEach((endpoint: any, index: number) => {
      const url = `'${testSpec.baseUrl}${endpoint.path}'`;
      const method = endpoint.method.toLowerCase();
      const expectedStatus = endpoint.expectedStatus || 200;
      
      let requestCall = '';
      const defaultHeaders = { 'Content-Type': 'application/json' };
      const mergedHeaders = { ...defaultHeaders, ...endpoint.headers };
      
      if (method === 'get' || method === 'delete') {
        requestCall = `http.${method}(${url}, { headers: ${JSON.stringify(mergedHeaders)} })`;
      } else {
        const body = endpoint.body ? JSON.stringify(endpoint.body) : 'null';
        requestCall = `http.${method}(${url}, ${body}, { headers: ${JSON.stringify(mergedHeaders)} })`;
      }

      testBody += `
  
  // Test ${endpoint.method} ${endpoint.path}
  const response${index} = ${requestCall};
  
  check(response${index}, {
    '${endpoint.method} ${endpoint.path} status is ${expectedStatus}': (r) => r.status === ${expectedStatus},
    '${endpoint.method} ${endpoint.path} response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(response${index}.status !== ${expectedStatus});
  responseTime.add(response${index}.timings.duration);`;

      // Add think time between requests
      if (index < testSpec.endpoints.length - 1) {
        testBody += `
  sleep(Math.random() * 2 + 1); // Random think time 1-3 seconds`;
      }
    });

    testBody += `
  
  const endTime = Date.now();
  responseTime.add(endTime - startTime);
}`;

    return testBody;
  }

  /**
   * Create load testing scenarios
   */
  createLoadTestScenarios(): {
    smoke: K6Config;
    load: K6Config;
    stress: K6Config;
    spike: K6Config;
    soak: K6Config;
  } {
    return {
      // Smoke test - minimal load
      smoke: {
        scenarios: {
          smoke: {
            executor: 'constant-vus',
            vus: 1,
            duration: '1m'
          }
        },
        thresholds: {
          http_req_duration: [{ threshold: 'p(95)<2000', abortOnFail: true }],
          http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true }]
        }
      },

      // Load test - normal expected load
      load: {
        scenarios: {
          load: {
            executor: 'ramping-vus',
            stages: [
              { duration: '2m', target: 10 },
              { duration: '5m', target: 10 },
              { duration: '2m', target: 0 }
            ]
          }
        },
        thresholds: {
          http_req_duration: [{ threshold: 'p(95)<2000' }],
          http_req_failed: [{ threshold: 'rate<0.1' }]
        }
      },

      // Stress test - beyond normal capacity
      stress: {
        scenarios: {
          stress: {
            executor: 'ramping-vus',
            stages: [
              { duration: '2m', target: 10 },
              { duration: '5m', target: 20 },
              { duration: '2m', target: 50 },
              { duration: '5m', target: 50 },
              { duration: '2m', target: 0 }
            ]
          }
        },
        thresholds: {
          http_req_duration: [{ threshold: 'p(95)<5000' }],
          http_req_failed: [{ threshold: 'rate<0.2' }]
        }
      },

      // Spike test - sudden load increase
      spike: {
        scenarios: {
          spike: {
            executor: 'ramping-vus',
            stages: [
              { duration: '1m', target: 10 },
              { duration: '30s', target: 100 },
              { duration: '1m', target: 100 },
              { duration: '30s', target: 10 },
              { duration: '1m', target: 10 }
            ]
          }
        },
        thresholds: {
          http_req_duration: [{ threshold: 'p(95)<10000' }],
          http_req_failed: [{ threshold: 'rate<0.3' }]
        }
      },

      // Soak test - extended duration
      soak: {
        scenarios: {
          soak: {
            executor: 'constant-vus',
            vus: 20,
            duration: '30m'
          }
        },
        thresholds: {
          http_req_duration: [{ threshold: 'p(95)<3000' }],
          http_req_failed: [{ threshold: 'rate<0.1' }]
        }
      }
    };
  }

  /**
   * Run K6 test
   */
  async runK6Test(
    testScript: string, 
    config: K6Config,
    options: {
      testType?: 'smoke' | 'load' | 'stress' | 'spike' | 'soak';
      outputFormat?: 'json' | 'cloud' | 'influxdb';
      tags?: Record<string, string>;
      useTypeScript?: boolean;
    } = {}
  ): Promise<string> {
    const testId = uuidv4();
    const scriptExtension = options.useTypeScript !== false ? '.ts' : '.js'; // Default to TypeScript
    const scriptPath = path.join(this.tempDir, `${testId}${scriptExtension}`);
    const resultsPath = path.join(this.tempDir, `${testId}-results.json`);

    // Write K6 script to file
    const fullScript = this.generateFullK6Script(testScript, config);
    fs.writeFileSync(scriptPath, fullScript);

    // Initialize test result
    const testResult: K6TestResult = {
      testId,
      config,
      metrics: {} as K6Metrics,
      thresholds: {},
      status: 'running',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      errors: []
    };

    this.activeTests.set(testId, testResult);

    // Build K6 command
    const k6Args = [
      'run'
    ];

    // Add compatibility mode for TypeScript if needed
    if (options.useTypeScript !== false) {
      k6Args.push('--compatibility-mode=experimental_enhanced');
    }

    k6Args.push(
      '--out', `json=${resultsPath}`,
      '--quiet'
    );

    // Add tags if specified
    if (options.tags) {
      for (const [key, value] of Object.entries(options.tags)) {
        k6Args.push('--tag', `${key}=${value}`);
      }
    }

    k6Args.push(scriptPath);

    // Run K6
    const k6Process = spawn(this.k6Binary, k6Args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    // Handle K6 output
    k6Process.stdout.on('data', (data) => {
      const output = data.toString();
      this.emit('test:progress', { testId, output });
    });

    k6Process.stderr.on('data', (data) => {
      const error = data.toString();
      testResult.errors?.push(error);
      this.emit('test:error', { testId, error });
    });

    k6Process.on('close', async (code) => {
      testResult.endTime = new Date();
      testResult.duration = testResult.endTime.getTime() - testResult.startTime.getTime();
      
      if (code === 0) {
        testResult.status = 'completed';
        // Parse results
        await this.parseK6Results(testId, resultsPath);
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
   * Generate full K6 script with configuration
   */
  private generateFullK6Script(testScript: string, config: K6Config): string {
    const configJson = JSON.stringify(config, null, 2);
    
    return `// K6 Configuration
export let options = ${configJson};

${testScript}`;
  }

  /**
   * Parse K6 results from JSON output
   */
  private async parseK6Results(testId: string, resultsPath: string): Promise<void> {
    const testResult = this.activeTests.get(testId);
    if (!testResult || !fs.existsSync(resultsPath)) return;

    try {
      const resultsData = fs.readFileSync(resultsPath, 'utf8');
      const lines = resultsData.trim().split('\n');
      
      for (const line of lines) {
        const data = JSON.parse(line);
        
        if (data.type === 'Point' && data.data) {
          // Process metric data points
          this.processMetricPoint(testResult, data);
        }
      }
    } catch (error) {
      console.error('Failed to parse K6 results:', error);
      testResult.errors?.push(`Failed to parse results: ${error}`);
    }
  }

  /**
   * Process individual metric point
   */
  private processMetricPoint(testResult: K6TestResult, data: any): void {
    const metricName = data.metric;
    const metricData = data.data;
    
    if (!testResult.metrics[metricName]) {
      testResult.metrics[metricName] = {
        type: this.getMetricType(metricName),
        contains: this.getMetricContains(metricName),
        values: {}
      };
    }

    // Update metric values based on type
    const metric = testResult.metrics[metricName];
    if (metricData.value !== undefined) {
      if (metric.type === 'counter') {
        metric.values.count = (metric.values.count || 0) + metricData.value;
      } else if (metric.type === 'gauge') {
        metric.values.value = metricData.value;
      }
    }
  }

  /**
   * Get metric type based on metric name
   */
  private getMetricType(metricName: string): 'counter' | 'gauge' | 'rate' | 'trend' {
    if (metricName.includes('_duration') || metricName.includes('_time')) {
      return 'trend';
    }
    if (metricName.includes('_failed') || metricName.includes('_rate')) {
      return 'rate';
    }
    if (metricName.includes('vus')) {
      return 'gauge';
    }
    return 'counter';
  }

  /**
   * Get metric contains type
   */
  private getMetricContains(metricName: string): 'default' | 'time' | 'data' {
    if (metricName.includes('_duration') || metricName.includes('_time')) {
      return 'time';
    }
    return 'default';
  }

  /**
   * Get test result
   */
  getTestResult(testId: string): K6TestResult | undefined {
    return this.activeTests.get(testId);
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(testId: string): {
    summary: {
      totalRequests: number;
      averageResponseTime: number;
      requestsPerSecond: number;
      errorRate: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
    };
    thresholds: Record<string, { passed: boolean; value: string }>;
    recommendations: string[];
    grade: string;
  } | null {
    const testResult = this.getTestResult(testId);
    if (!testResult || testResult.status !== 'completed') {
      return null;
    }

    const metrics = testResult.metrics;
    const summary = {
      totalRequests: metrics.http_reqs?.values.count || 0,
      averageResponseTime: metrics.http_req_duration?.values.avg || 0,
      requestsPerSecond: metrics.http_reqs?.values.rate || 0,
      errorRate: metrics.http_req_failed?.values.rate || 0,
      p95ResponseTime: metrics.http_req_duration?.values['p(95)'] || 0,
      p99ResponseTime: metrics.http_req_duration?.values['p(99)'] || 0
    };

    const thresholds = this.evaluateThresholds(testResult);
    const recommendations = this.generateRecommendations(summary);
    const grade = this.calculateGrade(summary, thresholds);

    return {
      summary,
      thresholds,
      recommendations,
      grade
    };
  }

  /**
   * Evaluate thresholds
   */
  private evaluateThresholds(testResult: K6TestResult): Record<string, { passed: boolean; value: string }> {
    const thresholds: Record<string, { passed: boolean; value: string }> = {};
    
    // This would be populated from actual K6 threshold results
    // For now, return empty object
    return thresholds;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.errorRate > 0.01) {
      recommendations.push('High error rate detected. Investigate error causes and improve error handling.');
    }

    if (summary.p95ResponseTime > 2000) {
      recommendations.push('95th percentile response time is high. Consider optimizing slow endpoints.');
    }

    if (summary.requestsPerSecond < 10) {
      recommendations.push('Low throughput detected. Consider scaling or performance optimization.');
    }

    return recommendations;
  }

  /**
   * Calculate performance grade
   */
  private calculateGrade(summary: any, thresholds: any): string {
    let score = 100;

    // Deduct for high error rates
    score -= summary.errorRate * 1000;

    // Deduct for slow response times
    if (summary.p95ResponseTime > 5000) score -= 40;
    else if (summary.p95ResponseTime > 2000) score -= 20;
    else if (summary.p95ResponseTime > 1000) score -= 10;

    // Deduct for low throughput
    if (summary.requestsPerSecond < 5) score -= 30;
    else if (summary.requestsPerSecond < 10) score -= 15;

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
      const scriptPath = path.join(this.tempDir, `${testId}.js`);
      const resultsPath = path.join(this.tempDir, `${testId}-results.json`);
      
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      if (fs.existsSync(resultsPath)) fs.unlinkSync(resultsPath);
    } catch (error) {
      console.warn('Failed to cleanup temp files:', error);
    }
  }

  /**
   * Generate K6 test with faker data
   */
  generateK6TestWithFaker(scenarios: K6FakerScenario[]): string {
    return this.fakerIntegration.generateK6FakerScript(scenarios);
  }

  /**
   * Generate comprehensive faker-based load test
   */
  generateFakerLoadTest(config: {
    baseUrl: string;
    scenarios: K6FakerScenario[];
    users?: number;
    duration?: string;
  }): string {
    return this.fakerIntegration.generateComprehensiveFakerTest(config);
  }

  /**
   * Generate user journey test with faker data
   */
  generateUserJourneyTest(journey: K6UserJourney, baseUrl: string): string {
    return this.fakerIntegration.generateUserJourney(journey);
  }

  /**
   * Run K6 test with faker data generation
   */
  async runK6FakerTest(
    scenarios: K6FakerScenario[],
    config: K6Config,
    options: {
      baseUrl: string;
      users?: number;
      duration?: string;
      outputFormat?: 'json' | 'cloud' | 'influxdb';
      tags?: Record<string, string>;
    }
  ): Promise<string> {
    const testScript = this.fakerIntegration.generateComprehensiveFakerTest({
      baseUrl: options.baseUrl,
      scenarios,
      users: options.users,
      duration: options.duration
    });

    return await this.runK6Test(testScript, config, {
      useTypeScript: true,
      outputFormat: options.outputFormat,
      tags: { ...options.tags, type: 'faker_test' }
    });
  }

  /**
   * Get available faker providers
   */
  getFakerProviders(): Record<string, string[]> {
    return this.fakerIntegration.getAvailableProviders();
  }

  /**
   * Create realistic e-commerce test scenario
   */
  createEcommerceScenario(baseUrl: string): {
    script: string;
    config: K6Config;
  } {
    const scenarios: K6FakerScenario[] = [
      {
        name: 'User Registration',
        endpoint: '/api/users/register',
        method: 'POST',
        dataFields: [
          { name: 'user', type: 'person' },
          { name: 'address', type: 'address' }
        ],
        validations: [
          { description: 'user created', check: 'r.json("id") !== undefined' }
        ]
      },
      {
        name: 'Product Browse',
        endpoint: '/api/products',
        method: 'GET',
        validations: [
          { description: 'products returned', check: 'r.json().length > 0' }
        ]
      },
      {
        name: 'Add to Cart',
        endpoint: '/api/cart/items',
        method: 'POST',
        dataFields: [
          { name: 'product', type: 'product' }
        ]
      },
      {
        name: 'Checkout',
        endpoint: '/api/orders',
        method: 'POST',
        dataFields: [
          { name: 'payment', type: 'financial' },
          { name: 'shipping', type: 'address' }
        ]
      }
    ];

    const script = this.fakerIntegration.generateComprehensiveFakerTest({
      baseUrl,
      scenarios,
      users: 20,
      duration: '5m'
    });

    const config: K6Config = {
      scenarios: {
        ecommerce_load: {
          executor: 'ramping-vus',
          stages: [
            { duration: '1m', target: 10 },
            { duration: '3m', target: 20 },
            { duration: '1m', target: 0 }
          ]
        }
      },
      thresholds: {
        http_req_duration: [{ threshold: 'p(95)<3000' }],
        http_req_failed: [{ threshold: 'rate<0.02' }],
        faker_errors: [{ threshold: 'rate<0.001' }]
      }
    };

    return { script, config };
  }

  /**
   * Check if K6 is available
   */
  async checkK6Availability(): Promise<boolean> {
    return new Promise((resolve) => {
      const k6Check = spawn(this.k6Binary, ['--version'], { shell: true });
      k6Check.on('close', (code) => {
        resolve(code === 0);
      });
      k6Check.on('error', () => {
        resolve(false);
      });
    });
  }
}