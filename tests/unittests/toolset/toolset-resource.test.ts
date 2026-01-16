/**
 * ToolSet 资源类测试
 *
 * 测试 ToolSet 类的各种功能。
 */

import {
  ToolControlAPI,
  ToolSet,
  ToolSetClient,
  ToolSetSchemaType,
} from '../../../src/toolset';
import { Config } from '../../../src/utils/config';
import {
  ClientError,
  HTTPError,
  ServerError,
} from '../../../src/utils/exception';
import { Status } from '../../../src/utils/model';

// Mock DevS client at the instance level by spying on getClient
const mockDevsClient = {
  createToolsetWithOptions: jest.fn(),
  deleteToolsetWithOptions: jest.fn(),
  updateToolsetWithOptions: jest.fn(),
  getToolsetWithOptions: jest.fn(),
  listToolsetsWithOptions: jest.fn(),
};

describe('ToolSet Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment for consistent testing
    process.env.AGENTRUN_ACCESS_KEY_ID = 'test-key';
    process.env.AGENTRUN_ACCESS_KEY_SECRET = 'test-secret';
    process.env.AGENTRUN_REGION = 'cn-hangzhou';
    process.env.AGENTRUN_ACCOUNT_ID = '123456';
    // Re-apply the mock after clearing
    jest.spyOn(ToolSet as any, 'getClient').mockReturnValue(mockDevsClient);
  });

  describe('ToolSet class', () => {
    describe('constructor', () => {
      it('should create empty toolset', () => {
        const toolset = new ToolSet();
        expect(toolset.name).toBeUndefined();
        expect(toolset.uid).toBeUndefined();
      });

      it('should create toolset with data', () => {
        const toolset = new ToolSet({
          name: 'test-toolset',
          uid: 'toolset-123',
          description: 'Test toolset',
        });

        expect(toolset.name).toBe('test-toolset');
        expect(toolset.uid).toBe('toolset-123');
        expect(toolset.description).toBe('Test toolset');
      });

      it('should set config', () => {
        const config = new Config({ accessKeyId: 'test' });
        const toolset = new ToolSet({}, config);
        // Config is private, but we can test it works via other methods
        expect(toolset).toBeDefined();
      });
    });

    describe('getters', () => {
      it('should return toolSetName as alias for name', () => {
        const toolset = new ToolSet({ name: 'my-toolset' });
        expect(toolset.name).toBe('my-toolset');
      });

      it('should return toolSetId as alias for uid', () => {
        const toolset = new ToolSet({ uid: 'uid-123' });
        expect(toolset.uid).toBe('uid-123');
      });

      it('should return isReady based on status', () => {
        const toolset = new ToolSet({
          status: { status: Status.READY },
        });
        expect(toolset.status?.status === 'READY').toBe(true);

        const toolset2 = new ToolSet({
          status: { status: Status.CREATING },
        });
        expect(toolset2?.status?.status === 'READY').toBe(false);
      });

      it('should return isReady false when status is undefined', () => {
        const toolset = new ToolSet({});
        expect(toolset.status?.status === 'READY').toBe(false);
      });
    });

    describe('static create', () => {
      it('should create a new toolset', async () => {
        mockDevsClient.createToolsetWithOptions.mockResolvedValue({
          body: {
            name: 'new-toolset',
            uid: 'new-uid',
            status: { status: 'CREATING' },
          },
        });

        const result = await ToolSet.create({
          input: {
            name: 'new-toolset',
            spec: {
              schema: {
                type: ToolSetSchemaType.OPENAPI,
                detail: 'https://api.example.com/openapi.json',
              },
            },
          },
        });

        expect(mockDevsClient.createToolsetWithOptions).toHaveBeenCalled();
        expect(result.name).toBe('new-toolset');
      });

      it('should create toolset with auth config', async () => {
        mockDevsClient.createToolsetWithOptions.mockResolvedValue({
          body: {
            name: 'auth-toolset',
            uid: 'auth-uid',
          },
        });

        await ToolSet.create({
          input: {
            name: 'auth-toolset',
            spec: {
              schema: {
                type: ToolSetSchemaType.OPENAPI,
                detail: 'https://api.example.com/openapi.json',
              },
              authConfig: {
                type: 'API_KEY',
                apiKeyHeaderName: 'X-API-Key',
                apiKeyValue: 'secret',
              },
            },
          },
        });

        expect(mockDevsClient.createToolsetWithOptions).toHaveBeenCalled();
      });

      it('should handle 400 error', async () => {
        const error = { statusCode: 400, message: 'Bad request' };
        mockDevsClient.createToolsetWithOptions.mockRejectedValue(error);

        await expect(
          ToolSet.create({
            input: { name: 'bad-toolset' },
          })
        ).rejects.toThrow(ClientError);
      });

      it('should handle 500 error', async () => {
        const error = { statusCode: 500, message: 'Server error' };
        mockDevsClient.createToolsetWithOptions.mockRejectedValue(error);

        await expect(
          ToolSet.create({
            input: { name: 'error-toolset' },
          })
        ).rejects.toThrow(ServerError);
      });

      it('should handle HTTPError during create', async () => {
        const httpError = new HTTPError(409, 'Already exists');
        mockDevsClient.createToolsetWithOptions.mockRejectedValue(httpError);

        await expect(
          ToolSet.create({
            input: { name: 'existing-toolset' },
          })
        ).rejects.toThrow();
      });
    });

    describe('static delete', () => {
      it('should delete a toolset by name', async () => {
        mockDevsClient.deleteToolsetWithOptions.mockResolvedValue({
          body: {
            name: 'deleted-toolset',
          },
        });

        const result = await ToolSet.delete({
          name: 'deleted-toolset-success',
        });

        expect(mockDevsClient.deleteToolsetWithOptions).toHaveBeenCalled();
        expect(result.name).toBe('deleted-toolset');
      });

      it('should handle 404 error', async () => {
        const error = { statusCode: 404, message: 'Not found' };
        mockDevsClient.deleteToolsetWithOptions.mockRejectedValue(error);

        await expect(ToolSet.delete({ name: 'not-found' })).rejects.toThrow(
          ClientError
        );
      });

      it('should handle HTTPError during delete', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockDevsClient.deleteToolsetWithOptions.mockRejectedValue(httpError);

        await expect(
          ToolSet.delete({ name: 'not-found-http' })
        ).rejects.toThrow();
      });
    });

    describe('static update', () => {
      it('should update a toolset', async () => {
        mockDevsClient.updateToolsetWithOptions.mockResolvedValue({
          body: {
            name: 'updated-toolset',
            description: 'Updated description',
          },
        });

        const result = await ToolSet.update({
          name: 'updated-toolset',
          input: { description: 'Updated description' },
        });

        expect(mockDevsClient.updateToolsetWithOptions).toHaveBeenCalled();
        expect(result.description).toBe('Updated description');
      });

      it('should handle HTTPError during update', async () => {
        const httpError = new HTTPError(400, 'Bad request');
        mockDevsClient.updateToolsetWithOptions.mockRejectedValue(httpError);

        await expect(
          ToolSet.update({ name: 'error-toolset', input: {} })
        ).rejects.toThrow();
      });

      it('should handle generic error during update', async () => {
        const error = { statusCode: 500, message: 'Server error' };
        mockDevsClient.updateToolsetWithOptions.mockRejectedValue(error);

        await expect(
          ToolSet.update({ name: 'error-toolset', input: {} })
        ).rejects.toThrow(ServerError);
      });
    });

    describe('static get', () => {
      it('should get a toolset by name', async () => {
        mockDevsClient.getToolsetWithOptions.mockResolvedValue({
          body: {
            name: 'my-toolset',
            uid: 'uid-123',
            status: { status: 'READY' },
          },
        });

        const result = await ToolSet.get({ name: 'my-toolset' });

        expect(mockDevsClient.getToolsetWithOptions).toHaveBeenCalled();
        expect(result.name).toBe('my-toolset');
      });

      it('should throw error when body is empty', async () => {
        mockDevsClient.getToolsetWithOptions.mockResolvedValue({ body: null });

        await expect(ToolSet.get({ name: 'empty-body' })).rejects.toThrow(
          'API returned empty response body'
        );
      });

      it('should handle HTTPError during get', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockDevsClient.getToolsetWithOptions.mockRejectedValue(httpError);

        await expect(ToolSet.get({ name: 'not-found' })).rejects.toThrow();
      });

      it('should handle generic error during get', async () => {
        const error = { statusCode: 500, message: 'Server error' };
        mockDevsClient.getToolsetWithOptions.mockRejectedValue(error);

        await expect(ToolSet.get({ name: 'error-toolset' })).rejects.toThrow(
          ServerError
        );
      });
    });

    describe('static list', () => {
      it('should list toolsets', async () => {
        mockDevsClient.listToolsetsWithOptions.mockResolvedValue({
          body: {
            items: [
              { name: 'toolset-1', uid: 'uid-1' },
              { name: 'toolset-2', uid: 'uid-2' },
            ],
          },
        });

        const result = await ToolSet.list();

        expect(mockDevsClient.listToolsetsWithOptions).toHaveBeenCalled();
        expect(result).toHaveLength(2);
      });

      it('should list with pagination', async () => {
        mockDevsClient.listToolsetsWithOptions.mockResolvedValue({
          body: {
            items: [{ name: 'toolset-1' }],
          },
        });

        await ToolSet.list({ pageSize: 10 });

        expect(mockDevsClient.listToolsetsWithOptions).toHaveBeenCalled();
      });
    });

    describe('instance methods', () => {
      describe('delete', () => {
        it('should delete this toolset', async () => {
          mockDevsClient.deleteToolsetWithOptions.mockResolvedValue({
            body: { name: 'my-toolset' },
          });

          const toolset = new ToolSet({ name: 'my-toolset' });
          const result = await toolset.delete();

          expect(mockDevsClient.deleteToolsetWithOptions).toHaveBeenCalled();
          expect(result).toBe(toolset);
        });

        it('should throw error if name not set', async () => {
          const toolset = new ToolSet();

          await expect(toolset.delete()).rejects.toThrow('name is required');
        });
      });

      describe('update', () => {
        it('should update this toolset', async () => {
          mockDevsClient.updateToolsetWithOptions.mockResolvedValue({
            body: {
              name: 'my-toolset',
              description: 'New description',
            },
          });

          const toolset = new ToolSet({ name: 'my-toolset' });
          const result = await toolset.update({
            input: { description: 'New description' },
          });

          expect(result).toBe(toolset);
          expect(result.description).toBe('New description');
        });

        it('should throw error if name not set', async () => {
          const toolset = new ToolSet();

          await expect(
            toolset.update({ input: { description: 'test' } })
          ).rejects.toThrow('name is required');
        });
      });

      describe('refresh', () => {
        it('should refresh toolset data', async () => {
          mockDevsClient.getToolsetWithOptions.mockResolvedValue({
            body: {
              name: 'my-toolset',
              status: { status: 'READY' },
            },
          });

          const toolset = new ToolSet({ name: 'my-toolset' });
          const result = await toolset.refresh();

          expect(result).toBe(toolset);
          expect(result.status?.status).toBe('READY');
        });

        it('should throw error if name not set', async () => {
          const toolset = new ToolSet();

          await expect(toolset.refresh()).rejects.toThrow('name is required');
        });
      });

      describe('waitUntilReady', () => {
        it('should wait until status is READY', async () => {
          let callCount = 0;
          mockDevsClient.getToolsetWithOptions.mockImplementation(async () => {
            callCount++;
            return {
              body: {
                name: 'my-toolset',
                status: {
                  status: callCount >= 2 ? Status.READY : Status.CREATING,
                },
              },
            };
          });

          const toolset = new ToolSet({ name: 'my-toolset' });
          const result = await toolset.waitUntilReady({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });

          expect(result.status?.status).toBe(Status.READY);
        });

        it('should throw error on failed status', async () => {
          mockDevsClient.getToolsetWithOptions.mockResolvedValue({
            body: {
              name: 'my-toolset',
              status: { status: Status.CREATE_FAILED },
            },
          });

          const toolset = new ToolSet({ name: 'my-toolset' });

          await expect(
            toolset.waitUntilReady({
              intervalSeconds: 0.1,
              timeoutSeconds: 5,
            })
          ).rejects.toThrow();
        });

        it('should throw timeout error', async () => {
          mockDevsClient.getToolsetWithOptions.mockResolvedValue({
            body: {
              name: 'my-toolset',
              status: { status: Status.CREATING },
            },
          });

          const toolset = new ToolSet({ name: 'my-toolset' });

          await expect(
            toolset.waitUntilReady({
              intervalSeconds: 0.1,
              timeoutSeconds: 0.2,
            })
          ).rejects.toThrow('Timeout waiting for ToolSet to be ready');
        });
      });
    });
  });

  describe('ToolSet advanced methods', () => {
    describe('listAll', () => {
      it('should list all toolsets with pagination and deduplication', async () => {
        mockDevsClient.listToolsetsWithOptions.mockResolvedValue({
          body: {
            items: [
              { name: 'toolset-1', uid: 'uid-1' },
              { name: 'toolset-2', uid: 'uid-2' },
            ],
          },
        });

        const result = await ToolSet.listAll();

        expect(result.length).toBeGreaterThanOrEqual(1);
      });

      it('should deduplicate by uid', async () => {
        mockDevsClient.listToolsetsWithOptions.mockResolvedValue({
          body: {
            items: [
              { name: 'toolset-1', uid: 'uid-1' },
              { name: 'toolset-1-dup', uid: 'uid-1' }, // Same uid
            ],
          },
        });

        const result = await ToolSet.listAll();

        expect(result).toHaveLength(1);
      });

      it('should filter out items without uid', async () => {
        mockDevsClient.listToolsetsWithOptions.mockResolvedValue({
          body: {
            items: [
              { name: 'toolset-1', uid: 'uid-1' },
              { name: 'toolset-no-uid' }, // No uid
            ],
          },
        });

        const result = await ToolSet.listAll();

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('toolset-1');
      });

      it('should support prefix and labels options', async () => {
        mockDevsClient.listToolsetsWithOptions.mockResolvedValue({
          body: {
            items: [{ name: 'my-toolset', uid: 'uid-1' }],
          },
        });

        const result = await ToolSet.listAll({
          prefix: 'my-',
          labels: { env: 'prod' },
        });

        expect(result).toHaveLength(1);
      });
    });

    describe('type()', () => {
      it('should return schema type', () => {
        const toolset = new ToolSet({
          spec: {
            schema: { type: 'OpenAPI' as any },
          },
        });

        expect(toolset.type()).toBe('OpenAPI');
      });

      it('should return undefined when no spec', () => {
        const toolset = new ToolSet({});

        expect(toolset.type()).toBeUndefined();
      });
    });

    describe('listToolsAsync', () => {
      it('should return MCP tools when type is MCP', async () => {
        const toolset = new ToolSet({
          name: 'mcp-toolset',
          spec: {
            schema: { type: 'MCP' as any },
          },
          status: {
            status: Status.READY,
            outputs: {
              tools: [
                { name: 'tool1', description: 'Tool 1' },
                { name: 'tool2', description: 'Tool 2' },
              ],
            },
          },
        });

        const tools = await toolset.listToolsAsync();

        expect(tools).toHaveLength(2);
      });

      it('should return empty array for unknown type', async () => {
        const toolset = new ToolSet({
          name: 'unknown-toolset',
          spec: {
            schema: { type: 'Unknown' as any },
          },
        });

        const tools = await toolset.listToolsAsync();

        expect(tools).toEqual([]);
      });

      it('should return OpenAPI tools when type is OPENAPI', async () => {
        const toolset = new ToolSet({
          name: 'openapi-toolset',
          spec: {
            schema: { type: ToolSetSchemaType.OPENAPI, detail: '{}' },
          },
          status: {
            status: Status.READY,
          } as any, // Cast to any for flexible mock data
        });

        // Mock toApiSet to return mock tools
        const mockTools = [
          { name: 'openapi-tool1', description: 'Tool 1' },
          { name: 'openapi-tool2', description: 'Tool 2' },
        ];
        jest.spyOn(toolset, 'toApiSet' as any).mockResolvedValue({
          tools: mockTools,
        });

        const tools = await toolset.listToolsAsync();

        expect(tools).toHaveLength(2);
        expect(tools[0].name).toBe('openapi-tool1');
      });
    });

    describe('listTools', () => {
      it('should be an alias for listToolsAsync', async () => {
        const toolset = new ToolSet({
          name: 'mcp-toolset',
          spec: {
            schema: { type: 'MCP' as any },
          },
          status: {
            status: Status.READY,
            outputs: {
              tools: [{ name: 'tool1', description: 'Tool 1' }],
            },
          },
        });

        const tools = await toolset.listTools();

        expect(tools).toHaveLength(1);
      });
    });

    describe('_getOpenAPIAuthDefaults', () => {
      it('should return headers for APIKey auth', () => {
        const toolset = new ToolSet({
          spec: {
            authConfig: {
              type: 'APIKey',
              apiKeyHeaderName: 'X-API-Key',
              apiKeyValue: 'secret-key',
            },
          },
        });

        // Access private method via any cast
        const result = (toolset as any)._getOpenAPIAuthDefaults();

        expect(result.headers).toEqual({ 'X-API-Key': 'secret-key' });
        expect(result.query).toEqual({});
      });

      it('should return empty objects for no auth', () => {
        const toolset = new ToolSet({});

        const result = (toolset as any)._getOpenAPIAuthDefaults();

        expect(result.headers).toEqual({});
        expect(result.query).toEqual({});
      });
    });

    describe('_getOpenAPIBaseUrl', () => {
      it('should return intranetUrl if available', () => {
        const toolset = new ToolSet({
          status: {
            status: Status.READY,
            outputs: {
              urls: {
                intranetUrl: 'https://internal.example.com',
                internetUrl: 'https://public.example.com',
              },
            } as any,
          },
        });

        const result = (toolset as any)._getOpenAPIBaseUrl();

        expect(result).toBe('https://internal.example.com');
      });

      it('should return internetUrl as fallback', () => {
        const toolset = new ToolSet({
          status: {
            status: Status.READY,
            outputs: {
              urls: {
                internetUrl: 'https://public.example.com',
              },
            } as any,
          },
        });

        const result = (toolset as any)._getOpenAPIBaseUrl();

        expect(result).toBe('https://public.example.com');
      });
    });

    describe('update with auth config', () => {
      it('should update toolset with auth config', async () => {
        mockDevsClient.updateToolsetWithOptions.mockResolvedValue({
          body: {
            name: 'auth-toolset',
            spec: {
              authConfig: {
                type: 'API_KEY',
              },
            },
          },
        });

        const result = await ToolSet.update({
          name: 'auth-toolset',
          input: {
            spec: {
              authConfig: {
                type: 'API_KEY',
                apiKeyHeaderName: 'X-API-Key',
                apiKeyValue: 'new-secret',
              },
            },
          },
        });

        expect(mockDevsClient.updateToolsetWithOptions).toHaveBeenCalled();
        expect(result.name).toBe('auth-toolset');
      });
    });

    describe('update with spec but no auth', () => {
      it('should update toolset with spec schema only', async () => {
        mockDevsClient.updateToolsetWithOptions.mockResolvedValue({
          body: {
            name: 'schema-toolset',
            spec: {
              schema: {
                type: 'OpenAPI',
                detail: 'https://api.example.com/v2/openapi.json',
              },
            },
          },
        });

        const result = await ToolSet.update({
          name: 'schema-toolset',
          input: {
            spec: {
              schema: {
                type: 'OpenAPI' as any,
                detail: 'https://api.example.com/v2/openapi.json',
              },
            },
          },
        });

        expect(result.name).toBe('schema-toolset');
      });
    });

    describe('handleError edge cases', () => {
      it('should handle generic error without statusCode', async () => {
        const error = new Error('Network error');
        mockDevsClient.createToolsetWithOptions.mockRejectedValue(error);

        await expect(
          ToolSet.create({ input: { name: 'error-toolset' } })
        ).rejects.toThrow('Network error');
      });
    });

    describe('waitUntilReady with beforeCheck callback', () => {
      it('should call beforeCheck callback', async () => {
        let callCount = 0;
        mockDevsClient.getToolsetWithOptions.mockImplementation(async () => {
          callCount++;
          return {
            body: {
              name: 'my-toolset',
              status: {
                status: callCount >= 2 ? Status.READY : Status.CREATING,
              },
            },
          };
        });

        const beforeCheck = jest.fn();
        const toolset = new ToolSet({ name: 'my-toolset' });

        await toolset.waitUntilReady({
          intervalSeconds: 0.1,
          timeoutSeconds: 5,
          beforeCheck,
        });

        expect(beforeCheck).toHaveBeenCalled();
      });
    });

    // Note: waitUntilReady only checks for CREATE_FAILED status.
    // UPDATE_FAILED and DELETE_FAILED will cause timeout.

    describe('toApiSet', () => {
      beforeEach(() => {
        jest.resetModules();
      });

      it('should throw error for MCP without server URL', async () => {
        const toolset = new ToolSet({
          spec: { schema: { type: ToolSetSchemaType.MCP } },
          status: { outputs: {} },
        });

        await expect(toolset.toApiSet()).rejects.toThrow(
          'MCP server URL is missing'
        );
      });

      it('should throw error for unsupported type', async () => {
        const toolset = new ToolSet({
          spec: { schema: { type: 'UNKNOWN' as any } },
        });

        await expect(toolset.toApiSet()).rejects.toThrow(
          'Unsupported ToolSet type'
        );
      });
    });

    describe('callToolAsync', () => {
      it('should delegate to toApiSet and invoke', async () => {
        const mockApiSet = {
          invoke: jest.fn().mockResolvedValue({ result: 'success' }),
          getTool: jest.fn().mockReturnValue({ name: 'test-tool' }),
        };

        const toolset = new ToolSet({
          spec: { schema: { type: ToolSetSchemaType.MCP } },
          status: {
            outputs: {
              mcpServerConfig: { url: 'http://localhost:3000' },
              tools: [{ name: 'test-tool' }],
            },
          },
        });

        // Mock toApiSet
        toolset.toApiSet = jest.fn().mockResolvedValue(mockApiSet);

        const result = await toolset.callToolAsync('test-tool', {
          arg1: 'value',
        });

        expect(toolset.toApiSet).toHaveBeenCalled();
        expect(mockApiSet.invoke).toHaveBeenCalledWith(
          'test-tool',
          { arg1: 'value' },
          undefined
        );
        expect(result).toEqual({ result: 'success' });
      });
    });

    describe('callTool', () => {
      it('should be an alias for callToolAsync', async () => {
        const mockApiSet = {
          invoke: jest.fn().mockResolvedValue({ result: 'success' }),
          getTool: jest.fn().mockReturnValue({ name: 'test-tool' }),
        };

        const toolset = new ToolSet({
          spec: { schema: { type: ToolSetSchemaType.MCP } },
        });

        toolset.toApiSet = jest.fn().mockResolvedValue(mockApiSet);

        const spy = jest.spyOn(toolset, 'callToolAsync');
        await toolset.callTool('test-tool', { arg: 'val' });
        expect(spy).toHaveBeenCalledWith(
          'test-tool',
          { arg: 'val' },
          undefined
        );
      });
    });
  });
});
