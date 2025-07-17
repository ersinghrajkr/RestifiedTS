/**
 * WebSocket Client for RestifiedTS
 * 
 * This module provides WebSocket connection management and testing capabilities
 * with support for connection lifecycle, message handling, and real-time testing.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { WebSocketConfig, RestifiedError } from '../../types/RestifiedTypes';

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  id: string;
  type: 'text' | 'binary' | 'ping' | 'pong' | 'close';
  data: any;
  timestamp: Date;
  size: number;
}

/**
 * WebSocket connection state
 */
export type WebSocketState = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

/**
 * WebSocket connection info
 */
export interface WebSocketConnectionInfo {
  url: string;
  state: WebSocketState;
  protocol?: string;
  extensions?: string;
  connectedAt?: Date;
  lastActivity?: Date;
  messageCount: {
    sent: number;
    received: number;
  };
  bytesTransferred: {
    sent: number;
    received: number;
  };
}

/**
 * WebSocket event types
 */
export interface WebSocketEvents {
  'connection': (info: WebSocketConnectionInfo) => void;
  'message': (message: WebSocketMessage) => void;
  'sent': (message: WebSocketMessage) => void;
  'close': (code: number, reason: string) => void;
  'error': (error: Error) => void;
  'ping': (data: Buffer) => void;
  'pong': (data: Buffer) => void;
  'reconnect': (attempt: number) => void;
  'reconnect_failed': (error: Error) => void;
}

/**
 * WebSocket message matcher for testing
 */
export interface MessageMatcher {
  type?: 'text' | 'binary';
  content?: string | RegExp | ((data: any) => boolean);
  timeout?: number;
}

/**
 * WebSocket client implementation
 */
export class WebSocketClient extends EventEmitter {
  private ws?: WebSocket;
  private config: Required<WebSocketConfig>;
  private connectionInfo: WebSocketConnectionInfo;
  private messageHistory: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private pingTimer?: NodeJS.Timeout;
  private isReconnecting = false;
  private messageIdCounter = 0;

