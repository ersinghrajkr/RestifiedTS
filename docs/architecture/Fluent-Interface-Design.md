# Fluent Interface Pattern - Design Architecture

## Overview

The Fluent Interface Pattern is the cornerstone of RestifiedTS's developer experience, providing an intuitive, discoverable, and powerful API for creating API tests. This document outlines the comprehensive design of the fluent interface system, including its architecture, implementation patterns, and extensibility mechanisms.

## Design Principles

### 1. **Discoverability**
- Method chaining guides users through logical test construction
- IntelliSense and TypeScript provide contextual suggestions
- Self-documenting API with descriptive method names
- Progressive disclosure of functionality

### 2. **Type Safety**
- Compile-time validation of test structure
- Strongly typed parameters and return values
- Context-aware method availability
- Generic type constraints for data validation

### 3. **Expressiveness**
- Natural language-like test construction
- Domain-specific language (DSL) for API testing
- Flexible parameter passing (objects, functions, primitives)
- Rich assertion and validation vocabulary

### 4. **Extensibility**
- Plugin system for custom methods
- Custom matchers and validators
- Middleware injection points
- Hook system for test lifecycle

## Core Fluent Interface Architecture

### DSL Structure Overview

```typescript
/**
 * Complete Fluent Interface Structure
 * 
 * The fluent interface follows the Given-When-Then pattern with rich
 * extensibility and type safety throughout the chain.
 */

interface RestifiedFluentInterface {
  // Entry points
  given(): GivenStep;
  scenario(name: string): ScenarioBuilder;
  dataTest(): DataTestBuilder;
  parallel(): ParallelTestBuilder;
  performance(): PerformanceTestBuilder;
  contract(): ContractTestBuilder;
  
  // Direct execution (for simple cases)
  get(url: string): DirectExecutionBuilder;
  post(url: string, body?: any): DirectExecutionBuilder;
  put(url: string, body?: any): DirectExecutionBuilder;
  patch(url: string, body?: any): DirectExecutionBuilder;
  delete(url: string): DirectExecutionBuilder;
  head(url: string): DirectExecutionBuilder;
  options(url: string): DirectExecutionBuilder;
}
```

### Core Step Interfaces

