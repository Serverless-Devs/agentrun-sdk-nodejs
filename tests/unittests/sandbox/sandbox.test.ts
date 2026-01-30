/**
 * Sandbox 单元测试
 *
 * 测试 Sandbox 类的功能。
 * Tests for Sandbox class.
 */

import { Config } from '../../../src/utils/config';
import { ClientError, HTTPError } from '../../../src/utils/exception';
import { SandboxState, TemplateType } from '../../../src/sandbox/model';

// Mock SandboxClient
const mockClientCreateSandbox = jest.fn();
const mockClientDeleteSandbox = jest.fn();
const mockClientStopSandbox = jest.fn();
const mockClientGetSandbox = jest.fn();
const mockClientListSandboxes = jest.fn();

jest.mock('../../../src/sandbox/client', () => {
  return {
    SandboxClient: jest.fn().mockImplementation(() => ({
      createSandbox: mockClientCreateSandbox,
      deleteSandbox: mockClientDeleteSandbox,
      stopSandbox: mockClientStopSandbox,
      getSandbox: mockClientGetSandbox,
      listSandboxes: mockClientListSandboxes,
    })),
  };
});

// Mock SandboxDataAPI for Sandbox.get
const mockDataApiGetSandbox = jest.fn();
jest.mock('../../../src/sandbox/api/sandbox-data', () => {
  return {
    SandboxDataAPI: jest.fn().mockImplementation(() => ({
      getSandbox: mockDataApiGetSandbox,
    })),
    ResourceType: {
      Sandbox: 'sandbox',
    },
  };
});

// Mock specialized sandbox classes
jest.mock('../../../src/sandbox/code-interpreter-sandbox', () => {
  return {
    CodeInterpreterSandbox: jest.fn().mockImplementation((sandbox, config) => ({
      ...sandbox,
      _config: config,
      type: 'CodeInterpreter',
    })),
  };
});

jest.mock('../../../src/sandbox/browser-sandbox', () => {
  return {
    BrowserSandbox: jest.fn().mockImplementation((sandbox, config) => ({
      ...sandbox,
      _config: config,
      type: 'Browser',
    })),
  };
});

jest.mock('../../../src/sandbox/aio-sandbox', () => {
  return {
    AioSandbox: jest.fn().mockImplementation((sandbox, config) => ({
      ...sandbox,
      _config: config,
      type: 'AIO',
    })),
  };
});

