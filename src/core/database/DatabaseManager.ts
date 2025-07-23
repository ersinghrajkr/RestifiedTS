/**
 * Database Manager for RestifiedTS
 * 
 * Central database management system that handles multiple database connections,
 * connection pooling, and provides a unified interface for database operations.
 */

import { EventEmitter } from 'events';
import { 
  DatabaseConfig, 
  DatabaseConnection, 
  DatabaseType, 
  DatabaseAdapter,
  ConnectionPool,
  DatabaseEvent,
  DatabaseEventListener,
  DatabaseError
} from './DatabaseTypes';

// Database adapters temporarily commented out due to missing dependencies
// import { MySQLAdapter } from './adapters/MySQLAdapter';
// import { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter';
// import { MongoDBAdapter } from './adapters/MongoDBAdapter';
// import { OracleAdapter } from './adapters/OracleAdapter';
// import { SQLiteAdapter } from './adapters/SQLiteAdapter';

export class DatabaseManager extends EventEmitter {
  private connections: Map<string, DatabaseConnection> = new Map();
  private connectionPools: Map<string, ConnectionPool> = new Map();
  private adapters: Map<DatabaseType, DatabaseAdapter> = new Map();
  private defaultConnection?: string;
  private eventListeners: DatabaseEventListener[] = [];

  constructor() {
    super();
    this.initializeAdapters();
  }

  /**
   * Initialize database adapters for different database types
   * Temporarily commented out due to missing adapter dependencies
   */
  private initializeAdapters(): void {
    // this.adapters.set('mysql', new MySQLAdapter());
    // this.adapters.set('postgresql', new PostgreSQLAdapter());
    // this.adapters.set('mongodb', new MongoDBAdapter());
    // this.adapters.set('oracle', new OracleAdapter());
    // this.adapters.set('sqlite', new SQLiteAdapter());
  }

  /**
   * Register a custom database adapter
   */
  registerAdapter(type: DatabaseType, adapter: DatabaseAdapter): void {
    this.adapters.set(type, adapter);
  }

