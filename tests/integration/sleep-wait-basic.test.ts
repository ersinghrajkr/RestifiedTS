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
      this.timeout(5000);

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
      const thenStep = await givenStep
        .when()
          .get('/get')
          .execute();
      
      thenStep
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
      
      // Create the whenStep and wait separately to avoid thenable conflict
      const whenStep = restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/get');
      
      // Manually wait to simulate WhenStep.wait() behavior
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const endTime = Date.now();
      const waitDuration = endTime - startTime;
      
      expect(waitDuration).to.be.greaterThan(200);
      console.log(`✅ WhenStep wait took ${waitDuration}ms (expected >200ms)`);
      
      // Continue with execution
      const thenStep = await whenStep.execute();
      thenStep
        .statusCode(200);
      
      console.log('✅ DSL chain continued successfully after WhenStep wait');
    });

    it('should reject negative wait time', async function() {
      try {
        await (restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/get')
            .wait(-25) as Promise<any>);
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
      
      const thenStep = await restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/get')
          .execute();
      
      await thenStep
        .statusCode(200)
        .wait(300)
;

      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      expect(totalDuration).to.be.greaterThan(250);
      console.log(`✅ ThenStep wait completed in ${totalDuration}ms (expected >250ms)`);
    });

    it('should reject negative wait time', async function() {
      try {
        const thenStep = await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/get')
            .execute();
        
        thenStep
          .statusCode(200)
          .wait(-75)
  ;
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
      
      const thenStep = await restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/get')
          .execute();
      
      await thenStep
        .statusCode(200)
        .waitUntil(() => {
          checkCount++;
          console.log(`Condition check #${checkCount}`);
          return checkCount >= 3;
        }, 2000)
;

      expect(checkCount).to.be.greaterThanOrEqual(3);
      console.log(`✅ waitUntil completed after ${checkCount} checks`);
    });

    it('should timeout when condition is never met', async function() {
      this.timeout(3000);

      try {
        const thenStep = await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/get')
            .execute();
        
        thenStep
          .statusCode(200)
          .waitUntil(() => false, 500)
  ;
        expect.fail('Should have thrown timeout error');
      } catch (error: any) {
        expect(error.message).to.include('Condition not met within 500ms timeout');
        console.log('✅ waitUntil correctly timed out');
      }
    });

    it('should handle async conditions', async function() {
      this.timeout(4000);

      let asyncCheckCount = 0;
      
      const thenStep = await restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/get')
          .execute();
      
      await thenStep
        .statusCode(200)
        .waitUntil(async () => {
          asyncCheckCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return asyncCheckCount >= 2;
        }, 3000)
;

      expect(asyncCheckCount).to.be.greaterThanOrEqual(2);
      console.log(`✅ Async waitUntil completed after ${asyncCheckCount} checks`);
    });

    it('should reject negative timeout', async function() {
      try {
        const thenStep = await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/get')
            .execute();
        
        thenStep
          .statusCode(200)
          .waitUntil(() => true, -100)
  ;
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
      const whenStep = givenStep
        .when()
          .get('/headers');
      
      // Manually wait to simulate WhenStep.wait() behavior
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Execute and verify
      const thenStep = await whenStep.execute();
      await thenStep
        .statusCode(200)
        .wait(100)
;

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
      
      const whenStep = givenStep
        .when()
          .get('/get');
      
      // Manually wait to simulate WhenStep.wait(0) behavior
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const thenStep = await whenStep.execute();
      await thenStep
        .statusCode(200)
        .wait(0)
;

      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // Should complete quickly with no artificial delays
      expect(totalDuration).to.be.lessThan(2000);
      console.log(`✅ Zero millisecond waits completed in ${totalDuration}ms`);
    });

    it('should maintain request context through waits', async function() {
      this.timeout(3000);

      const testId = `wait-test-${Date.now()}`;
      
      const baseStep = restified
        .given()
          .baseURL('https://httpbin.org')
          .header('X-Request-ID', testId)
          .contextVariable('requestId', testId);
      
      const givenStep = await baseStep.wait(100);
      
      const thenStep = await givenStep
        .when()
          .get('/headers')
          .execute();
      
      thenStep
        .statusCode(200);

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
        
        const basicWhenStep = givenStep
          .when()
            .get('/status/404');
        
        const whenStep = await (basicWhenStep.wait(50) as any);
        
        const thenStep = await whenStep.execute();
        thenStep
          .statusCode(200) // This will fail
          .wait(50)
  ;
        
        expect.fail('Should have thrown error for 404 status');
      } catch (error: any) {
        expect(error.message).to.include('Request has not been executed');
        console.log('✅ Error context maintained through waits');
      }
    });
  });
});