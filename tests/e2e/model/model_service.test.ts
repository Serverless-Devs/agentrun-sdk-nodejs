/**
 * ModelService 模块的 E2E 测试 (逐行翻译自 Python 版本)
 *
 * 测试覆盖:
 * - 创建 ModelService
 * - 获取 ModelService
 * - 列举 ModelService
 * - 更新 ModelService
 * - 删除 ModelService
 */

import {
  ModelClient,
  ModelService,
  BackendType,
  ModelType,
  type ModelServiceCreateInput,
  type ModelServiceUpdateInput,
  type ProviderSettings,
} from '../../../src/model';
import { Status } from '../../../src/utils/model';
import { ResourceNotExistError, ResourceAlreadyExistError } from '../../../src/utils/exception';
import { logger } from '../../../src/utils/log';

// 测试配置
const API_KEY = process.env.API_KEY || 'sk-test-key';
const BASE_URL = process.env.BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL_NAMES = ['qwen-flash', 'qwen-max'];

describe('test model service', () => {
  it('test lifecycle', async () => {
    const modelServiceName = `e2e-model-service-${Date.now()}`;
    logger.info('Testing model service lifecycle for:', modelServiceName);

    const client = new ModelClient();
    const time1 = new Date();

    // 创建 model service
    const ms = await ModelService.create({
      input: {
        modelServiceName,
        description: '原始描述',
        modelType: ModelType.LLM,
        provider: 'openai',
        providerSettings: {
          apiKey: API_KEY,
          baseUrl: BASE_URL,
          modelNames: MODEL_NAMES,
        } as ProviderSettings,
      },
    });
    await ms.waitUntilReadyOrFailed();

    const time2 = new Date();

    const ms2 = (await client.get({
      name: modelServiceName,
      backendType: BackendType.SERVICE,
    })) as ModelService;

    // 检查返回的内容是否符合预期
    let preCreatedAt = new Date();

    const assertModelService = (ms: ModelService) => {
      expect(ms.status).toEqual(Status.READY);
      expect(ms.modelServiceName).toEqual(modelServiceName);
      expect(ms.modelType).toEqual(ModelType.LLM);
      expect(ms.provider).toEqual('openai');
      expect(ms.providerSettings).toBeDefined();
      expect(ms.providerSettings?.baseUrl).toEqual(BASE_URL);
      expect(ms.providerSettings?.modelNames).toEqual(MODEL_NAMES);
      expect(ms.description).toEqual('原始描述');

      expect(ms.createdAt).toBeDefined();
      const createdAt = new Date(ms.createdAt!);
      expect(createdAt.getTime()).toBeGreaterThan(time1.getTime());
      expect(ms.lastUpdatedAt).toBeDefined();
      const updatedAt = new Date(ms.lastUpdatedAt!);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
      // 由于网络延迟,updatedAt可能略大于 time2,放宽到 time2 + 1秒
      expect(updatedAt.getTime()).toBeLessThanOrEqual(time2.getTime() + 1000);

      preCreatedAt = createdAt;
    };

    assertModelService(ms);
    assertModelService(ms2);
    expect(ms).not.toBe(ms2);
    const ms3 = ms;

    // 更新 model service
    const newDescription = `更新后的描述 - ${Date.now()}`;
    await ms.update({
      input: {
        description: newDescription,
      },
    });
    await ms.waitUntilReadyOrFailed();

    // 检查返回的内容是否符合预期
    const assertModelService2 = (ms: ModelService) => {
      expect(ms.status).toEqual(Status.READY);
      expect(ms.modelServiceName).toEqual(modelServiceName);
      expect(ms.modelType).toEqual(ModelType.LLM);
      expect(ms.provider).toEqual('openai');
      expect(ms.providerSettings).toBeDefined();
      expect(ms.providerSettings?.baseUrl).toEqual(BASE_URL);
      expect(ms.description).toEqual(newDescription);

      expect(ms.createdAt).toBeDefined();
      const createdAt = new Date(ms.createdAt!);
      expect(preCreatedAt.getTime()).toEqual(createdAt.getTime());
      expect(createdAt.getTime()).toBeGreaterThan(time1.getTime());
      expect(ms.lastUpdatedAt).toBeDefined();
      const updatedAt = new Date(ms.lastUpdatedAt!);
      expect(updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
    };

    assertModelService2(ms);
    assertModelService2(ms3);
    assertModelService(ms2);
    expect(ms3).toBe(ms);

    // 获取 model service
    await ms2.get();
    assertModelService2(ms2);

    // 列举 model services
    const msList = (await client.list({
      input: {
        modelType: ModelType.LLM,
      },
    })) as ModelService[];
    expect(msList.length).toBeGreaterThan(0);
    let matchedMs = 0;
    for (const m of msList) {
      if (m.modelServiceName === modelServiceName) {
        matchedMs++;
        assertModelService2(m);
      }
    }
    expect(matchedMs).toBe(1);

    // 尝试重复创建
    await expect(
      client.create({
        input: {
          modelServiceName,
          description: '重复创建',
          modelType: ModelType.LLM,
          provider: 'openai',
          providerSettings: {
            apiKey: API_KEY,
            baseUrl: BASE_URL,
            modelNames: MODEL_NAMES,
          } as ProviderSettings,
        },
      })
    ).rejects.toThrow(ResourceAlreadyExistError);

    // 删除
    await ms.delete();
    // 等待删除完成
    while (true) {
      try {
        await ms.get();
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        if (error instanceof ResourceNotExistError) {
          break;
        }
        throw error;
      }
    }

    // 尝试重复删除
    await expect(ms.delete()).rejects.toThrow(ResourceNotExistError);

    // 验证删除
    await expect(
      client.get({ name: modelServiceName, backendType: BackendType.SERVICE })
    ).rejects.toThrow(ResourceNotExistError);
  });
});
