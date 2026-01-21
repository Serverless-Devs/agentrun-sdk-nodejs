/**
 * SandboxClient 单元测试
 *
 * 测试 SandboxClient 类的功能。
 * Tests for SandboxClient class.
 */

import { Config } from '../../../src/utils/config';
import { TemplateType } from '../../../src/sandbox/model';

// Mock Sandbox
const mockSandboxCreate = jest.fn();
const mockSandboxDelete = jest.fn();
const mockSandboxStop = jest.fn();
const mockSandboxGet = jest.fn();
const mockSandboxList = jest.fn();

jest.mock('../../../src/sandbox/sandbox', () => {
  return {
    Sandbox: {
      create: (...args: any[]) => mockSandboxCreate(...args),
      delete: (...args: any[]) => mockSandboxDelete(...args),
      stop: (...args: any[]) => mockSandboxStop(...args),
      get: (...args: any[]) => mockSandboxGet(...args),
      list: (...args: any[]) => mockSandboxList(...args),
    },
  };
});

// Mock Template
const mockTemplateCreate = jest.fn();
const mockTemplateDelete = jest.fn();
const mockTemplateUpdate = jest.fn();
const mockTemplateGet = jest.fn();
const mockTemplateList = jest.fn();
const mockTemplateListAll = jest.fn();

jest.mock('../../../src/sandbox/template', () => {
  return {
    Template: {
      create: (...args: any[]) => mockTemplateCreate(...args),
      delete: (...args: any[]) => mockTemplateDelete(...args),
      update: (...args: any[]) => mockTemplateUpdate(...args),
      get: (...args: any[]) => mockTemplateGet(...args),
      list: (...args: any[]) => mockTemplateList(...args),
      listAll: (...args: any[]) => mockTemplateListAll(...args),
    },
  };
});

// Mock CodeInterpreterSandbox
const mockCodeInterpreterCreateFromTemplate = jest.fn();
jest.mock('../../../src/sandbox/code-interpreter-sandbox', () => {
  return {
    CodeInterpreterSandbox: {
      createFromTemplate: (...args: any[]) => mockCodeInterpreterCreateFromTemplate(...args),
    },
  };
});

// Mock BrowserSandbox
const mockBrowserCreateFromTemplate = jest.fn();
jest.mock('../../../src/sandbox/browser-sandbox', () => {
  return {
    BrowserSandbox: {
      createFromTemplate: (...args: any[]) => mockBrowserCreateFromTemplate(...args),
    },
  };
});

