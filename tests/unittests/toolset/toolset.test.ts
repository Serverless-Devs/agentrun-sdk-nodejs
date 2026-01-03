/**
 * ToolSet Tests
 *
 * 测试 ToolSet 模块的基本功能。
 * Tests for ToolSet module basic functionality.
 */



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
      expect(toolset.toolSetName).toBe('my-toolset');
    });

    it('should return toolSetId as alias for uid', () => {
      const toolset = new ToolSet({ uid: 'uid-456' });
      expect(toolset.toolSetId).toBe('uid-456');
    });

    it('should return isReady correctly', () => {
      const readyToolset = new ToolSet({
        status: { status: Status.READY },
      });
      expect(readyToolset.isReady).toBe(true);

      const pendingToolset = new ToolSet({
        status: { status: Status.CREATING },
      });
      expect(pendingToolset.isReady).toBe(false);

      const noStatusToolset = new ToolSet({});
      expect(noStatusToolset.isReady).toBe(false);
    });
  });

  describe('instance methods', () => {
    it('should throw error when deleting without name', async () => {
      const toolset = new ToolSet({});

      await expect(toolset.delete()).rejects.toThrow('name is required to delete a ToolSet');
    });

    it('should throw error when updating without name', async () => {
      const toolset = new ToolSet({});

      await expect(toolset.update({ input: {} })).rejects.toThrow('name is required to update a ToolSet');
    });

    it('should throw error when refreshing without name', async () => {
      const toolset = new ToolSet({});

      await expect(toolset.refresh()).rejects.toThrow('name is required to refresh a ToolSet');
    });
  });

  describe('fromInnerObject', () => {
    it('should convert DevS SDK response to ToolSet', () => {
      const mockSdkResponse = {
        name: 'sdk-toolset',
        uid: 'uid-789',
        kind: 'Toolset',
        description: 'SDK Toolset',
        createdTime: '2024-01-01T00:00:00Z',
        generation: 1,
        labels: { env: 'test' },
        spec: {
          schema: {
            type: 'OpenAPI',
            detail: 'https://api.example.com/openapi.yaml',
          },
          authConfig: {
            type: 'apiKey',
            parameters: {
              apiKeyParameter: {
                key: 'X-API-Key',
                value: 'secret',
              },
            },
          },
        },
        status: {
          status: 'READY',
          statusReason: 'Success',
          outputs: {
            mcpServerConfig: {
              url: 'https://mcp.example.com',
              transport: 'http',
            },
            tools: [
              { name: 'tool1', description: 'First tool' },
              { name: 'tool2', description: 'Second tool' },
            ],
            urls: {
              cdpUrl: 'https://cdp.example.com',
            },
          },
        },
      };

      const toolset = ToolSet.fromInnerObject(mockSdkResponse as any);

      expect(toolset.name).toBe('sdk-toolset');
      expect(toolset.uid).toBe('uid-789');
      expect(toolset.kind).toBe('Toolset');
      expect(toolset.description).toBe('SDK Toolset');
      expect(toolset.labels).toEqual({ env: 'test' });
      expect(String(toolset.spec?.schema?.type)).toBe('OpenAPI');
      expect(toolset.spec?.schema?.detail).toBe('https://api.example.com/openapi.yaml');
      expect(toolset.spec?.authConfig?.type).toBe('apiKey');
      expect(toolset.spec?.authConfig?.apiKeyHeaderName).toBe('X-API-Key');
      expect(String(toolset.status?.status)).toBe('READY');
      expect(toolset.status?.outputs?.tools).toHaveLength(2);
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
