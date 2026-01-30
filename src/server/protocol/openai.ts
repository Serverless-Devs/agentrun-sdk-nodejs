/**
 * OpenAI Protocol Handler
 *
 * Implements OpenAI Chat Completions API compatible protocol.
 * Supports both streaming (SSE) and non-streaming responses.
 */

import type { AgentInvoker } from '../core/invoker';
import {
  AgentEvent,
  AgentRequest,
  EventType,
  Message,
  MessageRole,
  OpenAIProtocolConfig,
  ProtocolRequest,
  ProtocolResponse,
  Tool,
  ToolCall,
} from '../core/model';
import { ProtocolHandler, RouteDefinition } from './base';

/**
 * OpenAI Protocol Handler
 */
export class OpenAIProtocolHandler extends ProtocolHandler {
  readonly name = 'openai';

  constructor(private config?: OpenAIProtocolConfig) {
    super();
  }

  getPrefix(): string {
    return this.config?.prefix ?? '/openai/v1';
  }

  getRoutes(): RouteDefinition[] {
    return [
      {
        method: 'POST',
        path: '/chat/completions',
        handler: this.handleChatCompletions.bind(this),
      },
      {
        method: 'GET',
        path: '/models',
        handler: this.handleListModels.bind(this),
      },
    ];
  }

