# AgentRun Node.js SDK 核心概念

本文档详细介绍 AgentRuncursorHome Node.js SDK 的核心概念、架构设计和最佳实践。

## 📚 目录

- [什么是 AgentRun](#什么是-agentrun)
- [核心概念](#核心概念)
- [架构设计](#架构设计)
- [部署方式](#部署方式)
- [网络配置](#网络配置)
- [最佳实践](#最佳实践)

## 什么是 AgentRun

AgentRun 是阿里云提供的 AI Agent 运行时服务，为 AI Agent 应用提供托管的运行环境。开发者无需关心底层基础设施，即可快速部署和运行各类 AI Agent 应用。

#ckendType" /Users/ohyee/projects/agentrun-sdk-nodejs/src/model/model-service.ts
ww"## 核心优势

- **🚀 快速部署** - 支持代码包和容器镜像两种部署方式，几分钟内完成部署
- **📈 弹性伸缩** - 自动根据负载调整资源，按需付费
- **🔒 安全可靠** - 企业级安全防护，多可用区容灾
- **🔌 易于集成** - 提供丰富的 SDK 和 API，轻松集成到现有系统
- **📊 监控运维** - 完善的日志、监控和告警体系

## 核心概念

### Agent Runtime（智能体运行时）

Agent Runtime 是 AgentRun 中的核心资源，代表一个运行中的 AI Agent 实例。每个 Agent Runtime 包含以下关键属性：

- **名称（agentRuntimeName）** - 唯一标识符，用于区分不同的 Agent
- **制品类型（artifactType）** - 部署方式，支持 `CODE`（代码包）或 `CONTAINER`（容器镜像）
- **配置信息** - 包括代码配置、容器配置、网络配置等
- **状态（status）** - 运行时的当前状态
- **版本（version）** - 支持多版本管理

#### Agent Runtime 状态

| 状态 | 说明 |
|-----|------|
| `CREATING` | 创建中 |
| `READY` | 就绪，可正常提供服务 |
| `UPDATING` | 更新中 |
| `DELETING` | 删除中 |
| `FAILED` | 失败 |
| `DELETE_FAILED` | 删除失败 |

### Agent Runtime Endpoint（访问端点）

Endpoint 是 Agent Runtime 的对外访问入口，每个 Agent Runtime 可以创建多个 Endpoint 以支持不同的访问场景。

#### Endpoint 特性

- **公网访问** - 自动分配公网域名，支持 HTTPS
- **内网访问** - VPC 内网访问，低延迟高安全
- **路由配置** - 支持基于权重的流量分发
- **健康检查** - 自动检测 Agent 健康状态
- **协议支持** - HTTP/HTTPS/gRPC

#### Endpoint 状态

| 状态 | 说明 |
|-----|------|
| `CREATING` | 创建中 |
| `READY` | 就绪，可正常访问 |
| `UPDATING` | 更新中 |
| `DELETING` | 删除中 |
| `FAILED` | 失败 |

### Agent Runtime Version（版本）

版本管理允许您维护 Agent Runtime 的多个历史版本，支持版本回滚和灰度发布。

### Credential（凭证管理）

Credential 是 AgentRun 中的安全凭证管理资源，用于管理 API 密钥、认证信息等。

#### Credential 特性

- **认证类型** - 支持多种认证方式（basic、api_key、jwt 等）
- **安全存储** - 加密存储敏感信息
- **权限管理** - 控制对不同资源的访问权限

### Model（模型服务）

Model 是 AgentRun 中的模型管理资源，用于管理 LLM 和其他 AI 模型服务。

#### Model 特性

- **模型服务** - 托管和管理 AI 模型
- **模型代理** - 提供模型路由和负载均衡
- **多提供商支持** - 支持多种模型提供商

### Sandbox（沙箱环境）

Sandbox 为 Agent 提供安全的代码执行环境。

#### Sandbox 特性

- **代码解释器** - 安全执行 Python、JavaScript 等代码
- **浏览器沙箱** - 提供网页浏览和交互能力
- **资源隔离** - 防止代码执行影响系统安全

### Server（服务器）

Server 模块提供 OpenAI 兼容的 HTTP 服务器，便于与各种 AI 应用集成。

#### Server 特性

- **OpenAI 兼容** - 遵循 OpenAI API 规范
- **灵活集成** - 便于与现有应用集成
- **快速部署** - 简化的部署流程

### ToolSet（工具集）

ToolSet 是 AgentRun 中的工具管理资源，允许您定义和管理可重用的工具集供 Agent 调用。

#### ToolSet 特性

- **Schema 类型** - 支持 OpenAPI 和 MCP 协议
- **认证配置** - 支持多种认证方式
- **统一管理** - 集中管理工具定义和访问
- **版本控制** - 支持工具集的版本管理

#### ToolSet Schema 类型

- **OpenAPI** - 使用 OpenAPI 规范定义的工具
- **MCP** - 使用 Model Context Protocol 定义的工具

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                        用户应用                          │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ SDK/API 调用
                    │
┌───────────────────▼─────────────────────────────────────┐
│                   AgentRun 控制面                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Runtime    │  │   Endpoint   │  │   Version    │  │
│  │  Management  │  │  Management  │  │  Management  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ 编排调度
                    │
┌───────────────────▼─────────────────────────────────────┐
│                   AgentRun 数据面                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Agent Runtime 实例池                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │ Agent A  │  │ Agent B  │  │ Agent C  │  ...  │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │          负载均衡 & 路由                         │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ 用户请求
                    │
┌───────────────────▼─────────────────────────────────────┐
│                    外部访问                              │
│              (公网/VPC 内网)                             │
└─────────────────────────────────────────────────────────┘
```

### 工作流程

1. **部署阶段**
   - 开发者通过 SDK 提交代码或镜像
   - AgentRun 创建 Agent Runtime 实例
   - 系统自动完成环境配置和依赖安装

2. **运行阶段**
   - Agent Runtime 进入 READY 状态
   - 创建 Endpoint 对外提供服务
   - 负载均衡器分发请求到 Agent 实例

3. **更新阶段**
   - 提交新版本代码或配置
   - 系统创建新版本实例
   - 平滑切换流量，无缝升级

4. **销毁阶段**
   - 删除 Endpoint，停止接收新请求
   - 优雅停止 Agent 实例
   - 释放相关资源

## 部署方式

AgentRun 支持两种部署方式，满足不同场景需求。

### 方式一：代码包部署（CODE）

适合快速开发和部署简单应用。

**特点：**
- 直接上传代码文件
- 支持多种编程语言（Node.js、Python、Java 等）
- 自动安装依赖
- 快速迭代

**示例：**

```typescript
import { AgentRuntime, AgentRuntimeLanguage } from '@alicloud/agentrun-sdk';

const agent = await AgentRuntime.create({
  agentRuntimeName: 'my-agent',
  codeConfiguration: {
    language: AgentRuntimeLanguage.NODEJS18,
    command: ['node', 'index.js'],
    // Note: In production, you would use zipFile or OSS config
    // zipFile: fs.readFileSync(path.join(codePath, 'code.zip')).toString('base64'),
  },
  port: 9000,
  cpu: 2,
  memory: 4096,
});
```

**支持的语言：**
- Node.js 18
- Node.js 20
- Python 3.10
- Python 3.12
- Java 8
- Java 11

### 方式二：容器镜像部署（CONTAINER）

适合复杂应用和生产环境。

**特点：**
- 完全自定义运行环境
- 支持任何容器化应用
- 版本管理更清晰
- 与 CI/CD 流程集成

**示例：**

```typescript
import { AgentRuntime } from '@alicloud/agentrun-sdk';

const agent = await AgentRuntime.create({
  agentRuntimeName: 'my-agent',
  artifactType: 'CONTAINER', // Using container deployment
  containerConfiguration: {
    image: 'registry.cn-hangzhou.aliyuncs.com/your-namespace/agent:latest',
    command: ['node', 'app.js'],
  },
  port: 8080,
  cpu: 2,
  memory: 4096,
});
```

## 网络配置

### 网络模式

AgentRun 支持灵活的网络配置，满足不同安全和性能需求。

#### 公网模式（INTERNET）

- 自动分配公网域名
- 支持 HTTPS 加密
- 适合对外提供服务

#### VPC 模式

- 私有网络隔离
- 低延迟高带宽
- 适合内部服务调用

**配置示例：**

```typescript
import { AgentRuntime, NetworkConfig } from '@alicloud/agentrun-sdk';

const networkConfig: NetworkConfig = {
    networkMode: 'INTERNET', // 公网模式
    vpcConfig: undefined  // 公网模式不需要 VPC 配置
};

const agent = await AgentRuntime.create({
  agentRuntimeName: 'my-agent',
  codeConfiguration: {
    language: AgentRuntimeLanguage.NODEJS18,
    command: ['node', 'index.js'],
  },
  networkConfiguration: networkConfig,
  port: 9000,
  cpu: 2,
  memory: 4096,
});
```

### 健康检查

配置健康检查确保 Agent 正常运行：

```typescript
import { AgentRuntime, AgentRuntimeHealthCheckConfig } from '@alicloud/agentrun-sdk';

const healthCheckConfig: AgentRuntimeHealthCheckConfig = {
    failureThreshold: 3,      // 失败阈值
    httpGetUrl: "/health",    // 健康检查路径
    initialDelaySeconds: 10,  // 初始延迟
    periodSeconds: 30,        // 检查间隔
    successThreshold: 1,      // 成功阈值
    timeoutSeconds: 5,        // 超时时间
};

const agent = await AgentRuntime.create({
  agentRuntimeName: 'my-agent',
  codeConfiguration: {
    language: AgentRuntimeLanguage.NODEJS18,
    command: ['node', 'index.js'],
  },
  healthCheckConfiguration: healthCheckConfig,
  port: 9000,
  cpu: 2,
  memory: 4096,
});
```

### 协议配置

支持多种协议类型：

```typescript
import { AgentRuntime, AgentRuntimeProtocolType, AgentRuntimeProtocolConfig } from '@alicloud/agentrun-sdk';

const protocolConfig: AgentRuntimeProtocolConfig = {
    type: AgentRuntimeProtocolType.HTTP,  // 协议类型
};

const agent = await AgentRuntime.create({
  agentRuntimeName: 'my-agent',
  codeConfiguration: {
    language: AgentRuntimeLanguage.NODEJS18,
    command: ['node', 'index.js'],
  },
  protocolConfiguration: protocolConfig,
  port: 8080,
  cpu: 2,
  memory: 4096,
});
```

## 最佳实践

### 1. 环境变量管理

使用环境变量管理敏感信息和配置：

```bash
# 生产环境
export AGENTRUN_ACCESS_KEY_ID="prod-key"
export AGENTRUN_ACCESS_KEY_SECRET="prod-secret"
export AGENTRUN_ACCOUNT_ID="your-account-id"
export AGENTRUN_REGION="cn-shanghai"

# 开发环境
export AGENTRUN_ACCESS_KEY_ID="dev-key"
export AGENTRUN_ACCESS_KEY_SECRET="dev-secret"
export AGENTRUN_ACCOUNT_ID="your-account-id"
export AGENTRUN_REGION="cn-hangzhou"
```

### 2. 状态管理

正确处理 Agent Runtime 状态：

```typescript
import { AgentRuntime, Status } from '@alicloud/agentrun-sdk';

// 等待 Agent 就绪
await agent.waitUntilReady({
    beforeCheck: (runtime) => console.log(`当前状态: ${runtime.status}`)
});

// 检查状态并处理
if (agent.status === Status.FAILED) {
    console.log(`部署失败: ${agent.statusReason}`);
    // 进行错误处理
}
```

### 3. 资源清理

及时清理不再使用的资源：

```typescript
import { AgentRuntime } from '@alicloud/agentrun-sdk';

// 删除 Endpoint
const endpoints = await client.listEndpoints({ agentRuntimeId: agent.agentRuntimeId });
for (const endpoint of endpoints) {
    await client.deleteEndpoint({
        agentRuntimeId: agent.agentRuntimeId,
        endpointId: endpoint.agentRuntimeEndpointId
    });
}

// 删除 Agent Runtime
await agent.delete();
```

### 4. 版本管理

维护多个版本支持灰度发布：

```typescript
import { AgentRuntime } from '@alicloud/agentrun-sdk';

// 创建新版本
const newAgent = await client.create({
    input: updatedConfig
});

// 配置流量分配
await client.updateEndpoint({
    agentRuntimeId: agent.agentRuntimeId,
    endpointId: endpoint.agentRuntimeEndpointId,
    input: {
        routingConfiguration: {
            versionWeights: [
                {
                    version: oldAgent.agentRuntimeVersion,
                    weight: 80  // 80% 流量给旧版本
                },
                {
                    version: newAgent.agentRuntimeVersion,
                    weight: 20  // 20% 流量给新版本
                }
            ]
        }
    }
});
```

### 5. 错误处理

实现健壮的错误处理机制：

```typescript
import { AgentRuntime, ResourceNotExistError, ClientError } from '@alicloud/agentrun-sdk';

try {
    const agent = await client.get({ id: "agent-id" });
} catch (error) {
    if (error instanceof ResourceNotExistError) {
        console.log("Agent 不存在");
    } else if (error instanceof ClientError) {
        console.log(`API 调用失败: ${error.message}`);
        console.log(`错误码: ${error.errorCode}`);
    } else {
        throw error;
    }
}
```

### 6. 日志配置

配置日志收集便于问题排查：

```typescript
import { AgentRuntime } from '@alicloud/agentrun-sdk';

const agent = await AgentRuntime.create({
  agentRuntimeName: 'my-agent',
  codeConfiguration: {
    language: AgentRuntimeLanguage.NODEJS18,
    command: ['node', 'index.js'],
  },
  logConfiguration: {
    project: "your-project",     // SLS 项目
    logstore: "your-log-store",  // SLS 日志库
  },
  port: 9000,
  cpu: 2,
  memory: 4096,
});
```

### 7. 异步编程

对于高并发场景，使用异步 API：

```typescript
import { AgentRuntimeClient, AgentRuntimeCreateInput } from '@alicloud/agentrun-sdk';

async function deployMultipleAgents() {
    const client = new AgentRuntimeClient();
    
    // 并发创建多个 Agent
    const configs: AgentRuntimeCreateInput[] = [config1, config2, config3];
    const promises = configs.map(config => client.create({ input: config }));
    
    const agents = await Promise.all(promises);
    return agents;
}

// 运行
const agents = await deployMultipleAgents();
```

### 8. ToolSet 管理

管理工具集以供 Agent 使用：

```typescript
import { ToolSet } from '@alicloud/agentrun-sdk';

// 创建 OpenAPI 工具集
const toolset = await ToolSet.create({
  toolSetName: 'weather-api',
  description: 'Weather API toolset',
  spec: {
    schema: {
      type: 'OpenAPI',
      detail: 'https://weather-api.example.com/openapi.json',
    },
    authConfig: {
      type: 'API_KEY',
      apiKeyHeaderName: 'X-API-Key',
      apiKeyValue: 'your-api-key',
    },
  },
});

await toolset.waitUntilReady();

// 更新工具集
await toolset.update({
  description: 'Updated weather API toolset',
});

// 删除工具集
await toolset.delete();
```

### 9. Credential 管理

管理安全凭证以供 Agent 和服务使用：

```typescript
import { Credential, CredentialConfig } from '@alicloud/agentrun-sdk';

// 创建凭证
const credential = await Credential.create({
  input: {
    credentialName: 'my-api-key',
    description: 'API key for external service',
    credentialConfig: CredentialConfig.inboundApiKey({ apiKey: 'your-api-key-here' }),
  },
});

await credential.waitUntilReady();

// 更新凭证
await credential.update({
  input: {
    description: 'Updated description',
  },
});

// 删除凭证
await credential.delete();
```

### 10. Model 管理

管理模型服务和代理：

```typescript
import { ModelService, ModelProxy, BackendType, Provider, ModelType } from '@alicloud/agentrun-sdk';

// 创建模型服务
const modelService = await ModelService.create({
  input: {
    modelServiceName: 'my-model-service',
    backendType: BackendType.DASHSCOPE,
    provider: Provider.QWEN,
    modelType: ModelType.LLM,
    modelInfoConfig: {
      model: 'qwen-max',
    },
  },
});

await modelService.waitUntilReady();

// 创建模型代理
const modelProxy = await ModelProxy.create({
  input: {
    modelProxyName: 'my-model-proxy',
    backendType: BackendType.CUSTOM,
    proxyConfig: {
      endpoints: [
        {
          url: 'https://api.example.com',
          credentialName: 'my-api-key',
          weight: 100,
        },
      ],
    },
  },
});

await modelProxy.waitUntilReady();

// 删除资源
await modelProxy.delete();
await modelService.delete();
```

### 11. Sandbox 管理

管理沙箱环境以提供安全的代码执行：

```typescript
import { SandboxClient, TemplateType } from '@alicloud/agentrun-sdk';

const client = new SandboxClient();

// 创建模板
const template = await client.createTemplate({
  input: {
    templateName: 'my-template',
    templateType: TemplateType.CODE_INTERPRETER,
  },
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

### 12. Server 模块

使用内置的OpenAI兼容服务器：

```typescript
import { AgentRunServer, AgentRequest } from '@alicloud/agentrun-sdk';

// 创建服务器
const server = new AgentRunServer({
  invokeAgent: async (request: AgentRequest) => {
    const userMessage = request.messages[request.messages.length - 1]?.content;
    return `You said: ${userMessage}`;
  },
});

// 启动服务器
server.start({ port: 9000 });
```

### 客户端使用

除了通过类方法创建Agent Runtime，还可以使用AgentRuntimeClient进行更灵活的管理：

```typescript
import { AgentRuntimeClient, AgentRuntime, AgentRuntimeLanguage } from '@alicloud/agentrun-sdk';

// 创建客户端
const client = new AgentRuntimeClient();

// 创建 Agent Runtime
const agent = await client.create({
  input: {
    agentRuntimeName: 'my-agent',
    codeConfiguration: {
      language: AgentRuntimeLanguage.NODEJS18,
      command: ['node', 'index.js'],
    },
    port: 9000,
    cpu: 2,
    memory: 4096,
  }
});

// 等待就绪
await agent.waitUntilReady();

// 获取特定 Agent Runtime
const existingAgent = await client.get({ id: agent.agentRuntimeId });

// 列出 Agent Runtimes
const agents = await client.list({
  input: {
    agentRuntimeName: 'my-agent',
  }
});

// 更新 Agent Runtime
const updatedAgent = await client.update({
  id: agent.agentRuntimeId,
  input: {
    description: 'Updated description',
  }
});

// 删除 Agent Runtime
await client.delete({ id: agent.agentRuntimeId });
```

### 13. 类型检查要求

所有由 AI（或自动化 agent）提交或修改的代码变更，必须在提交/合并前后执行静态类型检查，并在变更记录中包含检查结果摘要：

- **运行命令**：使用项目根目录的 TypeScript 配置运行：

    ```bash
    npm run typecheck
    ```

- **必需项**：AI 在每次修改代码并准备提交时，必须：
    - 运行上述类型检查命令并等待完成；
    - 若检查通过，在提交消息或 PR 描述中写入简短摘要（例如："类型检查通过"）；
    - 若检查失败，AI 应在 PR 描述中列出前 30 条错误（或最关键的若干条），并给出优先修复建议或自动修复方案。

- **CI 行为**：项目 CI 可根据仓库策略决定是否将类型检查失败作为阻断条件；AI 应遵从仓库当前 CI 策略并在 PR 中说明检查结果。

此要求旨在保证类型安全随代码变更持续得到验证，减少回归并提高编辑器与 Copilot 的诊断可靠性。

### 14. 运行命令约定

请使用 `bun` 或 `npm` 执行所有 Node.js 相关命令。例如：

- `bun run typecheck` 或 `npm run typecheck` 进行类型检查
- `bun run example:agent-runtime` 或 `npm run example:agent-runtime` 运行示例代码
- `bun test` 或 `npm test` 运行测试

推荐使用 `bun` 以获得更快的执行速度和更好的开发体验。

## 常见问题

### Q: Agent Runtime 启动失败怎么办？

A: 检查以下几点：
1. 代码或镜像是否正确
2. 启动命令是否正确
3. 端口配置是否匹配
4. 查看 `statusReason` 字段获取详细错误信息

### Q: 如何实现零停机更新？

A: 使用版本管理和流量路由：
1. 创建新版本 Agent Runtime
2. 等待新版本就绪
3. 配置 Endpoint 路由权重，逐步切换流量
4. 确认新版本稳定后删除旧版本

### Q: 如何优化 Agent 启动速度？

A: 建议：
1. 使用容器镜像部署，提前构建好环境
2. 优化应用启动逻辑，减少初始化时间
3. 合理配置健康检查参数
4. 使用预留实例（如果支持）

### Q: 如何控制成本？

A: 建议：
1. 及时删除不用的 Agent Runtime
2. 根据实际负载配置合适的实例规格
3. 使用按量付费，避免资源闲置
4. 合理设置自动伸缩策略

## 更多资源

- [Node.js SDK 文档](./README_NODEJS.md)
- [示例代码](./examples/)
- [阿里云 AgentRun 官方文档](https://help.aliyun.com/zh/agentrun/)
