// src/utils/JsonPathExtractor.ts

/**
 * Advanced JSONPath extractor with support for complex path expressions
 * Supports dot notation, array access, wildcards, and filtering
 * 
 * Supported JSONPath syntax:
 * - $.property - Access object property
 * - $.array[0] - Access array element by index
 * - $.array[*] - Access all array elements
 * - $.*.property - Wildcard object access
 * - $..property - Recursive descent
 * - $.array[?(@.property > 5)] - Filtering (basic support)
 * - $.array.length - Get array length
 * 
 * @example
 * ```typescript
 * const extractor = new JsonPathExtractor();
 * 
 * const data = {
 *   users: [
 *     { name: 'John', age: 30 },
 *     { name: 'Jane', age: 25 }
 *   ]
 * };
 * 
 * extractor.extract(data, '$.users[0].name'); // 'John'
 * extractor.extract(data, '$.users[*].name'); // ['John', 'Jane']
 * extractor.extract(data, '$..name'); // ['John', 'Jane']
 * ```
 */
export class JsonPathExtractor {
  
  /**
   * Extract value(s) from object using JSONPath expression
   * 
   * @param data - Object to extract from
   * @param path - JSONPath expression
   * @returns Extracted value(s)
   * @throws Error if path is invalid or extraction fails
   */
  extract(data: any, path: string): any {
    this.validatePath(path);
    
    if (data === null || data === undefined) {
      return undefined;
    }

    try {
      // Normalize path - remove leading $ if present
      const normalizedPath = path.startsWith('$') ? path.substring(1) : path;
      
      if (normalizedPath === '' || normalizedPath === '.') {
        return data;
      }

      return this.extractFromPath(data, normalizedPath);
    } catch (error) {
      throw new Error(`JSONPath extraction failed for '${path}': ${(error as Error).message}`);
    }
  }

