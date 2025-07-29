# 🛡️ Proxy Error Troubleshooting Guide for RestifiedTS

This guide helps you resolve common proxy-related errors when using RestifiedTS in corporate environments or behind firewalls.

## 🚨 Common Proxy Errors

```bash
# Common error messages:
- "ECONNRESET: Connection was forcibly closed"
- "ENOTFOUND: getaddrinfo ENOTFOUND api.example.com"
- "ECONNREFUSED: connect ECONNREFUSED"
- "CERT_UNTRUSTED: certificate not trusted"
- "Proxy connection failed"
```

## ✅ Solution 1: Environment Variable Configuration (Recommended)

RestifiedTS automatically detects and uses standard proxy environment variables:

### Set Environment Variables

```bash
# For HTTP proxy
export HTTP_PROXY=http://proxy.company.com:8080
export http_proxy=http://proxy.company.com:8080

# For HTTPS proxy  
export HTTPS_PROXY=http://proxy.company.com:8080
export https_proxy=http://proxy.company.com:8080

# Skip proxy for localhost and internal networks
export NO_PROXY=localhost,127.0.0.1,*.local,*.company.com
export no_proxy=localhost,127.0.0.1,*.local,*.company.com
```

### .env File Configuration

Create `.env` file in your project root:

```bash
# PROXY CONFIGURATION
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,*.local,*.company.com

# With authentication
HTTP_PROXY=http://username:password@proxy.company.com:8080
HTTPS_PROXY=http://username:password@proxy.company.com:8080

# Alternative RestifiedTS-specific variables
RESTIFIED_PROXY_HOST=proxy.company.com
RESTIFIED_PROXY_PORT=8080
```

### Test Your Configuration

```typescript
import { restified } from 'restifiedts';

describe('Proxy Test', () => {
  it('should work through corporate proxy', async () => {
    // RestifiedTS automatically uses proxy from environment variables
    const response = await restified
      .given()
        .header('User-Agent', 'RestifiedTS/1.2.1')
      .when()
        .get('https://httpbin.org/ip')  // This will show your proxy IP
        .execute();
    
    await response
      .statusCode(200)
      .execute();
      
    console.log('Your IP through proxy:', response.response.data);
  });
});
```

## ✅ Solution 2: Explicit Proxy Configuration in Tests

If environment variables don't work, configure proxy explicitly:

```typescript
import { restified } from 'restifiedts';

describe('API Tests with Explicit Proxy', () => {
  before(() => {
    // Configure proxy globally
    restified.updateConfig({
      proxy: {
        host: 'proxy.company.com',
        port: 8080,
        protocol: 'http',
        auth: {
          username: 'your-username',
          password: 'your-password'
        }
      }
    });
  });

  it('should work with explicit proxy config', async () => {
    const response = await restified
      .given()
      .when()
        .get('https://api.example.com/users')
        .execute();
    
    await response.statusCode(200).execute();
  });
});
```

## ✅ Solution 3: Per-Request Proxy Configuration

Configure proxy for specific requests:

```typescript
import { restified } from 'restifiedts';

it('should use proxy for this request only', async () => {
  const response = await restified
    .given()
      .proxy({
        host: 'proxy.company.com',
        port: 8080,
        protocol: 'http'
      })
    .when()
      .get('https://api.example.com/data')
      .execute();
  
  await response.statusCode(200).execute();
});
```

## ✅ Solution 4: SSL Certificate Issues

Corporate proxies often have SSL certificate issues:

### Disable SSL Verification (Development Only)

```bash
# Environment variable approach
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

```typescript
// Or in code (development only!)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe('API Tests', () => {
  it('should ignore SSL errors', async () => {
    const response = await restified
      .given()
        // Additional SSL options can be configured
      .when()
        .get('https://api.example.com/secure-endpoint')
        .execute();
    
    await response.statusCode(200).execute();
  });
});
```

### Use Custom CA Certificates

```typescript
import { readFileSync } from 'fs';

