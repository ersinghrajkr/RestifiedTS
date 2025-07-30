/**
 * RestifiedTS Configuration System
 * Playwright-inspired configuration for comprehensive API testing
 */

export interface RestifiedProject {
  /** Project name */
  name: string;
  /** Base URL for this project/service */
  baseURL?: string;
  /** Test files to include for this project */
  testMatch?: string | string[];
  /** Test files to ignore for this project */
  testIgnore?: string | string[];
  /** Authentication configuration */
  auth?: {
    type: 'bearer' | 'basic' | 'oauth2' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  /** Request timeout for this project */
  timeout?: number;
  /** Retry configuration */
  retries?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Environment-specific settings */
  environment?: string;
}

export interface ReporterConfig {
  /** Reporter type */
  type: 'html' | 'json' | 'junit' | 'console' | 'github' | 'list';
  /** Reporter-specific options */
  options?: {
    outputFile?: string;
    outputFolder?: string;
    open?: boolean;
    inline?: boolean;
  };
}

export interface EnterpriseConfig {
  /** User roles for role-based testing */
  roles?: string[];
  /** Enable data generation with Faker.js */
  dataGeneration?: boolean;
  /** Enable boundary testing */
  boundaryTesting?: boolean;
  /** Enable performance tracking */
  performanceTracking?: boolean;
  /** Enable security testing */
  securityTesting?: boolean;
  /** Load balancing strategy */
  loadBalancing?: 'round-robin' | 'random' | 'least-connections';
  /** Circuit breaker configuration */
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
  };
}

export interface RestifiedConfig {
  /** Test directory */
  testDir?: string;
  /** Test file patterns to match */
  testMatch?: string | string[];
  /** Test file patterns to ignore */
  testIgnore?: string | string[];
  
  /** Parallel execution settings */
  fullyParallel?: boolean;
  /** Number of parallel workers */
  workers?: number | string;
  /** Global timeout for all tests */
  timeout?: number;
  /** Number of retries on failure */
  retries?: number;
  /** Forbid .only in CI environments */
  forbidOnly?: boolean;
  
  /** Global setup file */
  globalSetup?: string;
  /** Global teardown file */
  globalTeardown?: string;
  
  /** Base URL for all tests */
  baseURL?: string;
  
  /** Default authentication */
  auth?: RestifiedProject['auth'];
  
  /** Default headers */
  headers?: Record<string, string>;
  
  /** Environment configuration */
  environment?: string;
  
  /** Reporting configuration */
  reporter?: string | ReporterConfig | (string | ReporterConfig)[];
  
  /** Multiple projects/services */
  projects?: RestifiedProject[];
  
  /** Enterprise features */
  enterprise?: EnterpriseConfig;
  
  /** Custom configuration extensions */
  use?: {
    /** Screenshot on failure */
    screenshot?: 'off' | 'on' | 'only-on-failure';
    /** Video recording */
    video?: 'off' | 'on' | 'retain-on-failure';
    /** Request/response logging */
    trace?: 'off' | 'on' | 'retain-on-failure';
    /** Custom variables */
    variables?: Record<string, any>;
  };
  
  /** Expect configuration */
  expect?: {
    /** Default assertion timeout */
    timeout?: number;
    /** Polling interval for assertions */
    interval?: number;
  };
  
  /** WebSocket configuration */
  webSocket?: {
    /** Default WebSocket timeout */
    timeout?: number;
    /** Ping interval */
    pingInterval?: number;
  };
  
  /** GraphQL configuration */
  graphql?: {
    /** GraphQL endpoint */
    endpoint?: string;
    /** Default query timeout */
    timeout?: number;
    /** Enable introspection */
    introspection?: boolean;
  };
  
  /** Database configuration */
  database?: {
    /** Database connection options */
    connections?: Record<string, {
      type: 'mysql' | 'postgres' | 'mongodb' | 'redis';
      host: string;
      port: number;
      database: string;
      username?: string;
      password?: string;
    }>;
  };
  
  /** Performance testing configuration */
  performance?: {
    /** Performance thresholds */
    thresholds?: {
      responseTime?: number;
      throughput?: number;
      errorRate?: number;
    };
    /** Artillery integration */
    artillery?: {
      enabled: boolean;
      configFile?: string;
    };
  };
  
  /** Security testing configuration */
  security?: {
    /** OWASP ZAP integration */
    zap?: {
      enabled: boolean;
      proxyHost?: string;
      proxyPort?: number;
    };
    /** Security scan configuration */
    scans?: {
      sqlInjection?: boolean;
      xss?: boolean;
      authBypass?: boolean;
    };
  };
}

/**
 * Define RestifiedTS configuration
 * Similar to Playwright's defineConfig
 */
export function defineConfig(config: RestifiedConfig): RestifiedConfig {
  // Validate configuration
  validateConfig(config);
  
  // Apply defaults
  const defaultConfig: Partial<RestifiedConfig> = {
    testDir: './tests',
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
    testIgnore: ['**/node_modules/**', '**/dist/**'],
    timeout: 30000,
    retries: 0,
    workers: 1,
    fullyParallel: false,
    forbidOnly: false,
    reporter: 'list',
    expect: {
      timeout: 5000,
      interval: 100
    },
    use: {
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      trace: 'retain-on-failure'
    }
  };
  
  return { ...defaultConfig, ...config };
}

/**
 * Validate configuration options
 */
function validateConfig(config: RestifiedConfig): void {
  if (config.workers && typeof config.workers === 'string') {
    if (!config.workers.endsWith('%')) {
      throw new Error('Worker string must end with % (e.g., "50%")');
    }
    const percentage = parseInt(config.workers.slice(0, -1));
    if (percentage < 1 || percentage > 100) {
      throw new Error('Worker percentage must be between 1% and 100%');
    }
  }
  
  if (config.timeout && config.timeout < 0) {
    throw new Error('Timeout must be a positive number');
  }
  
  if (config.retries && config.retries < 0) {
    throw new Error('Retries must be a non-negative number');
  }
  
  if (config.projects) {
    for (const project of config.projects) {
      if (!project.name) {
        throw new Error('Each project must have a name');
      }
    }
  }
}

/**
 * Load configuration from file
 */
export class ConfigLoader {
  static async loadConfig(configPath?: string): Promise<RestifiedConfig> {
    const possiblePaths = [
      configPath,
      './restified.config.ts',
      './restified.config.js',
      './restified.config.json'
    ].filter(Boolean);
    
    for (const path of possiblePaths) {
      try {
        // Dynamic import for TypeScript/JavaScript files
        if (path!.endsWith('.ts') || path!.endsWith('.js')) {
          const module = await import(path!);
          return module.default || module;
        }
        
        // JSON import
        if (path!.endsWith('.json')) {
          const fs = await import('fs');
          const content = await fs.promises.readFile(path!, 'utf-8');
          return JSON.parse(content);
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }
    
    // Return default config if no file found
    return defineConfig({});
  }
}