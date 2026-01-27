/**
 * Quick Start with Tool Calling Example
 * 带有工具调用的快速开始示例
 *
 * 此示例展示如何在 AgentRun Server 中实现工具调用功能。
 * This example demonstrates how to implement tool calling in AgentRun Server.
 *
 * 运行方式 / Run with:
 *   npm run build && node dist-examples/quick-start-with-tools.js
 *   # 或使用 tsx
 *   npx tsx examples/quick-start-with-tools.ts
 *
 * 测试方式 / Test with:
 *
 * 1. OpenAI Chat Completions API (非流式 / Non-streaming):
 *   curl http://127.0.0.1:9000/openai/v1/chat/completions -X POST \
 *     -H "Content-Type: application/json" \
 *     -d '{"messages": [{"role": "user", "content": "What is the weather in Beijing?"}], "stream": false}'
 *
 * 2. OpenAI Chat Completions API (流式 / Streaming):
 *   curl http://127.0.0.1:9000/openai/v1/chat/completions -X POST \
 *     -H "Content-Type: application/json" \
 *     -d '{"messages": [{"role": "user", "content": "What is the weather in Shanghai?"}], "stream": true}'
 *
 * 3. AG-UI Protocol:
 *   curl http://127.0.0.1:9000/ag-ui/agent -X POST \
 *     -H "Content-Type: application/json" \
 *     -d '{"messages": [{"role": "user", "content": "Calculate 15 * 23"}]}'
 */

import { AgentRunServer, AgentRequest, EventType, AgentEvent } from '../src/index';
import { logger } from '../src/utils/log';

// =============================================================================
// Tool Definitions
// 工具定义
// =============================================================================

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<string>;
}

// Define available tools
const tools: ToolDefinition[] = [
  {
    name: 'get_weather',
    description: 'Get the current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city name, e.g., Beijing, Shanghai, New York',
        },
      },
      required: ['location'],
    },
    execute: async (args) => {
      const location = args.location as string;
      // Simulate weather API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      const weathers = ['Sunny', 'Cloudy', 'Rainy', 'Windy'];
      const temps = [15, 20, 25, 30, 35];
      const weather = weathers[Math.floor(Math.random() * weathers.length)];
      const temp = temps[Math.floor(Math.random() * temps.length)];
      return `Weather in ${location}: ${weather}, ${temp}°C`;
    },
  },
  {
    name: 'calculate',
    description: 'Perform a mathematical calculation',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical expression to evaluate, e.g., "2 + 2", "15 * 23"',
        },
      },
      required: ['expression'],
    },
    execute: async (args) => {
      const expression = args.expression as string;
      try {
        // Simple and safe evaluation for basic math
        // In production, use a proper math parser library
        const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
        // eslint-disable-next-line no-eval
        const result = eval(sanitized);
        return `Result: ${expression} = ${result}`;
      } catch {
        return `Error: Could not evaluate "${expression}"`;
      }
    },
  },
  {
    name: 'get_time',
    description: 'Get the current date and time',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'The timezone, e.g., "UTC", "Asia/Shanghai", "America/New_York"',
        },
      },
    },
    execute: async (args) => {
      const timezone = (args.timezone as string) || 'UTC';
      try {
        const now = new Date().toLocaleString('en-US', { timeZone: timezone });
        return `Current time in ${timezone}: ${now}`;
      } catch {
        const now = new Date().toISOString();
        return `Current time (UTC): ${now}`;
      }
    },
  },
];

// Tool lookup map
const toolMap = new Map(tools.map((t) => [t.name, t]));

// =============================================================================
// Simple Intent Detection (Mock LLM behavior)
// 简单意图检测（模拟 LLM 行为）
// =============================================================================

interface DetectedIntent {
  toolName: string;
  args: Record<string, unknown>;
}

function detectIntent(message: string): DetectedIntent | null {
  const lowerMessage = message.toLowerCase();

  // Weather intent
  if (lowerMessage.includes('weather')) {
    const locations = ['beijing', 'shanghai', 'new york', 'tokyo', 'london', 'paris'];
    for (const loc of locations) {
      if (lowerMessage.includes(loc)) {
        return { toolName: 'get_weather', args: { location: loc.charAt(0).toUpperCase() + loc.slice(1) } };
      }
    }
    // Default location if none specified
    return { toolName: 'get_weather', args: { location: 'Beijing' } };
  }

  // Calculate intent
  if (lowerMessage.includes('calculate') || lowerMessage.includes('compute') || /\d+\s*[+\-*/]\s*\d+/.test(message)) {
    const match = message.match(/(\d+[\s+\-*/\d.()]+\d+)/);
    if (match) {
      return { toolName: 'calculate', args: { expression: match[1].trim() } };
    }
  }

  // Time intent
  if (lowerMessage.includes('time') || lowerMessage.includes('date')) {
    if (lowerMessage.includes('shanghai') || lowerMessage.includes('china')) {
      return { toolName: 'get_time', args: { timezone: 'Asia/Shanghai' } };
    }
    if (lowerMessage.includes('new york') || lowerMessage.includes('us')) {
      return { toolName: 'get_time', args: { timezone: 'America/New_York' } };
    }
    return { toolName: 'get_time', args: { timezone: 'UTC' } };
  }

  return null;
}

