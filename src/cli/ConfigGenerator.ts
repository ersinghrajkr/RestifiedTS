import * as fs from 'fs';
import * as path from 'path';

export interface ConfigOptions {
  environments: string[];
  outputDir: string;
}

export class ConfigGenerator {
  
  /**
   * Generate configuration files for different environments
   */
  async generateConfigs(options: ConfigOptions): Promise<string[]> {
    const generatedFiles: string[] = [];
    
    // Ensure output directory exists
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    // Generate default configuration first
    const defaultConfigPath = await this.generateDefaultConfig(options.outputDir);
    generatedFiles.push(defaultConfigPath);

    // Generate environment-specific configurations
    for (const environment of options.environments) {
      const configPath = await this.generateEnvironmentConfig(environment, options.outputDir);
      generatedFiles.push(configPath);
    }

    return generatedFiles;
  }

  private async generateDefaultConfig(outputDir: string): Promise<string> {
    const defaultConfig = {
      "timeout": 30000,
      "retries": 3,
      "baseURL": "https://api.example.com",
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "RestifiedTS/1.0.0"
      },
      "auth": {
        "type": "bearer",
        "token": "${API_TOKEN}",
        "refreshToken": "${REFRESH_TOKEN}"
      },
      "logging": {
        "level": "info",
        "requests": true,
        "responses": true,
        "requestHeaders": false,
        "responseHeaders": false,
        "requestBody": true,
        "responseBody": true
      },
      "reporting": {
        "formats": ["html", "json"],
        "directory": "reports",
        "includeSnapshots": true,
        "includeDiffs": true
      },
      "performance": {
        "responseTimeThreshold": 5000,
        "trackMemoryUsage": false,
        "maxConcurrentRequests": 10
      },
      "validation": {
        "strictMode": false,
        "validateResponseSchema": false,
        "allowExtraProperties": true
      },
      "graphql": {
        "endpoint": "/graphql",
        "introspection": true,
        "playground": false
      },
      "websocket": {
        "connectionTimeout": 10000,
        "heartbeatInterval": 30000,
        "maxReconnectAttempts": 3
      }
    };

    const configPath = path.join(outputDir, 'default.json');
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('✅ Generated default configuration');
    
