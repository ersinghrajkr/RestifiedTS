// src/interceptors/InterceptorManager.ts

import { RequestConfig, RestifiedResponse } from '../types/RestifiedTypes';

/**
 * Advanced interceptor manager for request/response transformation
 */
export class InterceptorManager {
  private requestInterceptors: RegisteredInterceptor<RequestInterceptor>[] = [];
  private responseInterceptors: RegisteredInterceptor<ResponseInterceptor>[] = [];
  private errorInterceptors: RegisteredInterceptor<ErrorInterceptor>[] = [];
  private readonly builtInInterceptors: BuiltInInterceptors;

  constructor() {
    this.builtInInterceptors = new BuiltInInterceptors();
  }

  addRequestInterceptor(
    interceptor: RequestInterceptor,
    options: InterceptorOptions = {}
  ): void {
    this.requestInterceptors.push({
      interceptor,
      options: { priority: 0, enabled: true, ...options }
    });
    this.sortInterceptors(this.requestInterceptors);
  }

  addResponseInterceptor(
    interceptor: ResponseInterceptor,
    options: InterceptorOptions = {}
  ): void {
    this.responseInterceptors.push({
      interceptor,
      options: { priority: 0, enabled: true, ...options }
    });
    this.sortInterceptors(this.responseInterceptors);
  }

  addErrorInterceptor(
    interceptor: ErrorInterceptor,
    options: InterceptorOptions = {}
  ): void {
    this.errorInterceptors.push({
      interceptor,
      options: { priority: 0, enabled: true, ...options }
    });
    this.sortInterceptors(this.errorInterceptors);
  }

  async processRequest(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = { ...config };

    for (const registered of this.requestInterceptors) {
      if (!this.shouldApplyInterceptor(registered, processedConfig)) {
        continue;
      }

      try {
        const result = await registered.interceptor(processedConfig);
        if (result) {
          processedConfig = result;
        }
      } catch (error) {
        const enhancedError = new Error(
          `Request interceptor '${registered.options.name || 'anonymous'}' failed: ${(error as Error).message}`
        );
        throw enhancedError;
      }
    }

    return processedConfig;
  }

  async processResponse(response: RestifiedResponse): Promise<RestifiedResponse> {
    let processedResponse = { ...response };

    for (const registered of this.responseInterceptors) {
      if (!this.shouldApplyInterceptor(registered, response.config, response)) {
        continue;
      }

      try {
        const result = await registered.interceptor(processedResponse);
        if (result) {
          processedResponse = result;
        }
      } catch (error) {
        const enhancedError = new Error(
          `Response interceptor '${registered.options.name || 'anonymous'}' failed: ${(error as Error).message}`
        );
        throw enhancedError;
      }
    }

    return processedResponse;
  }

  async processError(error: Error, config: RequestConfig): Promise<e> {
    let processedError = error;

    for (const registered of this.errorInterceptors) {
      if (!this.shouldApplyInterceptor(registered, config)) {
        continue;
      }

      try {
        const result = await registered.interceptor(processedError, config);
        if (result) {
          processedError = result;
        }
      } catch (interceptorError) {
        console.warn(
          `Error interceptor '${registered.options.name || 'anonymous'}' failed:`,
          interceptorError
        );
      }
    }

    return processedError;
  }

  clear(): void {
    this.requestInterceptors.length = 0;
    this.responseInterceptors.length = 0;
    this.errorInterceptors.length = 0;
  }

  getInterceptorCounts(): InterceptorCounts {
    return {
      request: this.requestInterceptors.length,
      response: this.responseInterceptors.length,
      error: this.errorInterceptors.length
    };
  }

  private shouldApplyInterceptor(
    registered: RegisteredInterceptor<any>,
    config: RequestConfig,
    response?: RestifiedResponse
  ): boolean {
    if (!registered.options.enabled) {
      return false;
    }

    if (registered.options.predicate) {
      return registered.options.predicate(config, response);
    }

    return true;
  }

  private sortInterceptors<T>(interceptors: RegisteredInterceptor<T>[]): void {
    interceptors.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
  }
}

export class BuiltInInterceptors {
  createAuthInterceptor(getToken: () => string | Promise<string>): RequestInterceptor {
    return async (config: RequestConfig): Promise<RequestConfig> => {
      const token = await getToken();
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      return config;
    };
  }

  createRequestLoggingInterceptor(
    logger: (message: string, data?: any) => void
  ): RequestInterceptor {
    return async (config: RequestConfig): Promise<RequestConfig> => {
      logger(`→ ${config.method} ${config.url}`, {
        headers: config.headers,
        data: config.data
      });
      return config;
    };
  }

  createResponseLoggingInterceptor(
    logger: (message: string, data?: any) => void
  ): ResponseInterceptor {
    return async (response: RestifiedResponse): Promise<RestifiedResponse> => {
      logger(`← ${response.status} ${response.statusText} (${response.responseTime}ms)`, {
        headers: response.headers,
        dataSize: JSON.stringify(response.data).length
      });
      return response;
    };
  }
}

// Types
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (response: RestifiedResponse) => RestifiedResponse | Promise<RestifiedResponse>;
export type ErrorInterceptor = (error: Error, config: RequestConfig) => Error | Promise<e>;

export interface InterceptorOptions {
  name?: string;
  priority?: number;
  enabled?: boolean;
  predicate?: (config: RequestConfig, response?: RestifiedResponse) => boolean;
}

interface RegisteredInterceptor<T> {
  interceptor: T;
  options: Required<InterceptorOptions>;
}

interface InterceptorCounts {
  request: number;
  response: number;
  error: number;
}