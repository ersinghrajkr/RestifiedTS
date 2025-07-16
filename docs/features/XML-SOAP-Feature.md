# XML/SOAP Support Feature Specification

## Feature Overview

**Feature Name**: XML/SOAP Support  
**Domain**: `validation`  
**Priority**: High  
**Status**: Implementation Ready  
**Version**: 1.0.0  

## Business Requirements

### Functional Requirements

#### FR-1: XML Content Validation
- **Description**: System must validate XML content structure and format
- **Acceptance Criteria**:
  - Parse XML documents without DOM manipulation errors
  - Validate XML against XSD schemas
  - Support namespace-aware XML parsing
  - Handle XML parsing errors gracefully
- **Business Value**: Enables testing of XML-based APIs and legacy systems

#### FR-2: XPath Query Support
- **Description**: System must support XPath expressions for XML element selection
- **Acceptance Criteria**:
  - Support XPath 1.0 expressions
  - Extract single values and node lists
  - Support XPath functions (text(), count(), etc.)
  - Handle XPath syntax errors with meaningful messages
- **Business Value**: Provides powerful XML content verification capabilities

#### FR-3: SOAP Envelope Validation
- **Description**: System must validate SOAP envelope structure and content
- **Acceptance Criteria**:
  - Validate SOAP 1.1 and 1.2 envelope structures
  - Check for required SOAP elements (Envelope, Body)
  - Validate optional SOAP elements (Header, Fault)
  - Support SOAP namespace variations
- **Business Value**: Enables comprehensive SOAP API testing

#### FR-4: XML Schema Validation
- **Description**: System must validate XML documents against XSD schemas
- **Acceptance Criteria**:
  - Load XSD schema files from filesystem
  - Validate XML structure against schema
  - Provide detailed validation error messages
  - Support schema imports and includes
- **Business Value**: Ensures API contract compliance for XML-based services

### Non-Functional Requirements

#### NFR-1: Performance
- **Requirement**: XML validation must complete within 5 seconds for documents up to 10MB
- **Measurement**: Response time monitoring and performance benchmarks
- **Acceptance**: 95% of validations complete within performance threshold

#### NFR-2: Memory Efficiency
- **Requirement**: XML processing must not exceed 100MB memory usage
- **Measurement**: Memory profiling during XML operations
- **Acceptance**: Memory usage stays within defined limits

#### NFR-3: Error Handling
- **Requirement**: All XML parsing errors must be caught and reported meaningfully
- **Measurement**: Error message quality and completeness
- **Acceptance**: Users can understand and resolve XML-related issues

## Technical Architecture

### Domain Model

#### Entities
```typescript
// XML Document Entity
export class XmlDocument {
  constructor(
    private readonly content: string,
    private readonly namespace?: string
  ) {}

  public validate(): ValidationResult {
    // XML validation logic
  }

  public query(xpath: string): XmlNode[] {
    // XPath query execution
  }

  public getNamespaces(): Record<string, string> {
    // Extract namespace declarations
  }
}

// SOAP Envelope Entity
export class SoapEnvelope extends XmlDocument {
  constructor(content: string) {
    super(content);
  }

  public validateStructure(): ValidationResult {
    // SOAP-specific validation
  }

  public getBody(): XmlNode {
    // Extract SOAP body
  }

  public getHeader(): XmlNode | null {
    // Extract SOAP header
  }

  public getFault(): SoapFault | null {
    // Extract SOAP fault
  }
}
```

#### Value Objects
```typescript
// XPath Expression Value Object
export class XPathExpression {
  constructor(
    private readonly expression: string,
    private readonly namespaces?: Record<string, string>
  ) {
    this.validateSyntax();
  }

  public evaluate(document: XmlDocument): any {
    // XPath evaluation logic
  }

  private validateSyntax(): void {
    // XPath syntax validation
  }
}

// XML Schema Value Object
export class XmlSchema {
  constructor(
    private readonly schemaPath: string,
    private readonly schemaContent?: string
  ) {}

  public validate(document: XmlDocument): ValidationResult {
    // Schema validation logic
  }

  public getDefinitions(): SchemaDefinition[] {
    // Extract schema definitions
  }
}
```

#### Services
```typescript
// XML Validation Service
export interface IXmlValidationService {
  validateXPath(content: string, xpath: string, expected: any): Promise<ValidationResult>;
  validateSchema(content: string, schema: XmlSchema): Promise<ValidationResult>;
  validateSoapEnvelope(content: string): Promise<ValidationResult>;
}

// XPath Query Service
export interface IXPathQueryService {
  executeQuery(document: XmlDocument, xpath: XPathExpression): Promise<any>;
  extractValue(document: XmlDocument, xpath: string): Promise<any>;
  extractValues(document: XmlDocument, xpath: string): Promise<any[]>;
}
```

