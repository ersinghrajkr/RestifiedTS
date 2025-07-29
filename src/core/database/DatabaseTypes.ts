/**
 * Database Types and Interfaces for RestifiedTS
 * 
 * This module defines the core types and interfaces for database connectivity
 * supporting multiple database systems including MySQL, PostgreSQL, MongoDB, Oracle, etc.
 */

export type DatabaseType = 'mysql' | 'postgresql' | 'mongodb' | 'oracle' | 'sqlite' | 'redis' | 'mssql';

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  
  // Connection options
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  ssl?: boolean | object;
  
  // Pool options
  pool?: {
    min?: number;
    max?: number;
    idle?: number;
    acquire?: number;
    evict?: number;
  };
  
  // MongoDB specific
  authDatabase?: string;
  replicaSet?: string;
  
  // Oracle specific
  serviceName?: string;
  sid?: string;
  
  // Additional connection parameters
  options?: Record<string, any>;
}

export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Query operations
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  
  // Transaction support
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
  
  // Prepared statements
  prepare(sql: string): Promise<PreparedStatement>;
  
  // Connection info
  getConnectionInfo(): DatabaseConnectionInfo;
}

export interface Transaction {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isCommitted(): boolean;
  isRolledBack(): boolean;
}

export interface PreparedStatement {
  execute<T = any>(params?: any[]): Promise<T[]>;
  executeOne<T = any>(params?: any[]): Promise<T | null>;
  close(): Promise<void>;
}

export interface DatabaseConnectionInfo {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  connected: boolean;
  connectionTime?: Date;
  lastQuery?: Date;
  queryCount?: number;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  affectedRows?: number;
  insertId?: string | number;
  fields?: QueryField[];
  metadata?: Record<string, any>;
}

export interface QueryField {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
}

export interface DatabaseError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  query?: string;
  parameters?: any[];
  cause?: Error;
}

// MongoDB specific types
export interface MongoConfig extends Omit<DatabaseConfig, 'database'> {
  type: 'mongodb';
  database: string;
  collection?: string;
  authDatabase?: string;
  replicaSet?: string;
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
}

export interface MongoDocument {
  _id?: any;
  [key: string]: any;
}

export interface MongoQuery {
  filter?: Record<string, any>;
  projection?: Record<string, any>;
  sort?: Record<string, any>;
  limit?: number;
  skip?: number;
}

export interface MongoBulkOperation {
  insertOne?: { document: MongoDocument };
  updateOne?: { filter: Record<string, any>; update: Record<string, any>; upsert?: boolean };
  updateMany?: { filter: Record<string, any>; update: Record<string, any>; upsert?: boolean };
  deleteOne?: { filter: Record<string, any> };
  deleteMany?: { filter: Record<string, any> };
  replaceOne?: { filter: Record<string, any>; replacement: MongoDocument; upsert?: boolean };
}

// Database connection pool types
export interface ConnectionPool {
  getConnection(): Promise<DatabaseConnection>;
  releaseConnection(connection: DatabaseConnection): Promise<void>;
  close(): Promise<void>;
  getActiveConnections(): number;
  getTotalConnections(): number;
  getPoolInfo(): ConnectionPoolInfo;
}

export interface ConnectionPoolInfo {
  activeConnections: number;
  totalConnections: number;
  waitingClients: number;
  maxConnections: number;
  minConnections: number;
}

// Database migration types
export interface Migration {
  id: string;
  name: string;
  up: (connection: DatabaseConnection) => Promise<void>;
  down: (connection: DatabaseConnection) => Promise<void>;
  timestamp: Date;
}

export interface MigrationManager {
  addMigration(migration: Migration): void;
  runMigrations(connection: DatabaseConnection): Promise<void>;
  rollbackMigration(connection: DatabaseConnection, migrationId: string): Promise<void>;
  getPendingMigrations(): Migration[];
  getAppliedMigrations(connection: DatabaseConnection): Promise<string[]>;
}

// Database testing utilities types
export interface DatabaseTestUtilities {
  setup(connection: DatabaseConnection, fixtures?: any[]): Promise<void>;
  teardown(connection: DatabaseConnection): Promise<void>;
  seed(connection: DatabaseConnection, data: Record<string, any[]>): Promise<void>;
  truncate(connection: DatabaseConnection, tables?: string[]): Promise<void>;
  snapshot(connection: DatabaseConnection, name: string): Promise<void>;
  restoreSnapshot(connection: DatabaseConnection, name: string): Promise<void>;
}

export interface TestFixture {
  table: string;
  data: Record<string, any>[];
  dependencies?: string[];
  cleanup?: boolean;
}

// Query builder types
export interface QueryBuilder {
  select(fields?: string | string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  join(table: string, condition: string, type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'): QueryBuilder;
  where(condition: string, params?: any[]): QueryBuilder;
  whereIn(field: string, values: any[]): QueryBuilder;
  whereNotIn(field: string, values: any[]): QueryBuilder;
  whereBetween(field: string, min: any, max: any): QueryBuilder;
  whereNull(field: string): QueryBuilder;
  whereNotNull(field: string): QueryBuilder;
  groupBy(fields: string | string[]): QueryBuilder;
  having(condition: string, params?: any[]): QueryBuilder;
  orderBy(field: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  
  insert(data: Record<string, any>): QueryBuilder;
  update(data: Record<string, any>): QueryBuilder;
  delete(): QueryBuilder;
  
  build(): { sql: string; params: any[] };
  execute<T = any>(connection: DatabaseConnection): Promise<T[]>;
  executeOne<T = any>(connection: DatabaseConnection): Promise<T | null>;
}

// Database adapter interface
export interface DatabaseAdapter {
  connect(config: DatabaseConfig): Promise<DatabaseConnection>;
  createConnectionPool(config: DatabaseConfig): Promise<ConnectionPool>;
  createQueryBuilder(): QueryBuilder;
  createMigrationManager(): MigrationManager;
  createTestUtilities(): DatabaseTestUtilities;
  
  // Database-specific operations
  escapeIdentifier(identifier: string): string;
  escapeValue(value: any): string;
  buildLimitClause(limit?: number, offset?: number): string;
  getCurrentTimestamp(): string;
  
  // Schema operations
  tableExists(connection: DatabaseConnection, tableName: string): Promise<boolean>;
  getTableColumns(connection: DatabaseConnection, tableName: string): Promise<QueryField[]>;
  getTableIndexes(connection: DatabaseConnection, tableName: string): Promise<string[]>;
}

// Events
export interface DatabaseEvent {
  type: 'connect' | 'disconnect' | 'query' | 'error' | 'transaction_start' | 'transaction_commit' | 'transaction_rollback';
  timestamp: Date;
  connection?: DatabaseConnection;
  query?: string;
  params?: any[];
  duration?: number;
  error?: DatabaseError;
  metadata?: Record<string, any>;
}

export type DatabaseEventListener = (event: DatabaseEvent) => void | Promise<void>;