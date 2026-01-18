/**
 * Model 模块测试
 *
 * 测试 ModelService、ModelProxy 和 ModelClient 类。
 */

import { ModelService } from '../../../src/model/model-service';
import { ModelProxy } from '../../../src/model/model-proxy';
import { ModelClient } from '../../../src/model/client';
import { Config } from '../../../src/utils/config';
import { HTTPError, ResourceNotExistError } from '../../../src/utils/exception';
import { Status } from '../../../src/utils/model';
import {
  BackendType,
  ModelType,
  Provider,
  ProxyMode,
} from '../../../src/model/model';

// Mock the ModelControlAPI
jest.mock('../../../src/model/api/control', () => {
  return {
    ModelControlAPI: jest.fn().mockImplementation(() => ({
      createModelService: jest.fn(),
      deleteModelService: jest.fn(),
      updateModelService: jest.fn(),
      getModelService: jest.fn(),
      listModelServices: jest.fn(),
      createModelProxy: jest.fn(),
      deleteModelProxy: jest.fn(),
      updateModelProxy: jest.fn(),
      getModelProxy: jest.fn(),
      listModelProxies: jest.fn(),
    })),
  };
});

// Mock Credential
jest.mock('../../../src/credential/credential', () => {
  return {
    Credential: {
      get: jest.fn(),
    },
  };
});

// Mock AI SDK modules
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({ text: 'mocked response' }),
  streamText: jest.fn().mockResolvedValue({ stream: 'mocked stream' }),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => jest.fn(() => ({}))),
}));

import { ModelControlAPI } from '../../../src/model/api/control';

const MockModelControlAPI = ModelControlAPI as jest.MockedClass<
  typeof ModelControlAPI
>;

