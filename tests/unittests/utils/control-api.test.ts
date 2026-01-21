/**
 * ControlAPI 模块测试
 *
 * 测试 control-api.ts 的 ControlAPI 类。
 */

import { Config } from '../../../src/utils/config';

// Mock the @alicloud/agentrun20250910 module
jest.mock('@alicloud/agentrun20250910', () => {
  const MockClient = jest.fn().mockImplementation((config: any) => ({
    config,
  }));
  return {
    default: MockClient,
    __esModule: true,
  };
});

// Mock the @alicloud/openapi-client module
jest.mock('@alicloud/openapi-client', () => {
  return {
    Config: jest.fn().mockImplementation((config: any) => config),
  };
});

import { ControlAPI } from '../../../src/utils/control-api';

describe('ControlAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance without config', () => {
      const api = new ControlAPI();
      expect(api).toBeInstanceOf(ControlAPI);
    });

    it('should create instance with config', () => {
      const config = new Config({
        accessKeyId: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        accountId: 'test-account-id',
      });
      const api = new ControlAPI(config);
      expect(api).toBeInstanceOf(ControlAPI);
    });
  });

  describe('getClient', () => {
    it('should create client with merged config', () => {
      const config = new Config({
        accessKeyId: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        accountId: 'test-account-id',
        regionId: 'cn-hangzhou',
      });
      const api = new ControlAPI(config);

      const client = api.getClient();

      expect(client).toBeDefined();
      expect(client.config).toBeDefined();
      expect(client.config.accessKeyId).toBe('test-access-key-id');
      expect(client.config.accessKeySecret).toBe('test-access-key-secret');
      expect(client.config.regionId).toBe('cn-hangzhou');
    });

    it('should override config when passed as parameter', () => {
      const config1 = new Config({
        accessKeyId: 'config1-key',
        accessKeySecret: 'config1-secret',
        accountId: 'test-account-id',
        regionId: 'cn-hangzhou',
      });
      const config2 = new Config({
        accessKeyId: 'config2-key',
        accessKeySecret: 'config2-secret',
        accountId: 'test-account-id',
        regionId: 'cn-shanghai',
      });
      const api = new ControlAPI(config1);

      const client = api.getClient(config2);

      expect(client.config.accessKeyId).toBe('config2-key');
      expect(client.config.regionId).toBe('cn-shanghai');
    });

    it('should remove http:// prefix from endpoint', () => {
      const config = new Config({
        accessKeyId: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        accountId: 'test-account-id',
        controlEndpoint: 'http://agentrun.cn-hangzhou.aliyuncs.com',
      });
      const api = new ControlAPI(config);

      const client = api.getClient();

      expect(client.config.endpoint).toBe(
        'agentrun.cn-hangzhou.aliyuncs.com'
      );
    });

    it('should remove https:// prefix from endpoint', () => {
      const config = new Config({
        accessKeyId: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        accountId: 'test-account-id',
        controlEndpoint: 'https://agentrun.cn-hangzhou.aliyuncs.com',
      });
      const api = new ControlAPI(config);

      const client = api.getClient();

      expect(client.config.endpoint).toBe(
        'agentrun.cn-hangzhou.aliyuncs.com'
      );
    });

    it('should keep endpoint without protocol prefix as is', () => {
      const config = new Config({
        accessKeyId: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        accountId: 'test-account-id',
        controlEndpoint: 'agentrun.cn-hangzhou.aliyuncs.com',
      });
      const api = new ControlAPI(config);

      const client = api.getClient();

      expect(client.config.endpoint).toBe(
        'agentrun.cn-hangzhou.aliyuncs.com'
      );
    });

    it('should pass securityToken when provided', () => {
      const config = new Config({
        accessKeyId: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        accountId: 'test-account-id',
        securityToken: 'test-security-token',
      });
      const api = new ControlAPI(config);

      const client = api.getClient();

      expect(client.config.securityToken).toBe('test-security-token');
    });

    it('should pass undefined securityToken when not provided', () => {
      const config = new Config({
        accessKeyId: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        accountId: 'test-account-id',
      });
      const api = new ControlAPI(config);

      const client = api.getClient();

      expect(client.config.securityToken).toBeUndefined();
    });

    it('should pass timeout from config', () => {
      const config = new Config({
        accessKeyId: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        accountId: 'test-account-id',
        timeout: 60000,
      });
      const api = new ControlAPI(config);

      const client = api.getClient();

      expect(client.config.connectTimeout).toBe(60000);
    });
  });
});
