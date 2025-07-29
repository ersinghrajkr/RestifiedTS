/**
 * Database Adapters Index for RestifiedTS
 * 
 * Central export point for all database adapters supporting various database systems.
 * Note: Database adapters are temporarily disabled due to optional dependencies.
 */

// Database adapters (temporarily disabled)
// export { MySQLAdapter } from './MySQLAdapter';
// export { PostgreSQLAdapter } from './PostgreSQLAdapter';
// export { MongoDBAdapter } from './MongoDBAdapter';
// export { OracleAdapter } from './OracleAdapter';
// export { SQLiteAdapter } from './SQLiteAdapter';

// Type re-exports for convenience
export type {
  DatabaseAdapter,
  DatabaseConfig,
  DatabaseConnection,
  DatabaseError,
  ConnectionPool,
  QueryBuilder,
  MigrationManager,
  DatabaseTestUtilities,
  QueryField,
  DatabaseConnectionInfo,
  Transaction,
  PreparedStatement,
  ConnectionPoolInfo
} from '../DatabaseTypes';

// Default export factory for creating adapters (temporarily disabled)
import { DatabaseConfig, DatabaseAdapter } from '../DatabaseTypes';

export function createDatabaseAdapter(config: DatabaseConfig): DatabaseAdapter {
  throw new Error(`Database adapters are temporarily disabled. Requested type: ${config.type}`);
}

export default createDatabaseAdapter;