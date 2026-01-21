/**
 * Sandbox 单元测试
 *
 * 测试 Sandbox 类的功能。
 * Tests for Sandbox class.
 */

import { Config } from '../../../src/utils/config';
import { ClientError, HTTPError, ServerError } from '../../../src/utils/exception';
import { SandboxState, TemplateType } from '../../../src/sandbox/model';

// Mock SandboxDataAPI
const mockCreateSandbox = jest.fn();
const mockDeleteSandbox = jest.fn();
const mockStopSandbox = jest.fn();
const mockGetSandbox = jest.fn();

jest.mock('../../../src/sandbox/api/sandbox-data', () => {
  return {
    SandboxDataAPI: jest.fn().mockImplementation(() => ({
      createSandbox: mockCreateSandbox,
      deleteSandbox: mockDeleteSandbox,
      stopSandbox: mockStopSandbox,
      getSandbox: mockGetSandbox,
    })),
  };
});

// Mock ControlAPI
const mockGetClient = jest.fn();
jest.mock('../../../src/utils/control-api', () => {
  return {
    ControlAPI: jest.fn().mockImplementation(() => ({
      getClient: mockGetClient,
    })),
  };
});

// Mock @alicloud/agentrun20250910
jest.mock('@alicloud/agentrun20250910', () => {
  const ListSandboxesRequest = jest.fn().mockImplementation((params) => params);
  const Sandbox = jest.fn();
  const MockClient = jest.fn().mockImplementation(() => ({
    listSandboxesWithOptions: jest.fn(),
  }));
  return {
    default: MockClient,
    ListSandboxesRequest,
    Sandbox,
  };
});

// Mock @alicloud/tea-util
jest.mock('@alicloud/tea-util', () => {
  return {
    RuntimeOptions: jest.fn().mockImplementation(() => ({})),
  };
});

import { Sandbox } from '../../../src/sandbox/sandbox';

