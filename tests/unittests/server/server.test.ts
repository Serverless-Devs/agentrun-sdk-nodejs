/**
 * Server Tests
 *
 * 测试 AgentRunServer 的各种功能。
 */


import * as http from 'http';

import { AgentRunServer, AgentResult, EventType } from '../../../src/server';

describe('AgentRunServer', () => {
  let server: AgentRunServer | null = null;
  let testPort: number;

  beforeEach(() => {
    // Use random port for each test to avoid conflicts
    testPort = 10000 + Math.floor(Math.random() * 50000);
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
    // Wait a bit for port to be released
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe('start/stop', () => {
    it('should start and stop the server', async () => {
      const testServer = new AgentRunServer({
        invokeAgent: async () => 'Hello, world!',
      });

      // Start server
      testServer.start({ host: '127.0.0.1', port: testPort });

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Stop server
      await testServer.stop();

      // Don't set server variable so afterEach won't try to stop it again
    });
  });

  describe('health check', () => {
    it('should respond to health check', async () => {
      server = new AgentRunServer({
        invokeAgent: async () => 'Hello, world!',
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Make health check request
      const response = await makeRequest('GET', `http://localhost:${testPort}/health`);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
  });

  describe('chat completions', () => {
    it('should handle non-streaming request', async () => {
      server = new AgentRunServer({
        invokeAgent: async (request) => {
          return `You said: ${request.messages[0]?.content}`;
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest(
        'POST',
        `http://localhost:${testPort}/openai/v1/chat/completions`,
        {
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
        },
      );

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.choices[0].message.content).toBe('You said: Hello');
      expect(data.choices[0].message.role).toBe('assistant');
      expect(data.choices[0].finish_reason).toBe('stop');
      expect(data.object).toBe('chat.completion');
    });

    it('should handle streaming request', async () => {
      server = new AgentRunServer({
        invokeAgent: async function* () {
          yield 'Hello, ';
          yield 'world!';
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest(
        'POST',
        `http://localhost:${testPort}/openai/v1/chat/completions`,
        {
          messages: [{ role: 'user', content: 'Hi' }],
          stream: true,
        },
      );

      expect(response.statusCode).toBe(200);

      // Parse SSE response
      const events = response.body
        .split('\n\n')
        .filter((line: string) => line.startsWith('data: '))
        .map((line: string) => line.replace('data: ', ''));

      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1]).toBe('[DONE]');
    });

    it('should handle streaming response with multiple chunks', async () => {
      server = new AgentRunServer({
        invokeAgent: async function* () {
          yield 'Hello, ';
          yield 'this is ';
          yield 'a test.';
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest(
        'POST',
        `http://localhost:${testPort}/openai/v1/chat/completions`,
        {
          messages: [{ role: 'user', content: 'Hi' }],
          stream: true,
          model: 'test-model',
        },
      );

      expect(response.statusCode).toBe(200);

      // Parse SSE response
      const events = response.body
        .split('\n\n')
        .filter((line: string) => line.startsWith('data: ') && line !== 'data: [DONE]')
        .map((line: string) => JSON.parse(line.replace('data: ', '')));

      // Should have 3 content chunks + 1 finish chunk = 4 events
      expect(events.length).toBe(4);

      // All chunks should have the same ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ids = events.map((e: any) => e.id);
      expect(new Set(ids).size).toBe(1);

      // Verify content chunks (first 3 events)
      expect(events[0].choices[0].delta.content).toBe('Hello, ');
      expect(events[1].choices[0].delta.content).toBe('this is ');
      expect(events[2].choices[0].delta.content).toBe('a test.');
      expect(events[0].model).toBe('test-model');
    });

    it('should handle multiple messages in request', async () => {
      server = new AgentRunServer({
        invokeAgent: async (request) => {
          const lastMessage = request.messages[request.messages.length - 1];
          return `Last message: ${lastMessage?.content}`;
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest(
        'POST',
        `http://localhost:${testPort}/openai/v1/chat/completions`,
        {
          messages: [
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'Response to first' },
            { role: 'user', content: 'Second message' },
          ],
          stream: false,
        },
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.choices[0].message.content).toBe('Last message: Second message');
    });

    it('should parse message roles correctly', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedRequest: any = null;

      server = new AgentRunServer({
        invokeAgent: async (request) => {
          capturedRequest = request;
          return 'OK';
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      await makeRequest('POST', `http://localhost:${testPort}/openai/v1/chat/completions`, {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'tool', content: 'Tool result', tool_call_id: 'call-1' },
        ],
        stream: false,
      });

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest.messages).toHaveLength(4);
      expect(capturedRequest.messages[0].role).toBe('system');
      expect(capturedRequest.messages[1].role).toBe('user');
      expect(capturedRequest.messages[2].role).toBe('assistant');
      expect(capturedRequest.messages[3].role).toBe('tool');
      expect(capturedRequest.messages[3].toolCallId).toBe('call-1');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      server = new AgentRunServer({
        invokeAgent: async () => 'Hello',
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest('GET', `http://localhost:${testPort}/unknown`);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS preflight request', async () => {
      server = new AgentRunServer({
        invokeAgent: async () => 'Hello',
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest(
        'OPTIONS',
        `http://localhost:${testPort}/openai/v1/chat/completions`,
      );

      // OPTIONS should return 204 No Content
      expect(response.statusCode).toBe(204);
    });
  });

  describe('non-streaming AgentResult', () => {
    it('should handle AgentResult object', async () => {
      server = new AgentRunServer({
        invokeAgent: async (): Promise<AgentResult> => {
          return {
            event: EventType.TEXT,
            data: { delta: 'Test response' }  // Should use 'delta' field, not 'content'
          };
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest(
        'POST',
        `http://localhost:${testPort}/openai/v1/chat/completions`,
        {
          messages: [{ role: 'user', content: 'Test' }],
          stream: false,
        },
      );

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.choices[0].message.content).toBe('Test response');
    });
  });

  describe('empty and null handling', () => {
    it('should handle empty messages array', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedRequest: any = null;

      server = new AgentRunServer({
        invokeAgent: async (request) => {
          capturedRequest = request;
          return 'OK';
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest(
        'POST',
        `http://localhost:${testPort}/openai/v1/chat/completions`,
        {
          messages: [],
          stream: false,
        },
      );

      expect(response.statusCode).toBe(200);
      expect(capturedRequest.messages).toHaveLength(0);
    });
  });

  describe('model and metadata', () => {
    it('should pass model and metadata to invoke handler', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedRequest: any = null;

      server = new AgentRunServer({
        invokeAgent: async (request) => {
          capturedRequest = request;
          return 'OK';
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      await makeRequest('POST', `http://localhost:${testPort}/openai/v1/chat/completions`, {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'custom-model',
        metadata: { key: 'value' },
        stream: false,
      });

      expect(capturedRequest.model).toBe('custom-model');
      expect(capturedRequest.metadata).toEqual({ key: 'value' });
    });

    it('should include model in response', async () => {
      server = new AgentRunServer({
        invokeAgent: async () => 'OK',
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest(
        'POST',
        `http://localhost:${testPort}/openai/v1/chat/completions`,
        {
          messages: [{ role: 'user', content: 'Test' }],
          model: 'my-agent',
          stream: false,
        },
      );

      const data = JSON.parse(response.body);
      expect(data.model).toBe('my-agent');
    });

    it('should handle OpenAI tool calls', async () => {
      const { EventType } = await import('../../../src/server');

      server = new AgentRunServer({
        invokeAgent: async function* () {
          // Use TOOL_CALL_CHUNK for streaming (not TOOL_CALL)
          yield {
            event: EventType.TOOL_CALL_CHUNK,
            data: {
              id: 'tc-1',
              name: 'weather_tool',
              args_delta: '{"location": "Beijing"}',
            },
          };
          yield {
            event: EventType.TOOL_RESULT,
            data: { id: 'tc-1', result: 'Sunny, 25°C' },
          };
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeRequest(
        'POST',
        `http://localhost:${testPort}/openai/v1/chat/completions`,
        {
          messages: [{ role: 'user', content: "What's the weather?" }],
          stream: true,
        },
      );

      expect(response.statusCode).toBe(200);

      // Parse SSE events
      const chunks = response.body
        .split('\n\n')
        .filter((line) => line.startsWith('data: ') && !line.includes('[DONE]'))
        .map((line) => JSON.parse(line.substring(6)));

      // OpenAI format: In TypeScript implementation, tool call info is split into chunks
      // First chunk has id + name + empty args, second chunk has args_delta
      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // First chunk contains tool call id and name (with empty arguments)
      const firstChunk = chunks[0];
      expect(firstChunk.object).toBe('chat.completion.chunk');
      expect(firstChunk.choices[0].delta.tool_calls).toBeDefined();
      expect(firstChunk.choices[0].delta.tool_calls[0].type).toBe('function');
      expect(firstChunk.choices[0].delta.tool_calls[0].function.name).toBe(
        'weather_tool',
      );
      expect(firstChunk.choices[0].delta.tool_calls[0].id).toBe('tc-1');
      expect(firstChunk.choices[0].delta.tool_calls[0].function.arguments).toBe('');

      // Second chunk contains the arguments
      const secondChunk = chunks[1];
      expect(secondChunk.choices[0].delta.tool_calls).toBeDefined();
      expect(secondChunk.choices[0].delta.tool_calls[0].function.arguments).toBe(
        '{"location": "Beijing"}',
      );

      // Verify no finish_reason in first chunk
      expect(firstChunk.choices[0].finish_reason).toBeNull();
    });
  });

  describe('AG-UI protocol', () => {
    it('should handle non-streaming AG-UI request', async () => {
      server = new AgentRunServer({
        invokeAgent: async (request) => {
          const userMessage = request.messages[0]?.content || 'Hello';
          return `You said: ${userMessage}`;
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeStreamingRequest(
        'POST',
        `http://localhost:${testPort}/ag-ui/agent`,
        {
          messages: [{ role: 'user', content: 'AgentRun' }],
        },
      );

      expect(response.statusCode).toBe(200);

      // Parse SSE events
      const events = response.body
        .split('\n\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.substring(6)));

      // AG-UI always returns streaming: RUN_STARTED + TEXT_MESSAGE_START + TEXT_MESSAGE_CONTENT + TEXT_MESSAGE_END + RUN_FINISHED
      expect(events.length).toBe(5);

      // Validate event sequence
      expect(events[0].type).toBe('RUN_STARTED');
      expect(events[0].threadId).toBeDefined();
      expect(events[0].runId).toBeDefined();

      expect(events[1].type).toBe('TEXT_MESSAGE_START');
      expect(events[1].messageId).toBeDefined();
      expect(events[1].role).toBe('assistant');

      expect(events[2].type).toBe('TEXT_MESSAGE_CONTENT');
      expect(events[2].messageId).toBe(events[1].messageId);
      expect(events[2].delta).toBe('You said: AgentRun');

      expect(events[3].type).toBe('TEXT_MESSAGE_END');
      expect(events[3].messageId).toBe(events[1].messageId);

      expect(events[4].type).toBe('RUN_FINISHED');
      expect(events[4].threadId).toBe(events[0].threadId);
      expect(events[4].runId).toBe(events[0].runId);
    });

    it('should handle streaming AG-UI request', async () => {
      server = new AgentRunServer({
        invokeAgent: async function* () {
          yield 'Hello, ';
          yield 'this is ';
          yield 'a test.';
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeStreamingRequest(
        'POST',
        `http://localhost:${testPort}/ag-ui/agent`,
        {
          messages: [{ role: 'user', content: 'Test' }],
        },
      );

      expect(response.statusCode).toBe(200);

      // Parse SSE events
      const events = response.body
        .split('\n\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.substring(6)));

      // RUN_STARTED + TEXT_MESSAGE_START + 3x TEXT_MESSAGE_CONTENT + TEXT_MESSAGE_END + RUN_FINISHED
      expect(events.length).toBe(7);

      expect(events[0].type).toBe('RUN_STARTED');
      expect(events[1].type).toBe('TEXT_MESSAGE_START');
      expect(events[2].type).toBe('TEXT_MESSAGE_CONTENT');
      expect(events[2].delta).toBe('Hello, ');
      expect(events[3].type).toBe('TEXT_MESSAGE_CONTENT');
      expect(events[3].delta).toBe('this is ');
      expect(events[4].type).toBe('TEXT_MESSAGE_CONTENT');
      expect(events[4].delta).toBe('a test.');
      expect(events[5].type).toBe('TEXT_MESSAGE_END');
      expect(events[6].type).toBe('RUN_FINISHED');
    });

    it('should handle AG-UI tool calls', async () => {
      const { EventType } = await import('../../../src/server');

      server = new AgentRunServer({
        invokeAgent: async function* () {
          yield {
            event: EventType.TOOL_CALL,
            data: {
              id: 'tc-1',
              name: 'weather_tool',
              args: '{"location": "Beijing"}',
            },
          };
          yield {
            event: EventType.TOOL_RESULT,
            data: { id: 'tc-1', result: 'Sunny, 25°C' },
          };
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeStreamingRequest(
        'POST',
        `http://localhost:${testPort}/ag-ui/agent`,
        {
          messages: [{ role: 'user', content: "What's the weather?" }],
        },
      );

      expect(response.statusCode).toBe(200);

      // Parse SSE events
      const events = response.body
        .split('\n\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.substring(6)));

      // RUN_STARTED + TOOL_CALL_START + TOOL_CALL_ARGS + TOOL_CALL_END + TOOL_CALL_RESULT + RUN_FINISHED
      expect(events.length).toBe(6);

      expect(events[0].type).toBe('RUN_STARTED');
      expect(events[1].type).toBe('TOOL_CALL_START');
      expect(events[1].toolCallId).toBe('tc-1');
      expect(events[1].toolCallName).toBe('weather_tool');
      expect(events[2].type).toBe('TOOL_CALL_ARGS');
      expect(events[2].toolCallId).toBe('tc-1');
      expect(events[2].delta).toBe('{"location": "Beijing"}');
      expect(events[3].type).toBe('TOOL_CALL_END');
      expect(events[3].toolCallId).toBe('tc-1');
      expect(events[4].type).toBe('TOOL_CALL_RESULT');
      expect(events[4].toolCallId).toBe('tc-1');
      expect(events[4].content).toBe('Sunny, 25°C');
      expect(events[4].role).toBe('tool');
      expect(events[5].type).toBe('RUN_FINISHED');
    });

    it('should handle AG-UI text then tool call sequence', async () => {
      const { EventType } = await import('../../../src/server');

      server = new AgentRunServer({
        invokeAgent: async function* () {
          // First send text
          yield '思考中...';
          // Then send tool call
          yield {
            event: EventType.TOOL_CALL,
            data: {
              id: 'tc-1',
              name: 'search_tool',
              args: '{"query": "test"}',
            },
          };
          yield {
            event: EventType.TOOL_RESULT,
            data: { id: 'tc-1', result: '搜索结果' },
          };
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeStreamingRequest(
        'POST',
        `http://localhost:${testPort}/ag-ui/agent`,
        {
          messages: [{ role: 'user', content: '搜索一下' }],
        },
      );

      expect(response.statusCode).toBe(200);

      // Parse SSE events
      const events = response.body
        .split('\n\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.substring(6)));

      // Expected sequence: RUN_STARTED → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT →
      // TEXT_MESSAGE_END → TOOL_CALL_START → TOOL_CALL_ARGS → TOOL_CALL_END →
      // TOOL_CALL_RESULT → RUN_FINISHED
      expect(events.length).toBe(9);

      expect(events[0].type).toBe('RUN_STARTED');
      expect(events[1].type).toBe('TEXT_MESSAGE_START');
      expect(events[2].type).toBe('TEXT_MESSAGE_CONTENT');
      expect(events[2].delta).toBe('思考中...');
      expect(events[3].type).toBe('TEXT_MESSAGE_END'); // Must come before TOOL_CALL_START
      expect(events[4].type).toBe('TOOL_CALL_START');
      expect(events[4].toolCallName).toBe('search_tool');
      expect(events[5].type).toBe('TOOL_CALL_ARGS');
      expect(events[5].delta).toBe('{"query": "test"}');
      expect(events[6].type).toBe('TOOL_CALL_END');
      expect(events[7].type).toBe('TOOL_CALL_RESULT');
      expect(events[7].content).toBe('搜索结果');
      expect(events[8].type).toBe('RUN_FINISHED');

      // Validate ID consistency
      expect(events[0].threadId).toBeDefined();
      expect(events[0].threadId).toBe(events[8].threadId);
      expect(events[0].runId).toBeDefined();
      expect(events[0].runId).toBe(events[8].runId);
      expect(events[4].toolCallId).toBe('tc-1');
      expect(events[5].toolCallId).toBe('tc-1');
      expect(events[6].toolCallId).toBe('tc-1');
      expect(events[7].toolCallId).toBe('tc-1');
    });

    it('should handle AG-UI text-tool-text sequence', async () => {
      const { EventType } = await import('../../../src/server');

      server = new AgentRunServer({
        invokeAgent: async function* () {
          // First text
          yield '让我搜索一下...';
          // Tool call
          yield {
            event: EventType.TOOL_CALL,
            data: {
              id: 'tc-1',
              name: 'search',
              args: '{"q": "天气"}',
            },
          };
          yield {
            event: EventType.TOOL_RESULT,
            data: { id: 'tc-1', result: '晴天' },
          };
          // Second text after tool call
          yield '根据搜索结果，今天是晴天。';
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeStreamingRequest(
        'POST',
        `http://localhost:${testPort}/ag-ui/agent`,
        {
          messages: [{ role: 'user', content: '今天天气怎么样' }],
        },
      );

      expect(response.statusCode).toBe(200);

      // Parse SSE events
      const events = response.body
        .split('\n\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.substring(6)));

      // Expected sequence:
      // RUN_STARTED → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT → TEXT_MESSAGE_END →
      // TOOL_CALL_START → TOOL_CALL_ARGS → TOOL_CALL_END → TOOL_CALL_RESULT →
      // TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT → TEXT_MESSAGE_END → RUN_FINISHED
      expect(events.length).toBe(12);

      expect(events[0].type).toBe('RUN_STARTED');
      // First text message
      expect(events[1].type).toBe('TEXT_MESSAGE_START');
      expect(events[2].type).toBe('TEXT_MESSAGE_CONTENT');
      expect(events[2].delta).toBe('让我搜索一下...');
      expect(events[3].type).toBe('TEXT_MESSAGE_END');
      // Tool call
      expect(events[4].type).toBe('TOOL_CALL_START');
      expect(events[4].toolCallName).toBe('search');
      expect(events[5].type).toBe('TOOL_CALL_ARGS');
      expect(events[6].type).toBe('TOOL_CALL_END');
      expect(events[7].type).toBe('TOOL_CALL_RESULT');
      // Second text message after tool call
      expect(events[8].type).toBe('TEXT_MESSAGE_START');
      expect(events[9].type).toBe('TEXT_MESSAGE_CONTENT');
      expect(events[9].delta).toBe('根据搜索结果，今天是晴天。');
      expect(events[10].type).toBe('TEXT_MESSAGE_END');
      expect(events[11].type).toBe('RUN_FINISHED');

      // Validate different message IDs for two text messages
      expect(events[1].messageId).toBeDefined();
      expect(events[8].messageId).toBeDefined();
      expect(events[1].messageId).not.toBe(events[8].messageId);
    });

    it('should support addition field merge in AG-UI protocol', async () => {
      const { EventType } = await import('../../../src/server');

      server = new AgentRunServer({
        invokeAgent: async function* () {
          yield {
            event: EventType.TEXT,
            data: { message_id: 'msg_1', delta: 'Hello' },
            addition: {
              model: 'custom_model',
              custom_field: 'custom_value',
            },
          };
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeStreamingRequest(
        'POST',
        `http://localhost:${testPort}/ag-ui/agent`,
        {
          messages: [{ role: 'user', content: 'test' }],
        },
      );

      expect(response.statusCode).toBe(200);

      // Parse SSE events
      const events = response.body
        .split('\n\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.substring(6)));

      // Find TEXT_MESSAGE_CONTENT event
      const contentEvent = events.find((e) => e.type === 'TEXT_MESSAGE_CONTENT');
      expect(contentEvent).toBeDefined();
      expect(contentEvent.delta).toBe('Hello');
      // Verify addition fields are merged
      expect(contentEvent.model).toBe('custom_model');
      expect(contentEvent.custom_field).toBe('custom_value');
    });

    // TODO: Re-enable when RAW event type is fully implemented in agui-protocol.ts
    it.skip('should allow access to raw AgentRequest', async () => {
      const { EventType } = await import('../../../src/server');
      let requestReceived = false;

      server = new AgentRunServer({
        invokeAgent: async function* (request) {
          // Verify we can access the raw request
          expect(request).toBeDefined();
          expect(request.messages).toBeDefined();
          expect(request.messages.length).toBeGreaterThan(0);
          expect(String(request.messages[0].role)).toBe('user');
          requestReceived = true;

          yield '你好';
          // Yield raw JSON
          yield {
            event: EventType.RAW,
            data: { custom: 'data' },
          };
          yield '再见';
        },
      });

      server.start({ host: '127.0.0.1', port: testPort });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await makeStreamingRequest(
        'POST',
        `http://localhost:${testPort}/ag-ui/agent`,
        {
          messages: [{ role: 'user', content: 'test' }],
          stream: true,
        },
      );

      expect(response.statusCode).toBe(200);
      expect(requestReceived).toBe(true);

      // Response should contain both text messages and raw event
      const lines = response.body.split('\n\n').filter((line) => line);

      // Find the raw event (not prefixed with "data: ")
      const rawEvent = lines.find(
        (line) => !line.startsWith('data: ') && line.includes('custom'),
      );
      expect(rawEvent).toBeDefined();
      expect(JSON.parse(rawEvent!).custom).toBe('data');

      // Verify SSE events
      const sseEvents = lines
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.substring(6)));

      const contentEvents = sseEvents.filter(
        (e) => e.type === 'TEXT_MESSAGE_CONTENT',
      );
      expect(contentEvents.length).toBe(2);
      expect(contentEvents[0].delta).toBe('你好');
      expect(contentEvents[1].delta).toBe('再见');
    });
  });
});

/**
 * Helper function to make HTTP requests
 */
function makeRequest(
  method: string,
  url: string,
  body?: unknown,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: urlObj.port,
      path: urlObj.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Helper function to make streaming HTTP requests
 */
function makeStreamingRequest(
  method: string,
  url: string,
  body?: unknown,
): Promise<{ statusCode: number; body: string }> {
  return makeRequest(method, url, body);
}
