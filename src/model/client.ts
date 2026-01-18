/**
 * Model Service 客户端 / Model Service Client
 *
 * 此模块提供模型服务和模型代理的客户端API。
 * This module provides the client API for model services and model proxies.
 */

import * as $AgentRun from "@alicloud/agentrun20250910";
import * as _ from 'lodash';

import { Config } from '../utils/config';
import { HTTPError } from '../utils/exception';

import { ModelControlAPI } from './api/control';
import { BackendType, ModelProxyCreateInput, ModelProxyListInput, ModelProxyUpdateInput, ModelServiceCreateInput, ModelServiceListInput, ModelServiceUpdateInput } from './model';
import { ModelProxy } from './model-proxy';
import { ModelService } from './model-service';

/**
 * Model Service 客户端 / Model Service Client
 *
 * 提供模型服务和模型代理的创建、删除、更新和查询功能。
 * Provides create, delete, update and query functions for model services and model proxies.
 */
export class ModelClient {
  private config?: Config;
  private controlApi: ModelControlAPI;

  /**
   * 初始化客户端 / Initialize client
   *
   * @param config - 配置对象,可选 / Configuration object, optional
   */
  constructor(config?: Config) {
    this.config = config;
    this.controlApi = new ModelControlAPI(config);
  }

  /**
   * 创建模型服务
   * Create model service
   * 
   * @param params - 参数 / Parameters
   * @returns 创建的对象 / Created object
   */
  create = async (params: { input: ModelServiceCreateInput | ModelProxyCreateInput; config?: Config }): Promise<ModelService | ModelProxy> => {
    const { input, config } = params;
    const cfg = Config.withConfigs(this.config, config);
    
    try {
      if ('modelProxyName' in input) {
        // 处理 ModelProxyCreateInput
        const modelProxyInput = input as ModelProxyCreateInput;
        
        // 如果没有设置 proxyModel，根据 endpoints 数量自动判断
        if (!modelProxyInput.proxyModel) {
          const endpoints = _.get(modelProxyInput, 'proxyConfig.endpoints', []);
          modelProxyInput.proxyModel = endpoints.length > 1 ? 'multi' : 'single';
        }

        const createInput = new $AgentRun.CreateModelProxyInput({
          ...modelProxyInput,
          cpu: modelProxyInput.cpu ?? 2, // 默认值 2
          memory: modelProxyInput.memory ?? 4096, // 默认值 4096
          proxyMode: modelProxyInput.proxyModel,
        });

        const result = await this.controlApi.createModelProxy({
          input: createInput,
          config: cfg,
        });
        const proxy = new ModelProxy();
        Object.assign(proxy, result);
        return proxy;
      } else {
        // 处理 ModelServiceCreateInput
        const modelServiceInput = input as ModelServiceCreateInput;
        
        const createInput = new $AgentRun.CreateModelServiceInput({
          ...modelServiceInput,
        });

        const result = await this.controlApi.createModelService({
          input: createInput,
          config: cfg,
        });
        const service = new ModelService();
        Object.assign(service, result);
        return service;
      }
    } catch (e) {
      if (e instanceof HTTPError) {
        const name = 'modelProxyName' in input 
          ? (input as ModelProxyCreateInput).modelProxyName 
          : (input as ModelServiceCreateInput).modelServiceName;
        throw e.toResourceError('Model', name);
      }
      throw e;
    }
  };

  /**
   * 删除模型服务
   * Delete model service
   * 
   * @param params - 参数 / Parameters
   * @returns 删除的对象 / Deleted object
   * 
   * @throws ResourceNotExistError - 模型服务不存在 / Model service does not exist
   */
  delete = async (params: { name: string; backendType?: BackendType; config?: Config }): Promise<ModelService | ModelProxy> => {
    const { name, backendType, config } = params;
    const cfg = Config.withConfigs(this.config, config);
    let error: HTTPError | null = null;
    
    // 如果是 proxy 或未指定类型，先尝试删除 proxy
    if (backendType === 'proxy' || backendType === undefined) {
      try {
        const result = await this.controlApi.deleteModelProxy({
          modelProxyName: name,
          config: cfg,
        });
        const proxy = new ModelProxy();
        Object.assign(proxy, result);
        return proxy;
      } catch (e) {
        if (e instanceof HTTPError) {
          error = e;
        } else {
          throw e;
        }
      }
    }

    // 如果明确指定为 proxy 且出错，抛出错误
    if (backendType === 'proxy' && error !== null) {
      throw error.toResourceError('Model', name);
    }

    // 尝试删除 service
    try {
      const result = await this.controlApi.deleteModelService({
        modelServiceName: name,
        config: cfg,
      });
      const service = new ModelService();
      Object.assign(service, result);
      return service;
    } catch (e) {
      if (e instanceof HTTPError) {
        throw e.toResourceError('Model', name);
      }
      throw e;
    }
  };

