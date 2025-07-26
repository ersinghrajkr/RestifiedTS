# test-working

API testing project built with RestifiedTS framework.

## 🚀 Quick Start

### Installation

This project comes with RestifiedTS and all necessary dependencies pre-configured. Just install:

```bash
npm install
```

### Run Tests

```bash
# Run all tests and generate HTML report
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:smoke

# Run comprehensive test suite with merged report
npm run test:comprehensive

# Watch mode for development
npm run test:watch
```

### Generate Reports

```bash
# Basic HTML report (auto-generated after tests)
npm run test:report

# Comprehensive report with all test suites
npm run test:report:comprehensive

# Using RestifiedTS CLI directly
npx restifiedts report --comprehensive --open
```

## 📁 Project Structure

```
test-working/
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── setup/          # Test setup and utilities
├── config/             # Configuration files
├── reports/            # Generated test reports
├── .env.example        # Environment variables template
├── tsconfig.json       # TypeScript configuration
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and update with your API settings:

```bash
cp .env.example .env
```

### Configuration Files

- `config/default.json` - Base configuration
- `config/development.json` - Development overrides
- `config/production.json` - Production settings

## 🧪 Writing Tests

RestifiedTS provides two setup approaches for your tests:

### Option 1: Manual Setup (Explicit Control)

Use this approach when you want explicit control over setup/cleanup in each test file:

```typescript
import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from './setup/manual-setup';

describe('API Tests', function() {
  before(async function() {
    await TestSetup.configure();
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should test API endpoint', async function() {
    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .bearerToken('{{authToken}}') // Uses globally configured token
      .when()
        .get('/posts')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$[0].id').isNumber()
      .execute();
  });
});
```

### Option 2: Global Setup (Automatic)

Use this approach for cleaner test files without repetitive setup/cleanup:

1. **Enable Global Setup**: Uncomment the global setup in `.mocharc.json`:
   ```json
   {
     "require": [
       "ts-node/register",
       "tsconfig-paths/register",
       "tests/setup/global-setup.ts"
     ]
   }
   ```

2. **Write Clean Tests**:
   ```typescript
   import { restified } from 'restifiedts';
   import { expect } from 'chai';
   import { getBaseURL, getAuthToken } from './setup/global-setup';

   describe('API Tests', function() {
     // No manual setup/cleanup needed!

     it('should test API endpoint', async function() {
       const response = await restified
         .given()
           .baseURL(getBaseURL()) // Uses global configuration
           .bearerToken(getAuthToken()) // Uses global auth
         .when()
           .get('/posts')
           .execute();

       await response
         .statusCode(200)
         .jsonPath('$[0].id').isNumber()
         .execute();
     });
   });
   ```

### Comparison

| Feature | Manual Setup | Global Setup |
|---------|-------------|--------------|
| Setup Control | Explicit per test file | Automatic across all tests |
| Code Repetition | More repetitive | Less repetitive |
| Test File Size | Larger | Smaller |
| Configuration | Per-test flexibility | Centralized configuration |
| Best For | Complex setup variations | Standard setup patterns |

### Generate New Tests

```bash
# Generate different types of tests
npx restifiedts generate --type api --name UserAPI
npx restifiedts generate --type database --name UserDatabase
npx restifiedts generate --type performance --name LoadTest
npx restifiedts generate --type security --name SecurityScan
npx restifiedts generate --type unified --name ComprehensiveTest
```

## 📊 Available Reports

After running tests, you'll find HTML reports in the `reports/` directory:

- `test-report.html` - Standard test results
- `comprehensive-report.html` - All test suites combined
- `performance-report.html` - Performance metrics (if available)
- `security-report.html` - Security findings (if available)

## 🔧 Development

### Code Quality

```bash
# Linting
npm run lint

# Code formatting
npm run format
```

### Clean Reports

```bash
npm run test:clean
```

## 🆘 Troubleshooting

### Common Issues

**Tests hang after completion?**
➜ Ensure you have `await restified.cleanup()` in `afterAll()`

**Environment variables not loading?**
➜ Copy `.env.example` to `.env` and update values

**TypeScript errors?**
➜ Check `tsconfig.json` configuration

**Reports not generating?**
➜ Ensure `reports/` directory exists and has write permissions

### Debug Mode

Set `LOG_LEVEL=debug` in your `.env` file for detailed logging.

## 📚 Documentation

- [RestifiedTS Documentation](https://github.com/ersinghrajkr/RestifiedTS)
- [Complete Guide](https://github.com/ersinghrajkr/RestifiedTS/blob/main/RESTIFIEDTS-GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

Generated by RestifiedTS CLI v1.1.0
