/**
 * AG-UI 协议处理器测试
 *
 * 测试 AGUIProtocolHandler 的各种功能。
 * 通过 AgentRunServer 的端到端测试验证 AG-UI 协议行为。
 */

import * as http from 'http';

import {
  AGUIProtocolHandler,
  AGUI_EVENT_TYPES,
  AgentRunServer,
  AgentRequest,
  AgentEvent,
  EventType,
  ServerConfig,
} from '../../../src/server';

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error('No available port'));
        }
      });
    });
  });
}

// Helper to make HTTP requests
async function makeRequest(
  port: number,
  path: string,
  method: string = 'POST',
  body?: unknown
): Promise<{ status: number; body: string; lines: string[] }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        const lines = body.split('\n').filter(line => line.startsWith('data: '));
        resolve({ status: res.statusCode || 0, body, lines });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Parse SSE data lines to events
function parseSSEEvents(lines: string[]): Array<Record<string, unknown>> {
  return lines
    .filter(line => line.startsWith('data: '))
    .map(line => {
      try {
        return JSON.parse(line.substring(6));
      } catch {
        return null;
      }
    })
    .filter(event => event !== null) as Array<Record<string, unknown>>;
}

describe('AGUIProtocolHandler', () => {
  describe('getPrefix', () => {
    it('should return default prefix', () => {
      const handler = new AGUIProtocolHandler();
      expect(handler.getPrefix()).toBe('/ag-ui');
    });

    it('should return custom prefix', () => {
      const config: ServerConfig['agui'] = { prefix: '/custom/agui' };
      const handler = new AGUIProtocolHandler(config);
      expect(handler.getPrefix()).toBe('/custom/agui');
    });
  });

  describe('getRoutes', () => {
    it('should return agent route', () => {
      const handler = new AGUIProtocolHandler();
      const routes = handler.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('POST');
      expect(routes[0].path).toBe('/agent');
    });
  });
});

