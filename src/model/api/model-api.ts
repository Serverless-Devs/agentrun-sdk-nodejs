import { Config } from '@/utils';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export interface ModelInfo {
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  provider?: string;
}

export type GetModelInfo = (params?: { config?: Config }) => Promise<ModelInfo>;

export class ModelAPI {
  getModelInfo: GetModelInfo;
  constructor(getModelInfo: GetModelInfo) {
    this.getModelInfo = getModelInfo;
  }
  //   abstract modelInfo(params: { config?: Config }): Promise<ModelInfo>;

  private getProvider = async (params: { model?: string; config?: Config }) => {
    const { model, config } = params;

    const info = await this.getModelInfo({ config });
    const provider = createOpenAICompatible({
      name: model || info.model || '',
      apiKey: info.apiKey,
      baseURL: 'http://127.0.0.1:8080', // info.baseUrl,
      headers: info.headers,
    });

    return { provider, model: model || info.model || '' };
  };

  private getModel = async (params: Parameters<ModelAPI['getProvider']>[0]) => {
    const { provider, model } = await this.getProvider(params);
    return provider(model);
  };

  private getEmbeddingModel = async (
    params: Parameters<ModelAPI['getProvider']>[0]
  ) => {
    const { provider, model } = await this.getProvider(params);
    return provider.embeddingModel(model);
  };

  completion = async (params: {
    messages: any[];
    model?: string;
    stream?: boolean;
    config?: Config;
    [key: string]: any;
  }): Promise<
    | import('ai').StreamTextResult<import('ai').ToolSet, any>
    | import('ai').GenerateTextResult<import('ai').ToolSet, any>
  > => {
    const { messages, model, stream = false, config, ...kwargs } = params;
    const { streamText, generateText } = await import('ai');

    return await (stream ? streamText : generateText)({
      model: await this.getModel({ model, config }),
      messages,
      ...kwargs,
    });
  };

  embedding = async (params: {
    values: string[];
    model?: string;
    stream?: boolean;
    config?: Config;
    [key: string]: any;
  }) => {
    const { values, model, config, ...kwargs } = params;
    const { embedMany } = await import('ai');

    return await embedMany({
      model: await this.getEmbeddingModel({ model, config }),
      values,
      ...kwargs,
    });
  };
}