```typescript
/**
 * Given Step Interface
 * 
 * Handles test setup and configuration
 */
interface GivenStep {
  // Basic configuration
  baseUrl(url: string): GivenStep;
  baseURL(url: string): GivenStep; // Alias for compatibility
  
  // Headers
  header(name: string, value: string): GivenStep;
  headers(headers: Record<string, string>): GivenStep;
  contentType(type: string): GivenStep;
  accept(type: string): GivenStep;
  userAgent(agent: string): GivenStep;
  
  // Authentication
  bearerToken(token: string): GivenStep;
  basicAuth(username: string, password: string): GivenStep;
  oauth2(config: OAuth2Config): GivenStep;
  apiKey(key: string, location?: 'header' | 'query', name?: string): GivenStep;
  authProvider(provider: IAuthProvider): GivenStep;
  authConfig(configName: string): GivenStep;
  
  // Request configuration
  timeout(ms: number): GivenStep;
  retry(attempts: number): GivenStep;
  retryConfig(config: RetryConfig): GivenStep;
  followRedirects(follow: boolean): GivenStep;
  maxRedirects(max: number): GivenStep;
  
  // Data and variables
  variable(name: string, value: any): GivenStep;
  variables(vars: Record<string, any>): GivenStep;
  pathParam(name: string, value: any): GivenStep;
  pathParams(params: Record<string, any>): GivenStep;
  queryParam(name: string, value: any): GivenStep;
  queryParams(params: Record<string, any>): GivenStep;
  
  // Body and payload
  body(data: any): GivenStep;
  jsonBody(data: any): GivenStep;
  xmlBody(data: string): GivenStep;
  textBody(data: string): GivenStep;
  formData(data: Record<string, any>): GivenStep;
  multipartFormData(data: FormData): GivenStep;
  
  // File uploads
  file(fieldName: string, filePath: string): GivenStep;
  files(files: Record<string, string>): GivenStep;
  
  // Client configuration
  useClient(clientName: string): GivenStep;
  clientConfig(config: HttpClientConfig): GivenStep;
  
  // SSL/TLS configuration
  sslConfig(config: SSLConfig): GivenStep;
  trustStore(path: string): GivenStep;
  keyStore(path: string, password: string): GivenStep;
  
  // Proxy configuration
  proxy(config: ProxyConfig): GivenStep;
  
  // Logging and debugging
  logLevel(level: LogLevel): GivenStep;
  enableDebug(): GivenStep;
  disableDebug(): GivenStep;
  
  // Test metadata
  description(desc: string): GivenStep;
  tag(tag: string): GivenStep;
  tags(...tags: string[]): GivenStep;
  priority(priority: TestPriority): GivenStep;
  category(category: TestCategory): GivenStep;
  
  // Conditional setup
  when(condition: boolean | (() => boolean), setup: (given: GivenStep) => GivenStep): GivenStep;
  unless(condition: boolean | (() => boolean), setup: (given: GivenStep) => GivenStep): GivenStep;
  
  // Navigation to When step
  when(): WhenStep;
}

/**
 * When Step Interface
 * 
 * Handles HTTP request execution
 */
interface WhenStep {
  // HTTP methods
  get(url?: string): WhenStep;
  post(url?: string, body?: any): WhenStep;
  put(url?: string, body?: any): WhenStep;
  patch(url?: string, body?: any): WhenStep;
  delete(url?: string): WhenStep;
  head(url?: string): WhenStep;
  options(url?: string): WhenStep;
  
  // Custom HTTP method
  method(method: string, url?: string, body?: any): WhenStep;
  
  // URL and path manipulation
  url(url: string): WhenStep;
  path(path: string): WhenStep;
  endpoint(endpoint: string): WhenStep;
  
  // Request modifications
  body(data: any): WhenStep;
  header(name: string, value: string): WhenStep;
  headers(headers: Record<string, string>): WhenStep;
  queryParam(name: string, value: any): WhenStep;
  queryParams(params: Record<string, any>): WhenStep;
  
  // Advanced features
  description(desc: string): WhenStep;
  name(name: string): WhenStep;
  
  // Conditional execution
  if(condition: boolean | (() => boolean)): WhenStep;
  unless(condition: boolean | (() => boolean)): WhenStep;
  
  // Execution
  execute(): Promise<ThenStep>;
  send(): Promise<ThenStep>; // Alias for execute
  
  // Navigation to Then step (for chaining without execution)
  then(): ThenStep;
}

/**
 * Then Step Interface
 * 
 * Handles response validation and assertions
 */
interface ThenStep {
  // Status code assertions
  statusCode(code: number): ThenStep;
  statusCodeIn(codes: number[]): ThenStep;
  statusCodeBetween(min: number, max: number): ThenStep;
  ok(): ThenStep; // 200-299
  created(): ThenStep; // 201
  accepted(): ThenStep; // 202
  noContent(): ThenStep; // 204
  notFound(): ThenStep; // 404
  unauthorized(): ThenStep; // 401
  forbidden(): ThenStep; // 403
  badRequest(): ThenStep; // 400
  serverError(): ThenStep; // 500-599
  
  // Header assertions
  header(name: string, value: string | Matcher): ThenStep;
  headers(headers: Record<string, string | Matcher>): ThenStep;
  headerExists(name: string): ThenStep;
  headerNotExists(name: string): ThenStep;
  contentType(type: string): ThenStep;
  contentLength(length: number): ThenStep;
  
  // Body assertions
  body(value: any | Matcher): ThenStep;
  bodyContains(value: any): ThenStep;
  bodyNotContains(value: any): ThenStep;
  bodyIsEmpty(): ThenStep;
  bodyIsNotEmpty(): ThenStep;
  bodyMatchesText(text: string): ThenStep;
  bodyMatchesRegex(regex: RegExp): ThenStep;
  
  // JSON assertions
  jsonPath(path: string, value: any | Matcher): ThenStep;
  json(path: string, value: any | Matcher): ThenStep; // Alias
  jsonSchema(schema: any): ThenStep;
  jsonContains(path: string, value: any): ThenStep;
  jsonNotContains(path: string, value: any): ThenStep;
  jsonExists(path: string): ThenStep;
  jsonNotExists(path: string): ThenStep;
  jsonType(path: string, type: JsonType): ThenStep;
  jsonArray(path: string, matcher: ArrayMatcher): ThenStep;
  jsonObject(path: string, matcher: ObjectMatcher): ThenStep;
  
  // XML assertions (for SOAP/XML APIs)
  xpath(path: string, value: any | Matcher): ThenStep;
  xmlSchema(schema: any): ThenStep;
  xmlContains(path: string, value: any): ThenStep;
  xmlExists(path: string): ThenStep;
  
  // Performance assertions
  responseTime(maxMs: number): ThenStep;
  responseTimeLessThan(maxMs: number): ThenStep;
  responseTimeGreaterThan(minMs: number): ThenStep;
  responseTimeBetween(minMs: number, maxMs: number): ThenStep;
  
  // Size assertions
  contentSize(size: number): ThenStep;
  contentSizeLessThan(maxSize: number): ThenStep;
  contentSizeGreaterThan(minSize: number): ThenStep;
  
  // Custom assertions
  assert(assertion: (response: HttpResponse) => boolean): ThenStep;
  custom(validator: CustomValidator): ThenStep;
  satisfies(specification: ResponseSpecification): ThenStep;
  
  // Conditional assertions
  if(condition: boolean | ((response: HttpResponse) => boolean)): ConditionalThenStep;
  unless(condition: boolean | ((response: HttpResponse) => boolean)): ConditionalThenStep;
  
  // Data extraction
  extract(path: string, variableName: string): ThenStep;
  extractJsonPath(path: string, variableName: string): ThenStep;
  extractHeader(headerName: string, variableName: string): ThenStep;
  extractCookie(cookieName: string, variableName: string): ThenStep;
  extractAll(extractions: Record<string, string>): ThenStep;
  
  // Response storage
  storeResponse(key: string): ThenStep;
  saveSnapshot(name: string): ThenStep;
  compareSnapshot(name: string): ThenStep;
  
  // Chaining and continuation
  and(): ThenStep;
  also(): ThenStep;
  
  // Flow control
  continueOnFailure(): ThenStep;
  stopOnFailure(): ThenStep;
  
  // Navigation
  given(): GivenStep; // Start new test step
  when(): WhenStep;   // Start new request
  
  // Final execution
  execute(): Promise<TestResult>;
  run(): Promise<TestResult>; // Alias
}
```

## Advanced Fluent Interfaces

### 1. **Scenario Builder**

