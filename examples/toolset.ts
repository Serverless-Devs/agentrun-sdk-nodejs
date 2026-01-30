/**
 * ToolSet Example / 工具集示例
 *
 * 此示例展示如何使用 AgentRun SDK 管理和调用 ToolSet。
 * This example demonstrates how to manage and invoke ToolSet using AgentRun SDK.
 *
 * 运行前请确保设置了环境变量 / Ensure environment variables are set:
 * - AGENTRUN_ACCESS_KEY_ID
 * - AGENTRUN_ACCESS_KEY_SECRET
 * - AGENTRUN_ACCOUNT_ID
 *
 * 运行方式 / Run with:
 *   npm run example:toolset
 */

import { ToolSetClient } from '../src/index';
import { logger } from '../src/utils/log';

/**
 * ToolSet 示例 / ToolSet Example
 */
async function toolsetExample() {
  const client = new ToolSetClient();

  // 示例1: 使用百度搜索工具（OpenAPI）
  // Example 1: Using Baidu Search Tool (OpenAPI)
  logger.info('==== OpenAPI ToolSet Example ====');
  try {
    const baiduToolset = await client.get({
      name: 'web-search-baidu-8wox', // 替换为您的百度搜索工具名称
    });

    logger.info('ToolSet Info:', baiduToolset);
    logger.info('ToolSet Type:', baiduToolset.type());

    // 使用统一的 listTools() 接口，返回 ToolInfo 列表
    // Use unified listTools() interface, returns ToolInfo list
    const tools = await baiduToolset.listTools();
    logger.info('Available Tools:', JSON.stringify(tools, null, 2));

    // 调用工具 / Call tool
    const result = await baiduToolset.callTool('baidu_search', {
      body: { search_input: '比特币价格' },
    });
    logger.info('Tool Result:', result);
  } catch (error) {
    logger.error('Error with Baidu Search Tool:', error);
    logger.info('Skipping Baidu Search Tool example (tool not found)');
  }

  // 示例2: 使用 MCP 时间工具
  // Example 2: Using MCP Time Tool
  logger.info('\n==== MCP ToolSet Example ====');
  try {
    const mcpToolset = await client.get({
      name: 'start-mcp-time-ggda', // 替换为您的 MCP 时间工具名称
    });

    logger.info('ToolSet Info:', mcpToolset);
    logger.info('ToolSet Type:', mcpToolset.type());

    // 使用统一的 listTools() 接口，返回 ToolInfo 列表
    // Use unified listTools() interface, returns ToolInfo list
    const tools = await mcpToolset.listTools();
    logger.info('Available Tools:', JSON.stringify(tools, null, 2));

    // 调用工具 / Call tool
    const result = await mcpToolset.callTool('get_current_time', { timezone: 'Asia/Shanghai' });
    logger.info('Tool Result:', result);
  } catch (error) {
    logger.error('Error with MCP Time Tool:', error);
    logger.info('Skipping MCP Time Tool example (tool not found)');
  }

  logger.info('\n==== Example Complete ====');
}

/**
 * 主函数 / Main function
 */
async function main() {
  try {
    await toolsetExample();
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

main();
