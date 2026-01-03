/**
 * Credential Example / 凭证示例
 *
 * 此示例展示如何使用 AgentRun SDK 创建和管理 Credential。
 * This example demonstrates how to create and manage Credential using AgentRun SDK.
 *
 * 运行前请确保设置了环境变量 / Ensure environment variables are set:
 * - AGENTRUN_ACCESS_KEY_ID
 * - AGENTRUN_ACCESS_KEY_SECRET
 * - AGENTRUN_ACCOUNT_ID
 *
 * 运行方式 / Run with:
 *   npm run example:credential
 */

import {
  Credential,
  CredentialClient,
  CredentialConfig,
  ResourceAlreadyExistError,
  ResourceNotExistError,
} from '../src/index';
import { logger } from '../src/utils/log';

// Logger helper
function log(message: string, ...args: unknown[]) {
  logger.info(`[${new Date().toISOString()}] ${message}`, ...args);
}

const client = new CredentialClient();
const credentialName = 'sdk-test-credential-nodejs';

/**
 * 创建或获取 Credential / Create or get Credential
 */
async function createOrGetCredential(): Promise<Credential> {
  log('创建或获取已有的资源 / Creating or getting existing resource');

  let cred: Credential;

  try {
    cred = await Credential.create({
      input: {
        credentialName,
        description:
          '这是通过 Node.js SDK 创建的测试凭证 / Test credential created by Node.js SDK',
        credentialConfig: CredentialConfig.inboundApiKey({
          apiKey: `sk-test-${Date.now()}`
        }),
      },
    });

    log(`创建成功 / Created successfully: ${cred.credentialId}`);
  } catch (error) {
    if (error instanceof ResourceAlreadyExistError) {
      log('已存在，获取已有资源 / Already exists, getting existing resource');
      cred = await Credential.get({ name: credentialName });
    } else {
      throw error;
    }
  }

  return cred;
}

/**
 * 更新 Credential / Update Credential
 */
async function updateCredential(cred: Credential): Promise<void> {
  log('更新描述为当前时间 / Updating description to current time');

  await cred.update({
    input: { description: `当前时间戳 / Current timestamp: ${Date.now()}` },
  });

  log('更新成功 / Update successful');
  log(`  - Description: ${cred.description}`);
}

/**
 * 列出所有 Credential / List all Credentials
 */
async function listCredentials(): Promise<void> {
  log('枚举资源列表 / Listing resources');

  const credentials = await Credential.listAll();
  log(
    `共有 ${credentials.length} 个资源 / Total ${credentials.length} resources:`,
    credentials.map((c) => c.credentialName)
  );
}

/**
 * 删除 Credential / Delete Credential
 */
async function deleteCredential(cred: Credential): Promise<void> {
  log('开始清理资源 / Starting cleanup');

  await cred.delete();
  log('删除请求已发送 / Delete request sent');

  log('再次尝试获取 / Trying to get again');
  try {
    await cred.refresh();
    log('资源仍然存在 / Resource still exists');
  } catch (error) {
    if (error instanceof ResourceNotExistError) {
      log(
        '得到资源不存在报错，删除成功 / Resource not found, deletion successful'
      );
    } else {
      throw error;
    }
  }
}

/**
 * 主函数 / Main function
 */
async function main() {
  log('==== 凭证模块基本功能示例 / Credential Module Example ====');

  try {
    // List existing credentials
    await listCredentials();

    // Create or get credential
    const cred = await createOrGetCredential();

    // List again
    await listCredentials();

    // Update credential
    await updateCredential(cred);

    // Delete credential
    await deleteCredential(cred);

    // List again to confirm deletion
    await listCredentials();

    log('==== 示例完成 / Example Complete ====');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

main();
