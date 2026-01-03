/**
 * Model Service Data Models
 *
 * 此模块定义 Model Service 相关的所有数据模型。
 * This module defines all data models related to Model Service.
 */

import { Status, PageableInput, NetworkConfig } from '../utils/model';

/**
 * Backend type enum
 */
export type BackendType = 'proxy' | 'service';

export const BackendType = {
  PROXY: 'proxy' as BackendType,
  SERVICE: 'service' as BackendType,
};

/**
 * Model type enum
 */
export type ModelType =
  | 'llm'
  | 'text-embedding'
  | 'speech2text'
  | 'tts'
  | 'rerank'
  | 'moderation';

export const ModelType = {
  LLM: 'llm' as ModelType,
  TEXT_EMBEDDING: 'text-embedding' as ModelType,
  SPEECH2TEXT: 'speech2text' as ModelType,
  TTS: 'tts' as ModelType,
  RERANK: 'rerank' as ModelType,
  MODERATION: 'moderation' as ModelType,
};

/**
 * Provider enum
 */
export type Provider =
  | 'openai'
  | 'anthropic'
  | 'baichuan'
  | 'deepseek'
  | 'gemini'
  | 'hunyuan'
  | 'minimax'
  | 'moonshot'
  | 'spark'
  | 'stepfun'
  | 'tongyi'
  | 'vertex_ai'
  | 'wenxin'
  | 'yi'
  | 'zhipuai'
  | 'custom';

export const Provider = {
  OPENAI: 'openai' as Provider,
  ANTHROPIC: 'anthropic' as Provider,
  BAICHUAN: 'baichuan' as Provider,
  DEEPSEEK: 'deepseek' as Provider,
  GEMINI: 'gemini' as Provider,
  HUNYUAN: 'hunyuan' as Provider,
  MINIMAX: 'minimax' as Provider,
  MOONSHOT: 'moonshot' as Provider,
  SPARK: 'spark' as Provider,
  STEPFUN: 'stepfun' as Provider,
  TONGYI: 'tongyi' as Provider,
  VERTEX_AI: 'vertex_ai' as Provider,
  WENXIN: 'wenxin' as Provider,
  YI: 'yi' as Provider,
  ZHIPUAI: 'zhipuai' as Provider,
  CUSTOM: 'custom' as Provider,
};

export type ProxyMode = 'single' | 'multi';

export const ProxyMode = {
  SINGLE: 'single' as ProxyMode,
  MULTI: 'multi' as ProxyMode,
};

/**
 * Provider settings
 */
export interface ProviderSettings {
  apiKey?: string;
  baseUrl?: string;
  modelNames?: string[];
}

/**
 * Model features
 */
export interface ModelFeatures {
  agentThought?: boolean;
  multiToolCall?: boolean;
  streamToolCall?: boolean;
  toolCall?: boolean;
  vision?: boolean;
}

/**
 * Model properties
 */
export interface ModelProperties {
  contextSize?: number;
}

/**
 * Model parameter rule
 */
export interface ModelParameterRule {
  default?: unknown;
  max?: number;
  min?: number;
  name?: string;
  required?: boolean;
  type?: string;
}

/**
 * Model info config
 */
export interface ModelInfoConfig {
  modelName?: string;
  modelFeatures?: ModelFeatures;
  modelProperties?: ModelProperties;
  modelParameterRules?: ModelParameterRule[];
}

/**
 * Proxy config endpoint
 */
export interface ProxyConfigEndpoint {
  baseUrl?: string;
  modelNames?: string[];
  modelServiceName?: string;
  weight?: number;
}

/**
 * Proxy config fallback
 */
export interface ProxyConfigFallback {
  modelName?: string;
  modelServiceName?: string;
}

export interface ProxyConfigTokenRateLimiter {
  tps?: number;
  tpm?: number;
  tph?: number;
  tpd?: number;
}

export interface ProxyConfigAIGuardrailConfig {
  checkRequest?: boolean;
  checkResponse?: boolean;
}

/**
 * Proxy config policies
 */
export interface ProxyConfigPolicies {
  cache?: boolean;
  concurrencyLimit?: number;
  fallbacks?: ProxyConfigFallback[];
  numRetries?: number;
  requestTimeout?: number;
  aiGuardrailConfig?: ProxyConfigAIGuardrailConfig;
  tokenRateLimiter?: ProxyConfigTokenRateLimiter;
}

/**
 * Proxy config
 */
export interface ProxyConfig {
  endpoints?: ProxyConfigEndpoint[];
  policies?: ProxyConfigPolicies;
}

export interface CommonModelMutableProps {
  credentialName?: string;
  description?: string;
  networkConfiguration?: NetworkConfig;
  tags?: string[];
}

export interface CommonModelImmutableProps {
  modelType?: ModelType;
}

export interface CommonModelSystemProps {
  createdAt?: string;
  lastUpdatedAt?: string;
  status?: Status;
}

export interface ModelServiceMutableProps extends CommonModelMutableProps {
  providerSettings?: ProviderSettings;
}

export interface ModelServiceImmutableProps extends CommonModelImmutableProps {
  modelInfoConfigs?: ModelInfoConfig[];
  modelServiceName?: string;
  provider?: string;
}

export interface ModelServiceSystemProps extends CommonModelSystemProps {
  modelServiceId?: string;
}

export interface ModelProxyMutableProps extends CommonModelMutableProps {
  cpu?: number;
  litellmVersion?: string;
  memory?: number;
  modelProxyName?: string;
  proxyModel?: ProxyMode;
  serviceRegionId?: string;
  proxyConfig?: ProxyConfig;
  executionRoleArn?: string;
}

export interface ModelProxyImmutableProps extends CommonModelImmutableProps {}

export interface ModelProxySystemProps extends CommonModelSystemProps {
  endpoint?: string;
  functionName?: string;
  modelProxyId?: string;
}

export interface ModelServiceCreateInput
  extends ModelServiceImmutableProps,
    ModelServiceMutableProps {}

export interface ModelServiceUpdateInput extends ModelServiceMutableProps {}

export interface ModelServiceListInput extends PageableInput {
  modelServiceName?: string;
  modelType?: ModelType;
  provider?: string;
}

/**
 * Model proxy create input
 */
export interface ModelProxyCreateInput
  extends ModelServiceImmutableProps,
    ModelProxyMutableProps {}

/**
 * Model proxy update input
 */
export interface ModelProxyUpdateInput extends ModelServiceMutableProps {
  proxyModel?: string;
  executionRoleArn?: string;
}

/**
 * Model proxy list input
 */
export interface ModelProxyListInput extends PageableInput {
  modelProxyName?: string;
  proxyMode?: string;
  status?: Status;
}

export interface ModelProxyInterface
  extends ModelProxyMutableProps,
    ModelProxyImmutableProps,
    ModelProxySystemProps {}
export interface ModelServiceInterface
  extends ModelServiceMutableProps,
    ModelServiceImmutableProps,
    ModelServiceSystemProps {}

/**
 * Model service data type (complete data structure)
 */
export type ModelServiceData = ModelServiceInterface;

/**
 * Model proxy data type (complete data structure)
 */
export type ModelProxyData = ModelProxyInterface;

