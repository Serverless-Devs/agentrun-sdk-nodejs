/**
 * Agent Runtime Example / Agent 运行时示例
 *
 * 此示例展示如何使用 AgentRun SDK 创建和管理 Agent Runtime。
 * This example demonstrates how to create and manage Agent Runtime using AgentRun SDK.
 *
 * 运行前请确保设置了环境变量 / Ensure environment variables are set:
 * - AGENTRUN_ACCESS_KEY_ID
 * - AGENTRUN_ACCESS_KEY_SECRET
 * - AGENTRUN_ACCOUNT_ID
 *
 * 运行方式 / Run with:
 *   npm run example:agent-runtime
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  AgentRuntime,
  AgentRuntimeClient,
  AgentRuntimeLanguage,
  ResourceAlreadyExistError,
  ResourceNotExistError,
  Status,
} from '../src/index';
import { codeFromFile } from '../src/agent-runtime';
import { logger } from '../src/utils/log';

// Logger helper
function log(message: string, ...args: unknown[]) {
  logger.info(`[${new Date().toISOString()}] ${message}`, ...args);
}

const client = new AgentRuntimeClient();
const agentRuntimeName = 'sdk-test-agentruntime-nodejs';

/**
 * 准备测试代码 / Prepare test code
 */
function prepareCode(): string {
  const code = `
const http = require('http');

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello Agent Run from Node.js SDK!');
});

server.listen(9000, () => {
  logger.info('Server running at http://localhost:9000/');
});
`;

  const dirPath = path.join(process.cwd(), 'examples', 'http_server_code');
  const codePath = path.join(dirPath, 'index.js');
  const gitignorePath = path.join(dirPath, '.gitignore');

  // Clean up existing directory
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true });
  }

  // Create directory and files
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(codePath, code.trim());
  fs.writeFileSync(gitignorePath, '*');

  return dirPath;
}

/**
 * 创建或获取 AgentRuntime / Create or get AgentRuntime
 */
async function createOrGetAgentRuntime(): Promise<AgentRuntime> {
  log('创建或获取已有的资源 / Creating or getting existing resource');

  const codePath = prepareCode();
  log(`代码路径 / Code path: ${codePath}`);

  let ar: AgentRuntime | null = null;

  try {
    ar = await AgentRuntime.create({
      input: {
        agentRuntimeName,
        codeConfiguration: await codeFromFile(
          AgentRuntimeLanguage.NODEJS18,
          ['node', 'index.js'],
          codePath
        ),
        port: 9000,
        cpu: 2,
        memory: 4096,
      },
    });

    log(`创建成功 / Created successfully: ${ar.agentRuntimeId}`);
  } catch (error) {
    if (error instanceof ResourceAlreadyExistError) {
      log('已存在，获取已有资源 / Already exists, getting existing resource');
      const runtimes = await client.list({ input: { agentRuntimeName } });
      if (runtimes.length === 0) {
        throw new Error(`AgentRuntime ${agentRuntimeName} not found`);
      }
      ar = runtimes[0];

      // Check if the existing agent is in a failed state
      if (
        ar.status === Status.CREATE_FAILED ||
        ar.status === Status.UPDATE_FAILED ||
        ar.status === Status.DELETE_FAILED
      ) {
        log(
          `已存在的 Agent Runtime 处于失败状态: ${ar.status}, 删除并重新创建 / Existing Agent Runtime is in failed state: ${ar.status}, deleting and recreating`
        );
        await ar.delete();

        // Wait for deletion to complete
        log('等待删除完成 / Waiting for deletion to complete...');
        let deleted = false;
        for (let i = 0; i < 30; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            const runtimes = await client.list({ input: { agentRuntimeName } });
            if (runtimes.length === 0) {
              deleted = true;
              break;
            }
          } catch {
            // Agent not found, deletion complete
            deleted = true;
            break;
          }
        }

        if (!deleted) {
          throw new Error('等待删除超时 / Deletion timeout');
        }
        log('删除完成 / Deletion completed');
        ar = null;
      }
    } else {
      throw error;
    }
  }

  // If agent was deleted due to failed state, create a new one
  if (!ar) {
    log('创建新的 Agent Runtime / Creating new Agent Runtime');
    ar = await AgentRuntime.create({
      input: {
        agentRuntimeName,
        codeConfiguration: await codeFromFile(
          AgentRuntimeLanguage.NODEJS18,
          ['node', 'index.js'],
          codePath
        ),
        port: 9000,
        cpu: 2,
        memory: 4096,
      },
    });
    log(`创建成功 / Created successfully: ${ar.agentRuntimeId}`);
  }

  // Wait for ready or failed
  log('等待就绪 / Waiting for ready...');
  await ar.waitUntilReadyOrFailed({
    beforeCheck: (runtime) =>
      log(`  当前状态 / Current status: ${runtime.status}`),
  });

  if (ar.status !== Status.READY) {
    throw new Error(`状态异常 / Unexpected status: ${ar.status}`);
  }

  log('已就绪 / Ready');
  log(`  - ID: ${ar.agentRuntimeId}`);
  log(`  - Name: ${ar.agentRuntimeName}`);
  log(`  - Status: ${ar.status}`);

  return ar;
}

/**
 * 更新 AgentRuntime / Update AgentRuntime
 */
async function updateAgentRuntime(ar: AgentRuntime): Promise<void> {
  log('更新描述为当前时间 / Updating description to current time');

  await ar.update({
    input: {
      description: `当前时间戳 / Current timestamp: ${Date.now()}`,
    },
  });

  await ar.waitUntilReadyOrFailed({
    beforeCheck: (runtime) =>
      log(`  当前状态 / Current status: ${runtime.status}`),
  });

  if (ar.status !== Status.READY) {
    throw new Error(`状态异常 / Unexpected status: ${ar.status}`);
  }

  log('更新成功 / Update successful');
  log(`  - Description: ${ar.description}`);
}

/**
 * 列出所有 AgentRuntime / List all AgentRuntimes
 */
async function listAgentRuntimes(): Promise<void> {
  log('枚举资源列表 / Listing resources');

  const runtimes = await AgentRuntime.listAll();
  log(
    `共有 ${runtimes.length} 个资源 / Total ${runtimes.length} resources:`,
    runtimes.map((r) => r.agentRuntimeName)
  );
}

/**
 * 删除 AgentRuntime / Delete AgentRuntime
 */
async function deleteAgentRuntime(ar: AgentRuntime): Promise<void> {
  log('开始清理资源 / Starting cleanup');

  await ar.delete();
  log('删除请求已发送 / Delete request sent');

  // Wait for deletion
  log('等待删除完成 / Waiting for deletion...');
  try {
    await ar.waitUntilReady({
      beforeCheck: (runtime) =>
        log(`  当前状态 / Current status: ${runtime.status}`),
    });
  } catch (error) {
    // Expected to fail when resource is deleted
  }

  log('再次尝试获取 / Trying to get again');
  try {
    await ar.refresh();
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
  log('==== Agent 运行时模块基本功能示例 / Agent Runtime Module Example ====');

  try {
    // List existing runtimes
    await listAgentRuntimes();

    // Create or get runtime
    const ar = await createOrGetAgentRuntime();

    // await updateAgentRuntime(ar);

    // Delete runtime
    await deleteAgentRuntime(ar);

    // List again to confirm deletion
    await listAgentRuntimes();

    log('==== 示例完成 / Example Complete ====');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

main();
