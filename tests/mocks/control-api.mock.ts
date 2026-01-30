/**
 * Control API Mock
 *
 * 模拟 AgentRun 控制面 API 的行为。
 * Mock for AgentRun Control API behavior.
 */

import { Status } from '../../src/utils/model';
import { getMockStore, resetMockStore } from './store';

/**
 * Mock Control API Client
 *
 * Provides mock implementations of AgentRun Control API methods
 */
export interface MockControlAPIClient {
  // Agent Runtime
  createAgentRuntime: jest.Mock;
  deleteAgentRuntime: jest.Mock;
  updateAgentRuntime: jest.Mock;
  getAgentRuntime: jest.Mock;
  listAgentRuntimes: jest.Mock;
  listAgentRuntimeVersions: jest.Mock;

  // Agent Runtime Endpoint
  createAgentRuntimeEndpoint: jest.Mock;
  deleteAgentRuntimeEndpoint: jest.Mock;
  updateAgentRuntimeEndpoint: jest.Mock;
  getAgentRuntimeEndpoint: jest.Mock;
  listAgentRuntimeEndpoints: jest.Mock;

  // Credential
  createCredential: jest.Mock;
  deleteCredential: jest.Mock;
  updateCredential: jest.Mock;
  getCredential: jest.Mock;
  listCredentials: jest.Mock;

  // Model Service
  createModelService: jest.Mock;
  deleteModelService: jest.Mock;
  updateModelService: jest.Mock;
  getModelService: jest.Mock;
  listModelServices: jest.Mock;

  // Model Proxy
  createModelProxy: jest.Mock;
  deleteModelProxy: jest.Mock;
  updateModelProxy: jest.Mock;
  getModelProxy: jest.Mock;
  listModelProxies: jest.Mock;

  // Access Token
  getAccessToken: jest.Mock;
}

/**
 * Create a mock Control API client with default implementations
 */
