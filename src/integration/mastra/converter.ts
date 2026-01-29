/**
 * Mastra Event Converter
 * Mastra 事件转换器
 *
 * Converts Mastra stream events (ChunkType) to AgentRun events (AgentEventItem).
 * 将 Mastra 流式事件（ChunkType）转换为 AgentRun 事件（AgentEventItem）。
 *
 * @example
 * ```typescript
 * import { MastraConverter } from '@alicloud/agentrun-sdk/integration/mastra';
 * import { Agent } from '@mastra/core/agent';
 *
 * const agent = new Agent({...});
 * const converter = new MastraConverter();
 *
 * async function* invokeAgent(request: AgentRequest) {
 *   const mastraStream = await agent.stream(request.messages);
 *
 *   for await (const chunk of mastraStream.fullStream) {
 *     const events = converter.convert(chunk);
 *     for (const event of events) {
 *       yield event;
 *     }
 *   }
 * }
 * ```
 */

import { EventType, type AgentEvent } from '@/server/core/model';
import { type ChunkType } from '@mastra/core/stream';
import { logger } from '@/utils/log';

// Mastra ChunkType definition
// We define a minimal interface here to avoid direct dependency on @mastra/core
// Users should have @mastra/core installed separately
interface MastraChunkBase {
  type: string;
  runId: string;
  from: string;
  payload?: Record<string, unknown>;
}

/**
 * Agent event item - can be a string (text) or AgentEvent (structured event)
 * Agent 事件项 - 可以是字符串（文本）或 AgentEvent（结构化事件）
 */
export type AgentEventItem = string | AgentEvent;

/**
 * Mastra Event Converter
 * Mastra 事件转换器
 *
 * Converts Mastra stream chunk events to AgentRun standard events.
 * Supports text streaming, tool calls, and error handling.
 *
 * 将 Mastra 流式 chunk 事件转换为 AgentRun 标准事件。
 * 支持文本流式输出、工具调用和错误处理。
 */
export class MastraConverter {
  /**
   * Convert a single Mastra chunk to AgentRun events
   * 转换单个 Mastra chunk 为 AgentRun 事件
   *
   * @param chunk - Mastra stream chunk
   * @returns Generator of AgentEventItem (strings or AgentEvents)
   *
   * @example
   * ```typescript
   * const converter = new MastraConverter();
   * for await (const chunk of mastraStream.fullStream) {
   *   const events = converter.convert(chunk);
   *   for (const event of events) {
   *     yield event;
   *   }
   * }
   * ```
   */

  *convert<T extends ChunkType<U>, U = undefined>(
    chunk: T,
  ): Generator<AgentEventItem> {
    logger.debug(`[MastraConverter] Processing chunk type: ${chunk.type}`);

    // Handle text delta - direct text output
    if (chunk.type === 'text-delta') {
      const text = this.extractTextFromPayload(chunk.payload);
      if (text) {
        yield text;
      }
      return;
    }

    // Handle tool call
    if (chunk.type === 'tool-call') {
      const toolCall = this.extractToolCallFromPayload(chunk.payload);
      if (toolCall) {
        yield {
          event: EventType.TOOL_CALL_CHUNK,
          data: {
            id: toolCall.id,
            name: toolCall.name,
            args_delta: toolCall.args,
          },
        };
      }
      return;
    }

    // Handle tool result
    if (chunk.type === 'tool-result') {
      const toolResult = this.extractToolResultFromPayload(chunk.payload);
      if (toolResult) {
        yield {
          event: EventType.TOOL_RESULT,
          data: {
            id: toolResult.id,
            result: toolResult.result,
          },
        };
      }
      return;
    }

    // Handle error
    if (chunk.type === 'error') {
      const error = this.extractErrorFromPayload(chunk.payload);
      yield {
        event: EventType.ERROR,
        data: {
          error: error || 'Unknown error',
        },
      };
      return;
    }

    // Handle reasoning delta (optional - treat as text)
    if (chunk.type === 'reasoning-delta') {
      const text = this.extractTextFromPayload(chunk.payload);
      if (text) {
        // Optionally add a marker to distinguish reasoning from regular text
        yield `[Reasoning] ${text}`;
      }
      return;
    }

    // Handle finish - just log for debugging
    if (chunk.type === 'finish') {
      logger.debug('[MastraConverter] Received finish event');
      // Optionally yield finish information
      return;
    }

    // Handle step-start and step-finish for debugging
    if (chunk.type === 'step-start' || chunk.type === 'step-finish') {
      logger.debug(`[MastraConverter] ${chunk.type} event`);
      return;
    }

    // Log unsupported chunk types
    logger.debug(`[MastraConverter] Unsupported chunk type: ${chunk.type}`);
  }

  /**
   * Extract text content from chunk payload
   * 从 chunk payload 提取文本内容
   */
  private extractTextFromPayload(payload?: { text: string }): string | null {
    if (!payload) return null;

    // Mastra text-delta payload: { text: string, ... }
    if (typeof payload.text === 'string') {
      return payload.text;
    }

    return null;
  }

  /**
   * Extract tool call information from chunk payload
   * 从 chunk payload 提取工具调用信息
   */
  private extractToolCallFromPayload(payload?: {
    toolCallId: string;
    toolName: string;
    args?: any;
  }): {
    id: string;
    name: string;
    args: any;
  } | null {
    if (!payload) return null;

    // Mastra tool-call payload: { toolCallId, toolName, args, ... }
    const id = typeof payload.toolCallId === 'string' ? payload.toolCallId : '';
    const name = typeof payload.toolName === 'string' ? payload.toolName : '';
    const args = payload.args;

    if (!id || !name) {
      logger.warn('[MastraConverter] Invalid tool call payload', payload);
      return null;
    }

    // Format args as JSON string
    let argsStr = '';
    try {
      argsStr = typeof args === 'string' ? args : JSON.stringify(args || {});
    } catch (e) {
      logger.warn('[MastraConverter] Failed to stringify tool args', e);
      argsStr = String(args);
    }

    return { id, name, args: argsStr };
  }

  /**
   * Extract tool result information from chunk payload
   * 从 chunk payload 提取工具结果信息
   */
  private extractToolResultFromPayload(payload?: {
    result: any;
    toolCallId: string;
  }): {
    id: string;
    result: string;
  } | null {
    if (!payload) return null;

    // Mastra tool-result payload: { toolCallId, result, ... }
    const id = typeof payload.toolCallId === 'string' ? payload.toolCallId : '';
    const result = payload.result;

    if (!id) {
      logger.warn('[MastraConverter] Invalid tool result payload', payload);
      return null;
    }

    // Format result as string
    let resultStr = '';
    try {
      resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    } catch (e) {
      logger.warn('[MastraConverter] Failed to stringify tool result', e);
      resultStr = String(result);
    }

    return { id, result: resultStr };
  }

  /**
   * Extract error message from chunk payload
   * 从 chunk payload 提取错误信息
   */
  private extractErrorFromPayload(
    payload?: Record<string, unknown>,
  ): string | null {
    if (!payload) return null;

    // Mastra error payload: { error: string | Error, ... }
    const error = payload.error;

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }

    return JSON.stringify(error);
  }
}
