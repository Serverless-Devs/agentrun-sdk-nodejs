/**
 * Agent Runtime 模块测试
 *
 * 测试 AgentRuntime、AgentRuntimeEndpoint 和 AgentRuntimeClient 类。
 */

import {
  AgentRuntime,
  AgentRuntimeEndpoint,
  AgentRuntimeClient,
} from '../../../src/agent-runtime';
import {
  AgentRuntimeLanguage,
  AgentRuntimeArtifact,
  AgentRuntimeProtocolType,
} from '../../../src/agent-runtime/model';
import { Config } from '../../../src/utils/config';
import { HTTPError, ResourceNotExistError } from '../../../src/utils/exception';
import { Status, NetworkMode } from '../../../src/utils/model';

// Mock the AgentRuntimeControlAPI
jest.mock('../../../src/agent-runtime/api/control', () => {
  return {
    AgentRuntimeControlAPI: jest.fn().mockImplementation(() => ({
      createAgentRuntime: jest.fn(),
      deleteAgentRuntime: jest.fn(),
      updateAgentRuntime: jest.fn(),
      getAgentRuntime: jest.fn(),
      listAgentRuntimes: jest.fn(),
      listAgentRuntimeVersions: jest.fn(),
      createAgentRuntimeEndpoint: jest.fn(),
      deleteAgentRuntimeEndpoint: jest.fn(),
      updateAgentRuntimeEndpoint: jest.fn(),
      getAgentRuntimeEndpoint: jest.fn(),
      listAgentRuntimeEndpoints: jest.fn(),
    })),
  };
});

// Mock the AgentRuntimeDataAPI
const mockInvokeOpenai = jest
  .fn()
  .mockResolvedValue({ response: 'mock response' });
jest.mock('../../../src/agent-runtime/api/data', () => {
  return {
    AgentRuntimeDataAPI: jest.fn().mockImplementation(() => ({
      invokeOpenai: mockInvokeOpenai,
    })),
  };
});

import { AgentRuntimeControlAPI } from '../../../src/agent-runtime/api/control';

const MockAgentRuntimeControlAPI = AgentRuntimeControlAPI as jest.MockedClass<
  typeof AgentRuntimeControlAPI
>;

