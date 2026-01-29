/**
 * Built-in ToolSet Integration Functions
 * 内置工具集集成函数
 *
 * Provides convenient functions for quickly creating common toolset objects.
 * 提供快速创建通用工具集对象的便捷函数。
 */

import { ToolSet, ToolSetClient } from '@/toolset';
import type { Config } from '@/utils/config';

import { CommonToolSet } from './tool';

/**
 * Wrap built-in toolset as CommonToolSet
 * 将内置工具集封装为通用工具集
 *
 * Supports creating CommonToolSet from toolset name or ToolSet instance.
 * 支持从工具集名称或 ToolSet 实例创建通用工具集。
 *
 * @param input - Toolset name or ToolSet instance / 工具集名称或 ToolSet 实例
 * @param config - Configuration object / 配置对象
 * @returns CommonToolSet instance / 通用工具集实例
 *
 * @example
 * ```typescript
 * // Create from toolset name
 * const ts = await toolset("my-toolset");
 *
 * // Create from ToolSet instance
 * const toolsetObj = await new ToolSetClient().get({ name: "my-toolset" });
 * const ts = await toolset(toolsetObj);
 *
 * // Convert to OpenAI functions
 * const openaiTools = ts.toOpenAIFunctions();
 *
 * // Convert to Mastra tools
 * const mastraTools = await ts.toMastra();
 * ```
 */
export async function toolset(
  input: string | ToolSet,
  config?: Config
): Promise<CommonToolSet> {
  const toolsetInstance =
    input instanceof ToolSet
      ? input
      : await new ToolSetClient(config).get({ name: input, config });

  return CommonToolSet.fromAgentRunToolSet(toolsetInstance, config);
}
