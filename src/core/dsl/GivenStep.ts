/**
 * Given Step Implementation for RestifiedTS
 * 
 * This module implements the "Given" step of the fluent DSL, providing methods for:
 * - Request configuration (baseURL, timeout, headers)
 * - Authentication setup
 * - Request body configuration
 * - Parameter management
 * - Variable management
 * - SSL and proxy configuration
 */

import { IGivenStep, IWhenStep, RestifiedConfig } from '../../types/RestifiedTypes';
import { WhenStep } from './WhenStep';
import { VariableStore } from '../stores/VariableStore';
import { HttpClient } from '../clients/HttpClient';
import { Config } from '../config/Config';
import { AxiosRequestConfig } from 'axios';

export class GivenStep implements IGivenStep {
  private requestConfig: AxiosRequestConfig = {};
  private variableStore: VariableStore;
  private httpClient: HttpClient;
  private config: Config;
  private clientName?: string;

  constructor(
    variableStore: VariableStore,
    httpClient: HttpClient,
    config: Config
  ) {
    this.variableStore = variableStore;
    this.httpClient = httpClient;
    this.config = config;
  }

  /**
   * Set base URL for the request
   */
  baseURL(url: string): IGivenStep {
    this.requestConfig.baseURL = this.variableStore.resolve(url);
    return this;
  }

  /**
   * Set timeout for the request
   */
  timeout(ms: number): IGivenStep {
    this.requestConfig.timeout = ms;
    return this;
  }

  /**
   * Set HTTP client to use
   */
  client(clientName: string): IGivenStep {
    this.clientName = clientName;
    return this;
  }

  /**
   * Set a single header
   */
  header(name: string, value: string): IGivenStep {
    if (!this.requestConfig.headers) {
      this.requestConfig.headers = {};
    }
    this.requestConfig.headers[name] = this.variableStore.resolve(value);
    return this;
  }

  /**
   * Set multiple headers
   */
  headers(headers: Record<string, string>): IGivenStep {
    if (!this.requestConfig.headers) {
      this.requestConfig.headers = {};
    }
    
    Object.entries(headers).forEach(([key, value]) => {
      this.requestConfig.headers![key] = this.variableStore.resolve(value);
    });
    
    return this;
  }

  /**
   * Set Content-Type header
   */
  contentType(contentType: string): IGivenStep {
    return this.header('Content-Type', contentType);
  }

  /**
   * Set Accept header
   */
  accept(accept: string): IGivenStep {
    return this.header('Accept', accept);
  }

  /**
   * Set User-Agent header
   */
  userAgent(userAgent: string): IGivenStep {
    return this.header('User-Agent', userAgent);
  }

  /**
   * Set authentication configuration
   */
  auth(auth: RestifiedConfig['auth']): IGivenStep {
    // Store auth config separately since Axios auth format is different
    if (auth?.type === 'basic' && auth.username && auth.password) {
      this.requestConfig.auth = {
        username: auth.username,
        password: auth.password
      };
    } else {
      // For other auth types, we'll handle them in the HTTP client
      (this.requestConfig as any).customAuth = auth;
    }
    return this;
  }

  /**
   * Set basic authentication
   */
  basicAuth(username: string, password: string): IGivenStep {
    this.requestConfig.auth = {
      username: this.variableStore.resolve(username),
      password: this.variableStore.resolve(password)
    };
    return this;
  }

  /**
   * Set bearer token authentication
   */
  bearerToken(token: string): IGivenStep {
    const resolvedToken = this.variableStore.resolve(token);
    return this.header('Authorization', `Bearer ${resolvedToken}`);
  }

  /**
   * Set API key authentication
   */
  apiKey(key: string, headerName: string = 'X-API-Key'): IGivenStep {
    const resolvedKey = this.variableStore.resolve(key);
    return this.header(headerName, resolvedKey);
  }

  /**
   * Set request body
   */
  body(body: any): IGivenStep {
    this.requestConfig.data = this.variableStore.resolveObject(body);
    return this;
  }

  /**
   * Set JSON request body
   */
  jsonBody(body: any): IGivenStep {
    this.requestConfig.data = this.variableStore.resolveObject(body);
    this.contentType('application/json');
    return this;
  }

