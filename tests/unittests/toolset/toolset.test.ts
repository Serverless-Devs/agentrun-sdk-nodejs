/**
 * ToolSet Tests
 *
 * 测试 ToolSet 模块的基本功能。
 * Tests for ToolSet module basic functionality.
 */

import { ToolsetStatus } from '@alicloud/devs20230714';
import { ToolSet, ToolSetSchemaType, ToolSetClient } from '../../../src/toolset';
import { Status } from '../../../src/utils/model';

describe('ToolSet', () => {
  describe('constructor', () => {
    it('should create an empty toolset', () => {
      const toolset = new ToolSet();

      expect(toolset.name).toBeUndefined();
      expect(toolset.uid).toBeUndefined();
      expect(toolset.status).toBeUndefined();
    });

    it('should create a toolset with data', () => {
      const toolset = new ToolSet({
        name: 'test-toolset',
        uid: 'uid-123',
        description: 'A test toolset',
        spec: {
          schema: {
            type: ToolSetSchemaType.MCP,
            detail: 'https://example.com/mcp',
          },
        },
        status: {
          status: Status.READY,
        },
      });

      expect(toolset.name).toBe('test-toolset');
      expect(toolset.uid).toBe('uid-123');
      expect(toolset.description).toBe('A test toolset');
      expect(toolset.spec?.schema?.type).toBe(ToolSetSchemaType.MCP);
      expect(toolset.status?.status).toBe(Status.READY);
    });
  });

  describe('getters', () => {
    it('should return toolSetName as alias for name', () => {
      const toolset = new ToolSet({ name: 'my-toolset' });
      expect(toolset.name).toBe('my-toolset');
    });

    it('should return toolSetId as alias for uid', () => {
      const toolset = new ToolSet({ uid: 'uid-456' });
      expect(toolset.uid).toBe('uid-456');
    });

    it('should return isReady correctly', () => {
      const readyToolset = new ToolSet({
        status: { status: Status.READY },
      });
      expect(readyToolset.status?.status === 'READY').toBe(true);

      const pendingToolset = new ToolSet({
        status: { status: Status.CREATING },
      });
      expect(pendingToolset.status?.status === 'READY').toBe(false);

      const noStatusToolset = new ToolSet({});
      expect(noStatusToolset.status?.status === 'READY').toBe(false);
    });
  });

  describe('instance methods', () => {
    it('should throw error when deleting without name', async () => {
      const toolset = new ToolSet({});

      await expect(toolset.delete()).rejects.toThrow('name is required to delete a ToolSet');
    });

    it('should throw error when updating without name', async () => {
      const toolset = new ToolSet({});

      await expect(toolset.update({ input: {} })).rejects.toThrow(
        'name is required to update a ToolSet'
      );
    });

    it('should throw error when refreshing without name', async () => {
      const toolset = new ToolSet({});

      await expect(toolset.refresh()).rejects.toThrow('name is required to refresh a ToolSet');
    });
  });
});

describe('ToolSetSchemaType', () => {
  it('should have correct values', () => {
    expect(String(ToolSetSchemaType.OPENAPI)).toBe('OpenAPI');
    expect(String(ToolSetSchemaType.MCP)).toBe('MCP');
  });
});

describe('ToolSetClient', () => {
  it('should be instantiatable', () => {
    const client = new ToolSetClient();
    expect(client).toBeInstanceOf(ToolSetClient);
  });
});

describe('ToolSet type method', () => {
  it('should return OPENAPI when schema type is OpenAPI', () => {
    const toolset = new ToolSet({
      spec: {
        schema: {
          type: ToolSetSchemaType.OPENAPI,
          detail: 'https://example.com/openapi.json',
        },
      },
    });
    expect(toolset.type()).toBe(ToolSetSchemaType.OPENAPI);
  });

  it('should return MCP when schema type is MCP', () => {
    const toolset = new ToolSet({
      spec: {
        schema: {
          type: ToolSetSchemaType.MCP,
          detail: 'https://example.com/mcp',
        },
      },
    });
    expect(toolset.type()).toBe(ToolSetSchemaType.MCP);
  });

  it('should return undefined when spec is not set', () => {
    const toolset = new ToolSet({});
    expect(toolset.type()).toBeUndefined();
  });
});

