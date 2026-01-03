/**
 * Model module exports
 */

export { ModelClient } from "./client";
export { ModelService } from "./model-service";
export { ModelProxy } from "./model-proxy";

// Re-export ControlAPI for advanced usage
export { ControlAPI as ModelControlAPI } from "../utils/control-api";

export { BackendType, ModelType, Provider } from "./model";

export type {
  ProviderSettings,
  ModelFeatures,
  ModelProperties,
  ModelParameterRule,
  ModelInfoConfig,
  ModelServiceCreateInput,
  ModelServiceUpdateInput,
  ModelServiceListInput,
  ModelServiceData,
  ProxyConfigEndpoint,
  ProxyConfigFallback,
  ProxyConfigPolicies,
  ProxyConfig,
  ModelProxyCreateInput,
  ModelProxyUpdateInput,
  ModelProxyListInput,
  ModelProxyData,
} from "./model";
