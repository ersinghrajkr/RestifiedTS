/**
 * Temporary stub Config.ts for build compatibility
 */

import { RestifiedConfig } from '../../types/RestifiedTypes';

export class Config {
  constructor(userConfig?: Partial<RestifiedConfig>) {
    // Minimal implementation for build compatibility
  }

  get(key: string, defaultValue?: any): any {
    return defaultValue;
  }

  set(key: string, value: any): void {
    // No-op
  }

  getConfig(): any {
    return {};
  }
}

export class ConfigValidator {
  static validate(config: any): boolean {
    return true;
  }
}