```typescript
/**
 * Scenario Builder Interface
 * 
 * For complex, multi-step test scenarios
 */
interface ScenarioBuilder {
  name(name: string): ScenarioBuilder;
  description(desc: string): ScenarioBuilder;
  tags(...tags: string[]): ScenarioBuilder;
  priority(priority: TestPriority): ScenarioBuilder;
  
  // Step definitions
  step(name: string): StepBuilder;
  given(description?: string): GivenStep;
  when(description?: string): WhenStep;
  then(description?: string): ThenStep;
  
  // Flow control
  if(condition: boolean | (() => boolean)): ConditionalScenarioBuilder;
  unless(condition: boolean | (() => boolean)): ConditionalScenarioBuilder;
  parallel(): ParallelStepBuilder;
  sequential(): SequentialStepBuilder;
  
  // Background steps (run before each scenario step)
  background(): BackgroundBuilder;
  
  // Cleanup steps (run after scenario)
  cleanup(): CleanupBuilder;
  
  // Error handling
  onError(handler: ErrorHandler): ScenarioBuilder;
  retryOnFailure(attempts: number): ScenarioBuilder;
  
  // Execution
  execute(): Promise<ScenarioResult>;
}

/**
 * Step Builder for detailed step construction
 */
interface StepBuilder {
  description(desc: string): StepBuilder;
  timeout(ms: number): StepBuilder;
  retries(attempts: number): StepBuilder;
  
  // Pre and post conditions
  precondition(condition: () => boolean): StepBuilder;
  postcondition(condition: (result: any) => boolean): StepBuilder;
  
  // Step implementation
  implementation(impl: () => Promise<any>): StepBuilder;
  httpRequest(request: HttpRequestDefinition): StepBuilder;
  customAction(action: CustomAction): StepBuilder;
  
  // Next step
  nextStep(): StepBuilder;
  endScenario(): ScenarioBuilder;
}
```

### 2. **Data-Driven Testing**

```typescript
/**
 * Data Test Builder Interface
 * 
 * For data-driven and parameterized testing
 */
interface DataTestBuilder {
  // Data source configuration
  data(data: any[]): DataTestExecutor;
  dataFromFile(filePath: string): DataTestExecutor;
  dataFromCsv(filePath: string): DataTestExecutor;
  dataFromJson(filePath: string): DataTestExecutor;
  dataFromDatabase(query: DatabaseQuery): DataTestExecutor;
  dataFromApi(request: HttpRequest): DataTestExecutor;
  
  // Data generation
  generateData(generator: DataGenerator): DataTestExecutor;
  fakerData(config: FakerConfig): DataTestExecutor;
  randomData(config: RandomDataConfig): DataTestExecutor;
  
  // Data filtering and transformation
  filter(predicate: (item: any) => boolean): DataTestBuilder;
  transform(transformer: (item: any) => any): DataTestBuilder;
  limit(count: number): DataTestBuilder;
  shuffle(): DataTestBuilder;
  
  // Parallel execution
  parallel(maxConcurrency?: number): DataTestBuilder;
  sequential(): DataTestBuilder;
}

interface DataTestExecutor {
  // Test template
  given(): DataDrivenGivenStep;
  scenario(template: ScenarioTemplate): DataTestExecutor;
  testCase(template: TestCaseTemplate): DataTestExecutor;
  
  // Execution options
  continueOnFailure(): DataTestExecutor;
  stopOnFirstFailure(): DataTestExecutor;
  collectResults(): DataTestExecutor;
  
  // Result aggregation
  summarize(): DataTestExecutor;
  report(format: ReportFormat): DataTestExecutor;
  
  // Execution
  execute(): Promise<DataTestResult>;
}
```

### 3. **Performance Testing**

```typescript
/**
 * Performance Test Builder Interface
 * 
 * For load testing and performance validation
 */
interface PerformanceTestBuilder {
  // Load configuration
  concurrent(users: number): PerformanceTestBuilder;
  rampUp(duration: string): PerformanceTestBuilder;
  duration(duration: string): PerformanceTestBuilder;
  iterations(count: number): PerformanceTestBuilder;
  
  // Performance thresholds
  responseTime(maxMs: number): PerformanceTestBuilder;
  throughput(minRps: number): PerformanceTestBuilder;
  errorRate(maxPercent: number): PerformanceTestBuilder;
  
  // Test scenario
  scenario(): PerformanceScenarioBuilder;
  request(): PerformanceRequestBuilder;
  
  // Monitoring
  monitor(metric: PerformanceMetric): PerformanceTestBuilder;
  alert(condition: AlertCondition): PerformanceTestBuilder;
  
  // Execution
  execute(): Promise<PerformanceTestResult>;
}

interface PerformanceScenarioBuilder {
  weight(percentage: number): PerformanceScenarioBuilder;
  thinkTime(ms: number): PerformanceScenarioBuilder;
  
  given(): GivenStep;
  
  // Performance-specific assertions
  then(): PerformanceThenStep;
}

interface PerformanceThenStep extends ThenStep {
  // Performance-specific validations
  percentile(percentile: number, maxMs: number): PerformanceThenStep;
  averageResponseTime(maxMs: number): PerformanceThenStep;
  throughputGreaterThan(minRps: number): PerformanceThenStep;
  errorRateLessThan(maxPercent: number): PerformanceThenStep;
  resourceUtilization(metric: ResourceMetric, threshold: number): PerformanceThenStep;
}
```

### 4. **Contract Testing**