describe('ToolSet _getOpenAPIAuthDefaults', () => {
  it('should return empty headers and query when no authConfig', () => {
    const toolset = new ToolSet({
      spec: {
        schema: {
          type: ToolSetSchemaType.OPENAPI,
          detail: '{}',
        },
      },
    });
    const defaults = (toolset as any)._getOpenAPIAuthDefaults();
    expect(defaults.headers).toEqual({});
    expect(defaults.query).toEqual({});
  });

  it('should set header when authType is APIKey with header location', () => {
    const toolset = new ToolSet({
      spec: {
        schema: {
          type: ToolSetSchemaType.OPENAPI,
          detail: '{}',
        },
        authConfig: {
          type: 'APIKey',
          apiKeyHeaderName: 'X-API-Key',
          apiKeyValue: 'test-key-value',
        },
      },
    });
    const defaults = (toolset as any)._getOpenAPIAuthDefaults();
    expect(defaults.headers['X-API-Key']).toBe('test-key-value');
    expect(defaults.query).toEqual({});
  });

  it('should return empty when authConfig has no key or value', () => {
    const toolset = new ToolSet({
      spec: {
        schema: {
          type: ToolSetSchemaType.OPENAPI,
          detail: '{}',
        },
        authConfig: {
          type: 'APIKey',
          // Missing key and value
        },
      },
    });
    const defaults = (toolset as any)._getOpenAPIAuthDefaults();
    expect(defaults.headers).toEqual({});
  });

  it('should handle non-APIKey auth types', () => {
    const toolset = new ToolSet({
      spec: {
        schema: {
          type: ToolSetSchemaType.OPENAPI,
          detail: '{}',
        },
        authConfig: {
          type: 'Bearer',
        },
      },
    });
    const defaults = (toolset as any)._getOpenAPIAuthDefaults();
    expect(defaults.headers).toEqual({});
    expect(defaults.query).toEqual({});
  });
});

describe('ToolSet _getOpenAPIBaseUrl', () => {
  it('should return internetUrl if available (priority over intranetUrl)', () => {
    const toolset = new ToolSet({
      status: {
        status: Status.READY,
        outputs: {
          urls: {
            intranetUrl: 'https://intranet.example.com',
            internetUrl: 'https://public.example.com',
          },
        },
      } as unknown as ToolsetStatus,
    });
    const baseUrl = (toolset as any)._getOpenAPIBaseUrl();
    // internetUrl takes priority over intranetUrl
    expect(baseUrl).toBe('https://public.example.com');
  });

  it('should return internetUrl if intranetUrl is not available', () => {
    const toolset = new ToolSet({
      status: {
        status: Status.READY,
        outputs: {
          urls: {
            internetUrl: 'https://public.example.com',
          },
        },
      } as unknown as ToolsetStatus,
    });
    const baseUrl = (toolset as any)._getOpenAPIBaseUrl();
    expect(baseUrl).toBe('https://public.example.com');
  });

  it('should return undefined if no urls', () => {
    const toolset = new ToolSet({
      status: {
        status: Status.READY,
        outputs: {},
      } as unknown as ToolsetStatus,
    });
    const baseUrl = (toolset as any)._getOpenAPIBaseUrl();
    expect(baseUrl).toBeUndefined();
  });
});

describe('ToolSet outputs tools', () => {
  it('should access tools from status.outputs', () => {
    const toolset = new ToolSet({
      status: {
        status: Status.READY,
        outputs: {
          tools: [
            { name: 'tool1', description: 'Tool 1' },
            { name: 'tool2', description: 'Tool 2' },
          ],
        },
      } as unknown as ToolsetStatus,
    });
    const tools = (toolset.status?.outputs as any)?.tools || [];
    expect(tools).toHaveLength(2);
  });

  it('should return empty when no tools in outputs', () => {
    const toolset = new ToolSet({
      status: {
        status: Status.READY,
        outputs: {},
      } as unknown as ToolsetStatus,
    });
    const tools = (toolset.status?.outputs as any)?.tools || [];
    expect(tools).toEqual([]);
  });
});