describe('Sandbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create empty Sandbox', () => {
      const sandbox = new Sandbox();
      expect(sandbox).toBeInstanceOf(Sandbox);
    });

    it('should create Sandbox with data', () => {
      const sandbox = new Sandbox({
        sandboxId: 'sandbox-123',
        sandboxName: 'test-sandbox',
        templateName: 'test-template',
        state: SandboxState.RUNNING,
      });

      expect(sandbox.sandboxId).toBe('sandbox-123');
      expect(sandbox.sandboxName).toBe('test-sandbox');
      expect(sandbox.templateName).toBe('test-template');
      expect(sandbox.state).toBe(SandboxState.RUNNING);
    });

    it('should create Sandbox with config', () => {
      const config = new Config({ accessKeyId: 'test-key' });
      const sandbox = new Sandbox({ sandboxId: 'sandbox-123' }, config);

      expect(sandbox.sandboxId).toBe('sandbox-123');
    });
  });

  describe('fromInnerObject', () => {
    it('should create Sandbox from SDK response', () => {
      const obj = {
        sandboxId: 'sandbox-123',
        sandboxName: 'test-sandbox',
        templateId: 'template-456',
        templateName: 'test-template',
        status: 'Running',
        stateReason: 'Running normally',
        createdAt: '2024-01-01T00:00:00Z',
        lastUpdatedAt: '2024-01-02T00:00:00Z',
        sandboxIdleTimeoutSeconds: 1800,
        endedAt: undefined,
        metadata: { key: 'value' },
        sandboxArn: 'arn:xxx',
        sandboxIdleTTLInSeconds: 3600,
      };

      const sandbox = Sandbox.fromInnerObject(obj);

      expect(sandbox.sandboxId).toBe('sandbox-123');
      expect(sandbox.sandboxName).toBe('test-sandbox');
      expect(sandbox.templateId).toBe('template-456');
      expect(sandbox.state).toBe('Running');
      expect(sandbox.metadata).toEqual({ key: 'value' });
    });

    it('should handle state field instead of status', () => {
      const obj = {
        sandboxId: 'sandbox-123',
        state: 'Ready',
      };

      const sandbox = Sandbox.fromInnerObject(obj);
      expect(sandbox.state).toBe('Ready');
    });
  });

  describe('create', () => {
    it('should create a new sandbox successfully', async () => {
      mockCreateSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'new-sandbox-123',
          templateName: 'test-template',
          status: 'Creating',
        },
      });

      const sandbox = await Sandbox.create({
        templateName: 'test-template',
      });

      expect(sandbox.sandboxId).toBe('new-sandbox-123');
      expect(sandbox.templateName).toBe('test-template');
      expect(mockCreateSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'test-template',
        }),
      );
    });

    it('should create sandbox with all options', async () => {
      mockCreateSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'new-sandbox-123',
          templateName: 'test-template',
        },
      });

      await Sandbox.create({
        templateName: 'test-template',
        sandboxIdleTimeoutSeconds: 3600,
        nasConfig: {
          groupId: 100,
          userId: 100,
          mountPoints: [{ serverAddr: 'nas.example.com:/', mountDir: '/mnt/nas' }],
        },
        ossMountConfig: {
          mountPoints: [{ bucketName: 'test-bucket', bucketPath: '/data', mountDir: '/mnt/oss' }],
        },
      });

      expect(mockCreateSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'test-template',
          sandboxIdleTimeoutSeconds: 3600,
          nasConfig: expect.any(Object),
          ossMountConfig: expect.any(Object),
        }),
      );
    });

    it('should throw ClientError when creation fails', async () => {
      mockCreateSandbox.mockResolvedValue({
        code: 'FAILED',
        message: 'Template not found',
      });

      await expect(
        Sandbox.create({ templateName: 'non-existent-template' }),
      ).rejects.toThrow(ClientError);
    });

    it('should throw ClientError when creation fails with no message', async () => {
      mockCreateSandbox.mockResolvedValue({
        code: 'FAILED',
        message: undefined,
      });

      await expect(
        Sandbox.create({ templateName: 'test-template' }),
      ).rejects.toThrow('Unknown error');
    });

    it('should handle response with null data', async () => {
      mockCreateSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: null,
      });

      const sandbox = await Sandbox.create({ templateName: 'test-template' });
      // Should create sandbox from empty object
      expect(sandbox).toBeDefined();
    });

    it('should handle HTTPError and convert to resource error', async () => {
      const httpError = new HTTPError(404, 'Not Found');
      mockCreateSandbox.mockRejectedValue(httpError);

      await expect(
        Sandbox.create({ templateName: 'test-template' }),
      ).rejects.toThrow();
    });

    it('should call handleError for non-HTTPError exceptions', async () => {
      // Throw a non-HTTPError to trigger handleError
      mockCreateSandbox.mockRejectedValue({
        statusCode: 400,
        message: 'Bad Request',
        data: { requestId: 'req-123' },
      });

      await expect(
        Sandbox.create({ templateName: 'test-template' }),
      ).rejects.toThrow(ClientError);
    });
  });

  describe('delete (static) error handling', () => {
    it('should handle HTTPError on delete', async () => {
      const httpError = new HTTPError(404, 'Not Found');
      mockDeleteSandbox.mockRejectedValue(httpError);

      await expect(Sandbox.delete({ id: 'sandbox-123' })).rejects.toThrow();
    });

    it('should call handleError for non-HTTPError on delete', async () => {
      mockDeleteSandbox.mockRejectedValue({
        statusCode: 500,
        message: 'Internal Server Error',
        data: { requestId: 'req-123' },
      });

      await expect(Sandbox.delete({ id: 'sandbox-123' })).rejects.toThrow(ServerError);
    });
  });

  describe('stop (static) error handling', () => {
    it('should handle HTTPError on stop', async () => {
      const httpError = new HTTPError(404, 'Not Found');
      mockStopSandbox.mockRejectedValue(httpError);

      await expect(Sandbox.stop({ id: 'sandbox-123' })).rejects.toThrow();
    });

    it('should call handleError for non-HTTPError on stop', async () => {
      mockStopSandbox.mockRejectedValue({
        statusCode: 404,
        message: 'Not Found',
        data: { requestId: 'req-123' },
      });

      await expect(Sandbox.stop({ id: 'sandbox-123' })).rejects.toThrow(ClientError);
    });
  });

  describe('get (static) error handling', () => {
    it('should handle HTTPError on get', async () => {
      const httpError = new HTTPError(404, 'Not Found');
      mockGetSandbox.mockRejectedValue(httpError);

      await expect(Sandbox.get({ id: 'sandbox-123' })).rejects.toThrow();
    });

    it('should call handleError for non-HTTPError on get', async () => {
      mockGetSandbox.mockRejectedValue({
        statusCode: 500,
        message: 'Internal Server Error',
        data: { requestId: 'req-123' },
      });

      await expect(Sandbox.get({ id: 'sandbox-123' })).rejects.toThrow(ServerError);
    });
  });

  describe('delete (static)', () => {
    it('should delete sandbox successfully', async () => {
      mockDeleteSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'sandbox-123',
          status: 'Deleting',
        },
      });

      const result = await Sandbox.delete({ id: 'sandbox-123' });

      expect(result.sandboxId).toBe('sandbox-123');
      expect(mockDeleteSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          sandboxId: 'sandbox-123',
        }),
      );
    });

    it('should throw ClientError when deletion fails', async () => {
      mockDeleteSandbox.mockResolvedValue({
        code: 'FAILED',
        message: 'Sandbox not found',
      });

      await expect(Sandbox.delete({ id: 'non-existent' })).rejects.toThrow(
        ClientError,
      );
    });

    it('should throw ClientError when deletion fails with no message', async () => {
      mockDeleteSandbox.mockResolvedValue({
        code: 'FAILED',
        message: undefined,
      });

      await expect(Sandbox.delete({ id: 'sandbox-123' })).rejects.toThrow('Unknown error');
    });

    it('should handle response with null data', async () => {
      mockDeleteSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: null,
      });

      const sandbox = await Sandbox.delete({ id: 'sandbox-123' });
      expect(sandbox).toBeDefined();
    });
  });

  describe('stop (static)', () => {
    it('should stop sandbox successfully', async () => {
      mockStopSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'sandbox-123',
          status: 'Stopped',
        },
      });

      const result = await Sandbox.stop({ id: 'sandbox-123' });

      expect(result.sandboxId).toBe('sandbox-123');
      expect(mockStopSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          sandboxId: 'sandbox-123',
        }),
      );
    });

    it('should throw ClientError when stop fails', async () => {
      mockStopSandbox.mockResolvedValue({
        code: 'FAILED',
        message: 'Cannot stop sandbox',
      });

      await expect(Sandbox.stop({ id: 'sandbox-123' })).rejects.toThrow(
        ClientError,
      );
    });

    it('should throw ClientError when stop fails with no message', async () => {
      mockStopSandbox.mockResolvedValue({
        code: 'FAILED',
        message: undefined,
      });

      await expect(Sandbox.stop({ id: 'sandbox-123' })).rejects.toThrow('Unknown error');
    });

    it('should handle response with null data', async () => {
      mockStopSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: null,
      });

      const sandbox = await Sandbox.stop({ id: 'sandbox-123' });
      expect(sandbox).toBeDefined();
    });
  });

  describe('get (static)', () => {
    it('should get sandbox successfully', async () => {
      mockGetSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'sandbox-123',
          templateName: 'test-template',
          status: 'Running',
        },
      });

      const result = await Sandbox.get({ id: 'sandbox-123' });

      expect(result.sandboxId).toBe('sandbox-123');
      expect(result.templateName).toBe('test-template');
    });

    it('should throw ClientError when get fails', async () => {
      mockGetSandbox.mockResolvedValue({
        code: 'FAILED',
        message: 'Sandbox not found',
      });

      await expect(Sandbox.get({ id: 'non-existent' })).rejects.toThrow(
        ClientError,
      );
    });

    it('should throw ClientError when get fails with no message', async () => {
      mockGetSandbox.mockResolvedValue({
        code: 'FAILED',
        message: undefined,
      });

      await expect(Sandbox.get({ id: 'sandbox-123' })).rejects.toThrow('Unknown error');
    });

    it('should handle response with null data', async () => {
      mockGetSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: null,
      });

      const sandbox = await Sandbox.get({ id: 'sandbox-123' });
      expect(sandbox).toBeDefined();
    });

    it('should return CodeInterpreterSandbox when templateType is CODE_INTERPRETER', async () => {
      mockGetSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'sandbox-123',
          templateName: 'ci-template',
          status: 'Running',
        },
      });

      const result = await Sandbox.get({
        id: 'sandbox-123',
        templateType: TemplateType.CODE_INTERPRETER,
      });

      // Should be CodeInterpreterSandbox instance
      expect(result.sandboxId).toBe('sandbox-123');
    });

    it('should return BrowserSandbox when templateType is BROWSER', async () => {
      mockGetSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'sandbox-123',
          templateName: 'browser-template',
          status: 'Running',
        },
      });

      const result = await Sandbox.get({
        id: 'sandbox-123',
        templateType: TemplateType.BROWSER,
      });

      expect(result.sandboxId).toBe('sandbox-123');
    });

    it('should return AioSandbox when templateType is AIO', async () => {
      mockGetSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'sandbox-123',
          templateName: 'aio-template',
          status: 'Running',
        },
      });

      const result = await Sandbox.get({
        id: 'sandbox-123',
        templateType: TemplateType.AIO,
      });

      expect(result.sandboxId).toBe('sandbox-123');
    });

    it('should return CustomSandbox when templateType is CUSTOM', async () => {
      mockGetSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'sandbox-123',
          templateName: 'custom-template',
          status: 'Running',
        },
      });

      const result = await Sandbox.get({
        id: 'sandbox-123',
        templateType: TemplateType.CUSTOM,
      });

      expect(result.sandboxId).toBe('sandbox-123');
    });
  });

  describe('list', () => {
    it('should list sandboxes successfully', async () => {
      const mockClient = {
        listSandboxesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              sandboxes: [
                { sandboxId: 'sandbox-1', status: 'Running' },
                { sandboxId: 'sandbox-2', status: 'Ready' },
              ],
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Sandbox.list();

      expect(result).toHaveLength(2);
      expect(result[0].sandboxId).toBe('sandbox-1');
      expect(result[1].sandboxId).toBe('sandbox-2');
    });

    it('should list sandboxes with filters', async () => {
      const mockClient = {
        listSandboxesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              sandboxes: [{ sandboxId: 'sandbox-1', status: 'Running' }],
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await Sandbox.list({
        templateName: 'test-template',
        status: 'Running',
        maxResults: 10,
      });

      expect(mockClient.listSandboxesWithOptions).toHaveBeenCalled();
    });

    it('should handle empty list', async () => {
      const mockClient = {
        listSandboxesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              sandboxes: [],
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Sandbox.list();

      expect(result).toHaveLength(0);
    });

    it('should handle API error with 4xx status', async () => {
      const mockClient = {
        listSandboxesWithOptions: jest.fn().mockRejectedValue({
          statusCode: 400,
          message: 'Bad Request',
          data: { requestId: 'req-123' },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(Sandbox.list()).rejects.toThrow(ClientError);
    });

    it('should handle API error with 5xx status', async () => {
      const mockClient = {
        listSandboxesWithOptions: jest.fn().mockRejectedValue({
          statusCode: 500,
          message: 'Internal Server Error',
          data: { requestId: 'req-123' },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(Sandbox.list()).rejects.toThrow(ServerError);
    });

    it('should handle response with null sandboxes array', async () => {
      const mockClient = {
        listSandboxesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              sandboxes: null,
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Sandbox.list();
      expect(result).toEqual([]);
    });

    it('should handle response with undefined data', async () => {
      const mockClient = {
        listSandboxesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: undefined,
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Sandbox.list();
      expect(result).toEqual([]);
    });

    it('should handle API error with empty message', async () => {
      const mockClient = {
        listSandboxesWithOptions: jest.fn().mockRejectedValue({
          statusCode: 500,
          message: '',
          data: { requestId: 'req-123' },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(Sandbox.list()).rejects.toThrow(ServerError);
    });
  });

  describe('handleError', () => {
    it('should throw ClientError for 4xx status codes', () => {
      const error = {
        statusCode: 404,
        message: 'Not Found',
        data: { requestId: 'req-123' },
      };

      expect(() => (Sandbox as any).handleError(error)).toThrow(ClientError);
    });

    it('should throw ServerError for 5xx status codes', () => {
      const error = {
        statusCode: 500,
        message: 'Internal Server Error',
        data: { requestId: 'req-123' },
      };

      expect(() => (Sandbox as any).handleError(error)).toThrow(ServerError);
    });

    it('should rethrow unknown errors', () => {
      const error = new Error('Unknown error');

      expect(() => (Sandbox as any).handleError(error)).toThrow('Unknown error');
    });
  });

  describe('instance methods', () => {
    describe('get (instance)', () => {
      it('should refresh sandbox data', async () => {
        mockGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            templateName: 'test-template',
            status: 'Running',
          },
        });

        const sandbox = new Sandbox({ sandboxId: 'sandbox-123' });
        const result = await sandbox.get();

        expect(result.sandboxId).toBe('sandbox-123');
      });
    });

    describe('delete (instance)', () => {
      it('should delete this sandbox', async () => {
        mockDeleteSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            status: 'Deleting',
          },
        });

        const sandbox = new Sandbox({ sandboxId: 'sandbox-123' });
        const result = await sandbox.delete();

        expect(result).toBe(sandbox);
        expect(result.state).toBe('Deleting');
      });

      it('should throw error if sandboxId is not set', async () => {
        const sandbox = new Sandbox();

        await expect(sandbox.delete()).rejects.toThrow(
          'sandboxId is required to delete a Sandbox',
        );
      });
    });

    describe('stop (instance)', () => {
      it('should stop this sandbox', async () => {
        mockStopSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            status: 'Stopped',
          },
        });

        const sandbox = new Sandbox({ sandboxId: 'sandbox-123' });
        const result = await sandbox.stop();

        expect(result).toBe(sandbox);
        expect(result.state).toBe('Stopped');
      });

      it('should throw error if sandboxId is not set', async () => {
        const sandbox = new Sandbox();

        await expect(sandbox.stop()).rejects.toThrow(
          'sandboxId is required to stop a Sandbox',
        );
      });
    });

    describe('refresh (instance)', () => {
      it('should refresh this sandbox', async () => {
        mockGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            status: 'Running',
          },
        });

        const sandbox = new Sandbox({ sandboxId: 'sandbox-123' });
        const result = await sandbox.refresh();

        expect(result).toBe(sandbox);
        expect(result.state).toBe('Running');
      });

      it('should throw error if sandboxId is not set', async () => {
        const sandbox = new Sandbox();

        await expect(sandbox.refresh()).rejects.toThrow(
          'sandboxId is required to refresh a Sandbox',
        );
      });
    });

    describe('waitUntilRunning', () => {
      it('should return immediately if already running', async () => {
        mockGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            status: 'Running',
          },
        });

        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.CREATING,
        });

        const result = await sandbox.waitUntilRunning({
          timeoutSeconds: 5,
          intervalSeconds: 0.1,
        });

        expect(result).toBe(sandbox);
        expect(result.state).toBe('Running');
      });

      it('should return when status becomes READY', async () => {
        mockGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            status: 'READY',
          },
        });

        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.CREATING,
        });

        const result = await sandbox.waitUntilRunning({
          timeoutSeconds: 5,
          intervalSeconds: 0.1,
        });

        expect(result.state).toBe('READY');
      });

      it('should call beforeCheck callback', async () => {
        mockGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            status: 'Running',
          },
        });

        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.CREATING,
        });

        const beforeCheck = jest.fn();

        await sandbox.waitUntilRunning({
          timeoutSeconds: 5,
          intervalSeconds: 0.1,
          beforeCheck,
        });

        expect(beforeCheck).toHaveBeenCalled();
      });

      it('should throw error if sandbox fails', async () => {
        mockGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            status: 'Failed',
            stateReason: 'Resource limit exceeded',
          },
        });

        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.CREATING,
        });

        await expect(
          sandbox.waitUntilRunning({
            timeoutSeconds: 5,
            intervalSeconds: 0.1,
          }),
        ).rejects.toThrow('Sandbox failed: Resource limit exceeded');
      });

      it('should throw timeout error', async () => {
        mockGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            status: 'Creating',
          },
        });

        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.CREATING,
        });

        await expect(
          sandbox.waitUntilRunning({
            timeoutSeconds: 0.1,
            intervalSeconds: 0.05,
          }),
        ).rejects.toThrow('Timeout waiting for Sandbox to be running');
      });
    });
  });
});
