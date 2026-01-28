/**
 * Built-in Model Integration Functions
 * 内置模型集成函数
 *
 * Provides convenient functions for quickly creating common model objects.
 * 提供快速创建通用模型对象的便捷函数。
 */

import { ModelClient, ModelService, ModelProxy, BackendType } from '@/model';
import type { Config } from '@/utils/config';
import { logger } from '@/utils/log';

/**
 * Model arguments interface
 */
export interface ModelArgs {
  /** Model name to request */
  model?: string;
  /** Backend type (proxy or service) */
  backendType?: BackendType;
  /** Configuration object */
  config?: Config;
}

/**
 * Common Model wrapper class
 * 通用模型封装类
 *
 * Wraps AgentRun model and provides cross-framework conversion capabilities.
 */
export class CommonModel {
  private modelObj: ModelService | ModelProxy;
  private _backendType?: BackendType;
  private specificModel?: string;
  private _config?: Config;

  constructor(options: {
    modelObj: ModelService | ModelProxy;
    backendType?: BackendType;
    specificModel?: string;
    config?: Config;
  }) {
    this.modelObj = options.modelObj;
    this._backendType = options.backendType;
    this.specificModel = options.specificModel;
    this._config = options.config;
  }

  /**
   * Get model info
   */
  async getModelInfo(config?: Config): Promise<{
    baseUrl: string;
    apiKey?: string;
    model: string;
    headers?: Record<string, string>;
  }> {
    const info = await this.modelObj.modelInfo({ config: config ?? this._config });
    return {
      baseUrl: info.baseUrl || '',
      apiKey: info.apiKey,
      model: this.specificModel || info.model || '',
      headers: info.headers,
    };
  }

  /**
   * Get the underlying model object
   */
  get model(): ModelService | ModelProxy {
    return this.modelObj;
  }

  /**
   * Get backend type
   */
  get backendType(): BackendType | undefined {
    return this._backendType;
  }

  /**
   * Get model name from the underlying model object
   */
  private getModelName(): string {
    if (this.modelObj instanceof ModelProxy) {
      return this.modelObj.modelProxyName || '';
    }
    if (this.modelObj instanceof ModelService) {
      return this.modelObj.modelServiceName || '';
    }
    return '';
  }

  /**
   * Convert to Mastra-compatible model
   * Returns a model compatible with Mastra framework using AI SDK
   */
  async toMastra(): Promise<unknown> {
    try {
      const { model: getMastraModel } = await import('../mastra');
      return getMastraModel({
        name: this.getModelName(),
        modelName: this.specificModel,
      });
    } catch (error) {
      logger.warn('Failed to convert model to Mastra format:', error);
      throw error;
    }
  }

  /**
   * Convert to OpenAI-compatible configuration
   * Returns configuration that can be used with OpenAI SDK
   */
  async toOpenAI(): Promise<{
    baseURL: string;
    apiKey?: string;
    defaultHeaders?: Record<string, string>;
    defaultQuery?: Record<string, string>;
  }> {
    const info = await this.getModelInfo();
    return {
      baseURL: info.baseUrl,
      apiKey: info.apiKey,
      defaultHeaders: info.headers,
    };
  }
}

/**
 * Get AgentRun model and wrap as CommonModel
 * 获取 AgentRun 模型并封装为通用 Model 对象
 *
 * Equivalent to ModelClient.get(), but returns a CommonModel object.
 * 等价于 ModelClient.get()，但返回通用 Model 对象。
 *
 * @param input - AgentRun model name, ModelProxy, or ModelService instance
 * @param args - Additional arguments (model, backendType, config)
 * @returns CommonModel instance
 *
 * @example
 * ```typescript
 * // Create from model name
 * const m = await model("qwen-max");
 *
 * // Create from ModelProxy
 * const proxy = await new ModelClient().get({ name: "my-proxy", backendType: "proxy" });
 * const m = await model(proxy);
 *
 * // Create from ModelService
 * const service = await new ModelClient().get({ name: "my-service", backendType: "service" });
 * const m = await model(service);
 *
 * // Convert to Mastra model
 * const mastraModel = await m.toMastra();
 *
 * // Get OpenAI-compatible config
 * const openaiConfig = await m.toOpenAI();
 * ```
 */
export async function model(
  input: string | ModelProxy | ModelService,
  args?: ModelArgs
): Promise<CommonModel> {
  const config = args?.config;
  const backendType = args?.backendType;
  const specificModel = args?.model;

  let modelObj: ModelService | ModelProxy;
  let resolvedBackendType: BackendType | undefined = backendType;

  if (typeof input === 'string') {
    const client = new ModelClient(config);
    modelObj = await client.get({ name: input, backendType, config });

    // Determine backend type from result
    if (modelObj instanceof ModelProxy) {
      resolvedBackendType = BackendType.PROXY;
    } else if (modelObj instanceof ModelService) {
      resolvedBackendType = BackendType.SERVICE;
    }
  } else if (input instanceof ModelProxy) {
    modelObj = input;
    resolvedBackendType = BackendType.PROXY;
  } else if (input instanceof ModelService) {
    modelObj = input;
    resolvedBackendType = BackendType.SERVICE;
  } else {
    throw new TypeError('input must be string, ModelProxy, or ModelService');
  }

  return new CommonModel({
    modelObj,
    backendType: resolvedBackendType,
    specificModel,
    config,
  });
}