  constructor(config: WebSocketConfig) {
    super();
    
    this.config = {
      timeout: 30000,
      pingInterval: 30000,
      maxReconnectAttempts: 3,
      reconnectInterval: 5000,
      protocols: [],
      headers: {},
      ...config
    };

    this.connectionInfo = {
      url: this.config.url,
      state: 'closed',
      messageCount: { sent: 0, received: 0 },
      bytesTransferred: { sent: 0, received: 0 }
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      throw new Error('WebSocket is already connected');
    }

    return new Promise((resolve, reject) => {
      try {
        this.connectionInfo.state = 'connecting';
        
        const options: any = {
          protocols: this.config.protocols,
          headers: this.config.headers,
          handshakeTimeout: this.config.timeout
        };

        this.ws = new WebSocket(this.config.url, options);
        
        // Connection timeout
        const timeoutId = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.terminate();
            reject(new Error(`WebSocket connection timeout after ${this.config.timeout}ms`));
          }
        }, this.config.timeout);

        this.ws.on('open', () => {
          clearTimeout(timeoutId);
          this.connectionInfo.state = 'open';
          this.connectionInfo.connectedAt = new Date();
          this.connectionInfo.lastActivity = new Date();
          this.connectionInfo.protocol = this.ws!.protocol;
          this.connectionInfo.extensions = this.ws!.extensions;
          
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          
          this.startPingInterval();
          this.emit('connection', { ...this.connectionInfo });
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data, isBinary: boolean) => {
          this.handleMessage(data, isBinary);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          clearTimeout(timeoutId);
          this.handleClose(code, reason.toString());
        });

        this.ws.on('error', (error: Error) => {
          clearTimeout(timeoutId);
          this.handleError(error);
          reject(error);
        });

        this.ws.on('ping', (data: Buffer) => {
          this.emit('ping', data);
        });

        this.ws.on('pong', (data: Buffer) => {
          this.connectionInfo.lastActivity = new Date();
          this.emit('pong', data);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(code: number = 1000, reason: string = 'Normal closure'): Promise<void> {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      return;
    }

    return new Promise((resolve) => {
      this.connectionInfo.state = 'closing';
      this.stopReconnect();
      this.stopPingInterval();

      if (this.ws!.readyState === WebSocket.OPEN) {
        this.ws!.close(code, reason);
      }

      const closeHandler = () => {
        this.connectionInfo.state = 'closed';
        resolve();
      };

      this.ws!.once('close', closeHandler);
      
      // Force close after timeout
      setTimeout(() => {
        if (this.ws!.readyState !== WebSocket.CLOSED) {
          this.ws!.terminate();
          closeHandler();
        }
      }, 5000);
    });
  }

  /**
   * Send a text message
   */
  async sendText(text: string): Promise<WebSocketMessage> {
    this.ensureConnected();
    
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'text',
      data: text,
      timestamp: new Date(),
      size: Buffer.byteLength(text, 'utf8')
    };

    return new Promise((resolve, reject) => {
      this.ws!.send(text, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          this.connectionInfo.messageCount.sent++;
          this.connectionInfo.bytesTransferred.sent += message.size;
          this.connectionInfo.lastActivity = new Date();
          
          this.messageHistory.push(message);
          this.emit('sent', message);
          resolve(message);
        }
      });
    });
  }

  /**
   * Send binary data
   */
  async sendBinary(data: Buffer): Promise<WebSocketMessage> {
    this.ensureConnected();
    
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'binary',
      data,
      timestamp: new Date(),
      size: data.length
    };

    return new Promise((resolve, reject) => {
      this.ws!.send(data, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          this.connectionInfo.messageCount.sent++;
          this.connectionInfo.bytesTransferred.sent += message.size;
          this.connectionInfo.lastActivity = new Date();
          
          this.messageHistory.push(message);
          this.emit('sent', message);
          resolve(message);
        }
      });
    });
  }

  /**
   * Send JSON data
   */
  async sendJSON(data: any): Promise<WebSocketMessage> {
    const jsonString = JSON.stringify(data);
    return this.sendText(jsonString);
  }

  /**
   * Send a ping frame
   */
  async ping(data?: Buffer): Promise<void> {
    this.ensureConnected();
    
    return new Promise((resolve, reject) => {
      try {
        this.ws!.ping(data);
        this.connectionInfo.lastActivity = new Date();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Wait for a specific message
   */
  async waitForMessage(matcher: MessageMatcher): Promise<WebSocketMessage> {
    const timeout = matcher.timeout || 10000;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off('message', messageHandler);
        reject(new Error(`No matching message received within ${timeout}ms`));
      }, timeout);

      const messageHandler = (message: WebSocketMessage) => {
        if (this.matchesMessage(message, matcher)) {
          clearTimeout(timeoutId);
          this.off('message', messageHandler);
          resolve(message);
        }
      };

      this.on('message', messageHandler);
    });
  }

  /**
   * Wait for connection to be established
   */
  async waitForConnection(timeout: number = 10000): Promise<void> {
    if (this.connectionInfo.state === 'open') {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off('connection', connectionHandler);
        reject(new Error(`Connection not established within ${timeout}ms`));
      }, timeout);

      const connectionHandler = () => {
        clearTimeout(timeoutId);
        this.off('connection', connectionHandler);
        resolve();
      };

      this.on('connection', connectionHandler);
    });
  }

  /**
   * Get connection information
   */
  getConnectionInfo(): Readonly<WebSocketConnectionInfo> {
    return { ...this.connectionInfo };
  }

  /**
   * Get message history
   */
  getMessageHistory(): Readonly<WebSocketMessage[]> {
    return [...this.messageHistory];
  }

  /**
   * Clear message history
   */
  clearMessageHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Filter messages by criteria
   */
  findMessages(predicate: (message: WebSocketMessage) => boolean): WebSocketMessage[] {
    return this.messageHistory.filter(predicate);
  }

  /**
   * Get messages by type
   */
  getMessagesByType(type: 'text' | 'binary'): WebSocketMessage[] {
    return this.findMessages(msg => msg.type === type);
  }

  /**
   * Get messages within time range
   */
  getMessagesInTimeRange(start: Date, end: Date): WebSocketMessage[] {
    return this.findMessages(msg => msg.timestamp >= start && msg.timestamp <= end);
  }

  /**
   * Enable auto-reconnect
   */
  enableAutoReconnect(): void {
    this.config.maxReconnectAttempts = this.config.maxReconnectAttempts || 3;
  }

  /**
   * Disable auto-reconnect
   */
  disableAutoReconnect(): void {
    this.config.maxReconnectAttempts = 0;
    this.stopReconnect();
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    state: WebSocketState;
    uptime?: number;
    messageCount: { sent: number; received: number };
    bytesTransferred: { sent: number; received: number };
    averageMessageSize: { sent: number; received: number };
    reconnectAttempts: number;
  } {
    const now = new Date();
    const uptime = this.connectionInfo.connectedAt 
      ? now.getTime() - this.connectionInfo.connectedAt.getTime()
      : undefined;

    const sentMessages = this.connectionInfo.messageCount.sent;
    const receivedMessages = this.connectionInfo.messageCount.received;

    return {
      state: this.connectionInfo.state,
      uptime,
      messageCount: { ...this.connectionInfo.messageCount },
      bytesTransferred: { ...this.connectionInfo.bytesTransferred },
      averageMessageSize: {
        sent: sentMessages > 0 ? this.connectionInfo.bytesTransferred.sent / sentMessages : 0,
        received: receivedMessages > 0 ? this.connectionInfo.bytesTransferred.received / receivedMessages : 0
      },
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.url && newConfig.url !== this.connectionInfo.url) {
      this.connectionInfo.url = newConfig.url;
    }

    // Restart ping interval if changed
    if (newConfig.pingInterval !== undefined) {
      this.stopPingInterval();
      if (this.connectionInfo.state === 'open') {
        this.startPingInterval();
      }
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: WebSocket.Data, isBinary: boolean): void {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: isBinary ? 'binary' : 'text',
      data: isBinary ? data : data.toString(),
      timestamp: new Date(),
      size: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data.toString(), 'utf8')
    };

    this.connectionInfo.messageCount.received++;
    this.connectionInfo.bytesTransferred.received += message.size;
    this.connectionInfo.lastActivity = new Date();
    
    this.messageHistory.push(message);
    this.emit('message', message);
  }

  /**
   * Handle connection close
   */
  private handleClose(code: number, reason: string): void {
    this.connectionInfo.state = 'closed';
    this.stopPingInterval();
    
    this.emit('close', code, reason);

    // Attempt reconnection if enabled and not manually closed
    if (this.config.maxReconnectAttempts > 0 && 
        this.reconnectAttempts < this.config.maxReconnectAttempts && 
        !this.isReconnecting &&
        code !== 1000) { // Not normal closure
      this.attemptReconnect();
    }
  }

  /**
   * Handle connection error
   */
  private handleError(error: Error): void {
    this.connectionInfo.state = 'error';
    this.emit('error', error);
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    this.emit('reconnect', this.reconnectAttempts);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
          this.isReconnecting = false;
          this.emit('reconnect_failed', error instanceof Error ? error : new Error(String(error)));
        } else {
          this.isReconnecting = false;
          this.attemptReconnect();
        }
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Stop reconnection attempts
   */
  private stopReconnect(): void {
    this.isReconnecting = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    if (this.config.pingInterval > 0) {
      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ping().catch(error => {
            console.warn('Ping failed:', error.message);
          });
        }
      }, this.config.pingInterval);
    }
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
  }

  /**
   * Ensure WebSocket is connected
   */
  private ensureConnected(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }

  /**
   * Check if message matches criteria
   */
  private matchesMessage(message: WebSocketMessage, matcher: MessageMatcher): boolean {
    if (matcher.type && message.type !== matcher.type) {
      return false;
    }

    if (matcher.content) {
      if (typeof matcher.content === 'string') {
        return message.data === matcher.content;
      } else if (matcher.content instanceof RegExp) {
        return matcher.content.test(message.data);
      } else if (typeof matcher.content === 'function') {
        return matcher.content(message.data);
      }
    }

    return true;
  }
}

export default WebSocketClient;