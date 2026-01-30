/**
 * AG-UI Protocol Handler
 *
 * Implements AG-UI (Agent-User Interaction Protocol) compatible interface.
 * AG-UI is an open-source, lightweight, event-based protocol for standardizing
 * AI Agent to frontend application interactions.
 *
 * Reference: https://docs.ag-ui.com/
 */

import { v4 as uuidv4 } from 'uuid';

import type { AgentInvoker } from '../core/invoker';
import {
  AGUIProtocolConfig,
  AgentEvent,
  AgentRequest,
  EventType,
  Message,
  MessageRole,
  MergeOptions,
  ProtocolRequest,
  ProtocolResponse,
  Tool,
  ToolCall,
} from '../core/model';
import { ProtocolHandler } from './base';
import type { RouteDefinition } from './base';

// ============================================================================
// AG-UI Event Types
// ============================================================================

export const AGUI_EVENT_TYPES = {
  RUN_STARTED: 'RUN_STARTED',
  RUN_FINISHED: 'RUN_FINISHED',
  RUN_ERROR: 'RUN_ERROR',
  TEXT_MESSAGE_START: 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT: 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END: 'TEXT_MESSAGE_END',
  TOOL_CALL_START: 'TOOL_CALL_START',
  TOOL_CALL_ARGS: 'TOOL_CALL_ARGS',
  TOOL_CALL_END: 'TOOL_CALL_END',
  TOOL_CALL_RESULT: 'TOOL_CALL_RESULT',
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  STATE_DELTA: 'STATE_DELTA',
  MESSAGES_SNAPSHOT: 'MESSAGES_SNAPSHOT',
  STEP_STARTED: 'STEP_STARTED',
  STEP_FINISHED: 'STEP_FINISHED',
  CUSTOM: 'CUSTOM',
  RAW: 'RAW',
} as const;

// ============================================================================
// Stream State
// ============================================================================

interface TextState {
  started: boolean;
  ended: boolean;
  messageId: string;
}

interface ToolCallState {
  name: string;
  started: boolean;
  ended: boolean;
  hasResult: boolean;
  isHitl: boolean;
}

/**
 * Stream state for tracking message and tool call boundaries
 */
class StreamState {
  text: TextState = {
    started: false,
    ended: false,
    messageId: uuidv4(),
  };
  toolCalls = new Map<string, ToolCallState>();
  toolResultChunks = new Map<string, string[]>();
  hasError = false;

  /**
   * End all open tool calls
   */
  *endAllToolCalls(exclude?: string): Generator<Record<string, unknown>> {
    for (const [toolId, state] of this.toolCalls) {
      if (exclude && toolId === exclude) continue;
      if (state.started && !state.ended) {
        yield { type: AGUI_EVENT_TYPES.TOOL_CALL_END, toolCallId: toolId };
        state.ended = true;
      }
    }
  }

  /**
   * Ensure text message has started
   */
  *ensureTextStarted(): Generator<Record<string, unknown>> {
    if (!this.text.started || this.text.ended) {
      if (this.text.ended) {
        this.text = { started: false, ended: false, messageId: uuidv4() };
      }
      yield {
        type: AGUI_EVENT_TYPES.TEXT_MESSAGE_START,
        messageId: this.text.messageId,
        role: 'assistant',
      };
      this.text.started = true;
      this.text.ended = false;
    }
  }

  /**
   * End text message if open
   */
  *endTextIfOpen(): Generator<Record<string, unknown>> {
    if (this.text.started && !this.text.ended) {
      yield {
        type: AGUI_EVENT_TYPES.TEXT_MESSAGE_END,
        messageId: this.text.messageId,
      };
      this.text.ended = true;
    }
  }

  /**
   * Cache tool result chunk
   */
  cacheToolResultChunk(toolId: string, delta: string): void {
    if (!toolId || delta === null || delta === undefined) return;
    if (delta) {
      const chunks = this.toolResultChunks.get(toolId) || [];
      chunks.push(delta);
      this.toolResultChunks.set(toolId, chunks);
    }
  }

  /**
   * Pop and concatenate cached tool result chunks
   */
  popToolResultChunks(toolId: string): string {
    const chunks = this.toolResultChunks.get(toolId) || [];
    this.toolResultChunks.delete(toolId);
    return chunks.join('');
  }
}

// ============================================================================
// AG-UI Protocol Handler
// ============================================================================

const DEFAULT_PREFIX = '/ag-ui';

/**
 * AG-UI Protocol Handler
 */
export class AGUIProtocolHandler extends ProtocolHandler {
  readonly name = 'agui';

