/**
 * SandboxClient 单元测试
 *
 * 测试 SandboxClient 类的功能。
 * Tests for SandboxClient class.
 */

import {
  SandboxState,
  TemplateNetworkMode,
  TemplateType,
} from '../../../src/sandbox/model';
import { Config } from '../../../src/utils/config';

// Mock SandboxControlAPI
const mockControlApi = {
  createTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  getTemplate: jest.fn(),
  listTemplates: jest.fn(),
  createSandbox: jest.fn(),
  deleteSandbox: jest.fn(),
  stopSandbox: jest.fn(),
  getSandbox: jest.fn(),
  listSandboxes: jest.fn(),
};

jest.mock('../../../src/sandbox/api/control', () => {
  return {
    SandboxControlAPI: jest.fn().mockImplementation(() => mockControlApi),
  };
});

// Mock Template class
jest.mock('../../../src/sandbox/template', () => {
  const actualTemplate = jest.requireActual('../../../src/sandbox/template');
  return {
    ...actualTemplate,
    Template: jest.fn().mockImplementation((data, config) => ({
      ...data,
      _config: config,
    })),
  };
});

// Mock Sandbox class
jest.mock('../../../src/sandbox/sandbox', () => {
  return {
    Sandbox: {
      get: jest.fn(),
      fromInnerObject: jest.fn((data, config) => ({ ...data, _config: config })),
    },
  };
});

// Mock CodeInterpreterSandbox
const mockCodeInterpreterCreateFromTemplate = jest.fn();
jest.mock('../../../src/sandbox/code-interpreter-sandbox', () => {
  return {
    CodeInterpreterSandbox: {
      createFromTemplate: (...args: any[]) =>
        mockCodeInterpreterCreateFromTemplate(...args),
    },
  };
});

// Mock BrowserSandbox
const mockBrowserCreateFromTemplate = jest.fn();
jest.mock('../../../src/sandbox/browser-sandbox', () => {
  return {
    BrowserSandbox: {
      createFromTemplate: (...args: any[]) =>
        mockBrowserCreateFromTemplate(...args),
    },
  };
});

import { SandboxClient } from '../../../src/sandbox/client';
import { Sandbox } from '../../../src/sandbox/sandbox';

