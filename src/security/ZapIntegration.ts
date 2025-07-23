/**
 * OWASP ZAP Integration for RestifiedTS
 * 
 * Provides automated security testing capabilities including:
 * - Passive scanning during API tests
 * - Active security scanning
 * - Custom security test policies
 */

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

export interface ZapConfig {
  zapApiUrl: string;
  zapApiKey: string;
  proxyHost: string;
  proxyPort: number;
  enablePassiveScanning: boolean;
  enableActiveScanning: boolean;
  scanPolicyName?: string;
  contextName: string;
  sessionName: string;
  timeout: number;
}

export interface ZapScanResult {
  scanId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  alerts: ZapAlert[];
  summary: ZapScanSummary;
  timestamp: Date;
}

export interface ZapAlert {
  pluginId: string;
  alert: string;
  name: string;
  riskcode: string;
  riskdesc: string;
  confidence: string;
  confidencedesc: string;
  desc: string;
  instances: ZapAlertInstance[];
  count: string;
  solution: string;
  reference: string;
  cweid: string;
  wascid: string;
  sourceid: string;
}

export interface ZapAlertInstance {
  uri: string;
  method: string;
  param: string;
  attack: string;
  evidence: string;
  otherinfo: string;
}

export interface ZapScanSummary {
  high: number;
  medium: number;
  low: number;
  informational: number;
  total: number;
}

export interface SecurityTestPolicy {
  name: string;
  description: string;
  rules: SecurityRule[];
  enabled: boolean;
}

export interface SecurityRule {
  pluginId: string;
  name: string;
  enabled: boolean;
  attackStrength: 'low' | 'medium' | 'high' | 'insane';
  alertThreshold: 'off' | 'low' | 'medium' | 'high';
}

/**
 * OWASP ZAP Integration Manager
 */
export class ZapIntegration extends EventEmitter {
  private config: ZapConfig;
  private zapClient: AxiosInstance;
  private activeScans: Map<string, ZapScanResult> = new Map();
  private proxyClient?: AxiosInstance;

  constructor(config: ZapConfig) {
    super();
    this.config = config;
    
    // Initialize ZAP API client
    this.zapClient = axios.create({
      baseURL: config.zapApiUrl,
      timeout: config.timeout,
      params: {
        zapapiformat: 'JSON',
        apikey: config.zapApiKey
      }
    });
  }

  /**
   * Initialize ZAP proxy and context
   */
  async initialize(): Promise<void> {
    try {
      // Check ZAP status
      await this.checkZapStatus();
      
      // Setup proxy configuration
      await this.setupProxy();
      
      // Create context and session
      await this.createContext();
      await this.createSession();
      
      // Load security policies
      await this.loadSecurityPolicies();
      
      this.emit('zap:initialized');
    } catch (error) {
      this.emit('zap:error', error);
      throw error;
    }
  }

  /**
   * Setup proxy for intercepting API calls
   */
  async setupProxy(): Promise<void> {
    // Configure proxy client for RestifiedTS to use
    this.proxyClient = axios.create({
      proxy: {
        host: this.config.proxyHost,
        port: this.config.proxyPort,
        protocol: 'http'
      },
      timeout: this.config.timeout
    });

    // Enable proxy chaining mode in ZAP
    await this.zapClient.get('/JSON/core/action/setOptionProxyChainName/', {
      params: { String: this.config.proxyHost }
    });

    await this.zapClient.get('/JSON/core/action/setOptionProxyChainPort/', {
      params: { Integer: this.config.proxyPort }
    });
  }

  /**
   * Create ZAP context for organizing scans
   */
  async createContext(): Promise<void> {
    try {
      await this.zapClient.get('/JSON/context/action/newContext/', {
        params: { contextName: this.config.contextName }
      });
    } catch (error) {
      // Context might already exist
      console.warn('Context creation warning:', error);
    }
  }

  /**
   * Create ZAP session
   */
  async createSession(): Promise<void> {
    try {
      await this.zapClient.get('/JSON/core/action/newSession/', {
        params: { 
          name: this.config.sessionName,
          overwrite: 'true'
        }
      });
    } catch (error) {
      console.warn('Session creation warning:', error);
    }
  }

  /**
   * Check ZAP daemon status
   */
  async checkZapStatus(): Promise<boolean> {
    try {
      const response = await this.zapClient.get('/JSON/core/view/version/');
      return response.status === 200;
    } catch (error) {
      throw new Error('ZAP daemon is not running or not accessible');
    }
  }

  /**
   * Get proxy client for API tests to use
   */
  getProxyClient(): AxiosInstance | undefined {
    return this.proxyClient;
  }

  /**
   * Start passive scanning on URLs
   */
  async startPassiveScanning(urls: string[]): Promise<void> {
    if (!this.config.enablePassiveScanning) {
      return;
    }

    for (const url of urls) {
      // Add URL to ZAP's sites tree
      await this.zapClient.get('/JSON/core/action/accessUrl/', {
        params: { url, followRedirects: 'true' }
      });
    }

    // Enable passive scanning
    await this.zapClient.get('/JSON/pscan/action/setEnabled/', {
      params: { enabled: 'true' }
    });

    this.emit('passive:started', { urls });
  }

