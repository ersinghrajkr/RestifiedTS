import * as fs from 'fs';
import * as path from 'path';

/**
 * Test Data Loader
 * Provides easy access to JSON fixtures and test data
 */
export class TestData {
  private static cache: Map<string, any> = new Map();

  /**
   * Load JSON fixture file
   */
  static loadFixture(filename: string): any {
    if (this.cache.has(filename)) {
      return this.cache.get(filename);
    }

    const filePath = path.join(__dirname, `${filename}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fixture file not found: ${filePath}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.cache.set(filename, data);
    return data;
  }

  /**
   * Get user test data
   */
  static get users() {
    return this.loadFixture('user-data');
  }

  /**
   * Get API responses test data
   */
  static get apiResponses() {
    return this.loadFixture('api-responses');
  }

  /**
   * Get JSON schemas for validation
   */
  static get schemas() {
    return this.loadFixture('schemas');
  }

  /**
   * Generate random test data using Faker
   */
  static generateUser(faker: any) {
    return {
      name: faker.person.fullName(),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      address: {
        street: faker.location.streetAddress(),
        suite: faker.location.secondaryAddress(),
        city: faker.location.city(),
        zipcode: faker.location.zipCode(),
        geo: {
          lat: faker.location.latitude().toString(),
          lng: faker.location.longitude().toString()
        }
      },
      phone: faker.phone.number(),
      website: faker.internet.domainName(),
      company: {
        name: faker.company.name(),
        catchPhrase: faker.company.catchPhrase(),
        bs: faker.company.buzzPhrase()
      }
    };
  }

  /**
   * Generate random post data
   */
  static generatePost(faker: any, userId?: number) {
    return {
      title: faker.lorem.sentence(),
      body: faker.lorem.paragraphs(2),
      userId: userId || faker.number.int({ min: 1, max: 10 })
    };
  }

  /**
   * Generate random comment data
   */
  static generateComment(faker: any, postId?: number) {
    return {
      postId: postId || faker.number.int({ min: 1, max: 100 }),
      name: faker.lorem.sentence(3),
      email: faker.internet.email(),
      body: faker.lorem.paragraph()
    };
  }

  /**
   * Generate random todo data
   */
  static generateTodo(faker: any, userId?: number) {
    return {
      userId: userId || faker.number.int({ min: 1, max: 10 }),
      title: faker.lorem.sentence(),
      completed: faker.datatype.boolean()
    };
  }

  /**
   * Generate multiple items of any type
   */
  static generateMultiple<T>(generator: () => T, count: number): T[] {
    return Array.from({ length: count }, generator);
  }

  /**
   * Get random item from array
   */
  static randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Deep clone object to avoid mutations
   */
  static clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}

// Export specific data accessors for convenience
export const UserData = TestData.users;
export const ApiResponses = TestData.apiResponses;
export const Schemas = TestData.schemas;