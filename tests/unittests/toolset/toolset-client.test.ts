/**
 * ToolSet Client 测试
 */

import { ToolSetClient } from '../../../src/toolset/client';
import { ToolSetSchemaType } from '../../../src/toolset/model';
import { Config } from '../../../src/utils/config';

describe('ToolSetClient', () => {
  beforeEach(() => {
    process.env.AGENTRUN_ACCESS_KEY_ID = 'test-key';
    process.env.AGENTRUN_ACCESS_KEY_SECRET = 'test-secret';
    process.env.AGENTRUN_REGION = 'cn-hangzhou';
    process.env.AGENTRUN_ACCOUNT_ID = '123456';
  });

  it('should create toolset with auth config', async () => {
    const client = new ToolSetClient(new Config());
    const controlApi = (client as any).controlApi;
    controlApi.createToolset = jest.fn().mockResolvedValue({ name: 'new-toolset' } as any);
    const result = await client.create({
      input: {
        name: 'new-toolset',
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

    expect(controlApi.createToolset).toHaveBeenCalled();
    expect(result.name).toBe('new-toolset');
  });

  it('should update toolset with schema only', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.updateToolset = jest.fn().mockResolvedValue({ name: 'schema-toolset' } as any);
    const result = await client.update({
      name: 'schema-toolset',
      input: {
        spec: {
          schema: {
            type: ToolSetSchemaType.OPENAPI,
            detail: 'https://api.example.com/v2/openapi.json',
          },
        },
      },
    });

    expect(controlApi.updateToolset).toHaveBeenCalled();
    expect(result.name).toBe('schema-toolset');
  });

  it('should delete toolset', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.deleteToolset = jest.fn().mockResolvedValue({ name: 'deleted-toolset' } as any);
    const result = await client.delete({ name: 'deleted-toolset' });

    expect(controlApi.deleteToolset).toHaveBeenCalled();
    expect(result.name).toBe('deleted-toolset');
  });

  it('should get toolset', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.getToolset = jest.fn().mockResolvedValue({ name: 'my-toolset' } as any);
    const result = await client.get({ name: 'my-toolset' });

    expect(controlApi.getToolset).toHaveBeenCalled();
    expect(result.name).toBe('my-toolset');
  });

  it('should list toolsets', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.listToolsets = jest.fn().mockResolvedValue({
      data: [{ name: 'toolset-1' }, { name: 'toolset-2' }],
    } as any);
    const result = await client.list();

    expect(controlApi.listToolsets).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  // 分支覆盖测试：无 authConfig 的情况
  it('should create toolset without auth config', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.createToolset = jest.fn().mockResolvedValue({ name: 'no-auth-toolset' } as any);
    const result = await client.create({
      input: {
        name: 'no-auth-toolset',
        spec: {
          schema: {
            type: ToolSetSchemaType.OPENAPI,
            detail: 'https://api.example.com/openapi.json',
          },
        },
      },
    });

    expect(controlApi.createToolset).toHaveBeenCalled();
    expect(result.name).toBe('no-auth-toolset');
  });

  // 分支覆盖测试：无 spec 的情况
  it('should create toolset without spec', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.createToolset = jest.fn().mockResolvedValue({ name: 'no-spec-toolset' } as any);
    const result = await client.create({
      input: {
        name: 'no-spec-toolset',
      },
    });

    expect(controlApi.createToolset).toHaveBeenCalled();
    expect(result.name).toBe('no-spec-toolset');
  });

  // 分支覆盖测试：spec 存在但 schema 不存在
  it('should create toolset with spec but without schema', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.createToolset = jest.fn().mockResolvedValue({ name: 'no-schema-toolset' } as any);
    const result = await client.create({
      input: {
        name: 'no-schema-toolset',
        spec: {
          authConfig: {
            type: 'API_KEY',
            apiKeyHeaderName: 'X-API-Key',
            apiKeyValue: 'secret',
          },
        },
      },
    });

    expect(controlApi.createToolset).toHaveBeenCalled();
    expect(result.name).toBe('no-schema-toolset');
  });

  // 分支覆盖测试：update 时带 authConfig
  it('should update toolset with auth config', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.updateToolset = jest.fn().mockResolvedValue({ name: 'auth-updated-toolset' } as any);
    const result = await client.update({
      name: 'auth-updated-toolset',
      input: {
        spec: {
          schema: {
            type: ToolSetSchemaType.OPENAPI,
            detail: 'https://api.example.com/v2/openapi.json',
          },
          authConfig: {
            type: 'API_KEY',
            apiKeyHeaderName: 'X-API-Key',
            apiKeyValue: 'new-secret',
          },
        },
      },
    });

    expect(controlApi.updateToolset).toHaveBeenCalled();
    expect(result.name).toBe('auth-updated-toolset');
  });

  // 分支覆盖测试：update 时无 spec
  it('should update toolset without spec', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.updateToolset = jest.fn().mockResolvedValue({ name: 'no-spec-update' } as any);
    const result = await client.update({
      name: 'no-spec-update',
      input: {
        description: 'Updated description',
      },
    });

    expect(controlApi.updateToolset).toHaveBeenCalled();
    expect(result.name).toBe('no-spec-update');
  });

  // 分支覆盖测试：update 时 spec 存在但 schema 不存在
  it('should update toolset with spec but without schema', async () => {
    const client = new ToolSetClient();
    const controlApi = (client as any).controlApi;
    controlApi.updateToolset = jest.fn().mockResolvedValue({ name: 'no-schema-update' } as any);
    const result = await client.update({
      name: 'no-schema-update',
      input: {
        spec: {
          authConfig: {
            type: 'API_KEY',
            apiKeyHeaderName: 'X-API-Key',
            apiKeyValue: 'secret',
          },
        },
      },
    });

    expect(controlApi.updateToolset).toHaveBeenCalled();
    expect(result.name).toBe('no-schema-update');
  });
});