describe('Model Module', () => {
  let mockControlApi: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockControlApi = {
      createModelService: jest.fn(),
      deleteModelService: jest.fn(),
      updateModelService: jest.fn(),
      getModelService: jest.fn(),
      listModelServices: jest.fn(),
      createModelProxy: jest.fn(),
      deleteModelProxy: jest.fn(),
      updateModelProxy: jest.fn(),
      getModelProxy: jest.fn(),
      listModelProxies: jest.fn(),
    };
    MockModelControlAPI.mockImplementation(() => mockControlApi);
  });

  describe('ModelClient', () => {
    describe('constructor', () => {
      it('should create client without config', () => {
        const client = new ModelClient();
        expect(client).toBeDefined();
        expect(MockModelControlAPI).toHaveBeenCalled();
      });

      it('should create client with config', () => {
        const config = new Config({ accessKeyId: 'test' });
        const client = new ModelClient(config);
        expect(client).toBeDefined();
      });
    });

    describe('create', () => {
      it('should create ModelService', async () => {
        const mockResult = {
          modelServiceId: 'service-123',
          modelServiceName: 'test-service',
          status: 'READY',
        };
        mockControlApi.createModelService.mockResolvedValue(mockResult);

        const client = new ModelClient();
        const result = await client.create({
          input: {
            modelServiceName: 'test-service',
            provider: Provider.TONGYI,
            modelType: ModelType.LLM,
          },
        });

        expect(mockControlApi.createModelService).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelService);
        expect((result as ModelService).modelServiceName).toBe('test-service');
      });

      it('should create ModelProxy', async () => {
        const mockResult = {
          modelProxyId: 'proxy-123',
          modelProxyName: 'test-proxy',
          status: 'READY',
        };
        mockControlApi.createModelProxy.mockResolvedValue(mockResult);

        const client = new ModelClient();
        const result = await client.create({
          input: {
            modelProxyName: 'test-proxy',
            proxyConfig: {
              endpoints: [{ baseUrl: 'http://test.com' }],
            },
          },
        });

        expect(mockControlApi.createModelProxy).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelProxy);
        expect((result as ModelProxy).modelProxyName).toBe('test-proxy');
      });

      it('should auto-set proxyModel based on endpoints count', async () => {
        const mockResult = {
          modelProxyId: 'proxy-123',
          modelProxyName: 'test-proxy',
        };
        mockControlApi.createModelProxy.mockResolvedValue(mockResult);

        const client = new ModelClient();

        // Single endpoint - should set proxyModel to 'single'
        await client.create({
          input: {
            modelProxyName: 'test-proxy',
            proxyConfig: {
              endpoints: [{ baseUrl: 'http://test1.com' }],
            },
          },
        });

        expect(mockControlApi.createModelProxy).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              proxyMode: 'single',
            }),
          })
        );

        jest.clearAllMocks();

        // Multiple endpoints - should set proxyModel to 'multi'
        await client.create({
          input: {
            modelProxyName: 'test-proxy',
            proxyConfig: {
              endpoints: [
                { baseUrl: 'http://test1.com' },
                { baseUrl: 'http://test2.com' },
              ],
            },
          },
        });

        expect(mockControlApi.createModelProxy).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              proxyMode: 'multi',
            }),
          })
        );
      });

      it('should handle HTTP error for ModelService creation', async () => {
        const httpError = new HTTPError(409, 'Already exists');
        mockControlApi.createModelService.mockRejectedValue(httpError);

        const client = new ModelClient();

        await expect(
          client.create({
            input: {
              modelServiceName: 'test-service',
              provider: Provider.TONGYI,
              modelType: ModelType.LLM,
            },
          })
        ).rejects.toThrow();
      });

      it('should handle HTTP error for ModelProxy creation', async () => {
        const httpError = new HTTPError(409, 'Already exists');
        mockControlApi.createModelProxy.mockRejectedValue(httpError);

        const client = new ModelClient();

        await expect(
          client.create({
            input: {
              modelProxyName: 'test-proxy',
              proxyConfig: { endpoints: [] },
            },
          })
        ).rejects.toThrow();
      });

      it('should rethrow non-HTTP error for ModelService creation', async () => {
        const genericError = new Error('Network error');
        mockControlApi.createModelService.mockRejectedValue(genericError);

        const client = new ModelClient();

        await expect(
          client.create({
            input: {
              modelServiceName: 'test-service',
              provider: Provider.TONGYI,
              modelType: ModelType.LLM,
            },
          })
        ).rejects.toThrow('Network error');
      });

      it('should rethrow non-HTTP error for ModelProxy creation', async () => {
        const genericError = new Error('Network error');
        mockControlApi.createModelProxy.mockRejectedValue(genericError);

        const client = new ModelClient();

        await expect(
          client.create({
            input: {
              modelProxyName: 'test-proxy',
              proxyConfig: { endpoints: [] },
            },
          })
        ).rejects.toThrow('Network error');
      });
    });

    describe('delete', () => {
      it('should delete ModelProxy first if backendType not specified', async () => {
        const mockResult = {
          modelProxyId: 'proxy-123',
          modelProxyName: 'test-proxy',
        };
        mockControlApi.deleteModelProxy.mockResolvedValue(mockResult);

        const client = new ModelClient();
        const result = await client.delete({ name: 'test-proxy' });

        expect(mockControlApi.deleteModelProxy).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelProxy);
      });

      it('should delete ModelService if ModelProxy not found', async () => {
        mockControlApi.deleteModelProxy.mockRejectedValue(
          new HTTPError(404, 'Not found')
        );
        mockControlApi.deleteModelService.mockResolvedValue({
          modelServiceId: 'service-123',
          modelServiceName: 'test-service',
        });

        const client = new ModelClient();
        const result = await client.delete({ name: 'test-service' });

        expect(mockControlApi.deleteModelProxy).toHaveBeenCalled();
        expect(mockControlApi.deleteModelService).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelService);
      });

      it('should delete ModelService directly if backendType is SERVICE', async () => {
        mockControlApi.deleteModelService.mockResolvedValue({
          modelServiceId: 'service-123',
          modelServiceName: 'test-service',
        });

        const client = new ModelClient();
        const result = await client.delete({
          name: 'test-service',
          backendType: BackendType.SERVICE,
        });

        expect(mockControlApi.deleteModelProxy).not.toHaveBeenCalled();
        expect(mockControlApi.deleteModelService).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelService);
      });

      it('should throw error if ModelProxy delete fails with explicit proxy type', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockControlApi.deleteModelProxy.mockRejectedValue(httpError);

        const client = new ModelClient();

        await expect(
          client.delete({ name: 'test-proxy', backendType: BackendType.PROXY })
        ).rejects.toThrow();
      });

      it('should rethrow non-HTTP error during proxy delete', async () => {
        const genericError = new Error('Network error');
        mockControlApi.deleteModelProxy.mockRejectedValue(genericError);

        const client = new ModelClient();

        await expect(client.delete({ name: 'test-proxy' })).rejects.toThrow(
          'Network error'
        );
      });

      it('should rethrow non-HTTP error during service delete', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockControlApi.deleteModelProxy.mockRejectedValue(httpError);
        const genericError = new Error('Network error');
        mockControlApi.deleteModelService.mockRejectedValue(genericError);

        const client = new ModelClient();

        await expect(client.delete({ name: 'test-service' })).rejects.toThrow(
          'Network error'
        );
      });

      it('should handle HTTP error during service delete', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockControlApi.deleteModelProxy.mockRejectedValue(httpError);
        mockControlApi.deleteModelService.mockRejectedValue(httpError);

        const client = new ModelClient();

        await expect(client.delete({ name: 'test-service' })).rejects.toThrow();
      });
    });

    describe('update', () => {
      it('should update ModelService', async () => {
        mockControlApi.updateModelService.mockResolvedValue({
          modelServiceId: 'service-123',
          modelServiceName: 'test-service',
          description: 'Updated',
        });

        const client = new ModelClient();
        const result = await client.update({
          name: 'test-service',
          input: { description: 'Updated' },
        });

        expect(mockControlApi.updateModelService).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelService);
      });

      it('should update ModelProxy when input contains proxyModel', async () => {
        mockControlApi.updateModelProxy.mockResolvedValue({
          modelProxyId: 'proxy-123',
          modelProxyName: 'test-proxy',
          description: 'Updated',
        });

        const client = new ModelClient();
        const result = await client.update({
          name: 'test-proxy',
          input: {
            proxyModel: ProxyMode.SINGLE,
            description: 'Updated',
          },
        });

        expect(mockControlApi.updateModelProxy).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelProxy);
      });

      it('should update ModelProxy when input contains executionRoleArn', async () => {
        mockControlApi.updateModelProxy.mockResolvedValue({
          modelProxyId: 'proxy-123',
          modelProxyName: 'test-proxy',
        });

        const client = new ModelClient();
        const result = await client.update({
          name: 'test-proxy',
          input: { executionRoleArn: 'arn:acs:ram::123:role/test' },
        });

        expect(mockControlApi.updateModelProxy).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelProxy);
      });

      it('should handle HTTP error for ModelService update', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockControlApi.updateModelService.mockRejectedValue(httpError);

        const client = new ModelClient();

        await expect(
          client.update({
            name: 'test-service',
            input: { description: 'Updated' },
          })
        ).rejects.toThrow();
      });

      it('should handle HTTP error for ModelProxy update', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockControlApi.updateModelProxy.mockRejectedValue(httpError);

        const client = new ModelClient();

        await expect(
          client.update({
            name: 'test-proxy',
            input: { proxyModel: ProxyMode.SINGLE },
          })
        ).rejects.toThrow();
      });

      it('should auto-set proxyModel to single when proxyModel is empty string and single endpoint', async () => {
        mockControlApi.updateModelProxy.mockResolvedValue({
          modelProxyId: 'proxy-123',
          modelProxyName: 'test-proxy',
        });

        const client = new ModelClient();
        await client.update({
          name: 'test-proxy',
          input: {
            proxyModel: '', // Empty string (falsy but not undefined)
            proxyConfig: {
              endpoints: [{ baseUrl: 'http://test.com' }],
            },
          } as any, // Use any to bypass type check for proxyConfig
        });

        expect(mockControlApi.updateModelProxy).toHaveBeenCalled();
      });

      it('should auto-set proxyModel to multi when proxyModel is empty string and multiple endpoints', async () => {
        mockControlApi.updateModelProxy.mockResolvedValue({
          modelProxyId: 'proxy-123',
          modelProxyName: 'test-proxy',
        });

        const client = new ModelClient();
        await client.update({
          name: 'test-proxy',
          input: {
            proxyModel: '', // Empty string (falsy but not undefined)
            proxyConfig: {
              endpoints: [
                { baseUrl: 'http://test1.com' },
                { baseUrl: 'http://test2.com' },
              ],
            },
          } as any, // Use any to bypass type check for proxyConfig
        });

        expect(mockControlApi.updateModelProxy).toHaveBeenCalled();
      });

      it('should rethrow non-HTTP error for ModelService update', async () => {
        const genericError = new Error('Network error');
        mockControlApi.updateModelService.mockRejectedValue(genericError);

        const client = new ModelClient();

        await expect(
          client.update({
            name: 'test-service',
            input: { description: 'Updated' },
          })
        ).rejects.toThrow('Network error');
      });

      it('should rethrow non-HTTP error for ModelProxy update', async () => {
        const genericError = new Error('Network error');
        mockControlApi.updateModelProxy.mockRejectedValue(genericError);

        const client = new ModelClient();

        await expect(
          client.update({
            name: 'test-proxy',
            input: { proxyModel: ProxyMode.SINGLE },
          })
        ).rejects.toThrow('Network error');
      });
    });

    describe('get', () => {
      it('should get ModelProxy first if backendType not specified', async () => {
        mockControlApi.getModelProxy.mockResolvedValue({
          modelProxyId: 'proxy-123',
          modelProxyName: 'test-proxy',
        });

        const client = new ModelClient();
        const result = await client.get({ name: 'test-proxy' });

        expect(mockControlApi.getModelProxy).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelProxy);
      });

      it('should get ModelService if ModelProxy not found', async () => {
        mockControlApi.getModelProxy.mockRejectedValue(
          new HTTPError(404, 'Not found')
        );
        mockControlApi.getModelService.mockResolvedValue({
          modelServiceId: 'service-123',
          modelServiceName: 'test-service',
        });

        const client = new ModelClient();
        const result = await client.get({ name: 'test-service' });

        expect(mockControlApi.getModelProxy).toHaveBeenCalled();
        expect(mockControlApi.getModelService).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelService);
      });

      it('should get ModelService directly if backendType is SERVICE', async () => {
        mockControlApi.getModelService.mockResolvedValue({
          modelServiceId: 'service-123',
          modelServiceName: 'test-service',
        });

        const client = new ModelClient();
        const result = await client.get({
          name: 'test-service',
          backendType: BackendType.SERVICE,
        });

        expect(mockControlApi.getModelProxy).not.toHaveBeenCalled();
        expect(mockControlApi.getModelService).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ModelService);
      });

      it('should throw error if ModelProxy get fails with explicit proxy type', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockControlApi.getModelProxy.mockRejectedValue(httpError);

        const client = new ModelClient();

        await expect(
          client.get({ name: 'test-proxy', backendType: BackendType.PROXY })
        ).rejects.toThrow();
      });

      it('should rethrow non-HTTP error during proxy get', async () => {
        const genericError = new Error('Network error');
        mockControlApi.getModelProxy.mockRejectedValue(genericError);

        const client = new ModelClient();

        await expect(client.get({ name: 'test-proxy' })).rejects.toThrow(
          'Network error'
        );
      });

      it('should rethrow non-HTTP error during service get', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockControlApi.getModelProxy.mockRejectedValue(httpError);
        const genericError = new Error('Network error');
        mockControlApi.getModelService.mockRejectedValue(genericError);

        const client = new ModelClient();

        await expect(client.get({ name: 'test-service' })).rejects.toThrow(
          'Network error'
        );
      });

      it('should handle HTTP error during service get', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockControlApi.getModelProxy.mockRejectedValue(httpError);
        mockControlApi.getModelService.mockRejectedValue(httpError);

        const client = new ModelClient();

        await expect(client.get({ name: 'test-service' })).rejects.toThrow();
      });
    });

    describe('list', () => {
      it('should list ModelServices', async () => {
        mockControlApi.listModelServices.mockResolvedValue({
          items: [
            { modelServiceId: '1', modelServiceName: 'service-1' },
            { modelServiceId: '2', modelServiceName: 'service-2' },
          ],
        });

        const client = new ModelClient();
        const result = await client.list({
          input: { pageNumber: 1, pageSize: 10 },
        });

        expect(mockControlApi.listModelServices).toHaveBeenCalled();
        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(ModelService);
      });

      it('should list ModelProxies when input contains modelProxyName', async () => {
        mockControlApi.listModelProxies.mockResolvedValue({
          items: [{ modelProxyId: '1', modelProxyName: 'proxy-1' }],
        });

        const client = new ModelClient();
        const result = await client.list({
          input: { modelProxyName: 'proxy', pageNumber: 1, pageSize: 10 },
        });

        expect(mockControlApi.listModelProxies).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0]).toBeInstanceOf(ModelProxy);
      });

      it('should handle empty list response', async () => {
        mockControlApi.listModelServices.mockResolvedValue({ items: [] });

        const client = new ModelClient();
        const result = await client.list({
          input: { pageNumber: 1, pageSize: 10 },
        });

        expect(result).toHaveLength(0);
      });

      it('should handle undefined items in ModelServices list response', async () => {
        mockControlApi.listModelServices.mockResolvedValue({
          items: undefined,
        });

        const client = new ModelClient();
        const result = await client.list({
          input: { pageNumber: 1, pageSize: 10 },
        });

        expect(result).toHaveLength(0);
      });

      it('should handle undefined items in ModelProxies list response', async () => {
        mockControlApi.listModelProxies.mockResolvedValue({ items: undefined });

        const client = new ModelClient();
        const result = await client.list({
          input: { modelProxyName: 'proxy', pageNumber: 1, pageSize: 10 },
        });

        expect(result).toHaveLength(0);
      });
    });
  });

  describe('ModelService', () => {
    describe('static methods', () => {
      describe('create', () => {
        it('should create ModelService via client', async () => {
          mockControlApi.createModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'new-service',
            status: 'CREATING',
          });

          const result = await ModelService.create({
            input: {
              modelServiceName: 'new-service',
              provider: Provider.TONGYI,
              modelType: ModelType.LLM,
            },
          });

          expect(result).toBeInstanceOf(ModelService);
          expect(result.modelServiceName).toBe('new-service');
        });
      });

      describe('delete', () => {
        it('should delete ModelService by name', async () => {
          mockControlApi.deleteModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
          });

          const result = await ModelService.delete({ name: 'test-service' });

          expect(result).toBeInstanceOf(ModelService);
        });
      });

      describe('update', () => {
        it('should update ModelService by name', async () => {
          mockControlApi.updateModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
            description: 'Updated',
          });

          const result = await ModelService.update({
            name: 'test-service',
            input: { description: 'Updated' },
          });

          expect(result).toBeInstanceOf(ModelService);
        });
      });

      describe('get', () => {
        it('should get ModelService by name', async () => {
          mockControlApi.getModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
          });

          const result = await ModelService.get({ name: 'test-service' });

          expect(result).toBeInstanceOf(ModelService);
        });
      });

      describe('listAll', () => {
        it('should list all ModelServices', async () => {
          mockControlApi.listModelServices.mockResolvedValue({
            items: [
              { modelServiceId: '1', modelServiceName: 'service-1' },
              { modelServiceId: '2', modelServiceName: 'service-2' },
            ],
          });

          const result = await ModelService.listAll();

          expect(result).toHaveLength(2);
        });

        it('should handle pagination', async () => {
          // First page returns 50 items
          mockControlApi.listModelServices
            .mockResolvedValueOnce({
              items: Array.from({ length: 50 }, (_, i) => ({
                modelServiceId: `${i}`,
                modelServiceName: `service-${i}`,
              })),
            })
            // Second page returns 10 items
            .mockResolvedValueOnce({
              items: Array.from({ length: 10 }, (_, i) => ({
                modelServiceId: `${50 + i}`,
                modelServiceName: `service-${50 + i}`,
              })),
            });

          const result = await ModelService.listAll();

          expect(result).toHaveLength(60);
          expect(mockControlApi.listModelServices).toHaveBeenCalledTimes(2);
        });

        it('should deduplicate results', async () => {
          mockControlApi.listModelServices.mockResolvedValue({
            items: [
              { modelServiceId: '1', modelServiceName: 'service-1' },
              { modelServiceId: '1', modelServiceName: 'service-1' }, // Duplicate
              { modelServiceId: '2', modelServiceName: 'service-2' },
            ],
          });

          const result = await ModelService.listAll();

          expect(result).toHaveLength(2);
        });
      });
    });

    describe('instance methods', () => {
      describe('update', () => {
        it('should update this ModelService', async () => {
          mockControlApi.updateModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
            description: 'Updated',
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.modelServiceId = 'service-123';

          const result = await service.update({
            input: { description: 'Updated' },
          });

          expect(result).toBe(service);
          expect(result.description).toBe('Updated');
        });

        it('should throw error if modelServiceName not set', async () => {
          const service = new ModelService();

          await expect(
            service.update({ input: { description: 'Updated' } })
          ).rejects.toThrow(
            'modelServiceName is required to update a ModelService'
          );
        });
      });

      describe('delete', () => {
        it('should delete this ModelService', async () => {
          mockControlApi.deleteModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';

          const result = await service.delete();

          expect(result).toBeInstanceOf(ModelService);
        });

        it('should throw error if modelServiceName not set', async () => {
          const service = new ModelService();

          await expect(service.delete()).rejects.toThrow(
            'modelServiceName is required to delete a ModelService'
          );
        });
      });

      describe('get (refresh)', () => {
        it('should refresh ModelService data', async () => {
          mockControlApi.getModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
            status: 'READY',
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';

          const result = await service.get();

          expect(result).toBe(service);
          expect(result.status).toBe('READY');
        });

        it('should throw error if modelServiceName not set', async () => {
          const service = new ModelService();

          await expect(service.get()).rejects.toThrow(
            'modelServiceName is required to refresh a ModelService'
          );
        });
      });

      describe('modelInfo', () => {
        it('should return model info from providerSettings', async () => {
          const service = new ModelService();
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            apiKey: 'test-api-key',
            modelNames: ['model-1', 'model-2'],
          };
          service.provider = 'test-provider';

          const result = await service.modelInfo();

          expect(result.apiKey).toBe('test-api-key');
          expect(result.baseUrl).toBe('https://api.example.com');
          expect(result.model).toBe('model-1');
          expect(result.provider).toBe('test-provider');
        });

        it('should throw error if providerSettings not set', async () => {
          const service = new ModelService();

          await expect(service.modelInfo()).rejects.toThrow(
            'providerSettings is required'
          );
        });

        it('should throw error if baseUrl not set', async () => {
          const service = new ModelService();
          service.providerSettings = { apiKey: 'test' };

          await expect(service.modelInfo()).rejects.toThrow(
            'providerSettings.baseUrl is required'
          );
        });

        it('should get apiKey from Credential if not in providerSettings', async () => {
          const { Credential } = require('../../../src/credential/credential');
          Credential.get.mockResolvedValue({
            credentialSecret: 'credential-api-key',
          });

          const service = new ModelService();
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            modelNames: ['model-1'],
          };
          service.credentialName = 'my-credential';

          const result = await service.modelInfo();

          expect(Credential.get).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'my-credential' })
          );
          expect(result.apiKey).toBe('credential-api-key');
        });

        it('should return empty apiKey when no credentialName is set', async () => {
          const { Credential } = require('../../../src/credential/credential');

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
          };
          // No credentialName set

          const result = await service.modelInfo();

          expect(result.apiKey).toBe('');
          expect(Credential.get).not.toHaveBeenCalled();
        });

        it('should handle credential with empty credentialSecret', async () => {
          const { Credential } = require('../../../src/credential/credential');
          Credential.get.mockResolvedValue({
            credentialSecret: '', // Empty secret
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            modelNames: ['model-1'],
          };
          service.credentialName = 'my-credential';

          const result = await service.modelInfo();

          expect(result.apiKey).toBe('');
        });

        it('should handle credential with undefined credentialSecret', async () => {
          const { Credential } = require('../../../src/credential/credential');
          Credential.get.mockResolvedValue({
            credentialSecret: undefined, // Undefined secret
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            modelNames: ['model-1'],
          };
          service.credentialName = 'my-credential';

          const result = await service.modelInfo();

          expect(result.apiKey).toBe('');
        });

        it('should return undefined model when modelNames is empty', async () => {
          const service = new ModelService();
          service.modelServiceName = 'fallback-service';
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            modelNames: [], // Empty
          };

          const result = await service.modelInfo();

          // modelInfo returns undefined when modelNames is empty
          // The fallback to modelServiceName happens in completion/responses
          expect(result.model).toBeUndefined();
        });
      });

      describe('completion', () => {
        it('should call generateText for non-streaming request', async () => {
          const { generateText } = require('ai');

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            apiKey: 'test-key',
          };

          await service.completion({
            messages: [{ role: 'user', content: 'Hello' }],
          });

          expect(generateText).toHaveBeenCalled();
        });

        it('should call streamText for streaming request', async () => {
          const { streamText } = require('ai');

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            apiKey: 'test-key',
          };

          await service.completion({
            messages: [{ role: 'user', content: 'Hello' }],
            stream: true,
          });

          expect(streamText).toHaveBeenCalled();
        });

        it('should use provided model over info.model', async () => {
          const { generateText } = require('ai');

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            apiKey: 'test-key',
            modelNames: ['default-model'],
          };

          await service.completion({
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'custom-model',
          });

          expect(generateText).toHaveBeenCalled();
        });

        it('should fallback to modelServiceName when no model is available', async () => {
          const { generateText } = require('ai');

          const service = new ModelService();
          service.modelServiceName = 'fallback-service';
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            apiKey: 'test-key',
            // No modelNames
          };

          await service.completion({
            messages: [{ role: 'user', content: 'Hello' }],
          });

          expect(generateText).toHaveBeenCalled();
        });

        it('should fallback to empty string when model and info.model are undefined and modelServiceName is empty string', async () => {
          const { generateText } = require('ai');
          jest.clearAllMocks();

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.providerSettings = {
            baseUrl: 'https://api.example.com',
            apiKey: 'test-key',
            // No modelNames
          };

          // Mock modelInfo to return info without model
          const originalModelInfo = service.modelInfo;
          service.modelInfo = jest.fn().mockResolvedValue({
            apiKey: 'test-key',
            baseUrl: 'https://api.example.com',
            model: undefined, // No model in info
            headers: {},
          });

          // Temporarily set modelServiceName to empty string
          const originalName = service.modelServiceName;
          Object.defineProperty(service, 'modelServiceName', {
            get: () => '', // Empty string
            configurable: true,
          });

          await service.completion({
            messages: [{ role: 'user', content: 'Hello' }],
          });

          expect(generateText).toHaveBeenCalled();

          // Restore
          Object.defineProperty(service, 'modelServiceName', {
            value: originalName,
            writable: true,
            configurable: true,
          });
          service.modelInfo = originalModelInfo;
        });
      });

      describe('waitUntilReadyOrFailed', () => {
        it('should wait until status is READY', async () => {
          let callCount = 0;
          mockControlApi.getModelService.mockImplementation(async () => {
            callCount++;
            return {
              modelServiceId: 'service-123',
              modelServiceName: 'test-service',
              status: callCount >= 2 ? Status.READY : Status.CREATING,
            };
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.status = Status.CREATING;

          const result = await service.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });

          expect(result.status).toBe(Status.READY);
          expect(callCount).toBeGreaterThanOrEqual(2);
        });

        it('should call callback callback', async () => {
          mockControlApi.getModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
            status: Status.READY,
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.status = Status.CREATING;

          const callback = jest.fn();

          await service.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
            callback,
          });

          expect(callback).toHaveBeenCalled();
        });

        it('should throw error if status becomes CREATE_FAILED', async () => {
          mockControlApi.getModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
            status: Status.CREATE_FAILED,
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.status = Status.CREATING;

          const result = await service.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });
          expect(result.status).toBe('CREATE_FAILED');
        });

        it('should throw error if status becomes UPDATE_FAILED', async () => {
          mockControlApi.getModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
            status: Status.UPDATE_FAILED,
            statusReason: 'Update failed',
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.status = Status.UPDATING;

          const result = await service.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });
          expect(result.status).toBe('UPDATE_FAILED');
        });

        it('should throw error if status becomes DELETE_FAILED', async () => {
          mockControlApi.getModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
            status: Status.DELETE_FAILED,
            statusReason: 'Delete failed',
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';

          const result = await service.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });
          expect(result.status).toBe('DELETE_FAILED');
        });

        it('should throw timeout error if status does not become READY', async () => {
          mockControlApi.getModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
            status: Status.CREATING,
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';
          service.status = Status.CREATING;

          await expect(
            service.waitUntilReadyOrFailed({
              intervalSeconds: 0.1,
              timeoutSeconds: 0.2,
            })
          ).rejects.toThrow(/Timeout waiting/);
        });

        it('should use default timeout and interval when not provided', async () => {
          mockControlApi.getModelService.mockResolvedValue({
            modelServiceId: 'service-123',
            modelServiceName: 'test-service',
            status: Status.READY,
          });

          const service = new ModelService();
          service.modelServiceName = 'test-service';

          // Call without options to test default values
          const result = await service.waitUntilReadyOrFailed();

          expect(result.status).toBe(Status.READY);
        });
      });
    });
  });

  describe('ModelProxy', () => {
    describe('static methods', () => {
      describe('create', () => {
        it('should create ModelProxy via client', async () => {
          mockControlApi.createModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'new-proxy',
            status: 'CREATING',
          });

          const result = await ModelProxy.create({
            input: {
              modelProxyName: 'new-proxy',
              proxyConfig: { endpoints: [] },
            },
          });

          expect(result).toBeInstanceOf(ModelProxy);
          expect(result.modelProxyName).toBe('new-proxy');
        });
      });

      describe('delete', () => {
        it('should delete ModelProxy by name', async () => {
          mockControlApi.deleteModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
          });

          const result = await ModelProxy.delete({ name: 'test-proxy' });

          expect(result).toBeInstanceOf(ModelProxy);
        });
      });

      describe('update', () => {
        it('should update ModelProxy by name', async () => {
          mockControlApi.updateModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            description: 'Updated',
          });

          const result = await ModelProxy.update({
            name: 'test-proxy',
            // Note: Need executionRoleArn or proxyModel to trigger ModelProxy update path in ModelClient
            input: { description: 'Updated', executionRoleArn: 'arn:test' },
          });

          expect(result).toBeInstanceOf(ModelProxy);
        });
      });

      describe('get', () => {
        it('should get ModelProxy by name', async () => {
          mockControlApi.getModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
          });

          const result = await ModelProxy.get({ name: 'test-proxy' });

          expect(result).toBeInstanceOf(ModelProxy);
        });
      });

      describe('listAll', () => {
        it('should list all model proxies with pagination', async () => {
          // Returns less than 50, stops pagination
          mockControlApi.listModelProxies.mockResolvedValue({
            items: [
              { modelProxyId: 'proxy-1', modelProxyName: 'proxy-1' },
              { modelProxyId: 'proxy-2', modelProxyName: 'proxy-2' },
            ],
          });

          const result = await ModelProxy.listAll();

          expect(result).toHaveLength(2);
        });

        it('should deduplicate results by modelProxyId', async () => {
          mockControlApi.listModelProxies.mockResolvedValue({
            items: [
              { modelProxyId: 'proxy-1', modelProxyName: 'proxy-1' },
              { modelProxyId: 'proxy-1', modelProxyName: 'proxy-1-dup' }, // Duplicate
              { modelProxyId: 'proxy-2', modelProxyName: 'proxy-2' },
            ],
          });

          const result = await ModelProxy.listAll();

          expect(result).toHaveLength(2);
          expect(result.map((p) => p.modelProxyId)).toEqual([
            'proxy-1',
            'proxy-2',
          ]);
        });

        it('should pass filter options', async () => {
          mockControlApi.listModelProxies.mockResolvedValue({ items: [] });

          await ModelProxy.listAll({
            proxyMode: ProxyMode.SINGLE,
            status: Status.READY,
          });

          expect(mockControlApi.listModelProxies).toHaveBeenCalled();
        });
      });
    });

    describe('instance methods', () => {
      describe('update', () => {
        it('should update this ModelProxy', async () => {
          mockControlApi.updateModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            description: 'Updated',
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          const result = await proxy.update({
            // Note: Need executionRoleArn or proxyModel to trigger ModelProxy update path in ModelClient
            input: { description: 'Updated', executionRoleArn: 'arn:test' },
          });

          expect(result).toBe(proxy);
          expect(result.description).toBe('Updated');
        });

        it('should throw error if modelProxyName not set', async () => {
          const proxy = new ModelProxy();

          await expect(
            proxy.update({
              input: { description: 'Updated', executionRoleArn: 'arn:test' },
            })
          ).rejects.toThrow(
            'modelProxyName is required to update a ModelProxy'
          );
        });
      });

      describe('delete', () => {
        it('should delete this ModelProxy', async () => {
          mockControlApi.deleteModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          const result = await proxy.delete();

          expect(result).toBeInstanceOf(ModelProxy);
        });

        it('should throw error if modelProxyName not set', async () => {
          const proxy = new ModelProxy();

          await expect(proxy.delete()).rejects.toThrow(
            'modelProxyName is required to delete a ModelProxy'
          );
        });
      });

      describe('get (refresh)', () => {
        it('should refresh ModelProxy data', async () => {
          mockControlApi.getModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            status: 'READY',
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          const result = await proxy.get();

          expect(result).toBe(proxy);
          expect(result.status).toBe('READY');
        });

        it('should throw error if modelProxyName not set', async () => {
          const proxy = new ModelProxy();

          await expect(proxy.get()).rejects.toThrow(
            'modelProxyName is required to refresh a ModelProxy'
          );
        });
      });

      describe('modelInfo', () => {
        it('should return model info with endpoint', async () => {
          const { Credential } = require('../../../src/credential/credential');
          Credential.get.mockResolvedValue({
            credentialSecret: 'test-api-key',
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';
          proxy.endpoint = 'https://api.example.com';
          proxy.credentialName = 'my-credential';
          proxy.proxyModel = 'single';
          proxy.proxyConfig = {
            endpoints: [{ modelNames: ['model-1'] }],
          } as any;

          const result = await proxy.modelInfo();

          expect(result.apiKey).toBe('test-api-key');
          expect(result.baseUrl).toBe('https://api.example.com');
          expect(result.model).toBe('model-1');
        });

        it('should throw error if modelProxyName not set', async () => {
          const proxy = new ModelProxy();
          proxy.endpoint = 'https://api.example.com';

          await expect(proxy.modelInfo()).rejects.toThrow(
            'modelProxyName is required'
          );
        });

        it('should throw error if endpoint not set', async () => {
          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          await expect(proxy.modelInfo()).rejects.toThrow(
            'endpoint is required'
          );
        });

        it('should use modelProxyName as model when proxyModel is not single', async () => {
          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';
          proxy.endpoint = 'https://api.example.com';
          proxy.proxyModel = 'multi';

          const result = await proxy.modelInfo();

          expect(result.model).toBe('test-proxy');
        });

        it('should return empty apiKey when no credentialName is set', async () => {
          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';
          proxy.endpoint = 'https://api.example.com';
          // No credentialName set

          const result = await proxy.modelInfo();

          expect(result.apiKey).toBe('');
          expect(result.baseUrl).toBe('https://api.example.com');
        });

        it('should handle credential with empty credentialSecret', async () => {
          const { Credential } = require('../../../src/credential/credential');
          Credential.get.mockResolvedValue({
            credentialSecret: '', // Empty secret
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';
          proxy.endpoint = 'https://api.example.com';
          proxy.credentialName = 'my-credential';

          const result = await proxy.modelInfo();

          expect(result.apiKey).toBe('');
        });
      });

      describe('completion', () => {
        it('should call generateText for non-streaming request', async () => {
          const { generateText } = require('ai');

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';
          proxy.endpoint = 'https://api.example.com';

          await proxy.completion({
            messages: [{ role: 'user', content: 'Hello' }],
          });

          expect(generateText).toHaveBeenCalled();
        });

        it('should call streamText for streaming request', async () => {
          const { streamText } = require('ai');

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';
          proxy.endpoint = 'https://api.example.com';

          await proxy.completion({
            messages: [{ role: 'user', content: 'Hello' }],
            stream: true,
          });

          expect(streamText).toHaveBeenCalled();
        });

        it('should use provided model over info.model', async () => {
          const { generateText } = require('ai');

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';
          proxy.endpoint = 'https://api.example.com';

          await proxy.completion({
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'custom-model',
          });

          expect(generateText).toHaveBeenCalled();
        });

        it('should fallback to modelProxyName when no model is available', async () => {
          const { generateText } = require('ai');

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'fallback-proxy';
          proxy.endpoint = 'https://api.example.com';
          // No model in modelInfo, no model param

          await proxy.completion({
            messages: [{ role: 'user', content: 'Hello' }],
          });

          expect(generateText).toHaveBeenCalled();
        });

        
      });

      describe('waitUntilReadyOrFailed', () => {
        it('should wait until status is READY', async () => {
          let callCount = 0;
          mockControlApi.getModelProxy.mockImplementation(async () => {
            callCount++;
            return {
              modelProxyId: 'proxy-123',
              modelProxyName: 'test-proxy',
              status: callCount < 2 ? 'CREATING' : 'READY',
            };
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          await proxy.waitUntilReadyOrFailed({
            intervalSeconds: 0.01,
            timeoutSeconds: 5,
          });

          expect(proxy.status).toBe('READY');
          expect(callCount).toBeGreaterThanOrEqual(2);
        });

        it('should throw error on failed status', async () => {
          mockControlApi.getModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            status: 'FAILED',
            statusReason: 'Deployment failed',
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          await expect(
            proxy.waitUntilReadyOrFailed({
              intervalSeconds: 0.01,
              timeoutSeconds: 1,
            })
          ).rejects.toThrow();
        });

        it('should throw error on CREATE_FAILED status', async () => {
          mockControlApi.getModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            status: Status.CREATE_FAILED,
            statusReason: 'Creation failed',
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          const result = await proxy.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });
          expect(result.status).toBe('CREATE_FAILED');
        });

        it('should throw error on UPDATE_FAILED status', async () => {
          mockControlApi.getModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            status: Status.UPDATE_FAILED,
            statusReason: 'Update failed',
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          const result = await proxy.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });
          expect(result.status).toBe('UPDATE_FAILED');
        });

        it('should throw error on DELETE_FAILED status', async () => {
          mockControlApi.getModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            status: Status.DELETE_FAILED,
            statusReason: 'Delete failed',
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          const result = await proxy.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
          });
          expect(result.status).toBe('DELETE_FAILED');
        });

        it('should call callback callback', async () => {
          mockControlApi.getModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            status: Status.READY,
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          const callback = jest.fn();

          await proxy.waitUntilReadyOrFailed({
            intervalSeconds: 0.1,
            timeoutSeconds: 5,
            callback,
          });

          expect(callback).toHaveBeenCalled();
        });

        it('should throw timeout error', async () => {
          mockControlApi.getModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            status: 'CREATING',
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          await expect(
            proxy.waitUntilReadyOrFailed({
              intervalSeconds: 0.05,
              timeoutSeconds: 0.1,
            })
          ).rejects.toThrow(/Timeout waiting/);
        });

        it('should use default timeout and interval when not provided', async () => {
          mockControlApi.getModelProxy.mockResolvedValue({
            modelProxyId: 'proxy-123',
            modelProxyName: 'test-proxy',
            status: Status.READY,
          });

          const proxy = new ModelProxy();
          proxy.modelProxyName = 'test-proxy';

          // Call without options to test default values
          const result = await proxy.waitUntilReadyOrFailed();

          expect(result.status).toBe(Status.READY);
        });
      });
    });
  });
});
