/**
 * Sandbox Example / 沙箱示例
 *
 * 此示例展示如何使用 AgentRun SDK 创建和管理 Sandbox。
 * This example demonstrates how to create and manage Sandbox using AgentRun SDK.
 *
 * 运行前请确保设置了环境变量 / Ensure environment variables are set:
 * - AGENTRUN_ACCESS_KEY_ID
 * - AGENTRUN_ACCESS_KEY_SECRET
 * - AGENTRUN_ACCOUNT_ID
 *
 * 运行方式 / Run with:
 *   bun run examples/sandbox.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import {
  CodeInterpreterSandbox,
  CodeLanguage,
  Sandbox,
  SandboxClient,
  Template,
  TemplateType,
} from '../src/index';
import { logger } from '../src/utils/log';

// Logger helper
function log(message: string, ...args: unknown[]) {
  logger.info(`[${new Date().toISOString()}] ${message}`, ...args);
}

const client = new SandboxClient();

/**
 * 列出模板 / List templates
 */
async function listTemplates(): Promise<void> {
  log('枚举模板列表 / Listing templates');

  const templates = await client.listTemplates();
  log(`共有 ${templates.length} 个模板 / Total ${templates.length} templates:`);

  for (const template of templates) {
    log(
      `  - ${template.templateName} (${template.templateType}) [${template.status}]`
    );
  }
}

/**
 * 列出沙箱 / List sandboxes
 */
async function listSandboxes(): Promise<void> {
  log('枚举沙箱列表 / Listing sandboxes');

  const sandboxes = await client.listSandboxes();
  log(`共有 ${sandboxes.length} 个沙箱 / Total ${sandboxes.length} sandboxes:`);

  for (const sandbox of sandboxes) {
    log(`  - ${sandbox.sandboxId} (${sandbox.state})`);
  }
}

/**
 * Code Interpreter 测试 / Code Interpreter test
 */