  /**
   * Set form-encoded request body
   */
  formBody(body: Record<string, any>): IGivenStep {
    const formData = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
      formData.append(key, this.variableStore.resolve(String(value)));
    });
    
    this.requestConfig.data = formData;
    this.contentType('application/x-www-form-urlencoded');
    return this;
  }

  /**
   * Set multipart form data body
   */
  multipartBody(body: FormData): IGivenStep {
    this.requestConfig.data = body;
    this.contentType('multipart/form-data');
    return this;
  }

  /**
   * Set a single query parameter
   */
  queryParam(name: string, value: any): IGivenStep {
    if (!this.requestConfig.params) {
      this.requestConfig.params = {};
    }
    this.requestConfig.params[name] = this.variableStore.resolve(String(value));
    return this;
  }

  /**
   * Set multiple query parameters
   */
  queryParams(params: Record<string, any>): IGivenStep {
    if (!this.requestConfig.params) {
      this.requestConfig.params = {};
    }
    
    Object.entries(params).forEach(([key, value]) => {
      this.requestConfig.params![key] = this.variableStore.resolve(String(value));
    });
    
    return this;
  }

  /**
   * Set a single path parameter
   */
  pathParam(name: string, value: any): IGivenStep {
    this.variableStore.setLocal(`path.${name}`, value);
    return this;
  }

  /**
   * Set multiple path parameters
   */
  pathParams(params: Record<string, any>): IGivenStep {
    Object.entries(params).forEach(([key, value]) => {
      this.variableStore.setLocal(`path.${key}`, value);
    });
    return this;
  }

  /**
   * Set a context variable that can be used in templates within this request chain
   */
  contextVariable(name: string, value: any): IGivenStep {
    this.variableStore.setLocal(name, value);
    return this;
  }

  /**
   * Set multiple context variables at once
   */
  contextVariables(variables: Record<string, any>): IGivenStep {
    this.variableStore.setLocalBatch(variables);
    return this;
  }

  /**
   * Add a file to the request
   */
  file(name: string, filePath: string): IGivenStep {
    // TODO: Implement file upload functionality
    // This would require integrating with FormData and file system
    throw new Error('File upload not yet implemented');
  }

  /**
   * Add multiple files to the request
   */
  files(files: Array<{ name: string; filePath: string }>): IGivenStep {
    // TODO: Implement multiple file upload functionality
    throw new Error('Multiple file upload not yet implemented');
  }

  /**
   * Set request configuration
   */
  setConfig(config: Partial<RestifiedConfig>): IGivenStep {
    // Merge the provided config with the current request config
    Object.assign(this.requestConfig, config);
    return this;
  }

  /**
   * Set proxy configuration
   */
  proxy(proxy: RestifiedConfig['proxy']): IGivenStep {
    this.requestConfig.proxy = proxy;
    return this;
  }

  /**
   * Set SSL configuration
   */
  ssl(ssl: RestifiedConfig['ssl']): IGivenStep {
    // SSL configuration would be applied to the HTTP client
    this.httpClient.updateConfig({ ssl });
    return this;
  }

  /**
   * Enable/disable request validation
   */
  validateRequest(enabled: boolean): IGivenStep {
    // TODO: Implement request validation
    return this;
  }

  /**
   * Set request schema for validation
   */
  schema(schema: any): IGivenStep {
    // TODO: Implement schema validation
    return this;
  }

  /**
   * Log a message
   */
  log(message: string): IGivenStep {
    const resolvedMessage = this.variableStore.resolve(message);
    console.log(`[RestifiedTS] ${resolvedMessage}`);
    return this;
  }

  /**
   * Add a tag to the request
   */
  tag(tag: string): IGivenStep {
    // TODO: Implement request tagging
    return this;
  }

  /**
   * Add multiple tags to the request
   */
  tags(tags: string[]): IGivenStep {
    // TODO: Implement multiple request tagging
    return this;
  }

  /**
   * Wait for specified time before proceeding
   */
  wait(ms: number): Promise<IGivenStep> {
    if (ms < 0) {
      throw new Error('Wait time cannot be negative');
    }
    
    return new Promise(resolve => {
      setTimeout(() => resolve(this), ms);
    });
  }

  /**
   * Transition to when step
   */
  when(): IWhenStep {
    return new WhenStep(
      this.requestConfig,
      this.variableStore,
      this.httpClient,
      this.config,
      this.clientName
    );
  }
}

export default GivenStep;