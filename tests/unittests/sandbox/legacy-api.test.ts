/**
 * Legacy API 测试套件
 *
 * 测试所有旧版 API 的行为：
 * 1. 旧 API 是否正常工作
 * 2. 是否发出废弃警告
 * 3. 参数转换是否正确
 */

import { SandboxState } from '../../../src/sandbox/model';
import { Sandbox } from '../../../src/sandbox/sandbox';
import { Config } from '../../../src/utils/config';
import { logger } from '../../../src/utils/log';

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

describe('Legacy API Tests', () => {
  // Capture logger.warn calls
  const originalWarn = logger.warn;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  afterAll(() => {
    logger.warn = originalWarn;
  });

  describe('Sandbox.create - Legacy API', () => {
    it('should work with legacy API: create(input, config)', async () => {
      const mockSandbox = new Sandbox({
        sandboxId: 'test-sandbox',
        templateName: 'test-template',
        state: SandboxState.CREATING,
      });
      mockClientCreateSandbox.mockResolvedValue(mockSandbox);

      // Call legacy API
      const result = await Sandbox.create(
        { templateName: 'test-template' },
        new Config({ accessKeyId: 'test' })
      );

      expect(result).toBe(mockSandbox);
      expect(mockClientCreateSandbox).toHaveBeenCalled();
    });

    it('should emit deprecation warning for legacy API', async () => {
      const mockSandbox = new Sandbox({
        sandboxId: 'test-sandbox',
        state: SandboxState.CREATING,
      });
      mockClientCreateSandbox.mockResolvedValue(mockSandbox);

      await Sandbox.create({ templateName: 'test' }, undefined);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deprecated: Sandbox.create(input, config) is deprecated')
      );
    });

    it('should pass correct parameters to client', async () => {
      const mockSandbox = new Sandbox({ sandboxId: 'test' });
      mockClientCreateSandbox.mockResolvedValue(mockSandbox);

      const input = { templateName: 'test-template' };
      const config = new Config({ accessKeyId: 'key' });

      await Sandbox.create(input, config);

      expect(mockClientCreateSandbox).toHaveBeenCalledWith(input, config);
    });
  });

  describe('Sandbox.delete - Legacy API', () => {
    it('should work with legacy API: delete(id, config)', async () => {
      const mockSandbox = new Sandbox({
        sandboxId: 'test-sandbox',
        state: SandboxState.DELETING,
      });
      mockClientDeleteSandbox.mockResolvedValue(mockSandbox);

      // Call legacy API
      const result = await Sandbox.delete('test-sandbox', new Config({ accessKeyId: 'test' }));

      expect(result).toBe(mockSandbox);
      expect(mockClientDeleteSandbox).toHaveBeenCalled();
    });

    it('should emit deprecation warning for legacy API', async () => {
      const mockSandbox = new Sandbox({ sandboxId: 'test' });
      mockClientDeleteSandbox.mockResolvedValue(mockSandbox);

      await Sandbox.delete('test-sandbox', undefined);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sandbox.delete(id, config) is deprecated')
      );
    });

    it('should pass correct parameters to client', async () => {
      const mockSandbox = new Sandbox({ sandboxId: 'test' });
      mockClientDeleteSandbox.mockResolvedValue(mockSandbox);

      const config = new Config({ accessKeyId: 'key' });

      await Sandbox.delete('test-id', config);

      expect(mockClientDeleteSandbox).toHaveBeenCalledWith('test-id', config);
    });
  });

  describe('Sandbox.stop - Legacy API', () => {
    it('should work with legacy API: stop(id, config)', async () => {
      const mockSandbox = new Sandbox({
        sandboxId: 'test-sandbox',
        state: SandboxState.STOPPED,
      });
      mockClientStopSandbox.mockResolvedValue(mockSandbox);

      // Call legacy API
      const result = await Sandbox.stop('test-sandbox', new Config({ accessKeyId: 'test' }));

      expect(result).toBe(mockSandbox);
      expect(mockClientStopSandbox).toHaveBeenCalled();
    });

    it('should emit deprecation warning for legacy API', async () => {
      const mockSandbox = new Sandbox({ sandboxId: 'test' });
      mockClientStopSandbox.mockResolvedValue(mockSandbox);

      await Sandbox.stop('test-sandbox', undefined);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sandbox.stop(id, config) is deprecated')
      );
    });

    it('should pass correct parameters to client', async () => {
      const mockSandbox = new Sandbox({ sandboxId: 'test' });
      mockClientStopSandbox.mockResolvedValue(mockSandbox);

      const config = new Config({ accessKeyId: 'key' });

      await Sandbox.stop('test-id', config);

      expect(mockClientStopSandbox).toHaveBeenCalledWith('test-id', config);
    });
  });

  describe('Sandbox.list - Legacy API', () => {
    it('should work with legacy API: list(input, config)', async () => {
      const mockSandboxes = [
        new Sandbox({ sandboxId: 'sandbox-1' }),
        new Sandbox({ sandboxId: 'sandbox-2' }),
      ];
      mockClientListSandboxes.mockResolvedValue(mockSandboxes);

      // Call legacy API
      const result = await Sandbox.list({ maxResults: 10 }, new Config({ accessKeyId: 'test' }));

      expect(result).toEqual(mockSandboxes);
      expect(mockClientListSandboxes).toHaveBeenCalled();
    });

    it('should emit deprecation warning for legacy API', async () => {
      mockClientListSandboxes.mockResolvedValue([]);

      await Sandbox.list({ maxResults: 10 }, undefined);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sandbox.list(input, config) is deprecated')
      );
    });

    it('should pass correct parameters to client', async () => {
      mockClientListSandboxes.mockResolvedValue([]);

      const input = { maxResults: 10 };
      const config = new Config({ accessKeyId: 'key' });

      await Sandbox.list(input, config);

      expect(mockClientListSandboxes).toHaveBeenCalledWith(input, config);
    });

    it('should detect legacy API when arg1 has list params', async () => {
      mockClientListSandboxes.mockResolvedValue([]);

      await Sandbox.list({ maxResults: 10 });

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should detect legacy API when arg1 has templateName', async () => {
      mockClientListSandboxes.mockResolvedValue([]);

      await Sandbox.list({ templateName: 'test' });

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should detect legacy API when arg1 has templateType', async () => {
      mockClientListSandboxes.mockResolvedValue([]);

      await Sandbox.list({ templateType: 'CODE_INTERPRETER' as any });

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('Modern API - No Warnings', () => {
    it('Sandbox.create - should not warn for modern API', async () => {
      const mockSandbox = new Sandbox({ sandboxId: 'test' });
      mockClientCreateSandbox.mockResolvedValue(mockSandbox);

      await Sandbox.create({
        input: { templateName: 'test' },
        config: new Config(),
      });

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('Sandbox.delete - should not warn for modern API', async () => {
      const mockSandbox = new Sandbox({ sandboxId: 'test' });
      mockClientDeleteSandbox.mockResolvedValue(mockSandbox);

      await Sandbox.delete({ id: 'test-id', config: new Config() });

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('Sandbox.stop - should not warn for modern API', async () => {
      const mockSandbox = new Sandbox({ sandboxId: 'test' });
      mockClientStopSandbox.mockResolvedValue(mockSandbox);

      await Sandbox.stop({ id: 'test-id', config: new Config() });

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('Sandbox.list - should not warn for modern API', async () => {
      mockClientListSandboxes.mockResolvedValue([]);

      await Sandbox.list({
        input: { maxResults: 10 },
        config: new Config(),
      });

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('Sandbox.list - should not warn when called without args', async () => {
      mockClientListSandboxes.mockResolvedValue([]);

      await Sandbox.list();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('Sandbox.list - should not warn when only input wrapper is provided', async () => {
      mockClientListSandboxes.mockResolvedValue([]);

      await Sandbox.list({ input: { maxResults: 10 } });

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
