/**
 * AgentRun SDK for Node.js
 *
 * AgentRun SDK 是阿里云 AgentRun 服务的 Node.js 客户端库。
 * Provides simple and easy-to-use APIs for managing AI Agent runtime environments,
 * model services, sandbox environments, etc.
 *
 * @packageDocumentation
 */

// Version is injected at build time from package.json
declare const __VERSION__: string;

export const VERSION =
  typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0-dev';

// Config
export { Config, type ConfigOptions } from './utils/config';

// Exceptions
export {
  AgentRunError,
  ClientError,
  ServerError,
  HTTPError,
  ResourceNotExistError,
  ResourceAlreadyExistError,
} from './utils/exception';

// Status
export { Status } from './utils/model';

// Agent Runtime
export {
  AgentRuntimeClient,
  AgentRuntime,
  AgentRuntimeEndpoint,
  AgentRuntimeControlAPI,
} from './agent-runtime';
export type {
  AgentRuntimeCreateInput,
  AgentRuntimeUpdateInput,
  AgentRuntimeListInput,
  AgentRuntimeEndpointCreateInput,
  AgentRuntimeEndpointUpdateInput,
  AgentRuntimeEndpointListInput,
  AgentRuntimeCode,
  AgentRuntimeContainer,
  AgentRuntimeHealthCheckConfig,
  AgentRuntimeLogConfig,
  AgentRuntimeProtocolConfig,
  AgentRuntimeEndpointRoutingConfig,
  AgentRuntimeEndpointRoutingWeight,
  AgentRuntimeVersion,
} from './agent-runtime';
export {
  AgentRuntimeArtifact,
  AgentRuntimeLanguage,
  AgentRuntimeProtocolType,
} from './agent-runtime';

// Credential
export {
  CredentialClient,
  Credential,
  CredentialControlAPI,
  CredentialConfig,
} from './credential';
export type {
  CredentialCreateInput,
  CredentialUpdateInput,
  CredentialListInput,
  CredentialBasicAuth,
  RelatedResource,
} from './credential';

// Sandbox
export {
  SandboxClient,
  Sandbox,
  Template,
  BrowserSandbox,
  CodeInterpreterSandbox,
  AioSandbox,
  SandboxDataAPI,
  CodeInterpreterDataAPI,
  BrowserDataAPI,
  AioDataAPI,
} from './sandbox';
export {
  TemplateType,
  SandboxState,
  CodeLanguage,
  TemplateNetworkMode,
  TemplateOSSPermission,
} from './sandbox';
export type {
  TemplateNetworkConfiguration,
  TemplateOssConfiguration,
  TemplateLogConfiguration,
  TemplateCredentialConfiguration,
  TemplateArmsConfiguration,
  TemplateContainerConfiguration,
  TemplateMcpOptions,
  TemplateMcpState,
  TemplateCreateInput,
  TemplateUpdateInput,
  TemplateListInput,
  SandboxCreateInput,
  SandboxListInput,
  TemplateData,
  SandboxData,
  ExecuteCodeResult,
  FileInfo,
} from './sandbox';

// Model
export {
  ModelClient,
  ModelService,
  ModelProxy,
  ModelControlAPI,
} from './model';
export type {
  ModelServiceCreateInput,
  ModelServiceUpdateInput,
  ModelServiceListInput,
  ModelProxyCreateInput,
  ModelProxyUpdateInput,
  ModelProxyListInput,
  ProviderSettings,
  ModelFeatures,
  ModelProperties,
  ModelParameterRule,
  ModelInfoConfig,
  ProxyConfigEndpoint,
  ProxyConfigFallback,
  ProxyConfigPolicies,
  ProxyConfig,
} from './model';
export { BackendType, ModelType, Provider } from './model';

// ToolSet
export { ToolSetClient, ToolSet } from './toolset';
export type {
  ToolSetData,
  ToolSetCreateInput,
  ToolSetUpdateInput,
  ToolSetListInput,
  ToolSetSpec,
  ToolSetStatus,
  ToolSetStatusOutputs,
  ToolSetSchema,
  ToolSetAuthorization,
  MCPToolMeta,
} from './toolset';
export { ToolSetSchemaType } from './toolset';

export * from '@/integration';

// Server
export {
  AgentRunServer,
  AgentInvoker,
  OpenAIProtocolHandler,
  AGUIProtocolHandler,
  ProtocolHandler,
  ExpressAdapter,
  createExpressAdapter,
  AGUI_EVENT_TYPES,
  MessageRole,
  EventType,
} from './server';
export type {
  AgentRunServerOptions,
  InvokeAgentHandler,
  AgentRequest,
  AgentEvent,
  AgentResult,
  Message,
  Tool,
  ToolCall,
  ServerConfig,
  ProtocolConfig,
  OpenAIProtocolConfig,
  AGUIProtocolConfig,
  ProtocolRequest,
  ProtocolResponse,
  RouteDefinition,
  ExpressAdapterOptions,
} from './server';

// Logger
import { logger } from './utils/log';

// Breaking changes warning
if (!process.env.DISABLE_BREAKING_CHANGES_WARNING) {
  logger.warn(
    `当前您正在使用 AgentRun Node.js SDK 版本 ${VERSION}。` +
      '早期版本通常包含许多新功能，这些功能\x1b[1;33m 可能引入不兼容的变更 \x1b[0m。' +
      '为避免潜在问题，我们强烈建议\x1b[1;32m 将依赖锁定为此版本 \x1b[0m。\n' +
      `You are currently using AgentRun Node.js SDK version ${VERSION}. ` +
      'Early versions often include many new features, which\x1b[1;33m may introduce breaking changes\x1b[0m. ' +
      'To avoid potential issues, we strongly recommend \x1b[1;32mpinning the dependency to this version\x1b[0m.\n' +
      `\x1b[2;3m  npm install '@agentrun/sdk@${VERSION}' \x1b[0m\n` +
      `\x1b[2;3m  bun add '@agentrun/sdk@${VERSION}' \x1b[0m\n\n` +
      '增加\x1b[2;3m DISABLE_BREAKING_CHANGES_WARNING=1 \x1b[0m到您的环境变量以关闭此警告。\n' +
      'Add\x1b[2;3m DISABLE_BREAKING_CHANGES_WARNING=1 \x1b[0mto your environment variables to disable this warning.\n\n' +
      'Releases:\x1b[2;3m https://github.com/Serverless-Devs/agentrun-sdk-nodejs/releases \x1b[0m',
  );
}
