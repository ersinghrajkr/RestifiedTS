/**
 * GraphQL Client for RestifiedTS
 * 
 * This module provides GraphQL query and mutation execution capabilities
 * with support for variables, introspection, and schema validation.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { GraphQLConfig, RestifiedResponse, RestifiedRequest, RestifiedError } from '../../types/RestifiedTypes';
import { HttpClient } from './HttpClient';

/**
 * GraphQL operation types
 */
export interface GraphQLOperation {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

/**
 * GraphQL response format
 */
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: Record<string, any>;
  }>;
  extensions?: Record<string, any>;
}

/**
 * GraphQL schema introspection types
 */
interface IntrospectionResult {
  data?: {
    __schema: {
      types: Array<{
        name: string;
        kind: string;
        description?: string;
        fields?: Array<{
          name: string;
          type: any;
          description?: string;
        }>;
      }>;
      queryType: { name: string };
      mutationType?: { name: string };
      subscriptionType?: { name: string };
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * GraphQL client implementation
 */
export class GraphQLClient {
  private httpClient: HttpClient;
  private config: Required<GraphQLConfig>;
  private schema?: IntrospectionResult;

  constructor(config: GraphQLConfig, httpClient?: HttpClient) {
    this.config = {
      headers: {},
      introspection: false,
      defaultVariables: {},
      httpClient: undefined,
      ...config,
      endpoint: config.endpoint || '/graphql'
    };

    this.httpClient = httpClient || new HttpClient({
      baseURL: this.extractBaseURL(this.config.endpoint),
      timeout: 30000
    });
  }

  /**
   * Execute a GraphQL query
   */
  async query<T = any>(
    query: string, 
    variables?: Record<string, any>,
    options?: {
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<RestifiedResponse> {
    return this.execute({
      query,
      variables: { ...this.config.defaultVariables, ...variables },
      operationName: options?.operationName
    }, options);
  }

  /**
   * Execute a GraphQL mutation
   */
  async mutation<T = any>(
    mutation: string,
    variables?: Record<string, any>,
    options?: {
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<RestifiedResponse> {
    return this.execute({
      query: mutation,
      variables: { ...this.config.defaultVariables, ...variables },
      operationName: options?.operationName
    }, options);
  }

  /**
   * Execute a GraphQL subscription (returns initial response, actual subscription would need WebSocket)
   */
  async subscription<T = any>(
    subscription: string,
    variables?: Record<string, any>,
    options?: {
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<RestifiedResponse> {
    console.warn('Subscription execution via HTTP - for real-time subscriptions use WebSocket');
    return this.execute({
      query: subscription,
      variables: { ...this.config.defaultVariables, ...variables },
      operationName: options?.operationName
    }, options);
  }

  /**
   * Execute a raw GraphQL operation
   */
  async execute(
    operation: GraphQLOperation,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<RestifiedResponse> {
    const startTime = Date.now();
    
    try {
      const requestConfig: AxiosRequestConfig = {
        method: 'POST',
        url: this.getEndpointPath(),
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...options?.headers
        },
        data: {
          query: operation.query,
          variables: operation.variables || {},
          ...(operation.operationName && { operationName: operation.operationName })
        },
        timeout: options?.timeout
      };

      const response = await this.httpClient.request(requestConfig);
      
      // Validate GraphQL response format
      this.validateGraphQLResponse(response.data);
      
      return response;
      
    } catch (error) {
      const endTime = Date.now();
      throw this.createGraphQLError(error, endTime - startTime);
    }
  }

  /**
   * Perform schema introspection
   */
  async introspect(): Promise<IntrospectionResult> {
    if (!this.config.introspection) {
      throw new Error('Schema introspection is disabled. Enable it in the GraphQL client configuration.');
    }

    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
        }
      }

      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }

      fragment InputValue on __InputValue {
        name
        description
        type { ...TypeRef }
        defaultValue
      }

      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await this.execute({ query: introspectionQuery });
    this.schema = response.data as IntrospectionResult;
    
    return this.schema;
  }

  /**
   * Get cached schema or perform introspection
   */
  async getSchema(): Promise<IntrospectionResult | null> {
    if (this.schema) {
      return this.schema;
    }

    if (this.config.introspection) {
      return await this.introspect();
    }

    return null;
  }

  /**
   * Validate a GraphQL query syntax (basic validation)
   */
  validateQuery(query: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic syntax validation
    if (!query.trim()) {
      errors.push('Query cannot be empty');
    }

    // Check for basic GraphQL keywords
    const hasOperation = /^\s*(query|mutation|subscription|fragment|\{)/.test(query.trim());
    if (!hasOperation) {
      errors.push('Query must start with a valid GraphQL operation or be a shorthand query');
    }

    // Check for balanced braces
    const openBraces = (query.match(/\{/g) || []).length;
    const closeBraces = (query.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced braces in query');
    }

    // Check for balanced parentheses
    const openParens = (query.match(/\(/g) || []).length;
    const closeParens = (query.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unbalanced parentheses in query');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse and analyze a GraphQL query
   */
  analyzeQuery(query: string): {
    operationType: 'query' | 'mutation' | 'subscription' | 'fragment' | 'unknown';
    operationName?: string;
    fields: string[];
    variables: string[];
  } {
    const trimmed = query.trim();
    
    // Determine operation type
    let operationType: 'query' | 'mutation' | 'subscription' | 'fragment' | 'unknown' = 'unknown';
    if (trimmed.startsWith('query')) operationType = 'query';
    else if (trimmed.startsWith('mutation')) operationType = 'mutation';
    else if (trimmed.startsWith('subscription')) operationType = 'subscription';
    else if (trimmed.startsWith('fragment')) operationType = 'fragment';
    else if (trimmed.startsWith('{')) operationType = 'query'; // Shorthand query

    // Extract operation name
    const operationNameMatch = trimmed.match(/^(query|mutation|subscription)\s+(\w+)/);
    const operationName = operationNameMatch ? operationNameMatch[2] : undefined;

    // Extract field names (basic extraction)
    const fieldMatches = trimmed.match(/(\w+)(?:\s*\([^)]*\))?\s*(?:\{|$)/g) || [];
    const fields = fieldMatches
      .map(match => match.replace(/[\{\(\s].*/g, '').trim())
      .filter(field => !['query', 'mutation', 'subscription', 'fragment'].includes(field));

    // Extract variable names
    const variableMatches = trimmed.match(/\$(\w+)/g) || [];
    const variables = variableMatches.map(match => match.substring(1));

    return {
      operationType,
      operationName,
      fields: [...new Set(fields)], // Remove duplicates
      variables: [...new Set(variables)] // Remove duplicates
    };
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<GraphQLConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update endpoint if changed
    if (newConfig.endpoint) {
      this.httpClient.updateConfig({ 
        baseURL: this.extractBaseURL(newConfig.endpoint) 
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<GraphQLConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Create a query builder for fluent query construction
   */
  queryBuilder(): GraphQLQueryBuilder {
    return new GraphQLQueryBuilder(this);
  }

  /**
   * Extract base URL from endpoint
   */
  private extractBaseURL(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      const url = new URL(endpoint);
      return `${url.protocol}//${url.host}`;
    }
    return ''; // Relative endpoint
  }

  /**
   * Get the endpoint path
   */
  private getEndpointPath(): string {
    if (this.config.endpoint.startsWith('http')) {
      const url = new URL(this.config.endpoint);
      return url.pathname + url.search;
    }
    return this.config.endpoint;
  }

  /**
   * Validate GraphQL response format
   */
  private validateGraphQLResponse(data: any): void {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid GraphQL response: Response must be an object');
    }

    if (!('data' in data) && !('errors' in data)) {
      throw new Error('Invalid GraphQL response: Response must contain either "data" or "errors" field');
    }

    if ('errors' in data && !Array.isArray(data.errors)) {
      throw new Error('Invalid GraphQL response: "errors" field must be an array');
    }
  }

  /**
   * Create a GraphQL-specific error
   */
  private createGraphQLError(error: any, responseTime: number): RestifiedError {
    const graphqlError = new Error() as RestifiedError;
    
    if (error.response) {
      // GraphQL errors in response
      const data = error.response.data as GraphQLResponse;
      if (data.errors && data.errors.length > 0) {
        graphqlError.message = `GraphQL Error: ${data.errors.map(e => e.message).join(', ')}`;
      } else {
        graphqlError.message = `HTTP Error: ${error.response.status} ${error.response.statusText}`;
      }
      graphqlError.response = error.response;
    } else if (error.request) {
      graphqlError.message = 'GraphQL Request Error: No response received';
      graphqlError.request = error.request;
    } else {
      graphqlError.message = `GraphQL Client Error: ${error.message}`;
    }

    graphqlError.name = 'GraphQLError';
    graphqlError.code = error.code;
    
    return graphqlError;
  }
}

/**
 * GraphQL Query Builder for fluent query construction
 */
export class GraphQLQueryBuilder {
  private client: GraphQLClient;
  private operationType: 'query' | 'mutation' | 'subscription' = 'query';
  private operationName?: string;
  private fields: string[] = [];
  private variables: Record<string, any> = {};
  private variableDefinitions: Record<string, string> = {};

  constructor(client: GraphQLClient) {
    this.client = client;
  }

  /**
   * Set operation type to query
   */
  query(name?: string): GraphQLQueryBuilder {
    this.operationType = 'query';
    this.operationName = name;
    return this;
  }

  /**
   * Set operation type to mutation
   */
  mutation(name?: string): GraphQLQueryBuilder {
    this.operationType = 'mutation';
    this.operationName = name;
    return this;
  }

  /**
   * Set operation type to subscription
   */
  subscription(name?: string): GraphQLQueryBuilder {
    this.operationType = 'subscription';
    this.operationName = name;
    return this;
  }

  /**
   * Add a field to the query
   */
  field(name: string, args?: Record<string, any>, subfields?: string[]): GraphQLQueryBuilder {
    let fieldString = name;
    
    if (args && Object.keys(args).length > 0) {
      const argStrings = Object.entries(args).map(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('$')) {
          return `${key}: ${value}`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      });
      fieldString += `(${argStrings.join(', ')})`;
    }
    
    if (subfields && subfields.length > 0) {
      fieldString += ` { ${subfields.join(' ')} }`;
    }
    
    this.fields.push(fieldString);
    return this;
  }

  /**
   * Add a variable
   */
  variable(name: string, type: string, value: any): GraphQLQueryBuilder {
    this.variableDefinitions[name] = type;
    this.variables[name] = value;
    return this;
  }

  /**
   * Add a context variable (alias for variable method)
   */
  contextVariable(name: string, type: string, value: any): GraphQLQueryBuilder {
    return this.variable(name, type, value);
  }

  /**
   * Build the GraphQL query string
   */
  build(): string {
    let query = this.operationType;
    
    if (this.operationName) {
      query += ` ${this.operationName}`;
    }
    
    if (Object.keys(this.variableDefinitions).length > 0) {
      const varDefs = Object.entries(this.variableDefinitions)
        .map(([name, type]) => `$${name}: ${type}`)
        .join(', ');
      query += `(${varDefs})`;
    }
    
    query += ` { ${this.fields.join(' ')} }`;
    
    return query;
  }

  /**
   * Execute the built query
   */
  async execute(): Promise<RestifiedResponse> {
    const queryString = this.build();
    
    switch (this.operationType) {
      case 'query':
        return this.client.query(queryString, this.variables, { operationName: this.operationName });
      case 'mutation':
        return this.client.mutation(queryString, this.variables, { operationName: this.operationName });
      case 'subscription':
        return this.client.subscription(queryString, this.variables, { operationName: this.operationName });
      default:
        throw new Error(`Unsupported operation type: ${this.operationType}`);
    }
  }
}

export default GraphQLClient;