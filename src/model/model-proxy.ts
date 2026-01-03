/**
 * Model Proxy 高层 API / Model Proxy High-Level API
 *
 * 此模块定义模型代理资源的高级API。
 * This module defines the high-level API for model proxy resources.
 */

import * as _ from 'lodash';

import { Config } from '../utils/config';
import { Status } from '../utils/model';
import { PageableInput } from '../utils/model';
import { ResourceBase } from '../utils/resource';

import {
  BackendType,
  ModelProxyCreateInput,
  ModelProxyImmutableProps,
  ModelProxyListInput,
  ModelProxyMutableProps,
  ModelProxySystemProps,
  ModelProxyUpdateInput,
  ProxyMode,
} from './model';

/**
 * 模型代理 / Model Proxy
 */
export class ModelProxy
  extends ResourceBase
  implements
    ModelProxyImmutableProps,
    ModelProxyMutableProps,
    ModelProxySystemProps
{
  // ImmutableProps
  modelType?: ModelProxyImmutableProps['modelType'];

  // MutableProps
  credentialName?: string;
  description?: string;
  networkConfiguration?: ModelProxyMutableProps['networkConfiguration'];
  tags?: string[];
  cpu?: number;
  litellmVersion?: string;
  memory?: number;
  modelProxyName?: string;
  proxyModel?: ProxyMode;
  serviceRegionId?: string;
  proxyConfig?: ModelProxyMutableProps['proxyConfig'];
  executionRoleArn?: string;

  // SystemProps
  endpoint?: string;
  functionName?: string;
  modelProxyId?: string;
  createdAt?: string;
  lastUpdatedAt?: string;
  declare status?: ModelProxySystemProps['status'];

  /**
   * 获取客户端 / Get client
   * 
   * @returns ModelClient 实例
   */
  private static getClient() {
    // 延迟导入以避免循环依赖
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ModelClient } = require('./client');
    return new ModelClient();
  }

  /**
   * 创建模型代理 / Create model proxy
   * 
   * @param params - 参数 / Parameters
   * @returns 创建的模型代理对象 / Created model proxy object
   */
  static async create(params: {
    input: ModelProxyCreateInput;
    config?: Config;
  }): Promise<ModelProxy> {
    const { input, config } = params;
    return await this.getClient().create({ input, config });
  }

  /**
   * 根据名称删除模型代理 / Delete model proxy by name
   * 
   * @param params - 参数 / Parameters
   * @returns 删除的模型代理对象 / Deleted model proxy object
   */
  static async delete(params: {
    name: string;
    config?: Config;
  }): Promise<ModelProxy> {
    const { name, config } = params;
    return await this.getClient().delete({
      name,
      backendType: BackendType.PROXY,
      config
    });
  }

  /**
   * 根据名称更新模型代理 / Update model proxy by name
   * 
   * @param params - 参数 / Parameters
   * @returns 更新后的模型代理对象 / Updated model proxy object
   */
  static async update(params: {
    name: string;
    input: ModelProxyUpdateInput;
    config?: Config;
  }): Promise<ModelProxy> {
    const { name, input, config } = params;
    return await this.getClient().update({ name, input, config });
  }

  /**
   * 根据名称获取模型代理 / Get model proxy by name
   * 
   * @param params - 参数 / Parameters
   * @returns 模型代理对象 / Model proxy object
   */
  static async get(params: {
    name: string;
    config?: Config;
  }): Promise<ModelProxy> {
    const { name, config } = params;
    return await this.getClient().get({
      name,
      backendType: BackendType.PROXY,
      config
    });
  }

  /**
   * 列出模型代理（分页）/ List model proxies (paginated)
   * 
   * @param pageInput - 分页参数 / Pagination parameters
   * @param config - 配置 / Configuration
   * @param kwargs - 其他查询参数 / Other query parameters
   * @returns 模型代理列表 / Model proxy list
   */
  protected static async listPage(
    pageInput: PageableInput,
    config?: Config,
    kwargs?: Partial<ModelProxyListInput>
  ): Promise<ModelProxy[]> {
    return await this.getClient().list({
      input: {
        modelProxyName: undefined, // 标识这是 ModelProxyListInput
        ...kwargs,
        ...pageInput,
      } as ModelProxyListInput,
      config
    });
  }

  /**
   * 列出所有模型代理 / List all model proxies
   * 
   * @param options - 查询选项 / Query options
   * @param config - 配置 / Configuration
   * @returns 模型代理列表 / Model proxy list
   */
  static async listAll(options?: {
    proxyMode?: string;
    status?: Status;
    config?: Config;
  }): Promise<ModelProxy[]> {
    const allResults: ModelProxy[] = [];
    let page = 1;
    const pageSize = 50;
    while (true) {
      const pageResults = await this.listPage(
        { pageNumber: page, pageSize },
        options?.config,
        {
          proxyMode: options?.proxyMode,
          status: options?.status,
        }
      );
      page += 1;
      allResults.push(...pageResults);
      if (pageResults.length < pageSize) break;
    }

    // 去重
    const resultSet = new Set<string>();
    const results: ModelProxy[] = [];
    for (const item of allResults) {
      const uniqId = item.modelProxyId || '';
      if (!resultSet.has(uniqId)) {
        resultSet.add(uniqId);
        results.push(item);
      }
    }
    return results;
  }

  /**
   * 更新模型代理 / Update model proxy
   * 
   * @param input - 模型代理更新输入参数 / Model proxy update input parameters
   * @param config - 配置 / Configuration
   * @returns 更新后的模型代理对象 / Updated model proxy object
   */
  update = async (params: {
    input: ModelProxyUpdateInput;
    config?: Config;
  }): Promise<ModelProxy> => {
    const { input, config } = params;
    if (!this.modelProxyName) {
      throw new Error(
        'modelProxyName is required to update a ModelProxy'
      );
    }

    const result = await ModelProxy.update({
      name: this.modelProxyName,
      input,
      config,
    });
    this.updateSelf(result);

    return this;
  };

  /**
   * 删除模型代理 / Delete model proxy
   * 
   * @param params - 参数 / Parameters
   * @returns 删除的模型代理对象 / Deleted model proxy object
   */
  delete = async (params?: { config?: Config }): Promise<ModelProxy> => {
    if (!this.modelProxyName) {
      throw new Error(
        'modelProxyName is required to delete a ModelProxy'
      );
    }

    return await ModelProxy.delete({ name: this.modelProxyName, config: params?.config });
  };

  /**
   * 刷新模型代理信息 / Refresh model proxy information
   * 
   * @param params - 参数 / Parameters
   * @returns 刷新后的模型代理对象 / Refreshed model proxy object
   */
  get = async (params?: { config?: Config }): Promise<ModelProxy> => {
    if (!this.modelProxyName) {
      throw new Error(
        'modelProxyName is required to refresh a ModelProxy'
      );
    }

    const result = await ModelProxy.get({
      name: this.modelProxyName,
      config: params?.config,
    });
    this.updateSelf(result);

    return this;
  };

  /**
   * 获取模型信息 / Get model information
   * 
   * @param params - 参数 / Parameters
   * @param params.config - 配置 / Configuration
   * @returns 模型基本信息 / Model base information
   */
  modelInfo = async (params?: { config?: Config }): Promise<{
    apiKey: string;
    baseUrl: string;
    model?: string;
    headers?: Record<string, string>;
  }> => {
    const cfg = Config.withConfigs(this._config, params?.config);

    if (!this.modelProxyName) {
      throw new Error('modelProxyName is required');
    }
    if (!this.endpoint) {
      throw new Error('endpoint is required');
    }

    let apiKey = '';
    
    // 如果有 credentialName，从 Credential 获取
    if (this.credentialName) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Credential } = require('../credential/credential');
      const credential = await Credential.get({
        name: this.credentialName,
        config: cfg,
      });
      apiKey = credential.credentialSecret || '';
    }

    // 根据 proxyMode 确定默认模型
    const defaultModel =
      this.proxyModel === 'single'
        ? _.get(this.proxyConfig, 'endpoints[0].modelNames[0]')
        : this.modelProxyName;

    return {
      apiKey: apiKey,
      baseUrl: this.endpoint,
      model: defaultModel,
      headers: cfg.headers,
    };
  };

  /**
   * 调用模型完成 / Call model completion
   * 
   * @param params - 参数 / Parameters
   * @returns 完成结果 / Completion result
   */
  completions = async (params: {
    messages: any[];
    model?: string;
    stream?: boolean;
    config?: Config;
    [key: string]: any;
  }): Promise<
    | import('ai').StreamTextResult<import('ai').ToolSet, any>
    | import('ai').GenerateTextResult<import('ai').ToolSet, any>
  > => {
    const { messages, model, stream = false, config, ...kwargs } = params;
    const info = await this.modelInfo({ config });

    // 使用 AI SDK 实现
    const { generateText, streamText } = await import('ai');
    const { createOpenAI } = await import('@ai-sdk/openai');

    const provider = createOpenAI({
      apiKey: info.apiKey,
      baseURL: info.baseUrl,
      headers: info.headers,
    });

    const selectedModel = model || info.model || this.modelProxyName || '';

    if (stream) {
      return await streamText({
        model: provider(selectedModel),
        messages,
        ...kwargs,
      });
    } else {
      return await generateText({
        model: provider(selectedModel),
        messages,
        ...kwargs,
      });
    }
  };

  /**
   * 获取响应 / Get responses
   * 
   * @param params - 参数 / Parameters
   * @returns 响应结果 / Response result
   */
  responses = async (params: {
    messages: any[];
    model?: string;
    stream?: boolean;
    config?: Config;
    [key: string]: any;
  }): Promise<any> => {
    const { messages, model, stream = false, config, ...kwargs } = params;
    const info = await this.modelInfo({ config });

    // 使用 AI SDK 实现
    const { generateText, streamText } = await import('ai');
    const { createOpenAI } = await import('@ai-sdk/openai');

    const provider = createOpenAI({
      apiKey: info.apiKey,
      baseURL: info.baseUrl,
      headers: info.headers,
    });

    const selectedModel = model || info.model || this.modelProxyName || '';

    if (stream) {
      return await streamText({
        model: provider(selectedModel),
        messages,
        ...kwargs,
      });
    } else {
      return await generateText({
        model: provider(selectedModel),
        messages,
        ...kwargs,
      });
    }
  };

  /**
   * 等待模型代理就绪 / Wait until model proxy is ready
   * 
   * @param options - 选项 / Options
   * @param config - 配置 / Configuration
   * @returns 模型代理对象 / Model proxy object
   */
  waitUntilReady = async (
    options?: {
      timeoutSeconds?: number;
      intervalSeconds?: number;
      beforeCheck?: (proxy: ModelProxy) => void;
    },
    config?: Config
  ): Promise<ModelProxy> => {
    const timeout = (options?.timeoutSeconds ?? 300) * 1000;
    const interval = (options?.intervalSeconds ?? 5) * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await this.refresh({ config });

      if (options?.beforeCheck) {
        options.beforeCheck(this);
      }

      if (this.status === Status.READY) {
        return this;
      }

      if (
        this.status === Status.CREATE_FAILED ||
        this.status === Status.UPDATE_FAILED ||
        this.status === Status.DELETE_FAILED
      ) {
        throw new Error(`Model proxy failed with status: ${this.status}`);
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(
      `Timeout waiting for model proxy to be ready after ${options?.timeoutSeconds ?? 300} seconds`
    );
  };
}
