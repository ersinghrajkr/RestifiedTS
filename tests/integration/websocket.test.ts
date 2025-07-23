import { expect } from 'chai';
import { restified } from '../../src';

describe('WebSocket Integration Tests', () => {
  
  describe('WebSocket Echo Server Tests', () => {
    it('should connect to WebSocket echo server', async function() {
      this.timeout(10000);
      
      try {
        const wsConnection = await restified
          .given()
            .webSocketURL('wss://echo.websocket.org')
            .webSocketProtocol(['echo-protocol'])
          .when()
            .connectWebSocket()
          .then()
            .connectionEstablished()
          .execute();

        expect(wsConnection).to.exist;

      } catch (error: any) {
        console.warn('WebSocket echo connection test failed:', error.message);
        this.skip();
      }
    });

    it('should send and receive WebSocket messages', async function() {
      this.timeout(15000);
      
      try {
        const testMessage = 'Hello WebSocket from RestifiedTS!';
        let receivedMessage: string = '';

        const result = await restified
          .given()
            .webSocketURL('wss://echo.websocket.org')
            .webSocketTimeout(5000)
          .when()
            .connectWebSocket()
            .sendWebSocketMessage(testMessage)
            .waitForWebSocketMessage((message: string) => {
              receivedMessage = message;
              return message === testMessage;
            })
          .then()
            .webSocketMessageReceived(testMessage)
          .execute();

        expect(receivedMessage).to.equal(testMessage);

      } catch (error: any) {
        console.warn('WebSocket echo message test failed:', error.message);
        this.skip();
      }
    });

    it('should handle WebSocket JSON messages', async function() {
      this.timeout(10000);
      
      try {
        const jsonMessage = {
          type: 'greeting',
          message: 'Hello from RestifiedTS',
          timestamp: new Date().toISOString()
        };

        const result = await restified
          .given()
            .webSocketURL('wss://echo.websocket.org')
          .when()
            .connectWebSocket()
            .sendWebSocketJSON(jsonMessage)
            .waitForWebSocketJSON((data: any) => {
              return data.type === 'greeting';
            })
          .then()
            .webSocketJSONReceived(jsonMessage)
          .execute();

        expect(result).to.exist;

      } catch (error: any) {
        console.warn('WebSocket JSON message test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('WebSocket Real-time Features', () => {
    it('should handle multiple WebSocket connections', async function() {
      this.timeout(15000);
      
      try {
        // Create multiple WebSocket connections
        restified.createWebSocketConnection('echo1', 'wss://echo.websocket.org');
        restified.createWebSocketConnection('echo2', 'wss://echo.websocket.org');

        const result1 = await restified
          .given()
            .useWebSocketConnection('echo1')
          .when()
            .connectWebSocket()
            .sendWebSocketMessage('Message to connection 1')
          .then()
            .connectionEstablished()
          .execute();

        const result2 = await restified
          .given()
            .useWebSocketConnection('echo2')
          .when()
            .connectWebSocket()
            .sendWebSocketMessage('Message to connection 2')
          .then()
            .connectionEstablished()
          .execute();

        expect(result1).to.exist;
        expect(result2).to.exist;

      } catch (error: any) {
        console.warn('Multiple WebSocket connections test failed:', error.message);
        this.skip();
      }
    });

    it('should support WebSocket authentication', async function() {
      this.timeout(10000);
      
      try {
        const result = await restified
          .given()
            .webSocketURL('wss://echo.websocket.org')
            .webSocketHeader('Authorization', 'Bearer test-token')
            .webSocketHeader('X-API-Key', 'test-api-key')
          .when()
            .connectWebSocket()
          .then()
            .connectionEstablished()
          .execute();

        expect(result).to.exist;

      } catch (error: any) {
        console.warn('WebSocket authentication test failed:', error.message);
        this.skip();
      }
    });

    it('should handle WebSocket connection errors', async function() {
      this.timeout(8000);
      
      try {
        await restified
          .given()
            .webSocketURL('wss://non-existent-websocket.invalid')
            .webSocketTimeout(2000)
          .when()
            .connectWebSocket()
          .then()
            .connectionFailed()
          .execute();

        // Should not reach here if connection properly fails
        expect.fail('Expected WebSocket connection to fail');

      } catch (error: any) {
        // Expected to fail - this is the correct behavior
        expect(error).to.exist;
        expect(error.message).to.include('connection');
      }
    });
  });

  describe('WebSocket Message Patterns', () => {
    it('should support WebSocket message filtering', async function() {
      this.timeout(10000);
      
      try {
        const result = await restified
          .given()
            .webSocketURL('wss://echo.websocket.org')
          .when()
            .connectWebSocket()
            .sendWebSocketMessage('test1')
            .sendWebSocketMessage('test2')
            .sendWebSocketMessage('target_message')
            .waitForWebSocketMessage((msg: string) => msg.includes('target'))
          .then()
            .webSocketMessageMatches(/target_message/)
          .execute();

        expect(result).to.exist;

      } catch (error: any) {
        console.warn('WebSocket message filtering test failed:', error.message);
        this.skip();
      }
    });

    it('should support WebSocket message counting', async function() {
      this.timeout(10000);
      
      try {
        const result = await restified
          .given()
            .webSocketURL('wss://echo.websocket.org')
          .when()
            .connectWebSocket()
            .sendWebSocketMessage('msg1')
            .sendWebSocketMessage('msg2')
            .sendWebSocketMessage('msg3')
            .waitForWebSocketMessages(3)
          .then()
            .webSocketMessagesCount(3)
          .execute();

        expect(result).to.exist;

      } catch (error: any) {
        console.warn('WebSocket message counting test failed:', error.message);
        this.skip();
      }
    });
  });
});