/**
 * Data API Mock
 *
 * 模拟 AgentRun 数据面 API 的行为。
 * Mock for AgentRun Data API behavior.
 */

/**
 * Mock Data API Client
 *
 * Provides mock implementations of AgentRun Data API methods
 */
export interface MockDataAPIClient {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
  postFile: jest.Mock;
  getFile: jest.Mock;
  getVideo: jest.Mock;
  withPath: jest.Mock;
}

/**
 * Create a mock Data API client with default implementations
 */
export function createMockDataAPI(): MockDataAPIClient {
  return {
    get: jest.fn().mockResolvedValue({}),
    post: jest.fn().mockResolvedValue({}),
    put: jest.fn().mockResolvedValue({}),
    patch: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    postFile: jest.fn().mockResolvedValue({ success: true }),
    getFile: jest.fn().mockResolvedValue({ savedPath: '/mock/path', size: 1024 }),
    getVideo: jest.fn().mockResolvedValue({ savedPath: '/mock/video.mp4', size: 10240 }),
    withPath: jest.fn().mockImplementation((path: string, query?: Record<string, unknown>) => {
      let url = `https://mock-api.example.com/agents/${path}`;
      if (query && Object.keys(query).length > 0) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
          if (value !== undefined && value !== null) {
            params.set(key, String(value));
          }
        }
        url += '?' + params.toString();
      }
      return url;
    }),
  };
}

/**
 * Mock responses for common Data API operations
 */
export const mockDataAPIResponses = {
  // OpenAI-compatible chat completion response
  chatCompletion: {
    id: 'chatcmpl-mock-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'mock-model',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'This is a mock response.',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  },

  // Streaming response chunks
  streamingChunks: [
    { id: 'chatcmpl-mock-1', object: 'chat.completion.chunk', choices: [{ delta: { content: 'Hello' } }] },
    { id: 'chatcmpl-mock-2', object: 'chat.completion.chunk', choices: [{ delta: { content: ' World' } }] },
    { id: 'chatcmpl-mock-3', object: 'chat.completion.chunk', choices: [{ delta: {}, finish_reason: 'stop' }] },
  ],

  // File upload response
  fileUpload: {
    success: true,
    fileId: 'file-mock-123',
    filename: 'uploaded-file.txt',
  },

  // Code execution response
  codeExecution: {
    success: true,
    output: 'Hello, World!',
    exitCode: 0,
  },
};

/**
 * Create a mock HTTP request handler
 *
 * This can be used to simulate HTTP responses for data API calls
 */
export function createMockHTTPHandler() {
  const responses: Map<string, any> = new Map();
  const requestLog: Array<{ method: string; url: string; body?: any }> = [];

  return {
    // Register a mock response for a URL pattern
    on: (method: string, urlPattern: string | RegExp, response: any) => {
      const key = `${method.toUpperCase()}:${urlPattern.toString()}`;
      responses.set(key, response);
    },

    // Handle a request
    handle: async (method: string, url: string, body?: any) => {
      requestLog.push({ method, url, body });

      // Find matching response
      for (const [key, response] of responses.entries()) {
        const [reqMethod, pattern] = key.split(':', 2);
        if (reqMethod !== method.toUpperCase()) continue;

        if (pattern.startsWith('/') && pattern.endsWith('/')) {
          // Regex pattern
          const regex = new RegExp(pattern.slice(1, -1));
          if (regex.test(url)) {
            return typeof response === 'function' ? response(url, body) : response;
          }
        } else if (url.includes(pattern)) {
          return typeof response === 'function' ? response(url, body) : response;
        }
      }

      // Default: return empty response
      return {};
    },

    // Get request log
    getRequestLog: () => [...requestLog],

    // Clear request log
    clearLog: () => {
      requestLog.length = 0;
    },

    // Reset all mocks
    reset: () => {
      responses.clear();
      requestLog.length = 0;
    },
  };
}

/**
 * Setup Data API mock
 *
 * This function sets up the mock for the Data API module.
 */
export function setupDataAPIMock(): MockDataAPIClient {
  return createMockDataAPI();
}


