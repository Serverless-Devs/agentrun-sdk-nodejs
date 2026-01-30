/**
 * Custom Sandbox 单元测试
 *
 * 测试 CustomSandbox 类的功能。
 * Tests for CustomSandbox class.
 */

import { TemplateType, SandboxState } from '../../../src/sandbox/model';
import { Config } from '../../../src/utils/config';

// Mock all sandbox types to avoid circular dependency issues
jest.mock('../../../src/sandbox/browser-sandbox', () => ({
  BrowserSandbox: class MockBrowserSandbox {},
}));

jest.mock('../../../src/sandbox/aio-sandbox', () => ({
  AioSandbox: class MockAioSandbox {},
}));

jest.mock('../../../src/sandbox/code-interpreter-sandbox', () => ({
  CodeInterpreterSandbox: class MockCodeInterpreterSandbox {},
}));

// Mock SandboxDataAPI
jest.mock('../../../src/sandbox/api/sandbox-data', () => {
  return {
    SandboxDataAPI: jest.fn().mockImplementation(() => ({
      createSandbox: jest.fn(),
      deleteSandbox: jest.fn(),
      stopSandbox: jest.fn(),
      getSandbox: jest.fn(),
      checkHealth: jest.fn(),
    })),
    ResourceType: {
      Runtime: 'runtime',
      LiteLLM: 'litellm',
      Tool: 'tool',
      Template: 'template',
      Sandbox: 'sandbox',
    },
  };
});

// Import after mocks
import { CustomSandbox } from '../../../src/sandbox/custom-sandbox';
import { Sandbox } from '../../../src/sandbox/sandbox';

// Store original create method
const originalCreate = Sandbox.create;

