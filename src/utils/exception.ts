/**
 * Exception classes for AgentRun SDK
 *
 * 此模块定义 AgentRun SDK 的异常类。
 * This module defines exception classes for AgentRun SDK.
 */

/**
 * Base error class for AgentRun SDK
 */
export class AgentRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentRunError';
    Object.setPrototypeOf(this, AgentRunError.prototype);
  }
}

/**
 * HTTP error with status code and request ID
 */
export class HTTPError extends AgentRunError {
  readonly statusCode: number;
  readonly requestId?: string;
  readonly errorCode?: string;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      requestId?: string;
      errorCode?: string;
    }
  ) {
    super(message);
    this.name = 'HTTPError';
    this.statusCode = statusCode;
    this.requestId = options?.requestId;
    this.errorCode = options?.errorCode;
    Object.setPrototypeOf(this, HTTPError.prototype);
  }

  /**
   * Convert HTTP error to resource-specific error based on status code
   */
  toResourceError(resourceType: string, resourceId?: string): HTTPError {
    if (this.statusCode == 404) return new ResourceNotExistError(resourceType, resourceId);
    else if (this.statusCode == 409) return new ResourceAlreadyExistError(resourceType, resourceId);
    else if (
      (this.statusCode == 400 || this.statusCode == 500) &&
      this.message.includes('already exists')
    )
      return new ResourceAlreadyExistError(resourceType, resourceId);
    else return this;
  }
}

/**
 * Client-side error (4xx status codes)
 */
export class ClientError extends HTTPError {
  constructor(
    statusCode: number,
    message: string,
    options?: {
      requestId?: string;
      errorCode?: string;
    }
  ) {
    super(statusCode, message, options);
    this.name = 'ClientError';
    Object.setPrototypeOf(this, ClientError.prototype);
  }
}

/**
 * Server-side error (5xx status codes)
 */
export class ServerError extends HTTPError {
  constructor(
    statusCode: number,
    message: string,
    options?: {
      requestId?: string;
      errorCode?: string;
    }
  ) {
    super(statusCode, message, options);
    this.name = 'ServerError';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Resource not found error
 */
export class ResourceNotExistError extends ClientError {
  readonly resourceType: string;
  readonly resourceId?: string;

  constructor(
    resourceType: string,
    resourceId?: string,
    options?: {
      requestId?: string;
    }
  ) {
    const message = resourceId
      ? `${resourceType} '${resourceId}' does not exist`
      : `${resourceType} does not exist`;
    super(404, message, options);
    this.name = 'ResourceNotExistError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    Object.setPrototypeOf(this, ResourceNotExistError.prototype);
  }
}

/**
 * Resource already exists error
 */
export class ResourceAlreadyExistError extends ClientError {
  readonly resourceType: string;
  readonly resourceId?: string;

  constructor(
    resourceType: string,
    resourceId?: string,
    options?: {
      requestId?: string;
    }
  ) {
    const message = resourceId
      ? `${resourceType} '${resourceId}' already exists`
      : `${resourceType} already exists`;
    super(409, message, options);
    this.name = 'ResourceAlreadyExistError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    Object.setPrototypeOf(this, ResourceAlreadyExistError.prototype);
  }
}
