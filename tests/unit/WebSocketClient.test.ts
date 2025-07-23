import { expect } from 'chai';
import { WebSocketClient, WebSocketManager } from '../../src/core/clients';

describe('WebSocket Client Tests @unit @integration', () => {
  let webSocketClient: WebSocketClient;
  let webSocketManager: WebSocketManager;

  beforeEach(() => {
    webSocketClient = new WebSocketClient({ 
      url: 'wss://echo.websocket.org',
      timeout: 5000,
      maxReconnectAttempts: 3
    });
    webSocketManager = new WebSocketManager();
  });

  afterEach(async () => {
    // Clean up connections
    try {
      if (webSocketClient.getConnectionInfo().state === 'open') {
        await webSocketClient.disconnect();
      }
      await webSocketManager.clear();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('WebSocketClient Initialization', () => {
    it('should initialize WebSocket client without errors', () => {
      expect(webSocketClient).to.be.instanceOf(WebSocketClient);
    });

    it('should have connect method', () => {
      expect(webSocketClient).to.have.property('connect');
      expect(typeof webSocketClient.connect).to.equal('function');
    });

    it('should have sendText method', () => {
      expect(webSocketClient).to.have.property('sendText');
      expect(typeof webSocketClient.sendText).to.equal('function');
    });

    it('should have sendJSON method', () => {
      expect(webSocketClient).to.have.property('sendJSON');
      expect(typeof webSocketClient.sendJSON).to.equal('function');
    });

    it('should have sendBinary method', () => {
      expect(webSocketClient).to.have.property('sendBinary');
      expect(typeof webSocketClient.sendBinary).to.equal('function');
    });

    it('should have disconnect method', () => {
      expect(webSocketClient).to.have.property('disconnect');
      expect(typeof webSocketClient.disconnect).to.equal('function');
    });

    it('should have event handling capabilities', () => {
      expect(webSocketClient).to.have.property('on');
      expect(typeof webSocketClient.on).to.equal('function');
      expect(webSocketClient).to.have.property('off');
      expect(typeof webSocketClient.off).to.equal('function');
      expect(webSocketClient).to.have.property('emit');
      expect(typeof webSocketClient.emit).to.equal('function');
    });

    it('should have waitForMessage method', () => {
      expect(webSocketClient).to.have.property('waitForMessage');
      expect(typeof webSocketClient.waitForMessage).to.equal('function');
    });

    it('should have waitForConnection method', () => {
      expect(webSocketClient).to.have.property('waitForConnection');
      expect(typeof webSocketClient.waitForConnection).to.equal('function');
    });
  });

  describe('WebSocket Connection Info', () => {
    it('should provide initial connection info', () => {
      const info = webSocketClient.getConnectionInfo();
      
      expect(info).to.exist;
      expect(info.url).to.equal('wss://echo.websocket.org');
      expect(info.state).to.equal('closed');
      expect(info.messageCount).to.deep.equal({ sent: 0, received: 0 });
      expect(info.bytesTransferred).to.deep.equal({ sent: 0, received: 0 });
    });

    it('should provide connection statistics', () => {
      const stats = webSocketClient.getStats();
      
      expect(stats).to.exist;
      expect(stats.state).to.equal('closed');
      expect(stats.messageCount).to.deep.equal({ sent: 0, received: 0 });
      expect(stats.bytesTransferred).to.deep.equal({ sent: 0, received: 0 });
      expect(stats.reconnectAttempts).to.equal(0);
    });

    it('should track message history', () => {
      const history = webSocketClient.getMessageHistory();
      
      expect(history).to.be.an('array');
      expect(history).to.have.length(0);
    });

    it('should clear message history', () => {
      webSocketClient.clearMessageHistory();
      const history = webSocketClient.getMessageHistory();
      
      expect(history).to.have.length(0);
    });
  });

  describe('WebSocket Message Filtering', () => {
    beforeEach(() => {
      // Mock some messages in history for testing
      const mockMessages = [
        {
          id: 'msg1',
          type: 'text' as const,
          data: 'Hello World',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          size: 11
        },
        {
          id: 'msg2',
          type: 'binary' as const,
          data: Buffer.from('binary data'),
          timestamp: new Date('2024-01-01T10:01:00Z'),
          size: 11
        }
      ];
      
      // Access private messageHistory through public methods
      webSocketClient.clearMessageHistory();
    });

    it('should filter messages by type', () => {
      const textMessages = webSocketClient.getMessagesByType('text');
      const binaryMessages = webSocketClient.getMessagesByType('binary');
      
      expect(textMessages).to.be.an('array');
      expect(binaryMessages).to.be.an('array');
    });

    it('should filter messages by time range', () => {
      const start = new Date('2024-01-01T09:00:00Z');
      const end = new Date('2024-01-01T11:00:00Z');
      
      const messagesInRange = webSocketClient.getMessagesInTimeRange(start, end);
      
      expect(messagesInRange).to.be.an('array');
    });

    it('should find messages with custom predicate', () => {
      const longMessages = webSocketClient.findMessages(msg => msg.size > 10);
      
      expect(longMessages).to.be.an('array');
    });
  });

  describe('WebSocket Configuration', () => {
    it('should support configuration updates', () => {
      expect(() => {
        webSocketClient.updateConfig({
          timeout: 10000,
          pingInterval: 60000,
          headers: {
            'Authorization': 'Bearer test-token'
          }
        });
      }).to.not.throw();
    });

    it('should support auto-reconnect configuration', () => {
      expect(() => {
        webSocketClient.enableAutoReconnect();
        webSocketClient.disableAutoReconnect();
      }).to.not.throw();
    });
  });

  describe('WebSocketManager', () => {
    it('should initialize WebSocket manager without errors', () => {
      expect(webSocketManager).to.be.instanceOf(WebSocketManager);
    });

    it('should support connection registration', () => {
      expect(() => {
        webSocketManager.addConnection({
          name: 'testWS',
          url: 'wss://echo.websocket.org',
          timeout: 5000
        });
      }).to.not.throw();
    });

    it('should retrieve registered connections', () => {
      webSocketManager.addConnection({
        name: 'testWS',
        url: 'wss://echo.websocket.org',
        timeout: 5000
      });
      
      const connection = webSocketManager.getClient('testWS');
      expect(connection).to.exist;
    });

    it('should handle multiple connections', () => {
      expect(() => {
        webSocketManager.addConnection({
          name: 'ws1',
          url: 'wss://echo.websocket.org',
          timeout: 5000
        });
        
        webSocketManager.addConnection({
          name: 'ws2',
          url: 'wss://ws.postman-echo.com/raw',
          timeout: 5000
        });
      }).to.not.throw();
      
      expect(webSocketManager.getClient('ws1')).to.exist;
      expect(webSocketManager.getClient('ws2')).to.exist;
    });

    it('should list connection names', () => {
      webSocketManager.addConnection({
        name: 'connection1',
        url: 'wss://echo.websocket.org'
      });
      
      webSocketManager.addConnection({
        name: 'connection2',
        url: 'wss://ws.postman-echo.com/raw'
      });

      const connectionNames = webSocketManager.getConnectionNames();
      expect(connectionNames).to.include('connection1');
      expect(connectionNames).to.include('connection2');
      expect(connectionNames).to.have.length(2);
    });

    it('should set active connection', () => {
      webSocketManager.addConnection({
        name: 'testConnection',
        url: 'wss://echo.websocket.org'
      });

      webSocketManager.setActiveConnection('testConnection');
      
      const activeClient = webSocketManager.getActiveClient();
      expect(activeClient).to.exist;
    });

    it('should remove connections', async () => {
      webSocketManager.addConnection({
        name: 'tempConnection',
        url: 'wss://echo.websocket.org'
      });

      expect(webSocketManager.getConnectionNames()).to.include('tempConnection');
      
      const removed = await webSocketManager.removeConnection('tempConnection');
      expect(removed).to.be.true;
      expect(webSocketManager.getConnectionNames()).to.not.include('tempConnection');
    });
  });

  describe('WebSocket Scenarios', () => {
    it('should add test scenarios', () => {
      expect(() => {
        webSocketManager.addScenario({
          name: 'basicTest',
          description: 'Basic WebSocket connection test',
          steps: [
            { type: 'connect', connection: 'testWS' },
            { type: 'send', data: 'Hello WebSocket' },
            { type: 'wait', matcher: { content: 'Hello WebSocket' } },
            { type: 'disconnect', connection: 'testWS' }
          ]
        });
      }).to.not.throw();
    });

    it('should retrieve test scenarios', () => {
      webSocketManager.addScenario({
        name: 'testScenario',
        steps: [
          { type: 'connect' },
          { type: 'disconnect' }
        ]
      });

      const scenario = webSocketManager.getScenario('testScenario');
      expect(scenario).to.exist;
      expect(scenario!.name).to.equal('testScenario');
    });

    it('should list scenario names', () => {
      webSocketManager.addScenario({
        name: 'scenario1',
        steps: [{ type: 'connect' }]
      });
      
      webSocketManager.addScenario({
        name: 'scenario2', 
        steps: [{ type: 'connect' }]
      });

      const scenarioNames = webSocketManager.getScenarioNames();
      expect(scenarioNames).to.include('scenario1');
      expect(scenarioNames).to.include('scenario2');
    });

    it('should remove scenarios', () => {
      webSocketManager.addScenario({
        name: 'tempScenario',
        steps: [{ type: 'connect' }]
      });

      expect(webSocketManager.getScenarioNames()).to.include('tempScenario');

      const removed = webSocketManager.removeScenario('tempScenario');
      expect(removed).to.be.true;
      expect(webSocketManager.getScenarioNames()).to.not.include('tempScenario');
    });
  });

  describe('WebSocket Manager Statistics', () => {
    it('should provide manager summary', () => {
      webSocketManager.addConnection({
        name: 'connection1',
        url: 'wss://example.com',
        tags: ['test', 'api']
      });

      webSocketManager.addScenario({
        name: 'scenario1',
        steps: [{ type: 'connect' }]
      });

      const summary = webSocketManager.getSummary();
      expect(summary.connectionCount).to.equal(1);
      expect(summary.scenarioCount).to.equal(1);
      expect(summary.activeConnection).to.equal('connection1');
      expect(summary.connections).to.have.length(1);
      expect(summary.connections[0].name).to.equal('connection1');
      expect(summary.connections[0].tags).to.deep.equal(['test', 'api']);
    });

    it('should get all connection stats', () => {
      webSocketManager.addConnection({
        name: 'statsConnection',
        url: 'wss://echo.websocket.org'
      });

      const allStats = webSocketManager.getAllStats();
      expect(allStats).to.have.property('statsConnection');
      expect(allStats.statsConnection.state).to.equal('closed');
    });

    it('should get all connection info', () => {
      webSocketManager.addConnection({
        name: 'infoConnection',
        url: 'wss://echo.websocket.org'
      });

      const allInfo = webSocketManager.getAllConnectionInfo();
      expect(allInfo).to.have.property('infoConnection');
      expect(allInfo.infoConnection.url).to.equal('wss://echo.websocket.org');
    });

    it('should get all message history', () => {
      webSocketManager.addConnection({
        name: 'historyConnection',
        url: 'wss://echo.websocket.org'
      });

      const allHistory = webSocketManager.getAllMessageHistory();
      expect(allHistory).to.have.property('historyConnection');
      expect(allHistory.historyConnection).to.be.an('array');
    });

    it('should clear all message history', () => {
      webSocketManager.addConnection({
        name: 'clearConnection',
        url: 'wss://echo.websocket.org'
      });

      expect(() => {
        webSocketManager.clearAllMessageHistory();
      }).to.not.throw();
    });
  });

  describe('WebSocket Connection Search', () => {
    it('should find connections by tag', () => {
      webSocketManager.addConnection({
        name: 'taggedConnection1',
        url: 'wss://example1.com',
        tags: ['api', 'test']
      });

      webSocketManager.addConnection({
        name: 'taggedConnection2',
        url: 'wss://example2.com',
        tags: ['api', 'production']
      });

      webSocketManager.addConnection({
        name: 'untaggedConnection',
        url: 'wss://example3.com'
      });

      const apiConnections = webSocketManager.findConnectionsByTag('api');
      const testConnections = webSocketManager.findConnectionsByTag('test');

      expect(apiConnections).to.include('taggedConnection1');
      expect(apiConnections).to.include('taggedConnection2');
      expect(apiConnections).to.have.length(2);

      expect(testConnections).to.include('taggedConnection1');
      expect(testConnections).to.have.length(1);
    });
  });

  describe('WebSocket Error Handling', () => {
    it('should handle missing connections gracefully', () => {
      expect(() => {
        webSocketManager.getClient('nonExistentConnection');
      }).to.not.throw();
      
      const client = webSocketManager.getClient('nonExistentConnection');
      expect(client).to.be.undefined;
    });

    it('should handle invalid scenario names', () => {
      expect(() => {
        webSocketManager.getScenario('nonExistentScenario');
      }).to.not.throw();
      
      const scenario = webSocketManager.getScenario('nonExistentScenario');
      expect(scenario).to.be.undefined;
    });

    it('should throw error when setting non-existent active connection', () => {
      expect(() => {
        webSocketManager.setActiveConnection('nonExistentConnection');
      }).to.throw('WebSocket connection \'nonExistentConnection\' not found');
    });
  });

  describe('WebSocket Manager Clear Operations', () => {
    it('should clear all connections and scenarios', async () => {
      webSocketManager.addConnection({
        name: 'clearTestConnection',
        url: 'wss://echo.websocket.org'
      });

      webSocketManager.addScenario({
        name: 'clearTestScenario',
        steps: [{ type: 'connect' }]
      });

      expect(webSocketManager.getConnectionNames()).to.have.length(1);
      expect(webSocketManager.getScenarioNames()).to.have.length(1);

      await webSocketManager.clear();

      expect(webSocketManager.getConnectionNames()).to.have.length(0);
      expect(webSocketManager.getScenarioNames()).to.have.length(0);
      
      const summary = webSocketManager.getSummary();
      expect(summary.connectionCount).to.equal(0);
      expect(summary.scenarioCount).to.equal(0);
      expect(summary.activeConnection).to.be.undefined;
    });
  });
});