  constructor(private config?: AGUIProtocolConfig) {
    super();
  }

  getPrefix(): string {
    return this.config?.prefix ?? DEFAULT_PREFIX;
  }

  getRoutes(): RouteDefinition[] {
    return [
      {
        method: 'POST',
        path: '/agent',
        handler: this.handleAgent.bind(this),
      },
    ];
  }

  /**
   * Handle POST /agent
   */
  private async handleAgent(
    req: ProtocolRequest,
    invoker: AgentInvoker,
  ): Promise<ProtocolResponse> {
    try {
      const { agentRequest, context } = this.parseRequest(req.body);

      return {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: this.formatStream(invoker.invoke(agentRequest), context),
      };
    } catch (error) {
      // Return error as AG-UI stream
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: this.errorStream(
          error instanceof Error ? error.message : String(error),
        ),
      };
    }
  }

  /**
   * Parse AG-UI request
   */
  private parseRequest(body: Record<string, unknown>): {
    agentRequest: AgentRequest;
    context: { threadId: string; runId: string };
  } {
    const context = {
      threadId: (body.threadId as string) || uuidv4(),
      runId: (body.runId as string) || uuidv4(),
    };

    const messages = this.parseMessages(
      (body.messages as Array<Record<string, unknown>>) || [],
    );
    const tools = this.parseTools(
      body.tools as Array<Record<string, unknown>> | undefined,
    );

    const agentRequest: AgentRequest = {
      protocol: 'agui',
      messages,
      stream: true, // AG-UI always streams
      tools: tools || undefined,
      model: body.model as string | undefined,
      metadata: body.metadata as Record<string, unknown> | undefined,
    };

    return { agentRequest, context };
  }

  /**
   * Parse messages list
   */
  private parseMessages(
    rawMessages: Array<Record<string, unknown>>,
  ): Message[] {
    const messages: Message[] = [];

    for (const msg of rawMessages) {
      if (typeof msg !== 'object' || msg === null) continue;

      const roleStr = (msg.role as string) || 'user';
      let role: MessageRole;
      if (Object.values(MessageRole).includes(roleStr as MessageRole)) {
        role = roleStr as MessageRole;
      } else {
        role = MessageRole.USER;
      }

      let toolCalls: ToolCall[] | undefined;
      const rawToolCalls = msg.toolCalls as
        | Array<Record<string, unknown>>
        | undefined;
      if (rawToolCalls && Array.isArray(rawToolCalls)) {
        toolCalls = rawToolCalls.map((tc) => ({
          id: (tc.id as string) || '',
          type: (tc.type as string) || 'function',
          function: (tc.function as { name: string; arguments: string }) || {
            name: '',
            arguments: '',
          },
        }));
      }

      messages.push({
        id: msg.id as string | undefined,
        role,
        content: msg.content as string | undefined,
        name: msg.name as string | undefined,
        toolCalls,
        toolCallId: msg.toolCallId as string | undefined,
      });
    }

    return messages;
  }

  /**
   * Parse tools list
   */
  private parseTools(rawTools?: Array<Record<string, unknown>>): Tool[] | null {
    if (!rawTools || !Array.isArray(rawTools)) return null;

    const tools: Tool[] = [];
    for (const tool of rawTools) {
      if (typeof tool !== 'object' || tool === null) continue;

      tools.push({
        type: (tool.type as string) || 'function',
        function: (tool.function as Tool['function']) || { name: '' },
      });
    }

    return tools.length > 0 ? tools : null;
  }

  /**
   * Format event stream as AG-UI SSE format
   */
  private async *formatStream(
    events: AsyncGenerator<AgentEvent>,
    context: { threadId: string; runId: string },
  ): AsyncGenerator<string> {
    const state = new StreamState();

    // Send RUN_STARTED
    yield this.encode({ type: AGUI_EVENT_TYPES.RUN_STARTED, ...context });

    for await (const event of events) {
      if (state.hasError) continue;

      if (event.event === EventType.ERROR) {
        state.hasError = true;
      }

      for (const aguiEvent of this.processEvent(event, context, state)) {
        yield this.encode(aguiEvent);
      }
    }

    // Don't send cleanup events after error
    if (state.hasError) return;

    // End all open tool calls
    for (const event of state.endAllToolCalls()) {
      yield this.encode(event);
    }

    // End text if open
    for (const event of state.endTextIfOpen()) {
      yield this.encode(event);
    }

    // Send RUN_FINISHED
    yield this.encode({ type: AGUI_EVENT_TYPES.RUN_FINISHED, ...context });
  }

  /**
   * Process single event and yield AG-UI events
   */
  private *processEvent(
    event: AgentEvent,
    context: { threadId: string; runId: string },
    state: StreamState,
  ): Generator<Record<string, unknown>> {
    // RAW event: yield raw data directly (handled specially in encode)
    if (event.event === EventType.RAW) {
      const raw = event.data?.raw as string;
      if (raw) {
        yield { __raw: raw };
      }
      return;
    }

    // TEXT event
    if (event.event === EventType.TEXT) {
      yield* state.endAllToolCalls();
      yield* state.ensureTextStarted();

      const aguiEvent: Record<string, unknown> = {
        type: AGUI_EVENT_TYPES.TEXT_MESSAGE_CONTENT,
        messageId: state.text.messageId,
        delta: (event.data?.delta as string) || '',
      };

      if (event.addition) {
        yield this.applyAddition(
          aguiEvent,
          event.addition,
          event.additionMergeOptions,
        );
      } else {
        yield aguiEvent;
      }
      return;
    }

    // TOOL_CALL_CHUNK event
    if (event.event === EventType.TOOL_CALL_CHUNK) {
      const toolId = (event.data?.id as string) || '';
      const toolName = (event.data?.name as string) || '';

      yield* state.endTextIfOpen();

      // Check if need to start new tool call
      const currentState = state.toolCalls.get(toolId);
      if (toolId && (!currentState || currentState.ended)) {
        yield {
          type: AGUI_EVENT_TYPES.TOOL_CALL_START,
          toolCallId: toolId,
          toolCallName: toolName,
        };
        state.toolCalls.set(toolId, {
          name: toolName,
          started: true,
          ended: false,
          hasResult: false,
          isHitl: false,
        });
      }

      yield {
        type: AGUI_EVENT_TYPES.TOOL_CALL_ARGS,
        toolCallId: toolId,
        delta:
          (event.data?.args_delta as string) ||
          (event.data?.argsDelta as string) ||
          '',
      };
      return;
    }

    // TOOL_CALL event (complete)
    if (event.event === EventType.TOOL_CALL) {
      const toolId = (event.data?.id as string) || '';
      const toolName = (event.data?.name as string) || '';
      const toolArgs = (event.data?.args as string) || '';

      yield* state.endTextIfOpen();

      const currentState = state.toolCalls.get(toolId);
      if (toolId && (!currentState || currentState.ended)) {
        yield {
          type: AGUI_EVENT_TYPES.TOOL_CALL_START,
          toolCallId: toolId,
          toolCallName: toolName,
        };
        state.toolCalls.set(toolId, {
          name: toolName,
          started: true,
          ended: false,
          hasResult: false,
          isHitl: false,
        });
      }

      if (toolArgs) {
        yield {
          type: AGUI_EVENT_TYPES.TOOL_CALL_ARGS,
          toolCallId: toolId,
          delta: toolArgs,
        };
      }
      return;
    }

    // TOOL_RESULT_CHUNK event
    if (event.event === EventType.TOOL_RESULT_CHUNK) {
      const toolId = (event.data?.id as string) || '';
      const delta = (event.data?.delta as string) || '';
      state.cacheToolResultChunk(toolId, delta);
      return;
    }

    // HITL event (Human-in-the-Loop)
    if (event.event === EventType.HITL) {
      const hitlId = (event.data?.id as string) || '';
      const toolCallId =
        (event.data?.tool_call_id as string) ||
        (event.data?.toolCallId as string) ||
        '';
      const hitlType = (event.data?.type as string) || 'confirmation';
      const prompt = (event.data?.prompt as string) || '';

      yield* state.endTextIfOpen();

      // If tool_call_id exists and tool is tracked
      if (toolCallId && state.toolCalls.has(toolCallId)) {
        const toolState = state.toolCalls.get(toolCallId)!;
        if (toolState.started && !toolState.ended) {
          yield { type: AGUI_EVENT_TYPES.TOOL_CALL_END, toolCallId };
          toolState.ended = true;
        }
        toolState.isHitl = true;
        toolState.hasResult = false;
        return;
      }

      // Create independent HITL tool call
      const argsDict: Record<string, unknown> = { type: hitlType, prompt };
      if (event.data?.options) argsDict.options = event.data.options;
      if (event.data?.default !== undefined)
        argsDict.default = event.data.default;
      if (event.data?.timeout !== undefined)
        argsDict.timeout = event.data.timeout;
      if (event.data?.schema) argsDict.schema = event.data.schema;

      const actualId = toolCallId || hitlId;

      yield {
        type: AGUI_EVENT_TYPES.TOOL_CALL_START,
        toolCallId: actualId,
        toolCallName: `hitl_${hitlType}`,
      };
      yield {
        type: AGUI_EVENT_TYPES.TOOL_CALL_ARGS,
        toolCallId: actualId,
        delta: JSON.stringify(argsDict),
      };
      yield { type: AGUI_EVENT_TYPES.TOOL_CALL_END, toolCallId: actualId };

      state.toolCalls.set(actualId, {
        name: `hitl_${hitlType}`,
        started: true,
        ended: true,
        hasResult: false,
        isHitl: true,
      });
      return;
    }

    // TOOL_RESULT event
    if (event.event === EventType.TOOL_RESULT) {
      const toolId = (event.data?.id as string) || '';
      const toolName = (event.data?.name as string) || '';

      yield* state.endTextIfOpen();

      let toolState = state.toolCalls.get(toolId);
      if (toolId && !toolState) {
        yield {
          type: AGUI_EVENT_TYPES.TOOL_CALL_START,
          toolCallId: toolId,
          toolCallName: toolName,
        };
        toolState = {
          name: toolName,
          started: true,
          ended: false,
          hasResult: false,
          isHitl: false,
        };
        state.toolCalls.set(toolId, toolState);
      }

      if (toolState && toolState.started && !toolState.ended) {
        yield { type: AGUI_EVENT_TYPES.TOOL_CALL_END, toolCallId: toolId };
        toolState.ended = true;
      }

      let finalResult =
        ((event.data?.content as string) || (event.data?.result as string)) ??
        '';
      if (toolId) {
        const cachedChunks = state.popToolResultChunks(toolId);
        if (cachedChunks) {
          finalResult = cachedChunks + finalResult;
        }
      }

      yield {
        type: AGUI_EVENT_TYPES.TOOL_CALL_RESULT,
        messageId:
          (event.data?.message_id as string) ||
          (event.data?.messageId as string) ||
          `tool-result-${toolId}`,
        toolCallId: toolId,
        content: finalResult,
        role: 'tool',
      };
      return;
    }

    // ERROR event
    if (event.event === EventType.ERROR) {
      yield {
        type: AGUI_EVENT_TYPES.RUN_ERROR,
        message: (event.data?.message as string) || '',
        code: event.data?.code,
      };
      return;
    }

    // STATE event
    if (event.event === EventType.STATE) {
      if ('snapshot' in (event.data || {})) {
        yield {
          type: AGUI_EVENT_TYPES.STATE_SNAPSHOT,
          snapshot: event.data?.snapshot || {},
        };
      } else if ('delta' in (event.data || {})) {
        yield {
          type: AGUI_EVENT_TYPES.STATE_DELTA,
          delta: event.data?.delta || [],
        };
      } else {
        yield {
          type: AGUI_EVENT_TYPES.STATE_SNAPSHOT,
          snapshot: event.data || {},
        };
      }
      return;
    }

    // CUSTOM event
    if (event.event === EventType.CUSTOM) {
      yield {
        type: AGUI_EVENT_TYPES.CUSTOM,
        name: (event.data?.name as string) || 'custom',
        value: event.data?.value,
      };
      return;
    }

    // Unknown event type - convert to CUSTOM
    yield {
      type: AGUI_EVENT_TYPES.CUSTOM,
      name: event.event || 'unknown',
      value: event.data,
    };
  }

  /**
   * Encode event to SSE format
   */
  private encode(event: Record<string, unknown>): string {
    // Handle raw data passthrough
    if ('__raw' in event) {
      const raw = event.__raw as string;
      return raw.endsWith('\n\n') ? raw : raw.replace(/\n+$/, '') + '\n\n';
    }
    return `data: ${JSON.stringify(event)}\n\n`;
  }

  /**
   * Apply addition fields
   */
  private applyAddition(
    eventData: Record<string, unknown>,
    addition: Record<string, unknown>,
    mergeOptions?: MergeOptions,
  ): Record<string, unknown> {
    if (!addition) return eventData;

    const result = { ...eventData };
    for (const [key, value] of Object.entries(addition)) {
      if (mergeOptions?.noNewField && !(key in eventData)) continue;
      result[key] = value;
    }
    return result;
  }

  /**
   * Generate error stream
   */
  private async *errorStream(message: string): AsyncGenerator<string> {
    const threadId = uuidv4();
    const runId = uuidv4();

    yield this.encode({ type: AGUI_EVENT_TYPES.RUN_STARTED, threadId, runId });
    yield this.encode({
      type: AGUI_EVENT_TYPES.RUN_ERROR,
      message,
      code: 'REQUEST_ERROR',
    });
  }
}