  /**
   * Check if a JSONPath exists in the given data
   * 
   * @param data - Object to check
   * @param path - JSONPath expression
   * @returns True if path exists
   */
  exists(data: any, path: string): boolean {
    try {
      const result = this.extract(data, path);
      return result !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract multiple paths and return as object
   * 
   * @param data - Object to extract from
   * @param paths - Object with aliases as keys and JSONPath expressions as values
   * @returns Object with extracted values
   */
  extractMultiple(data: any, paths: Record<string, string>): Record<string, any> {
    const results: Record<string, any> = {};
    
    for (const [alias, path] of Object.entries(paths)) {
      try {
        results[alias] = this.extract(data, path);
      } catch (error) {
        results[alias] = undefined;
      }
    }
    
    return results;
  }

  /**
   * Extract value and apply transformation function
   * 
   * @param data - Object to extract from
   * @param path - JSONPath expression
   * @param transform - Transformation function
   * @returns Transformed value
   */
  extractAndTransform<T, R>(data: any, path: string, transform: (value: T) => R): R {
    const value = this.extract(data, path);
    return transform(value);
  }

  /**
   * Main extraction logic
   * 
   * @param data - Current data context
   * @param path - Remaining path to process
   * @returns Extracted value(s)
   */
  private extractFromPath(data: any, path: string): any {
    if (path === '') {
      return data;
    }

    // Handle recursive descent (..)
    if (path.startsWith('..')) {
      return this.handleRecursiveDescent(data, path.substring(2));
    }

    // Split path into segments
    const segments = this.parsePathSegments(path);
    
    if (segments.length === 0) {
      return data;
    }

    const [currentSegment, ...remainingSegments] = segments;
    const remainingPath = remainingSegments.join('.');

    return this.processSegment(data, currentSegment, remainingPath);
  }

  /**
   * Process a single path segment
   * 
   * @param data - Current data context
   * @param segment - Current path segment
   * @param remainingPath - Remaining path after current segment
   * @returns Extracted value(s)
   */
  private processSegment(data: any, segment: string, remainingPath: string): any {
    if (data === null || data === undefined) {
      return undefined;
    }

    // Handle array access [index] or [*]
    if (segment.includes('[') && segment.includes(']')) {
      return this.handleArrayAccess(data, segment, remainingPath);
    }

    // Handle wildcard access (*)
    if (segment === '*') {
      return this.handleWildcard(data, remainingPath);
    }

    // Handle filtering [?(@.property condition)]
    if (segment.startsWith('[?') && segment.endsWith(')]')) {
      return this.handleFiltering(data, segment, remainingPath);
    }

    // Handle special properties
    if (segment === 'length' && Array.isArray(data)) {
      return data.length;
    }

    // Handle regular property access
    if (typeof data === 'object' && segment in data) {
      const value = data[segment];
      
      if (remainingPath === '') {
        return value;
      }
      
      return this.extractFromPath(value, remainingPath);
    }

    return undefined;
  }

  /**
   * Handle array access patterns [index], [*], [start:end]
   * 
   * @param data - Current data (should be array or object)
   * @param segment - Segment containing array access
   * @param remainingPath - Remaining path
   * @returns Extracted value(s)
   */
  private handleArrayAccess(data: any, segment: string, remainingPath: string): any {
    const bracketMatch = segment.match(/^([^[]*)\[([^\]]+)\](.*)$/);
    
    if (!bracketMatch) {
      throw new Error(`Invalid array access syntax: ${segment}`);
    }

    const [, propertyName, indexExpression, suffix] = bracketMatch;

    // Navigate to the property if specified
    let targetData = data;
    if (propertyName && propertyName !== '') {
      if (typeof targetData === 'object' && propertyName in targetData) {
        targetData = targetData[propertyName];
      } else {
        return undefined;
      }
    }

    if (!Array.isArray(targetData)) {
      return undefined;
    }

    // Process the index expression
    if (indexExpression === '*') {
      // Return all elements
      const results = targetData.map(item => {
        const nextPath = suffix + (remainingPath ? '.' + remainingPath : '');
        return nextPath ? this.extractFromPath(item, nextPath) : item;
      });
      
      return results.filter(result => result !== undefined);
    }

    // Handle slice notation [start:end]
    if (indexExpression.includes(':')) {
      return this.handleArraySlice(targetData, indexExpression, suffix + (remainingPath ? '.' + remainingPath : ''));
    }

    // Handle single index
    const index = parseInt(indexExpression, 10);
    if (isNaN(index)) {
      throw new Error(`Invalid array index: ${indexExpression}`);
    }

    // Support negative indices
    const actualIndex = index < 0 ? targetData.length + index : index;
    
    if (actualIndex < 0 || actualIndex >= targetData.length) {
      return undefined;
    }

    const item = targetData[actualIndex];
    const nextPath = suffix + (remainingPath ? '.' + remainingPath : '');
    
    return nextPath ? this.extractFromPath(item, nextPath) : item;
  }

  /**
   * Handle array slicing [start:end]
   * 
   * @param array - Array to slice
   * @param sliceExpression - Slice expression (e.g., "1:3", ":2", "1:")
   * @param remainingPath - Remaining path
   * @returns Sliced array with extracted values
   */
  private handleArraySlice(array: any[], sliceExpression: string, remainingPath: string): any[] {
    const [startStr, endStr] = sliceExpression.split(':');
    
    const start = startStr === '' ? 0 : parseInt(startStr, 10);
    const end = endStr === '' ? array.length : parseInt(endStr, 10);
    
    const slicedArray = array.slice(start, end);
    
    if (!remainingPath) {
      return slicedArray;
    }
    
    return slicedArray.map(item => this.extractFromPath(item, remainingPath))
                    .filter(result => result !== undefined);
  }

  /**
   * Handle wildcard access (*)
   * 
   * @param data - Current data context
   * @param remainingPath - Remaining path
   * @returns Array of extracted values
   */
  private handleWildcard(data: any, remainingPath: string): any[] {
    if (typeof data !== 'object' || data === null) {
      return [];
    }

    const values = Array.isArray(data) ? data : Object.values(data);
    
    if (!remainingPath) {
      return values;
    }

    return values.map(value => this.extractFromPath(value, remainingPath))
                .filter(result => result !== undefined);
  }

  /**
   * Handle recursive descent (..)
   * 
   * @param data - Current data context
   * @param property - Property to find recursively
   * @returns Array of all matching values
   */
  private handleRecursiveDescent(data: any, property: string): any[] {
    const results: any[] = [];
    
    this.recursiveSearch(data, property, results);
    
    return results.length === 1 ? results[0] : results;
  }

  /**
   * Recursively search for property in nested structures
   * 
   * @param data - Current data to search
   * @param property - Property name to find
   * @param results - Array to collect results
   */
  private recursiveSearch(data: any, property: string, results: any[]): void {
    if (data === null || data === undefined) {
      return;
    }

    if (typeof data === 'object') {
      // Check if current object has the property
      if (property in data) {
        results.push(data[property]);
      }

      // Recursively search nested objects and arrays
      for (const value of Object.values(data)) {
        this.recursiveSearch(value, property, results);
      }
    }
  }

  /**
   * Handle basic filtering [?(@.property condition)]
   * Note: This is a simplified implementation
   * 
   * @param data - Array to filter
   * @param filterExpression - Filter expression
   * @param remainingPath - Remaining path
   * @returns Filtered results
   */
  private handleFiltering(data: any, filterExpression: string, remainingPath: string): any[] {
    if (!Array.isArray(data)) {
      return [];
    }

    // Extract the condition from [?(@.condition)]
    const conditionMatch = filterExpression.match(/^\[\?\(@\.(.+)\)\]$/);
    if (!conditionMatch) {
      throw new Error(`Invalid filter expression: ${filterExpression}`);
    }

    const condition = conditionMatch[1].trim();     }}