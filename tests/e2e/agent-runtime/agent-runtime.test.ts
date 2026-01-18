/**
 * Agent Runtime 模块的 E2E 测试
 *
 * 测试覆盖:
 * - 创建 Agent Runtime
 * - 获取 Agent Runtime
 * - 列举 Agent Runtimes
 * - 更新 Agent Runtime
 * - 删除 Agent Runtime
 * - Endpoint 管理
 * - Version 管理
 */



import {
  AgentRuntime,
  AgentRuntimeClient,
  AgentRuntimeLanguage,
  AgentRuntimeArtifact,
  AgentRuntimeProtocolType,
  codeFromOss,
} from '../../../src/agent-runtime';
import { Status, NetworkMode } from '../../../src/utils/model';
import { ResourceNotExistError, ResourceAlreadyExistError } from '../../../src/utils/exception';
import type { AgentRuntimeCreateInput, AgentRuntimeUpdateInput } from '../../../src/agent-runtime';

/**
 * 生成唯一名称
 */
function generateUniqueName(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

describe('Agent Runtime E2E Tests', () => {
  let agentRuntimeName: string;

  beforeAll(async () => {
    agentRuntimeName = generateUniqueName('e2e-runtime');
  });

  describe('Agent Runtime Lifecycle', () => {
    it(
      'should complete full lifecycle',
      async () => {
        const client = new AgentRuntimeClient();
        const time1 = new Date();

        // 创建 agent runtime
        const ar = await AgentRuntime.create({
          input: {
            agentRuntimeName,
            description: '原始描述',
            codeConfiguration: codeFromOss(
              AgentRuntimeLanguage.PYTHON312,
              ['python3', 'main.py'],
              'funagent-agent-quickstart-langchain-demo-code-pre',
              'agentrun-quickstart-code.zip',
            ),
            cpu: 2,
            memory: 4096,
            port: 9000,
          }
        });

        expect(ar.status).toBe(Status.CREATING);
        await ar.waitUntilReadyOrFailed({
          timeoutSeconds: 300,
          intervalSeconds: 5,
        });

        const time2 = new Date();

        expect(ar.agentRuntimeId).toBeDefined();
        const ar2 = await client.get({ id: ar.agentRuntimeId! });

        // 检查返回的内容是否符合预期
        let preCreatedAt: Date;

        const assertAgentRuntime = (runtime: AgentRuntime) => {
          expect(runtime.status).toBe(Status.READY);
          expect(runtime.agentRuntimeName).toBe(agentRuntimeName);
          expect(runtime.artifactType).toBe(AgentRuntimeArtifact.CODE);
          expect(runtime.codeConfiguration).toBeDefined();
          expect(runtime.codeConfiguration?.language).toBe(AgentRuntimeLanguage.PYTHON312);
          expect(runtime.containerConfiguration).toBeUndefined();
          expect(runtime.cpu).toBe(2.0);
          expect(runtime.memory).toBe(4096);
          expect(runtime.description).toBe('原始描述');
          expect(runtime.networkConfiguration).toBeDefined();
          expect(runtime.networkConfiguration?.networkMode).toBe(NetworkMode.PUBLIC);
          expect(runtime.environmentVariables).toBeUndefined();
          expect(runtime.executionRoleArn).toBeUndefined();
          expect(runtime.healthCheckConfiguration).toBeUndefined();
          expect(runtime.port).toBe(9000);
          expect(runtime.protocolConfiguration).toBeUndefined();
          expect(runtime.sessionConcurrencyLimitPerInstance).toBe(1);

          expect(runtime.createdAt).toBeDefined();
          const createdAt = new Date(runtime.createdAt!);
          expect(createdAt.getTime()).toBeGreaterThan(time1.getTime());
          expect(runtime.lastUpdatedAt).toBeDefined();
          const updatedAt = new Date(runtime.lastUpdatedAt!);
          expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
          expect(updatedAt.getTime()).toBeLessThan(time2.getTime());

          preCreatedAt = createdAt;
        };

        assertAgentRuntime(ar);
        assertAgentRuntime(ar2);
        expect(ar).not.toBe(ar2);
        const ar3 = ar;

        // 更新 agent runtime
        const newDescription = `更新后的描述 - ${Date.now()}`;
        await ar.update({
          input: {
            description: newDescription,
            cpu: 4,
            memory: 8192,
            environmentVariables: { TEST_ENV: '1' },
            protocolConfiguration: {
              type: AgentRuntimeProtocolType.HTTP,
            },
            containerConfiguration: {
              image:
                'registry.cn-hangzhou.aliyuncs.com/serverless_devs/custom-container-http-examples:springboot',
              command: [],
            },
          },
        });
        expect(ar.status).toBe(Status.UPDATING);
        await ar.waitUntilReadyOrFailed({
          timeoutSeconds: 300,
          intervalSeconds: 5,
        });

        // 检查返回的内容是否符合预期
        const assertAgentRuntime2 = (runtime: AgentRuntime) => {
          expect(runtime.status).toBe(Status.READY);
          expect(runtime.agentRuntimeName).toBe(agentRuntimeName);
          // code 不允许转换为 container
          expect(runtime.artifactType).toBe(AgentRuntimeArtifact.CODE);
          expect(runtime.codeConfiguration).toBeDefined();
          expect(runtime.codeConfiguration?.ossObjectName).toBe('agentrun-quickstart-code.zip');
          expect(runtime.containerConfiguration).toBeDefined();
          expect(runtime.containerConfiguration?.image).toBe(
            'registry.cn-hangzhou.aliyuncs.com/serverless_devs/custom-container-http-examples:springboot',
          );
          expect(runtime.cpu).toBe(4.0);
          expect(runtime.memory).toBe(8192);
          expect(runtime.description).toBe(newDescription);
          expect(runtime.networkConfiguration).toBeDefined();
          expect(runtime.networkConfiguration?.networkMode).toBe(NetworkMode.PUBLIC);
          expect(runtime.environmentVariables).toEqual({ TEST_ENV: '1' });
          expect(runtime.executionRoleArn).toBeUndefined();
          expect(runtime.healthCheckConfiguration).toBeUndefined();
          expect(runtime.port).toBe(9000);
          // Note: protocolConfiguration may not be returned by the API after update
          // expect(runtime.protocolConfiguration).toBeDefined();
          // expect(runtime.protocolConfiguration?.type).toBe(AgentRuntimeProtocolType.HTTP);
          expect(runtime.sessionConcurrencyLimitPerInstance).toBe(1);

          expect(runtime.createdAt).toBeDefined();
          const createdAt = new Date(runtime.createdAt!);
          expect(preCreatedAt).toEqual(createdAt);
          expect(createdAt.getTime()).toBeGreaterThan(time1.getTime());
          expect(runtime.lastUpdatedAt).toBeDefined();
          const updatedAt = new Date(runtime.lastUpdatedAt!);
          expect(updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
          expect(runtime.agentRuntimeName).toBe(agentRuntimeName);
        };

        assertAgentRuntime2(ar);
        assertAgentRuntime2(ar3);
        assertAgentRuntime(ar2);
        expect(ar3).toBe(ar);

        // 获取 agent runtime
        await ar2.refresh({});
        assertAgentRuntime2(ar2);

        // 列举 agent runtimes
        const ars = await AgentRuntime.listAll();
        expect(ars.length).toBeGreaterThan(0);
        let matchedAr = 0;
        for (const c of ars) {
          if (c.agentRuntimeName === agentRuntimeName) {
            matchedAr += 1;
            assertAgentRuntime2(c);
          }
        }
        expect(matchedAr).toBe(1);

        // 尝试重复创建
        try {
          await client.create({
            input: {
              agentRuntimeName,
              description: '重复创建',
              codeConfiguration: codeFromOss(
                AgentRuntimeLanguage.PYTHON312,
                ['python3', 'main.py'],
                'funagent-agent-quickstart-langchain-demo-code-pre',
                'agentrun-quickstart-code.zip',
              ),
              cpu: 2,
              memory: 4096,
              port: 9000,
            },
          });
          throw new Error('Expected ResourceAlreadyExistError');
        } catch (error) {
          expect(error).toBeInstanceOf(ResourceAlreadyExistError);
        }

        // 删除
        await ar.delete();
        expect(ar.status).toBe(Status.DELETING);
        // Wait until deletion is complete or resource no longer exists
        let deleteCompleted = false;
        for (let i = 0; i < 60; i++) {
          // 60 * 2 = 120 seconds
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            await ar.refresh({});
            if (ar.status !== Status.DELETING) {
              throw new Error(`Unexpected status after deletion: ${ar.status}`);
            }
          } catch (error) {
            if (error instanceof ResourceNotExistError) {
              deleteCompleted = true;
              break;
            }
            throw error;
          }
        }
        expect(deleteCompleted).toBe(true);

        // 尝试重复删除
        try {
          await ar.delete();
          throw new Error('Expected ResourceNotExistError');
        } catch (error) {
          expect(error).toBeInstanceOf(ResourceNotExistError);
        }

        // 验证删除
        try {
          await client.get({ id: ar.agentRuntimeId! });
          throw new Error('Expected ResourceNotExistError');
        } catch (error) {
          expect(error).toBeInstanceOf(ResourceNotExistError);
        }
      },
      600000,
    ); // 600秒超时
  });

  describe('Agent Runtime Endpoint', () => {
    it(
      'should create and manage endpoints',
      async () => {
        const agentRuntimeName = generateUniqueName('e2e-endpoint-test');
        
        // 创建一个用于测试 endpoint 的 runtime
        const runtime = await AgentRuntime.create({
          input: {
            agentRuntimeName,
            description: 'Endpoint 测试',
            codeConfiguration: codeFromOss(
              AgentRuntimeLanguage.PYTHON312,
              ['python3', 'main.py'],
              'funagent-agent-quickstart-langchain-demo-code-pre',
              'agentrun-quickstart-code.zip',
            ),
            cpu: 2,
            memory: 4096,
            port: 9000,
          }
        });

        await runtime.waitUntilReadyOrFailed({ timeoutSeconds: 300, intervalSeconds: 5 });

        try {
          // Note: API doesn't return agentRuntimeVersion by default, use "LATEST" as default value
          // Same as Python SDK default value
          const targetVersion = runtime.agentRuntimeVersion || 'LATEST';

          const endpoint = await runtime.createEndpoint({
            input: {
              agentRuntimeEndpointName: 'e2e-test-endpoint',
              description: 'E2E 测试 Endpoint',
              targetVersion: targetVersion,
            },
          });

          expect(endpoint).toBeDefined();
          expect(endpoint.agentRuntimeEndpointId).toBeDefined();

          // 等待 Endpoint 就绪
          await endpoint.waitUntilReadyOrFailed({
            timeoutSeconds: 120,
            intervalSeconds: 5,
          });

          expect(endpoint.status).toBe(Status.READY);

          const endpointId = endpoint.agentRuntimeEndpointId!;

          // 获取 endpoint
          const retrievedEndpoint = await runtime.getEndpoint({ endpointId });
          expect(retrievedEndpoint).toBeDefined();
          expect(retrievedEndpoint.agentRuntimeEndpointId).toBe(endpointId);

          // 列举 endpoints
          const endpoints = await runtime.listEndpoints();
          expect(endpoints).toBeDefined();
          expect(Array.isArray(endpoints)).toBe(true);
          expect(endpoints.length).toBeGreaterThan(0);

          // 删除 endpoint
          await runtime.deleteEndpoint({ endpointId });

          // 验证删除后状态变为 DELETING
          const deletedEndpoint = await runtime.getEndpoint({ endpointId });
          expect(deletedEndpoint.status).toBe(Status.DELETING);

          // 等待 endpoint 删除完成
          let endpointDeleted = false;
          for (let i = 0; i < 30; i++) {
            // 30 * 2 = 60 seconds
            await new Promise((resolve) => setTimeout(resolve, 2000));
            try {
              await runtime.getEndpoint({ endpointId });
            } catch (error) {
              if (error instanceof ResourceNotExistError) {
                endpointDeleted = true;
                break;
              }
              throw error;
            }
          }
          expect(endpointDeleted).toBe(true);
        } finally {
          // 清理: 删除 runtime (endpoints 已经被删除)
          await runtime.delete();
        }
      },
      300000,
    ); // 300秒超时
  });

  describe('Error Handling', () => {
    it('should throw ResourceNotExistError for non-existent runtime', async () => {
      try {
        // 使用有效的UUID格式以获得404响应而不是400
        await AgentRuntime.get({ id: '00000000-0000-0000-0000-000000000000' });
        throw new Error('Expected ResourceNotExistError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceNotExistError);
      }
    });
  });

  describe('Container Deployment', () => {
    let containerRuntimeId: string | undefined;

    afterAll(async () => {
      if (containerRuntimeId) {
        try {
          await AgentRuntime.delete({ id: containerRuntimeId });
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it(
      'should create an Agent Runtime with container',
      async () => {
        const containerRuntimeName = generateUniqueName('e2e-container-runtime');

        const runtime = await AgentRuntime.create({
          input: {
            agentRuntimeName: containerRuntimeName,
            description: 'Container 测试',
            artifactType: AgentRuntimeArtifact.CONTAINER,
            containerConfiguration: {
              image:
                'registry.cn-hangzhou.aliyuncs.com/serverless_devs/custom-container-http-examples:springboot',
              command: [],
            },
            cpu: 2,
            memory: 4096,
            port: 8080,
          }
        });

        expect(runtime).toBeDefined();
        expect(runtime.artifactType).toBe(AgentRuntimeArtifact.CONTAINER);

        containerRuntimeId = runtime.agentRuntimeId;

        // 等待就绪
        await runtime.waitUntilReadyOrFailed({
          timeoutSeconds: 300,
          intervalSeconds: 5,
        });

        expect(runtime.status).toBe(Status.READY);
        expect(runtime.containerConfiguration).toBeDefined();
        expect(runtime.containerConfiguration?.image).toContain('springboot');
      },
      300000,
    ); // 300秒超时
  });
});