```typescript
/**
 * Contract Test Builder Interface
 * 
 * For API contract and schema validation testing
 */
interface ContractTestBuilder {
  // Contract definition
  provider(name: string): ContractTestBuilder;
  consumer(name: string): ContractTestBuilder;
  version(version: string): ContractTestBuilder;
  
  // Contract source
  contractFromFile(filePath: string): ContractTestBuilder;
  contractFromUrl(url: string): ContractTestBuilder;
  openApiSpec(spec: OpenAPISpec): ContractTestBuilder;
  graphqlSchema(schema: GraphQLSchema): ContractTestBuilder;
  
  // Contract validation
  validateRequest(): ContractTestBuilder;
  validateResponse(): ContractTestBuilder;
  validateBoth(): ContractTestBuilder;
  
  // Compatibility testing
  backwardCompatibility(): ContractTestBuilder;
  forwardCompatibility(): ContractTestBuilder;
  
  // Test execution
  given(): GivenStep;
  
  // Contract-specific assertions
  then(): ContractThenStep;
}

interface ContractThenStep extends ThenStep {
  // Contract-specific validations
  contractMatches(contract: Contract): ContractThenStep;
  schemaValid(): ContractThenStep;
  noBreakingChanges(): ContractThenStep;
  compatibleWith(version: string): ContractThenStep;
  
  // Contract management
  saveContract(name: string): ContractThenStep;
  publishContract(registry: ContractRegistry): ContractThenStep;
  versionContract(version: string): ContractThenStep;
}
```

## Implementation Architecture

### 1. **Base Fluent Builder**

```typescript
/**
 * Base Fluent Builder
 * 
 * Provides common functionality for all fluent builders
 */
export abstract class BaseFluentBuilder<T extends BaseFluentBuilder<T>> {
  protected context: FluentContext;
  protected eventBus: IEventBus;
  protected logger: ILogger;

  constructor(context?: FluentContext) {
    this.context = context || new FluentContext();
    this.eventBus = this.context.eventBus;
    this.logger = this.context.logger.createChild({ 
      component: this.constructor.name 
    });
  }

  /**
   * Create a copy of this builder with updated context
   */
  protected clone(updates?: Partial<FluentContext>): T {
    const newContext = this.context.clone(updates);
    return this.createInstance(newContext);
  }

  /**
   * Create new instance of the builder (to be implemented by subclasses)
   */
  protected abstract createInstance(context: FluentContext): T;

  /**
   * Validate current builder state
   */
  protected validate(): ValidationResult {
    const validator = new FluentBuilderValidator();
    return validator.validate(this);
  }

  /**
   * Add description to current step
   */
  public description(desc: string): T {
    return this.clone({ description: desc });
  }

  /**
   * Add tags to current step
   */
  public tag(tag: string): T {
    const newTags = [...this.context.tags, tag];
    return this.clone({ tags: newTags });
  }

  /**
   * Add multiple tags
   */
  public tags(...tags: string[]): T {
    const newTags = [...this.context.tags, ...tags];
    return this.clone({ tags: newTags });
  }

  /**
   * Conditional execution
   */
  public when(
    condition: boolean | (() => boolean), 
    action: (builder: T) => T
  ): T {
    const shouldExecute = typeof condition === 'function' ? condition() : condition;
    
    if (shouldExecute) {
      return action(this as T);
    }
    
    return this as T;
  }

  /**
   * Conditional execution (opposite of when)
   */
  public unless(
    condition: boolean | (() => boolean), 
    action: (builder: T) => T
  ): T {
    const shouldExecute = typeof condition === 'function' ? !condition() : !condition;
    return this.when(shouldExecute, action);
  }
}
```

### 2. **Given Step Implementation**