    return configPath;
  }

  private async generateEnvironmentConfig(environment: string, outputDir: string): Promise<string> {
    let config: any = {};

    switch (environment.toLowerCase()) {
      case 'development':
        config = {
          "baseURL": "http://localhost:3000",
          "timeout": 10000,
          "retries": 1,
          "logging": {
            "level": "debug",
            "requests": true,
            "responses": true,
            "requestHeaders": true,
            "responseHeaders": true,
            "requestBody": true,
            "responseBody": true
          },
          "performance": {
            "responseTimeThreshold": 2000,
            "trackMemoryUsage": true
          },
          "validation": {
            "strictMode": false,
            "allowExtraProperties": true
          },
          "graphql": {
            "endpoint": "/graphql",
            "introspection": true,
            "playground": true
          }
        };
        break;

      case 'staging':
        config = {
          "baseURL": "https://staging-api.example.com",
          "timeout": 20000,
          "retries": 2,
          "headers": {
            "X-Environment": "staging"
          },
          "auth": {
            "type": "bearer",
            "token": "${STAGING_API_TOKEN}"
          },
          "logging": {
            "level": "info",
            "requests": true,
            "responses": true,
            "requestBody": false,
            "responseBody": false
          },
          "performance": {
            "responseTimeThreshold": 3000,
            "trackMemoryUsage": false
          },
          "validation": {
            "strictMode": true,
            "validateResponseSchema": true,
            "allowExtraProperties": false
          },
          "reporting": {
            "formats": ["html", "json"],
            "directory": "reports/staging"
          }
        };
        break;

      case 'production':
        config = {
          "baseURL": "https://api.example.com",
          "timeout": 30000,
          "retries": 3,
          "headers": {
            "X-Environment": "production"
          },
          "auth": {
            "type": "bearer",
            "token": "${PRODUCTION_API_TOKEN}"
          },
          "logging": {
            "level": "warn",
            "requests": false,
            "responses": false,
            "requestBody": false,
            "responseBody": false
          },
          "performance": {
            "responseTimeThreshold": 5000,
            "trackMemoryUsage": false,
            "maxConcurrentRequests": 5
          },
          "validation": {
            "strictMode": true,
            "validateResponseSchema": true,
            "allowExtraProperties": false
          },
          "reporting": {
            "formats": ["json"],
            "directory": "reports/production",
            "includeSnapshots": false
          },
          "graphql": {
            "endpoint": "/graphql",
            "introspection": false,
            "playground": false
          }
        };
        break;

      case 'test':
        config = {
          "baseURL": "http://localhost:3001",
          "timeout": 5000,
          "retries": 0,
          "logging": {
            "level": "error",
            "requests": false,
            "responses": false
          },
          "performance": {
            "responseTimeThreshold": 1000,
            "trackMemoryUsage": true
          },
          "validation": {
            "strictMode": true,
            "validateResponseSchema": true
          },
          "reporting": {
            "formats": ["json"],
            "directory": "reports/test"
          }
        };
        break;

      default:
        // Generic environment configuration
        config = {
          "baseURL": `https://${environment}-api.example.com`,
          "timeout": 25000,
          "retries": 2,
          "headers": {
            "X-Environment": environment
          },
          "auth": {
            "type": "bearer",
            "token": `\${${environment.toUpperCase()}_API_TOKEN}`
          },
          "logging": {
            "level": "info"
          },
          "reporting": {
            "directory": `reports/${environment}`
          }
        };
        break;
    }

    const configPath = path.join(outputDir, `${environment}.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Generated ${environment} configuration`);
    
    return configPath;
  }

  /**
   * Generate environment-specific .env template files
   */
  async generateEnvFiles(environments: string[], outputDir: string): Promise<string[]> {
    const generatedFiles: string[] = [];

    for (const environment of environments) {
      const envContent = this.generateEnvTemplate(environment);
      const envPath = path.join(outputDir, `.env.${environment}`);
      
      fs.writeFileSync(envPath, envContent);
      generatedFiles.push(envPath);
      console.log(`✅ Generated .env.${environment} template`);
    }

    return generatedFiles;
  }

  private generateEnvTemplate(environment: string): string {
    const upperEnv = environment.toUpperCase();
    
    return `# ${environment.charAt(0).toUpperCase() + environment.slice(1)} Environment Variables
# Copy this file to .env.${environment}.local and fill in the actual values

# API Configuration
${upperEnv}_API_TOKEN=your-api-token-here
${upperEnv}_API_SECRET=your-api-secret-here
${upperEnv}_REFRESH_TOKEN=your-refresh-token-here

# Database (if applicable)
${upperEnv}_DATABASE_URL=your-database-url-here

# Third-party Services
${upperEnv}_EXTERNAL_API_KEY=your-external-api-key-here
${upperEnv}_WEBHOOK_SECRET=your-webhook-secret-here

# Feature Flags
${upperEnv}_ENABLE_GRAPHQL=true
${upperEnv}_ENABLE_WEBSOCKET=false
${upperEnv}_ENABLE_CACHING=true

# Monitoring & Logging
${upperEnv}_LOG_LEVEL=info
${upperEnv}_ENABLE_METRICS=false
${upperEnv}_SENTRY_DSN=your-sentry-dsn-here

# Test Specific
${upperEnv}_TEST_TIMEOUT=30000
${upperEnv}_MAX_RETRIES=3
${upperEnv}_PARALLEL_TESTS=false
`;
  }

  /**
   * Generate a comprehensive configuration with all available options
   */
  async generateFullConfig(outputDir: string): Promise<string> {
    const fullConfig = {
      "metadata": {
        "version": "1.0.0",
        "generated": new Date().toISOString(),
        "description": "Complete RestifiedTS configuration with all available options"
      },
      "general": {
        "timeout": 30000,
        "retries": 3,
        "baseURL": "https://api.example.com",
        "maxRedirects": 5,
        "validateStatus": "(status) => status >= 200 && status < 300"
      },
      "headers": {
        "default": {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "RestifiedTS/1.0.0"
        },
        "custom": {
          "X-API-Version": "v1",
          "X-Client-Version": "1.0.0"
        }
      },
      "authentication": {
        "type": "bearer",
        "token": "${API_TOKEN}",
        "refreshToken": "${REFRESH_TOKEN}",
        "basic": {
          "username": "${API_USERNAME}",
          "password": "${API_PASSWORD}"
        },
        "apiKey": {
          "header": "X-API-Key",
          "value": "${API_KEY}"
        },
        "oauth2": {
          "clientId": "${OAUTH2_CLIENT_ID}",
          "clientSecret": "${OAUTH2_CLIENT_SECRET}",
          "tokenUrl": "${OAUTH2_TOKEN_URL}",
          "scopes": ["read", "write"]
        }
      },
      "logging": {
        "level": "info",
        "requests": true,
        "responses": true,
        "requestHeaders": false,
        "responseHeaders": false,
        "requestBody": true,
        "responseBody": true,
        "sensitive": {
          "maskHeaders": ["authorization", "x-api-key"],
          "maskBodyFields": ["password", "token", "secret"]
        }
      },
      "reporting": {
        "formats": ["html", "json", "xml"],
        "directory": "reports",
        "includeSnapshots": true,
        "includeDiffs": true,
        "generateSummary": true,
        "templates": {
          "html": "default",
          "custom": "path/to/custom/template"
        }
      },
      "performance": {
        "responseTimeThreshold": 5000,
        "trackMemoryUsage": false,
        "maxConcurrentRequests": 10,
        "connectionPoolSize": 5,
        "keepAlive": true,
        "compression": true
      },
      "validation": {
        "strictMode": false,
        "validateResponseSchema": false,
        "allowExtraProperties": true,
        "schemaDirectory": "schemas",
        "customValidators": []
      },
      "graphql": {
        "endpoint": "/graphql",
        "introspection": true,
        "playground": false,
        "subscriptions": {
          "endpoint": "/graphql/subscriptions",
          "protocol": "ws"
        }
      },
      "websocket": {
        "connectionTimeout": 10000,
        "heartbeatInterval": 30000,
        "maxReconnectAttempts": 3,
        "protocols": [],
        "extensions": []
      },
      "proxy": {
        "enabled": false,
        "host": "proxy.example.com",
        "port": 8080,
        "auth": {
          "username": "${PROXY_USERNAME}",
          "password": "${PROXY_PASSWORD}"
        }
      },
      "ssl": {
        "rejectUnauthorized": true,
        "ca": "${SSL_CA_PATH}",
        "cert": "${SSL_CERT_PATH}",
        "key": "${SSL_KEY_PATH}"
      },
      "plugins": {
        "enabled": [],
        "disabled": [],
        "configuration": {}
      },
      "hooks": {
        "beforeRequest": [],
        "afterResponse": [],
        "onError": []
      }
    };

    const configPath = path.join(outputDir, 'complete.json');
    fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
    console.log('✅ Generated complete configuration reference');
    
    return configPath;
  }
}