  /**
   * Start active security scanning
   */
  async startActiveScan(targetUrl: string, policyName?: string): Promise<string> {
    if (!this.config.enableActiveScanning) {
      throw new Error('Active scanning is disabled');
    }

    const response = await this.zapClient.get('/JSON/ascan/action/scan/', {
      params: {
        url: targetUrl,
        recurse: 'true',
        inScopeOnly: 'false',
        scanPolicyName: policyName || this.config.scanPolicyName || 'Default Policy',
        method: 'GET',
        postData: ''
      }
    });

    const scanId = response.data.scan;
    
    // Initialize scan tracking
    this.activeScans.set(scanId, {
      scanId,
      status: 'running',
      progress: 0,
      alerts: [],
      summary: { high: 0, medium: 0, low: 0, informational: 0, total: 0 },
      timestamp: new Date()
    });

    this.emit('active:started', { scanId, targetUrl });
    
    // Start monitoring scan progress
    this.monitorScanProgress(scanId);
    
    return scanId;
  }

  /**
   * Monitor active scan progress
   */
  private async monitorScanProgress(scanId: string): Promise<void> {
    const checkProgress = async () => {
      try {
        const response = await this.zapClient.get('/JSON/ascan/view/status/', {
          params: { scanId }
        });

        const progress = parseInt(response.data.status);
        const scanResult = this.activeScans.get(scanId);
        
        if (scanResult) {
          scanResult.progress = progress;
          
          if (progress >= 100) {
            scanResult.status = 'completed';
            await this.collectScanResults(scanId);
            this.emit('active:completed', scanResult);
            return;
          } else {
            this.emit('active:progress', { scanId, progress });
            // Continue monitoring
            setTimeout(checkProgress, 5000);
          }
        }
      } catch (error) {
        const scanResult = this.activeScans.get(scanId);
        if (scanResult) {
          scanResult.status = 'failed';
          this.emit('active:failed', { scanId, error });
        }
      }
    };

    checkProgress();
  }

  /**
   * Collect scan results and alerts
   */
  async collectScanResults(scanId: string): Promise<ZapScanResult> {
    // Get alerts
    const alertsResponse = await this.zapClient.get('/JSON/core/view/alerts/');
    const alerts: ZapAlert[] = alertsResponse.data.alerts || [];

    // Calculate summary
    const summary: ZapScanSummary = {
      high: alerts.filter(a => a.riskdesc === 'High').length,
      medium: alerts.filter(a => a.riskdesc === 'Medium').length,
      low: alerts.filter(a => a.riskdesc === 'Low').length,
      informational: alerts.filter(a => a.riskdesc === 'Informational').length,
      total: alerts.length
    };

    const scanResult: ZapScanResult = {
      scanId,
      status: 'completed',
      progress: 100,
      alerts,
      summary,
      timestamp: new Date()
    };

    this.activeScans.set(scanId, scanResult);
    return scanResult;
  }

  /**
   * Get scan results
   */
  getScanResult(scanId: string): ZapScanResult | undefined {
    return this.activeScans.get(scanId);
  }

  /**
   * Get all active scans
   */
  getActiveScans(): ZapScanResult[] {
    return Array.from(this.activeScans.values());
  }

  /**
   * Load custom security policies
   */
  async loadSecurityPolicies(): Promise<void> {
    try {
      // Load default policies
      const policies = await this.getBuiltInPolicies();
      
      for (const policy of policies) {
        await this.createSecurityPolicy(policy);
      }
    } catch (error) {
      console.warn('Failed to load security policies:', error);
    }
  }

  /**
   * Create custom security policy
   */
  async createSecurityPolicy(policy: SecurityTestPolicy): Promise<void> {
    // Create new policy
    await this.zapClient.get('/JSON/ascan/action/addScanPolicy/', {
      params: { scanPolicyName: policy.name }
    });

    // Configure rules
    for (const rule of policy.rules) {
      await this.zapClient.get('/JSON/ascan/action/setPolicyAttackStrength/', {
        params: {
          scanPolicyName: policy.name,
          id: rule.pluginId,
          attackStrength: rule.attackStrength.toUpperCase()
        }
      });

      await this.zapClient.get('/JSON/ascan/action/setPolicyAlertThreshold/', {
        params: {
          scanPolicyName: policy.name,
          id: rule.pluginId,
          alertThreshold: rule.alertThreshold.toUpperCase()
        }
      });

      await this.zapClient.get('/JSON/ascan/action/setEnabledPolicies/', {
        params: {
          scanPolicyName: policy.name,
          ids: rule.enabled ? rule.pluginId : ''
        }
      });
    }
  }

