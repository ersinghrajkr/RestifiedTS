/**
 * Client Module Exports for RestifiedTS
 * 
 * This module exports all client-related classes and utilities.
 */

// Client classes
export { HttpClient } from './HttpClient';
export { GraphQLClient, GraphQLQueryBuilder } from './GraphQLClient';
export { GraphQLManager } from './GraphQLManager';
export { WebSocketClient } from './WebSocketClient';
export { WebSocketManager } from './WebSocketManager';
export { ClientManager } from './ClientManager';

// Re-export types for convenience
export type {
  GraphQLConfig,
  HttpClientConfig,
  WebSocketConfig
} from '../../types/RestifiedTypes';

// GraphQL types
export type { GraphQLEndpoint } from './GraphQLManager';

// WebSocket types
export type { 
  WebSocketConnection, 
  WebSocketScenario, 
  WebSocketStep, 
  WebSocketTestResult 
} from './WebSocketManager';
export type { 
  WebSocketMessage, 
  WebSocketConnectionInfo, 
  MessageMatcher 
} from './WebSocketClient';

// Default export
export { HttpClient as default } from './HttpClient';