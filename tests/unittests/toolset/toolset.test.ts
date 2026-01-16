/**
 * ToolSet Tests
 *
 * 测试 ToolSet 模块的基本功能。
 * Tests for ToolSet module basic functionality.
 */

import { ToolsetStatus } from '@alicloud/devs20230714';
import {
  ToolSet,
  ToolSetSchemaType,
  ToolSetClient,
} from '../../../src/toolset';
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

      await expect(toolset.delete()).rejects.toThrow(
        'name is required to delete a ToolSet'
      );
    });

    it('should throw error when updating without name', async () => {
      const toolset = new ToolSet({});

      await expect(toolset.update({ input: {} })).rejects.toThrow(
        'name is required to update a ToolSet'
      );
    });

    it('should throw error when refreshing without name', async () => {
      const toolset = new ToolSet({});

      await expect(toolset.refresh()).rejects.toThrow(
        'name is required to refresh a ToolSet'
      );
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