export function createMockControlAPI(): MockControlAPIClient {
  const store = getMockStore();

  return {
    // Agent Runtime
    createAgentRuntime: jest.fn().mockImplementation(async (input: any) => {
      const runtime = store.createAgentRuntime({
        agentRuntimeName: input.agentRuntimeName,
        description: input.description,
        cpu: input.cpu,
        memory: input.memory,
        port: input.port,
      });
      // Simulate async status change
      setTimeout(() => {
        runtime.status = Status.READY;
      }, 100);
      return runtime;
    }),

    deleteAgentRuntime: jest.fn().mockImplementation(async (input: any) => {
      const runtime =
        store.getAgentRuntimeByName(input.agentRuntimeName) ||
        store.getAgentRuntimeById(input.agentRuntimeId);
      if (!runtime) {
        const error = new Error('Resource not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      runtime.status = Status.DELETING;
      return { ...runtime };
    }),

    updateAgentRuntime: jest.fn().mockImplementation(async (input: any) => {
      const runtime =
        store.getAgentRuntimeByName(input.agentRuntimeName) ||
        store.getAgentRuntimeById(input.agentRuntimeId);
      if (!runtime) {
        const error = new Error('Resource not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      Object.assign(runtime, input);
      runtime.lastUpdatedAt = new Date().toISOString();
      return { ...runtime };
    }),

    getAgentRuntime: jest.fn().mockImplementation(async (input: any) => {
      const runtime =
        store.getAgentRuntimeByName(input.agentRuntimeName) ||
        store.getAgentRuntimeById(input.agentRuntimeId);
      if (!runtime) {
        const error = new Error('Resource not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      return { ...runtime };
    }),

    listAgentRuntimes: jest.fn().mockImplementation(async (input?: any) => {
      const items = Array.from(store.agentRuntimes.values());
      return {
        items,
        nextToken: undefined,
      };
    }),

    listAgentRuntimeVersions: jest.fn().mockImplementation(async (input: any) => {
      return {
        items: [],
        nextToken: undefined,
      };
    }),

    // Agent Runtime Endpoint
    createAgentRuntimeEndpoint: jest
      .fn()
      .mockImplementation(async (runtimeId: string, input: any) => {
        const runtime = store.getAgentRuntimeById(runtimeId);
        if (!runtime) {
          const error = new Error('Runtime not found');
          (error as any).code = 'ResourceNotExist';
          (error as any).statusCode = 404;
          throw error;
        }
        const endpoint = {
          agentRuntimeEndpointId: store.generateId('ep'),
          agentRuntimeEndpointName: input.agentRuntimeEndpointName,
          agentRuntimeId: runtimeId,
          status: Status.CREATING,
          endpointPublicUrl: `https://ep-${Date.now()}.example.com`,
        };
        store.agentRuntimeEndpoints.set(endpoint.agentRuntimeEndpointId, endpoint);
        return endpoint;
      }),

    deleteAgentRuntimeEndpoint: jest
      .fn()
      .mockImplementation(async (runtimeId: string, endpointId: string) => {
        const endpoint = store.agentRuntimeEndpoints.get(endpointId);
        if (!endpoint) {
          const error = new Error('Endpoint not found');
          (error as any).code = 'ResourceNotExist';
          (error as any).statusCode = 404;
          throw error;
        }
        store.agentRuntimeEndpoints.delete(endpointId);
        return { ...endpoint, status: Status.DELETING };
      }),

    updateAgentRuntimeEndpoint: jest
      .fn()
      .mockImplementation(async (runtimeId: string, endpointId: string, input: any) => {
        const endpoint = store.agentRuntimeEndpoints.get(endpointId);
        if (!endpoint) {
          const error = new Error('Endpoint not found');
          (error as any).code = 'ResourceNotExist';
          (error as any).statusCode = 404;
          throw error;
        }
        Object.assign(endpoint, input);
        return { ...endpoint };
      }),

    getAgentRuntimeEndpoint: jest
      .fn()
      .mockImplementation(async (runtimeId: string, endpointId: string) => {
        const endpoint = store.agentRuntimeEndpoints.get(endpointId);
        if (!endpoint) {
          const error = new Error('Endpoint not found');
          (error as any).code = 'ResourceNotExist';
          (error as any).statusCode = 404;
          throw error;
        }
        return { ...endpoint };
      }),

    listAgentRuntimeEndpoints: jest
      .fn()
      .mockImplementation(async (runtimeId: string, input?: any) => {
        const items = Array.from(store.agentRuntimeEndpoints.values()).filter(
          ep => ep.agentRuntimeId === runtimeId
        );
        return {
          items,
          nextToken: undefined,
        };
      }),

    // Credential
    createCredential: jest.fn().mockImplementation(async (input: any) => {
      const credential = store.createCredential({
        credentialName: input.credentialName,
        description: input.description,
        credentialConfig: input.credentialConfig,
      });
      return credential;
    }),

    deleteCredential: jest.fn().mockImplementation(async (input: any) => {
      const credential = store.getCredentialByName(input.credentialName);
      if (!credential) {
        const error = new Error('Credential not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      store.credentials.delete(input.credentialName);
      return { ...credential };
    }),

    updateCredential: jest.fn().mockImplementation(async (input: any) => {
      const credential = store.getCredentialByName(input.credentialName);
      if (!credential) {
        const error = new Error('Credential not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      Object.assign(credential, input);
      return { ...credential };
    }),

    getCredential: jest.fn().mockImplementation(async (input: any) => {
      const credential = store.getCredentialByName(input.credentialName);
      if (!credential) {
        const error = new Error('Credential not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      return { ...credential };
    }),

    listCredentials: jest.fn().mockImplementation(async (input?: any) => {
      const items = Array.from(store.credentials.values());
      return {
        items,
        nextToken: undefined,
      };
    }),

    // Model Service
    createModelService: jest.fn().mockImplementation(async (input: any) => {
      const service = store.createModelService({
        modelServiceName: input.modelServiceName,
        description: input.description,
        provider: input.provider,
        providerSettings: input.providerSettings,
      });
      return service;
    }),

    deleteModelService: jest.fn().mockImplementation(async (input: any) => {
      const service = store.modelServices.get(input.modelServiceName);
      if (!service) {
        const error = new Error('Model service not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      store.modelServices.delete(input.modelServiceName);
      return { ...service };
    }),

    updateModelService: jest.fn().mockImplementation(async (input: any) => {
      const service = store.modelServices.get(input.modelServiceName);
      if (!service) {
        const error = new Error('Model service not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      Object.assign(service, input);
      return { ...service };
    }),

    getModelService: jest.fn().mockImplementation(async (input: any) => {
      const service = store.modelServices.get(input.modelServiceName);
      if (!service) {
        const error = new Error('Model service not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      return { ...service };
    }),

    listModelServices: jest.fn().mockImplementation(async (input?: any) => {
      const items = Array.from(store.modelServices.values());
      return {
        items,
        nextToken: undefined,
      };
    }),

    // Model Proxy
    createModelProxy: jest.fn().mockImplementation(async (input: any) => {
      const proxy = store.createModelProxy({
        modelProxyName: input.modelProxyName,
        description: input.description,
        proxyConfig: input.proxyConfig,
      });
      return proxy;
    }),

    deleteModelProxy: jest.fn().mockImplementation(async (input: any) => {
      const proxy = store.modelProxies.get(input.modelProxyName);
      if (!proxy) {
        const error = new Error('Model proxy not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      store.modelProxies.delete(input.modelProxyName);
      return { ...proxy };
    }),

    updateModelProxy: jest.fn().mockImplementation(async (input: any) => {
      const proxy = store.modelProxies.get(input.modelProxyName);
      if (!proxy) {
        const error = new Error('Model proxy not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      Object.assign(proxy, input);
      return { ...proxy };
    }),

    getModelProxy: jest.fn().mockImplementation(async (input: any) => {
      const proxy = store.modelProxies.get(input.modelProxyName);
      if (!proxy) {
        const error = new Error('Model proxy not found');
        (error as any).code = 'ResourceNotExist';
        (error as any).statusCode = 404;
        throw error;
      }
      return { ...proxy };
    }),

    listModelProxies: jest.fn().mockImplementation(async (input?: any) => {
      const items = Array.from(store.modelProxies.values());
      return {
        items,
        nextToken: undefined,
      };
    }),

    // Access Token
    getAccessToken: jest.fn().mockImplementation(async (input: any) => {
      return {
        body: {
          data: {
            accessToken: 'mock-access-token-' + Date.now(),
          },
        },
      };
    }),
  };
}

/**
 * Setup Control API mock
 *
 * This function sets up the mock for the Control API module.
 * Call this in beforeEach to reset the mock state.
 */
export function setupControlAPIMock(): MockControlAPIClient {
  resetMockStore();
  return createMockControlAPI();
}
