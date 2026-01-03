/**
 * Data API Tests
 *
 * 测试 Data API 客户端模块。
 * Tests for Data API client module.
 */



import { DataAPI, ResourceType } from '../../../src/utils/data-api';
import { Config } from '../../../src/utils/config';

describe('DataAPI', () => {
  describe('constructor', () => {
    it('should create a DataAPI instance with required parameters', () => {
      const config = new Config({
        accessKeyId: 'test-key-id',
        accessKeySecret: 'test-key-secret',
        accountId: 'test-account',
      });

      const api = new DataAPI('my-resource', ResourceType.Sandbox, config);

      expect(api).toBeDefined();
    });

    it('should use default namespace', () => {
      const config = new Config({
        accessKeyId: 'test-key-id',
        accessKeySecret: 'test-key-secret',
        accountId: 'test-account',
      });

      const api = new DataAPI('my-resource', ResourceType.Sandbox, config);

      // Test withPath uses the namespace
      const url = api.withPath('/test');
      expect(url).toContain('agents');
    });

    it('should allow custom namespace', () => {
      const config = new Config({
        accessKeyId: 'test-key-id',
        accessKeySecret: 'test-key-secret',
        accountId: 'test-account',
      });

      const api = new DataAPI('my-resource', ResourceType.Sandbox, config, 'custom-ns');

      const url = api.withPath('/test');
      expect(url).toContain('custom-ns');
    });
  });

  describe('withPath', () => {
    it('should construct URL without query parameters', () => {
      const config = new Config({
        accessKeyId: 'test-key-id',
        accessKeySecret: 'test-key-secret',
        accountId: 'test-account',
        dataEndpoint: 'https://example.com',
      });

      const api = new DataAPI('my-resource', ResourceType.Sandbox, config);

      const url = api.withPath('resources');
      expect(url).toBe('https://example.com/agents/resources');
    });

    it('should construct URL with query parameters', () => {
      const config = new Config({
        accessKeyId: 'test-key-id',
        accessKeySecret: 'test-key-secret',
        accountId: 'test-account',
        dataEndpoint: 'https://example.com',
      });

      const api = new DataAPI('my-resource', ResourceType.Sandbox, config);

      const url = api.withPath('resources', { limit: 10, page: 1 });
      expect(url).toContain('limit=10');
      expect(url).toContain('page=1');
    });

    it('should handle leading slash in path', () => {
      const config = new Config({
        accessKeyId: 'test-key-id',
        accessKeySecret: 'test-key-secret',
        accountId: 'test-account',
        dataEndpoint: 'https://example.com',
      });

      const api = new DataAPI('my-resource', ResourceType.Sandbox, config);

      const url = api.withPath('/resources');
      expect(url).toBe('https://example.com/agents/resources');
    });

    it('should handle array query parameters', () => {
      const config = new Config({
        accessKeyId: 'test-key-id',
        accessKeySecret: 'test-key-secret',
        accountId: 'test-account',
        dataEndpoint: 'https://example.com',
      });

      const api = new DataAPI('my-resource', ResourceType.Sandbox, config);

      const url = api.withPath('resources', { ids: ['a', 'b', 'c'] });
      expect(url).toContain('ids=a');
      expect(url).toContain('ids=b');
      expect(url).toContain('ids=c');
    });
  });
});

describe('ResourceType', () => {
  it('should have correct values', () => {
    expect(String(ResourceType.Runtime)).toBe('runtime');
    expect(String(ResourceType.LiteLLM)).toBe('litellm');
    expect(String(ResourceType.Tool)).toBe('tool');
    expect(String(ResourceType.Template)).toBe('template');
    expect(String(ResourceType.Sandbox)).toBe('sandbox');
  });
});

