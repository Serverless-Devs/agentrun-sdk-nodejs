/**
 * Agent Invoker
 *
 * Unified agent invocation handler that normalizes all return types
 * to AsyncGenerator<AgentEvent>.
 */

import { AgentEvent, AgentRequest, EventType, InvokeOptions } from './model';

/**
 * Agent invoke handler type
 *
 * Supports multiple return types:
 * - string: Simple text response
 * - AgentEvent: Single event
 * - Promise<string | AgentEvent>: Async single response
 * - AsyncIterable<string | AgentEvent>: Streaming response
 */
export type InvokeAgentHandler = (
  request: AgentRequest
) => string | AgentEvent | Promise<string | AgentEvent> | AsyncIterable<string | AgentEvent>;

/**
 * Agent Invoker
 *
 * Responsibilities:
 * 1. Call user's invoke_agent function
 * 2. Normalize all return types to AsyncGenerator<AgentEvent>
 * 3. Auto-convert string → AgentEvent(TEXT)
 * 4. Expand TOOL_CALL → TOOL_CALL_CHUNK
 * 5. Handle errors gracefully
 */
export class AgentInvoker {
  constructor(private handler: InvokeAgentHandler) {}

  /**
   * Invoke agent and return streaming result
   * Always returns AsyncGenerator<AgentEvent>
   */
  async *invoke(request: AgentRequest, options?: InvokeOptions): AsyncGenerator<AgentEvent> {
    try {
      const result = await Promise.resolve(this.handler(request));

      // Check abort signal
      if (options?.signal?.aborted) {
        yield this.createErrorEvent(new Error('Request aborted'));
        return;
      }

      // Normalize based on return type
      if (this.isAsyncIterable(result)) {
        yield* this.processAsyncIterable(result as AsyncIterable<string | AgentEvent>, options);
      } else if (typeof result === 'string') {
        yield { event: EventType.TEXT, data: { delta: result } };
      } else {
        yield* this.processEvent(result as AgentEvent);
      }
    } catch (error) {
      yield this.createErrorEvent(error);
    }
  }

  /**
   * Process async iterable stream
   */
  private async *processAsyncIterable(
    stream: AsyncIterable<string | AgentEvent>,
    options?: InvokeOptions
  ): AsyncGenerator<AgentEvent> {
    try {
      for await (const item of stream) {
        // Check abort signal
        if (options?.signal?.aborted) {
          yield this.createErrorEvent(new Error('Request aborted'));
          return;
        }

        if (typeof item === 'string') {
          if (item) {
            yield { event: EventType.TEXT, data: { delta: item } };
          }
        } else {
          yield* this.processEvent(item);
        }
      }
    } catch (error) {
      yield this.createErrorEvent(error);
    }
  }

  /**
   * Process single event
   * Expands TOOL_CALL → TOOL_CALL_CHUNK
   */
  private *processEvent(event: AgentEvent): Generator<AgentEvent> {
    if (event.event === EventType.TOOL_CALL) {
      // Expand TOOL_CALL to TOOL_CALL_CHUNK for streaming compatibility
      yield {
        event: EventType.TOOL_CALL_CHUNK,
        data: {
          id: event.data?.id,
          name: event.data?.name,
          args_delta: (event.data?.args as string) || '',
        },
        addition: event.addition,
        additionMergeOptions: event.additionMergeOptions,
      };
    } else {
      yield event;
    }
  }

  /**
   * Create error event from exception
   */
  private createErrorEvent(error: unknown): AgentEvent {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof Error ? error.name : 'UnknownError';
    return {
      event: EventType.ERROR,
      data: { message, code },
    };
  }

  /**
   * Check if value is async iterable
   */
  private isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
    return value !== null && typeof value === 'object' && Symbol.asyncIterator in value;
  }
}
