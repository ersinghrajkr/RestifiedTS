// src/utils/MockServer.ts

import * as express from 'express';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { Express, Request, Response, NextFunction } from 'express';

/**
 * Production-grade mock server for API testing
 * 
 * Features:
 * - Express-based HTTP server with middleware support
 * - Dynamic route registration and management
 * - Request/response recording and playback
 * - Configurable delays and error simulation
 * - Static file serving capabilities
 * - Request validation and matching
 * - CORS support
 * - SSL/HTTPS support
 * - Request logging and analytics
 * 
 * @example
 * ```typescript
 * const mockServer = new MockServer({ port: 3001 });
 * 
 * // Add mock endpoints
 * mockServer.get('/users/:id', (req, res) => {
 *   res.json({ id: req.params.id, name: 'John Doe' });
 * });
 * 
 * mockServer.post('/users', { 
 *   status: 201, 
 *   body: { id: 123, name: 'New User' },
 *   delay: 500 
 * });
 * 
 * await mockServer.start();
 * ```
 */
export class MockServer {
  private readonly app: Express;
  private server?: http.Server;
  private readonly config: MockServerConfig;
  private readonly routes: Map<string, MockRoute> = new Map();
  private readonly recordings: MockRecording[] = [];
  private readonly requestHistory: RequestRecord[] = [];
  private isRunning: boolean = false;

  constructor(config: Partial<MockServerConfig> = {}) {
    this.config = {
      port: 3000,
      host: 'localhost',
      enableCors: true,
      enableLogging: true,
      enableRecording: false,
      staticPath: './public',
      maxRequestHistory: 1000,
      defaultDelay: 0,
      ...config
    };

    this.app = express();
    this.setupMiddleware();
    this.setupDefaultRoutes();
  }