async function codeInterpreterExample(): Promise<void> {
  log('='.repeat(60));
  log('开始测试 Code Interpreter / Starting Code Interpreter test');
  log('='.repeat(60));

  const templateName = `sdk-nodejs-template-${Date.now()}`;

  // 创建模板 / Create template
  log('\n--- 创建模板 / Creating template ---');
  const template = await Template.create({
    input: {
      templateName,
      templateType: TemplateType.CODE_INTERPRETER,
      description: 'Test template from Node.js SDK',
      sandboxIdleTimeoutInSeconds: 600,
    }
  });

  log(`✓ 创建模板成功 / Template created: ${template.templateName}`);
  log(`  - 模板 ID: ${template.templateId}`);
  log(`  - 模板状态: ${template.status}`);

  // 等待模板就绪 / Wait for template to be ready
  log('\n--- 等待模板就绪 / Waiting for template to be ready ---');
  await template.waitUntilReadyOrFailed({
    callback: (t) => log(`  当前状态 / Current status: ${t.status}`),
  });
  log('✓ 模板已就绪 / Template is ready');

  // 创建沙箱 / Create sandbox
  log(
    '\n--- 创建 Code Interpreter 沙箱 / Creating Code Interpreter sandbox ---'
  );
  const sandbox = await CodeInterpreterSandbox.createFromTemplate(templateName);
  log(`✓ 创建沙箱成功 / Sandbox created: ${sandbox.sandboxId}`);

  // 等待沙箱运行 / Wait for sandbox to be running
  log('\n--- 等待沙箱运行 / Waiting for sandbox to be running ---');
  await sandbox.waitUntilRunning({
    beforeCheck: (s) => log(`  当前状态 / Current state: ${s.state}`),
  });
  log('✓ 沙箱已运行 / Sandbox is running');

  // 等待沙箱健康检查通过
  log('\n--- 等待沙箱就绪 / Waiting for sandbox to be ready ---');
  await sandbox.waitUntilReadyOrFailed();
  log('✓ 沙箱健康检查通过 / Sandbox is healthy');

  // 测试代码执行上下文
  log('\n--- 测试代码执行上下文 / Testing code execution context ---');
  const ctx = await sandbox.context.create({ language: CodeLanguage.PYTHON });
  log(`✓ 创建上下文成功 / Context created: ${ctx.contextId}`);

  const execResult = await ctx.execute({
    code: "print('Hello from Node.js SDK!')",
  });
  log(`✓ 执行代码结果 / Code execution result:`, execResult);

  const contexts = await ctx.list();
  log(`✓ 上下文列表 / Context list:`, contexts);

  const contextDetails = await ctx.get();
  log(`✓ 获取上下文详情 / Context details: ${contextDetails.contextId}`);

  // 测试文件系统操作 / File system operations
  log('\n--- 测试文件系统操作 / Testing file system operations ---');
  const rootFiles = await sandbox.fileSystem.list({ path: '/' });
  log(`✓ 根目录文件列表 / Root directory listing:`, rootFiles);

  await sandbox.fileSystem.mkdir({ path: '/home/user/test' });
  log(`✓ 创建文件夹 /home/user/test / Created directory /home/user/test`);

  await sandbox.fileSystem.mkdir({ path: '/home/user/test-move' });
  log(
    `✓ 创建文件夹 /home/user/test-move / Created directory /home/user/test-move`
  );

  // 测试上传下载 / Upload/Download test
  log('\n--- 测试上传下载 / Testing upload/download ---');
  const testFilePath = './temp_test_file.txt';
  const testContent =
    '这是一个测试文件,用于验证 Sandbox 文件上传下载功能。\n' +
    'This is a test file for validating Sandbox file upload/download.\n' +
    `创建时间 / Created at: ${new Date().toISOString()}\n`;

  await fs.writeFile(testFilePath, testContent);
  log(`✓ 创建临时测试文件 / Created temp test file: ${testFilePath}`);

  await sandbox.fileSystem.upload({
    localFilePath: testFilePath,
    targetFilePath: '/home/user/test-move/test_file.txt',
  });
  log(`✓ 上传文件成功 / File uploaded successfully`);

  const filestat = await sandbox.fileSystem.stat({
    path: '/home/user/test-move/test_file.txt'
  });
  log(`✓ 上传文件详情 / Uploaded file stat:`, filestat);

  const downloadPath = './downloaded_test_file.txt';
  const downloadResult = await sandbox.fileSystem.download({
    path: '/home/user/test-move/test_file.txt',
    savePath: downloadPath,
  });
  log(`✓ 下载文件结果 / Downloaded file:`, downloadResult);

  // 验证下载的文件内容
  const downloadedContent = await fs.readFile(downloadPath, 'utf-8');
  log(
    `✓ 验证下载文件内容 / Verify downloaded content: ${downloadedContent.slice(
      0,
      50
    )}...`
  );

  // 测试文件读写 / File read/write test
  log('\n--- 测试文件读写 / Testing file read/write ---');
  await sandbox.file.write({
    path: '/home/user/test/test.txt',
    content: 'hello world',
  });
  log(`✓ 写入文件成功 / File written successfully`);

  const readResult = await sandbox.file.read({ path: '/home/user/test/test.txt' });
  log(`✓ 读取文件结果 / File read result:`, readResult);

  // 测试文件移动 / File move test
  log('\n--- 测试文件移动 / Testing file move ---');
  await sandbox.fileSystem.move({
    source: '/home/user/test/test.txt',
    destination: '/home/user/test-move/test2.txt',
  });
  log(`✓ 移动文件成功 / File moved successfully`);

  const movedContent = await sandbox.file.read({
    path: '/home/user/test-move/test2.txt'
  });
  log(`✓ 读取移动后的文件 / Read moved file:`, movedContent);

  // 测试文件详情 / File stat test
  log('\n--- 测试文件详情 / Testing file stat ---');
  const dirStat = await sandbox.fileSystem.stat({ path: '/home/user/test-move' });
  log(`✓ 文件详情 / File stat:`, dirStat);

  // 测试删除文件 / Delete test
  log('\n--- 测试删除文件 / Testing file deletion ---');
  await sandbox.fileSystem.remove({ path: '/home/user/test-move' });
  log(`✓ 删除文件夹成功 / Directory deleted successfully`);

  // 测试进程操作 / Process operations
  log('\n--- 测试进程操作 / Testing process operations ---');
  const processes = await sandbox.process.list();
  log(`✓ 进程列表 / Process list:`, processes);

  const cmdResult = await sandbox.process.cmd({ command: 'ls', cwd: '/' });
  log(`✓ 进程执行结果 / Process execution result:`, cmdResult);

  const processDetails = await sandbox.process.get({ pid: '1' });
  log(`✓ 进程详情 / Process details:`, processDetails);

  // 清理上下文
  await ctx.delete();
  log(`✓ 删除上下文成功 / Context deleted`);

  // 停止沙箱 / Stop sandbox
  log('\n--- 停止沙箱 / Stopping sandbox ---');
  await sandbox.stop();
  log('✓ 沙箱已停止 / Sandbox stopped');

  // 清理资源 / Cleanup
  log('\n--- 清理资源 / Cleaning up ---');

  await sandbox.delete();
  log('✓ 沙箱已删除 / Sandbox deleted');

  await template.delete();
  log('✓ 模板已删除 / Template deleted');

  // 清理临时测试文件 / Clean up temp files
  try {
    await fs.unlink(testFilePath);
    log(`✓ 删除临时测试文件 / Deleted temp test file: ${testFilePath}`);
  } catch (e) {
    // Ignore if file doesn't exist
  }

  try {
    await fs.unlink(downloadPath);
    log(`✓ 删除下载的测试文件 / Deleted downloaded test file: ${downloadPath}`);
  } catch (e) {
    // Ignore if file doesn't exist
  }

  log('\n✓ Code Interpreter 测试完成 / Code Interpreter test complete\n');
}

/**
 * 主函数 / Main function
 */
async function main() {
  log('==== 沙箱模块基本功能示例 / Sandbox Module Example ====');

  try {
    // List existing templates and sandboxes
    await listTemplates();
    await listSandboxes();

    // Run Code Interpreter example
    await codeInterpreterExample();

    // List again to confirm cleanup
    await listTemplates();
    await listSandboxes();

    log('==== 示例完成 / Example Complete ====');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

main();