  /**
   * Get built-in security policies
   */
  private getBuiltInPolicies(): SecurityTestPolicy[] {
    return [
      {
        name: 'API Security Policy',
        description: 'Security policy focused on API vulnerabilities',
        enabled: true,
        rules: [
          {
            pluginId: '40012',
            name: 'Cross Site Scripting (Reflected)',
            enabled: true,
            attackStrength: 'medium',
            alertThreshold: 'medium'
          },
          {
            pluginId: '40014',
            name: 'Cross Site Scripting (Persistent)',
            enabled: true,
            attackStrength: 'medium',
            alertThreshold: 'medium'
          },
          {
            pluginId: '40018',
            name: 'SQL Injection',
            enabled: true,
            attackStrength: 'high',
            alertThreshold: 'low'
          },
          {
            pluginId: '40019',
            name: 'SQL Injection - MySQL',
            enabled: true,
            attackStrength: 'high',
            alertThreshold: 'low'
          },
          {
            pluginId: '40020',
            name: 'SQL Injection - Hypersonic SQL',
            enabled: true,
            attackStrength: 'high',
            alertThreshold: 'low'
          },
          {
            pluginId: '40021',
            name: 'SQL Injection - Oracle',
            enabled: true,
            attackStrength: 'high',
            alertThreshold: 'low'
          },
          {
            pluginId: '40022',
            name: 'SQL Injection - PostgreSQL',
            enabled: true,
            attackStrength: 'high',
            alertThreshold: 'low'
          }
        ]
      },
      {
        name: 'Authentication Security Policy',
        description: 'Security policy for authentication vulnerabilities',
        enabled: true,
        rules: [
          {
            pluginId: '10202',
            name: 'Absence of Anti-CSRF Tokens',
            enabled: true,
            attackStrength: 'medium',
            alertThreshold: 'medium'
          },
          {
            pluginId: '90001',
            name: 'Insecure HTTP Method',
            enabled: true,
            attackStrength: 'medium',
            alertThreshold: 'medium'
          },
          {
            pluginId: '90019',
            name: 'Code Injection',
            enabled: true,
            attackStrength: 'high',
            alertThreshold: 'medium'
          }
        ]
      }
    ];
  }

  /**
   * Generate security test report
   */
  async generateSecurityReport(scanId?: string): Promise<{
    summary: ZapScanSummary;
    alerts: ZapAlert[];
    recommendations: string[];
    riskAssessment: string;
  }> {
    let alerts: ZapAlert[] = [];
    
    if (scanId) {
      const scanResult = this.getScanResult(scanId);
      alerts = scanResult?.alerts || [];
    } else {
      // Get all alerts
      const alertsResponse = await this.zapClient.get('/JSON/core/view/alerts/');
      alerts = alertsResponse.data.alerts || [];
    }

    const summary: ZapScanSummary = {
      high: alerts.filter(a => a.riskdesc === 'High').length,
      medium: alerts.filter(a => a.riskdesc === 'Medium').length,
      low: alerts.filter(a => a.riskdesc === 'Low').length,
      informational: alerts.filter(a => a.riskdesc === 'Informational').length,
      total: alerts.length
    };

    const recommendations = this.generateRecommendations(alerts);
    const riskAssessment = this.assessOverallRisk(summary);

    return {
      summary,
      alerts,
      recommendations,
      riskAssessment
    };
  }

  /**
   * Generate security recommendations based on alerts
   */
  private generateRecommendations(alerts: ZapAlert[]): string[] {
    const recommendations: string[] = [];
    const alertTypes = new Set(alerts.map(a => a.pluginId));

    alertTypes.forEach(pluginId => {
      switch (pluginId) {
        case '40018':
        case '40019':
        case '40020':
        case '40021':
        case '40022':
          recommendations.push('Implement parameterized queries to prevent SQL injection attacks');
          break;
        case '40012':
        case '40014':
          recommendations.push('Implement proper input validation and output encoding to prevent XSS attacks');
          break;
        case '10202':
          recommendations.push('Implement CSRF tokens for state-changing operations');
          break;
        case '90001':
          recommendations.push('Restrict HTTP methods to only those required by the API');
          break;
      }
    });

    return recommendations;
  }

  /**
   * Assess overall security risk
   */
  private assessOverallRisk(summary: ZapScanSummary): string {
    if (summary.high > 0) {
      return 'HIGH - Critical security vulnerabilities found that require immediate attention';
    } else if (summary.medium > 5) {
      return 'MEDIUM-HIGH - Multiple medium-risk vulnerabilities found';
    } else if (summary.medium > 0) {
      return 'MEDIUM - Some security vulnerabilities found that should be addressed';
    } else if (summary.low > 10) {
      return 'LOW-MEDIUM - Many low-risk vulnerabilities found';
    } else if (summary.low > 0) {
      return 'LOW - Minor security issues found';
    } else {
      return 'MINIMAL - No significant security vulnerabilities detected';
    }
  }

  /**
   * Cleanup ZAP session and resources
   */
  async cleanup(): Promise<void> {
    try {
      // Stop all active scans
      for (const scanId of this.activeScans.keys()) {
        await this.zapClient.get('/JSON/ascan/action/stop/', {
          params: { scanId }
        });
      }

      // Clear session data
      await this.zapClient.get('/JSON/core/action/clearExcludedFromProxy/');
      
      this.emit('zap:cleanup');
    } catch (error) {
      this.emit('zap:error', error);
    }
  }
}