/**
 * AgentRun Mastra Integration Module
 * AgentRun 与 Mastra 的集成模块
 *
 * Provides integration functions for using AgentRun resources with Mastra framework.
 * This module handles all Mastra-specific conversions to avoid dependencies in builtin module.
 *
 * 提供将 AgentRun 资源与 Mastra 框架集成的函数。
 * 本模块处理所有 Mastra 特定的转换，避免在 builtin 模块中引入依赖。
 */

import '@/utils/version-check';

import { TemplateType } from '@/sandbox';
import type { Config } from '@/utils/config';
import { logger } from '@/utils/log';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { fromJSONSchema } from 'zod';

import type { ToolsInput } from '@mastra/core/agent';
import type { ToolAction, ToolExecutionContext } from '@mastra/core/tools';

import {
  model as builtinModel,
  toolset as builtinToolset,
  sandboxToolset,
  type CanonicalTool,
  type CommonToolSet,
} from '../builtin';

/**
 * Mastra Tool type - a ToolAction with any schema types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MastraTool = ToolAction<any, any, any, any, any, string>;

/**
 * Convert CommonToolSet to Mastra tools map
 * 将 CommonToolSet 转换为 Mastra 工具映射
 *
 * This is the core conversion function that transforms builtin tools to Mastra format.
 * Returns a Record<string, MastraTool> compatible with ToolsInput.
 */
async function convertToolSetToMastra(
  toolSet: CommonToolSet,
  options?: {
    prefix?: string;
    filterByName?: (name: string) => boolean;
  }
): Promise<ToolsInput> {
  const tools = toolSet.tools(options);
  const mastraTools: ToolsInput = {};

  for (const tool of tools) {
    try {
      const mastraTool = await convertToolToMastra(tool);
      mastraTools[tool.name] = mastraTool;
    } catch (error) {
      logger.warn(`Failed to convert tool '${tool.name}' to Mastra format:`, error);
    }
  }

  return mastraTools;
}

/**
 * Convert a single CanonicalTool to Mastra tool
 * 将单个 CanonicalTool 转换为 Mastra 工具
 */
async function convertToolToMastra(tool: CanonicalTool): Promise<MastraTool> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema = fromJSONSchema(tool.parameters as any);

  return createMastraTool({
    id: tool.name,
    description: tool.description,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputSchema: schema as any,
    execute: async (input: unknown) => {
      if (tool.func) {
        return await tool.func(input);
      }
      return { error: 'No function implementation' };
    },
  });
}

/**
 * Get Mastra-compatible model from AgentRun ModelService/ModelProxy name
 * 根据 AgentRun ModelService/ModelProxy name 获取 Mastra 可直接使用的 model
 *
 * @example
 * ```typescript
 * const llm = await model({ name: 'qwen-max' });
 * const agent = createAgent({ model: llm });
 * ```
 */
export async function model(params: {
  name: string;
  modelName?: string;
  config?: Config;
}): Promise<LanguageModelV3> {
  const { name, modelName: specificModel, config } = params;

  // Use builtin model to get CommonModel
  const commonModel = await builtinModel(name, {
    model: specificModel,
    config,
  });

  // Get model info and create OpenAI-compatible provider
  const info = await commonModel.getModelInfo(config);

  const provider = createOpenAICompatible({
    name: specificModel || info.model || '',
    baseURL: info.baseUrl,
    apiKey: info.apiKey,
    headers: info.headers,
  });

  return provider(specificModel || info.model || '');
}

/**
 * Create a Mastra tool from ToolAction definition
 * 从 ToolAction 定义创建 Mastra 工具
 *
 * This is a low-level function for creating custom Mastra tools.
 */
export async function createMastraTool<
  TId extends string = string,
  TSchemaIn = unknown,
  TSchemaOut = unknown,
  TSuspend = unknown,
  TResume = unknown,
  TContext extends ToolExecutionContext<TSuspend, TResume> = ToolExecutionContext<
    TSuspend,
    TResume
  >,