describe('SandboxClient', () => {
  let client: SandboxClient;
  let config: Config;

  beforeEach(() => {
    jest.clearAllMocks();
    config = new Config({
      accessKeyId: 'test-access-key',
      accessKeySecret: 'test-secret',
      accountId: 'test-account',
    });
    client = new SandboxClient(config);
  });

  describe('constructor', () => {
    it('should create client without config', () => {
      const clientWithoutConfig = new SandboxClient();
      expect(clientWithoutConfig).toBeInstanceOf(SandboxClient);
    });

    it('should create client with config', () => {
      expect(client).toBeInstanceOf(SandboxClient);
    });
  });

  describe('Template Operations', () => {
    describe('createTemplate', () => {
      it('should create template successfully', async () => {
        const mockResponse = {
          templateId: 'template-123',
          templateName: 'test-template',
        };
        mockControlApi.createTemplate.mockResolvedValue(mockResponse);

        const result = await client.createTemplate({
          input: {
            templateName: 'test-template',
            templateType: TemplateType.CODE_INTERPRETER,
          },
        });

        expect(result.templateId).toBe('template-123');
        expect(mockControlApi.createTemplate).toHaveBeenCalled();
      });

      it('should create template with network configuration', async () => {
        const mockResponse = {
          templateId: 'template-123',
          templateName: 'test-template',
        };
        mockControlApi.createTemplate.mockResolvedValue(mockResponse);

        const result = await client.createTemplate({
          input: {
            templateName: 'test-template',
            templateType: TemplateType.BROWSER,
            diskSize: 10240,
            networkConfiguration: {
              networkMode: TemplateNetworkMode.PUBLIC,
            },
          },
        });

        expect(result.templateId).toBe('template-123');
        expect(mockControlApi.createTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              networkConfiguration: expect.any(Object),
            }),
          })
        );
      });

      it('should create template without network configuration', async () => {
        const mockResponse = {
          templateId: 'template-123',
          templateName: 'test-template',
        };
        mockControlApi.createTemplate.mockResolvedValue(mockResponse);

        const result = await client.createTemplate({
          input: {
            templateName: 'test-template',
            templateType: TemplateType.CODE_INTERPRETER,
          },
        });

        expect(result.templateId).toBe('template-123');
      });
    });

    describe('deleteTemplate', () => {
      it('should delete template successfully', async () => {
        const mockResponse = {
          templateId: 'template-123',
          templateName: 'test-template',
        };
        mockControlApi.deleteTemplate.mockResolvedValue(mockResponse);

        const result = await client.deleteTemplate({ name: 'test-template' });

        expect(result.templateId).toBe('template-123');
        expect(mockControlApi.deleteTemplate).toHaveBeenCalled();
      });
    });

    describe('updateTemplate', () => {
      it('should update template successfully', async () => {
        const mockResponse = {
          templateId: 'template-123',
          templateName: 'test-template',
          cpu: 4,
        };
        mockControlApi.updateTemplate.mockResolvedValue(mockResponse);

        const result = await client.updateTemplate({
          name: 'test-template',
          input: { cpu: 4 },
        });

        expect(result.cpu).toBe(4);
        expect(mockControlApi.updateTemplate).toHaveBeenCalled();
      });

      it('should update template with network configuration', async () => {
        const mockResponse = {
          templateId: 'template-123',
          templateName: 'test-template',
        };
        mockControlApi.updateTemplate.mockResolvedValue(mockResponse);

        const result = await client.updateTemplate({
          name: 'test-template',
          input: {
            networkConfiguration: {
              networkMode: TemplateNetworkMode.PRIVATE,
            },
          },
        });

        expect(result.templateId).toBe('template-123');
        expect(mockControlApi.updateTemplate).toHaveBeenCalled();
      });
    });

    describe('getTemplate', () => {
      it('should get template successfully', async () => {
        const mockResponse = {
          templateId: 'template-123',
          templateName: 'test-template',
        };
        mockControlApi.getTemplate.mockResolvedValue(mockResponse);

        const result = await client.getTemplate({ name: 'test-template' });

        expect(result.templateId).toBe('template-123');
        expect(mockControlApi.getTemplate).toHaveBeenCalled();
      });
    });

    describe('listTemplates', () => {
      it('should list templates successfully', async () => {
        const mockResponse = {
          items: [
            { templateId: 'template-1', templateName: 'test-1' },
            { templateId: 'template-2', templateName: 'test-2' },
          ],
        };
        mockControlApi.listTemplates.mockResolvedValue(mockResponse);

        const result = await client.listTemplates({});

        expect(result).toHaveLength(2);
        expect(mockControlApi.listTemplates).toHaveBeenCalled();
      });

      it('should return empty array when items is undefined', async () => {
        mockControlApi.listTemplates.mockResolvedValue(undefined);

        const result = await client.listTemplates({});

        expect(result).toEqual([]);
      });

      it('should return empty array when items is null', async () => {
        mockControlApi.listTemplates.mockResolvedValue({ items: null });

        const result = await client.listTemplates({});

        expect(result).toEqual([]);
      });
    });
  });

  describe('Sandbox Operations', () => {
    describe('createSandbox', () => {
      it('should create sandbox successfully', async () => {
        const mockResponse = {
          sandboxId: 'sandbox-123',
          templateName: 'test-template',
          status: SandboxState.READY,
        };
        mockControlApi.createSandbox.mockResolvedValue(mockResponse);
        (Sandbox.get as jest.Mock).mockResolvedValue({
          sandboxId: 'sandbox-123',
          templateName: 'test-template',
          status: SandboxState.READY,
        });

        const result = await client.createSandbox({
          input: {
            templateName: 'test-template',
          },
        });

        expect(result.sandboxId).toBe('sandbox-123');
        expect(mockControlApi.createSandbox).toHaveBeenCalled();
      });
    });

    describe('createCodeInterpreterSandbox', () => {
      it('should create code interpreter sandbox', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockCodeInterpreterCreateFromTemplate.mockResolvedValue(mockSandbox);

        const result = await client.createCodeInterpreterSandbox({
          templateName: 'test-template',
        });

        expect(result).toBe(mockSandbox);
        expect(mockCodeInterpreterCreateFromTemplate).toHaveBeenCalledWith(
          'test-template',
          undefined,
          expect.any(Object)
        );
      });

      it('should create code interpreter sandbox with options', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockCodeInterpreterCreateFromTemplate.mockResolvedValue(mockSandbox);

        const options = { sandboxIdleTimeoutSeconds: 600 };
        const result = await client.createCodeInterpreterSandbox({
          templateName: 'test-template',
          options,
        });

        expect(result).toBe(mockSandbox);
        expect(mockCodeInterpreterCreateFromTemplate).toHaveBeenCalledWith(
          'test-template',
          options,
          expect.any(Object)
        );
      });
    });

    describe('createBrowserSandbox', () => {
      it('should create browser sandbox', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockBrowserCreateFromTemplate.mockResolvedValue(mockSandbox);

        const result = await client.createBrowserSandbox({
          templateName: 'test-template',
        });

        expect(result).toBe(mockSandbox);
        expect(mockBrowserCreateFromTemplate).toHaveBeenCalledWith(
          'test-template',
          undefined,
          expect.any(Object)
        );
      });
    });

    describe('deleteSandbox', () => {
      it('should delete sandbox successfully', async () => {
        const mockResponse = {
          sandboxId: 'sandbox-123',
          status: 'DELETING',
        };
        mockControlApi.deleteSandbox.mockResolvedValue(mockResponse);
        (Sandbox.get as jest.Mock).mockResolvedValue({
          sandboxId: 'sandbox-123',
          status: 'DELETING',
        });

        const result = await client.deleteSandbox({ id: 'sandbox-123' });

        expect(result.sandboxId).toBe('sandbox-123');
        expect(mockControlApi.deleteSandbox).toHaveBeenCalled();
      });
    });

    describe('stopSandbox', () => {
      it('should stop sandbox successfully', async () => {
        const mockResponse = {
          sandboxId: 'sandbox-123',
          status: 'STOPPING',
        };
        mockControlApi.stopSandbox.mockResolvedValue(mockResponse);
        (Sandbox.get as jest.Mock).mockResolvedValue({
          sandboxId: 'sandbox-123',
          status: 'STOPPING',
        });

        const result = await client.stopSandbox({ id: 'sandbox-123' });

        expect(result.sandboxId).toBe('sandbox-123');
        expect(mockControlApi.stopSandbox).toHaveBeenCalled();
      });
    });

    describe('getSandbox', () => {
      it('should get sandbox successfully', async () => {
        const mockResponse = {
          sandboxId: 'sandbox-123',
          templateName: 'test-template',
          status: SandboxState.READY,
        };
        mockControlApi.getSandbox.mockResolvedValue(mockResponse);
        (Sandbox.get as jest.Mock).mockResolvedValue({
          sandboxId: 'sandbox-123',
          templateName: 'test-template',
          status: SandboxState.READY,
        });

        const result = await client.getSandbox({ id: 'sandbox-123' });

        expect(result.sandboxId).toBe('sandbox-123');
      });
    });

    describe('listSandboxes', () => {
      it('should list sandboxes successfully', async () => {
        const mockResponse = {
          sandboxes: [
            {
              sandboxId: 'sandbox-1',
              templateName: 'test-template',
              status: SandboxState.READY,
            },
            {
              sandboxId: 'sandbox-2',
              templateName: 'test-template',
              status: SandboxState.READY,
            },
          ],
        };
        mockControlApi.listSandboxes.mockResolvedValue(mockResponse);

        const result = await client.listSandboxes({});

        expect(result).toHaveLength(2);
        expect(mockControlApi.listSandboxes).toHaveBeenCalled();
      });

      it('should return empty array when result is undefined', async () => {
        mockControlApi.listSandboxes.mockResolvedValue({ sandboxes: [] });

        const result = await client.listSandboxes({});

        expect(result).toEqual([]);
      });
    });
  });
});
