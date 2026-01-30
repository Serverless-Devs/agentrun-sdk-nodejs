import { Agent } from '@mastra/core/agent';
import { AgentRunServer, type AgentRequest } from '../src/server';
import { MastraConverter, type AgentEventItem, model, toolset } from '../src/integration/mastra';

import { logger } from '../src/utils/log';

const mastraAgent = new Agent({
  id: 'run_agent',
  name: 'AgentRun',
  instructions: `
你是一个智能助手，你会帮助用户完成各种任务。你的输出后，必须是返向输出的。

如，用户输入 “你好”，应该输出 “？么的您助帮以可么什有，好您”
  `.trim(),
  model: () => model({ name: 'ohyee-test' }),
  tools: () => toolset({ name: 'start-mcp-time-ggda' }),
});

async function* invokeAgent(request: AgentRequest): AsyncGenerator<AgentEventItem> {
  const converter = new MastraConverter();
  const mastraStream = await mastraAgent.stream(
    request.messages.map(
      msg =>
        ({
          role: msg.role,
          content: msg.content || '',
        }) as any
    )
  );
  for await (const chunk of mastraStream.fullStream) {
    const events = converter.convert(chunk);

    for (const event of events) {
      yield event;
    }
  }
}

const server = new AgentRunServer({
  invokeAgent,
  config: { corsOrigins: ['*'] },
});

logger.info(`
curl http://127.0.0.1:9000/openai/v1/chat/completions -X POST \\
  -H "Content-Type: application/json" \\
  -d \'{"messages": [{"role": "user", "content": "Hello!"}], "stream": true}\'

curl http://127.0.0.1:9000/ag-ui/agent -X POST \\
  -H "Content-Type: application/json" \\
  -d \'{"messages": [{"role": "user", "content": "Hello!"}]}\'
  `);

server.start({ port: 9000 });