### Event Model

#### Domain Events
```typescript
// XML Validation Events
export class XmlValidationStartedEvent extends DomainEvent {
  constructor(
    public readonly xmlContent: string,
    public readonly validationType: string,
    public readonly timestamp: Date
  ) {
    super('XmlValidationStarted');
  }
}

export class XmlValidationCompletedEvent extends DomainEvent {
  constructor(
    public readonly xpath: string,
    public readonly result: ValidationResult,
    public readonly timestamp: Date
  ) {
    super('XmlValidationCompleted');
  }
}

export class SoapValidationCompletedEvent extends DomainEvent {
  constructor(
    public readonly result: ValidationResult,
    public readonly hasHeader: boolean,
    public readonly timestamp: Date
  ) {
    super('SoapValidationCompleted');
  }
}
```

### Integration Points

#### Fluent Interface Integration
```typescript
// XML Fluent Extensions
export class XmlFluentExtension implements FluentExtension {
  extendThenStep(builder: ThenStepBuilder): ThenStepBuilder {
    return builder
      .addMethod('xpath', (expression: string, expectedValue: any) => {
        return builder.addValidator(async (response) => {
          const xmlService = builder.getService<XmlValidationService>('XmlValidationService');
          return await xmlService.validateXPath(response.body, expression, expectedValue);
        });
      })
      .addMethod('xmlSchema', (schemaPath: string) => {
        return builder.addValidator(async (response) => {
          const xmlService = builder.getService<XmlValidationService>('XmlValidationService');
          const schema = new XmlSchema(schemaPath);
          return await xmlService.validateSchema(response.body, schema);
        });
      })
      .addMethod('soapEnvelope', () => {
        return builder.addValidator(async (response) => {
          const xmlService = builder.getService<XmlValidationService>('XmlValidationService');
          return await xmlService.validateSoapEnvelope(response.body);
        });
      });
  }
}
```

#### HTTP Client Integration
```typescript
// XML Content Type Handling
export class XmlHttpClientExtension implements HttpClientExtension {
  configureRequest(request: HttpRequest): HttpRequest {
    if (request.hasXmlContent()) {
      request.setHeader('Content-Type', 'application/xml');
      request.setHeader('Accept', 'application/xml');
    }
    return request;
  }

  processResponse(response: HttpResponse): HttpResponse {
    if (response.isXmlContent()) {
      response.setProcessor(new XmlResponseProcessor());
    }
    return response;
  }
}
```

## API Design

### Fluent Interface API

#### Basic XML Validation
```typescript
// XPath validation
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
    .header('Accept', 'application/xml')
  .when()
    .get('/users/123')
  .then()
    .statusCode(200)
    .xpath('//user/name', 'John Doe')
    .xpath('//user/age', greaterThan(18))
    .xpath('count(//user/orders)', 5)
  .execute();

// Schema validation
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
  .when()
    .post('/users')
    .xmlBody('<user><name>John</name><age>25</age></user>')
  .then()
    .statusCode(201)
    .xmlSchema('./schemas/user-response.xsd')
    .xpath('//user/id', notNullValue())
  .execute();
```

#### SOAP API Testing
```typescript
// SOAP envelope validation
await RestifiedTS
  .given()
    .baseUrl('https://soap.example.com')
    .header('Content-Type', 'text/xml; charset=utf-8')
    .header('SOAPAction', 'getUserInfo')
  .when()
    .post('/soap/userservice')
    .soapBody(`
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <getUserInfo xmlns="http://example.com/userservice">
            <userId>123</userId>
          </getUserInfo>
        </soap:Body>
      </soap:Envelope>
    `)
  .then()
    .statusCode(200)
    .soapEnvelope()
    .xpath('//soap:Body/getUserInfoResponse/name', 'John Doe')
    .xpath('//soap:Body/getUserInfoResponse/age', '25')
  .execute();

// SOAP fault handling
await RestifiedTS
  .given()
    .baseUrl('https://soap.example.com')
  .when()
    .post('/soap/userservice')
    .soapBody('<soap:Envelope>...</soap:Envelope>')
  .then()
    .statusCode(500)
    .soapEnvelope()
    .xpath('//soap:Body/soap:Fault/faultcode', 'Server')
    .xpath('//soap:Body/soap:Fault/faultstring', containsString('Invalid user ID'))
  .execute();
```

