# 🔧 RestifiedTS Complete Configuration Guide

This guide covers **ALL** configuration options available in RestifiedTS, ensuring you can configure every feature without needing to understand the framework internals.

## 📋 Table of Contents

1. [Quick Start Configuration](#quick-start-configuration)
2. [Environment Variables (.env)](#environment-variables-env)
3. [Configuration Files (config/*.json)](#configuration-files-configjson)
4. [Feature-Specific Configuration](#feature-specific-configuration)
5. [Zero-Configuration Setup](#zero-configuration-setup)

---

## 🚀 Quick Start Configuration

**For users who just want to write tests without framework setup:**

1. **Initialize project** (creates everything you need):
   ```bash
   npx restifiedts init
   cd your-project
   npm install
   ```

2. **Configure your API** (copy and edit):
   ```bash
   cp .env.example .env
   # Edit .env with your API details
   ```

3. **Run tests** (auto-generates reports):
   ```bash
   npm test
   ```

**That's it!** RestifiedTS handles all framework configuration automatically.

---

## 🌍 Environment Variables (.env)

RestifiedTS automatically loads `.env` files. **All configuration can be done via environment variables** - no JSON editing required.

### 🔗 Core API Configuration

```bash
# Your main API under test
API_BASE_URL=https://api.example.com
API_KEY=your-api-key-here
API_TIMEOUT=30000
API_RETRIES=3
NODE_ENV=development
```

### 🔐 Authentication Configuration

RestifiedTS supports **all common authentication methods**:

```bash
# Bearer Token (most common)
AUTH_TOKEN=your-jwt-token-here
REFRESH_TOKEN=your-refresh-token

# Basic Authentication
BASIC_USERNAME=your-username
BASIC_PASSWORD=your-password

# OAuth2
OAUTH2_CLIENT_ID=your-oauth2-client-id
OAUTH2_CLIENT_SECRET=your-oauth2-client-secret
OAUTH2_TOKEN_URL=https://auth.example.com/oauth/token
OAUTH2_SCOPE=read write

# API Key Authentication
X_API_KEY=your-api-key
API_SECRET=your-api-secret
```

### 🗄️ Database Configuration

For **database integration testing** (validates API changes against DB state):

```bash
# PostgreSQL (recommended)
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_db
DB_USER=test_user
DB_PASS=test_pass
DB_SSL=false

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=test_db
MYSQL_USER=root
MYSQL_PASS=password

# MongoDB
MONGO_URL=mongodb://localhost:27017/test_db
MONGO_DB=test_db

# SQLite
SQLITE_DB=./test.db
```

### 📊 Reporting Configuration

**HTML reports are auto-generated** - these variables customize them:

```bash
REPORTS_DIR=reports
SNAPSHOTS_DIR=snapshots
LOGS_DIR=logs
LOG_LEVEL=info

# Report Customization
REPORT_TITLE=My API Test Report
REPORT_AUTO_OPEN=false
REPORT_INCLUDE_SCREENSHOTS=true
REPORT_INCLUDE_METRICS=true
```

### ⚡ Performance Testing Configuration

For **load testing with Artillery integration**:

```bash
ARTILLERY_ENABLED=false
ARTILLERY_HOST=localhost
ARTILLERY_PORT=8080
ARTILLERY_TIMEOUT=120000

# Performance Thresholds
PERFORMANCE_RESPONSE_TIME_MEDIAN=500
PERFORMANCE_RESPONSE_TIME_P95=1000
PERFORMANCE_RESPONSE_TIME_P99=2000
PERFORMANCE_ERROR_RATE_MAX=1
PERFORMANCE_THROUGHPUT_MIN=100
```

### 🔒 Security Testing Configuration

For **security scanning with OWASP ZAP integration**:

```bash
ZAP_ENABLED=false
ZAP_API_URL=http://localhost:8080
ZAP_PROXY_HOST=localhost
ZAP_PROXY_PORT=8081
ZAP_TIMEOUT=300000

# Security Policies
SECURITY_ALLOW_HIGH_RISK=false
SECURITY_MAX_MEDIUM_RISK=3
SECURITY_MAX_LOW_RISK=10
```

### 🌐 Multi-Service Configuration

For **testing multiple APIs in one suite**:

```bash
# Authentication Service
AUTH_SERVICE_URL=https://auth.example.com
AUTH_SERVICE_TIMEOUT=10000

# Payment Service
PAYMENT_SERVICE_URL=https://payments.example.com
PAYMENT_SERVICE_TIMEOUT=15000
PAYMENT_API_KEY=your-payment-api-key

# User Service
USER_SERVICE_URL=https://users.example.com
USER_SERVICE_TIMEOUT=10000

# Add more services as needed...
```

### 🔌 WebSocket & GraphQL Configuration

```bash
# WebSocket Testing
WS_URL=wss://echo.websocket.org
WS_TIMEOUT=10000
WS_RECONNECT_ATTEMPTS=3
WS_PING_INTERVAL=30000

# GraphQL Testing
GRAPHQL_URL=https://api.example.com/graphql
GRAPHQL_TIMEOUT=15000
GRAPHQL_INTROSPECTION=true
GRAPHQL_PLAYGROUND=false
```

### 🔗 Proxy & SSL Configuration

```bash
# Corporate Proxy Support
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=https://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,*.local

# SSL Certificate Configuration
SSL_VERIFY=true
SSL_CERT_PATH=/path/to/client-cert.pem
SSL_KEY_PATH=/path/to/client-key.pem
SSL_CA_PATH=/path/to/ca-cert.pem
```

### 🎭 Mock Data Configuration

```bash
# Faker.js Configuration
FAKER_LOCALE=en
MOCK_SERVER_PORT=3001
MOCK_DATA_SEED=12345

# Schema Validation
SCHEMA_VALIDATION_ENABLED=true
SCHEMA_VALIDATORS=joi,zod,ajv
SCHEMA_STRICT_MODE=false
```

### 🚀 Execution & Debug Configuration

```bash
# Parallel Execution
MAX_PARALLEL_TESTS=5
TEST_TIMEOUT_GLOBAL=300000
TEST_RETRY_ATTEMPTS=2

# Development & Debug
DEBUG_MODE=false
VERBOSE_LOGGING=false
CAPTURE_NETWORK_TRAFFIC=false
SAVE_FAILED_RESPONSES=true

# CI/CD Integration
CI=false
CI_BUILD_NUMBER=
CI_COMMIT_SHA=
CI_BRANCH=
CI_PULL_REQUEST=
```

---

## 📄 Configuration Files (config/*.json)

Configuration files support **environment variable substitution** using `${VAR_NAME:default_value}` syntax.

### config/default.json
Base configuration that applies to all environments.

### config/development.json  
Development-specific overrides (auto-loaded when NODE_ENV=development).

### config/production.json
Production-specific overrides (auto-loaded when NODE_ENV=production).

**Important:** You typically don't need to edit these files directly. Use environment variables instead!

---

## 🎯 Feature-Specific Configuration

### Database Integration Testing

**Enable database testing:**
```bash
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_db
DB_USER=test_user
DB_PASS=test_pass
```

**Generate database tests:**
```bash
npx restifiedts generate --type database --name UserDatabase
```

**Example usage in tests:**
```typescript
import { restified, DatabaseManager } from 'restifiedts';

const dbManager = new DatabaseManager();
// Database integration happens automatically using env vars
```

### Performance Testing with Artillery

**Enable performance testing:**
```bash
ARTILLERY_ENABLED=true
ARTILLERY_HOST=localhost
ARTILLERY_PORT=8080
```

**Generate performance tests:**
```bash
npx restifiedts generate --type performance --name LoadTest
```

### Security Testing with OWASP ZAP

**Enable security testing:**
```bash
ZAP_ENABLED=true
ZAP_API_URL=http://localhost:8080
ZAP_PROXY_HOST=localhost
ZAP_PROXY_PORT=8081
```

**Generate security tests:**
```bash
npx restifiedts generate --type security --name SecurityScan
```

### Multi-Service Testing

**Configure multiple services:**
```bash
AUTH_SERVICE_URL=https://auth.example.com
PAYMENT_SERVICE_URL=https://payments.example.com
USER_SERVICE_URL=https://users.example.com
```

**Generate multi-service tests:**
```bash
npx restifiedts generate --type multi-client --name Integration
```

### Unified Orchestration

**Generate tests that combine API + Performance + Security:**
```bash
npx restifiedts generate --type unified --name ComprehensiveTest
```

### Advanced Schema Validation

**Enable multi-validator schema testing:**
```bash
SCHEMA_VALIDATION_ENABLED=true
SCHEMA_VALIDATORS=joi,zod,ajv
```

**Generate schema validation tests:**
```bash
npx restifiedts generate --type validation --name SchemaTest
```

---

## ⚡ Zero-Configuration Setup

**RestifiedTS works out-of-the-box with zero configuration** for:

✅ **Basic API Testing** - Just set API_BASE_URL  
✅ **Authentication** - Just set AUTH_TOKEN  
✅ **HTML Report Generation** - Automatic  
✅ **TypeScript Environment** - Pre-configured  
✅ **Test Running** - npm test works immediately  
✅ **Error Handling** - Built-in defaults  
✅ **Logging** - Automatic with sane defaults  

### Minimal .env for Quick Start

```bash
# Only 2 variables needed for most use cases
API_BASE_URL=https://api.example.com
AUTH_TOKEN=your-token-here
```

### Generate Tests Without Configuration

```bash
# These work immediately with default settings
npx restifiedts generate --type api --name UserAPI
npx restifiedts generate --type auth --name LoginAPI
npx restifiedts generate --type crud --name UserCRUD
```

---

## 🔧 Common Configuration Scenarios

### Scenario 1: Corporate Environment
```bash
# Corporate proxy and custom certificates
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=https://proxy.company.com:8080
SSL_VERIFY=true
SSL_CA_PATH=/etc/ssl/certs/company-ca.pem
```

### Scenario 2: Microservices Testing
```bash
# Multiple services with different authentication
API_BASE_URL=https://api-gateway.example.com
AUTH_SERVICE_URL=https://auth.example.com
USER_SERVICE_URL=https://users.example.com
ORDER_SERVICE_URL=https://orders.example.com
PAYMENT_SERVICE_URL=https://payments.example.com

# Different tokens for different services
AUTH_TOKEN=gateway-token
PAYMENT_API_KEY=payment-service-key
```

### Scenario 3: CI/CD Pipeline
```bash
# Optimized for automated testing
NODE_ENV=production
LOG_LEVEL=warn
REPORT_AUTO_OPEN=false
DEBUG_MODE=false
MAX_PARALLEL_TESTS=10
CI=true
```

### Scenario 4: Local Development
```bash
# Enhanced for development experience
NODE_ENV=development
LOG_LEVEL=debug
REPORT_AUTO_OPEN=true
DEBUG_MODE=true
VERBOSE_LOGGING=true
SAVE_FAILED_RESPONSES=true
```

---

## 🆘 Troubleshooting Configuration

### Environment Variables Not Loading?
✅ Check `.env` file is in project root  
✅ Verify file is named exactly `.env` (not `.env.txt`)  
✅ Restart your terminal/IDE after creating `.env`  
✅ Use `console.log(process.env.API_BASE_URL)` to debug  

### Configuration Not Taking Effect?
✅ Environment variables override config files  
✅ Check syntax: `${VAR_NAME:default}` not `${VAR_NAME}`  
✅ Boolean values should be strings: `"true"` not `true`  
✅ Numbers should be strings: `"3000"` not `3000`  

### Reports Not Generating?
✅ Ensure `REPORTS_DIR` directory exists  
✅ Check file permissions on reports directory  
✅ Verify `npm test` includes report generation step  

### Database Connection Issues?
✅ Verify database is running and accessible  
✅ Check connection string format for your DB type  
✅ Ensure database user has necessary permissions  
✅ Test connection outside of RestifiedTS first  

---

## 📚 Complete Environment Variables Reference

See `.env.example` in your generated project for the **complete list** of all supported environment variables with descriptions and examples.

**Key Point:** RestifiedTS is designed so you **never need to understand framework internals**. Just set environment variables and write tests!

---

## 🎯 Next Steps

1. **Copy `.env.example` to `.env`**
2. **Set your API_BASE_URL and AUTH_TOKEN**  
3. **Run `npm test`** to see everything working
4. **Generate tests:** `npx restifiedts generate --type api --name MyAPI`
5. **Add more features as needed** using environment variables

RestifiedTS handles all the complexity - you focus on writing great tests! 🚀