/**
资源基类模板 / Resource Base Template

此模板用于生成资源对象的基类代码。
This template is used to generate base class code for resource objects.
*/

import { Config } from './config';
import { ResourceNotExistError } from './exception';
import { logger } from './log';
import { isFinalStatus, PageableInput, Status } from './model';

/**
 * 更新对象属性的辅助函数 / Helper function to update object properties
 * 
 * 只复制数据属性,跳过方法和私有属性
 * Only copies data properties, skips methods and private properties
 * 
 * @param target - 目标对象 / Target object
 * @param source - 源对象 / Source object
 */
export function updateObjectProperties(target: any, source: any): void {
  for (const key in source) {
    if (
      Object.prototype.hasOwnProperty.call(source, key) &&
      typeof source[key] !== 'function' &&
      !key.startsWith('_')  // 跳过私有属性
    ) {
      target[key] = source[key];
    }
  }
}

export abstract class ResourceBase {
  status?: Status;
  protected _config?: Config;

  abstract get(params?: { config?: Config }): Promise<any>;
  abstract delete(params?: { config?: Config }): Promise<any>;

  static async list(_params: { input?: PageableInput; config?: Config }) {
    return [] as ThisType<ResourceBase>[];
  }

  static async listAll(params: {
    uniqIdCallback: (item: any) => string;
    input?: Record<string, any>;
    config?: Config;
  }) {
    const { uniqIdCallback, input, config } = params;

    const allResults: any[] = [];
    let page = 1;
    const pageSize = 50;
    while (true) {
      const pageResults = await this.list({
        input: { ...input, pageNumber: page, pageSize: pageSize },
        config,
      });

      page += 1;
      allResults.push(...pageResults);
      if (pageResults.length < pageSize) break;
    }

    const resultSet = new Set<string>();
    const results: any[] = [];
    for (const item of allResults) {
      const uniqId = uniqIdCallback(item);
      if (!resultSet.has(uniqId)) {
        resultSet.add(uniqId);
        results.push(item);
      }
    }

    return results;
  }

  waitUntil = async (params: {
    checkFinishedCallback: (resource: ResourceBase) => Promise<boolean>;
    intervalSeconds?: number;
    timeoutSeconds?: number;
  }): Promise<ResourceBase> => {
    const {
      checkFinishedCallback,
      intervalSeconds = 5,
      timeoutSeconds = 300,
    } = params;

    const startTime = Date.now();
    while (true) {
      if (await checkFinishedCallback(this)) return this;

      if (Date.now() - startTime >= timeoutSeconds * 1000) {
        throw new Error('Timeout waiting for resource to reach desired state');
      }

      await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
    }
  };

  waitUntilReadyOrFailed = async (params: {
    callback: (resource: ResourceBase) => Promise<void>;
    intervalSeconds?: number;
    timeoutSeconds?: number;
  }) => {
    const { callback, intervalSeconds = 5, timeoutSeconds = 300 } = params;

    async function checkFinishedCallback(resource: ResourceBase) {
      await resource.refresh();
      if (callback) await callback(resource);
      logger.debug(`Resource status: ${(resource as any).status}`);

      return isFinalStatus(resource.status);
    }

    return await this.waitUntil({
      checkFinishedCallback,
      intervalSeconds,
      timeoutSeconds,
    });
  };

  delete_and_wait_until_finished = async (params: {
    callback: (resource: ResourceBase) => Promise<void>;
    intervalSeconds?: number;
    timeoutSeconds?: number;
  }) => {
    const { callback, intervalSeconds = 5, timeoutSeconds = 300 } = params;

    try {
      await this.delete();
    } catch (error) {
      if (error instanceof ResourceNotExistError) return;
    }

    async function checkFinishedCallback(resource: ResourceBase) {
      try {
        await resource.refresh();
        if (callback) await callback(resource);
      } catch (error) {
        // Assuming that an error during refresh indicates the resource no longer exists
        if (error instanceof ResourceNotExistError) return true;
        if (resource.status === Status.DELETING) return false;

        throw Error(`Resource status is ${resource.status}`);
      }

      return false;
    }

    return await this.waitUntil({
      checkFinishedCallback,
      intervalSeconds,
      timeoutSeconds,
    });
  };

  refresh = async (params?: { config?: Config }) => await this.get(params);

  /**
   * 更新实例自身的属性 / Update instance properties
   * 
   * @param source - 源对象 / Source object
   */
  updateSelf(source: any): void {
    updateObjectProperties(this, source);
  }

  /**
   * 列出所有资源（带去重）/ List all resources (with deduplication)
   * 
   * @param uniqIdCallback - 唯一ID回调函数 / Unique ID callback function
   * @param config - 配置 / Configuration
   * @param kwargs - 其他查询参数 / Other query parameters
   * @returns 资源列表 / Resource list
   */
  protected static async listAllResources(
    uniqIdCallback: (item: any) => string,
    config?: Config,
    kwargs?: Record<string, any>
  ): Promise<any[]> {
    return await this.listAll({
      uniqIdCallback,
      input: kwargs,
      config,
    });
  }

  setConfig = (config: Config) => {
    this._config = config;
    return this;
  };
}
