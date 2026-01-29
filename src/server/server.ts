/**
 * AgentRun HTTP Server
 *
 * A convenience wrapper that provides an HTTP server with protocol handlers.
 * Uses native Node.js http module for zero dependencies.
 */

import * as http from 'http';

import { logger } from '../utils/log';

import { AgentInvoker, type InvokeAgentHandler } from './core/invoker';
import { ProtocolRequest, ProtocolResponse, ServerConfig } from './core/model';
import { ProtocolHandler } from './protocol/base';
import { OpenAIProtocolHandler } from './protocol/openai';
import { AGUIProtocolHandler } from './protocol/agui';

/**
 * AgentRun Server Options
 */
export interface AgentRunServerOptions {
  /** Agent invoke handler */
  invokeAgent: InvokeAgentHandler;
  /** Server configuration */
  config?: ServerConfig;
  /** Custom protocol handlers (overrides defaults) */
  protocols?: ProtocolHandler[];
}

/**
 * AgentRun HTTP Server
 *
 * Provides a standalone HTTP server with OpenAI and AG-UI protocol support.
 */
export class AgentRunServer {
  private invoker: AgentInvoker;
  private protocols: ProtocolHandler[];
  private config: ServerConfig;
  private server?: http.Server;

  constructor(options: AgentRunServerOptions) {
    this.invoker = new AgentInvoker(options.invokeAgent);
    this.config = options.config ?? {};

    // Use custom protocols or create defaults
    if (options.protocols) {
      this.protocols = options.protocols;
    } else {
      this.protocols = [];

      // Add OpenAI protocol if enabled (default: true)
      if (this.config.openai?.enable !== false) {
        this.protocols.push(new OpenAIProtocolHandler(this.config.openai));
      }

      // Add AG-UI protocol if enabled (default: true)
      if (this.config.agui?.enable !== false) {
        this.protocols.push(new AGUIProtocolHandler(this.config.agui));
      }
    }
  }

  /**
   * Start the HTTP server
   */
  start(options?: { host?: string; port?: number }): void {
    const host = options?.host ?? this.config.host ?? '0.0.0.0';
    const port = options?.port ?? this.config.port ?? 9000;

    this.server = http.createServer(async (req, res) => {
      // Handle CORS
      this.handleCors(req, res);

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        await this.handleRequest(req, res);
      } catch (error) {
        logger.error('Request error:', error as Error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    this.server.listen(port, host, () => {
      logger.info(`AgentRun Server started: http://${host}:${port}`);
    });
  }

  /**
   * Stop the HTTP server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger.info('AgentRun Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Handle CORS headers
   */
  private handleCors(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): void {
    const origins = this.config.corsOrigins ?? ['*'];
    const origin = req.headers.origin;

    if (origins.includes('*') || (origin && origins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  /**
   * Handle HTTP request
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const url = req.url || '/';

    // Health check
    if (url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Parse body for POST requests
    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      body = await this.parseBody(req);
    }

    // Convert to ProtocolRequest
    const protocolRequest = this.toProtocolRequest(req, body);

    // Try each protocol handler
    for (const protocol of this.protocols) {
      if (protocol.matches(protocolRequest)) {
        const response = await protocol.handle(protocolRequest, this.invoker);
        await this.sendResponse(res, response);
        return;
      }
    }

    // No handler matched - 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  /**
   * Convert http.IncomingMessage to ProtocolRequest
   */
  private toProtocolRequest(
    req: http.IncomingMessage,
    body: Record<string, unknown>,
  ): ProtocolRequest {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      }
    }

    // Parse query string
    const urlParts = (req.url || '').split('?');
    const queryString = urlParts[1] || '';
    const query: Record<string, string> = {};
    if (queryString) {
      for (const pair of queryString.split('&')) {
        const [key, value] = pair.split('=');
        if (key) {
          query[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
      }
    }

    return {
      body,
      headers,
      method: req.method || 'GET',
      url: urlParts[0] || '/',
      query,
    };
  }

  /**
   * Send ProtocolResponse via http.ServerResponse
   */
  private async sendResponse(
    res: http.ServerResponse,
    response: ProtocolResponse,
  ): Promise<void> {
    res.writeHead(response.status, response.headers);

    if (typeof response.body === 'string') {
      res.end(response.body);
    } else {
      // Streaming response
      for await (const chunk of response.body) {
        res.write(chunk);
      }
      res.end();
    }
  }

  /**
   * Parse request body as JSON
   */
  private parseBody(
    req: http.IncomingMessage,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }
}
