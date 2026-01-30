/**
 * Express Adapter
 *
 * Adapts Express.js to work with protocol handlers.
 * Express is an optional dependency - only imported when this adapter is used.
 */

import type { Request, Response, Express, NextFunction } from 'express';

import { AgentInvoker } from '../core/invoker';
import type { InvokeAgentHandler } from '../core/invoker';
import { ProtocolRequest, ProtocolResponse, ServerConfig } from '../core/model';
import { ProtocolHandler } from '../protocol/base';
import { OpenAIProtocolHandler } from '../protocol/openai';
import { AGUIProtocolHandler } from '../protocol/agui';

/**
 * Express adapter options
 */
export interface ExpressAdapterOptions {
  /** Custom protocol handlers (overrides default) */
  protocols?: ProtocolHandler[];
  /** Server config for default protocols */
  config?: ServerConfig;
  /** CORS origins */
  corsOrigins?: string[];
}

/**
 * Express Adapter
 *
 * Provides middleware and utilities to integrate protocol handlers with Express.
 */
export class ExpressAdapter {
  private invoker: AgentInvoker;
  private protocols: ProtocolHandler[];
  private corsOrigins: string[];

  constructor(handler: InvokeAgentHandler, options?: ExpressAdapterOptions) {
    this.invoker = new AgentInvoker(handler);
    this.corsOrigins = options?.corsOrigins || options?.config?.corsOrigins || ['*'];

    // Use custom protocols or create defaults
    if (options?.protocols) {
      this.protocols = options.protocols;
    } else {
      this.protocols = [];
      const config = options?.config || {};

      // Add OpenAI protocol if enabled (default: true)
      if (config.openai?.enable !== false) {
        this.protocols.push(new OpenAIProtocolHandler(config.openai));
      }

      // Add AG-UI protocol if enabled (default: true)
      if (config.agui?.enable !== false) {
        this.protocols.push(new AGUIProtocolHandler(config.agui));
      }
    }
  }

  /**
   * Get middleware for Express app
   */
  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        this.setCorsHeaders(res);
        res.status(204).end();
        return;
      }

      // Try to match a protocol handler
      for (const protocol of this.protocols) {
        if (protocol.matches(this.toProtocolRequest(req))) {
          try {
            const response = await protocol.handle(this.toProtocolRequest(req), this.invoker);
            this.sendResponse(res, response);
            return;
          } catch (error) {
            next(error);
            return;
          }
        }
      }

      // No handler matched
      next();
    };
  }

  /**
   * Apply adapter to Express app
   *
   * Adds middleware and optional CORS support.
   */
  apply(app: Express): void {
    // Add JSON body parser if not already present
    // Note: User should typically add this themselves, but we ensure it's there
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Skip if body is already parsed
      if (req.body !== undefined) {
        next();
        return;
      }

      // Try to parse JSON body
      let data = '';
      req.on('data', (chunk: Buffer | string) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          req.body = data ? JSON.parse(data) : {};
        } catch {
          req.body = {};
        }
        next();
      });
    });

    // Add the protocol handler middleware
    app.use(this.middleware());
  }

  /**
   * Create Express router with protocol routes
   */
  router(): unknown {
    // Dynamically create router to avoid requiring express at module load
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const express = require('express');
    const router = express.Router();

    // Add routes for each protocol
    for (const protocol of this.protocols) {
      const prefix = protocol.getPrefix();
      const routes = protocol.getRoutes();

      for (const route of routes) {
        const fullPath = prefix + route.path;
        const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';

        router[method](fullPath, async (req: Request, res: Response) => {
          this.setCorsHeaders(res);
          try {
            const response = await protocol.handle(this.toProtocolRequest(req), this.invoker);
            this.sendResponse(res, response);
          } catch (error) {
            res.status(500).json({
              error: { message: error instanceof Error ? error.message : String(error) },
            });
          }
        });

        // Handle CORS preflight for this route
        router.options(fullPath, (req: Request, res: Response) => {
          this.setCorsHeaders(res);
          res.status(204).end();
        });
      }
    }

    return router;
  }

  /**
   * Convert Express Request to ProtocolRequest
   */
  private toProtocolRequest(req: Request): ProtocolRequest {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      }
    }

    return {
      body: req.body || {},
      headers,
      method: req.method,
      url: req.originalUrl || req.url,
      query: req.query as Record<string, string>,
    };
  }

  /**
   * Send ProtocolResponse to Express Response
   */
  private async sendResponse(res: Response, response: ProtocolResponse): Promise<void> {
    // Set status and headers
    res.status(response.status);
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }

    // Set CORS headers
    this.setCorsHeaders(res);

    // Handle body
    if (typeof response.body === 'string') {
      res.send(response.body);
    } else {
      // Streaming response
      for await (const chunk of response.body) {
        res.write(chunk);
        // Flush for SSE
        if ('flush' in res && typeof res.flush === 'function') {
          res.flush();
        }
      }
      res.end();
    }
  }

  /**
   * Set CORS headers
   */
  private setCorsHeaders(res: Response): void {
    const origin =
      this.corsOrigins.length === 1 ? this.corsOrigins[0] : this.corsOrigins.join(', ');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

/**
 * Create Express adapter
 *
 * Convenience function to create an Express adapter.
 */
export function createExpressAdapter(
  handler: InvokeAgentHandler,
  options?: ExpressAdapterOptions
): ExpressAdapter {
  return new ExpressAdapter(handler, options);
}
