/**
 * When Step Implementation for RestifiedTS
 * 
 * This module implements the "When" step of the fluent DSL, providing methods for:
 * - HTTP method execution (GET, POST, PUT, DELETE, etc.)
 * - GraphQL operations
 * - WebSocket connections
 * - Request execution with proper error handling
 */

import { Method, AxiosRequestConfig } from 'axios';
import { IWhenStep, IThenStep, RestifiedResponse, RestifiedError } from '../../types/RestifiedTypes';
import { ThenStep } from './ThenStep';
import { VariableStore } from '../stores/VariableStore';
import { HttpClient } from '../clients/HttpClient';
import { Config } from '../config/Config';

export class WhenStep implements IWhenStep {
  private requestConfig: AxiosRequestConfig;
  private variableStore: VariableStore;
  private httpClient: HttpClient;
  private config: Config;
  private clientName?: string;
  private executedResponse?: RestifiedResponse;

  constructor(
    requestConfig: AxiosRequestConfig,
    variableStore: VariableStore,
    httpClient: HttpClient,
    config: Config,
    clientName?: string
  ) {
    this.requestConfig = requestConfig;
    this.variableStore = variableStore;
    this.httpClient = httpClient;
    this.config = config;
    this.clientName = clientName;
  }

  /**
   * Execute GET request
   */
  get(path?: string): IWhenStep {
    this.requestConfig.method = 'GET';
    if (path) {
      this.requestConfig.url = this.resolvePath(path);
    }
    return this;
  }

  /**
   * Execute POST request
   */
  post(path?: string): IWhenStep {
    this.requestConfig.method = 'POST';
    if (path) {
      this.requestConfig.url = this.resolvePath(path);
    }
    return this;
  }

  /**
   * Execute PUT request
   */
  put(path?: string): IWhenStep {
    this.requestConfig.method = 'PUT';
    if (path) {
      this.requestConfig.url = this.resolvePath(path);
    }
    return this;
  }

  /**
   * Execute PATCH request
   */
  patch(path?: string): IWhenStep {
    this.requestConfig.method = 'PATCH';
    if (path) {
      this.requestConfig.url = this.resolvePath(path);
    }
    return this;
  }

  /**
   * Execute DELETE request
   */
  delete(path?: string): IWhenStep {
    this.requestConfig.method = 'DELETE';
    if (path) {
      this.requestConfig.url = this.resolvePath(path);
    }
    return this;
  }

  /**
   * Execute HEAD request
   */
  head(path?: string): IWhenStep {
    this.requestConfig.method = 'HEAD';
    if (path) {
      this.requestConfig.url = this.resolvePath(path);
    }
    return this;
  }

  /**
   * Execute OPTIONS request
   */
  options(path?: string): IWhenStep {
    this.requestConfig.method = 'OPTIONS';
    if (path) {
      this.requestConfig.url = this.resolvePath(path);
    }
    return this;
  }

  /**
   * Execute request with custom method
   */
  request(method: Method, path?: string): IWhenStep {
    this.requestConfig.method = method;
    if (path) {
      this.requestConfig.url = this.resolvePath(path);
    }
    return this;
  }

  /**
   * Execute GraphQL request
   */
  graphql(query: string, variables?: Record<string, any>): IWhenStep {
    this.requestConfig.method = 'POST';
    
    // Resolve GraphQL endpoint
    const graphqlEndpoint = this.config.get('graphql.endpoint', '/graphql');
    this.requestConfig.url = this.resolvePath(graphqlEndpoint);
    
    // Set content type
    this.requestConfig.headers = {
      ...this.requestConfig.headers,
      'Content-Type': 'application/json'
    };
    
    // Set GraphQL body
    this.requestConfig.data = {
      query: this.variableStore.resolve(query),
      variables: variables ? this.variableStore.resolveObject(variables) : undefined
    };
    
    return this;
  }

  /**
   * Execute GraphQL query
   */
  graphqlQuery(query: string, variables?: Record<string, any>): IWhenStep {
    return this.graphql(query, variables);
  }

  /**
   * Execute GraphQL mutation
   */
  graphqlMutation(mutation: string, variables?: Record<string, any>): IWhenStep {
    return this.graphql(mutation, variables);
  }

  /**
   * Execute WebSocket connection
   */
  websocket(path?: string): IWhenStep {
    // Mark this as a WebSocket operation
    (this.requestConfig as any).isWebSocket = true;
    
    if (path) {
      this.requestConfig.url = this.resolvePath(path);
    }
    
    return this;
  }

  /**
   * Wait for specified time before proceeding
   */
  wait(ms: number): Promise<IWhenStep> {
    if (ms < 0) {
      throw new Error('Wait time cannot be negative');
    }
    
    return new Promise(resolve => {
      setTimeout(() => resolve(this), ms);
    });
  }

  /**
   * Execute the request and return ThenStep
   */
  async execute(): Promise<IThenStep> {
    try {
      // Resolve the URL with path parameters
      if (this.requestConfig.url) {
        this.requestConfig.url = this.resolvePath(this.requestConfig.url);
      }
      
      // Execute the request
      const response = await this.httpClient.request(this.requestConfig);
      this.executedResponse = response;
      
      // Return ThenStep with the response
      return new ThenStep(
        response,
        this.variableStore,
        this.config
      );
      
    } catch (error) {
      // Create ThenStep with error for assertion handling
      return new ThenStep(
        undefined,
        this.variableStore,
        this.config,
        error as RestifiedError
      );
    }
  }

  /**
   * Transition to then step (requires prior execution)
   */
  then(): IThenStep {
    if (!this.executedResponse) {
      throw new Error('Request has not been executed. Call execute() first or use the async execute() method.');
    }
    
    return new ThenStep(
      this.executedResponse,
      this.variableStore,
      this.config
    );
  }

  /**
   * Resolve path with variables and path parameters
   */
  private resolvePath(path: string): string {
    let resolvedPath = this.variableStore.resolve(path);
    
    // Replace path parameters like {id} with actual values
    resolvedPath = resolvedPath.replace(/\{([^}]+)\}/g, (match, paramName) => {
      const value = this.variableStore.get(`path.${paramName}`);
      return value !== undefined ? String(value) : match;
    });
    
    return resolvedPath;
  }
}

export default WhenStep;