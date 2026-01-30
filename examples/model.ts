/**
 * Model Example / 模型示例
 *
 * 此示例展示如何使用 AgentRun SDK 管理 ModelService 和 ModelProxy。
 * This example demonstrates how to manage ModelService and ModelProxy using AgentRun SDK.
 *
 * 运行前请确保设置了环境变量 / Ensure environment variables are set:
 * - AGENTRUN_ACCESS_KEY_ID
 * - AGENTRUN_ACCESS_KEY_SECRET
 * - AGENTRUN_ACCOUNT_ID
 *
 * 运行方式 / Run with:
 *   npm run example:model
 */

import type { ModelProxyCreateInput, ModelServiceCreateInput, ProviderSettings, ProxyConfig } from '../src/index';
import { ModelClient, ModelProxy, ModelService, ModelType, ResourceAlreadyExistError, ResourceNotExistError, Status } from '../src/index';
import { Config } from '../src/utils/config';
import { logger } from '../src/utils/log';

// Logger helper
function log(message: string, ...args: unknown[]) {
  logger.info(`[${new Date().toISOString()}] ${message}`, ...args);
}

// 从环境变量读取配置 / Read configuration from environment variables
const BASE_URL = process.env.BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const API_KEY = process.env.API_KEY || 'sk-xxxxx';
const MODEL_NAMES = (process.env.MODEL_NAMES || 'qwen-max').split(/[\s,]+/).filter(Boolean);

const client = new ModelClient();
const modelServiceName = 'sdk-test-model-service-nodejs';
const modelProxyName = 'sdk-test-model-proxy-nodejs';

/**
 * 创建或获取 ModelService / Create or get ModelService
 */
async function createOrGetModelService(): Promise<ModelService> {
  log('创建或获取已有的资源 / Creating or getting existing resource');

  let ms: ModelService;

  try {
    const providerSettings: ProviderSettings = {
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      modelNames: MODEL_NAMES,
    };

    const input: ModelServiceCreateInput = {
      modelServiceName,
      description: '测试模型服务 / Test Model Service',
      modelType: ModelType.LLM,
      provider: 'openai',
      providerSettings,
    };

    ms = await ModelService.create({ input });
    log(`创建成功 / Created successfully: ${ms.modelServiceId}`);
  } catch (error) {
    if (error instanceof ResourceAlreadyExistError) {
      log('已存在，获取已有资源 / Already exists, getting existing resource');
      ms = await ModelService.get({ name: modelServiceName });
    } else {
      throw error;
    }
  }

  // 等待就绪 / Wait for ready
  await ms.waitUntilReadyOrFailed({
    callback: (service) =>
      log(`  当前状态 / Current status: ${service.status}`),
  });

  if (ms.status !== Status.READY) {
    throw new Error(`状态异常 / Unexpected status: ${ms.status}`);
  }

  log('已就绪状态，当前信息 / Ready state, current info:');
  log(`  - Name: ${ms.modelServiceName}`);
  log(`  - ID: ${ms.modelServiceId}`);
  log(`  - Status: ${ms.status}`);

  return ms;
}

/**
 * 更新 ModelService / Update ModelService
 */
async function updateModelService(ms: ModelService): Promise<void> {
  log('更新描述为当前时间 / Updating description to current time');

  await ms.update({
    input: {
      description: `当前时间戳 / Current timestamp: ${Date.now()}`,
    },
  });

  await ms.waitUntilReadyOrFailed();

  if (ms.status !== Status.READY) {
    throw new Error(`状态异常 / Unexpected status: ${ms.status}`);
  }

  log('更新成功，当前信息 / Update successful, current info:');
  log(`  - Description: ${ms.description}`);
}

/**
 * 列出所有 ModelServices / List all ModelServices
 */
async function listModelServices(): Promise<void> {
  log('枚举资源列表 / Listing resources');

  const services = await ModelService.list({
    input: {
      modelType: ModelType.LLM
    }
  });
  log(
    `共有 ${services.length} 个资源，分别为 / Total ${services.length} resources:`,
    services.map((s) => s.modelServiceName)
  );
}

/**
 * 调用模型服务进行推理 / Invoke model service for inference
 */
async function invokeModelService(ms: ModelService): Promise<void> {
  log('调用模型服务进行推理 / Invoking model service for inference');

  const result = await ms.completion({
    messages: [{ role: 'user', content: '你好,请介绍一下你自己' }],
    stream: true,
  });

  // 流式输出 / Stream output
  if ('textStream' in result && result.textStream) {
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
  }
  logger.info(''); // 换行
}

/**
 * 删除 ModelService / Delete ModelService
 */
async function deleteModelService(ms: ModelService): Promise<void> {
  log('开始清理资源 / Starting cleanup');

  await ms.delete();
  log('删除请求已发送 / Delete request sent');

  // 等待删除完成 / Wait for deletion
  log('再次尝试获取 / Trying to get again');
  try {
    await ms.refresh();
    log('资源仍然存在 / Resource still exists');
  } catch (error) {
    if (error instanceof ResourceNotExistError) {
      log('得到资源不存在报错，删除成功 / Resource not found, deletion successful');
    } else {
      throw error;
    }
  }
}

