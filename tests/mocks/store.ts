/**
 * Mock Store
 *
 * 内存存储，用于模拟 AgentRun 后台的资源状态。
 * In-memory store for simulating AgentRun backend resource state.
 */

import { Status } from '../../src/utils/model';

/**
 * Agent Runtime resource
 */
export interface MockAgentRuntime {
  agentRuntimeId: string;
  agentRuntimeName: string;
  agentRuntimeVersion?: string;
  agentRuntimeArn?: string;
  status: Status;
  statusReason?: string;
  description?: string;
  cpu?: number;
  memory?: number;
  port?: number;
  createdAt?: string;
  lastUpdatedAt?: string;
  endpoints?: MockAgentRuntimeEndpoint[];
}

/**
 * Agent Runtime Endpoint resource
 */
export interface MockAgentRuntimeEndpoint {
  agentRuntimeEndpointId: string;
  agentRuntimeEndpointName: string;
  agentRuntimeId: string;
  status: Status;
  statusReason?: string;
  endpointPublicUrl?: string;
  description?: string;
}

/**
 * Credential resource
 */
export interface MockCredential {
  credentialId: string;
  credentialName: string;
  credentialSecret?: string;
  credentialConfig?: Record<string, unknown>;
  description?: string;
  status?: Status;
}

/**
 * Model Service resource
 */
export interface MockModelService {
  modelServiceId: string;
  modelServiceName: string;
  status: Status;
  endpoint?: string;
  provider?: string;
  providerSettings?: Record<string, unknown>;
  description?: string;
}

/**
 * Model Proxy resource
 */
export interface MockModelProxy {
  modelProxyId: string;
  modelProxyName: string;
  status: Status;
  endpoint?: string;
  proxyConfig?: Record<string, unknown>;
  description?: string;
}

/**
 * ToolSet resource
 */
export interface MockToolSet {
  uid: string;
  name: string;
  status?: { status: string };
  description?: string;
  spec?: Record<string, unknown>;
}

/**
 * Mock Store class
 *
 * Singleton store for managing mock resources
 */
export class MockStore {
  private static instance: MockStore;

  // Resource collections
  agentRuntimes: Map<string, MockAgentRuntime> = new Map();
  agentRuntimeEndpoints: Map<string, MockAgentRuntimeEndpoint> = new Map();
  credentials: Map<string, MockCredential> = new Map();
  modelServices: Map<string, MockModelService> = new Map();
  modelProxies: Map<string, MockModelProxy> = new Map();
  toolsets: Map<string, MockToolSet> = new Map();

  // Counters for generating IDs
  private idCounters: Record<string, number> = {};

  private constructor() {}

  static getInstance(): MockStore {
    if (!MockStore.instance) {
      MockStore.instance = new MockStore();
    }
    return MockStore.instance;
  }

  /**
   * Generate a unique ID for a resource type
   */
  generateId(prefix: string): string {
    this.idCounters[prefix] = (this.idCounters[prefix] || 0) + 1;
    return `${prefix}-${this.idCounters[prefix]}`;
  }

  /**
   * Reset all resources and counters
   */
  reset(): void {
    this.agentRuntimes.clear();
    this.agentRuntimeEndpoints.clear();
    this.credentials.clear();
    this.modelServices.clear();
    this.modelProxies.clear();
    this.toolsets.clear();
    this.idCounters = {};
  }

  // Agent Runtime helpers
  createAgentRuntime(data: Partial<MockAgentRuntime>): MockAgentRuntime {
    const id = data.agentRuntimeId || this.generateId('ar');
    const runtime: MockAgentRuntime = {
      agentRuntimeId: id,
      agentRuntimeName: data.agentRuntimeName || `runtime-${id}`,
      agentRuntimeArn: data.agentRuntimeArn || `arn:agentrun:runtime:${id}`,
      status: data.status || Status.CREATING,
      description: data.description,
      cpu: data.cpu || 2,
      memory: data.memory || 4096,
      port: data.port || 9000,
      createdAt: data.createdAt || new Date().toISOString(),
      lastUpdatedAt: data.lastUpdatedAt || new Date().toISOString(),
      endpoints: [],
    };
    this.agentRuntimes.set(runtime.agentRuntimeName, runtime);
    return runtime;
  }

  getAgentRuntimeByName(name: string): MockAgentRuntime | undefined {
    return this.agentRuntimes.get(name);
  }

  getAgentRuntimeById(id: string): MockAgentRuntime | undefined {
    for (const runtime of this.agentRuntimes.values()) {
      if (runtime.agentRuntimeId === id) {
        return runtime;
      }
    }
    return undefined;
  }

  // Credential helpers
  createCredential(data: Partial<MockCredential>): MockCredential {
    const id = data.credentialId || this.generateId('cred');
    const credential: MockCredential = {
      credentialId: id,
      credentialName: data.credentialName || `credential-${id}`,
      credentialSecret: data.credentialSecret,
      credentialConfig: data.credentialConfig,
      description: data.description,
      status: data.status || Status.READY,
    };
    this.credentials.set(credential.credentialName, credential);
    return credential;
  }

  getCredentialByName(name: string): MockCredential | undefined {
    return this.credentials.get(name);
  }

  // Model Service helpers
  createModelService(data: Partial<MockModelService>): MockModelService {
    const id = data.modelServiceId || this.generateId('ms');
    const service: MockModelService = {
      modelServiceId: id,
      modelServiceName: data.modelServiceName || `model-service-${id}`,
      status: data.status || Status.CREATING,
      endpoint: data.endpoint,
      provider: data.provider,
      providerSettings: data.providerSettings,
      description: data.description,
    };
    this.modelServices.set(service.modelServiceName, service);
    return service;
  }

  // Model Proxy helpers
  createModelProxy(data: Partial<MockModelProxy>): MockModelProxy {
    const id = data.modelProxyId || this.generateId('mp');
    const proxy: MockModelProxy = {
      modelProxyId: id,
      modelProxyName: data.modelProxyName || `model-proxy-${id}`,
      status: data.status || Status.CREATING,
      endpoint: data.endpoint,
      proxyConfig: data.proxyConfig,
      description: data.description,
    };
    this.modelProxies.set(proxy.modelProxyName, proxy);
    return proxy;
  }

  // ToolSet helpers
  createToolSet(data: Partial<MockToolSet>): MockToolSet {
    const id = data.uid || this.generateId('ts');
    const toolset: MockToolSet = {
      uid: id,
      name: data.name || `toolset-${id}`,
      status: data.status || { status: 'CREATING' },
      description: data.description,
      spec: data.spec,
    };
    this.toolsets.set(toolset.name, toolset);
    return toolset;
  }

  getToolSetByName(name: string): MockToolSet | undefined {
    return this.toolsets.get(name);
  }
}

/**
 * Get the singleton mock store instance
 */
export function getMockStore(): MockStore {
  return MockStore.getInstance();
}

/**
 * Reset the mock store
 */
export function resetMockStore(): void {
  MockStore.getInstance().reset();
}


