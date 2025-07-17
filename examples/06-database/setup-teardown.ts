/**
 * Database Setup and Teardown Example
 *
 * This example demonstrates how to handle database operations in API tests,
 * including setup, teardown, data seeding, and state verification.
 */

import { RestifiedTS } from '../../src';

// Mock database interface for demonstration
interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any>;
  transaction(callback: (tx: any) => Promise<any>): Promise<any>;
}

// Mock database implementation
class MockDatabase implements DatabaseConnection {
  private connected = false;
  private data: Map<string, any[]> = new Map();

  async connect() {
    this.connected = true;
    console.log('=Ê Database connected');
  }

  async disconnect() {
    this.connected = false;
    console.log('=Ê Database disconnected');
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    // Mock query execution
    if (sql.includes('SELECT')) {
      const tableName = sql.match(/FROM\s+(\w+)/i)?.[1];
      return this.data.get(tableName) || [];
    }
    
    if (sql.includes('INSERT')) {
      const tableName = sql.match(/INTO\s+(\w+)/i)?.[1];
      if (!this.data.has(tableName)) {
        this.data.set(tableName, []);
      }
      const id = Math.floor(Math.random() * 1000);
      const record = { id, ...params };
      this.data.get(tableName)!.push(record);
      return { insertId: id };
    }
    
    if (sql.includes('DELETE')) {
      const tableName = sql.match(/FROM\s+(\w+)/i)?.[1];
      if (this.data.has(tableName)) {
        this.data.set(tableName, []);
      }
      return { affectedRows: 1 };
    }
    
    return {};
  }

  async transaction(callback: (tx: any) => Promise<any>): Promise<any> {
    return await callback(this);
  }
}

const db = new MockDatabase();

async function basicDatabaseSetup() {
  console.log('=' Running Basic Database Setup Example');
  
  try {
    // Step 1: Connect to database
    await db.connect();
    
    // Step 2: Setup test data
    const userId = await db.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      ['John Doe', 'john@example.com']
    );
    
    console.log(' Test user created with ID:', userId.insertId);
    
    // Step 3: Run API test with database dependency
    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .variable('userId', userId.insertId)
      .when()
        .get('/users/{{userId}}')
      .then()
        .statusCode(200)
        .jsonPath('$.id', userId.insertId)
        .jsonPath('$.name', 'John Doe')
        .jsonPath('$.email', 'john@example.com')
      .execute();
    
    console.log(' API test with database setup successful');
    
    // Step 4: Cleanup
    await db.query('DELETE FROM users WHERE id = ?', [userId.insertId]);
    console.log(' Test data cleaned up');
    
  } catch (error) {
    console.error('L Basic database setup failed:', error);
  } finally {
    await db.disconnect();
  }
}

async function transactionalTestSetup() {
  console.log('=' Running Transactional Test Setup Example');
  
  try {
    await db.connect();
    
    // Use transaction for atomic test data setup
    const result = await db.transaction(async (tx) => {
      // Create test user
      const userResult = await tx.query(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['Jane Smith', 'jane@example.com']
      );
      
      // Create test posts for the user
      const postResult1 = await tx.query(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [userResult.insertId, 'First Post', 'This is the first post']
      );
      
      const postResult2 = await tx.query(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [userResult.insertId, 'Second Post', 'This is the second post']
      );
      
      return {
        userId: userResult.insertId,
        postIds: [postResult1.insertId, postResult2.insertId]
      };
    });
    
    console.log(' Transactional test data created');
    
    // Test API with complex data setup
    const userResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .variable('userId', result.userId)
      .when()
        .get('/users/{{userId}}/posts')
      .then()
        .statusCode(200)
        .jsonPath('$', (posts: any[]) => posts.length === 2)
        .jsonPath('$[0].userId', result.userId)
        .jsonPath('$[1].userId', result.userId)
      .execute();
    
    console.log(' API test with transactional setup successful');
    
    // Cleanup transaction
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM posts WHERE user_id = ?', [result.userId]);
      await tx.query('DELETE FROM users WHERE id = ?', [result.userId]);
    });
    
    console.log(' Transactional cleanup completed');
    
  } catch (error) {
    console.error('L Transactional test setup failed:', error);
  } finally {
    await db.disconnect();
  }
}