describe('CustomSandbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Sandbox.create to original before each test
    (Sandbox as any).create = originalCreate;
  });

  describe('static properties', () => {
    it('should have templateType set to CUSTOM', () => {
      expect(CustomSandbox.templateType).toBe(TemplateType.CUSTOM);
    });
  });

  describe('constructor', () => {
    it('should create CustomSandbox from Sandbox', () => {
      const baseSandbox = {
        sandboxId: 'sandbox-123',
        sandboxName: 'test-sandbox',
        templateName: 'test-template',
        state: SandboxState.RUNNING,
      } as Sandbox;

      const customSandbox = new CustomSandbox(baseSandbox);

      expect(customSandbox).toBeInstanceOf(CustomSandbox);
      expect(customSandbox.sandboxId).toBe('sandbox-123');
      expect(customSandbox.sandboxName).toBe('test-sandbox');
      expect(customSandbox.templateName).toBe('test-template');
      expect(customSandbox.state).toBe(SandboxState.RUNNING);
    });

    it('should create CustomSandbox with config', () => {
      const baseSandbox = {
        sandboxId: 'sandbox-123',
      } as Sandbox;
      const config = new Config({ accessKeyId: 'test-key' });

      const customSandbox = new CustomSandbox(baseSandbox, config);

      expect(customSandbox).toBeInstanceOf(CustomSandbox);
      expect(customSandbox.sandboxId).toBe('sandbox-123');
    });
  });

  describe('dataApi', () => {
    it('should lazily create SandboxDataAPI', () => {
      const baseSandbox = {
        sandboxId: 'sandbox-123',
      } as Sandbox;

      const customSandbox = new CustomSandbox(baseSandbox);

      const dataApi = customSandbox.dataApi;
      expect(dataApi).toBeDefined();

      // Should return same instance on second call
      const dataApi2 = customSandbox.dataApi;
      expect(dataApi2).toBe(dataApi);
    });

    it('should handle undefined sandboxId by using empty string', () => {
      // Test the branch where sandboxId is undefined
      const baseSandbox = {
        sandboxId: undefined,
      } as unknown as Sandbox;

      const customSandbox = new CustomSandbox(baseSandbox);

      // Accessing dataApi should not throw, even with undefined sandboxId
      const dataApi = customSandbox.dataApi;
      expect(dataApi).toBeDefined();
    });
  });

  describe('getBaseUrl', () => {
    it('should return base URL with sandbox ID', () => {
      const baseSandbox = {
        sandboxId: 'sandbox-123',
      } as Sandbox;
      const config = new Config({
        dataEndpoint: 'https://data.example.com',
      });

      const customSandbox = new CustomSandbox(baseSandbox, config);

      const baseUrl = customSandbox.getBaseUrl();
      expect(baseUrl).toContain('sandbox-123');
      expect(baseUrl).toContain('sandboxes');
    });

    it('should use default data endpoint if not configured', () => {
      // Set environment variable

      const baseSandbox = {
        sandboxId: 'sandbox-456',
      } as Sandbox;

      // with env accountId=12345

      const config = new Config({ accountId: '12345' });
      const customSandbox = new CustomSandbox(baseSandbox, config);

      const baseUrl = customSandbox.getBaseUrl();
      expect(baseUrl).toContain('sandbox-456');
    });
  });

  describe('createFromTemplate', () => {
    it('should create CustomSandbox from template', async () => {
      const baseSandbox = new Sandbox(
        {
          sandboxId: 'sandbox-new',
          templateName: 'test-template',
          state: SandboxState.CREATING,
        },
        undefined
      );
      const mockSandbox = new CustomSandbox(baseSandbox, undefined);

      // Mock Sandbox.create
      const createMock = jest.fn().mockResolvedValue(mockSandbox);
      (Sandbox as any).create = createMock;

      const result = await CustomSandbox.createFromTemplate('test-template');

      expect(createMock).toHaveBeenCalledWith({
        input: expect.objectContaining({
          templateName: 'test-template',
        }),
        templateType: TemplateType.CUSTOM,
        config: undefined,
      });
      expect(result).toBeInstanceOf(CustomSandbox);
      expect(result.sandboxId).toBe('sandbox-new');
    });

    it('should create CustomSandbox with options', async () => {
      const baseSandbox = new Sandbox(
        {
          sandboxId: 'sandbox-new',
          templateName: 'test-template',
        },
        undefined
      );
      const mockSandbox = new CustomSandbox(baseSandbox, undefined);

      const createMock = jest.fn().mockResolvedValue(mockSandbox);
      (Sandbox as any).create = createMock;

      const result = await CustomSandbox.createFromTemplate('test-template', {
        sandboxIdleTimeoutSeconds: 1200,
        nasConfig: {
          groupId: 100,
          userId: 100,
          mountPoints: [{ serverAddr: 'nas.example.com:/', mountDir: '/mnt/nas' }],
        },
      });

      expect(createMock).toHaveBeenCalledWith({
        input: expect.objectContaining({
          templateName: 'test-template',
          sandboxIdleTimeoutSeconds: 1200,
          nasConfig: expect.any(Object),
        }),
        templateType: TemplateType.CUSTOM,
        config: undefined,
      });
      expect(result).toBeInstanceOf(CustomSandbox);
    });

    it('should create CustomSandbox with config', async () => {
      const baseSandbox = new Sandbox(
        {
          sandboxId: 'sandbox-new',
          templateName: 'test-template',
        },
        undefined
      );
      const mockSandbox = new CustomSandbox(baseSandbox, undefined);

      const createMock = jest.fn().mockResolvedValue(mockSandbox);
      (Sandbox as any).create = createMock;
      const config = new Config({ accessKeyId: 'test-key' });

      const result = await CustomSandbox.createFromTemplate('test-template', {}, config);

      expect(createMock).toHaveBeenCalledWith({
        input: expect.any(Object),
        templateType: TemplateType.CUSTOM,
        config,
      });
      expect(result).toBeInstanceOf(CustomSandbox);
    });
  });
});

describe('TemplateType.CUSTOM', () => {
  it('should have correct value', () => {
    expect(TemplateType.CUSTOM).toBe('CustomImage');
  });
});