import { SandboxClient } from '../../../src/sandbox/client';

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
      it('should create template', async () => {
        const mockTemplate = { templateId: 'template-123' };
        mockTemplateCreate.mockResolvedValue(mockTemplate);

        const result = await client.createTemplate({
          input: {
            templateName: 'test-template',
            templateType: TemplateType.CODE_INTERPRETER,
          },
        });

        expect(result).toBe(mockTemplate);
        expect(mockTemplateCreate).toHaveBeenCalledWith({
          input: {
            templateName: 'test-template',
            templateType: TemplateType.CODE_INTERPRETER,
          },
          config,
        });
      });

      it('should use provided config over client config', async () => {
        const overrideConfig = new Config({ accessKeyId: 'override-key' });
        mockTemplateCreate.mockResolvedValue({});

        await client.createTemplate({
          input: {
            templateName: 'test-template',
            templateType: TemplateType.CODE_INTERPRETER,
          },
          config: overrideConfig,
        });

        expect(mockTemplateCreate).toHaveBeenCalledWith({
          input: expect.any(Object),
          config: overrideConfig,
        });
      });
    });

    describe('deleteTemplate', () => {
      it('should delete template', async () => {
        const mockTemplate = { templateId: 'template-123' };
        mockTemplateDelete.mockResolvedValue(mockTemplate);

        const result = await client.deleteTemplate({ name: 'test-template' });

        expect(result).toBe(mockTemplate);
        expect(mockTemplateDelete).toHaveBeenCalledWith({
          name: 'test-template',
          config,
        });
      });
    });

    describe('updateTemplate', () => {
      it('should update template', async () => {
        const mockTemplate = { templateId: 'template-123', cpu: 4 };
        mockTemplateUpdate.mockResolvedValue(mockTemplate);

        const result = await client.updateTemplate({
          name: 'test-template',
          input: { cpu: 4 },
        });

        expect(result).toBe(mockTemplate);
        expect(mockTemplateUpdate).toHaveBeenCalledWith({
          name: 'test-template',
          input: { cpu: 4 },
          config,
        });
      });
    });

    describe('getTemplate', () => {
      it('should get template', async () => {
        const mockTemplate = { templateId: 'template-123' };
        mockTemplateGet.mockResolvedValue(mockTemplate);

        const result = await client.getTemplate({ name: 'test-template' });

        expect(result).toBe(mockTemplate);
        expect(mockTemplateGet).toHaveBeenCalledWith({
          name: 'test-template',
          config,
        });
      });
    });

    describe('listTemplates', () => {
      it('should list templates', async () => {
        const mockTemplates = [{ templateId: 'template-1' }, { templateId: 'template-2' }];
        mockTemplateList.mockResolvedValue(mockTemplates);

        const result = await client.listTemplates();

        expect(result).toBe(mockTemplates);
        expect(mockTemplateList).toHaveBeenCalledWith(undefined, config);
      });

      it('should list templates with filters', async () => {
        mockTemplateList.mockResolvedValue([]);

        await client.listTemplates({
          input: { pageNumber: 1, pageSize: 10 },
        });

        expect(mockTemplateList).toHaveBeenCalledWith(
          { pageNumber: 1, pageSize: 10 },
          config,
        );
      });
    });

    describe('listAllTemplates', () => {
      it('should list all templates', async () => {
        const mockTemplates = [{ templateId: 'template-1' }];
        mockTemplateListAll.mockResolvedValue(mockTemplates);

        const result = await client.listAllTemplates();

        expect(result).toBe(mockTemplates);
        expect(mockTemplateListAll).toHaveBeenCalledWith(undefined, config);
      });

      it('should list all templates with options', async () => {
        mockTemplateListAll.mockResolvedValue([]);

        await client.listAllTemplates({
          options: { templateType: TemplateType.BROWSER },
        });

        expect(mockTemplateListAll).toHaveBeenCalledWith(
          { templateType: TemplateType.BROWSER },
          config,
        );
      });
    });
  });

  describe('Sandbox Operations', () => {
    describe('createSandbox', () => {
      it('should create sandbox', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockSandboxCreate.mockResolvedValue(mockSandbox);

        const result = await client.createSandbox({
          input: { templateName: 'test-template' },
        });

        expect(result).toBe(mockSandbox);
        expect(mockSandboxCreate).toHaveBeenCalledWith(
          { templateName: 'test-template' },
          config,
        );
      });
    });

    describe('createCodeInterpreterSandbox', () => {
      it('should create code interpreter sandbox', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockCodeInterpreterCreateFromTemplate.mockResolvedValue(mockSandbox);

        const result = await client.createCodeInterpreterSandbox({
          templateName: 'ci-template',
        });

        expect(result).toBe(mockSandbox);
        expect(mockCodeInterpreterCreateFromTemplate).toHaveBeenCalledWith(
          'ci-template',
          undefined,
          config,
        );
      });

      it('should create code interpreter sandbox with options', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockCodeInterpreterCreateFromTemplate.mockResolvedValue(mockSandbox);

        await client.createCodeInterpreterSandbox({
          templateName: 'ci-template',
          options: { sandboxIdleTimeoutSeconds: 3600 },
        });

        expect(mockCodeInterpreterCreateFromTemplate).toHaveBeenCalledWith(
          'ci-template',
          { sandboxIdleTimeoutSeconds: 3600 },
          config,
        );
      });
    });

    describe('createBrowserSandbox', () => {
      it('should create browser sandbox', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockBrowserCreateFromTemplate.mockResolvedValue(mockSandbox);

        const result = await client.createBrowserSandbox({
          templateName: 'browser-template',
        });

        expect(result).toBe(mockSandbox);
        expect(mockBrowserCreateFromTemplate).toHaveBeenCalledWith(
          'browser-template',
          undefined,
          config,
        );
      });
    });

    describe('deleteSandbox', () => {
      it('should delete sandbox', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockSandboxDelete.mockResolvedValue(mockSandbox);

        const result = await client.deleteSandbox({ id: 'sandbox-123' });

        expect(result).toBe(mockSandbox);
        expect(mockSandboxDelete).toHaveBeenCalledWith({
          id: 'sandbox-123',
          config,
        });
      });
    });

    describe('stopSandbox', () => {
      it('should stop sandbox', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockSandboxStop.mockResolvedValue(mockSandbox);

        const result = await client.stopSandbox({ id: 'sandbox-123' });

        expect(result).toBe(mockSandbox);
        expect(mockSandboxStop).toHaveBeenCalledWith({
          id: 'sandbox-123',
          config,
        });
      });
    });

    describe('getSandbox', () => {
      it('should get sandbox', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockSandboxGet.mockResolvedValue(mockSandbox);

        const result = await client.getSandbox({ id: 'sandbox-123' });

        expect(result).toBe(mockSandbox);
        expect(mockSandboxGet).toHaveBeenCalledWith({
          id: 'sandbox-123',
          templateType: undefined,
          config,
        });
      });

      it('should get sandbox with templateType', async () => {
        const mockSandbox = { sandboxId: 'sandbox-123' };
        mockSandboxGet.mockResolvedValue(mockSandbox);

        await client.getSandbox({
          id: 'sandbox-123',
          templateType: TemplateType.CODE_INTERPRETER,
        });

        expect(mockSandboxGet).toHaveBeenCalledWith({
          id: 'sandbox-123',
          templateType: TemplateType.CODE_INTERPRETER,
          config,
        });
      });
    });

    describe('listSandboxes', () => {
      it('should list sandboxes', async () => {
        const mockSandboxes = [{ sandboxId: 'sandbox-1' }];
        mockSandboxList.mockResolvedValue(mockSandboxes);

        const result = await client.listSandboxes();

        expect(result).toBe(mockSandboxes);
        expect(mockSandboxList).toHaveBeenCalledWith(undefined, config);
      });

      it('should list sandboxes with filters', async () => {
        mockSandboxList.mockResolvedValue([]);

        await client.listSandboxes({
          input: { templateName: 'test-template', maxResults: 10 },
        });

        expect(mockSandboxList).toHaveBeenCalledWith(
          { templateName: 'test-template', maxResults: 10 },
          config,
        );
      });
    });
  });
});