jest.mock('../../../src/sandbox/custom-sandbox', () => {
  return {
    CustomSandbox: jest.fn().mockImplementation((sandbox, config) => ({
      ...sandbox,
      _config: config,
      type: 'Custom',
    })),
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
        status: SandboxState.RUNNING,
        state: SandboxState.RUNNING,
      };

      const sandbox = Sandbox.fromInnerObject(obj);
      expect(sandbox.sandboxId).toBe('sandbox-123');
      expect(sandbox.sandboxName).toBe('test-sandbox');
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
      const mockSandbox = new Sandbox({
        sandboxId: 'new-sandbox-123',
        templateName: 'test-template',
        state: SandboxState.CREATING,
      });
      mockClientCreateSandbox.mockResolvedValue(mockSandbox);

      const sandbox = await Sandbox.create({
        input: {
          templateName: 'test-template',
        },
      });

      expect(sandbox.sandboxId).toBe('new-sandbox-123');
      expect(sandbox.templateName).toBe('test-template');
      expect(mockClientCreateSandbox).toHaveBeenCalled();
    });

    it('should throw ClientError when creation fails', async () => {
      mockClientCreateSandbox.mockRejectedValue(new ClientError(400, 'Template not found'));

      await expect(
        Sandbox.create({ input: { templateName: 'non-existent-template' } })
      ).rejects.toThrow(ClientError);
    });
  });

  describe('delete (static)', () => {
    it('should delete sandbox successfully', async () => {
      const mockSandbox = new Sandbox({
        sandboxId: 'sandbox-123',
        state: SandboxState.DELETING,
      });
      mockClientDeleteSandbox.mockResolvedValue(mockSandbox);

      const result = await Sandbox.delete({ id: 'sandbox-123' });

      expect(result.sandboxId).toBe('sandbox-123');
      expect(mockClientDeleteSandbox).toHaveBeenCalledWith({
        id: 'sandbox-123',
      });
    });

    it('should throw ClientError when deletion fails', async () => {
      mockClientDeleteSandbox.mockRejectedValue(new ClientError(404, 'Sandbox not found'));

      await expect(Sandbox.delete({ id: 'non-existent' })).rejects.toThrow(ClientError);
    });
  });

  describe('stop (static)', () => {
    it('should stop sandbox successfully', async () => {
      const mockSandbox = new Sandbox({
        sandboxId: 'sandbox-123',
        state: SandboxState.STOPPED,
      });
      mockClientStopSandbox.mockResolvedValue(mockSandbox);

      const result = await Sandbox.stop({ id: 'sandbox-123' });

      expect(result.sandboxId).toBe('sandbox-123');
      expect(mockClientStopSandbox).toHaveBeenCalledWith({
        id: 'sandbox-123',
      });
    });

    it('should throw ClientError when stop fails', async () => {
      mockClientStopSandbox.mockRejectedValue(new ClientError(404, 'Sandbox not found'));

      await expect(Sandbox.stop({ id: 'non-existent' })).rejects.toThrow(ClientError);
    });
  });

  describe('get (static)', () => {
    it('should get sandbox successfully', async () => {
      mockDataApiGetSandbox.mockResolvedValue({
        code: 'SUCCESS',
        data: {
          sandboxId: 'sandbox-123',
          templateName: 'test-template',
          state: SandboxState.RUNNING,
        },
      });

      const result = await Sandbox.get({ id: 'sandbox-123' });

      expect(result.sandboxId).toBe('sandbox-123');
    });

    it('should throw ClientError when get fails', async () => {
      mockDataApiGetSandbox.mockResolvedValue({
        code: 'FAILED',
        message: 'Sandbox not found',
      });

      await expect(Sandbox.get({ id: 'non-existent' })).rejects.toThrow(ClientError);
    });
  });

  describe('list', () => {
    it('should list sandboxes successfully', async () => {
      const mockSandboxes = [
        new Sandbox({ sandboxId: 'sandbox-1', templateName: 'template-1' }),
        new Sandbox({ sandboxId: 'sandbox-2', templateName: 'template-2' }),
      ];
      mockClientListSandboxes.mockResolvedValue(mockSandboxes);

      const result = await Sandbox.list({});

      expect(result).toHaveLength(2);
      expect(mockClientListSandboxes).toHaveBeenCalled();
    });

    it('should handle empty list', async () => {
      mockClientListSandboxes.mockResolvedValue([]);

      const result = await Sandbox.list({});

      expect(result).toEqual([]);
    });

    it('should throw ClientError on API error', async () => {
      mockClientListSandboxes.mockRejectedValue(new ClientError(500, 'Server error'));

      await expect(Sandbox.list({})).rejects.toThrow(ClientError);
    });
  });

  describe('instance methods', () => {
    describe('delete (instance)', () => {
      it('should delete this sandbox', async () => {
        const deletedSandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.DELETING,
        });
        mockClientDeleteSandbox.mockResolvedValue(deletedSandbox);

        const sandbox = new Sandbox({ sandboxId: 'sandbox-123' });
        const result = await sandbox.delete();

        expect(result).toBe(sandbox);
        expect(mockClientDeleteSandbox).toHaveBeenCalled();
      });

      it('should throw error if sandboxId is not set', async () => {
        const sandbox = new Sandbox({});

        await expect(sandbox.delete()).rejects.toThrow('sandboxId is required to delete a Sandbox');
      });
    });

    describe('stop (instance)', () => {
      it('should stop this sandbox', async () => {
        const stoppedSandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.STOPPED,
        });
        mockClientStopSandbox.mockResolvedValue(stoppedSandbox);

        const sandbox = new Sandbox({ sandboxId: 'sandbox-123' });
        const result = await sandbox.stop();

        expect(result).toBe(sandbox);
        expect(mockClientStopSandbox).toHaveBeenCalled();
      });

      it('should throw error if sandboxId is not set', async () => {
        const sandbox = new Sandbox({});

        await expect(sandbox.stop()).rejects.toThrow('sandboxId is required to stop a Sandbox');
      });
    });

    describe('refresh (instance)', () => {
      it('should refresh this sandbox', async () => {
        mockDataApiGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            state: SandboxState.RUNNING,
          },
        });

        const sandbox = new Sandbox({ sandboxId: 'sandbox-123' });
        const result = await sandbox.refresh();

        expect(result).toBe(sandbox);
        expect(mockDataApiGetSandbox).toHaveBeenCalled();
      });

      it('should throw error if sandboxId is not set', async () => {
        const sandbox = new Sandbox({});

        await expect(sandbox.refresh()).rejects.toThrow(
          'sandboxId is required to refresh a Sandbox'
        );
      });
    });

    describe('waitUntilRunning', () => {
      it('should return immediately if already running', async () => {
        mockDataApiGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            state: SandboxState.RUNNING,
          },
        });

        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.RUNNING,
        });

        const result = await sandbox.waitUntilRunning({
          timeoutSeconds: 5,
          intervalSeconds: 0.1,
        });

        expect(result).toBe(sandbox);
      });

      it('should return when status becomes READY', async () => {
        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.CREATING,
        });

        // First call returns CREATING, second call returns READY
        mockDataApiGetSandbox
          .mockResolvedValueOnce({
            code: 'SUCCESS',
            data: { sandboxId: 'sandbox-123', state: SandboxState.CREATING },
          })
          .mockResolvedValueOnce({
            code: 'SUCCESS',
            data: { sandboxId: 'sandbox-123', state: SandboxState.READY },
          });

        const result = await sandbox.waitUntilRunning({
          timeoutSeconds: 5,
          intervalSeconds: 0.1,
        });

        expect(result.state).toBe(SandboxState.READY);
      });

      it('should call beforeCheck callback', async () => {
        mockDataApiGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            state: SandboxState.RUNNING,
          },
        });

        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.RUNNING,
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
        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.CREATING,
        });

        mockDataApiGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            state: SandboxState.FAILED,
            stateReason: 'Resource limit exceeded',
          },
        });

        await expect(
          sandbox.waitUntilRunning({
            timeoutSeconds: 5,
            intervalSeconds: 0.1,
          })
        ).rejects.toThrow('Sandbox failed: Resource limit exceeded');
      });

      it('should throw timeout error', async () => {
        const sandbox = new Sandbox({
          sandboxId: 'sandbox-123',
          state: SandboxState.CREATING,
        });

        mockDataApiGetSandbox.mockResolvedValue({
          code: 'SUCCESS',
          data: {
            sandboxId: 'sandbox-123',
            state: SandboxState.CREATING,
          },
        });

        await expect(
          sandbox.waitUntilRunning({
            timeoutSeconds: 0.1,
            intervalSeconds: 0.05,
          })
        ).rejects.toThrow('Timeout waiting for Sandbox to be running');
      });
    });
  });
});