// =============================================================================
// Helper: Token-by-token streaming
// 辅助函数：逐 token 流式输出
// =============================================================================

/**
 * Simulate token-by-token streaming output
 * 模拟逐 token 流式输出
 *
 * @param text - The text to stream token by token
 * @param delayMs - Delay between tokens in milliseconds (default: 50ms)
 */
async function* streamTokens(text: string, delayMs = 50): AsyncGenerator<string> {
  // Split by words while preserving spaces and punctuation
  const tokens = text.match(/\S+|\s+/g) || [text];
  for (const token of tokens) {
    yield token;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

// =============================================================================
// Agent Implementation with Tool Calling
// 带有工具调用的 Agent 实现
// =============================================================================

async function* invokeAgent(request: AgentRequest): AsyncGenerator<string | AgentEvent> {
  const lastMessage = request.messages[request.messages.length - 1];
  const userContent = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

  logger.info(`Received message: ${userContent}`);

  // Detect user intent and determine if we need to call a tool
  const intent = detectIntent(userContent);

  if (intent) {
    const tool = toolMap.get(intent.toolName);
    if (tool) {
      const toolCallId = `call_${Date.now()}`;

      logger.info(`Detected intent: ${intent.toolName}`);
      logger.info(`Tool arguments: ${JSON.stringify(intent.args)}`);

      // Step 1: Emit thinking text token by token (真正的流式输出)
      yield* streamTokens('Let me check that for you... ');

      // Step 2: Emit TOOL_CALL event
      // SDK will automatically convert this to the appropriate protocol format
      yield {
        event: EventType.TOOL_CALL,
        data: {
          id: toolCallId,
          name: tool.name,
          args: JSON.stringify(intent.args),
        },
      } as AgentEvent;

      // Step 3: Execute the tool
      logger.info(`Executing tool: ${tool.name}`);
      const result = await tool.execute(intent.args);
      logger.info(`Tool result: ${result}`);

      // Step 4: Emit TOOL_RESULT event
      yield {
        event: EventType.TOOL_RESULT,
        data: {
          id: toolCallId,
          result: result,
        },
      } as AgentEvent;

      // Step 5: Generate response based on tool result (真正的流式输出)
      yield '\n\n';
      yield* streamTokens(`Based on my search: ${result}`);
      return;
    }
  }

  // No tool needed - just respond directly (真正的流式输出)
  yield* streamTokens(`I received your message: "${userContent}". `);
  yield* streamTokens('I can help you with:\n');
  yield* streamTokens('• Weather information (try: "What is the weather in Beijing?")\n');
  yield* streamTokens('• Calculations (try: "Calculate 15 * 23")\n');
  yield* streamTokens('• Current time (try: "What time is it in Shanghai?")\n');
}

// =============================================================================
// Server Setup
// 服务器设置
// =============================================================================

const server = new AgentRunServer({
  invokeAgent,
  config: {
    corsOrigins: ['*'],
  },
});

// Print startup information
logger.info('Starting AgentRun Server with Tool Calling...');
logger.info('');
logger.info('Available Tools:');
for (const tool of tools) {
  logger.info(`  • ${tool.name}: ${tool.description}`);
}
logger.info('');
logger.info('Test Examples:');
logger.info('');
logger.info('1. OpenAI Chat Completions API (Non-streaming):');
logger.info('   curl http://127.0.0.1:9000/openai/v1/chat/completions -X POST \\');
logger.info('     -H "Content-Type: application/json" \\');
logger.info('     -d \'{"messages": [{"role": "user", "content": "What is the weather in Beijing?"}], "stream": false}\'');
logger.info('');
logger.info('2. OpenAI Chat Completions API (Streaming):');
logger.info('   curl http://127.0.0.1:9000/openai/v1/chat/completions -X POST \\');
logger.info('     -H "Content-Type: application/json" \\');
logger.info('     -d \'{"messages": [{"role": "user", "content": "Calculate 15 * 23"}], "stream": true}\'');
logger.info('');
logger.info('3. AG-UI Protocol:');
logger.info('   curl http://127.0.0.1:9000/ag-ui/agent -X POST \\');
logger.info('     -H "Content-Type: application/json" \\');
logger.info('     -d \'{"messages": [{"role": "user", "content": "What time is it in Shanghai?"}]}\'');
logger.info('');

server.start({ port: 9000 });
