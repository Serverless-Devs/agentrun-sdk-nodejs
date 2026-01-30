/**
 * AgentRun SDK for Node.js
 *
 * AgentRun SDK 是阿里云 AgentRun 服务的 Node.js 客户端库。
 * Provides simple and easy-to-use APIs for managing AI Agent runtime environments,
 * model services, sandbox environments, etc.
 *
 * @packageDocumentation
 */

import '@/utils/version-check';

// Version is injected at build time from package.json
declare const __VERSION__: string;

export const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0-dev';

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
export { CredentialClient, Credential, CredentialControlAPI, CredentialConfig } from './credential';
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
export { ModelClient, ModelService, ModelProxy, ModelControlAPI } from './model';
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