```typescript
/**
 * Given Step Implementation
 * 
 * Handles test setup and configuration
 */
export class GivenStepImpl extends BaseFluentBuilder<GivenStepImpl> implements GivenStep {
  constructor(context?: FluentContext) {
    super(context);
  }

  protected createInstance(context: FluentContext): GivenStepImpl {
    return new GivenStepImpl(context);
  }

  /**
   * Set base URL for requests
   */
  public baseUrl(url: string): GivenStepImpl {
    this.logger.debug('Setting base URL', { url });
    
    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        baseUrl: url
      }
    });
  }

  /**
   * Add header to request
   */
  public header(name: string, value: string): GivenStepImpl {
    this.logger.debug('Adding header', { name, value: this.sanitizeHeaderValue(name, value) });
    
    const headers = {
      ...this.context.requestConfig.headers,
      [name]: value
    };

    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        headers
      }
    });
  }

  /**
   * Add multiple headers
   */
  public headers(headers: Record<string, string>): GivenStepImpl {
    this.logger.debug('Adding headers', { 
      headerNames: Object.keys(headers),
      count: Object.keys(headers).length 
    });

    const mergedHeaders = {
      ...this.context.requestConfig.headers,
      ...headers
    };

    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        headers: mergedHeaders
      }
    });
  }

  /**
   * Set content type header
   */
  public contentType(type: string): GivenStepImpl {
    return this.header('Content-Type', type);
  }

  /**
   * Set accept header
   */
  public accept(type: string): GivenStepImpl {
    return this.header('Accept', type);
  }

  /**
   * Configure bearer token authentication
   */
  public bearerToken(token: string): GivenStepImpl {
    this.logger.debug('Setting bearer token authentication');
    
    return this.clone({
      authConfig: new BearerTokenAuthConfig(token)
    });
  }

  /**
   * Configure basic authentication
   */
  public basicAuth(username: string, password: string): GivenStepImpl {
    this.logger.debug('Setting basic authentication', { username });
    
    return this.clone({
      authConfig: new BasicAuthConfig(username, password)
    });
  }

  /**
   * Configure OAuth2 authentication
   */
  public oauth2(config: OAuth2Config): GivenStepImpl {
    this.logger.debug('Setting OAuth2 authentication', { 
      clientId: config.clientId,
      tokenEndpoint: config.tokenEndpoint 
    });
    
    return this.clone({
      authConfig: new OAuth2AuthConfig(config)
    });
  }

  /**
   * Set request timeout
   */
  public timeout(ms: number): GivenStepImpl {
    this.logger.debug('Setting timeout', { timeoutMs: ms });
    
    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        timeout: ms
      }
    });
  }

  /**
   * Configure retry behavior
   */
  public retry(attempts: number): GivenStepImpl {
    this.logger.debug('Setting retry attempts', { attempts });
    
    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        retryConfig: {
          ...this.context.requestConfig.retryConfig,
          maxAttempts: attempts
        }
      }
    });
  }

  /**
   * Set variable for template resolution
   */
  public variable(name: string, value: any): GivenStepImpl {
    this.logger.debug('Setting variable', { name, valueType: typeof value });
    
    const variables = {
      ...this.context.variables,
      [name]: value
    };

    return this.clone({ variables });
  }

  /**
   * Set multiple variables
   */
  public variables(vars: Record<string, any>): GivenStepImpl {
    this.logger.debug('Setting variables', { 
      variableNames: Object.keys(vars),
      count: Object.keys(vars).length 
    });

    const variables = {
      ...this.context.variables,
      ...vars
    };

    return this.clone({ variables });
  }

  /**
   * Set path parameter
   */
  public pathParam(name: string, value: any): GivenStepImpl {
    this.logger.debug('Setting path parameter', { name, value });
    
    const pathParams = {
      ...this.context.pathParams,
      [name]: value
    };

    return this.clone({ pathParams });
  }

  /**
   * Set multiple path parameters
   */
  public pathParams(params: Record<string, any>): GivenStepImpl {
    this.logger.debug('Setting path parameters', { 
      paramNames: Object.keys(params),
      count: Object.keys(params).length 
    });

    const pathParams = {
      ...this.context.pathParams,
      ...params
    };

    return this.clone({ pathParams });
  }

  /**
   * Set query parameter
   */
  public queryParam(name: string, value: any): GivenStepImpl {
    this.logger.debug('Setting query parameter', { name, value });
    
    const queryParams = {
      ...this.context.queryParams,
      [name]: value
    };

    return this.clone({ queryParams });
  }

  /**
   * Set multiple query parameters
   */
  public queryParams(params: Record<string, any>): GivenStepImpl {
    this.logger.debug('Setting query parameters', { 
      paramNames: Object.keys(params),
      count: Object.keys(params).length 
    });

    const queryParams = {
      ...this.context.queryParams,
      ...params
    };

    return this.clone({ queryParams });
  }

  /**
   * Set request body
   */
  public body(data: any): GivenStepImpl {
    this.logger.debug('Setting request body', { 
      bodyType: typeof data,
      isObject: typeof data === 'object',
      hasContent: !!data 
    });

    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        body: data
      }
    });
  }

  /**
   * Set JSON body with automatic content type
   */
  public jsonBody(data: any): GivenStepImpl {
    return this.contentType('application/json').body(data);
  }

  /**
   * Set XML body with automatic content type
   */
  public xmlBody(data: string): GivenStepImpl {
    return this.contentType('application/xml').body(data);
  }

  /**
   * Set text body with automatic content type
   */
  public textBody(data: string): GivenStepImpl {
    return this.contentType('text/plain').body(data);
  }

  /**
   * Navigate to When step
   */
  public when(): WhenStepImpl {
    this.logger.debug('Transitioning to When step');
    
    // Validate Given step configuration
    const validation = this.validate();
    if (!validation.isValid) {
      throw new FluentValidationError(`Given step validation failed: ${validation.errors.join(', ')}`);
    }

    return new WhenStepImpl(this.context);
  }

  /**
   * Sanitize header value for logging (hide sensitive data)
   */
  private sanitizeHeaderValue(name: string, value: string): string {
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
    
    if (sensitiveHeaders.includes(name.toLowerCase())) {
      return '***REDACTED***';
    }
    
    return value;
  }
}
```

### 3. **When Step Implementation**

