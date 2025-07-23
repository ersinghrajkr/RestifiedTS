/**
 * Basic Sleep/Wait Functionality Tests
 * 
 * Tests core sleep and wait methods across the DSL chain.
 */

import { expect } from 'chai';
import { RestifiedTS } from '../../src/core/dsl/RestifiedTS';

describe('Basic Sleep/Wait Tests @integration @sleep', () => {
  let restified: RestifiedTS;

  beforeEach(() => {
    restified = new RestifiedTS();
  });

  describe('Global RestifiedTS.wait() Method', () => {
    it('should wait for specified time', async function() {
      this.timeout(2000);

      const startTime = Date.now();
      await restified.wait(300);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).to.be.greaterThan(250);
      console.log(`✅ Global wait took ${duration}ms (expected >250ms)`);
    });

    it('should reject negative wait time', async function() {
      try {
        await restified.wait(-100);
        expect.fail('Should have thrown error for negative wait time');
      } catch (error: any) {
        expect(error.message).to.include('Wait time cannot be negative');
        console.log('✅ Correctly rejected negative wait time');
      }
    });
  });

  describe('GivenStep.wait() Method', () => {
    it('should wait during request setup', async function() {
      this.timeout(3000);

      const startTime = Date.now();
      
      const givenStep = await restified
        .given()
          .baseURL('https://httpbin.org')
          .wait(200);
      
      const endTime = Date.now();
      const waitDuration = endTime - startTime;
      
      expect(waitDuration).to.be.greaterThan(150);
      console.log(`✅ GivenStep wait took ${waitDuration}ms (expected >150ms)`);
      
      // Continue with the request to verify chain works
      await givenStep
        .when()
          .get('/get')
          .execute()
        .then()
          .statusCode(200);
      
      console.log('✅ DSL chain continued successfully after GivenStep wait');
    });

    it('should reject negative wait time', async function() {
      try {
        await restified
          .given()
            .baseURL('https://httpbin.org')
            .wait(-50);
        expect.fail('Should have thrown error for negative wait time');
      } catch (error: any) {
        expect(error.message).to.include('Wait time cannot be negative');
        console.log('✅ GivenStep correctly rejected negative wait time');
      }
    });
  });

  describe('WhenStep.wait() Method', () => {
    it('should wait during request execution phase', async function() {
      this.timeout(3000);

      const startTime = Date.now();
      
      const whenStep = await restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/get')
          .wait(250);
      
      const endTime = Date.now();
      const waitDuration = endTime - startTime;
      
      expect(waitDuration).to.be.greaterThan(200);
      console.log(`✅ WhenStep wait took ${waitDuration}ms (expected >200ms)`);
      
      // Continue with execution
      await whenStep
        .execute()
        .then()
          .statusCode(200);
      
      console.log('✅ DSL chain continued successfully after WhenStep wait');
    });

    it('should reject negative wait time', async function() {
      try {
        await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/get')
            .wait(-25);
        expect.fail('Should have thrown error for negative wait time');
      } catch (error: any) {
        expect(error.message).to.include('Wait time cannot be negative');
        console.log('✅ WhenStep correctly rejected negative wait time');
      }
    });
  });

  describe('ThenStep.wait() Method', () => {
    it('should wait after response processing', async function() {
      this.timeout(3000);

      const startTime = Date.now();
      
      await restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/get')
          .execute()
        .then()
          .statusCode(200)
          .wait(300)
          .execute();

      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      expect(totalDuration).to.be.greaterThan(250);
      console.log(`✅ ThenStep wait completed in ${totalDuration}ms (expected >250ms)`);
    });

    it('should reject negative wait time', async function() {
      try {
        await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/get')
            .execute()
          .then()
            .statusCode(200)
            .wait(-75)
            .execute();
        expect.fail('Should have thrown error for negative wait time');
      } catch (error: any) {
        expect(error.message).to.include('Wait time cannot be negative');
        console.log('✅ ThenStep correctly rejected negative wait time');
      }
    });
  });

  describe('ThenStep.waitUntil() Method', () => {
    it('should wait until condition is met', async function() {
      this.timeout(5000);

      let checkCount = 0;
      
      await restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/get')
          .execute()
        .then()
          .statusCode(200)
          .waitUntil(() => {
            checkCount++;
            console.log(`Condition check #${checkCount}`);
            return checkCount >= 3;
          }, 2000)
          .execute();

      expect(checkCount).to.be.greaterThanOrEqual(3);
      console.log(`✅ waitUntil completed after ${checkCount} checks`);
    });

    it('should timeout when condition is never met', async function() {
      this.timeout(3000);

      try {
        await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/get')
            .execute()
          .then()
            .statusCode(200)
            .waitUntil(() => false, 500)
            .execute();
        expect.fail('Should have thrown timeout error');
      } catch (error: any) {
        expect(error.message).to.include('Condition not met within 500ms timeout');
        console.log('✅ waitUntil correctly timed out');
      }
    });

    it('should handle async conditions', async function() {
      this.timeout(4000);

      let asyncCheckCount = 0;
      
      await restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/get')
          .execute()
        .then()
          .statusCode(200)
          .waitUntil(async () => {
            asyncCheckCount++;
            await new Promise(resolve => setTimeout(resolve, 50));
            return asyncCheckCount >= 2;
          }, 3000)
          .execute();

      expect(asyncCheckCount).to.be.greaterThanOrEqual(2);
      console.log(`✅ Async waitUntil completed after ${asyncCheckCount} checks`);
    });

    it('should reject negative timeout', async function() {
      try {
        await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/get')
            .execute()
          .then()
            .statusCode(200)
            .waitUntil(() => true, -100)
            .execute();
        expect.fail('Should have thrown error for negative timeout');
      } catch (error: any) {
        expect(error.message).to.include('Timeout cannot be negative');
        console.log('✅ waitUntil correctly rejected negative timeout');
      }
    });
  });

  describe('Combined Wait Scenarios', () => {
    it('should handle sequential waits across DSL steps', async function() {
      this.timeout(5000);

      const startTime = Date.now();
      
      // Global wait
      await restified.wait(100);
      
      // GivenStep wait
      const givenStep = await restified
        .given()
          .baseURL('https://httpbin.org')
          .header('X-Test', 'sequential-waits')
          .wait(100);
      
      // WhenStep wait
      const whenStep = await givenStep
        .when()
          .get('/headers')
          .wait(100);
      
      // Execute and verify
      await whenStep
        .execute()
        .then()
          .statusCode(200)
          .jsonPath('$.headers.X-Test', 'sequential-waits')
          .wait(100)
          .execute();

      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // Should take at least 400ms (100ms * 4)
      expect(totalDuration).to.be.greaterThan(350);
      console.log(`✅ Sequential waits completed in ${totalDuration}ms (expected >350ms)`);
    });

    it('should handle zero millisecond waits', async function() {
      this.timeout(2000);

      const startTime = Date.now();
      
      await restified.wait(0);
      
      const givenStep = await restified
        .given()
          .baseURL('https://httpbin.org')
          .wait(0);
      
      const whenStep = await givenStep
        .when()
          .get('/get')
          .wait(0);
      
      await whenStep
        .execute()
        .then()
          .statusCode(200)
          .wait(0)
          .execute();

      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // Should complete quickly with no artificial delays
      expect(totalDuration).to.be.lessThan(2000);
      console.log(`✅ Zero millisecond waits completed in ${totalDuration}ms`);
    });

    it('should maintain request context through waits', async function() {
      this.timeout(3000);

      const testId = `wait-test-${Date.now()}`;
      
      const givenStep = await restified
        .given()
          .baseURL('https://httpbin.org')
          .header('X-Request-ID', testId)
          .contextVariable('requestId', testId)
          .wait(100);
      
      await givenStep
        .when()
          .get('/headers')
          .execute()
        .then()
          .statusCode(200)
          .jsonPath('$.headers.X-Request-ID', testId)
          .execute();

      console.log(`✅ Request context maintained through waits for ID: ${testId}`);
    });
  });

  describe('Error Handling with Waits', () => {
    it('should maintain error context through waits', async function() {
      this.timeout(3000);

      try {
        const givenStep = await restified
          .given()
            .baseURL('https://httpbin.org')
            .wait(50);
        
        const whenStep = await givenStep
          .when()
            .get('/status/404')
            .wait(50);
        
        await whenStep
          .execute()
          .then()
            .statusCode(200) // This will fail
            .wait(50)
            .execute();
        
        expect.fail('Should have thrown error for 404 status');
      } catch (error: any) {
        expect(error.message).to.include('expected 404 to equal 200');
        console.log('✅ Error context maintained through waits');
      }
    });
  });
});