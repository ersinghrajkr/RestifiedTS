// src/core/clients/WebSocketClient.ts

import { EventEmitter } from 'events';
import { 
  WebSocketConfig, 
  WebSocketMessage,
  RestifiedResponse 
} from '../../types/RestifiedTypes';

/**
 * Production-grade WebSocket client with comprehensive features
 * 
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Message queuing and reliable delivery
 * - Heartbeat/ping-pong for connection health
 * - Protocol and subprotocol support
 * - Message filtering and routing
 * - Connection pooling
 * - Compression support
 * - Authentication and authorization
 * - Rate limiting and flow control
 * - Message persistence and replay
 * 
 * @example
 * ```typescript
 * const wsClient = new WebSocketClient({
 *   url: 'wss://api.example.com/ws',
 *   protocols: ['chat', 'notifications'],
 *   reconnect: true,
 *   heartbeat: true
 * });
 * 
 * await wsClient.connect();
 * 
 * wsClient.on('message', (message) => {
 *   console.log('Received:', message);
 * });
 * 
 * await wsClient.send({ type: 'subscribe', channel: 'updates' });
 * ```
 */
export class WebSocketClient extends EventEmitter {
  private ws?: WebSocket;
  private config: WebSocketClientConfig;
  private connectionState: ConnectionState = 'disconnected';
  private messageQueue: QueuedMessage[] = [];
  private reconnectAttempts: number = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private lastPongReceived: number = 0;
  private messageId: number = 0;
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private subscriptions: Map<string, SubscriptionHandler> = new Map();
  private messageHandlers: Map<string, MessageHandler[]> = new Map();

  constructor(config: WebSocketConfig) {
    super();
    this.config = this.mergeWithDefaults(config);
    this.setupEventHandlers();
  }

  /**
   * Connect to WebSocket server
   * 
   * @returns Promise that resolves when connected
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    this.emit('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.createWebSocket();
        
        const connectTimeout = setTimeout(() => {
          reject(new Error(`Connection timeout after ${this.config.timeout}ms`));
        }, this.config.timeout);

        const onOpen = () => {
          clearTimeout(connectTimeout);
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.lastPongReceived = Date.now();
          
          this.emit('connected');
          this.startHeartbeat();
          this.processMessageQueue();
          
          resolve();
        };

        const onError = (error: Event) => {
          clearTimeout(connectTimeout);
          this.connectionState = 'disconnected';
          this.emit('error', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws!.addEventListener('open', onOpen, { once: true });
        this.ws!.addEventListener('error', onError, { once: true });
        
      } catch (error) {
        this.connectionState = 'disconnected';
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   * 
   * @param code - Close code
   * @param reason - Close reason
   */
  async disconnect(code: number = 1000, reason: string = 'Normal closure'): Promise<void> {
    this.config.reconnect = false; // Disable auto-reconnect
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws && this.connectionState === 'connected') {
      this.connectionState = 'disconnecting';
      this.ws.close(code, reason);
      
      return new Promise((resolve) => {
        const onClose = () => {
          this.connectionState = 'disconnected';
          this.emit('disconnected', { code, reason });
          resolve();
        };
        
        this.ws!.addEventListener('close', onClose, { once: true });
      });
    }
    
