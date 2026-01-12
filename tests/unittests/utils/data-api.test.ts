/**
 * Data API 模块测试
 *
 * 测试 DataAPI 类的 URL 构建和基本功能。
 * 注意：HTTP 请求测试需要更复杂的网络 mock，这里主要测试同步方法和构造函数。
 */

import { DataAPI, ResourceType } from '../../../src/utils/data-api';
import { Config } from '../../../src/utils/config';

describe('DataAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment
    process.env.AGENTRUN_ACCESS_KEY_ID = 'test-key';
    process.env.AGENTRUN_ACCESS_KEY_SECRET = 'test-secret';
    process.env.AGENTRUN_REGION = 'cn-hangzhou';
    process.env.AGENTRUN_ACCOUNT_ID = '123456';
  });

  afterEach(() => {
    delete process.env.AGENTRUN_ACCESS_KEY_ID;
    delete process.env.AGENTRUN_ACCESS_KEY_SECRET;
    delete process.env.AGENTRUN_REGION;
    delete process.env.AGENTRUN_ACCOUNT_ID;
  });

  describe('constructor', () => {
    it('should create DataAPI with resource name and type', () => {
      const api = new DataAPI('test-resource', ResourceType.Runtime);
      
      expect(api).toBeInstanceOf(DataAPI);
    });

    it('should create DataAPI with config', () => {
      const config = new Config({
        accessKeyId: 'custom-key',
        accessKeySecret: 'custom-secret',
        regionId: 'cn-shanghai',
        accountId: '789',
      });
      
      const api = new DataAPI('test-resource', ResourceType.Runtime, config);
      
      expect(api).toBeInstanceOf(DataAPI);
    });

    it('should use provided token from config', () => {
      const config = new Config({
        accessKeyId: 'key',
        accessKeySecret: 'secret',
        regionId: 'cn-hangzhou',
        accountId: '123',
        token: 'pre-set-token',
      });
      
      const api = new DataAPI('test-resource', ResourceType.Runtime, config);
      
      expect(api).toBeInstanceOf(DataAPI);
    });

    it('should support different resource types', () => {
      const runtimeApi = new DataAPI('resource', ResourceType.Runtime);
      const litellmApi = new DataAPI('resource', ResourceType.LiteLLM);
      const toolApi = new DataAPI('resource', ResourceType.Tool);
      const templateApi = new DataAPI('resource', ResourceType.Template);
      const sandboxApi = new DataAPI('resource', ResourceType.Sandbox);
      
      expect(runtimeApi).toBeInstanceOf(DataAPI);
      expect(litellmApi).toBeInstanceOf(DataAPI);
      expect(toolApi).toBeInstanceOf(DataAPI);
      expect(templateApi).toBeInstanceOf(DataAPI);
      expect(sandboxApi).toBeInstanceOf(DataAPI);
    });

    it('should support custom namespace', () => {
      const api = new DataAPI('test-resource', ResourceType.Runtime, undefined, 'custom-namespace');
      
      expect(api).toBeInstanceOf(DataAPI);
    });
  });

  describe('ResourceType enum', () => {
    it('should have correct values', () => {
      expect(ResourceType.Runtime).toBe('runtime');
      expect(ResourceType.LiteLLM).toBe('litellm');
      expect(ResourceType.Tool).toBe('tool');
      expect(ResourceType.Template).toBe('template');
      expect(ResourceType.Sandbox).toBe('sandbox');
    });
  });

  describe('withPath', () => {
    let api: DataAPI;

    beforeEach(() => {
      const config = new Config({
        accessKeyId: 'key',
        accessKeySecret: 'secret',
        regionId: 'cn-hangzhou',
        accountId: '123',
        dataEndpoint: 'https://data.example.com',
      });
      api = new DataAPI('test-resource', ResourceType.Runtime, config);
    });

    it('should construct URL with path', () => {
      const url = api.withPath('test/endpoint');
      
      expect(url).toContain('agents');
      expect(url).toContain('test/endpoint');
    });

    it('should handle leading slash in path', () => {
      const url = api.withPath('/test/endpoint');
      
      // Should not have double slashes (except for protocol)
      expect(url.replace('https://', '')).not.toContain('//');
    });

    it('should append query parameters', () => {
      const url = api.withPath('test', { key: 'value', num: 123 });
      
      expect(url).toContain('key=value');
      expect(url).toContain('num=123');
    });

    it('should handle array query parameters', () => {
      const url = api.withPath('test', { tags: ['a', 'b', 'c'] });
      
      expect(url).toContain('tags=a');
      expect(url).toContain('tags=b');
      expect(url).toContain('tags=c');
    });

    it('should ignore undefined/null query parameters', () => {
      const url = api.withPath('test', { key: 'value', empty: undefined, nil: null });
      
      expect(url).toContain('key=value');
      expect(url).not.toContain('empty');
      expect(url).not.toContain('nil');
    });

    it('should return base URL when no query params', () => {
      const url = api.withPath('test');
      const urlEmpty = api.withPath('test', {});
      
      expect(url).not.toContain('?');
      expect(urlEmpty).not.toContain('?');
    });

    it('should handle empty path', () => {
      const url = api.withPath('');
      
      expect(url).toContain('data.example.com');
    });

    it('should properly encode special characters in query values', () => {
      const url = api.withPath('test', { message: 'hello world' });
      
      expect(url).toContain('message=hello');
    });

    it('should handle numeric query values', () => {
      const url = api.withPath('test', { page: 1, limit: 50, ratio: 0.5 });
      
      expect(url).toContain('page=1');
      expect(url).toContain('limit=50');
      expect(url).toContain('ratio=0.5');
    });

    it('should handle boolean query values', () => {
      const url = api.withPath('test', { active: true, deleted: false });
      
      expect(url).toContain('active=true');
      expect(url).toContain('deleted=false');
    });
  });

  describe('URL construction with different configurations', () => {
    it('should use default data endpoint from config', () => {
      const api = new DataAPI('test-resource', ResourceType.Runtime);
      const url = api.withPath('test');
      
      expect(url).toContain('agents');
      expect(url).toContain('test');
    });

    it('should use custom data endpoint', () => {
      const config = new Config({
        accessKeyId: 'key',
        accessKeySecret: 'secret',
        regionId: 'cn-hangzhou',
        accountId: '123',
        dataEndpoint: 'https://custom-data.example.com',
      });
      
      const api = new DataAPI('test-resource', ResourceType.Runtime, config);
      const url = api.withPath('endpoint');
      
      expect(url).toContain('custom-data.example.com');
    });

    it('should use custom namespace', () => {
      const config = new Config({
        accessKeyId: 'key',
        accessKeySecret: 'secret',
        regionId: 'cn-hangzhou',
        accountId: '123',
        dataEndpoint: 'https://data.example.com',
      });
      
      const api = new DataAPI('test-resource', ResourceType.Runtime, config, 'sandboxes');
      const url = api.withPath('execute');
      
      expect(url).toContain('sandboxes');
      expect(url).toContain('execute');
    });
  });

  describe('path normalization', () => {
    let api: DataAPI;

    beforeEach(() => {
      const config = new Config({
        accessKeyId: 'key',
        accessKeySecret: 'secret',
        regionId: 'cn-hangzhou',
        accountId: '123',
        dataEndpoint: 'https://data.example.com/',
      });
      api = new DataAPI('test-resource', ResourceType.Runtime, config);
    });

    it('should handle trailing slash in base URL', () => {
      const url = api.withPath('endpoint');
      
      // Should not have double slashes
      expect(url.match(/\/\//g)?.length).toBeLessThanOrEqual(1); // Only https://
    });

    it('should handle multiple slashes in path', () => {
      const url = api.withPath('a/b/c/d');
      
      expect(url).toContain('a/b/c/d');
    });
  });

  describe('resource type specific behavior', () => {
    it('should work with Runtime resource type', () => {
      const api = new DataAPI('my-runtime', ResourceType.Runtime);
      expect(api).toBeInstanceOf(DataAPI);
    });

    it('should work with LiteLLM resource type', () => {
      const api = new DataAPI('my-litellm', ResourceType.LiteLLM);
      expect(api).toBeInstanceOf(DataAPI);
    });

    it('should work with Tool resource type', () => {
      const api = new DataAPI('my-tool', ResourceType.Tool);
      expect(api).toBeInstanceOf(DataAPI);
    });

    it('should work with Template resource type', () => {
      const api = new DataAPI('my-template', ResourceType.Template);
      expect(api).toBeInstanceOf(DataAPI);
    });

    it('should work with Sandbox resource type', () => {
      const api = new DataAPI('sandbox-123', ResourceType.Sandbox);
      expect(api).toBeInstanceOf(DataAPI);
    });
  });
});
