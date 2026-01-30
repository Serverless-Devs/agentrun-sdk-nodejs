import { ModelAPI } from '../../../src/model/api/model-api';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

jest.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: jest.fn(),
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
  embedMany: jest.fn(),
}));

describe('ModelAPI', () => {
  const getModelInfo = jest.fn().mockResolvedValue({
    model: 'default-model',
    apiKey: 'test-key',
    headers: { 'X-Test': '1' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('completion (non-stream) uses generateText with provided model', async () => {
    const providerFn = jest.fn().mockReturnValue('model-client');
    const provider = Object.assign(providerFn, {
      embeddingModel: jest.fn().mockReturnValue('embedding-client'),
    });
    (createOpenAICompatible as jest.Mock).mockReturnValue(provider);

    // Lazy import because ModelAPI dynamic-imports from 'ai'
    const { generateText } = await import('ai');
    (generateText as jest.Mock).mockResolvedValue('gen-result');

    const api = new ModelAPI(getModelInfo);
    const result = await api.completion({
      messages: [{ content: 'hi' }],
      model: 'custom-model',
      extra: 'value',
    });

    expect(createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'custom-model', apiKey: 'test-key' })
    );
    expect(providerFn).toHaveBeenCalledWith('custom-model');
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'model-client',
        messages: [{ content: 'hi' }],
        extra: 'value',
      })
    );
    expect(result).toBe('gen-result');
  });

  test('completion (stream) falls back to default model and uses streamText', async () => {
    const providerFn = jest.fn().mockReturnValue('stream-model-client');
    const provider = Object.assign(providerFn, {
      embeddingModel: jest.fn().mockReturnValue('embedding-client'),
    });
    (createOpenAICompatible as jest.Mock).mockReturnValue(provider);

    const { streamText } = await import('ai');
    (streamText as jest.Mock).mockResolvedValue('stream-result');

    const api = new ModelAPI(getModelInfo);
    const result = await api.completion({
      messages: [{ content: 'hello' }],
      stream: true,
    });

    expect(createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'default-model' })
    );
    expect(providerFn).toHaveBeenCalledWith('default-model');
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'stream-model-client',
        messages: [{ content: 'hello' }],
      })
    );
    expect(result).toBe('stream-result');
  });

  test('embedding delegates to embeddingModel and embedMany', async () => {
    const providerFn = jest.fn();
    const provider = Object.assign(providerFn, {
      embeddingModel: jest.fn().mockReturnValue('embedding-client'),
    });
    (createOpenAICompatible as jest.Mock).mockReturnValue(provider);

    const { embedMany } = await import('ai');
    (embedMany as jest.Mock).mockResolvedValue('embed-result');

    const api = new ModelAPI(getModelInfo);
    const result = await api.embedding({
      values: ['a', 'b'],
      model: 'embed-model',
      extra: 'v',
    });

    expect(provider.embeddingModel).toHaveBeenCalledWith('embed-model');
    expect(embedMany).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'embedding-client',
        values: ['a', 'b'],
        extra: 'v',
      })
    );
    expect(result).toBe('embed-result');
  });
});
