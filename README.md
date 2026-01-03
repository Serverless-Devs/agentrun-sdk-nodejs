# AgentRun SDK for Node.js

AgentRun SDK 是阿里云 AgentRun 服务的 Node.js 客户端库，为 AI Agent 应用提供托管的运行环境。

## 特性

- 🚀 **Agent Runtime**: 创建、管理和部署 AI Agent
- 📜 **Credential**: 安全的凭证管理
- 🔧 **Model**: 模型服务和代理管理
- 📦 **Sandbox**: 代码解释器和浏览器沙箱
- 🌐 **Server**: OpenAI 兼容的 HTTP 服务器
- 🔌 **Integration**: Mastra 框架集成

## 安装

```bash
npm install @alicloud/agentrun-sdk
```

## 快速开始

### 配置

SDK 支持从环境变量或代码中配置：

```typescript
import { Config } from '@alicloud/agentrun-sdk';

// 从环境变量读取配置
// AGENTRUN_ACCESS_KEY_ID
// AGENTRUN_ACCESS_KEY_SECRET
// AGENTRUN_ACCOUNT_ID
// AGENTRUN_REGION (默认: cn-hangzhou)
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
import { AgentRuntime, AgentRuntimeLanguage } from '@alicloud/agentrun-sdk';

// 创建 Agent Runtime
const runtime = await AgentRuntime.create({
  agentRuntimeName: 'my-agent',
  codeConfiguration: {
    language: AgentRuntimeLanguage.NODEJS18,
    command: ['node', 'index.js'],
    zipFile: 'base64-encoded-zip',
  },
});

// 等待就绪
await runtime.waitUntilReady();

// 创建端点
const endpoint = await runtime.createEndpoint({
  agentRuntimeEndpointName: 'default',
});

await endpoint.waitUntilReady();
console.log('Endpoint URL:', endpoint.endpointPublicUrl);

// 删除
await runtime.delete();
```

### Sandbox

```typescript
import { SandboxClient, TemplateType } from '@alicloud/agentrun-sdk';

const client = new SandboxClient();

// 创建模板
const template = await client.createTemplate({
  templateName: 'my-template',
  templateType: TemplateType.CODE_INTERPRETER,
});

await template.waitUntilReady();

// 创建沙箱
const sandbox = await client.createCodeInterpreterSandbox(template.templateName!);
await sandbox.waitUntilRunning();

// 执行代码 (需要数据 API 支持)
// const result = await sandbox.executeCode('print("Hello!")');

// 删除
await sandbox.delete();
await template.delete();
```

## 模块

| 模块 | 描述 |
|------|------|
| **AgentRuntime** | Agent 运行时管理 |
| **Credential** | 凭证管理 |
| **Model** | 模型服务和代理管理 |
| **Sandbox** | 沙箱环境管理 (代码解释器、浏览器) |

## 示例

运行示例：

```bash
# 快速开始 - 启动 Agent 服务器
npm run example:quick-start

# Agent Runtime 示例
npm run example:agent-runtime

# Credential 示例
npm run example:credential

# Sandbox 示例
npm run example:sandbox
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

# 代码检查
npm run lint
npm run lint:fix
```

## 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `AGENTRUN_ACCESS_KEY_ID` | 阿里云 Access Key ID | - |
| `AGENTRUN_ACCESS_KEY_SECRET` | 阿里云 Access Key Secret | - |
| `AGENTRUN_ACCOUNT_ID` | 阿里云账号 ID | - |
| `AGENTRUN_REGION` | 区域 ID | `cn-hangzhou` |
| `AGENTRUN_TIMEOUT` | API 超时时间 (毫秒) | `600000` |

## 兼容性

- Node.js 18.x, 20.x, 22.x
- TypeScript 5.x
- 同时支持 CommonJS 和 ESM

## License

Apache-2.0
