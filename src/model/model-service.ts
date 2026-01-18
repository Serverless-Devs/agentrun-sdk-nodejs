/**
 * Model Service 高层 API / Model Service High-Level API
 *
 * 此模块定义模型服务资源的高级API。
 * This module defines the high-level API for model service resources.
 */

import { Config } from '../utils/config';
import { listAllResourcesFunction, ResourceBase } from '../utils/resource';
import { ModelAPI } from './api/model-api';

import {
  BackendType,
  ModelServiceCreateInput,
  ModelServiceImmutableProps,
  ModelServiceListInput,
  ModelServiceMutableProps,
  ModelServiceSystemProps,
  ModelServiceUpdateInput
} from './model';

/**
 * 模型服务 / Model Service
 */
export class ModelService
  extends ResourceBase
  implements
    ModelServiceImmutableProps,
    ModelServiceMutableProps,
    ModelServiceSystemProps
{
  // ImmutableProps
  modelInfoConfigs?: ModelServiceImmutableProps['modelInfoConfigs'];
  modelServiceName?: string;
  provider?: string;

  // MutableProps
  credentialName?: string;
  description?: string;
  networkConfiguration?: ModelServiceMutableProps['networkConfiguration'];
  tags?: string[];
  providerSettings?: ModelServiceMutableProps['providerSettings'];

  // SystemProps
  modelServiceId?: string;
  createdAt?: string;
  lastUpdatedAt?: string;
  declare status?: ModelServiceSystemProps['status'];

  // CommonProps
  modelType?: ModelServiceImmutableProps['modelType'];

  private modelApi: ModelAPI;
  constructor() {
    super();
    this.modelApi = new ModelAPI(this.modelInfo);
    this.completion = this.modelApi.completion;
    this.embedding = this.modelApi.embedding;
  }

  completion: (typeof ModelAPI)['prototype']['completion'];
  embedding: (typeof ModelAPI)['prototype']['embedding'];

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

  uniqIdCallback = () => this.modelServiceId;

  /**
   * 创建模型服务 / Create model service
   *
   * @param params - 参数 / Parameters
   * @returns 创建的模型服务对象 / Created model service object
   */
  static async create(params: {
    input: ModelServiceCreateInput;
    config?: Config;
  }): Promise<ModelService> {
    const { input, config } = params;
    return await this.getClient().create({ input, config });
  }

  /**
   * 根据名称删除模型服务 / Delete model service by name
   *
   * @param params - 参数 / Parameters
   * @returns 删除的模型服务对象 / Deleted model service object
   */
  static async delete(params: {
    name: string;
    config?: Config;
  }): Promise<ModelService> {
    const { name, config } = params;
    return await this.getClient().delete({
      name,
      backendType: BackendType.SERVICE,
      config,
    });
  }

  /**
   * 根据名称更新模型服务 / Update model service by name
   *
   * @param params - 参数 / Parameters
   * @returns 更新后的模型服务对象 / Updated model service object
   */
  static async update(params: {
    name: string;
    input: ModelServiceUpdateInput;
    config?: Config;
  }): Promise<ModelService> {
    const { name, input, config } = params;
    return await this.getClient().update({ name, input, config });
  }

  /**
   * 根据名称获取模型服务 / Get model service by name
   *
   * @param params - 参数 / Parameters
   * @returns 模型服务对象 / Model service object
   */
  static async get(params: {
    name: string;
    config?: Config;
  }): Promise<ModelService> {
    const { name, config } = params;
    return await this.getClient().get({
      name,
      backendType: BackendType.SERVICE,
      config,
    });
  }

  /**
   * 列出模型服务（分页）/ List model services (paginated)
   *
   * @param pageInput - 分页参数 / Pagination parameters
   * @param config - 配置 / Configuration
   * @param kwargs - 其他查询参数 / Other query parameters
   * @returns 模型服务列表 / Model service list
   */
  static list = async (params?: {
    input?: ModelServiceListInput;
    config?: Config;
  }): Promise<ModelService[]> => {
    const { input, config } = params ?? {};

    return await this.getClient().list({
      input: {
        ...input,
      } as ModelServiceListInput,
      config,
    });
  };

  static listAll = listAllResourcesFunction(this.list);

  /**
   * 更新模型服务 / Update model service
   *
   * @param params - 参数 / Parameters
   * @returns 更新后的模型服务对象 / Updated model service object
   */
  update = async (params: {
    input: ModelServiceUpdateInput;
    config?: Config;
  }): Promise<ModelService> => {
    const { input, config } = params;
    if (!this.modelServiceName) {
      throw new Error('modelServiceName is required to update a ModelService');
    }

    const result = await ModelService.update({
      name: this.modelServiceName,
      input,
      config,
    });
    this.updateSelf(result);

    return this;
  };

  /**
   * 删除模型服务 / Delete model service
   *
   * @param config - 配置 / Configuration
   * @returns 删除的模型服务对象 / Deleted model service object
   */
  delete = async (params?: { config?: Config }): Promise<ModelService> => {
    if (!this.modelServiceName) {
      throw new Error('modelServiceName is required to delete a ModelService');
    }

    return await ModelService.delete({
      name: this.modelServiceName,
      config: params?.config,
    });
  };

  /**
   * 刷新模型服务信息 / Refresh model service information
   *
   * @param config - 配置 / Configuration
   * @returns 刷新后的模型服务对象 / Refreshed model service object
   */
  get = async (params?: { config?: Config }): Promise<ModelService> => {
    if (!this.modelServiceName) {
      throw new Error('modelServiceName is required to refresh a ModelService');
    }

    const result = await ModelService.get({
      name: this.modelServiceName,
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
  modelInfo = async (params?: {
    config?: Config;
  }): Promise<{
    apiKey: string;
    baseUrl: string;
    model?: string;
    headers?: Record<string, string>;
    provider?: string;
  }> => {
    const cfg = Config.withConfigs(this._config, params?.config);

    if (!this.providerSettings) {
      throw new Error('providerSettings is required');
    }
    if (!this.providerSettings.baseUrl) {
      throw new Error('providerSettings.baseUrl is required');
    }

    let apiKey = this.providerSettings.apiKey || '';

    // 如果没有 apiKey 但有 credentialName，从 Credential 获取
    if (!apiKey && this.credentialName) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Credential } = require('../credential/credential');
      const credential = await Credential.get({
        name: this.credentialName,
        config: cfg,
      });
      apiKey = credential.credentialSecret || '';
    }

    const defaultModel =
      this.providerSettings.modelNames &&
      this.providerSettings.modelNames.length > 0
        ? this.providerSettings.modelNames[0]
        : undefined;

    return {
      apiKey: apiKey,
      baseUrl: this.providerSettings.baseUrl,
      model: defaultModel,
      headers: cfg.headers,
      provider: this.provider,
    };
  };
}