  /**
   * 更新模型服务
   * Update model service
   * 
   * @param params - 参数 / Parameters
   * @returns 更新后的模型服务对象 / Updated model service object
   * 
   * @throws ResourceNotExistError - 模型服务不存在 / Model service does not exist
   */
  update = async (params: { name: string; input: ModelServiceUpdateInput | ModelProxyUpdateInput; config?: Config }): Promise<ModelService | ModelProxy> => {
    const { name, input, config } = params;
    const cfg = Config.withConfigs(this.config, config);
    
    if ('proxyModel' in input || 'executionRoleArn' in input) {
      // 处理 ModelProxyUpdateInput
      const modelProxyInput = input as ModelProxyUpdateInput;
      
      try {
        // 如果没有设置 proxyModel，根据 endpoints 数量自动判断
        if (!modelProxyInput.proxyModel && modelProxyInput.proxyModel !== undefined) {
          const endpoints = _.get(modelProxyInput, 'proxyConfig.endpoints', []);
          modelProxyInput.proxyModel = endpoints.length > 1 ? 'multi' : 'single';
        }
        
        const updateInput = new $AgentRun.UpdateModelProxyInput({
          ...modelProxyInput,
          proxyMode: modelProxyInput.proxyModel,
        });
        
        const result = await this.controlApi.updateModelProxy({
          modelProxyName: name,
          input: updateInput,
          config: cfg,
        });
        const proxy = new ModelProxy();
        Object.assign(proxy, result);
        return proxy;
      } catch (e) {
        if (e instanceof HTTPError) {
          throw e.toResourceError('Model', name);
        }
        throw e;
      }
    } else {
      // 处理 ModelServiceUpdateInput
      const modelServiceInput = input as ModelServiceUpdateInput;
      
      try {
        const updateInput = new $AgentRun.UpdateModelServiceInput({
          ...modelServiceInput,
        });
        
        const result = await this.controlApi.updateModelService({
          modelServiceName: name,
          input: updateInput,
          config: cfg,
        });
        const service = new ModelService();
        Object.assign(service, result);
        return service;
      } catch (e) {
        if (e instanceof HTTPError) {
          throw e.toResourceError('Model', name);
        }
        throw e;
      }
    }
  };

  /**
   * 获取模型服务
   * Get model service
   * 
   * @param params - 参数 / Parameters
   * @returns 模型服务对象 / Model service object
   * 
   * @throws ResourceNotExistError - 模型服务不存在 / Model service does not exist
   */
  get = async (params: { name: string; backendType?: BackendType; config?: Config }): Promise<ModelService | ModelProxy> => {
    const { name, backendType, config } = params;
    const cfg = Config.withConfigs(this.config, config);
    let error: HTTPError | null = null;
    
    // 如果是 proxy 或未指定类型，先尝试获取 proxy
    if (backendType === 'proxy' || backendType === undefined) {
      try {
        const result = await this.controlApi.getModelProxy({
          modelProxyName: name,
          config: cfg,
        });
        const proxy = new ModelProxy();
        Object.assign(proxy, result);
        return proxy;
      } catch (e) {
        if (e instanceof HTTPError) {
          error = e;
        } else {
          throw e;
        }
      }
    }

    // 如果明确指定为 proxy 且出错，抛出错误
    if (backendType === 'proxy' && error !== null) {
      throw error.toResourceError('Model', name);
    }

    // 尝试获取 service
    try {
      const result = await this.controlApi.getModelService({
        modelServiceName: name,
        config: cfg,
      });
      const service = new ModelService();
      Object.assign(service, result);
      return service;
    } catch (e) {
      if (e instanceof HTTPError) {
        throw e.toResourceError('Model', name);
      }
      throw e;
    }
  };

  /**
   * 列出模型服务
   * List model services
   * 
   * @param params - 参数 / Parameters
   * @returns 模型服务列表 / Model service list
   */
  list = async (params?: { input?: ModelServiceListInput | ModelProxyListInput; config?: Config }): Promise<ModelService[] | ModelProxy[]> => {
    const { input, config } = params ?? {};
    const cfg = Config.withConfigs(this.config, config);
    
    if (input && 'modelProxyName' in input) {
      // 处理 ModelProxyListInput
      const modelProxyInput = input as ModelProxyListInput;
      
      const request = new $AgentRun.ListModelProxiesRequest({
        ...modelProxyInput,
      });
      
      const result = await this.controlApi.listModelProxies({
        input: request,
        config: cfg,
      });
      return (result.items || []).map(item => {
        const proxy = new ModelProxy();
        Object.assign(proxy, item);
        return proxy;
      });
    } else {
      // 处理 ModelServiceListInput 或无参数（默认列出 ModelService）
      const modelServiceInput = (input ?? {}) as ModelServiceListInput;
      
      const request = new $AgentRun.ListModelServicesRequest({
        ...modelServiceInput,
      });
      
      const result = await this.controlApi.listModelServices({
        input: request,
        config: cfg,
      });
      return (result.items || []).map(item => {
        const service = new ModelService();
        Object.assign(service, item);
        return service;
      });
    }
  };
}