/**
 * 创建或获取 ModelProxy / Create or get ModelProxy
 */
async function createOrGetModelProxy(): Promise<ModelProxy> {
  log('创建或获取已有的资源 / Creating or getting existing resource');

  let mp: ModelProxy;

  try {
    const cfg = new Config();
    const proxyConfig: ProxyConfig = {
      endpoints: MODEL_NAMES.map((modelName) => ({
        modelNames: [modelName],
        modelServiceName,
      })),
    };

    const input: ModelProxyCreateInput = {
      modelProxyName,
      description: '测试模型治理 / Test Model Proxy',
      modelType: ModelType.LLM,
      executionRoleArn: `acs:ram::${cfg.accountId}:role/aliyunagentrundefaultrole`,
      proxyConfig,
    };

    mp = await ModelProxy.create({ input });
    log(`创建成功 / Created successfully: ${mp.modelProxyId}`);
  } catch (error) {
    if (error instanceof ResourceAlreadyExistError) {
      log('已存在，获取已有资源 / Already exists, getting existing resource');
      mp = await ModelProxy.get({ name: modelProxyName });
    } else {
      throw error;
    }
  }

  // 等待就绪 / Wait for ready
  await mp.waitUntilReadyOrFailed({
    callback: (proxy) =>
      log(`  当前状态 / Current status: ${proxy.status}`),
  });

  if (mp.status !== Status.READY) {
    throw new Error(`状态异常 / Unexpected status: ${mp.status}`);
  }

  log('已就绪状态，当前信息 / Ready state, current info:');
  log(`  - Name: ${mp.modelProxyName}`);
  log(`  - ID: ${mp.modelProxyId}`);
  log(`  - Status: ${mp.status}`);

  return mp;
}

/**
 * 更新 ModelProxy / Update ModelProxy
 */
async function updateModelProxy(mp: ModelProxy): Promise<void> {
  log('更新描述为当前时间 / Updating description to current time');

  const cfg = new Config();
  await mp.update({
    input: {
      executionRoleArn: `acs:ram::${cfg.accountId}:role/aliyunagentrundefaultrole`,
      description: `当前时间戳 / Current timestamp: ${Date.now()}`,
    },
  });

  await mp.waitUntilReadyOrFailed();

  if (mp.status !== Status.READY) {
    throw new Error(`状态异常 / Unexpected status: ${mp.status}`);
  }

  log('更新成功，当前信息 / Update successful, current info:');
  log(`  - Description: ${mp.description}`);
}

/**
 * 列出所有 ModelProxies / List all ModelProxies
 */
async function listModelProxies(): Promise<void> {
  log('枚举资源列表 / Listing resources');

  const proxies = await ModelProxy.list({});
  log(
    `共有 ${proxies.length} 个资源，分别为 / Total ${proxies.length} resources:`,
    proxies.map((p) => p.modelProxyName)
  );
}

/**
 * 调用模型代理进行推理 / Invoke model proxy for inference
 */
async function invokeModelProxy(mp: ModelProxy): Promise<void> {
  log('调用模型代理进行推理 / Invoking model proxy for inference');

  const result = await mp.completion({
    messages: [{ role: 'user', content: '你好,请介绍一下你自己' }],
    stream: true,
  });

  // 流式输出 / Stream output
  if ('textStream' in result && result.textStream) {
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
  }
  logger.info(''); // 换行
}

/**
 * 删除 ModelProxy / Delete ModelProxy
 */
async function deleteModelProxy(mp: ModelProxy): Promise<void> {
  log('开始清理资源 / Starting cleanup');

  await mp.delete();
  log('删除请求已发送 / Delete request sent');

  // 等待删除完成 / Wait for deletion
  log('再次尝试获取 / Trying to get again');
  try {
    await mp.refresh();
    log('资源仍然存在 / Resource still exists');
  } catch (error) {
    if (error instanceof ResourceNotExistError) {
      log('得到资源不存在报错，删除成功 / Resource not found, deletion successful');
    } else {
      throw error;
    }
  }
}

/**
 * 主函数 / Main function
 */
async function main() {
  log('==== 模型模块基本功能示例 / Model Module Example ====');
  log(`    base_url=${BASE_URL}`);
  log(`    api_key=${'*'.repeat(API_KEY.length)}`);
  log(`    model_names=${MODEL_NAMES}`);

  try {
    await listModelServices();
    const ms = await createOrGetModelService();
    await updateModelService(ms);
    
    await invokeModelService(ms);

    await listModelProxies();
    const mp = await createOrGetModelProxy();
    await updateModelProxy(mp);
    // await invokeModelProxy(mp);  // 注释掉 proxy 调用
    await deleteModelProxy(mp);
    await listModelProxies();

    await deleteModelService(ms);
    await listModelServices();

    log('==== 示例完成 / Example Complete ====');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

main();