describe('AgentRunServer AGUI endpoints', () => {
  let server: AgentRunServer;
  let port: number;

  beforeEach(async () => {
    port = await getAvailablePort();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  it('should handle AG-UI streaming request', async () => {
    server = new AgentRunServer({
      invokeAgent: async () => 'Hello World',
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { status, lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(status).toBe(200);
    const events = parseSSEEvents(lines);
    const types = events.map(e => e.type);

    expect(types).toContain(AGUI_EVENT_TYPES.RUN_STARTED);
    expect(types).toContain(AGUI_EVENT_TYPES.RUN_FINISHED);
  });

  it('should handle AG-UI with async generator', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* () {
        yield 'Hello ';
        yield 'World';
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { status, lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(status).toBe(200);
    const events = parseSSEEvents(lines);
    const textEvents = events.filter(e => e.type === AGUI_EVENT_TYPES.TEXT_MESSAGE_CONTENT);

    expect(textEvents).toHaveLength(2);
    expect(textEvents[0].delta).toBe('Hello ');
    expect(textEvents[1].delta).toBe('World');
  });

  it('should handle AG-UI with AgentEvent objects', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* (_request: AgentRequest): AsyncGenerator<AgentEvent> {
        yield { event: EventType.TEXT, data: { delta: 'Hello' } };
        yield {
          event: EventType.TOOL_CALL,
          data: { id: 'tc-1', name: 'search', args: '{"q": "test"}' },
        };
        yield { event: EventType.TOOL_RESULT, data: { id: 'tc-1', result: 'Found' } };
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { status, lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(status).toBe(200);
    const events = parseSSEEvents(lines);
    const types = events.map(e => e.type);

    expect(types).toContain(AGUI_EVENT_TYPES.TEXT_MESSAGE_CONTENT);
    expect(types).toContain(AGUI_EVENT_TYPES.TOOL_CALL_START);
    expect(types).toContain(AGUI_EVENT_TYPES.TOOL_CALL_RESULT);
  });

  it('should handle error in invoke_agent', async () => {
    server = new AgentRunServer({
      invokeAgent: async () => {
        throw new Error('Test error');
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { status, lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(status).toBe(200);
    const events = parseSSEEvents(lines);
    const types = events.map(e => e.type);

    expect(types).toContain(AGUI_EVENT_TYPES.RUN_ERROR);

    const errorEvent = events.find(e => e.type === AGUI_EVENT_TYPES.RUN_ERROR);
    expect(errorEvent?.message as string).toContain('Test error');
  });

  it('should pass threadId and runId from request', async () => {
    server = new AgentRunServer({
      invokeAgent: async () => 'Hello',
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
      threadId: 'custom-thread-123',
      runId: 'custom-run-456',
    });

    const events = parseSSEEvents(lines);
    const startEvent = events.find(e => e.type === AGUI_EVENT_TYPES.RUN_STARTED);

    expect(startEvent?.threadId).toBe('custom-thread-123');
    expect(startEvent?.runId).toBe('custom-run-456');
  });

  it('should use custom AG-UI prefix', async () => {
    server = new AgentRunServer({
      invokeAgent: async () => 'Hello',
      config: {
        agui: { prefix: '/custom/agui' },
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { status } = await makeRequest(port, '/custom/agui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });
    expect(status).toBe(200);
  });

  it('should handle TEXT events', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* (): AsyncGenerator<AgentEvent> {
        yield { event: EventType.TEXT, data: { delta: 'Hello' } };
        yield { event: EventType.TEXT, data: { delta: ' World' } };
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const events = parseSSEEvents(lines);
    const textEvents = events.filter(e => e.type === AGUI_EVENT_TYPES.TEXT_MESSAGE_CONTENT);

    expect(textEvents).toHaveLength(2);
    expect(textEvents[0].delta).toBe('Hello');
    expect(textEvents[1].delta).toBe(' World');
  });

  it('should handle TOOL_CALL_CHUNK events', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* (): AsyncGenerator<AgentEvent> {
        yield {
          event: EventType.TOOL_CALL_CHUNK,
          data: { id: 'tc-1', name: 'search', args_delta: '{"q":' },
        };
        yield { event: EventType.TOOL_CALL_CHUNK, data: { id: 'tc-1', args_delta: '"test"}' } };
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const events = parseSSEEvents(lines);
    const argsEvents = events.filter(e => e.type === AGUI_EVENT_TYPES.TOOL_CALL_ARGS);

    expect(argsEvents).toHaveLength(2);
    expect(argsEvents[0].delta).toBe('{"q":');
    expect(argsEvents[1].delta).toBe('"test"}');
  });

  it('should handle TOOL_RESULT events', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* (): AsyncGenerator<AgentEvent> {
        yield { event: EventType.TOOL_CALL, data: { id: 'tc-1', name: 'tool', args: '{}' } };
        yield { event: EventType.TOOL_RESULT, data: { id: 'tc-1', result: 'Sunny, 25°C' } };
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const events = parseSSEEvents(lines);
    const resultEvent = events.find(e => e.type === AGUI_EVENT_TYPES.TOOL_CALL_RESULT);

    expect(resultEvent).toBeDefined();
    expect(resultEvent?.content).toBe('Sunny, 25°C');
    expect(resultEvent?.role).toBe('tool');
  });

  it('should handle ERROR events', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* (): AsyncGenerator<AgentEvent> {
        yield { event: EventType.ERROR, data: { message: 'Something went wrong', code: 'ERR001' } };
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const events = parseSSEEvents(lines);
    const errorEvent = events.find(e => e.type === AGUI_EVENT_TYPES.RUN_ERROR);

    expect(errorEvent).toBeDefined();
    expect(errorEvent?.message).toBe('Something went wrong');
    expect(errorEvent?.code).toBe('ERR001');

    // Should not have RUN_FINISHED after error
    const types = events.map(e => e.type);
    expect(types).not.toContain(AGUI_EVENT_TYPES.RUN_FINISHED);
  });

  it('should handle STATE snapshot events', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* (): AsyncGenerator<AgentEvent> {
        yield { event: EventType.STATE, data: { snapshot: { count: 10 } } };
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const events = parseSSEEvents(lines);
    const stateEvent = events.find(e => e.type === AGUI_EVENT_TYPES.STATE_SNAPSHOT);

    expect(stateEvent).toBeDefined();
    expect((stateEvent?.snapshot as Record<string, unknown>)?.count).toBe(10);
  });

  it('should handle CUSTOM events', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* (): AsyncGenerator<AgentEvent> {
        yield {
          event: EventType.CUSTOM,
          data: { name: 'step_started', value: { step: 'thinking' } },
        };
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const events = parseSSEEvents(lines);
    const customEvent = events.find(e => e.type === AGUI_EVENT_TYPES.CUSTOM);

    expect(customEvent).toBeDefined();
    expect(customEvent?.name).toBe('step_started');
    expect((customEvent?.value as Record<string, unknown>)?.step).toBe('thinking');
  });

  it('should handle RAW events', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* (): AsyncGenerator<AgentEvent> {
        yield { event: EventType.RAW, data: { raw: '{"custom": "data"}' } };
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { body } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    // RAW events are passed through directly
    expect(body).toContain('{"custom": "data"}');
  });

  it('should handle HITL events', async () => {
    server = new AgentRunServer({
      invokeAgent: async function* (): AsyncGenerator<AgentEvent> {
        yield {
          event: EventType.HITL,
          data: {
            id: 'hitl-1',
            type: 'confirmation',
            prompt: 'Confirm deletion?',
            options: ['Yes', 'No'],
          },
        };
      },
    });
    server.start({ port });

    await new Promise(resolve => setTimeout(resolve, 100));

    const { lines } = await makeRequest(port, '/ag-ui/agent', 'POST', {
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const events = parseSSEEvents(lines);
    const types = events.map(e => e.type);

    expect(types).toContain(AGUI_EVENT_TYPES.TOOL_CALL_START);
    expect(types).toContain(AGUI_EVENT_TYPES.TOOL_CALL_ARGS);
    expect(types).toContain(AGUI_EVENT_TYPES.TOOL_CALL_END);

    const startEvent = events.find(e => e.type === AGUI_EVENT_TYPES.TOOL_CALL_START);
    expect(startEvent?.toolCallName).toBe('hitl_confirmation');
  });
});
