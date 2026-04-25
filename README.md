# AgentRun SDK for Node.js

AgentRun SDK 是阿里云 AgentRun 服务的 Node.js 客户端库，为 AI Agent 应用提供托管的运行环境。

## 特性

- 🚀 **Agent Runtime**: 创建、管理和部署 AI Agent
- 📜 **Credential**: 安全的凭证管理
- 🔧 **Model**: 模型服务和代理管理
- 📦 **Sandbox**: 代码解释器和浏览器沙箱
- 🧰 **ToolSet**: OpenAPI / MCP 工具集管理
- 🌐 **Server**: OpenAI 兼容的 HTTP 服务器
- 🔌 **Integration**: Mastra 框架集成

## 安装

```bash
npm install @agentrun/sdk
```

## 快速开始

### 配置

SDK 支持从环境变量或代码中配置：

```typescript
import { Config } from '@agentrun/sdk';

// 从环境变量读取配置
// AGENTRUN_ACCESS_KEY_ID     (回退到 ALIBABA_CLOUD_ACCESS_KEY_ID)
// AGENTRUN_ACCESS_KEY_SECRET (回退到 ALIBABA_CLOUD_ACCESS_KEY_SECRET)
// AGENTRUN_ACCOUNT_ID        (回退到 FC_ACCOUNT_ID)
// AGENTRUN_REGION            (回退到 FC_REGION，默认 cn-hangzhou)
const config = new Config();

// 或者直接传入配置
const config = new Config({
  accessKeyId: 'your-access-key-id',
  accessKeySecret: 'your-access-key-secret',
  accountId: 'your-account-id',
  regionId: 'cn-hangzhou',
});
```

### Agent Runtime

```typescript
import {
  AgentRuntime,
  AgentRuntimeLanguage,
  codeFromFile,
} from '@agentrun/sdk';

// 创建 Agent Runtime
const runtime = await AgentRuntime.create({
  input: {
    agentRuntimeName: 'my-agent',
    codeConfiguration: await codeFromFile(
      AgentRuntimeLanguage.NODEJS18,
      ['node', 'index.js'],
      './my-agent-code'
    ),
    port: 9000,
    cpu: 2,
    memory: 4096,
  },
});

// 等待就绪 (READY 或 *_FAILED)
await runtime.waitUntilReadyOrFailed();

// 创建端点
const endpoint = await runtime.createEndpoint({
  input: { agentRuntimeEndpointName: 'default' },
});

await endpoint.waitUntilReadyOrFailed();
console.log('Endpoint URL:', endpoint.endpointPublicUrl);

// 删除
await runtime.delete();
```

### Sandbox

```typescript
import { SandboxClient, Template, TemplateType } from '@agentrun/sdk';

const client = new SandboxClient();

// 创建模板
const template = await Template.create({
  input: {
    templateName: 'my-template',
    templateType: TemplateType.CODE_INTERPRETER,
  },
});

await template.waitUntilReadyOrFailed();

// 创建沙箱
const sandbox = await client.createCodeInterpreterSandbox({
  templateName: template.templateName!,
});
await sandbox.waitUntilRunning();
await sandbox.waitUntilReadyOrFailed();

// 执行代码
const ctx = await sandbox.context.create();
const result = await ctx.execute({ code: "print('Hello!')" });
console.log(result);

// 删除
await sandbox.delete();
await template.delete();
```

## 模块

| 模块             | 描述                              |
| ---------------- | --------------------------------- |
| **AgentRuntime** | Agent 运行时管理                  |
| **Credential**   | 凭证管理                          |
| **Model**        | 模型服务和代理管理                |
| **Sandbox**      | 沙箱环境管理 (代码解释器、浏览器) |
| **ToolSet**      | OpenAPI / MCP 工具集管理          |
| **Server**       | OpenAI 兼容的 HTTP 服务器         |
| **Integration**  | Mastra 等第三方框架集成           |

## 示例

`examples/` 目录下提供了各模块的端到端示例：

```bash
# Agent Runtime 示例
npm run example:agent-runtime

# Credential 示例
npm run example:credential

# Sandbox 示例
npm run example:sandbox
```

其他可直接运行的示例（用 `npx tsx` 启动）：

```bash
npx tsx examples/model.ts
npx tsx examples/toolset.ts
npx tsx examples/mastra.ts
```

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 运行带覆盖率的测试
npm run test:coverage

# 构建
npm run build

# 类型检查
npm run typecheck

# 代码检查和格式化
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run format:fix  # 同时运行格式化和lint修复
```

## 环境变量

| 变量                         | 描述                                                                 | 默认值        |
| ---------------------------- | -------------------------------------------------------------------- | ------------- |
| `AGENTRUN_ACCESS_KEY_ID`     | 阿里云 Access Key ID（回退到 `ALIBABA_CLOUD_ACCESS_KEY_ID`）         | -             |
| `AGENTRUN_ACCESS_KEY_SECRET` | 阿里云 Access Key Secret（回退到 `ALIBABA_CLOUD_ACCESS_KEY_SECRET`） | -             |
| `AGENTRUN_SECURITY_TOKEN`    | STS 临时安全令牌（回退到 `ALIBABA_CLOUD_SECURITY_TOKEN`）            | -             |
| `AGENTRUN_ACCOUNT_ID`        | 阿里云账号 ID（回退到 `FC_ACCOUNT_ID`）                              | -             |
| `AGENTRUN_REGION`            | 区域 ID（回退到 `FC_REGION`）                                        | `cn-hangzhou` |
| `AGENTRUN_CONTROL_ENDPOINT`  | 自定义控制面 API 端点                                                | 区域默认值    |
| `AGENTRUN_DATA_ENDPOINT`     | 自定义数据面 API 端点                                                | 区域默认值    |
| `DEVS_ENDPOINT`              | 自定义 DevS API 端点                                                 | 区域默认值    |

> 超时和读超时通过 `new Config({ timeout, readTimeout })` 在代码中配置（单位：毫秒），不通过环境变量读取。

## 兼容性

- Node.js 18.x, 20.x, 22.x
- TypeScript 5.x
- 同时支持 CommonJS 和 ESM

## License

Apache-2.0
