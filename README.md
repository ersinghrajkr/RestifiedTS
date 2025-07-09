# RestifiedTS
REST API Automation Framework - RestifiedTS


## ✅ RestifiedTS Feature Implementation Tracker (2025)

This document tracks the status of all features planned and implemented for the RestifiedTS framework.

## ✅ Implemented Core Features

| ✅ Feature                         | Location / Module          | Priority  | Description                                               |
| ---------------------------------- | -------------------------- | ----------|-----------------------------------------------------------|
| FluentDSL.ts                       | src/core/FluentDSL.ts      | ⭐ High    | Fluent chaining like RestAssured – given().when().then() |
| Multi-instance HTTP Client         | src/core/ContextManager.ts | ⭐ High    | Manage multiple API clients for different services        |
| Response Store                     | src/core/ResponseStore.ts  | ⭐ High    | Save and reuse responses across test chains               |
| PayloadBuilder                     | utils/PayloadBuilder.ts    | ⭐ High    | Dynamic JSON payloads using faker and placeholder support |
| Global/Local Variable Store        | utils/VariableStore.ts     | ⭐ High    | Scoped variables for chaining or test re-use              |
| Audit Logger                       | utils/AuditLogger.ts       | ⭐ Medium  | Logs request & response to file                           |
| Deep Assertions                    | utils/AssertionUtils.ts    | ⭐ High    | Custom chai-based deep comparison utilities               |
| Retry Support                      | src/core/HTTPClient.ts     | ⭐ High    | Auto-retry logic for network failures                     |
| Global Configuration               | config/*.json              | ⭐ High    | Per-env config (dev, staging, prod)                       |
| Test Examples (Multiple Instances) | tests/integration          | ⭐ High    | Usage of multi-client tests with chaining & overrides     |
| Wait / Sleep                       | utils/WaitUtil.ts          | ⭐ Medium  | waitFor(ms) utility for async flows                       |
| JSON Placeholder Resolution        | utils/PayloadBuilder.ts    | ⭐ High    | Use {{varName}} or {{faker.name.firstName}} in payloads   |
| Response Snapshot Testing          | utils/ResponseSnapshot.ts  | ⭐ Medium  | Compare new responses against saved snapshots             |
| HTML Reporter (Lightweight)        | mochawesome integrated     | ⭐ Medium  | Clear report with step logs & results                     |
| Tag-Based Skipping (Soon)          | decorators/test.ts         | ⭐ High    | BDD tagging like @smoke, @regression                      |
| Mocha Test Hooks                   | .mocharc.ts                | ⭐ Medium  | beforeAll, afterAll, beforeEach, afterEach hooks          |
| Unique Response Storage            | ResponseStore              | ⭐ High    | Store responses with custom keys without overwriting      |

---

### ❗ Missing or To-Do Features

| Feature                              | Needed In                                            | Priority  | Status        |
|--------------------------------------|-------------------------------------------------------|-----------|----------------|
| FluentDSL.ts                         | src/core/FluentDSL.ts                                | ⭐ High    | ✅ Implemented |
| WebSocket support                    | utils/WebSocketClient.ts                             | ⭐ High    | ✅ Implemented |
| GraphQL support                      | utils/GraphQLClient.ts                               | ⭐ High    | ✅ Implemented |
| Mock server                          | utils/MockServer.ts using express or json-server     | ⭐ High    | ✅ Implemented |
| TypeScript decorators for tagging    | @test() decorator engine                             | ⭐ High    | ⏳ Pending     |
| Test runner with tag-based filtering | Tag parsing logic in mocha or ts-node                | ⭐ High    | ⏳ Pending     |
| Performance metrics tracking         | utils/PerformanceMetrics.ts → time-based assertions  | ⭐ High    | ⏳ Pending     |
| Rate-limiting simulator              | utils/RateLimiter.ts with delayed calls              | ⭐ Medium  | ⏳ Pending     |
| XML parsing support                  | utils/XmlParser.ts (for SOAP or hybrid APIs)         | ⭐ Medium  | ⏳ Pending     |
| GPath-style JSON extractor           | utils/JsonExtractor.ts (like res.body.data.id)       | ⭐ Medium  | ⏳ Pending     |
| File uploader (multipart/form-data) | utils/FileUploader.ts                                | ⭐ Medium  | ⏳ Pending     |
| Auth provider (Bearer/Basic)        | utils/AuthProvider.ts                                | ⭐ Medium  | ⏳ Pending     |
| SSL config overrides                 | utils/SslConfig.ts                                   | ⭐ Medium  | ⏳ Pending     |
| Proxy support                        | utils/ProxyManager.ts                                | ⭐ Medium  | ⏳ Pending     |
| Interceptor support                  | utils/InterceptorManager.ts                          | ⭐ Medium  | ⏳ Pending     |
| Rate-limit resilience logic          | Built-in per-client throttle handling                | ⭐ Medium  | ⏳ Pending     |
| generateDiffDashboard.ts            | HTML UI for versioned test comparisons               | ⭐ Medium  | ⏳ Pending     |

---

### 🔖 Suggested Enhancements

| Feature               | Description                                                   | Status        |
|----------------------|---------------------------------------------------------------|----------------|
| Plugin architecture  | Support plug-n-play for JSON Schema, GraphQL queries, etc.   | ⏳ Planned     |
| Codegen/OpenAPI import | Import Swagger/OpenAPI spec and generate test stubs          | ⏳ Planned     |
| Type-safe GraphQL    | Auto-generate types from GraphQL schema                        | ⏳ Planned     |
| HTML Dashboard       | Beautiful diff-dashboard.html for visual diffs (built in CLI) | ⏳ Planned     |
| Test Retry on Status Code | Retry if 5xx or 429                                       | ⏳ Planned     |
| Swagger/OpenAPI Generator   | Convert OpenAPI spec to test templates      | ⭐ Medium  | ⏳ Planned |
| Type-Safe GraphQL Generator | Build types from GraphQL schema             | ⭐ Medium  | ⏳ Planned |
| Rate Limiting Simulator     | Simulate throttled/slow endpoints           | ⭐ Medium  | ⏳ Planned |
| Plugin Architecture         | Add or remove modules like schema validator | ⭐ Medium  | ⏳ Planned |
| Retry on Status Code        | Retry 5xx, 429, etc. with delay + backoff   | ⭐ Medium  | ⏳ Planned |
| HTML Dashboard for Diffing  | Visual HTML snapshot comparison dashboard   | ⭐ Medium  | ⏳ Planned |
---

| --------------------------- | ------------------------------------------- | ----------|------------|