#### Advanced XML Features
```typescript
// Namespace-aware validation
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
    .xmlNamespace('usr', 'http://example.com/user')
    .xmlNamespace('addr', 'http://example.com/address')
  .when()
    .get('/users/123')
  .then()
    .statusCode(200)
    .xpath('//usr:user/usr:name', 'John Doe')
    .xpath('//usr:user/addr:address/addr:city', 'New York')
  .execute();

// Multiple validations
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
  .when()
    .get('/users')
  .then()
    .statusCode(200)
    .xpath('count(//user)', greaterThan(0))
    .xpath('//user[1]/name', notNullValue())
    .xpath('//user[position() > 1]/age', everyItem(greaterThan(0)))
    .xmlSchema('./schemas/users-list.xsd')
  .execute();
```

## Error Handling

### Error Types

#### XmlValidationError
```typescript
export class XmlValidationError extends RestifiedError {
  constructor(
    message: string,
    public readonly xpath?: string,
    public readonly xmlContent?: string,
    public readonly cause?: Error
  ) {
    super(message, 'XML_VALIDATION_ERROR');
  }
}
```

#### XPathSyntaxError
```typescript
export class XPathSyntaxError extends RestifiedError {
  constructor(
    message: string,
    public readonly expression: string,
    public readonly position?: number
  ) {
    super(message, 'XPATH_SYNTAX_ERROR');
  }
}
```

#### SoapValidationError
```typescript
export class SoapValidationError extends RestifiedError {
  constructor(
    message: string,
    public readonly soapContent?: string,
    public readonly validationType?: string
  ) {
    super(message, 'SOAP_VALIDATION_ERROR');
  }
}
```

### Error Handling Strategy

#### Graceful Degradation
- Invalid XML content falls back to string comparison
- XPath errors provide suggestion for corrections
- Schema validation errors include line numbers and context

#### Detailed Error Messages
```typescript
// Example error messages
"XPath validation failed: '//user/name' expected 'John Doe' but found 'Jane Smith'"
"XML schema validation failed: Element 'age' is not valid. Expected integer, found string"
"SOAP envelope validation failed: Missing required 'soap:Body' element"
"XPath syntax error: Unexpected token ')' at position 15 in '//user/name)'"
```

## Performance Considerations

### Optimization Strategies

#### XML Parser Caching
```typescript
// Cache parsed XML documents
private xmlCache = new Map<string, XmlDocument>();

public parseXml(content: string): XmlDocument {
  const hash = this.calculateHash(content);
  
  if (this.xmlCache.has(hash)) {
    return this.xmlCache.get(hash)!;
  }
  
  const document = new XmlDocument(content);
  this.xmlCache.set(hash, document);
  return document;
}
```

#### XPath Expression Compilation
```typescript
// Compile and cache XPath expressions
private xpathCache = new Map<string, CompiledXPath>();

public compileXPath(expression: string): CompiledXPath {
  if (this.xpathCache.has(expression)) {
    return this.xpathCache.get(expression)!;
  }
  
  const compiled = xpath.compile(expression);
  this.xpathCache.set(expression, compiled);
  return compiled;
}
```

#### Memory Management
```typescript
// Streaming XML processing for large documents
public validateLargeXml(filePath: string, schema: XmlSchema): Promise<ValidationResult> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const parser = new StreamingXmlParser();
    
    parser.on('validation-complete', resolve);
    parser.on('error', reject);
    
    stream.pipe(parser);
  });
}
```

## Testing Strategy

### Unit Tests

#### XPath Validation Tests
```typescript
describe('XPath Validation', () => {
  it('should validate simple XPath expressions', async () => {
    const xmlContent = '<user><name>John</name><age>25</age></user>';
    const result = await xmlService.validateXPath(xmlContent, '//user/name', 'John');
    
    expect(result.isValid).toBe(true);
    expect(result.actualValue).toBe('John');
  });

  it('should handle XPath expressions with namespaces', async () => {
    const xmlContent = '<usr:user xmlns:usr="http://example.com"><usr:name>John</usr:name></usr:user>';
    const result = await xmlService.validateXPath(xmlContent, '//usr:user/usr:name', 'John');
    
    expect(result.isValid).toBe(true);
  });

  it('should provide meaningful error messages for invalid XPath', async () => {
    const xmlContent = '<user><name>John</name></user>';
    
    await expect(
      xmlService.validateXPath(xmlContent, '//user/invalid', 'value')
    ).rejects.toThrow('XPath validation failed');
  });
});
```

#### SOAP Validation Tests
```typescript
describe('SOAP Validation', () => {
  it('should validate SOAP 1.1 envelope', async () => {
    const soapContent = `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <getUserResponse>
            <user>John</user>
          </getUserResponse>
        </soap:Body>
      </soap:Envelope>
    `;
    
    const result = await xmlService.validateSoapEnvelope(soapContent);
    expect(result.isValid).toBe(true);
  });

  it('should detect missing SOAP body', async () => {
    const soapContent = `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Header>
          <auth>token</auth>
        </soap:Header>
      </soap:Envelope>
    `;
    
    const result = await xmlService.validateSoapEnvelope(soapContent);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('SOAP body not found');
  });
});
```