```typescript
/**
 * When Step Implementation
 * 
 * Handles HTTP request execution
 */
export class WhenStepImpl extends BaseFluentBuilder<WhenStepImpl> implements WhenStep {
  constructor(context: FluentContext) {
    super(context);
  }

  protected createInstance(context: FluentContext): WhenStepImpl {
    return new WhenStepImpl(context);
  }

  /**
   * Perform GET request
   */
  public get(url?: string): WhenStepImpl {
    return this.method('GET', url);
  }

  /**
   * Perform POST request
   */
  public post(url?: string, body?: any): WhenStepImpl {
    return this.method('POST', url, body);
  }

  /**
   * Perform PUT request
   */
  public put(url?: string, body?: any): WhenStepImpl {
    return this.method('PUT', url, body);
  }

  /**
   * Perform PATCH request
   */
  public patch(url?: string, body?: any): WhenStepImpl {
    return this.method('PATCH', url, body);
  }

  /**
   * Perform DELETE request
   */
  public delete(url?: string): WhenStepImpl {
    return this.method('DELETE', url);
  }

  /**
   * Perform HEAD request
   */
  public head(url?: string): WhenStepImpl {
    return this.method('HEAD', url);
  }

  /**
   * Perform OPTIONS request
   */
  public options(url?: string): WhenStepImpl {
    return this.method('OPTIONS', url);
  }

  /**
   * Set HTTP method and URL
   */
  public method(method: string, url?: string, body?: any): WhenStepImpl {
    this.logger.debug('Setting HTTP method', { method, url, hasBody: !!body });

    let updates: Partial<FluentContext> = {
      requestConfig: {
        ...this.context.requestConfig,
        method: new HttpMethod(method)
      }
    };

    if (url) {
      updates.requestConfig!.url = url;
    }

    if (body !== undefined) {
      updates.requestConfig!.body = body;
    }

    return this.clone(updates);
  }

  /**
   * Set request URL
   */
  public url(url: string): WhenStepImpl {
    this.logger.debug('Setting request URL', { url });
    
    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        url
      }
    });
  }

  /**
   * Set request path (appended to base URL)
   */
  public path(path: string): WhenStepImpl {
    this.logger.debug('Setting request path', { path });
    
    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        path
      }
    });
  }

  /**
   * Set request body
   */
  public body(data: any): WhenStepImpl {
    this.logger.debug('Setting request body in When step', { 
      bodyType: typeof data,
      hasContent: !!data 
    });

    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        body: data
      }
    });
  }

  /**
   * Add header to request
   */
  public header(name: string, value: string): WhenStepImpl {
    this.logger.debug('Adding header in When step', { name });
    
    const headers = {
      ...this.context.requestConfig.headers,
      [name]: value
    };

    return this.clone({
      requestConfig: {
        ...this.context.requestConfig,
        headers
      }
    });
  }

  /**
   * Execute the HTTP request and transition to Then step
   */
  public async execute(): Promise<ThenStepImpl> {
    this.logger.info('Executing HTTP request');

    try {
      // Validate When step configuration
      const validation = this.validate();
      if (!validation.isValid) {
        throw new FluentValidationError(`When step validation failed: ${validation.errors.join(', ')}`);
      }

      // Build HTTP request
      const request = await this.buildHttpRequest();

      // Execute request through HTTP client
      const httpClient = this.context.httpClientFactory.create(this.context.clientConfig);
      const response = await httpClient.execute(request);

      // Create Then step with response
      const thenContext = this.context.clone({ response });
      return new ThenStepImpl(thenContext);

    } catch (error) {
      this.logger.error('HTTP request execution failed', { 
        error: error.message,
        method: this.context.requestConfig.method?.value,
        url: this.context.requestConfig.url 
      });

      // Create Then step with error for assertion handling
      const thenContext = this.context.clone({ 
        response: null,
        error: error as HttpError 
      });
      return new ThenStepImpl(thenContext);
    }
  }

  /**
   * Navigate to Then step without execution (for pre-built chains)
   */
  public then(): ThenStepImpl {
    this.logger.debug('Transitioning to Then step without execution');
    return new ThenStepImpl(this.context);
  }

  /**
   * Build HTTP request from current context
   */
  private async buildHttpRequest(): Promise<HttpRequest> {
    const requestBuilder = new HttpRequestBuilder();
    
    // Set basic request properties
    const config = this.context.requestConfig;
    
    if (config.method) {
      requestBuilder.method(config.method);
    }
    
    if (config.baseUrl && config.path) {
      requestBuilder.url(`${config.baseUrl}${config.path}`);
    } else if (config.url) {
      requestBuilder.url(config.url);
    } else if (config.baseUrl) {
      requestBuilder.url(config.baseUrl);
    }

    // Add headers
    if (config.headers) {
      Object.entries(config.headers).forEach(([name, value]) => {
        requestBuilder.header(name, value);
      });
    }

    // Add query parameters
    if (this.context.queryParams) {
      Object.entries(this.context.queryParams).forEach(([name, value]) => {
        requestBuilder.queryParam(name, value);
      });
    }

    // Set body
    if (config.body) {
      requestBuilder.body(config.body);
    }

    // Set timeout
    if (config.timeout) {
      requestBuilder.timeout(config.timeout);
    }

    // Apply authentication
    if (this.context.authConfig) {
      await this.context.authConfig.apply(requestBuilder);
    }

    // Resolve templates and variables
    const templateResolver = new TemplateResolver(this.context.variables);
    const request = requestBuilder.build();
    
    return await templateResolver.resolve(request);
  }
}
```

### 4. **Then Step Implementation**

