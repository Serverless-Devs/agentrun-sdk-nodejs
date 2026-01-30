# Mastra Integration - Event Converter

Mastra 集成 - 事件转换器

## 概述 Overview

MastraConverter 提供了将 Mastra agent 的流式事件转换为 AgentRun 标准事件的能力，使得 Mastra agents 可以无缝集成到 AgentRun Server 中，并支持多协议（OpenAI API、AG-UI）。

MastraConverter provides the capability to convert Mastra agent stream events to AgentRun standard events, enabling seamless integration of Mastra agents into AgentRun Server with multi-protocol support (OpenAI API, AG-UI).

## 特性 Features

- ✅ **文本流式输出** Text streaming (`text-delta` → string)
- ✅ **工具调用转换** Tool call conversion (`tool-call` → `TOOL_CALL_CHUNK`)
- ✅ **工具结果转换** Tool result conversion (`tool-result` → `TOOL_RESULT`)
- ✅ **错误处理** Error handling (`error` → `ERROR`)
- ✅ **推理过程** Reasoning support (`reasoning-delta` → marked text)
- ✅ **类型安全** Type-safe with TypeScript
- ✅ **零状态管理** No complex state management needed

## 安装 Installation

```bash
# AgentRun SDK (必需 Required)
npm install @alicloud/agentrun-sdk

# Mastra Core (可选，如果使用 Mastra agents Required if using Mastra agents)
npm install @mastra/core
```

## 快速开始 Quick Start

### 基本用法 Basic Usage

```typescript
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { MastraConverter } from '@alicloud/agentrun-sdk/integration/mastra';
import { AgentRunServer, AgentRequest } from '@alicloud/agentrun-sdk';

// 1. 创建 Mastra Agent
const mastraAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  instructions: 'You are a helpful assistant.',
  model: openai('gpt-4o-mini'),
});

// 2. 实现 invokeAgent 函数，使用 MastraConverter
async function* invokeAgent(request: AgentRequest) {
  const converter = new MastraConverter();
  const userMessage = request.messages[request.messages.length - 1]?.content;

  // 获取 Mastra stream
  const mastraStream = await mastraAgent.stream(userMessage);

  // 转换并输出事件
  for await (const chunk of mastraStream.fullStream) {
    const events = converter.convert(chunk);
    for (const event of events) {
      yield event;
    }
  }
}

// 3. 启动 AgentRun Server
const server = new AgentRunServer({ invokeAgent });
server.start({ port: 9000 });
```

### 与工具集成 With Tools

```typescript
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import {
  MastraConverter,
  toolset,
} from '@alicloud/agentrun-sdk/integration/mastra';
import { AgentRunServer } from '@alicloud/agentrun-sdk';

// 从 AgentRun 获取 Mastra 兼容的工具
const tools = await toolset({ name: 'my-toolset' });

// 创建带有工具的 Agent
const agent = new Agent({
  id: 'tool-agent',
  name: 'Tool Agent',
  instructions: 'Use tools to help users.',
  model: openai('gpt-4o-mini'),
  tools,
});

// 使用 converter 转换事件
async function* invokeAgent(request) {
  const converter = new MastraConverter();
  const stream = await agent.stream(request.messages);

  for await (const chunk of stream.fullStream) {
    for (const event of converter.convert(chunk)) {
      yield event;
    }
  }
}
```

## 事件映射 Event Mapping

| Mastra Event      | AgentRun Event       | 说明 Description                              |
| ----------------- | -------------------- | --------------------------------------------- |
| `text-delta`      | 字符串 string        | 文本增量输出 Text delta output                |
| `tool-call`       | `TOOL_CALL_CHUNK`    | 工具调用 Tool call with id, name, args        |
| `tool-result`     | `TOOL_RESULT`        | 工具结果 Tool execution result                |
| `error`           | `ERROR`              | 错误信息 Error message                        |
| `reasoning-delta` | 标记文本 Marked text | 推理过程（可选） Reasoning process (optional) |
| `finish`          | -                    | 日志记录 Logged for debugging                 |
| `step-*`          | -                    | 日志记录 Logged for debugging                 |

## API 参考 API Reference

### MastraConverter

事件转换器类 Event converter class

#### 方法 Methods

##### `convert(chunk: MastraChunkBase): Generator<AgentEventItem>`

转换单个 Mastra chunk 为 AgentRun 事件
Convert a single Mastra chunk to AgentRun events

**参数 Parameters:**

- `chunk`: Mastra stream chunk (包含 type, runId, from, payload)

**返回 Returns:**

- Generator of `AgentEventItem` (strings or `AgentEvent` objects)

**示例 Example:**

```typescript
const converter = new MastraConverter();
const mastraStream = await agent.stream('Hello');

for await (const chunk of mastraStream.fullStream) {
  const events = converter.convert(chunk);
  for (const event of events) {
    yield event; // string | AgentEvent
  }
}
```

## 与 Python 版本的对比 Comparison with Python Version

| Feature              | Python LangChain Converter             | Node.js Mastra Converter       |
| -------------------- | -------------------------------------- | ------------------------------ |
| 状态管理 State       | 需要维护 tool_call_id 映射             | 不需要（Mastra events 更完整） |
| 事件源 Source        | LangChain/LangGraph                    | Mastra                         |
| 复杂度 Complexity    | 较高（需要处理流式工具调用的 ID 分配） | 较低（事件已包含完整信息）     |
| 类型安全 Type Safety | 基于 Python typing                     | 基于 TypeScript                |

## 高级用法 Advanced Usage

### 自定义事件处理 Custom Event Handling

```typescript
import { MastraConverter } from '@alicloud/agentrun-sdk/integration/mastra';
import { EventType } from '@alicloud/agentrun-sdk';

class CustomMastraConverter extends MastraConverter {
  *convert(chunk) {
    // 添加自定义日志
    console.log(`Processing: ${chunk.type}`);

    // 调用父类转换
    yield* super.convert(chunk);

    // 添加自定义事件
    if (chunk.type === 'finish') {
      yield {
        event: EventType.CUSTOM,
        data: { message: 'Conversion completed!' },
      };
    }
  }
}
```

### 过滤特定事件 Filter Specific Events

```typescript
const converter = new MastraConverter();

for await (const chunk of mastraStream.fullStream) {
  // 只转换文本和工具调用
  if (chunk.type === 'text-delta' || chunk.type === 'tool-call') {
    for (const event of converter.convert(chunk)) {
      yield event;
    }
  }
}
```

## 示例代码 Examples

完整示例请参考：
See complete examples in:

- [examples/mastra-converter.ts](../../examples/mastra-converter.ts) - 基本使用示例 Basic usage example

## 故障排查 Troubleshooting

### 问题：类型错误 "Cannot find module '@mastra/core'"

**解决方案 Solution:**

```bash
npm install @mastra/core @ai-sdk/openai
```

### 问题：事件没有被转换

**解决方案 Solution:**

检查 Mastra chunk 的类型，确保转换器支持该类型。使用日志查看：

```typescript
for await (const chunk of mastraStream.fullStream) {
  console.log('Chunk type:', chunk.type);
  for (const event of converter.convert(chunk)) {
    console.log('Converted event:', event);
    yield event;
  }
}
```

### 问题：工具调用没有结果

**解决方案 Solution:**

确保 Mastra agent 配置了正确的工具，并且工具执行返回了 `tool-result` 事件。

## 贡献 Contributing

欢迎贡献！如果你发现 bug 或有功能建议，请提交 issue 或 pull request。

Contributions are welcome! If you find a bug or have a feature request, please submit an issue or pull request.

## 许可证 License

Apache 2.0
