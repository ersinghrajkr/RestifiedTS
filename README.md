# RestifiedTS
REST API Automation Framework - RestifiedTS

from pathlib import Path

# Define the markdown content

## ✅ RestifiedTS Feature Implementation Tracker (2025)

This document tracks the status of all features planned and implemented for the RestifiedTS framework.

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

---

### 📌 Final Framework TODO Plan (Next Milestones)

| Priority | Task                                                   | Status        |
|----------|--------------------------------------------------------|----------------|
| 🔥       | Build FluentDSL.ts with given().when().then()          | ✅ Done        |
| 🔥       | Build WebSocketClient.ts                                | ✅ Done        |
| 🔥       | Build GraphQLClient.ts                                  | ✅ Done        |
| 🔥       | Build MockServer.ts (contract mocking)                  | ✅ Done        |
| 🔥       | Add @test() decorator system + tag filtering            | ⏳ Upcoming    |
| 🔥       | Create PerformanceMetrics.ts for SLA assertion          | ⏳ Upcoming    |
| ⚙️        | Add XmlParser.ts, JsonExtractor.ts                     | ⏳ Upcoming    |
| 💡       | Add plugin for Swagger-to-test auto generator           | ⏳ Upcoming    |
| 🚀       | Add Docker-ready GitHub Actions CI with reporters       | ⏳ Upcoming    |
| 📊       | Add generateDiffDashboard.ts with HTML diff UI          | ⏳ Upcoming    |