>(
  params: ToolAction<TSchemaIn, TSchemaOut, TSuspend, TResume, TContext, TId>
): Promise<ToolAction<TSchemaIn, TSchemaOut, TSuspend, TResume, TContext, TId>> {
  const { createTool } = await import('@mastra/core/tools');
  return await createTool(params);
}

/**
 * Get Mastra-compatible tools from AgentRun ToolSet name
 * 根据 AgentRun 工具集 name 获取 Mastra 可直接使用的 tools
 *
 * Returns a ToolsInput map that can be directly used with Mastra Agent.
 *
 * @example
 * ```typescript
 * const tools = await toolset({ name: 'my-toolset' });
 * const agent = new Agent({ tools });
 * ```
 */
export async function toolset(params: { name: string; config?: Config }): Promise<ToolsInput> {
  const { name, config } = params;

  // Use builtin toolset to get CommonToolSet
  const commonToolSet = await builtinToolset(name, config);

  // Convert to Mastra tools using local converter
  return convertToolSetToMastra(commonToolSet);
}

/**
 * Get Mastra-compatible sandbox tools from AgentRun sandbox template
 * 根据 AgentRun 沙箱模板获取 Mastra 可直接使用的 sandbox 工具
 *
 * Returns a ToolsInput map that can be directly used with Mastra Agent.
 *
 * @param params.templateName - Name of the sandbox template
 * @param params.templateType - Type of sandbox (CODE_INTERPRETER or BROWSER)
 * @param params.sandboxIdleTimeoutSeconds - Idle timeout in seconds (default: 300)
 * @param params.config - Configuration object
 *
 * @example
 * ```typescript
 * // Get code interpreter tools
 * const codeTools = await sandbox({
 *   templateName: 'my-code-interpreter-template',
 *   templateType: TemplateType.CODE_INTERPRETER,
 * });
 *
 * // Get browser automation tools
 * const browserTools = await sandbox({
 *   templateName: 'my-browser-template',
 *   templateType: TemplateType.BROWSER,
 * });
 *
 * // Use with Mastra agent
 * const agent = new Agent({
 *   tools: { ...codeTools },
 *   model: await model({ name: 'qwen-max' }),
 * });
 * ```
 */
export async function sandbox(params: {
  templateName: string;
  templateType?: TemplateType;
  sandboxIdleTimeoutSeconds?: number;
  config?: Config;
}): Promise<ToolsInput> {
  const { templateName, templateType, sandboxIdleTimeoutSeconds, config } = params;

  // Use builtin sandboxToolset
  const toolsetInstance = await sandboxToolset(templateName, {
    templateType,
    sandboxIdleTimeoutSeconds,
    config,
  });

  // Convert to Mastra tools using local converter
  return convertToolSetToMastra(toolsetInstance);
}

/**
 * Create Mastra-compatible code interpreter tools
 * 创建 Mastra 兼容的代码解释器工具
 *
 * Shorthand for sandbox() with CODE_INTERPRETER type.
 *
 * @example
 * ```typescript
 * const tools = await codeInterpreter({
 *   templateName: 'my-template',
 * });
 *
 * const agent = new Agent({
 *   tools,
 *   model: await model({ name: 'qwen-max' }),
 * });
 * ```
 */
export async function codeInterpreter(params: {
  templateName: string;
  sandboxIdleTimeoutSeconds?: number;
  config?: Config;
}): Promise<ToolsInput> {
  return sandbox({
    ...params,
    templateType: TemplateType.CODE_INTERPRETER,
  });
}

/**
 * Create Mastra-compatible browser automation tools
 * 创建 Mastra 兼容的浏览器自动化工具
 *
 * Shorthand for sandbox() with BROWSER type.
 *
 * @example
 * ```typescript
 * const tools = await browser({
 *   templateName: 'my-browser-template',
 * });
 *
 * const agent = new Agent({
 *   tools,
 *   model: await model({ name: 'qwen-max' }),
 * });
 * ```
 */
export async function browser(params: {
  templateName: string;
  sandboxIdleTimeoutSeconds?: number;
  config?: Config;
}): Promise<ToolsInput> {
  return sandbox({
    ...params,
    templateType: TemplateType.BROWSER,
  });
}

// Export converter for event conversion
export { MastraConverter, type AgentEventItem } from './converter';