// Load your company's CA certificate
const caCert = readFileSync('./company-ca.pem');

restified.updateConfig({
  httpsAgent: {
    ca: caCert,
    rejectUnauthorized: true
  }
});
```

## ✅ Solution 5: Corporate Network Configuration

### Check Your Network Settings

```bash
# Test if proxy is working
curl -x http://proxy.company.com:8080 https://httpbin.org/ip

# Test without proxy
curl https://httpbin.org/ip

# Check your current proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY
echo $NO_PROXY
```

### Configure npm to use proxy (if needed)

```bash
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
npm config set registry https://registry.npmjs.org/
```

## ✅ Solution 6: Advanced Proxy Configuration

### SOCKS Proxy Support

```typescript
import { restified } from 'restifiedts';

restified.updateConfig({
  proxy: {
    host: 'socks-proxy.company.com',
    port: 1080,
    protocol: 'socks5',
    auth: {
      username: 'user',
      password: 'pass'
    }
  }
});
```

### Proxy Auto-Configuration (PAC)

```typescript
// For PAC files, you'll need to set system proxy or use a PAC parser
// RestifiedTS will respect system proxy settings automatically
```

## 🔧 Debugging Proxy Issues

### Enable Debug Logging

```bash
# Enable Axios debug logging
export DEBUG=axios

# Enable Node.js debug logging
export NODE_DEBUG=http,https,tls
```

### Debug Test

```typescript
import { restified } from 'restifiedts';

describe('Proxy Debug Test', () => {
  it('should show connection details', async () => {
    try {
      const response = await restified
        .given()
          .header('User-Agent', 'RestifiedTS-Debug')
        .when()
          .get('https://httpbin.org/headers')
          .execute();
      
      console.log('✅ SUCCESS - Proxy is working!');
      console.log('Response:', response.response.data);
      
    } catch (error) {
      console.log('❌ PROXY ERROR:', error.message);
      console.log('Error Code:', error.code);
      console.log('Config:', error.config);
      
      // Check environment variables
      console.log('Environment Variables:');
      console.log('HTTP_PROXY:', process.env.HTTP_PROXY);
      console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY);
      console.log('NO_PROXY:', process.env.NO_PROXY);
    }
  });
});
```

## 🏢 Common Corporate Environments

### Windows Corporate Network

```powershell
# PowerShell - set proxy for current session
$env:HTTP_PROXY="http://proxy.company.com:8080"
$env:HTTPS_PROXY="http://proxy.company.com:8080"
$env:NO_PROXY="localhost,127.0.0.1,*.company.com"

# Test
npm test
```

### Linux/Mac Corporate Network

```bash
# Bash - add to ~/.bashrc or ~/.zshrc
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,*.company.com

# Test
npm test
```

## 🚨 Security Notes

1. **Never commit proxy credentials to version control**
2. **Use environment variables for sensitive data**
3. **Only disable SSL verification in development**
4. **Use company-approved proxy servers only**

## 📞 Still Having Issues?

If you're still experiencing proxy issues:

1. **Contact your IT department** for correct proxy settings
2. **Check if the target API allows your company's proxy IP**
3. **Verify firewall rules allow outbound HTTPS traffic**
4. **Test with curl first** to isolate the issue
5. **Try a simple HTTP request** before HTTPS

## ✅ Quick Fix Checklist

- [ ] Set `HTTP_PROXY` and `HTTPS_PROXY` environment variables
- [ ] Add `NO_PROXY` for localhost and internal networks  
- [ ] Test with `curl` first to verify proxy works
- [ ] Check if API endpoint is accessible through proxy
- [ ] Verify SSL certificates if using HTTPS
- [ ] Contact IT for correct proxy configuration
- [ ] Use RestifiedTS debug logging to identify the issue

This should resolve most proxy-related issues with RestifiedTS!