```typescript
/**
 * Then Step Implementation
 * 
 * Handles response validation and assertions
 */
export class ThenStepImpl extends BaseFluentBuilder<ThenStepImpl> implements ThenStep {
  private assertions: Assertion[] = [];

  constructor(context: FluentContext) {
    super(context);
  }

  protected createInstance(context: FluentContext): ThenStepImpl {
    const instance = new ThenStepImpl(context);
    instance.assertions = [...this.assertions];
    return instance;
  }

  /**
   * Assert status code
   */
  public statusCode(code: number): ThenStepImpl {
    this.logger.debug('Adding status code assertion', { expectedCode: code });
    
    const assertion = new StatusCodeAssertion(code);
    return this.addAssertion(assertion);
  }

  /**
   * Assert status code is in range
   */
  public statusCodeIn(codes: number[]): ThenStepImpl {
    this.logger.debug('Adding status code in range assertion', { expectedCodes: codes });
    
    const assertion = new StatusCodeInAssertion(codes);
    return this.addAssertion(assertion);
  }

  /**
   * Assert header value
   */
  public header(name: string, value: string | Matcher): ThenStepImpl {
    this.logger.debug('Adding header assertion', { headerName: name });
    
    const assertion = new HeaderAssertion(name, value);
    return this.addAssertion(assertion);
  }

  /**
   * Assert JSON path value
   */
  public jsonPath(path: string, value: any | Matcher): ThenStepImpl {
    this.logger.debug('Adding JSON path assertion', { path });
    
    const assertion = new JsonPathAssertion(path, value);
    return this.addAssertion(assertion);
  }

  /**
   * Assert JSON schema
   */
  public jsonSchema(schema: any): ThenStepImpl {
    this.logger.debug('Adding JSON schema assertion');
    
    const assertion = new JsonSchemaAssertion(schema);
    return this.addAssertion(assertion);
  }

  /**
   * Assert response time
   */
  public responseTime(maxMs: number): ThenStepImpl {
    this.logger.debug('Adding response time assertion', { maxMs });
    
    const assertion = new ResponseTimeAssertion(maxMs);
    return this.addAssertion(assertion);
  }

  /**
   * Custom assertion
   */
  public assert(assertion: (response: HttpResponse) => boolean): ThenStepImpl {
    this.logger.debug('Adding custom assertion');
    
    const customAssertion = new CustomAssertion(assertion);
    return this.addAssertion(customAssertion);
  }

  /**
   * Extract data from response
   */
  public extract(path: string, variableName: string): ThenStepImpl {
    this.logger.debug('Adding data extraction', { path, variableName });
    
    const extraction = new DataExtraction(path, variableName);
    return this.addExtraction(extraction);
  }

  /**
   * Store response for later use
   */
  public storeResponse(key: string): ThenStepImpl {
    this.logger.debug('Adding response storage', { key });
    
    const storage = new ResponseStorage(key);
    return this.addStorage(storage);
  }

  /**
   * Save response snapshot
   */
  public saveSnapshot(name: string): ThenStepImpl {
    this.logger.debug('Adding snapshot save', { name });
    
    const snapshot = new SnapshotSave(name);
    return this.addSnapshot(snapshot);
  }

  /**
   * Compare response with snapshot
   */
  public compareSnapshot(name: string): ThenStepImpl {
    this.logger.debug('Adding snapshot comparison', { name });
    
    const comparison = new SnapshotComparison(name);
    return this.addSnapshot(comparison);
  }

  /**
   * Chain additional assertions
   */
  public and(): ThenStepImpl {
    return this;
  }

  /**
   * Alias for and()
   */
  public also(): ThenStepImpl {
    return this.and();
  }

  /**
   * Start new Given step
   */
  public given(): GivenStepImpl {
    this.logger.debug('Starting new Given step from Then step');
    
    // Create new context preserving variables and extracted data
    const newContext = new FluentContext({
      variables: this.context.variables,
      eventBus: this.context.eventBus,
      logger: this.context.logger
    });
    
    return new GivenStepImpl(newContext);
  }

  /**
   * Start new When step
   */
  public when(): WhenStepImpl {
    this.logger.debug('Starting new When step from Then step');
    
    return new WhenStepImpl(this.context);
  }

  /**
   * Execute all assertions and return test result
   */
  public async execute(): Promise<TestResult> {
    this.logger.info('Executing Then step assertions', { 
      assertionCount: this.assertions.length 
    });

    try {
      // Check if we have a response to validate
      if (!this.context.response && !this.context.error) {
        throw new FluentExecutionError('No response available for assertion. Did you forget to call execute() on the When step?');
      }

      // Execute all assertions
      const assertionResults: AssertionResult[] = [];
      
      for (const assertion of this.assertions) {
        try {
          const result = await assertion.assert(this.context.response!);
          assertionResults.push(result);
          
          this.logger.debug('Assertion executed', {
            assertionType: assertion.constructor.name,
            passed: result.passed,
            message: result.message
          });

        } catch (error) {
          const failedResult = AssertionResult.failed(assertion, error);
          assertionResults.push(failedResult);
          
          this.logger.warn('Assertion failed with error', {
            assertionType: assertion.constructor.name,
            error: error.message
          });
        }
      }

      // Process extractions
      await this.processExtractions();

      // Process storage operations
      await this.processStorageOperations();

      // Process snapshot operations
      await this.processSnapshotOperations();

      // Create test result
      const testResult = new TestResult({
        testId: this.context.testId,
        status: this.determineTestStatus(assertionResults),
        response: this.context.response,
        assertionResults: assertionResults,
        startTime: this.context.startTime,
        endTime: new Date(),
        variables: this.context.variables
      });

      this.logger.info('Then step execution completed', {
        status: testResult.status,
        passedAssertions: assertionResults.filter(r => r.passed).length,
        failedAssertions: assertionResults.filter(r => !r.passed).length
      });

      return testResult;

    } catch (error) {
      this.logger.error('Then step execution failed', { error: error.message });
      
      return TestResult.failed(this.context.testId!, error, this.context.response);
    }
  }

  /**
   * Add assertion to the chain
   */
  private addAssertion(assertion: Assertion): ThenStepImpl {
    const clone = this.clone();
    clone.assertions.push(assertion);
    return clone;
  }

  /**
   * Add data extraction
   */
  private addExtraction(extraction: DataExtraction): ThenStepImpl {
    const extractions = [...(this.context.extractions || []), extraction];
    return this.clone({ extractions });
  }

  /**
   * Add storage operation
   */
  private addStorage(storage: ResponseStorage): ThenStepImpl {
    const storageOps = [...(this.context.storageOperations || []), storage];
    return this.clone({ storageOperations: storageOps });
  }

  /**
   * Add snapshot operation
   */
  private addSnapshot(snapshot: SnapshotOperation): ThenStepImpl {
    const snapshotOps = [...(this.context.snapshotOperations || []), snapshot];
    return this.clone({ snapshotOperations: snapshotOps });
  }

  /**
   * Process data extractions
   */
  private async processExtractions(): Promise<void> {
    if (!this.context.extractions || !this.context.response) {
      return;
    }

    const extractor = new JsonPathExtractor();
    
    for (const extraction of this.context.extractions) {
      try {
        const value = await extractor.extract(this.context.response.body, extraction.path);
        this.context.variables[extraction.variableName] = value;
        
        this.logger.debug('Data extracted successfully', {
          path: extraction.path,
          variable: extraction.variableName,
          value: value
        });

      } catch (error) {
        this.logger.warn('Data extraction failed', {
          path: extraction.path,
          variable: extraction.variableName,
          error: error.message
        });
      }
    }
  }

  /**
   * Process storage operations
   */
  private async processStorageOperations(): Promise<void> {
    if (!this.context.storageOperations || !this.context.response) {
      return;
    }

    const responseStore = this.context.responseStore;
    
    for (const storage of this.context.storageOperations) {
      try {
        await responseStore.store(storage.key, this.context.response);
        
        this.logger.debug('Response stored successfully', { key: storage.key });

      } catch (error) {
        this.logger.warn('Response storage failed', {
          key: storage.key,
          error: error.message
        });
      }
    }
  }

  /**
   * Process snapshot operations
   */
  private async processSnapshotOperations(): Promise<void> {
    if (!this.context.snapshotOperations || !this.context.response) {
      return;
    }

    const snapshotStore = this.context.snapshotStore;
    
    for (const operation of this.context.snapshotOperations) {
      try {
        if (operation instanceof SnapshotSave) {
          await snapshotStore.save(operation.name, this.context.response.body);
          this.logger.debug('Snapshot saved successfully', { name: operation.name });
          
        } else if (operation instanceof SnapshotComparison) {
          const comparison = await snapshotStore.compare(operation.name, this.context.response.body);
          this.logger.debug('Snapshot comparison completed', { 
            name: operation.name,
            hasChanges: comparison.hasChanges 
          });
        }

      } catch (error) {
        this.logger.warn('Snapshot operation failed', {
          operationType: operation.constructor.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Determine test status from assertion results
   */
  private determineTestStatus(results: AssertionResult[]): TestStatus {
    if (results.length === 0) {
      return TestStatus.PASSED;
    }

    const hasFailures = results.some(r => !r.passed);
    return hasFailures ? TestStatus.FAILED : TestStatus.PASSED;
  }
}
```

