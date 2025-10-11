export abstract class BaseError extends Error {
  abstract readonly code: string;
  
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
    };
  }
}

export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR';
  
  constructor(message: string, public readonly field?: string) {
    super(message, { field });
  }
}

export class NetworkError extends BaseError {
  readonly code = 'NETWORK_ERROR';
  
  constructor(message: string, public readonly status: number, public readonly url?: string) {
    super(message, { status, url });
  }
}

export class ApiError extends BaseError {
  readonly code = 'API_ERROR';
  
  constructor(
    message: string,
    public readonly apiCode?: string,
    public readonly statusCode?: number
  ) {
    super(message, { apiCode, statusCode });
  }
}

export class ConfigurationError extends BaseError {
  readonly code = 'CONFIGURATION_ERROR';
  
  constructor(message: string, public readonly key?: string) {
    super(message, { key });
  }
}