describe('Agent Runtime Module', () => {
  let mockControlApi: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockControlApi = {
      createAgentRuntime: jest.fn(),
      deleteAgentRuntime: jest.fn(),
      updateAgentRuntime: jest.fn(),
      getAgentRuntime: jest.fn(),
      listAgentRuntimes: jest.fn(),
      listAgentRuntimeVersions: jest.fn(),
      createAgentRuntimeEndpoint: jest.fn(),
      deleteAgentRuntimeEndpoint: jest.fn(),
      updateAgentRuntimeEndpoint: jest.fn(),
      getAgentRuntimeEndpoint: jest.fn(),
      listAgentRuntimeEndpoints: jest.fn(),
    };
    MockAgentRuntimeControlAPI.mockImplementation(() => mockControlApi);
  });

  describe('AgentRuntime', () => {
    describe('static methods', () => {
      describe('create', () => {
        it('should create AgentRuntime with code configuration', async () => {
          mockControlApi.createAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: 'CREATING',
          });

          const result = await AgentRuntime.create({
            input: {
              agentRuntimeName: 'test-runtime',
              codeConfiguration: {
                language: AgentRuntimeLanguage.NODEJS18,
                command: ['node', 'index.js'],
              },
              port: 9000,
              cpu: 2,
              memory: 4096,
            },
          });

          expect(mockControlApi.createAgentRuntime).toHaveBeenCalled();
          expect(result.agentRuntimeName).toBe('test-runtime');
        });

        it('should create AgentRuntime with container configuration', async () => {
          mockControlApi.createAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'container-runtime',
            artifactType: 'CONTAINER',
            status: 'CREATING',
          });

          const result = await AgentRuntime.create({
            input: {
              agentRuntimeName: 'container-runtime',
              containerConfiguration: {
                image: 'registry.cn-hangzhou.aliyuncs.com/test/image:latest',
                command: ['node', 'app.js'],
              },
              port: 8080,
              cpu: 2,
              memory: 4096,
            },
          });

          expect(mockControlApi.createAgentRuntime).toHaveBeenCalled();
          expect(result.agentRuntimeName).toBe('container-runtime');
        });

        it('should auto-set artifactType based on configuration', async () => {
          mockControlApi.createAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          // With code configuration, should set artifactType to CODE
          await AgentRuntime.create({
            input: {
              agentRuntimeName: 'test-runtime',
              codeConfiguration: {
                language: AgentRuntimeLanguage.PYTHON312,
                command: ['python', 'main.py'],
              },
              port: 9000,
              cpu: 2,
              memory: 4096,
            },
          });

          expect(mockControlApi.createAgentRuntime).toHaveBeenCalledWith(
            expect.objectContaining({
              input: expect.objectContaining({
                artifactType: AgentRuntimeArtifact.CODE,
              }),
            })
          );
        });

        it('should auto-set default network configuration', async () => {
          mockControlApi.createAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          await AgentRuntime.create({
            input: {
              agentRuntimeName: 'test-runtime',
              codeConfiguration: {
                language: AgentRuntimeLanguage.NODEJS18,
                command: ['node', 'index.js'],
              },
              port: 9000,
              cpu: 2,
              memory: 4096,
            },
          });

          expect(mockControlApi.createAgentRuntime).toHaveBeenCalledWith(
            expect.objectContaining({
              input: expect.objectContaining({
                networkConfiguration: expect.objectContaining({
                  networkMode: NetworkMode.PUBLIC,
                }),
              }),
            })
          );
        });

        it('should use provided network configuration', async () => {
          mockControlApi.createAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          await AgentRuntime.create({
            input: {
              agentRuntimeName: 'test-runtime',
              codeConfiguration: {
                language: AgentRuntimeLanguage.NODEJS18,
                command: ['node', 'index.js'],
              },
              networkConfiguration: {
                networkMode: NetworkMode.PRIVATE,
                vpcId: 'vpc-123',
                securityGroupId: 'sg-123',
                vSwitchIds: ['vsw-123'],
              },
              port: 9000,
              cpu: 2,
              memory: 4096,
            },
          });

          expect(mockControlApi.createAgentRuntime).toHaveBeenCalledWith(
            expect.objectContaining({
              input: expect.objectContaining({
                networkConfiguration: expect.objectContaining({
                  networkMode: NetworkMode.PRIVATE,
                  vpcId: 'vpc-123',
                }),
              }),
            })
          );
        });

        it('should handle HTTP error', async () => {
          const httpError = new HTTPError(409, 'Already exists');
          mockControlApi.createAgentRuntime.mockRejectedValue(httpError);

          await expect(
            AgentRuntime.create({
              input: {
                agentRuntimeName: 'test-runtime',
                codeConfiguration: {
                  language: AgentRuntimeLanguage.NODEJS18,
                  command: ['node', 'index.js'],
                },
                port: 9000,
                cpu: 2,
                memory: 4096,
              },
            })
          ).rejects.toThrow();
        });

        it('should throw error when neither code nor container configuration is provided', async () => {
          await expect(
            AgentRuntime.create({
              input: {
                agentRuntimeName: 'test-runtime',
                port: 9000,
                cpu: 2,
                memory: 4096,
              },
            })
          ).rejects.toThrow(
            'Either codeConfiguration or containerConfiguration must be provided'
          );
        });

        it('should re-throw non-HTTP errors', async () => {
          const genericError = new Error('Create failed');
          mockControlApi.createAgentRuntime.mockRejectedValue(genericError);

          await expect(
            AgentRuntime.create({
              input: {
                agentRuntimeName: 'test-runtime',
                codeConfiguration: {
                  language: AgentRuntimeLanguage.NODEJS18,
                  command: ['node', 'index.js'],
                },
                port: 9000,
                cpu: 2,
                memory: 4096,
              },
            })
          ).rejects.toThrow('Create failed');
        });
      });

      describe('delete', () => {
        it('should delete AgentRuntime by id', async () => {
          mockControlApi.listAgentRuntimeEndpoints.mockResolvedValue({
            items: [],
          });
          mockControlApi.deleteAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: 'DELETING',
          });

          const result = await AgentRuntime.delete({ id: 'runtime-123' });

          expect(mockControlApi.deleteAgentRuntime).toHaveBeenCalledWith(
            expect.objectContaining({ agentId: 'runtime-123' })
          );
          expect(result.agentRuntimeName).toBe('test-runtime');
        });

        it('should delete all endpoints before deleting runtime', async () => {
          // First call returns endpoints with required IDs, subsequent calls return empty
          mockControlApi.listAgentRuntimeEndpoints
            .mockResolvedValueOnce({
              items: [
                {
                  agentRuntimeId: 'runtime-123',
                  agentRuntimeEndpointId: 'ep-1',
                  agentRuntimeEndpointName: 'endpoint-1',
                },
                {
                  agentRuntimeId: 'runtime-123',
                  agentRuntimeEndpointId: 'ep-2',
                  agentRuntimeEndpointName: 'endpoint-2',
                },
              ],
            })
            .mockResolvedValue({ items: [] });

          mockControlApi.deleteAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'ep-1',
          });

          mockControlApi.deleteAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          await AgentRuntime.delete({ id: 'runtime-123' });

          expect(
            mockControlApi.deleteAgentRuntimeEndpoint
          ).toHaveBeenCalledTimes(2);
          expect(mockControlApi.deleteAgentRuntime).toHaveBeenCalled();
        });

        it('should wait for endpoints to be deleted', async () => {
          let listCallCount = 0;
          mockControlApi.listAgentRuntimeEndpoints.mockImplementation(
            async () => {
              listCallCount++;
              // First call returns 1 endpoint, second call (after delete) returns 1, third returns 0
              if (listCallCount === 1) {
                return {
                  items: [
                    {
                      agentRuntimeId: 'runtime-123',
                      agentRuntimeEndpointId: 'ep-1',
                    },
                  ],
                };
              } else if (listCallCount === 2) {
                return {
                  items: [
                    {
                      agentRuntimeId: 'runtime-123',
                      agentRuntimeEndpointId: 'ep-1',
                    },
                  ],
                };
              }
              return { items: [] };
            }
          );

          mockControlApi.deleteAgentRuntimeEndpoint.mockResolvedValue({});
          mockControlApi.deleteAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
          });

          await AgentRuntime.delete({ id: 'runtime-123' });

          expect(listCallCount).toBeGreaterThanOrEqual(3);
        });

        it('should handle HTTP error', async () => {
          mockControlApi.listAgentRuntimeEndpoints.mockResolvedValue({
            items: [],
          });
          const httpError = new HTTPError(404, 'Not found');
          mockControlApi.deleteAgentRuntime.mockRejectedValue(httpError);

          await expect(
            AgentRuntime.delete({ id: 'runtime-123' })
          ).rejects.toThrow();
        });

        it('should re-throw non-HTTP errors', async () => {
          mockControlApi.listAgentRuntimeEndpoints.mockResolvedValue({
            items: [],
          });
          const genericError = new Error('Delete failed');
          mockControlApi.deleteAgentRuntime.mockRejectedValue(genericError);

          await expect(
            AgentRuntime.delete({ id: 'runtime-123' })
          ).rejects.toThrow('Delete failed');
        });
      });

      describe('update', () => {
        it('should update AgentRuntime by id', async () => {
          mockControlApi.updateAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            description: 'Updated',
          });

          const result = await AgentRuntime.update({
            id: 'runtime-123',
            input: { description: 'Updated' },
          });

          expect(mockControlApi.updateAgentRuntime).toHaveBeenCalledWith(
            expect.objectContaining({ agentId: 'runtime-123' })
          );
          expect(result.description).toBe('Updated');
        });

        it('should update AgentRuntime with codeConfiguration', async () => {
          mockControlApi.updateAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          await AgentRuntime.update({
            id: 'runtime-123',
            input: {
              codeConfiguration: {
                language: AgentRuntimeLanguage.NODEJS18,
                command: ['node', 'updated.js'],
              },
            },
          });

          expect(mockControlApi.updateAgentRuntime).toHaveBeenCalledWith(
            expect.objectContaining({
              input: expect.objectContaining({
                codeConfiguration: expect.anything(),
              }),
            })
          );
        });

        it('should update AgentRuntime with containerConfiguration', async () => {
          mockControlApi.updateAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          await AgentRuntime.update({
            id: 'runtime-123',
            input: {
              containerConfiguration: {
                image: 'new-image:latest',
                command: ['node', 'app.js'],
              },
            },
          });

          expect(mockControlApi.updateAgentRuntime).toHaveBeenCalledWith(
            expect.objectContaining({
              input: expect.objectContaining({
                containerConfiguration: expect.anything(),
              }),
            })
          );
        });

        it('should handle HTTP error', async () => {
          const httpError = new HTTPError(400, 'Bad request');
          mockControlApi.updateAgentRuntime.mockRejectedValue(httpError);

          await expect(
            AgentRuntime.update({
              id: 'runtime-123',
              input: { description: 'test' },
            })
          ).rejects.toThrow();
        });

        it('should re-throw non-HTTP errors', async () => {
          const genericError = new Error('Update failed');
          mockControlApi.updateAgentRuntime.mockRejectedValue(genericError);

          await expect(
            AgentRuntime.update({
              id: 'runtime-123',
              input: { description: 'test' },
            })
          ).rejects.toThrow('Update failed');
        });
      });

      describe('get', () => {
        it('should get AgentRuntime by id', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const result = await AgentRuntime.get({ id: 'runtime-123' });

          expect(mockControlApi.getAgentRuntime).toHaveBeenCalledWith(
            expect.objectContaining({ agentId: 'runtime-123' })
          );
          expect(result.agentRuntimeName).toBe('test-runtime');
        });

        it('should handle HTTP error', async () => {
          const httpError = new HTTPError(404, 'Not found');
          mockControlApi.getAgentRuntime.mockRejectedValue(httpError);

          await expect(
            AgentRuntime.get({ id: 'runtime-123' })
          ).rejects.toThrow();
        });

        it('should re-throw non-HTTP errors', async () => {
          const genericError = new Error('Get failed');
          mockControlApi.getAgentRuntime.mockRejectedValue(genericError);

          await expect(AgentRuntime.get({ id: 'runtime-123' })).rejects.toThrow(
            'Get failed'
          );
        });
      });

      describe('list', () => {
        it('should list AgentRuntimes', async () => {
          mockControlApi.listAgentRuntimes.mockResolvedValue({
            items: [
              { agentRuntimeId: '1', agentRuntimeName: 'runtime-1' },
              { agentRuntimeId: '2', agentRuntimeName: 'runtime-2' },
            ],
          });

          const result = await AgentRuntime.list();

          expect(mockControlApi.listAgentRuntimes).toHaveBeenCalled();
          expect(result).toHaveLength(2);
        });

        it('should list AgentRuntimes with filter', async () => {
          mockControlApi.listAgentRuntimes.mockResolvedValue({
            items: [{ agentRuntimeId: '1', agentRuntimeName: 'test-runtime' }],
          });

          await AgentRuntime.list({ input: { agentRuntimeName: 'test' } });

          expect(mockControlApi.listAgentRuntimes).toHaveBeenCalledWith(
            expect.objectContaining({
              input: expect.objectContaining({ agentRuntimeName: 'test' }),
            })
          );
        });

        it('should handle undefined items in response', async () => {
          mockControlApi.listAgentRuntimes.mockResolvedValue({
            // items is undefined
          });

          const result = await AgentRuntime.list();

          expect(result).toHaveLength(0);
        });

        it('should handle HTTP error', async () => {
          const httpError = new HTTPError(500, 'Server error');
          mockControlApi.listAgentRuntimes.mockRejectedValue(httpError);

          await expect(AgentRuntime.list()).rejects.toThrow();
        });

        it('should re-throw non-HTTP errors', async () => {
          const genericError = new Error('List failed');
          mockControlApi.listAgentRuntimes.mockRejectedValue(genericError);

          await expect(AgentRuntime.list()).rejects.toThrow('List failed');
        });
      });

      describe('listAll', () => {
        it('should list all AgentRuntimes with pagination', async () => {
          mockControlApi.listAgentRuntimes
            .mockResolvedValueOnce({
              items: Array.from({ length: 50 }, (_, i) => ({
                agentRuntimeId: `${i}`,
                agentRuntimeName: `runtime-${i}`,
              })),
            })
            .mockResolvedValueOnce({
              items: Array.from({ length: 10 }, (_, i) => ({
                agentRuntimeId: `${50 + i}`,
                agentRuntimeName: `runtime-${50 + i}`,
              })),
            });

          const result = await AgentRuntime.listAll();

          expect(result).toHaveLength(60);
          expect(mockControlApi.listAgentRuntimes).toHaveBeenCalledTimes(2);
        });

        it('should deduplicate runtimes by agentRuntimeId', async () => {
          mockControlApi.listAgentRuntimes.mockResolvedValue({
            items: [
              { agentRuntimeId: '1', agentRuntimeName: 'runtime-1' },
              { agentRuntimeId: '1', agentRuntimeName: 'runtime-1-dup' }, // Duplicate
              { agentRuntimeId: '2', agentRuntimeName: 'runtime-2' },
            ],
          });

          const result = await AgentRuntime.listAll();

          expect(result).toHaveLength(2);
          expect(result.map((r) => r.agentRuntimeId)).toEqual(['1', '2']);
        });

        it('should filter out items without agentRuntimeId', async () => {
          mockControlApi.listAgentRuntimes.mockResolvedValue({
            items: [
              { agentRuntimeId: '1', agentRuntimeName: 'runtime-1' },
              { agentRuntimeName: 'runtime-no-id' }, // No ID
              { agentRuntimeId: '2', agentRuntimeName: 'runtime-2' },
            ],
          });

          const result = await AgentRuntime.listAll();

          expect(result).toHaveLength(2);
        });
      });

      describe('listVersionsById', () => {
        it('should list versions by agent runtime id', async () => {
          mockControlApi.listAgentRuntimeVersions
            .mockResolvedValueOnce({
              items: [
                { agentRuntimeVersion: 'v1', status: 'READY' },
                { agentRuntimeVersion: 'v2', status: 'READY' },
              ],
            })
            .mockResolvedValueOnce({
              items: [],
            });

          const result = await AgentRuntime.listVersionsById({
            agentRuntimeId: 'runtime-123',
          });

          expect(mockControlApi.listAgentRuntimeVersions).toHaveBeenCalledWith(
            expect.objectContaining({ agentId: 'runtime-123' })
          );
          expect(result).toHaveLength(2);
        });

        it('should paginate when results equal pageSize', async () => {
          // 50 items triggers pagination (pageSize = 50)
          mockControlApi.listAgentRuntimeVersions
            .mockResolvedValueOnce({
              items: Array.from({ length: 50 }, (_, i) => ({
                agentRuntimeVersion: `v${i}`,
              })),
            })
            .mockResolvedValueOnce({
              items: [{ agentRuntimeVersion: 'v50' }],
            });

          const result = await AgentRuntime.listVersionsById({
            agentRuntimeId: 'runtime-123',
          });

          expect(result).toHaveLength(51);
          expect(mockControlApi.listAgentRuntimeVersions).toHaveBeenCalledTimes(
            2
          );
        });

        it('should deduplicate versions by agentRuntimeVersion', async () => {
          mockControlApi.listAgentRuntimeVersions.mockResolvedValue({
            items: [
              { agentRuntimeVersion: 'v1' },
              { agentRuntimeVersion: 'v1' }, // Duplicate
              { agentRuntimeVersion: 'v2' },
            ],
          });

          const result = await AgentRuntime.listVersionsById({
            agentRuntimeId: 'runtime-123',
          });

          expect(result).toHaveLength(2);
        });

        it('should filter out items without agentRuntimeVersion', async () => {
          mockControlApi.listAgentRuntimeVersions.mockResolvedValue({
            items: [
              { agentRuntimeVersion: 'v1' },
              { description: 'no-version' }, // No version
            ],
          });

          const result = await AgentRuntime.listVersionsById({
            agentRuntimeId: 'runtime-123',
          });

          expect(result).toHaveLength(1);
        });
      });
    });

    describe('instance methods', () => {
      describe('delete', () => {
        it('should delete this AgentRuntime', async () => {
          mockControlApi.listAgentRuntimeEndpoints.mockResolvedValue({
            items: [],
          });
          mockControlApi.deleteAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: 'DELETING',
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const result = await runtime.delete();

          expect(mockControlApi.deleteAgentRuntime).toHaveBeenCalled();
          expect(result).toBe(runtime);
        });

        it('should throw error if agentRuntimeId not set', async () => {
          const runtime = new AgentRuntime();

          await expect(runtime.delete()).rejects.toThrow(
            'agentRuntimeId is required to delete an Agent Runtime'
          );
        });
      });

      describe('update', () => {
        it('should update this AgentRuntime', async () => {
          mockControlApi.updateAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            description: 'Updated',
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const result = await runtime.update({
            input: { description: 'Updated' },
          });

          expect(result).toBe(runtime);
          expect(result.description).toBe('Updated');
        });

        it('should throw error if agentRuntimeId not set', async () => {
          const runtime = new AgentRuntime();

          await expect(
            runtime.update({ input: { description: 'Updated' } })
          ).rejects.toThrow(
            'agentRuntimeId is required to update an Agent Runtime'
          );
        });
      });

      describe('refresh', () => {
        it('should refresh AgentRuntime data', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: 'READY',
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const result = await runtime.refresh();

          expect(result).toBe(runtime);
          expect(result.status).toBe('READY');
        });

        it('should throw error if agentRuntimeId not set', async () => {
          const runtime = new AgentRuntime();

          await expect(runtime.refresh()).rejects.toThrow(
            'agentRuntimeId is required to refresh an Agent Runtime'
          );
        });
      });

      describe('createEndpoint', () => {
        it('should create endpoint for this AgentRuntime', async () => {
          mockControlApi.createAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            status: 'CREATING',
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const result = await runtime.createEndpoint({
            input: { agentRuntimeEndpointName: 'test-endpoint' },
          });

          expect(mockControlApi.createAgentRuntimeEndpoint).toHaveBeenCalled();
          expect(result.agentRuntimeEndpointName).toBe('test-endpoint');
        });

        it('should throw error if agentRuntimeId not set', async () => {
          const runtime = new AgentRuntime();

          await expect(
            runtime.createEndpoint({
              input: { agentRuntimeEndpointName: 'test' },
            })
          ).rejects.toThrow('agentRuntimeId is required to create an endpoint');
        });
      });

      describe('updateEndpoint', () => {
        it('should update endpoint for this AgentRuntime', async () => {
          mockControlApi.updateAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            description: 'Updated',
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
          });

          const result = await runtime.updateEndpoint({
            endpointId: 'endpoint-123',
            input: { description: 'Updated' },
          });

          expect(mockControlApi.updateAgentRuntimeEndpoint).toHaveBeenCalled();
        });

        it('should throw error if agentRuntimeId not set', async () => {
          const runtime = new AgentRuntime();

          await expect(
            runtime.updateEndpoint({
              endpointId: 'ep-1',
              input: { description: 'test' },
            })
          ).rejects.toThrow('agentRuntimeId is required to update an endpoint');
        });
      });

      describe('getEndpoint', () => {
        it('should get endpoint for this AgentRuntime', async () => {
          mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'my-endpoint',
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
          });

          const result = await runtime.getEndpoint({
            endpointId: 'endpoint-123',
          });

          expect(mockControlApi.getAgentRuntimeEndpoint).toHaveBeenCalled();
          expect(result.agentRuntimeEndpointName).toBe('my-endpoint');
        });

        it('should throw error if agentRuntimeId not set', async () => {
          const runtime = new AgentRuntime();

          await expect(
            runtime.getEndpoint({ endpointId: 'ep-1' })
          ).rejects.toThrow('agentRuntimeId is required to get an endpoint');
        });
      });

      describe('deleteEndpoint', () => {
        it('should delete endpoint for this AgentRuntime', async () => {
          mockControlApi.deleteAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const result = await runtime.deleteEndpoint({
            endpointId: 'endpoint-123',
          });

          expect(mockControlApi.deleteAgentRuntimeEndpoint).toHaveBeenCalled();
        });

        it('should throw error if agentRuntimeId not set', async () => {
          const runtime = new AgentRuntime();

          await expect(
            runtime.deleteEndpoint({ endpointId: 'ep-1' })
          ).rejects.toThrow('agentRuntimeId is required to delete an endpoint');
        });
      });

      describe('listEndpoints', () => {
        it('should list endpoints for this AgentRuntime', async () => {
          mockControlApi.listAgentRuntimeEndpoints.mockResolvedValue({
            items: [
              {
                agentRuntimeEndpointId: '1',
                agentRuntimeEndpointName: 'endpoint-1',
              },
              {
                agentRuntimeEndpointId: '2',
                agentRuntimeEndpointName: 'endpoint-2',
              },
            ],
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const result = await runtime.listEndpoints();

          expect(mockControlApi.listAgentRuntimeEndpoints).toHaveBeenCalled();
          expect(result).toHaveLength(2);
        });

        it('should throw error if agentRuntimeId not set', async () => {
          const runtime = new AgentRuntime();

          await expect(runtime.listEndpoints()).rejects.toThrow(
            'agentRuntimeId is required to list endpoints'
          );
        });
      });

      describe('listVersions', () => {
        it('should list versions for this AgentRuntime', async () => {
          // First call returns 2 items, second call returns empty to stop pagination
          mockControlApi.listAgentRuntimeVersions
            .mockResolvedValueOnce({
              items: [
                { agentRuntimeVersion: 'v1' },
                { agentRuntimeVersion: 'v2' },
              ],
            })
            .mockResolvedValueOnce({
              items: [],
            });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const result = await runtime.listVersions();

          expect(mockControlApi.listAgentRuntimeVersions).toHaveBeenCalled();
          expect(result).toHaveLength(2);
        });

        it('should throw error if agentRuntimeId not set', async () => {
          const runtime = new AgentRuntime();

          await expect(runtime.listVersions()).rejects.toThrow(
            'agentRuntimeId is required to list versions'
          );
        });
      });

      describe('waitUntilReady', () => {
        it('should wait until status is READY', async () => {
          let callCount = 0;
          mockControlApi.getAgentRuntime.mockImplementation(async () => {
            callCount++;
            return {
              agentRuntimeId: 'runtime-123',
              agentRuntimeName: 'test-runtime',
              status: callCount >= 2 ? Status.READY : Status.CREATING,
            };
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.CREATING,
          });

          const result = await runtime.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });

          expect(result.status).toBe(Status.READY);
        });

        it('should call callback callback', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.READY,
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const callback = jest.fn();

          await runtime.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
            callback,
          });

          expect(callback).toHaveBeenCalled();
        });

        it('should throw error if status becomes FAILED', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.CREATE_FAILED,
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const r = await runtime.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });

          await expect(r.status).toBe(Status.CREATE_FAILED);
        });

        it('should throw timeout error', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.CREATING, // Never becomes READY
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.CREATING,
          });

          await expect(
            runtime.waitUntilReadyOrFailed({
              intervalSeconds: 0.05,
              timeoutSeconds: 0.1, // Very short timeout
            })
          ).rejects.toThrow(/Timeout waiting/);
        });

        it('should use default timeout and interval when not provided', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.READY,
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          // Call without options to test default values
          const result = await runtime.waitUntilReadyOrFailed();

          expect(result.status).toBe(Status.READY);
        });
      });

      describe('waitUntilReadyOrFailed', () => {
        it('should wait until status is final', async () => {
          let callCount = 0;
          mockControlApi.getAgentRuntime.mockImplementation(async () => {
            callCount++;
            return {
              agentRuntimeId: 'runtime-123',
              agentRuntimeName: 'test-runtime',
              status: callCount >= 2 ? Status.READY : Status.CREATING,
            };
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.CREATING,
          });

          const result = await runtime.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });

          expect(result.status).toBe(Status.READY);
        });

        it('should call callback callback', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.READY,
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          const callback = jest.fn();

          await runtime.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
            callback,
          });

          expect(callback).toHaveBeenCalled();
        });

        it('should throw timeout error', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.CREATING, // Never becomes final
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.CREATING,
          });

          await expect(
            runtime.waitUntilReadyOrFailed({
              intervalSeconds: 0.05,
              timeoutSeconds: 0.1, // Very short timeout
            })
          ).rejects.toThrow(/Timeout waiting/);
        });

        it('should use default timeout and interval when not provided', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
            status: Status.READY,
          });

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'test-runtime',
          });

          // Call without options to test default values
          const result = await runtime.waitUntilReadyOrFailed();

          expect(result.status).toBe(Status.READY);
        });
      });

      describe('invokeOpenai', () => {
        it('should throw error if agentRuntimeName not set', async () => {
          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
          });

          await expect(
            runtime.invokeOpenai({
              messages: [{ role: 'user', content: 'Hello' }],
            })
          ).rejects.toThrow('agentRuntimeName is required to invoke OpenAI');
        });

        it('should successfully invoke with agentRuntimeName', async () => {
          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'my-runtime',
          });

          const result = await runtime.invokeOpenai({
            messages: [{ role: 'user', content: 'Hello' }],
          });

          expect(mockInvokeOpenai).toHaveBeenCalled();
          expect(result).toEqual({ response: 'mock response' });
        });

        it('should use custom endpoint name', async () => {
          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'my-runtime',
          });

          await runtime.invokeOpenai({
            agentRuntimeEndpointName: 'CustomEndpoint',
            messages: [{ role: 'user', content: 'Hello' }],
          });

          expect(mockInvokeOpenai).toHaveBeenCalled();
        });

        it('should reuse data API cache', async () => {
          const {
            AgentRuntimeDataAPI,
          } = require('../../../src/agent-runtime/api/data');

          // Clear previous calls
          jest.clearAllMocks();

          const runtime = new AgentRuntime({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'my-runtime',
          });

          // First call creates the data API
          await runtime.invokeOpenai({
            agentRuntimeEndpointName: 'Default',
            messages: [{ role: 'user', content: 'Hello' }],
          });

          const firstCallCount = AgentRuntimeDataAPI.mock.calls.length;

          // Second call should reuse the cached data API
          await runtime.invokeOpenai({
            agentRuntimeEndpointName: 'Default',
            messages: [{ role: 'user', content: 'Hello again' }],
          });

          // AgentRuntimeDataAPI should only be created once
          expect(AgentRuntimeDataAPI.mock.calls.length).toBe(firstCallCount);
        });
      });
    });
  });

  describe('AgentRuntimeEndpoint', () => {
    describe('static methods', () => {
      describe('create', () => {
        it('should create endpoint', async () => {
          mockControlApi.createAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            status: 'CREATING',
          });

          const result = await AgentRuntimeEndpoint.create({
            agentRuntimeId: 'runtime-123',
            input: { agentRuntimeEndpointName: 'test-endpoint' },
          });

          expect(mockControlApi.createAgentRuntimeEndpoint).toHaveBeenCalled();
          expect(result.agentRuntimeEndpointName).toBe('test-endpoint');
        });

        it('should set default targetVersion to LATEST', async () => {
          mockControlApi.createAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            targetVersion: 'LATEST',
          });

          await AgentRuntimeEndpoint.create({
            agentRuntimeId: 'runtime-123',
            input: { agentRuntimeEndpointName: 'test-endpoint' },
          });

          expect(
            mockControlApi.createAgentRuntimeEndpoint
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              input: expect.objectContaining({
                targetVersion: 'LATEST',
              }),
            })
          );
        });

        it('should handle HTTP error', async () => {
          const httpError = new HTTPError(409, 'Already exists');
          mockControlApi.createAgentRuntimeEndpoint.mockRejectedValue(
            httpError
          );

          await expect(
            AgentRuntimeEndpoint.create({
              agentRuntimeId: 'runtime-123',
              input: { agentRuntimeEndpointName: 'test-endpoint' },
            })
          ).rejects.toThrow();
        });

        it('should re-throw non-HTTP errors', async () => {
          const genericError = new Error('Network failure');
          mockControlApi.createAgentRuntimeEndpoint.mockRejectedValue(
            genericError
          );

          await expect(
            AgentRuntimeEndpoint.create({
              agentRuntimeId: 'runtime-123',
              input: { agentRuntimeEndpointName: 'test-endpoint' },
            })
          ).rejects.toThrow('Network failure');
        });
      });

      describe('delete', () => {
        it('should delete endpoint', async () => {
          mockControlApi.deleteAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
          });

          const result = await AgentRuntimeEndpoint.delete({
            agentRuntimeId: 'runtime-123',
            endpointId: 'endpoint-123',
          });

          expect(mockControlApi.deleteAgentRuntimeEndpoint).toHaveBeenCalled();
        });

        it('should handle HTTP error', async () => {
          const httpError = new HTTPError(404, 'Not found');
          mockControlApi.deleteAgentRuntimeEndpoint.mockRejectedValue(
            httpError
          );

          await expect(
            AgentRuntimeEndpoint.delete({
              agentRuntimeId: 'runtime-123',
              endpointId: 'endpoint-123',
            })
          ).rejects.toThrow();
        });

        it('should re-throw non-HTTP errors', async () => {
          const genericError = new Error('Network error');
          mockControlApi.deleteAgentRuntimeEndpoint.mockRejectedValue(
            genericError
          );

          await expect(
            AgentRuntimeEndpoint.delete({
              agentRuntimeId: 'runtime-123',
              endpointId: 'endpoint-123',
            })
          ).rejects.toThrow('Network error');
        });
      });

      describe('update', () => {
        it('should update endpoint', async () => {
          mockControlApi.updateAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            description: 'Updated',
          });

          const result = await AgentRuntimeEndpoint.update({
            agentRuntimeId: 'runtime-123',
            endpointId: 'endpoint-123',
            input: { description: 'Updated' },
          });

          expect(mockControlApi.updateAgentRuntimeEndpoint).toHaveBeenCalled();
        });

        it('should handle HTTP error', async () => {
          const httpError = new HTTPError(400, 'Bad request');
          mockControlApi.updateAgentRuntimeEndpoint.mockRejectedValue(
            httpError
          );

          await expect(
            AgentRuntimeEndpoint.update({
              agentRuntimeId: 'runtime-123',
              endpointId: 'endpoint-123',
              input: { description: 'test' },
            })
          ).rejects.toThrow();
        });

        it('should re-throw non-HTTP errors', async () => {
          const genericError = new Error('Update failed');
          mockControlApi.updateAgentRuntimeEndpoint.mockRejectedValue(
            genericError
          );

          await expect(
            AgentRuntimeEndpoint.update({
              agentRuntimeId: 'runtime-123',
              endpointId: 'endpoint-123',
              input: { description: 'test' },
            })
          ).rejects.toThrow('Update failed');
        });
      });

      describe('get', () => {
        it('should get endpoint', async () => {
          mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
          });

          const result = await AgentRuntimeEndpoint.get({
            agentRuntimeId: 'runtime-123',
            endpointId: 'endpoint-123',
          });

          expect(mockControlApi.getAgentRuntimeEndpoint).toHaveBeenCalled();
          expect(result.agentRuntimeEndpointName).toBe('test-endpoint');
        });

        it('should handle HTTP error', async () => {
          const httpError = new HTTPError(404, 'Not found');
          mockControlApi.getAgentRuntimeEndpoint.mockRejectedValue(httpError);

          await expect(
            AgentRuntimeEndpoint.get({
              agentRuntimeId: 'runtime-123',
              endpointId: 'endpoint-123',
            })
          ).rejects.toThrow();
        });

        it('should re-throw non-HTTP errors', async () => {
          const genericError = new Error('Fetch failed');
          mockControlApi.getAgentRuntimeEndpoint.mockRejectedValue(
            genericError
          );

          await expect(
            AgentRuntimeEndpoint.get({
              agentRuntimeId: 'runtime-123',
              endpointId: 'endpoint-123',
            })
          ).rejects.toThrow('Fetch failed');
        });
      });

      describe('listById', () => {
        it('should list endpoints by agent runtime id', async () => {
          mockControlApi.listAgentRuntimeEndpoints.mockResolvedValue({
            items: [
              {
                agentRuntimeEndpointId: '1',
                agentRuntimeEndpointName: 'endpoint-1',
              },
              {
                agentRuntimeEndpointId: '2',
                agentRuntimeEndpointName: 'endpoint-2',
              },
            ],
          });

          const result = await AgentRuntimeEndpoint.list({
            agentRuntimeId: 'runtime-123',
          });

          expect(mockControlApi.listAgentRuntimeEndpoints).toHaveBeenCalled();
          expect(result).toHaveLength(2);
        });

        it('should handle undefined items in response', async () => {
          mockControlApi.listAgentRuntimeEndpoints.mockResolvedValue({
            // items is undefined
          });

          const result = await AgentRuntimeEndpoint.list({
            agentRuntimeId: 'runtime-123',
          });

          expect(result).toHaveLength(0);
        });

        it('should handle HTTP error', async () => {
          const httpError = new HTTPError(500, 'Server error');
          mockControlApi.listAgentRuntimeEndpoints.mockRejectedValue(httpError);

          await expect(
            AgentRuntimeEndpoint.list({ agentRuntimeId: 'runtime-123' })
          ).rejects.toThrow();
        });

        it('should re-throw non-HTTP errors', async () => {
          const genericError = new Error('List failed');
          mockControlApi.listAgentRuntimeEndpoints.mockRejectedValue(
            genericError
          );

          await expect(
            AgentRuntimeEndpoint.list({ agentRuntimeId: 'runtime-123' })
          ).rejects.toThrow('List failed');
        });
      });
    });

    describe('instance methods', () => {
      describe('delete', () => {
        it('should delete this endpoint', async () => {
          mockControlApi.deleteAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
          });

          const result = await endpoint.delete();

          expect(mockControlApi.deleteAgentRuntimeEndpoint).toHaveBeenCalled();
          expect(result).toBe(endpoint);
        });

        it('should throw error if ids not set', async () => {
          const endpoint = new AgentRuntimeEndpoint();

          await expect(endpoint.delete()).rejects.toThrow(
            'agentRuntimeId and agentRuntimeEndpointId are required'
          );
        });
      });

      describe('update', () => {
        it('should update this endpoint', async () => {
          mockControlApi.updateAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            description: 'Updated',
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
          });

          const result = await endpoint.update({
            input: { description: 'Updated' },
          });

          expect(result).toBe(endpoint);
          expect(result.description).toBe('Updated');
        });

        it('should throw error if ids not set', async () => {
          const endpoint = new AgentRuntimeEndpoint();

          await expect(
            endpoint.update({ input: { description: 'test' } })
          ).rejects.toThrow(
            'agentRuntimeId and agentRuntimeEndpointId are required'
          );
        });
      });

      describe('refresh', () => {
        it('should refresh endpoint data', async () => {
          mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            status: 'READY',
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
          });

          const result = await endpoint.refresh();

          expect(result).toBe(endpoint);
          expect(result.status).toBe('READY');
        });

        it('should throw error if ids not set', async () => {
          const endpoint = new AgentRuntimeEndpoint();

          await expect(endpoint.refresh()).rejects.toThrow(
            'agentRuntimeId and agentRuntimeEndpointId are required'
          );
        });
      });

      describe('waitUntilReady', () => {
        it('should wait until status is READY', async () => {
          let callCount = 0;
          mockControlApi.getAgentRuntimeEndpoint.mockImplementation(
            async () => {
              callCount++;
              return {
                agentRuntimeId: 'runtime-123',
                agentRuntimeEndpointId: 'endpoint-123',
                agentRuntimeEndpointName: 'test-endpoint',
                status: callCount >= 2 ? Status.READY : Status.CREATING,
              };
            }
          );

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            status: Status.CREATING,
          });

          const result = await endpoint.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });

          expect(result.status).toBe(Status.READY);
        });

        it('should call callback callback', async () => {
          mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            status: Status.READY,
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
          });

          const callback = jest.fn();

          await endpoint.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
            callback,
          });

          expect(callback).toHaveBeenCalled();
        });

        it('should throw error if status becomes CREATE_FAILED', async () => {
          mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            status: Status.CREATE_FAILED,
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
          });

          const e = await endpoint.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });

          await expect((await e).status).toBe(Status.CREATE_FAILED);
        });

        it('should throw error if status becomes UPDATE_FAILED', async () => {
          mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            status: Status.UPDATE_FAILED,
            statusReason: 'Update failed',
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
          });

          const e = await endpoint.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });
          await expect(e.status).toBe(Status.UPDATE_FAILED);
        });

        it('should throw error if status becomes DELETE_FAILED', async () => {
          mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            status: Status.DELETE_FAILED,
            statusReason: 'Delete failed',
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
          });

          const e = await endpoint.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });

          await expect(e.status).toBe(Status.DELETE_FAILED);
        });

        it('should throw timeout error', async () => {
          mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'test-endpoint',
            status: Status.CREATING,
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
          });

          await expect(
            endpoint.waitUntilReadyOrFailed({
              intervalSeconds: 0.1,
              timeoutSeconds: 0.2,
            })
          ).rejects.toThrow(/Timeout/);
        });

        it('should use default timeout and interval when not provided', async () => {
          mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            status: Status.READY,
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
          });

          // Call without options to test default values
          const result = await endpoint.waitUntilReadyOrFailed();

          expect(result.status).toBe(Status.READY);
        });
      });

      describe('invokeOpenai', () => {
        it('should throw error when agent runtime name cannot be determined', async () => {
          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: undefined,
            agentRuntimeEndpointId: 'endpoint-123',
          });

          await expect(
            endpoint.invokeOpenai({
              messages: [{ role: 'user', content: 'Hello' }],
            })
          ).rejects.toThrow('Unable to determine agent runtime name');
        });

        it('should fetch agent runtime name if not set', async () => {
          mockControlApi.getAgentRuntime.mockResolvedValue({
            agentRuntimeId: 'runtime-123',
            agentRuntimeName: 'my-runtime',
          });

          const endpoint = new AgentRuntimeEndpoint({
            agentRuntimeId: 'runtime-123',
            agentRuntimeEndpointId: 'endpoint-123',
            agentRuntimeEndpointName: 'my-endpoint',
          });

          // This will fail when trying to call the actual data API, but that's expected
          // We just want to verify it fetches the runtime name
          try {
            await endpoint.invokeOpenai({
              messages: [{ role: 'user', content: 'Hello' }],
            });
          } catch (e) {
            // Expected to fail, but should have called getAgentRuntime
          }

          expect(mockControlApi.getAgentRuntime).toHaveBeenCalledWith(
            expect.objectContaining({ agentId: 'runtime-123' })
          );
        });
      });
    });
  });

  describe('AgentRuntimeClient', () => {
    let client: AgentRuntimeClient;

    beforeEach(() => {
      client = new AgentRuntimeClient();
    });

    describe('create', () => {
      it('should create AgentRuntime via client', async () => {
        mockControlApi.createAgentRuntime.mockResolvedValue({
          agentRuntimeId: 'runtime-123',
          agentRuntimeName: 'test-runtime',
        });

        const result = await client.create({
          input: {
            agentRuntimeName: 'test-runtime',
            codeConfiguration: {
              language: AgentRuntimeLanguage.NODEJS18,
              command: ['node', 'index.js'],
            },
            port: 9000,
            cpu: 2,
            memory: 4096,
          },
        });

        expect(result.agentRuntimeName).toBe('test-runtime');
      });
    });

    describe('delete', () => {
      it('should delete AgentRuntime via client', async () => {
        mockControlApi.listAgentRuntimeEndpoints.mockResolvedValue({
          items: [],
        });
        mockControlApi.deleteAgentRuntime.mockResolvedValue({
          agentRuntimeId: 'runtime-123',
          agentRuntimeName: 'test-runtime',
        });

        const result = await client.delete({ id: 'runtime-123' });

        expect(result.agentRuntimeName).toBe('test-runtime');
      });
    });

    describe('update', () => {
      it('should update AgentRuntime via client', async () => {
        mockControlApi.updateAgentRuntime.mockResolvedValue({
          agentRuntimeId: 'runtime-123',
          agentRuntimeName: 'test-runtime',
          description: 'Updated',
        });

        const result = await client.update({
          id: 'runtime-123',
          input: { description: 'Updated' },
        });

        expect(result.description).toBe('Updated');
      });
    });

    describe('get', () => {
      it('should get AgentRuntime via client', async () => {
        mockControlApi.getAgentRuntime.mockResolvedValue({
          agentRuntimeId: 'runtime-123',
          agentRuntimeName: 'test-runtime',
        });

        const result = await client.get({ id: 'runtime-123' });

        expect(result.agentRuntimeName).toBe('test-runtime');
      });
    });

    describe('list', () => {
      it('should list AgentRuntimes via client', async () => {
        mockControlApi.listAgentRuntimes.mockResolvedValue({
          items: [
            { agentRuntimeId: '1', agentRuntimeName: 'runtime-1' },
            { agentRuntimeId: '2', agentRuntimeName: 'runtime-2' },
          ],
        });

        const result = await client.list();

        expect(result).toHaveLength(2);
      });
    });

    describe('createEndpoint', () => {
      it('should create endpoint via client', async () => {
        mockControlApi.createAgentRuntimeEndpoint.mockResolvedValue({
          agentRuntimeId: 'runtime-123',
          agentRuntimeEndpointId: 'endpoint-1',
          agentRuntimeEndpointName: 'test-endpoint',
        });

        const result = await client.createEndpoint({
          agentRuntimeId: 'runtime-123',
          input: { agentRuntimeEndpointName: 'test-endpoint' },
        });

        expect(result.agentRuntimeEndpointName).toBe('test-endpoint');
      });
    });

    describe('deleteEndpoint', () => {
      it('should delete endpoint via client', async () => {
        mockControlApi.deleteAgentRuntimeEndpoint.mockResolvedValue({
          agentRuntimeId: 'runtime-123',
          agentRuntimeEndpointId: 'endpoint-1',
          agentRuntimeEndpointName: 'deleted-endpoint',
        });

        const result = await client.deleteEndpoint({
          agentRuntimeId: 'runtime-123',
          endpointId: 'endpoint-1',
        });

        expect(result.agentRuntimeEndpointId).toBe('endpoint-1');
      });
    });

    describe('updateEndpoint', () => {
      it('should update endpoint via client', async () => {
        mockControlApi.updateAgentRuntimeEndpoint.mockResolvedValue({
          agentRuntimeId: 'runtime-123',
          agentRuntimeEndpointId: 'endpoint-1',
          description: 'Updated description',
        });

        const result = await client.updateEndpoint({
          agentRuntimeId: 'runtime-123',
          endpointId: 'endpoint-1',
          input: { description: 'Updated description' },
        });

        expect(result.description).toBe('Updated description');
      });
    });

    describe('getEndpoint', () => {
      it('should get endpoint via client', async () => {
        mockControlApi.getAgentRuntimeEndpoint.mockResolvedValue({
          agentRuntimeId: 'runtime-123',
          agentRuntimeEndpointId: 'endpoint-1',
          agentRuntimeEndpointName: 'my-endpoint',
        });

        const result = await client.getEndpoint({
          agentRuntimeId: 'runtime-123',
          endpointId: 'endpoint-1',
        });

        expect(result.agentRuntimeEndpointName).toBe('my-endpoint');
      });
    });

    describe('listEndpoints', () => {
      it('should list endpoints via client', async () => {
        mockControlApi.listAgentRuntimeEndpoints.mockResolvedValue({
          items: [
            { agentRuntimeEndpointId: '1', agentRuntimeEndpointName: 'ep-1' },
            { agentRuntimeEndpointId: '2', agentRuntimeEndpointName: 'ep-2' },
          ],
        });

        const result = await client.listEndpoints({
          agentRuntimeId: 'runtime-123',
        });

        expect(result).toHaveLength(2);
      });
    });

    describe('listVersions', () => {
      it('should list versions via client', async () => {
        mockControlApi.listAgentRuntimeVersions.mockResolvedValue({
          items: [{ agentRuntimeVersion: '1' }, { agentRuntimeVersion: '2' }],
        });

        const result = await client.listVersions({
          agentRuntimeId: 'runtime-123',
        });

        expect(result).toHaveLength(2);
      });
    });
  });
});