  /**
   * Start the mock server
   * 
   * @returns Promise that resolves when server is started
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Mock server is already running');
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        this.isRunning = true;
        console.log(`Mock server running on http://${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        this.isRunning = false;
        reject(error);
      });
    });
  }

  /**
   * Stop the mock server
   * 
   * @returns Promise that resolves when server is stopped
   */
  async stop(): Promise<void> {
    if (!this.server || !this.isRunning) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.isRunning = false;
          console.log('Mock server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Register a GET route
   * 
   * @param path - Route path
   * @param handler - Route handler or response configuration
   */
  get(path: string, handler: MockRouteHandler | MockResponse): void {
    this.addRoute('GET', path, handler);
  }

  /**
   * Register a POST route
   * 
   * @param path - Route path
   * @param handler - Route handler or response configuration
   */
  post(path: string, handler: MockRouteHandler | MockResponse): void {
    this.addRoute('POST', path, handler);
  }

  /**
   * Register a PUT route
   * 
   * @param path - Route path
   * @param handler - Route handler or response configuration
   */
  put(path: string, handler: MockRouteHandler | MockResponse): void {
    this.addRoute('PUT', path, handler);
  }

  /**
   * Register a DELETE route
   * 
   * @param path - Route path
   * @param handler - Route handler or response configuration
   */
  delete(path: string, handler: MockRouteHandler | MockResponse): void {
    this.addRoute('DELETE', path, handler);
  }

  /**
   * Register a PATCH route
   * 
   * @param path - Route path
   * @param handler - Route handler or response configuration
   */
  patch(path: string, handler: MockRouteHandler | MockResponse): void {
    this.addRoute('PATCH', path, handler);
  }

  /**
   * Register a route for any HTTP method
   * 
   * @param method - HTTP method
   * @param path - Route path
   * @param handler - Route handler or response configuration
   */
  addRoute(method: HttpMethod, path: string, handler: MockRouteHandler | MockResponse): void {
    const routeKey = `${method}:${path}`;
    const route: MockRoute = {
      method,
      path,
      handler: typeof handler === 'function' ? handler : this.createResponseHandler(handler),
      created: new Date(),
      callCount: 0
    };

    this.routes.set(routeKey, route);

    // Register with Express
    const expressMethod = method.toLowerCase() as keyof Express;
    if (typeof this.app[expressMethod] === 'function') {
      (this.app[expressMethod] as any)(path, this.createExpressHandler(route));
    }
  }

  /**
   * Remove a route
   * 
   * @param method - HTTP method
   * @param path - Route path
   */
  removeRoute(method: HttpMethod, path: string): boolean {
    const routeKey = `${method}:${path}`;
    return this.routes.delete(routeKey);
  }

  /**
   * Clear all routes
   */
  clearRoutes(): void {
    this.routes.clear();
    // Recreate Express app to clear routes
    this.app._router = undefined;
    this.setupMiddleware();
    this.setupDefaultRoutes();
  }

  /**
   * Get route statistics
   * 
   * @returns Route statistics
   */
  getRouteStats(): RouteStats[] {
    return Array.from(this.routes.values()).map(route => ({
      method: route.method,
      path: route.path,
      callCount: route.callCount,
      created: route.created,
      lastCalled: route.lastCalled
    }));
  }

  /**
   * Get request history
   * 
   * @returns Array of recorded requests
   */
  getRequestHistory(): RequestRecord[] {
    return [...this.requestHistory];
  }

  /**
   * Clear request history
   */
  clearRequestHistory(): void {
    this.requestHistory.length = 0;
  }

  /**
   * Start recording requests for playback
   */
  startRecording(): void {
    this.config.enableRecording = true;
  }

  /**
   * Stop recording requests
   */
  stopRecording(): void {
    this.config.enableRecording = false;
  }

  /**
   * Get recorded interactions
   * 
   * @returns Array of recorded interactions
   */
  getRecordings(): MockRecording[] {
    return [...this.recordings];
  }

  /**
   * Load recordings from file
   * 
   * @param filePath - Path to recordings file
   */
  async loadRecordings(filePath: string): Promise<void> {
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      const recordings = JSON.parse(data) as MockRecording[];
      
      recordings.forEach(recording => {
        this.addRoute(
          recording.request.method as HttpMethod,
          recording.request.path,
          (req, res) => {
            if (recording.response.delay) {
              setTimeout(() => {
                res.status(recording.response.status).json(recording.response.body);
              }, recording.response.delay);
            } else {
              res.status(recording.response.status).json(recording.response.body);
            }
          }
        );
      });
      
      console.log(`Loaded ${recordings.length} recordings from ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to load recordings: ${(error as Error).message}`);
    }
  }

  /**
   * Save recordings to file
   * 
   * @param filePath - Path to save recordings
   */
  async saveRecordings(filePath: string): Promise<void> {
    try {
      const data = JSON.stringify(this.recordings, null, 2);
      await fs.promises.writeFile(filePath, data, 'utf-8');
      console.log(`Saved ${this.recordings.length} recordings to ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to save recordings: ${(error as Error).message}`);
    }
  }

  /**
   * Simulate network delays globally
   * 
   * @param delay - Delay in milliseconds
   */
  setGlobalDelay(delay: number): void {
    this.config.defaultDelay = delay;
  }

  /**
   * Simulate server errors for testing error handling
   * 
   * @param path - Path to simulate errors for
   * @param errorRate - Error rate (0-1)
   * @param statusCode - HTTP status code to return
   */
  simulateErrors(path: string, errorRate: number = 0.5, statusCode: number = 500): void {
    this.app.use(path, (req: Request, res: Response, next: NextFunction) => {
      if (Math.random() < errorRate) {
        res.status(statusCode).json({ error: 'Simulated server error' });
      } else {
        next();
      }
    });
  }

  /**
   * Get server information
   * 
   * @returns Server information
   */
  getInfo(): MockServerInfo {
    return {
      isRunning: this.isRunning,
      host: this.config.host,
      port: this.config.port,
      url: `http://${this.config.host}:${this.config.port}`,
      routeCount: this.routes.size,
      requestCount: this.requestHistory.length,
      recordingCount: this.recordings.length,
      config: { ...this.config }
    };
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private setupMiddleware(): void {
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS
    if (this.config.enableCors) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Request logging and history
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      if (this.config.enableLogging) {
        console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
      }

      // Record request
      const requestRecord: RequestRecord = {
        timestamp: new Date(),
        method: req.method,
        path: req.path,
        query: req.query,
        headers: req.headers,
        body: req.body,
        responseTime: 0,
        statusCode: 0
      };

      // Capture response details
      const originalSend = res.send;
      res.send = function(data) {
        requestRecord.responseTime = Date.now() - startTime;
        requestRecord.statusCode = res.statusCode;
        requestRecord.responseBody = data;
        
        return originalSend.call(this, data);
      };

      // Add to history
      this.addToRequestHistory(requestRecord);

      // Record for playback if enabled
      if (this.config.enableRecording) {
        this.recordInteraction(req, res);
      }

      next();
    });

    // Global delay simulation
    if (this.config.defaultDelay > 0) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        setTimeout(next, this.config.defaultDelay);
      });
    }

    // Static file serving
    if (this.config.staticPath && fs.existsSync(this.config.staticPath)) {
      this.app.use('/static', express.static(this.config.staticPath));
    }
  }

  private setupDefaultRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        server: 'RestifiedTS Mock Server'
      });
    });

    // Server info endpoint
    this.app.get('/mock-server/info', (req: Request, res: Response) => {
      res.json(this.getInfo());
    });

    // Route stats endpoint
    this.app.get('/mock-server/routes', (req: Request, res: Response) => {
      res.json(this.getRouteStats());
    });

    // Request history endpoint
    this.app.get('/mock-server/history', (req: Request, res: Response) => {
      res.json(this.getRequestHistory());
    });

    // Clear history endpoint
    this.app.delete('/mock-server/history', (req: Request, res: Response) => {
      this.clearRequestHistory();
      res.json({ message: 'Request history cleared' });
    });
  }

  private createResponseHandler(response: MockResponse): MockRouteHandler {
    return (req: Request, res: Response) => {
      const delay = response.delay || 0;
      
      const sendResponse = () => {
        res.status(response.status || 200);
        
        if (response.headers) {
          Object.entries(response.headers).forEach(([key, value]) => {
            res.header(key, value);
          });
        }
        
        if (response.body !== undefined) {
          res.json(response.body);
        } else {
          res.end();
        }
      };

      if (delay > 0) {
        setTimeout(sendResponse, delay);
      } else {
        sendResponse();
      }
    };
  }

  private createExpressHandler(route: MockRoute) {
    return (req: Request, res: Response, next: NextFunction) => {
      route.callCount++;
      route.lastCalled = new Date();
      
      try {
        route.handler(req, res, next);
      } catch (error) {
        console.error(`Error in route ${route.method} ${route.path}:`, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  private addToRequestHistory(record: RequestRecord): void {
    this.requestHistory.push(record);
    
    // Maintain history size limit
    if (this.requestHistory.length > this.config.maxRequestHistory) {
      this.requestHistory.shift();
    }
  }

  private recordInteraction(req: Request, res: Response): void {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      const recording: MockRecording = {
        timestamp: new Date(),
        request: {
          method: req.method,
          path: req.path,
          query: req.query,
          headers: req.headers,
          body: req.body
        },
        response: {
          status: res.statusCode,
          headers: res.getHeaders(),
          body: typeof data === 'string' ? JSON.parse(data) : data
        }
      };

      this.recordings.push(recording);
      
      return originalSend.call(this, data);
    }.bind(this);
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

export interface MockServerConfig {
  port: number;
  host: string;
  enableCors: boolean;
  enableLogging: boolean;
  enableRecording: boolean;
  staticPath?: string;
  maxRequestHistory: number;
  defaultDelay: number;
  ssl?: {
    key: string;
    cert: string;
  };
}

export interface MockResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
  delay?: number;
}

export interface MockRoute {
  method: HttpMethod;
  path: string;
  handler: MockRouteHandler;
  created: Date;
  lastCalled?: Date;
  callCount: number;
}

export interface RouteStats {
  method: HttpMethod;
  path: string;
  callCount: number;
  created: Date;
  lastCalled?: Date;
}

export interface RequestRecord {
  timestamp: Date;
  method: string;
  path: string;
  query: any;
  headers: any;
  body: any;
  responseTime: number;
  statusCode: number;
  responseBody?: any;
}

export interface MockRecording {
  timestamp: Date;
  request: {
    method: string;
    path: string;
    query: any;
    headers: any;
    body: any;
  };
  response: {
    status: number;
    headers: any;
    body: any;
    delay?: number;
  };
}

export interface MockServerInfo {
  isRunning: boolean;
  host: string;
  port: number;
  url: string;
  routeCount: number;
  requestCount: number;
  recordingCount: number;
  config: MockServerConfig;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type MockRouteHandler = (req: Request, res: Response, next?: NextFunction) => void;