  /**
   * Handle POST /chat/completions
   */
  private async handleChatCompletions(
    req: ProtocolRequest,
    invoker: AgentInvoker,
  ): Promise<ProtocolResponse> {
    try {
      const { agentRequest, context } = this.parseRequest(req.body);

      if (agentRequest.stream) {
        return {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
          body: this.formatStream(invoker.invoke(agentRequest), context),
        };
      }

      // Non-streaming response
      const events: AgentEvent[] = [];
      for await (const event of invoker.invoke(agentRequest)) {
        events.push(event);
      }

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.formatNonStream(events, context)),
      };
    } catch (error) {
      return this.createErrorResponse(error, 400);
    }
  }

  /**
   * Handle GET /models
   */
  private async handleListModels(): Promise<ProtocolResponse> {
    const modelName = this.config?.modelName ?? 'agentrun';
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'list',
        data: [
          {
            id: modelName,
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'agentrun',
          },
        ],
      }),
    };
  }

  /**
   * Parse OpenAI format request to AgentRequest
   */
  private parseRequest(body: Record<string, unknown>): {
    agentRequest: AgentRequest;
    context: { id: string; model: string; created: number };
  } {
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new Error('Missing required field: messages');
    }

    const context = {
      id: `chatcmpl-${this.generateId()}`,
      model: (body.model as string) || this.config?.modelName || 'agentrun',
      created: Math.floor(Date.now() / 1000),
    };

    const messages = this.parseMessages(body.messages);
    const tools = this.parseTools(body.tools);

    const agentRequest: AgentRequest = {
      protocol: 'openai',
      messages,
      stream: (body.stream as boolean) ?? false,
      model: context.model,
      tools: tools || undefined,
      metadata: body.metadata as Record<string, unknown> | undefined,
    };

    return { agentRequest, context };
  }

  /**
   * Parse OpenAI messages to internal Message format
   */
  private parseMessages(messages: unknown[]): Message[] {
    return messages.map((m) => {
      const msg = m as Record<string, unknown>;
      return {
        id: msg.id as string | undefined,
        role: msg.role as MessageRole,
        content: msg.content as string | undefined,
        name: msg.name as string | undefined,
        toolCallId: msg.tool_call_id as string | undefined,
        toolCalls:
          msg.tool_calls ?
            (msg.tool_calls as unknown[]).map((tc) => {
              const call = tc as Record<string, unknown>;
              return {
                id: call.id as string,
                type: call.type as string | undefined,
                function: call.function as { name: string; arguments: string },
              };
            })
          : undefined,
      };
    });
  }

  /**
   * Parse OpenAI tools format
   */
  private parseTools(tools: unknown): Tool[] | null {
    if (!tools || !Array.isArray(tools)) {
      return null;
    }

    return tools.map((t) => {
      const tool = t as Record<string, unknown>;
      return {
        type: (tool.type as string) || 'function',
        function: tool.function as Tool['function'],
      };
    });
  }

  /**
   * Format streaming response (SSE)
   */
  private async *formatStream(
    events: AsyncGenerator<AgentEvent>,
    context: { id: string; model: string; created: number },
  ): AsyncGenerator<string> {
    let sentRole = false;
    let hasText = false;
    let toolCallIndex = -1;
    const toolCallStates = new Map<
      string,
      { index: number; started: boolean }
    >();
    let hasToolCalls = false;

    for await (const event of events) {
      // Handle RAW event - pass through directly
      if (event.event === EventType.RAW) {
        const raw = event.data?.raw as string;
        if (raw) {
          yield raw.endsWith('\n\n') ? raw : raw.replace(/\n+$/, '') + '\n\n';
        }
        continue;
      }

      // Handle TEXT event
      if (event.event === EventType.TEXT) {
        const delta: Record<string, unknown> = {};

        if (!sentRole) {
          delta.role = 'assistant';
          sentRole = true;
        }

        const content = event.data?.delta as string;
        if (content) {
          delta.content = content;
          hasText = true;
        }

        yield this.buildChunk(context, { delta });
        continue;
      }

      // Handle TOOL_CALL_CHUNK event
      if (event.event === EventType.TOOL_CALL_CHUNK) {
        const toolId = event.data?.id as string;
        const toolName = event.data?.name as string;
        const argsDelta =
          (event.data?.args_delta as string) ||
          (event.data?.argsDelta as string);

        // First time seeing this tool call
        if (toolId && !toolCallStates.has(toolId)) {
          toolCallIndex++;
          toolCallStates.set(toolId, { index: toolCallIndex, started: true });
          hasToolCalls = true;

          // Send tool call start with id and name
          yield this.buildChunk(context, {
            delta: {
              tool_calls: [
                {
                  index: toolCallIndex,
                  id: toolId,
                  type: 'function',
                  function: { name: toolName || '', arguments: '' },
                },
              ],
            },
          });
        }

        // Send arguments delta
        if (argsDelta) {
          const state = toolCallStates.get(toolId);
          const currentIndex = state?.index ?? toolCallIndex;

          yield this.buildChunk(context, {
            delta: {
              tool_calls: [
                {
                  index: currentIndex,
                  function: { arguments: argsDelta },
                },
              ],
            },
          });
        }
        continue;
      }

      // Handle ERROR event
      if (event.event === EventType.ERROR) {
        yield this.buildChunk(context, {
          delta: {},
          finish_reason: 'error',
        });
        continue;
      }
    }

    // Send finish_reason
    const finishReason =
      hasToolCalls ? 'tool_calls'
      : hasText ? 'stop'
      : 'stop';
    yield this.buildChunk(context, { delta: {}, finish_reason: finishReason });

    // Send [DONE]
    yield 'data: [DONE]\n\n';
  }

  /**
   * Build SSE chunk
   */
  private buildChunk(
    context: { id: string; model: string; created: number },
    choice: {
      delta?: Record<string, unknown>;
      finish_reason?: string | null;
    },
  ): string {
    const chunk = {
      id: context.id,
      object: 'chat.completion.chunk',
      created: context.created,
      model: context.model,
      choices: [
        {
          index: 0,
          delta: choice.delta || {},
          finish_reason: choice.finish_reason ?? null,
        },
      ],
    };
    return `data: ${JSON.stringify(chunk)}\n\n`;
  }

  /**
   * Format non-streaming response
   */
  private formatNonStream(
    events: AgentEvent[],
    context: { id: string; model: string; created: number },
  ): Record<string, unknown> {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const event of events) {
      if (event.event === EventType.TEXT) {
        content += (event.data?.delta as string) || '';
      } else if (event.event === EventType.TOOL_CALL_CHUNK) {
        const toolId = event.data?.id as string;
        const toolName = event.data?.name as string;
        const argsDelta =
          (event.data?.args_delta as string) ||
          (event.data?.argsDelta as string);

        // Find or create tool call
        let toolCall = toolCalls.find((tc) => tc.id === toolId);
        if (!toolCall && toolId) {
          toolCall = {
            id: toolId,
            type: 'function',
            function: { name: toolName || '', arguments: '' },
          };
          toolCalls.push(toolCall);
        }

        // Append arguments
        if (toolCall && argsDelta) {
          toolCall.function.arguments += argsDelta;
        }
      }
    }

    const message: Record<string, unknown> = {
      role: 'assistant',
      content: content || null,
    };

    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls.map((tc, idx) => ({
        index: idx,
        id: tc.id,
        type: tc.type,
        function: tc.function,
      }));
    }

    return {
      id: context.id,
      object: 'chat.completion',
      created: context.created,
      model: context.model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
