/**
 * GraphQL Manager for RestifiedTS
 * 
 * This module provides centralized GraphQL client management
 * with support for multiple endpoints, schema management, and query optimization.
 */

import { GraphQLClient, GraphQLQueryBuilder } from './GraphQLClient';
import { GraphQLConfig, RestifiedResponse } from '../../types/RestifiedTypes';
import { HttpClient } from './HttpClient';

/**
 * GraphQL endpoint configuration
 */
export interface GraphQLEndpoint extends GraphQLConfig {
  name: string;
  description?: string;
}

/**
 * GraphQL query template for reusable queries
 */
export interface GraphQLTemplate {
  name: string;
  query: string;
  variables?: Record<string, any>;
  description?: string;
  tags?: string[];
}

/**
 * GraphQL manager for handling multiple clients and operations
 */
export class GraphQLManager {
  private clients: Map<string, GraphQLClient> = new Map();
  private templates: Map<string, GraphQLTemplate> = new Map();
  private activeEndpoint?: string;
  private httpClient?: HttpClient;

  constructor(httpClient?: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Add a GraphQL endpoint
   */
  addEndpoint(config: GraphQLEndpoint): void {
    const client = new GraphQLClient(config, this.httpClient);
    this.clients.set(config.name, client);
    
    // Set as active if it's the first endpoint
    if (!this.activeEndpoint) {
      this.activeEndpoint = config.name;
    }
  }

  /**
   * Remove a GraphQL endpoint
   */
  removeEndpoint(name: string): boolean {
    const removed = this.clients.delete(name);
    
    // If we removed the active endpoint, clear it
    if (this.activeEndpoint === name) {
      this.activeEndpoint = undefined;
      // Set the first available endpoint as active
      const firstEndpoint = this.clients.keys().next().value;
      if (firstEndpoint) {
        this.activeEndpoint = firstEndpoint;
      }
    }
    
    return removed;
  }

  /**
   * Set the active GraphQL endpoint
   */
  setActiveEndpoint(name: string): void {
    if (!this.clients.has(name)) {
      throw new Error(`GraphQL endpoint '${name}' not found`);
    }
    this.activeEndpoint = name;
  }

  /**
   * Get the active GraphQL client
   */
  getActiveClient(): GraphQLClient | undefined {
    if (!this.activeEndpoint) {
      return undefined;
    }
    return this.clients.get(this.activeEndpoint);
  }

  /**
   * Get a specific GraphQL client by name
   */
  getClient(name: string): GraphQLClient | undefined {
    return this.clients.get(name);
  }

  /**
   * Get all registered endpoints
   */
  getEndpoints(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Execute a query using the active endpoint
   */
  async query<T = any>(
    query: string,
    variables?: Record<string, any>,
    options?: {
      endpoint?: string;
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<RestifiedResponse> {
    const client = this.getClientForOperation(options?.endpoint);
    return client.query<T>(query, variables, options);
  }

  /**
   * Execute a mutation using the active endpoint
   */
  async mutation<T = any>(
    mutation: string,
    variables?: Record<string, any>,
    options?: {
      endpoint?: string;
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<RestifiedResponse> {
    const client = this.getClientForOperation(options?.endpoint);
    return client.mutation<T>(mutation, variables, options);
  }

  /**
   * Execute a subscription using the active endpoint
   */
  async subscription<T = any>(
    subscription: string,
    variables?: Record<string, any>,
    options?: {
      endpoint?: string;
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<RestifiedResponse> {
    const client = this.getClientForOperation(options?.endpoint);
    return client.subscription<T>(subscription, variables, options);
  }

  /**
   * Add a query template for reuse
   */
  addTemplate(template: GraphQLTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Remove a query template
   */
  removeTemplate(name: string): boolean {
    return this.templates.delete(name);
  }

  /**
   * Get a query template
   */
  getTemplate(name: string): GraphQLTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * List all template names
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Execute a query template
   */
  async executeTemplate(
    templateName: string,
    variables?: Record<string, any>,
    options?: {
      endpoint?: string;
      operationName?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<RestifiedResponse> {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`GraphQL template '${templateName}' not found`);
    }

    const mergedVariables = { ...template.variables, ...variables };
    
    return this.query(template.query, mergedVariables, options);
  }

  /**
   * Perform schema introspection on an endpoint
   */
  async introspect(endpointName?: string): Promise<any> {
    const client = this.getClientForOperation(endpointName);
    return client.introspect();
  }

  /**
   * Get schema for an endpoint
   */
  async getSchema(endpointName?: string): Promise<any> {
    const client = this.getClientForOperation(endpointName);
    return client.getSchema();
  }

  /**
   * Validate a GraphQL query
   */
  validateQuery(query: string, endpointName?: string): { valid: boolean; errors: string[] } {
    const client = this.getClientForOperation(endpointName);
    return client.validateQuery(query);
  }

  /**
   * Analyze a GraphQL query
   */
  analyzeQuery(query: string, endpointName?: string): ReturnType<GraphQLClient['analyzeQuery']> {
    const client = this.getClientForOperation(endpointName);
    return client.analyzeQuery(query);
  }

  /**
   * Create a query builder for an endpoint
   */
  queryBuilder(endpointName?: string): GraphQLQueryBuilder {
    const client = this.getClientForOperation(endpointName);
    return client.queryBuilder();
  }

  /**
   * Batch execute multiple queries
   */
  async batchExecute(
    operations: Array<{
      query: string;
      variables?: Record<string, any>;
      operationName?: string;
      endpoint?: string;
    }>
  ): Promise<RestifiedResponse[]> {
    const promises = operations.map(op => 
      this.query(op.query, op.variables, {
        endpoint: op.endpoint,
        operationName: op.operationName
      })
    );

    return Promise.all(promises);
  }

  /**
   * Import query templates from an object
   */
  importTemplates(templates: Record<string, Omit<GraphQLTemplate, 'name'>>): void {
    Object.entries(templates).forEach(([name, template]) => {
      this.addTemplate({ name, ...template });
    });
  }

  /**
   * Export all templates
   */
  exportTemplates(): Record<string, GraphQLTemplate> {
    const exported: Record<string, GraphQLTemplate> = {};
    this.templates.forEach((template, name) => {
      exported[name] = { ...template };
    });
    return exported;
  }

  /**
   * Find templates by tag
   */
  findTemplatesByTag(tag: string): GraphQLTemplate[] {
    const results: GraphQLTemplate[] = [];
    this.templates.forEach(template => {
      if (template.tags && template.tags.includes(tag)) {
        results.push({ ...template });
      }
    });
    return results;
  }

  /**
   * Get manager statistics
   */
  getStats(): {
    endpointCount: number;
    templateCount: number;
    activeEndpoint?: string;
    endpoints: Array<{
      name: string;
      endpoint: string;
      introspectionEnabled: boolean;
    }>;
  } {
    const endpoints: Array<{ name: string; endpoint: string; introspectionEnabled: boolean }> = [];
    
    this.clients.forEach((client, name) => {
      const config = client.getConfig();
      endpoints.push({
        name,
        endpoint: config.endpoint,
        introspectionEnabled: config.introspection || false
      });
    });

    return {
      endpointCount: this.clients.size,
      templateCount: this.templates.size,
      activeEndpoint: this.activeEndpoint,
      endpoints
    };
  }

  /**
   * Clear all endpoints and templates
   */
  clear(): void {
    this.clients.clear();
    this.templates.clear();
    this.activeEndpoint = undefined;
  }

  /**
   * Create common query templates
   */
  createCommonTemplates(): void {
    // Introspection query template
    this.addTemplate({
      name: 'introspection',
      query: `
        query IntrospectionQuery {
          __schema {
            queryType { name }
            mutationType { name }
            subscriptionType { name }
            types {
              kind
              name
              description
            }
          }
        }
      `,
      description: 'Basic schema introspection query',
      tags: ['introspection', 'schema']
    });

    // Health check template
    this.addTemplate({
      name: 'health',
      query: `
        query HealthCheck {
          __schema {
            queryType {
              name
            }
          }
        }
      `,
      description: 'Simple health check query',
      tags: ['health', 'monitoring']
    });

    // Type information template
    this.addTemplate({
      name: 'typeInfo',
      query: `
        query TypeInfo($typeName: String!) {
          __type(name: $typeName) {
            name
            kind
            description
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      `,
      variables: { typeName: 'Query' },
      description: 'Get information about a specific type',
      tags: ['introspection', 'type']
    });
  }

  /**
   * Get the appropriate client for an operation
   */
  private getClientForOperation(endpointName?: string): GraphQLClient {
    const targetEndpoint = endpointName || this.activeEndpoint;
    
    if (!targetEndpoint) {
      throw new Error('No active GraphQL endpoint. Add an endpoint first.');
    }

    const client = this.clients.get(targetEndpoint);
    if (!client) {
      throw new Error(`GraphQL endpoint '${targetEndpoint}' not found`);
    }

    return client;
  }
}

export default GraphQLManager;