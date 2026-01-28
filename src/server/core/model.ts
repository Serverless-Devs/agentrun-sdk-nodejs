/**
 * Server Core Data Models
 *
 * 此模块定义 Server 相关的所有数据模型。
 * This module defines all data models related to Server.
 */

/**
 * Message role enum
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

/**
 * Event type enum for AgentEvent (Protocol agnostic)
 *
 * 定义核心事件类型，框架会自动转换为对应协议格式（OpenAI、AG-UI 等）。
 */
export enum EventType {
  // 核心事件
  TEXT = 'TEXT', // 文本内容块
  TOOL_CALL = 'TOOL_CALL', // 完整工具调用（含 id, name, args）
  TOOL_CALL_CHUNK = 'TOOL_CALL_CHUNK', // 工具调用参数片段（流式场景）
  TOOL_RESULT = 'TOOL_RESULT', // 工具执行结果
  TOOL_RESULT_CHUNK = 'TOOL_RESULT_CHUNK', // 工具执行结果片段（流式输出场景）
  ERROR = 'ERROR', // 错误事件
  STATE = 'STATE', // 状态更新（快照或增量）

  // 人机交互事件
  HITL = 'HITL', // Human-in-the-Loop，请求人类介入

  // 扩展事件
  CUSTOM = 'CUSTOM', // 自定义事件
  RAW = 'RAW', // 原始协议数据（直接透传到响应流）
}

/**
 * Tool call definition
 */
export interface ToolCall {
  id: string;
  type?: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Tool definition
 */
export interface Tool {
  type: string;
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

/**
 * Message in a conversation
 */
export interface Message {
  id?: string;
  role: MessageRole;
  content?: string | Array<Record<string, unknown>>;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/**
 * Agent request
 */
export interface AgentRequest {
  /** Protocol name */
  protocol?: string;
  /** Messages in the conversation */
  messages: Message[];
  /** Whether to stream the response */
  stream?: boolean;
  /** Model to use */
  model?: string;
  /** Available tools */
  tools?: Tool[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Raw HTTP request (for accessing headers, etc.) */
  rawRequest?: unknown;
}

/**
 * Merge options for addition field
 */
export interface MergeOptions {
  noNewField?: boolean;
  concatList?: boolean;
  ignoreEmptyList?: boolean;
}

/**
 * Agent event (for streaming)
 *
 * 标准化的事件结构，协议无关设计。
 * 框架层会自动将 AgentEvent 转换为对应协议的格式（OpenAI、AG-UI 等）。
 */
export interface AgentEvent {
  /** Event type */
  event: EventType;
  /** Event data */
  data?: Record<string, unknown>;
  /** Additional fields for protocol extension */
  addition?: Record<string, unknown>;
  /** Merge options for addition */
  additionMergeOptions?: MergeOptions;
}

/**
 * Agent result (alias for AgentEvent)
 */
export type AgentResult = AgentEvent;

/**
 * Agent event item (can be string or AgentEvent)
 */
export type AgentEventItem = string | AgentEvent;

/**
 * Protocol configuration base
 */
export interface ProtocolConfig {
  prefix?: string;
  enable?: boolean;
}

/**
 * OpenAI protocol configuration
 */
export interface OpenAIProtocolConfig extends ProtocolConfig {
  modelName?: string;
}

/**
 * AG-UI protocol configuration
 */
export interface AGUIProtocolConfig extends ProtocolConfig {
  // No additional config for now
}

/**
 * Server configuration
 */
export interface ServerConfig {
  /** OpenAI protocol config */
  openai?: OpenAIProtocolConfig;
  /** AG-UI protocol config */
  agui?: AGUIProtocolConfig;
  /** CORS origins */
  corsOrigins?: string[];
  /** Port to listen on */
  port?: number;
  /** Host to listen on */
  host?: string;
}

/**
 * Protocol request interface (framework agnostic)
 */
export interface ProtocolRequest {
  body: Record<string, unknown>;
  headers: Record<string, string>;
  method: string;
  url: string;
  query?: Record<string, string>;
}

/**
 * Protocol response interface
 */
export interface ProtocolResponse {
  status: number;
  headers: Record<string, string>;
  body: string | AsyncIterable<string>;
}

/**
 * Invoke options for AgentInvoker
 */
export interface InvokeOptions {
  signal?: AbortSignal;
  timeout?: number;
}
