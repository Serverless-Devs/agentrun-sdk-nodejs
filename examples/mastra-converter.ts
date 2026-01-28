/**
 * Mastra Integration Example with Event Converter
 * Mastra 集成示例 - 使用事件转换器
 *
 * This example demonstrates how to use MastraConverter to convert
 * Mastra agent stream events to AgentRun events, making it easy to
 * integrate Mastra agents with AgentRun Server.
 *
 * 此示例展示如何使用 MastraConverter 将 Mastra agent 的流式事件
 * 转换为 AgentRun 事件，从而轻松集成 Mastra agents 到 AgentRun Server。
 *
 * Prerequisites / 前置要求:
 * - Install @mastra/core: npm install @mastra/core
 * - Set up OpenAI API key: export OPENAI_API_KEY="your-key"
 *
 * Run with / 运行方式:
 *   npm run build && node dist-examples/mastra-converter.js
 *   # 或使用 tsx
 *   npx tsx examples/mastra-converter.ts
 */

import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { MastraConverter, type AgentEventItem } from '../src/integration/mastra';
import { AgentRunServer, type AgentRequest } from '../src/index';
import { logger } from '../src/utils/log';

// =============================================================================
// Create Mastra Agent
// 创建 Mastra Agent
// =============================================================================

const mastraAgent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent',
  instructions: 'You are a helpful weather assistant.',
  model: openai('gpt-4o-mini'),
});

// =============================================================================
// Agent Implementation with MastraConverter
// 使用 MastraConverter 实现 Agent
// =============================================================================

async function* invokeAgent(request: AgentRequest): AsyncGenerator<AgentEventItem> {
  const lastMessage = request.messages[request.messages.length - 1];
  const userContent = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

  logger.info(`[Mastra Agent] Received message: ${userContent}`);

  // Create converter instance
  const converter = new MastraConverter();

  // Get Mastra stream
  const mastraStream = await mastraAgent.stream(userContent);

  logger.info('[Mastra Agent] Starting stream conversion...');

  // Convert Mastra events to AgentRun events
  for await (const chunk of mastraStream.fullStream) {
    logger.debug(`[Mastra Agent] Processing chunk type: ${chunk.type}`);
    
    // Convert chunk to AgentRun events
    const events = converter.convert(chunk);
    
    // Yield each converted event
    for (const event of events) {
      yield event;
    }
  }

  logger.info('[Mastra Agent] Stream conversion completed');
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
logger.info('');
logger.info('=============================================================================');
logger.info('  Mastra Integration Example with Event Converter');
logger.info('  Mastra 集成示例 - 使用事件转换器');
logger.info('=============================================================================');
logger.info('');
logger.info('This example demonstrates:');
logger.info('  1. Creating a Mastra agent');
logger.info('  2. Using MastraConverter to convert Mastra events to AgentRun events');
logger.info('  3. Serving the agent through AgentRun Server protocols (OpenAI & AG-UI)');
logger.info('');
logger.info('Test Examples:');
logger.info('');
logger.info('1. OpenAI Chat Completions API (Streaming):');
logger.info('   curl http://127.0.0.1:9000/openai/v1/chat/completions -X POST \\');
logger.info('     -H "Content-Type: application/json" \\');
logger.info('     -d \'{"messages": [{"role": "user", "content": "Hello!"}], "stream": true}\'');
logger.info('');
logger.info('2. AG-UI Protocol:');
logger.info('   curl http://127.0.0.1:9000/ag-ui/agent -X POST \\');
logger.info('     -H "Content-Type: application/json" \\');
logger.info('     -d \'{"messages": [{"role": "user", "content": "Hello!"}]}\'');
logger.info('');
logger.info('=============================================================================');
logger.info('');

server.start({ port: 9000 });