## Fluent Context Management

### Fluent Context Class

```typescript
/**
 * Fluent Context
 * 
 * Maintains state throughout the fluent chain
 */
export class FluentContext {
  public readonly testId?: TestGuid;
  public readonly eventBus: IEventBus;
  public readonly logger: ILogger;
  public readonly httpClientFactory: IHttpClientFactory;
  public readonly responseStore: IResponseStore;
  public readonly snapshotStore: ISnapshotStore;
  
  public readonly variables: Record<string, any>;
  public readonly pathParams: Record<string, any>;
  public readonly queryParams: Record<string, any>;
  public readonly tags: string[];
  public readonly description?: string;
  
  public readonly requestConfig: RequestConfig;
  public readonly authConfig?: AuthConfig;
  public readonly clientConfig?: HttpClientConfig;
  
  public readonly response?: HttpResponse;
  public readonly error?: HttpError;
  public readonly startTime: Date;
  
  public readonly extractions?: DataExtraction[];
  public readonly storageOperations?: ResponseStorage[];
  public readonly snapshotOperations?: SnapshotOperation[];

  constructor(props: Partial<FluentContextProps> = {}) {
    this.testId = props.testId || TestGuid.generate();
    this.eventBus = props.eventBus || new InMemoryEventBus();
    this.logger = props.logger || new ConsoleLogger();
    this.httpClientFactory = props.httpClientFactory || new DefaultHttpClientFactory();
    this.responseStore = props.responseStore || new InMemoryResponseStore();
    this.snapshotStore = props.snapshotStore || new FileSnapshotStore();
    
    this.variables = props.variables || {};
    this.pathParams = props.pathParams || {};
    this.queryParams = props.queryParams || {};
    this.tags = props.tags || [];
    this.description = props.description;
    
    this.requestConfig = props.requestConfig || new RequestConfig();
    this.authConfig = props.authConfig;
    this.clientConfig = props.clientConfig;
    
    this.response = props.response;
    this.error = props.error;
    this.startTime = props.startTime || new Date();
    
    this.extractions = props.extractions;
    this.storageOperations = props.storageOperations;
    this.snapshotOperations = props.snapshotOperations;
  }

  /**
   * Create a copy of the context with updates
   */
  public clone(updates: Partial<FluentContextProps> = {}): FluentContext {
    return new FluentContext({
      ...this.toProps(),
      ...updates
    });
  }

  /**
   * Convert to properties object
   */
  private toProps(): FluentContextProps {
    return {
      testId: this.testId,
      eventBus: this.eventBus,
      logger: this.logger,
      httpClientFactory: this.httpClientFactory,
      responseStore: this.responseStore,
      snapshotStore: this.snapshotStore,
      variables: { ...this.variables },
      pathParams: { ...this.pathParams },
      queryParams: { ...this.queryParams },
      tags: [...this.tags],
      description: this.description,
      requestConfig: this.requestConfig.clone(),
      authConfig: this.authConfig,
      clientConfig: this.clientConfig,
      response: this.response,
      error: this.error,
      startTime: this.startTime,
      extractions: this.extractions ? [...this.extractions] : undefined,
      storageOperations: this.storageOperations ? [...this.storageOperations] : undefined,
      snapshotOperations: this.snapshotOperations ? [...this.snapshotOperations] : undefined
    };
  }
}
```

This comprehensive Fluent Interface design provides:

1. **Type-Safe Builder Pattern**: Complete type safety throughout the chain
2. **Rich DSL Vocabulary**: Extensive method library covering all testing scenarios
3. **Immutable Context Management**: Safe state management with cloning
4. **Extensible Architecture**: Plugin points for custom functionality
5. **Performance Optimized**: Lazy evaluation and efficient chaining
6. **Developer-Friendly**: IntelliSense support and discoverable API
7. **Event Integration**: Full integration with event-driven pipeline
8. **Comprehensive Validation**: Built-in validation at each step

The fluent interface serves as the primary entry point for developers while maintaining clean separation from the underlying domain logic and infrastructure concerns.