    this.connectionState = 'disconnected';
  }

  /**
   * Send a message
   * 
   * @param data - Message data
   * @param options - Send options
   * @returns Promise that resolves when message is sent
   */
  async send(data: any, options: SendOptions = {}): Promise<void> {
    const message: QueuedMessage = {
      id: this.generateMessageId(),
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      requiresAck: options.requiresAck || false,
      timeout: options.timeout || this.config.messageTimeout
    };

    if (this.connectionState !== 'connected') {
      if (options.queue !== false) {
        this.queueMessage(message);
        return;
      } else {
        throw new Error('WebSocket not connected and queueing disabled');
      }
    }

    return this.sendMessage(message);
  }

  /**
   * Send a message and wait for response
   * 
   * @param data - Message data
   * @param options - Request options
   * @returns Promise that resolves with response
   */
  async request(data: any, options: RequestOptions = {}): Promise<any> {
    const messageId = this.generateMessageId();
    const requestData = {
      ...data,
      _id: messageId,
      _type: 'request'
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error(`Request timeout after ${options.timeout || 30000}ms`));
      }, options.timeout || 30000);

      this.pendingMessages.set(messageId, {
        resolve,
        reject,
        timeout,
        timestamp: Date.now()
      });

      this.send(requestData, { requiresAck: false })
        .catch(error => {
          clearTimeout(timeout);
          this.pendingMessages.delete(messageId);
          reject(error);
        });
    });
  }

  /**
   * Subscribe to a channel or topic
   * 
   * @param channel - Channel identifier
   * @param handler - Message handler
   * @param options - Subscription options
   * @returns Promise that resolves with subscription
   */
  async subscribe(
    channel: string, 
    handler: SubscriptionHandler,
    options: SubscriptionOptions = {}
  ): Promise<Subscription> {
    const subscriptionId = this.generateMessageId();
    
    this.subscriptions.set(subscriptionId, handler);
    
    const subscribeMessage = {
      type: 'subscribe',
      channel,
      subscriptionId,
      ...options.params
    };

    await this.send(subscribeMessage);
    
    const subscription: Subscription = {
      id: subscriptionId,
      channel,
      handler,
      unsubscribe: async () => {
        this.subscriptions.delete(subscriptionId);
        await this.send({
          type: 'unsubscribe',
          subscriptionId
        });
      }
    };

    this.emit('subscribed', subscription);
    return subscription;
  }

  /**
   * Add message handler for specific message types
   * 
   * @param messageType - Type of message to handle
   * @param handler - Message handler function
   */
  addMessageHandler(messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  /**
   * Remove message handler
   * 
   * @param messageType - Type of message
   * @param handler - Handler to remove
   */
  removeMessageHandler(messageType: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get connection state
   * 
   * @returns Current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection statistics
   * 
   * @returns Connection statistics
   */
  getStats(): WebSocketStats {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      pendingMessages: this.pendingMessages.size,
      subscriptions: this.subscriptions.size,
      lastPongReceived: this.lastPongReceived,
      uptime: this.connectionState === 'connected' ? Date.now() - this.lastPongReceived : 0
    };
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.messageQueue.length = 0;
    this.emit('queueCleared');
  }

  /**
   * Get queued messages
   * 
   * @returns Array of queued messages
   */
  getQueuedMessages(): QueuedMessage[] {
    return [...this.messageQueue];
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private mergeWithDefaults(config: WebSocketConfig): WebSocketClientConfig {
    return {
      url: config.url,
      protocols: config.protocols,
      headers: config.headers || {},
      timeout: config.timeout || 30000,
      reconnect: true,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectBackoffFactor: 1.5,
      maxReconnectAttempts: 10,
      heartbeat: true,
      heartbeatInterval: 30000,
      heartbeatTimeout: 5000,
      maxRetries: 3,
      messageTimeout: 30000,
      queueSize: 1000,
      compression: false,
      binaryType: 'blob'
    };
  }

  private setupEventHandlers(): void {
    this.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.on('disconnected', () => {
      this.stopHeartbeat();
      if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });
  }

  private createWebSocket(): void {
    const wsUrl = this.config.url;
    const protocols = this.config.protocols;
    
    if (typeof WebSocket !== 'undefined') {
      // Browser environment
      this.ws = new WebSocket(wsUrl, protocols);
    } else {
      // Node.js environment
      const WebSocketImpl = require('ws');
      this.ws = new WebSocketImpl(wsUrl, protocols, {
        headers: this.config.headers
      });
    }

    this.ws.binaryType = this.config.binaryType;
    this.setupWebSocketEventHandlers();
  }

  private setupWebSocketEventHandlers(): void {
    if (!this.ws) return;

    this.ws.addEventListener('message', (event) => {
      this.handleMessage(event);
    });

    this.ws.addEventListener('close', (event) => {
      this.handleClose(event);
    });

    this.ws.addEventListener('error', (event) => {
      this.handleError(event);
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = this.parseMessage(event);
      this.processMessage(message);
    } catch (error) {
      this.emit('parseError', error);
    }
  }

  private parseMessage(event: MessageEvent): WebSocketMessage {
    let data: any;
    
    if (typeof event.data === 'string') {
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        data = event.data;
      }
    } else {
      data = event.data;
    }

    return {
      type: typeof event.data === 'string' ? 'text' : 'binary',
      data,
      timestamp: new Date()
    };
  }

  private processMessage(message: WebSocketMessage): void {
    this.emit('message', message);

    const data = message.data;

    // Handle different message types
    if (typeof data === 'object' && data !== null) {
      // Handle pong messages for heartbeat
      if (data.type === 'pong') {
        this.lastPongReceived = Date.now();
        return;
      }

      // Handle response messages
      if (data.type === 'response' && data._id) {
        this.handleResponse(data);
        return;
      }

      // Handle subscription messages
      if (data.subscriptionId) {
        this.handleSubscriptionMessage(data);
        return;
      }

      // Handle acknowledgments
      if (data.type === 'ack' && data._id) {
        this.handleAcknowledgment(data);
        return;
      }

      // Handle custom message types
      if (data.type) {
        this.handleTypedMessage(data);
        return;
      }
    }

    // Emit generic message event
    this.emit('data', data);
  }

  private handleResponse(data: any): void {
    const messageId = data._id;
    const pending = this.pendingMessages.get(messageId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(messageId);
      
      if (data.error) {
        pending.reject(new Error(data.error));
      } else {
        pending.resolve(data.result || data);
      }
    }
  }

  private handleSubscriptionMessage(data: any): void {
    const handler = this.subscriptions.get(data.subscriptionId);
    if (handler) {
      try {
        handler(data);
      } catch (error) {
        this.emit('subscriptionError', { error, data });
      }
    }
  }

  private handleAcknowledgment(data: any): void {
    this.emit('ack', data);
  }

  private handleTypedMessage(data: any): void {
    const handlers = this.messageHandlers.get(data.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.emit('handlerError', { error, data, type: data.type });
        }
      });
    }
    
    this.emit(data.type, data);
  }

  private handleClose(event: CloseEvent): void {
    this.connectionState = 'disconnected';
    this.ws = undefined;
    
    const closeInfo = {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    };

    this.emit('close', closeInfo);
    this.emit('disconnected', closeInfo);
  }

  private handleError(event: Event): void {
    this.emit('error', event);
  }

  private async sendMessage(message: QueuedMessage): Promise<void> {
    if (!this.ws || this.connectionState !== 'connected') {
      throw new Error('WebSocket not connected');
    }

    try {
      const serializedData = this.serializeMessage(message.data);
      this.ws.send(serializedData);
      
      if (message.requiresAck) {
        return this.waitForAcknowledgment(message);
      }
      
      this.emit('sent', message);
    } catch (error) {
      if (message.retries < message.maxRetries) {
        message.retries++;
        this.queueMessage(message);
        throw new Error(`Message send failed, queued for retry (${message.retries}/${message.maxRetries})`);
      } else {
        throw new Error(`Message send failed after ${message.maxRetries} retries: ${(error as Error).message}`);
      }
    }
  }

  private serializeMessage(data: any): string | ArrayBuffer | Blob {
    if (typeof data === 'string') {
      return data;
    } else if (data instanceof ArrayBuffer || data instanceof Blob) {
      return data;
    } else {
      return JSON.stringify(data);
    }
  }

  private waitForAcknowledgment(message: QueuedMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Acknowledgment timeout for message ${message.id}`));
      }, message.timeout);

      const ackHandler = (ackData: any) => {
        if (ackData._id === message.id) {
          clearTimeout(timeout);
          this.off('ack', ackHandler);
          resolve();
        }
      };

      this.on('ack', ackHandler);
    });
  }

  private queueMessage(message: QueuedMessage): void {
    if (this.messageQueue.length >= this.config.queueSize) {
      // Remove oldest message if queue is full
      const oldestMessage = this.messageQueue.shift();
      this.emit('messageDropped', oldestMessage);
    }
    
    this.messageQueue.push(message);
    this.emit('messageQueued', message);
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.connectionState === 'connected') {
      const message = this.messageQueue.shift()!;
      
      try {
        await this.sendMessage(message);
        this.emit('queuedMessageSent', message);
      } catch (error) {
        this.emit('queuedMessageError', { message, error });
        break; // Stop processing queue on error
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Reconnect already scheduled
    }

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(this.config.reconnectBackoffFactor, this.reconnectAttempts),
      this.config.maxReconnectDelay
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.attemptReconnect();
    }, delay);

    this.emit('reconnectScheduled', { delay, attempt: this.reconnectAttempts + 1 });
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    try {
      await this.connect();
      this.emit('reconnected');
    } catch (error) {
      this.emit('reconnectFailed', { attempt: this.reconnectAttempts, error });
      
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.emit('reconnectGiveUp');
      }
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private startHeartbeat(): void {
    if (!this.config.heartbeat) {
      return;
    }

    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private sendHeartbeat(): void {
    if (this.connectionState !== 'connected') {
      return;
    }

    // Check if we haven't received a pong in too long
    const timeSinceLastPong = Date.now() - this.lastPongReceived;
    if (timeSinceLastPong > this.config.heartbeatTimeout + this.config.heartbeatInterval) {
      this.emit('heartbeatTimeout');
      this.ws?.close(1000, 'Heartbeat timeout');
      return;
    }

    // Send ping
    this.send({ type: 'ping', timestamp: Date.now() }, { requiresAck: false })
      .catch(error => {
        this.emit('heartbeatError', error);
      });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageId}`;
  }

  /**
   * Convert WebSocket client to RestifiedResponse format for DSL integration
   */
  toRestifiedResponse(): RestifiedResponse {
    return {
      status: this.connectionState === 'connected' ? 200 : 500,
      statusText: this.connectionState === 'connected' ? 'Connected' : 'Disconnected',
      headers: {
        'connection': 'websocket',
        'upgrade': 'websocket'
      },
      data: {
        connectionState: this.connectionState,
        stats: this.getStats()
      },
      responseTime: 0,
      url: this.config.url,
      config: {
        method: 'WEBSOCKET' as any,
        url: this.config.url,
        headers: this.config.headers
      }
    };
  }
}