async function dataSeeding() {
  console.log('=' Running Data Seeding Example');
  
  try {
    await db.connect();
    
    // Seed categories
    const categories = [
      { name: 'Technology', description: 'Tech related posts' },
      { name: 'Science', description: 'Science articles' },
      { name: 'Sports', description: 'Sports news' }
    ];
    
    const categoryIds = [];
    for (const category of categories) {
      const result = await db.query(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [category.name, category.description]
      );
      categoryIds.push(result.insertId);
    }
    
    // Seed users
    const users = [
      { name: 'Alice Johnson', email: 'alice@example.com' },
      { name: 'Bob Wilson', email: 'bob@example.com' },
      { name: 'Carol Davis', email: 'carol@example.com' }
    ];
    
    const userIds = [];
    for (const user of users) {
      const result = await db.query(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        [user.name, user.email]
      );
      userIds.push(result.insertId);
    }
    
    // Seed posts
    const posts = [
      { userId: userIds[0], categoryId: categoryIds[0], title: 'AI Revolution', content: 'AI is changing everything' },
      { userId: userIds[1], categoryId: categoryIds[1], title: 'Climate Change', content: 'Global warming effects' },
      { userId: userIds[2], categoryId: categoryIds[2], title: 'World Cup 2024', content: 'Football tournament' }
    ];
    
    const postIds = [];
    for (const post of posts) {
      const result = await db.query(
        'INSERT INTO posts (user_id, category_id, title, content) VALUES (?, ?, ?, ?)',
        [post.userId, post.categoryId, post.title, post.content]
      );
      postIds.push(result.insertId);
    }
    
    console.log(' Data seeding completed');
    
    // Test API with seeded data
    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
      .when()
        .get('/posts?category=Technology')
      .then()
        .statusCode(200)
        .jsonPath('$', (posts: any[]) => posts.length >= 1)
        .jsonPath('$[0].title', 'AI Revolution')
        .jsonPath('$[0].category.name', 'Technology')
      .execute();
    
    console.log(' API test with seeded data successful');
    
    // Cleanup seeded data
    await db.query('DELETE FROM posts WHERE id IN (?)', [postIds]);
    await db.query('DELETE FROM users WHERE id IN (?)', [userIds]);
    await db.query('DELETE FROM categories WHERE id IN (?)', [categoryIds]);
    
    console.log(' Seeded data cleanup completed');
    
  } catch (error) {
    console.error('L Data seeding failed:', error);
  } finally {
    await db.disconnect();
  }
}

async function stateVerification() {
  console.log('=' Running State Verification Example');
  
  try {
    await db.connect();
    
    // Setup initial state
    const userResult = await db.query(
      'INSERT INTO users (name, email, status) VALUES (?, ?, ?)',
      ['Test User', 'test@example.com', 'active']
    );
    
    const userId = userResult.insertId;
    
    // Verify initial state
    const initialState = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    console.log(' Initial state verified:', initialState[0]);
    
    // Perform API operation that should change state
    const apiResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .variable('userId', userId)
        .body({
          status: 'suspended',
          reason: 'Policy violation'
        })
      .when()
        .put('/users/{{userId}}/status')
      .then()
        .statusCode(200)
        .jsonPath('$.status', 'suspended')
        .jsonPath('$.updatedAt', (date: string) => new Date(date).getTime() > 0)
      .execute();
    
    console.log(' API operation completed');
    
    // Verify state change in database
    const updatedState = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (updatedState[0].status === 'suspended') {
      console.log(' Database state correctly updated');
    } else {
      throw new Error('Database state not updated correctly');
    }
    
    // Verify audit log entry
    const auditLog = await db.query(
      'SELECT * FROM audit_logs WHERE user_id = ? AND action = ?',
      [userId, 'status_change']
    );
    
    if (auditLog.length > 0) {
      console.log(' Audit log entry created');
    }
    
    // Cleanup
    await db.query('DELETE FROM audit_logs WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    
    console.log(' State verification test completed');
    
  } catch (error) {
    console.error('L State verification failed:', error);
  } finally {
    await db.disconnect();
  }
}

async function rollbackOnFailure() {
  console.log('=' Running Rollback on Failure Example');
  
  try {
    await db.connect();
    
    // Setup test data
    const userResult = await db.query(
      'INSERT INTO users (name, email, balance) VALUES (?, ?, ?)',
      ['Transfer User', 'transfer@example.com', 1000]
    );
    
    const userId = userResult.insertId;
    
    try {
      // Attempt API operation that might fail
      const response = await RestifiedTS
        .given()
          .baseURL('https://api.example.com')
          .header('Content-Type', 'application/json')
          .variable('userId', userId)
          .body({
            amount: 1500, // More than available balance
            toAccount: 'recipient@example.com'
          })
        .when()
          .post('/users/{{userId}}/transfer')
        .then()
          .statusCode(400) // Expected failure
          .jsonPath('$.error', 'insufficient_funds')
        .execute();
      
      console.log(' API correctly rejected invalid transfer');
      
      // Verify database state unchanged
      const userState = await db.query(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      );
      
      if (userState[0].balance === 1000) {
        console.log(' Database state correctly unchanged after failed operation');
      } else {
        throw new Error('Database state incorrectly modified');
      }
      
    } catch (error) {
      console.log('= Handling API failure scenario');
      
      // Verify no partial state changes
      const userState = await db.query(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      );
      
      if (userState[0].balance === 1000) {
        console.log(' Rollback successful - original balance preserved');
      }
    }
    
    // Cleanup
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    
    console.log(' Rollback on failure test completed');
    
  } catch (error) {
    console.error('L Rollback on failure test failed:', error);
  } finally {
    await db.disconnect();
  }
}

async function performanceWithDatabase() {
  console.log('=' Running Performance with Database Example');
  
  try {
    await db.connect();
    
    // Setup performance test data
    const userIds = [];
    for (let i = 0; i < 100; i++) {
      const result = await db.query(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        [`User ${i}`, `user${i}@example.com`]
      );
      userIds.push(result.insertId);
    }
    
    console.log(' Performance test data created');
    
    // Test API performance with database load
    const startTime = Date.now();
    
    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .queryParam('page', 1)
        .queryParam('limit', 50)
      .when()
        .get('/users')
      .then()
        .statusCode(200)
        .jsonPath('$.data', (users: any[]) => users.length <= 50)
        .jsonPath('$.pagination.total', (total: number) => total >= 100)
        .responseTime((time: number) => time < 2000) // Should be fast
      .execute();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(` API response time: ${duration}ms`);
    
    // Verify database performance
    const dbStartTime = Date.now();
    const dbUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const dbEndTime = Date.now();
    
    console.log(` Database query time: ${dbEndTime - dbStartTime}ms`);
    console.log(` Total users in database: ${dbUsers[0].count}`);
    
    // Cleanup
    await db.query('DELETE FROM users WHERE id IN (?)', [userIds]);
    
    console.log(' Performance test completed');
    
  } catch (error) {
    console.error('L Performance with database test failed:', error);
  } finally {
    await db.disconnect();
  }
}

// Run all examples
async function runAllExamples() {
  console.log('<¯ Starting Database Setup and Teardown Examples\n');
  
  await basicDatabaseSetup();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await transactionalTestSetup();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await dataSeeding();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await stateVerification();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await rollbackOnFailure();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await performanceWithDatabase();
  
  console.log('\n<‰ All Database Examples Completed!');
}

// Execute if run directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicDatabaseSetup,
  transactionalTestSetup,
  dataSeeding,
  stateVerification,
  rollbackOnFailure,
  performanceWithDatabase,
  runAllExamples
};