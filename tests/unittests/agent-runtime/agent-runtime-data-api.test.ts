import { AgentRuntimeDataAPI } from '../../../src/agent-runtime/api/data';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Config } from '../../../src/utils/config';

const mockCreate = jest.fn();
const mockOpenAIConstructor = jest.fn().mockImplementation(() => ({
  chat: {
    completions: {
      create: mockCreate,
    },
  },
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: mockOpenAIConstructor,
}));

describe('AgentRuntimeDataAPI', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockOpenAIConstructor.mockClear();
  });

  it('should invoke OpenAI with merged config and headers', async () => {
    const config = new Config({
      dataEndpoint: 'https://data.example.com',
      timeout: 1234,
      headers: { 'X-Base': '1' },
    });

    const api = new AgentRuntimeDataAPI('runtime-name', 'endpoint', config);
    const apiBase =
      'https://data.example.com/agent-runtimes/runtime-name/endpoints/endpoint/invocations/openai/v1';

    (api as any).auth = jest
      .fn()
      .mockResolvedValue([apiBase, { 'X-Auth': 'token' }, {}]);

    mockCreate.mockResolvedValue({ ok: true });

    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: 'hello' }];
    const result = await api.invokeOpenai({ messages });

    expect((api as any).auth).toHaveBeenCalledWith(
      apiBase,
      {},
      undefined,
      expect.any(Config)
    );
    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: '',
      baseURL: apiBase,
      defaultHeaders: { 'X-Auth': 'token' },
      timeout: 1234,
    });
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'runtime-name',
      messages,
      stream: false,
    });
    expect(result).toEqual({ ok: true });
  });

  it('should honor stream and config override', async () => {
    const config = new Config({
      dataEndpoint: 'https://data.example.com',
      timeout: 111,
    });
    const override = new Config({ timeout: 222 });
    const api = new AgentRuntimeDataAPI('runtime', 'Default', config);
    const apiBase =
      'https://data.example.com/agent-runtimes/runtime/endpoints/Default/invocations/openai/v1';

    (api as any).auth = jest
      .fn()
      .mockResolvedValue([apiBase, { 'X-Auth': 'token' }, {}]);

    mockCreate.mockResolvedValue('streamed');

    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: 'hi' }];
    const result = await api.invokeOpenai({
      messages,
      stream: true,
      config: override,
    });

    expect(mockOpenAIConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 222,
      })
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: true,
      })
    );
    expect(result).toBe('streamed');
  });
});
