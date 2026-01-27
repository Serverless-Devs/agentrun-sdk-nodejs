/**
 * Quick Start Example
 *
 * 此示例展示如何使用 AgentRun SDK 快速启动一个 Agent 服务器。
 *
 * 运行方式：
 *   npx ts-node examples/quick-start.ts
 *
 * 测试方式：
 *   curl http://127.0.0.1:9000/openai/v1/chat/completions -X POST \
 *     -H "Content-Type: application/json" \
 *     -d '{"messages": [{"role": "user", "content": "Hello!"}], "stream": false}'
 */

import { AgentRunServer, AgentRequest } from '../src/index';
import { logger } from '../src/utils/log';

// Simple echo agent
function invokeAgent(request: AgentRequest) {
  const lastMessage = request.messages[request.messages.length - 1];
  const userContent = lastMessage?.content || '';

  logger.info(`Received message: ${userContent}`);

  if (request.stream) {
    // Streaming response - yield strings directly
    // The SDK will automatically convert strings to TEXT events
    return (async function* () {
      const response = `You said: "${userContent}". This is a streaming response from AgentRun!`;

      // Yield response word by word
      const words = response.split(' ');
      for (const word of words) {
        yield word + ' ';
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    })();
  } else {
    // Non-streaming response
    return `You said: "${userContent}". This is a response from AgentRun!`;
  }
}

// Create and start server
const server = new AgentRunServer({
  invokeAgent,
  config: {
    corsOrigins: ['*'],
  },
});

logger.info('Starting AgentRun Server...');
logger.info('');
logger.info('Test with:');
logger.info('  curl http://127.0.0.1:9000/openai/v1/chat/completions -X POST \\');
logger.info('    -H "Content-Type: application/json" \\');
logger.info('    -d \'{"messages": [{"role": "user", "content": "Hello!"}], "stream": false}\'');
logger.info('');

server.start({ port: 9000 });

