/**
 * Config 测试
 *
 * 测试 Config 类的各种功能。
 */

import { Config } from '../../../src/utils/config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    // Clear specific AgentRun related env vars
    delete process.env.AGENTRUN_ACCESS_KEY_ID;
    delete process.env.AGENTRUN_ACCESS_KEY_SECRET;
    delete process.env.AGENTRUN_ACCOUNT_ID;
    delete process.env.AGENTRUN_REGION;
    delete process.env.AGENTRUN_SECURITY_TOKEN;
    delete process.env.AGENTRUN_TIMEOUT;
    delete process.env.AGENTRUN_TOKEN;
    delete process.env.AGENTRUN_CONTROL_ENDPOINT;
    delete process.env.AGENTRUN_DATA_ENDPOINT;
    delete process.env.DEVS_ENDPOINT;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
    delete process.env.ALIBABA_CLOUD_SECURITY_TOKEN;
    delete process.env.FC_ACCOUNT_ID;
    delete process.env.FC_REGION;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('init without parameters', () => {
    it('should read from environment variables', () => {
      process.env.AGENTRUN_ACCESS_KEY_ID = 'mock-access-key-id';
      process.env.AGENTRUN_ACCESS_KEY_SECRET = 'mock-access-key-secret';
      process.env.AGENTRUN_ACCOUNT_ID = 'mock-account-id';

      const config = new Config();

      expect(config.accessKeyId).toBe('mock-access-key-id');
      expect(config.accessKeySecret).toBe('mock-access-key-secret');
      expect(config.accountId).toBe('mock-account-id');
    });

    it('should read from Alibaba Cloud env variables as fallback', () => {
      process.env.ALIBABA_CLOUD_ACCESS_KEY_ID = 'alibaba-key-id';
      process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET = 'alibaba-key-secret';

      const config = new Config();

      expect(config.accessKeyId).toBe('alibaba-key-id');
      expect(config.accessKeySecret).toBe('alibaba-key-secret');
    });

    it('should read from FC env variables as fallback', () => {
      process.env.FC_ACCOUNT_ID = 'fc-account-id';
      process.env.FC_REGION = 'cn-shanghai';

      const config = new Config();

      expect(config.accountId).toBe('fc-account-id');
      expect(config.regionId).toBe('cn-shanghai');
    });

    it('should use default region', () => {
      const config = new Config();
      expect(config.regionId).toBe('cn-hangzhou');
    });

    it('should use default timeout (600000 ms = 10 minutes)', () => {
      const config = new Config();
      expect(config.timeout).toBe(600000);
    });

    it('should use default read timeout (100000000 ms)', () => {
      const config = new Config();
      expect(config.readTimeout).toBe(100000000);
    });
  });

  describe('init with parameters', () => {
    it('should use provided values over env vars', () => {
      process.env.AGENTRUN_ACCESS_KEY_ID = 'env-access-key-id';

      const config = new Config({
        accessKeyId: 'param-access-key-id',
        accessKeySecret: 'param-access-key-secret',
        accountId: 'param-account-id',
        regionId: 'cn-shanghai',
      });

      expect(config.accessKeyId).toBe('param-access-key-id');
      expect(config.accessKeySecret).toBe('param-access-key-secret');
      expect(config.accountId).toBe('param-account-id');
      expect(config.regionId).toBe('cn-shanghai');
    });

    it('should accept custom timeout', () => {
      const config = new Config({
        timeout: 30000,
      });

      expect(config.timeout).toBe(30000);
    });

    it('should accept custom read timeout', () => {
      const config = new Config({
        readTimeout: 50000,
      });

      expect(config.readTimeout).toBe(50000);
    });
  });

  describe('controlEndpoint', () => {
    it('should use custom control endpoint', () => {
      const config = new Config({
        controlEndpoint: 'https://custom.endpoint.com',
      });

      expect(config.controlEndpoint).toBe('https://custom.endpoint.com');
    });

    it('should use env control endpoint', () => {
      process.env.AGENTRUN_CONTROL_ENDPOINT = 'https://env.endpoint.com';

      const config = new Config();

      expect(config.controlEndpoint).toBe('https://env.endpoint.com');
    });

    it('should generate default control endpoint from region', () => {
      const config = new Config({
        regionId: 'cn-beijing',
      });

      expect(config.controlEndpoint).toBe('https://agentrun.cn-beijing.aliyuncs.com');
    });
  });

  describe('dataEndpoint', () => {
    it('should use custom data endpoint', () => {
      const config = new Config({
        dataEndpoint: 'https://data.endpoint.com',
      });

      expect(config.dataEndpoint).toBe('https://data.endpoint.com');
    });

    it('should use env data endpoint', () => {
      process.env.AGENTRUN_DATA_ENDPOINT = 'https://env-data.endpoint.com';

      const config = new Config();

      expect(config.dataEndpoint).toBe('https://env-data.endpoint.com');
    });

    it('should generate default data endpoint from region and account', () => {
      const config = new Config({
        regionId: 'cn-beijing',
        accountId: '123456789',
      });

      expect(config.dataEndpoint).toBe('https://123456789.agentrun-data.cn-beijing.aliyuncs.com');
    });
  });

  describe('devsEndpoint', () => {
    it('should use custom devs endpoint', () => {
      const config = new Config({
        devsEndpoint: 'https://devs.endpoint.com',
      });

      expect(config.devsEndpoint).toBe('https://devs.endpoint.com');
    });

    it('should use DEVS_ENDPOINT env variable', () => {
      process.env.DEVS_ENDPOINT = 'https://env-devs.endpoint.com';

      const config = new Config();

      expect(config.devsEndpoint).toBe('https://env-devs.endpoint.com');
    });

    it('should generate default devs endpoint from region', () => {
      const config = new Config({
        regionId: 'cn-beijing',
      });

      expect(config.devsEndpoint).toBe('https://devs.cn-beijing.aliyuncs.com');
    });
  });

  describe('token and headers', () => {
    it('should return token from config', () => {
      const config = new Config({
        token: 'test-token',
      });

      expect(config.token).toBe('test-token');
    });

    it('should return undefined token when not set', () => {
      const config = new Config();

      expect(config.token).toBeUndefined();
    });

    it('should return headers from config', () => {
      const config = new Config({
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      expect(config.headers).toEqual({ 'X-Custom-Header': 'custom-value' });
    });

    it('should return empty headers when not set', () => {
      const config = new Config();

      expect(config.headers).toEqual({});
    });
  });

  describe('withConfigs', () => {
    it('should create config from environment when no configs provided', () => {
      process.env.AGENTRUN_ACCESS_KEY_ID = 'env-key';

      const merged = Config.withConfigs();

      expect(merged).toBeInstanceOf(Config);
      expect(merged.accessKeyId).toBe('env-key');
    });

    it('should handle undefined configs', () => {
      const config = new Config({
        accessKeyId: 'test-key',
      });

      const merged = Config.withConfigs(undefined, config, undefined);

      expect(merged.accessKeyId).toBe('test-key');
    });
  });

  describe('update', () => {
    it('should update config with values from another config', () => {
      const config1 = new Config({
        accessKeyId: 'key1',
        regionId: 'cn-hangzhou',
      });

      const config2 = new Config({
        accessKeySecret: 'secret2',
        regionId: 'cn-shanghai',
      });

      config1.update(config2);

      expect(config1.accessKeyId).toBe('key1');
      expect(config1.accessKeySecret).toBe('secret2');
      expect(config1.regionId).toBe('cn-shanghai');
    });

    it('should merge controlEndpoint and headers', () => {
      const config1 = new Config({
        accessKeyId: 'key1',
        headers: { 'X-Custom-1': 'value1' },
      });

      const config2 = new Config({
        controlEndpoint: 'https://custom.control.endpoint.com',
        headers: { 'X-Custom-2': 'value2' },
      });

      config1.update(config2);

      expect(config1.controlEndpoint).toBe('https://custom.control.endpoint.com');
      expect(config1.headers).toEqual({ 'X-Custom-1': 'value1', 'X-Custom-2': 'value2' });
    });

    it('should update securityToken', () => {
      const config1 = new Config({
        accessKeyId: 'key1',
      });

      const config2 = new Config({
        securityToken: 'updated-security-token',
      });

      config1.update(config2);

      expect(config1.securityToken).toBe('updated-security-token');
    });
  });

  describe('securityToken', () => {
    it('should return security token from config', () => {
      const config = new Config({
        securityToken: 'test-security-token',
      });

      expect(config.securityToken).toBe('test-security-token');
    });

    it('should return security token from env', () => {
      process.env.AGENTRUN_SECURITY_TOKEN = 'env-security-token';

      const config = new Config();

      expect(config.securityToken).toBe('env-security-token');
    });

    it('should use Alibaba Cloud env as fallback', () => {
      process.env.ALIBABA_CLOUD_SECURITY_TOKEN = 'alibaba-security-token';

      const config = new Config();

      expect(config.securityToken).toBe('alibaba-security-token');
    });
  });

  describe('accountId error handling', () => {
    it('should throw error when accountId is not set', () => {
      const config = new Config();

      expect(() => config.accountId).toThrow(
        'Account ID is not set. Please add AGENTRUN_ACCOUNT_ID environment variable or set it in code.'
      );
    });
  });
});