  /**
   * Create a new database connection
   */
  async createConnection(name: string, config: DatabaseConfig): Promise<DatabaseConnection> {
    const adapter = this.adapters.get(config.type);
    if (!adapter) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    try {
      const connection = await adapter.connect(config);
      this.connections.set(name, connection);

      // Set as default if it's the first connection
      if (!this.defaultConnection) {
        this.defaultConnection = name;
      }

      this.emitEvent({
        type: 'connect',
        timestamp: new Date(),
        connection,
        metadata: { name, config: { ...config, password: '***' } }
      });

      return connection;
    } catch (error) {
      const dbError = this.createDatabaseError(error, 'Failed to create database connection');
      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error: dbError,
        metadata: { name, config: { ...config, password: '***' } }
      });
      throw dbError;
    }
  }

  /**
   * Create a connection pool
   */
  async createConnectionPool(name: string, config: DatabaseConfig): Promise<ConnectionPool> {
    const adapter = this.adapters.get(config.type);
    if (!adapter) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    try {
      const pool = await adapter.createConnectionPool(config);
      this.connectionPools.set(name, pool);
      return pool;
    } catch (error) {
      const dbError = this.createDatabaseError(error, 'Failed to create connection pool');
      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error: dbError,
        metadata: { name, config: { ...config, password: '***' } }
      });
      throw dbError;
    }
  }

  /**
   * Get a database connection by name
   */
  getConnection(name?: string): DatabaseConnection {
    const connectionName = name || this.defaultConnection;
    if (!connectionName) {
      throw new Error('No database connections available');
    }

    const connection = this.connections.get(connectionName);
    if (!connection) {
      throw new Error(`Database connection '${connectionName}' not found`);
    }

    return connection;
  }

  /**
   * Get a connection pool by name
   */
  getConnectionPool(name: string): ConnectionPool {
    const pool = this.connectionPools.get(name);
    if (!pool) {
      throw new Error(`Connection pool '${name}' not found`);
    }
    return pool;
  }

  /**
   * Get all connection names
   */
  getConnectionNames(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get all connection pool names
   */
  getConnectionPoolNames(): string[] {
    return Array.from(this.connectionPools.keys());
  }

  /**
   * Set the default connection
   */
  setDefaultConnection(name: string): void {
    if (!this.connections.has(name)) {
      throw new Error(`Connection '${name}' does not exist`);
    }
    this.defaultConnection = name;
  }

  /**
   * Get the default connection name
   */
  getDefaultConnectionName(): string | undefined {
    return this.defaultConnection;
  }

  /**
   * Close a specific connection
   */
  async closeConnection(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`Connection '${name}' not found`);
    }

    try {
      await connection.disconnect();
      this.connections.delete(name);

      // Reset default if this was the default connection
      if (this.defaultConnection === name) {
        this.defaultConnection = this.connections.size > 0 
          ? this.connections.keys().next().value 
          : undefined;
      }

      this.emitEvent({
        type: 'disconnect',
        timestamp: new Date(),
        connection,
        metadata: { name }
      });
    } catch (error) {
      const dbError = this.createDatabaseError(error, `Failed to close connection '${name}'`);
      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error: dbError,
        metadata: { name }
      });
      throw dbError;
    }
  }

  /**
   * Close a connection pool
   */
  async closeConnectionPool(name: string): Promise<void> {
    const pool = this.connectionPools.get(name);
    if (!pool) {
      throw new Error(`Connection pool '${name}' not found`);
    }

    try {
      await pool.close();
      this.connectionPools.delete(name);
    } catch (error) {
      const dbError = this.createDatabaseError(error, `Failed to close connection pool '${name}'`);
      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error: dbError,
        metadata: { name }
      });
      throw dbError;
    }
  }

  /**
   * Close all connections and pools
   */
  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    // Close all connections
    for (const name of this.connections.keys()) {
      closePromises.push(this.closeConnection(name));
    }

    // Close all connection pools
    for (const name of this.connectionPools.keys()) {
      closePromises.push(this.closeConnectionPool(name));
    }

    await Promise.all(closePromises);
  }

  /**
   * Execute a query on a specific connection
   */
  async query<T = any>(sql: string, params?: any[], connectionName?: string): Promise<T[]> {
    const connection = this.getConnection(connectionName);
    const startTime = Date.now();

    try {
      const result = await connection.query<T>(sql, params);
      const duration = Date.now() - startTime;

      this.emitEvent({
        type: 'query',
        timestamp: new Date(),
        connection,
        query: sql,
        params,
        duration,
        metadata: { connectionName, rowCount: result.length }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const dbError = this.createDatabaseError(error, 'Query execution failed');
      
      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        connection,
        query: sql,
        params,
        duration,
        error: dbError,
        metadata: { connectionName }
      });

      throw dbError;
    }
  }

  /**
   * Execute a query that returns a single row
   */
  async queryOne<T = any>(sql: string, params?: any[], connectionName?: string): Promise<T | null> {
    const connection = this.getConnection(connectionName);
    return connection.queryOne<T>(sql, params);
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (connection: DatabaseConnection) => Promise<T>,
    connectionName?: string
  ): Promise<T> {
    const connection = this.getConnection(connectionName);

    this.emitEvent({
      type: 'transaction_start',
      timestamp: new Date(),
      connection,
      metadata: { connectionName }
    });

    try {
      const result = await connection.transaction(async (tx) => {
        return await callback(connection);
      });

      this.emitEvent({
        type: 'transaction_commit',
        timestamp: new Date(),
        connection,
        metadata: { connectionName }
      });

      return result;
    } catch (error) {
      this.emitEvent({
        type: 'transaction_rollback',
        timestamp: new Date(),
        connection,
        error: this.createDatabaseError(error, 'Transaction failed'),
        metadata: { connectionName }
      });

      throw error;
    }
  }

  /**
   * Get database adapter for a specific type
   */
  getAdapter(type: DatabaseType): DatabaseAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`No adapter available for database type: ${type}`);
    }
    return adapter;
  }

  /**
   * Get connection information
   */
  getConnectionInfo(connectionName?: string) {
    const connection = this.getConnection(connectionName);
    return connection.getConnectionInfo();
  }

  /**
   * Get all connections information
   */
  getAllConnectionsInfo() {
    const info: Record<string, any> = {};
    for (const [name, connection] of this.connections) {
      info[name] = connection.getConnectionInfo();
    }
    return info;
  }

  /**
   * Add event listener
   */
  addEventListenerCustom(listener: DatabaseEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListenerCustom(listener: DatabaseEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit database event
   */
  private emitEvent(event: DatabaseEvent): void {
    // Emit to EventEmitter listeners
    this.emit(event.type, event);

    // Emit to custom listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Database event listener error:', error);
      }
    });
  }

  /**
   * Create standardized database error
   */
  private createDatabaseError(error: any, message: string): DatabaseError {
    const dbError = new Error(message) as DatabaseError;
    dbError.name = 'DatabaseError';
    
    if (error instanceof Error) {
      dbError.message = `${message}: ${error.message}`;
      dbError.stack = error.stack;
    }

    // Copy database-specific error properties
    if (error.code) dbError.code = error.code;
    if (error.errno) dbError.errno = error.errno;
    if (error.sqlState) dbError.sqlState = error.sqlState;
    if (error.sqlMessage) dbError.sqlMessage = error.sqlMessage;

    return dbError;
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [name, connection] of this.connections) {
      try {
        health[name] = connection.isConnected();
        
        // Perform a simple query to verify connection
        if (health[name]) {
          await connection.query('SELECT 1');
        }
      } catch (error) {
        health[name] = false;
      }
    }
    
    return health;
  }

  /**
   * Get database statistics
   */
  getStatistics() {
    return {
      totalConnections: this.connections.size,
      totalConnectionPools: this.connectionPools.size,
      defaultConnection: this.defaultConnection,
      supportedDatabaseTypes: Array.from(this.adapters.keys()),
      connections: this.getAllConnectionsInfo()
    };
  }
}