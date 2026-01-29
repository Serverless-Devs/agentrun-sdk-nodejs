/**
 * Server Module Exports
 */

// Core layer
export { EventType, MessageRole } from './core/model';
export type {
  ToolCall,
  Tool,
  Message,
  AgentRequest,
  AgentEvent,
  AgentResult,
  AgentEventItem,
  MergeOptions,
  ProtocolConfig,
  OpenAIProtocolConfig,
  AGUIProtocolConfig,
  ServerConfig,
  ProtocolRequest,
  ProtocolResponse,
  InvokeOptions,
} from './core/model';
export { AgentInvoker, type InvokeAgentHandler } from './core/invoker';

// Protocol layer
export { ProtocolHandler, type RouteDefinition } from './protocol/base';
export { OpenAIProtocolHandler } from './protocol/openai';
export { AGUIProtocolHandler, AGUI_EVENT_TYPES } from './protocol/agui';

// Adapter layer
export {
  ExpressAdapter,
  createExpressAdapter,
  type ExpressAdapterOptions,
} from './adapter/express';

// Server
export { AgentRunServer, type AgentRunServerOptions } from './server';