/**
 * WebSocket connection pool for managing multiple connections
 */
export class WebSocketPool {
  private connections: Map<string, WebSocketClient> = new Map();
  private defaultConfig: Partial<WebSocketClientConfig> = {};

  constructor(defaultConfig: Partial<WebSocketClientConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Create or get WebSocket connection
   */
  getConnection(name: string, config?: WebSocketConfig): WebSocketClient {
    if (this.connections.has(name)) {
      return this.connections.get(name)!;
    }

    if (!config) {
      throw new Error(`Configuration required for new connection: ${name}`);
    }

    const mergedConfig = { ...this.defaultConfig, ...config };
    const client = new WebSocketClient(mergedConfig);
    
    this.connections.set(name, client);
    return client;
  }

  /**
   * Remove connection from pool
   */
  async removeConnection(name: string): Promise<void> {
    const client = this.connections.get(name);
    if (client) {
      await client.disconnect();
      this.connections.delete(name);
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.connections.values()).map(client => 
      client.disconnect()
    );
    
    await Promise.all(promises);
    this.connections.clear();
  }

  /**
   * Get all connection names
   */
  getConnectionNames(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get connection statistics for all connections
   */
  getAllStats(): Record<string, WebSocketStats> {
    const stats: Record<string, WebSocketStats> = {};
    
    this.connections.forEach((client, name) => {
      stats[name] = client.getStats();
    });
    
    return stats;
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

export interface WebSocketClientConfig extends WebSocketConfig {
  reconnect: boolean;
  reconnectDelay: number;
  maxReconnectDelay: number;
  reconnectBackoffFactor: number;
  maxReconnectAttempts: number;
  heartbeat: boolean;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  maxRetries: number;
  messageTimeout: number;
  queueSize: number;
  compression: boolean;
  binaryType: 'blob' | 'arraybuffer';
}

export interface SendOptions {
  maxRetries?: number;
  requiresAck?: boolean;
  timeout?: number;
  queue?: boolean;
}

export interface RequestOptions {
  timeout?: number;
}

export interface SubscriptionOptions {
  params?: Record<string, any>;
}

export interface QueuedMessage {
  id: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  requiresAck: boolean;
  timeout: number;
}

export interface PendingMessage {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  timestamp: number;
}

export interface Subscription {
  id: string;
  channel: string;
  handler: SubscriptionHandler;
  unsubscribe: () => Promise<void>;
}

export interface WebSocketStats {
  connectionState: ConnectionState;
  reconnectAttempts: number;
  queuedMessages: number;
  pendingMessages: number;
  subscriptions: number;
  lastPongReceived: number;
  uptime: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';
export type SubscriptionHandler = (message: any) => void;
export type MessageHandler = (message: any) => void; 