/**
 * Protocol Handler Base
 *
 * Abstract base class for protocol handlers.
 * Each protocol (OpenAI, AG-UI, etc.) implements this interface.
 */

import type { AgentInvoker } from '../core/invoker';
import type { ProtocolRequest, ProtocolResponse } from '../core/model';

/**
 * Route definition for protocol handler
 */
export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: (
    req: ProtocolRequest,
    invoker: AgentInvoker,
  ) => Promise<ProtocolResponse>;
}

/**
 * Protocol Handler abstract base class
 *
 * Responsibilities:
 * - Define protocol routes
 * - Parse protocol-specific requests to AgentRequest
 * - Format AgentEvent stream to protocol-specific response
 */
export abstract class ProtocolHandler {
  /**
   * Protocol name identifier
   */
  abstract readonly name: string;

  /**
   * Get protocol route prefix
   */
  abstract getPrefix(): string;

  /**
   * Get all routes supported by this protocol
   */
  abstract getRoutes(): RouteDefinition[];

  /**
   * Check if a request matches this protocol
   */
  matches(req: ProtocolRequest): boolean {
    const prefix = this.getPrefix();
    return this.getRoutes().some(
      (route) =>
        route.method === req.method && this.matchPath(prefix + route.path, req.url),
    );
  }

  /**
   * Handle a request
   */
  async handle(
    req: ProtocolRequest,
    invoker: AgentInvoker,
  ): Promise<ProtocolResponse> {
    const prefix = this.getPrefix();
    const route = this.getRoutes().find(
      (r) => r.method === req.method && this.matchPath(prefix + r.path, req.url),
    );

    if (!route) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Not Found' }),
      };
    }

    try {
      return await route.handler(req, invoker);
    } catch (error) {
      return this.createErrorResponse(error, 500);
    }
  }

  /**
   * Create error response
   */
  protected createErrorResponse(
    error: unknown,
    status: number = 500,
  ): ProtocolResponse {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          message,
          type: 'server_error',
        },
      }),
    };
  }

  /**
   * Match path with simple pattern matching
   * Supports exact match and prefix match with trailing slash
   */
  private matchPath(pattern: string, path: string): boolean {
    // Normalize paths
    const normalizedPattern = pattern.replace(/\/+$/, '');
    const normalizedPath = path.replace(/\/+$/, '').split('?')[0];

    return normalizedPattern === normalizedPath;
  }
}
