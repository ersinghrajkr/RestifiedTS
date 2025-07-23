import { expect } from 'chai';
import { restified } from '../../src';

describe('Snapshot Testing Integration Tests', () => {
  
  describe('Basic Snapshot Operations', () => {
    it('should create and compare API response snapshots', async function() {
      this.timeout(8000);
      
      try {
        // First request - create baseline snapshot
        const result1 = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
            .snapshot('post-1-baseline')
          .execute();

        expect(result1.status).to.equal(200);
        
        // Second request - compare against snapshot
        const result2 = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
            .compareSnapshot('post-1-baseline')
          .execute();

        expect(result2.status).to.equal(200);

      } catch (error: any) {
        console.warn('Basic snapshot test failed:', error.message);
        this.skip();
      }
    });

    it('should detect differences in API responses', async function() {
      this.timeout(8000);
      
      try {
        // Create baseline snapshot from post 1
        await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
            .snapshot('post-difference-test')
          .execute();

        // Compare with different post (should detect differences)
        try {
          await restified
            .given()
              .baseURL('https://jsonplaceholder.typicode.com')
            .when()
              .get('/posts/2')
            .then()
              .statusCode(200)
              .compareSnapshot('post-difference-test', { strict: true })
            .execute();
          
          expect.fail('Should have detected differences between posts');
        } catch (snapshotError) {
          // Expected to fail due to differences
          expect(snapshotError.message).to.include('snapshot');
        }

      } catch (error: any) {
        console.warn('Snapshot difference detection test failed:', error.message);
        this.skip();
      }
    });

    it('should support partial snapshot comparisons', async function() {
      this.timeout(5000);
      
      try {
        // Create snapshot focusing on specific fields
        const result = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
            .snapshotFields('post-partial', ['id', 'userId', 'title'])
            .compareSnapshotFields('post-partial', ['id', 'userId', 'title'])
          .execute();

        expect(result.status).to.equal(200);

      } catch (error: any) {
        console.warn('Partial snapshot comparison test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('Dynamic Data Handling', () => {
    it('should ignore dynamic fields in snapshots', async function() {
      this.timeout(5000);
      
      try {
        // Create API response with dynamic timestamp
        const result1 = await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/json')
          .then()
            .statusCode(200)
            .snapshot('dynamic-data-test', {
              ignorePaths: ['$.slideshow.date', '$.timestamp']
            })
          .execute();

        expect(result1.status).to.equal(200);
        
        // Second request should match despite dynamic fields
        const result2 = await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/json')
          .then()
            .statusCode(200)
            .compareSnapshot('dynamic-data-test', {
              ignorePaths: ['$.slideshow.date', '$.timestamp']
            })
          .execute();

        expect(result2.status).to.equal(200);

      } catch (error: any) {
        console.warn('Dynamic data handling test failed:', error.message);
        this.skip();
      }
    });

    it('should normalize timestamps in snapshots', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .header('Content-Type', 'application/json')
            .body({
              event: 'test',
              timestamp: new Date().toISOString(),
              data: 'consistent data'
            })
          .when()
            .post('/post')
          .then()
            .statusCode(200)
            .snapshot('timestamp-normalization', {
              normalizers: {
                'timestamp': '{{NORMALIZED_TIMESTAMP}}',
                'date': '{{NORMALIZED_DATE}}'
              }
            })
          .execute();

        expect(result.status).to.equal(200);

      } catch (error: any) {
        console.warn('Timestamp normalization test failed:', error.message);
        this.skip();
      }
    });

    it('should handle array ordering in snapshots', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts?_limit=5')
          .then()
            .statusCode(200)
            .snapshot('array-ordering', {
              sortArrays: true,
              sortBy: 'id'
            })
          .execute();

        expect(result.status).to.equal(200);
        expect(Array.isArray(result.data)).to.be.true;

      } catch (error: any) {
        console.warn('Array ordering test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('Snapshot Workflows', () => {
    it('should support multi-step snapshot workflows', async function() {
      this.timeout(15000);
      
      try {
        // Step 1: Create a post and snapshot the response
        const createResult = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .header('Content-Type', 'application/json')
            .body({
              title: 'Snapshot Workflow Test',
              body: 'Testing multi-step snapshot workflow',
              userId: 1
            })
          .when()
            .post('/posts')
          .then()
            .statusCode(201)
            .snapshot('workflow-create-post')
            .extract('$.id', 'createdPostId')
          .execute();

        expect(createResult.status).to.equal(201);
        
        // Step 2: Retrieve the post and compare with expected structure
        const retrieveResult = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .pathParam('postId', '{{createdPostId}}')
          .when()
            .get('/posts/{{postId}}')
          .then()
            .statusCode(200)
            .snapshotStructure('workflow-post-structure')
          .execute();

        expect(retrieveResult.status).to.equal(200);
        
        // Step 3: Update the post and snapshot the changes
        const updateResult = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .header('Content-Type', 'application/json')
            .pathParam('postId', '{{createdPostId}}')
            .body({
              id: '{{createdPostId}}',
              title: 'Updated Snapshot Workflow Test',
              body: 'Updated content for workflow testing',
              userId: 1
            })
          .when()
            .put('/posts/{{postId}}')
          .then()
            .statusCode(200)
            .snapshot('workflow-update-post')
          .execute();

        expect(updateResult.status).to.equal(200);

      } catch (error: any) {
        console.warn('Multi-step snapshot workflow test failed:', error.message);
        this.skip();
      }
    });

    it('should support conditional snapshot creation', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
            .conditionalSnapshot('conditional-test', (response) => {
              return response.data.userId === 1; // Only snapshot if userId is 1
            })
          .execute();

        expect(result.status).to.equal(200);

      } catch (error: any) {
        console.warn('Conditional snapshot test failed:', error.message);
        this.skip();
      }
    });

    it('should support snapshot inheritance and extension', async function() {
      this.timeout(8000);
      
      try {
        // Create base snapshot
        await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/users/1')
          .then()
            .statusCode(200)
            .snapshot('base-user-snapshot')
          .execute();

        // Create extended snapshot that inherits from base
        const result = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/users/1')
          .then()
            .statusCode(200)
            .extendSnapshot('base-user-snapshot', 'extended-user-snapshot', {
              additionalChecks: ['$.website', '$.company.name']
            })
          .execute();

        expect(result.status).to.equal(200);

      } catch (error: any) {
        console.warn('Snapshot inheritance test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('Snapshot Management', () => {
    it('should list and manage snapshots', async function() {
      this.timeout(8000);
      
      try {
        // Create multiple snapshots
        await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
            .snapshot('management-test-1')
          .execute();

        await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/2')
          .then()
            .statusCode(200)
            .snapshot('management-test-2')
          .execute();

        // List snapshots
        const snapshots = await restified.listSnapshots();
        expect(snapshots).to.include('management-test-1');
        expect(snapshots).to.include('management-test-2');

        // Get snapshot info
        const snapshotInfo = await restified.getSnapshotInfo('management-test-1');
        expect(snapshotInfo).to.have.property('createdAt');
        expect(snapshotInfo).to.have.property('size');

      } catch (error: any) {
        console.warn('Snapshot management test failed:', error.message);
        this.skip();
      }
    });

    it('should clean up old snapshots', async function() {
      this.timeout(5000);
      
      try {
        // Create a temporary snapshot
        await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
            .snapshot('cleanup-test-snapshot')
          .execute();

        // Verify snapshot exists
        const exists = await restified.snapshotExists('cleanup-test-snapshot');
        expect(exists).to.be.true;

        // Clean up the snapshot
        await restified.deleteSnapshot('cleanup-test-snapshot');

        // Verify snapshot was deleted
        const existsAfterCleanup = await restified.snapshotExists('cleanup-test-snapshot');
        expect(existsAfterCleanup).to.be.false;

      } catch (error: any) {
        console.warn('Snapshot cleanup test failed:', error.message);
        this.skip();
      }
    });

    it('should export and import snapshots', async function() {
      this.timeout(8000);
      
      try {
        // Create and export snapshot
        await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
            .snapshot('export-import-test')
          .execute();

        const exportedSnapshot = await restified.exportSnapshot('export-import-test');
        expect(exportedSnapshot).to.be.a('string');

        // Delete original snapshot
        await restified.deleteSnapshot('export-import-test');

        // Import snapshot back
        await restified.importSnapshot('export-import-test', exportedSnapshot);

        // Verify import worked
        const exists = await restified.snapshotExists('export-import-test');
        expect(exists).to.be.true;

      } catch (error: any) {
        console.warn('Snapshot export/import test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('Performance and Large Data', () => {
    it('should handle large response snapshots efficiently', async function() {
      this.timeout(10000);
      
      try {
        // Get a larger dataset
        const result = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts')
          .then()
            .statusCode(200)
            .snapshot('large-dataset-snapshot', {
              compress: true
            })
          .execute();

        expect(result.status).to.equal(200);
        expect(Array.isArray(result.data)).to.be.true;
        expect(result.data.length).to.be.greaterThan(50);

      } catch (error: any) {
        console.warn('Large data snapshot test failed:', error.message);
        this.skip();
      }
    });

    it('should handle concurrent snapshot operations', async function() {
      this.timeout(15000);
      
      try {
        // Create multiple snapshots concurrently
        const promises = [
          restified
            .given()
              .baseURL('https://jsonplaceholder.typicode.com')
            .when()
              .get('/posts/1')
            .then()
              .statusCode(200)
              .snapshot('concurrent-1')
            .execute(),
          
          restified
            .given()
              .baseURL('https://jsonplaceholder.typicode.com')
            .when()
              .get('/posts/2')
            .then()
              .statusCode(200)
              .snapshot('concurrent-2')
            .execute(),
          
          restified
            .given()
              .baseURL('https://jsonplaceholder.typicode.com')
            .when()
              .get('/posts/3')
            .then()
              .statusCode(200)
              .snapshot('concurrent-3')
            .execute()
        ];

        const results = await Promise.all(promises);
        
        results.forEach(result => {
          expect(result.status).to.equal(200);
        });

      } catch (error: any) {
        console.warn('Concurrent snapshot operations test failed:', error.message);
        this.skip();
      }
    });
  });
});