### Integration Tests

#### End-to-End XML API Testing
```typescript
describe('XML API Integration', () => {
  it('should test complete XML API workflow', async () => {
    await RestifiedTS
      .given()
        .baseUrl('https://xmlapi.example.com')
        .header('Content-Type', 'application/xml')
      .when()
        .post('/users')
        .xmlBody('<user><name>John</name><age>25</age></user>')
      .then()
        .statusCode(201)
        .xpath('//user/id', notNullValue())
        .xpath('//user/name', 'John')
        .xpath('//user/age', '25')
        .xmlSchema('./schemas/user.xsd')
      .execute();
  });
});
```

## Security Considerations

### XML Security

#### XML External Entity (XXE) Protection
```typescript
// Disable external entity processing
const parserOptions = {
  errorHandler: this.errorHandler,
  entityResolver: null, // Disable entity resolution
  locator: {},
  xmlns: {}
};

// Configure secure XML parser
const parser = new DOMParser(parserOptions);
```

#### XML Bomb Prevention
```typescript
// Limit XML document size and complexity
const XML_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const XML_DEPTH_LIMIT = 100;

public validateXmlSecurity(content: string): void {
  if (content.length > XML_SIZE_LIMIT) {
    throw new SecurityError('XML document too large');
  }
  
  const depth = this.calculateXmlDepth(content);
  if (depth > XML_DEPTH_LIMIT) {
    throw new SecurityError('XML document too complex');
  }
}
```

### SOAP Security

#### WS-Security Support
```typescript
// Basic WS-Security header validation
export class WsSecurityValidator {
  validateSecurityHeader(soapEnvelope: SoapEnvelope): boolean {
    const securityHeader = soapEnvelope.getSecurityHeader();
    if (!securityHeader) return false;
    
    return this.validateTimestamp(securityHeader) &&
           this.validateSignature(securityHeader);
  }
}
```

## Documentation Requirements

### API Documentation

#### Method Documentation
```typescript
/**
 * Validates XML content using XPath expression
 * 
 * @param expression - XPath expression to evaluate
 * @param expectedValue - Expected value or matcher function
 * @returns ThenStepBuilder for method chaining
 * 
 * @example
 * .then()
 *   .xpath('//user/name', 'John Doe')
 *   .xpath('//user/age', greaterThan(18))
 * 
 * @throws XPathSyntaxError When XPath expression is invalid
 * @throws XmlValidationError When XML validation fails
 */
xpath(expression: string, expectedValue: any): ThenStepBuilder;
```

#### Usage Examples
```typescript
// Basic XPath validation
.then().xpath('//user/name', 'John Doe')

// XPath with functions
.then().xpath('count(//user)', 5)

// XPath with namespaces
.given().xmlNamespace('usr', 'http://example.com/user')
.then().xpath('//usr:user/usr:name', 'John')

// Schema validation
.then().xmlSchema('./schemas/user.xsd')

// SOAP envelope validation
.then().soapEnvelope()
```

### Configuration Documentation

#### XML Parser Configuration
```typescript
// XML parser configuration options
interface XmlParserConfig {
  validateSchema?: boolean;
  preserveWhitespace?: boolean;
  resolveExternalEntities?: boolean;
  maxDocumentSize?: number;
  maxDepth?: number;
  namespaces?: Record<string, string>;
}
```

## Migration Strategy

### Existing Code Integration

#### Backwards Compatibility
- Existing JSON validation methods remain unchanged
- XML methods added as extensions to fluent interface
- No breaking changes to existing API

#### Migration Path
1. **Phase 1**: Add XML validation alongside existing JSON validation
2. **Phase 2**: Update documentation and examples
3. **Phase 3**: Migrate existing XML-based tests (if any)
4. **Phase 4**: Optimize performance and add advanced features

### Training and Adoption

#### Developer Training
- XML/XPath fundamentals
- SOAP protocol basics
- RestifiedTS XML API usage
- Best practices and common patterns

#### Example Migration
```typescript
// Before (manual XML parsing)
const response = await httpClient.get('/users/123');
const parser = new DOMParser();
const doc = parser.parseFromString(response.body, 'text/xml');
const nameNode = doc.getElementsByTagName('name')[0];
expect(nameNode.textContent).toBe('John Doe');

// After (RestifiedTS XML support)
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
  .when()
    .get('/users/123')
  .then()
    .statusCode(200)
    .xpath('//user/name', 'John Doe')
  .execute();
```

This comprehensive feature specification provides the foundation for implementing robust XML/SOAP support in RestifiedTS while maintaining consistency with the existing architecture and API design patterns.