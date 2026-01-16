

import { ToolSet, ToolSetClient, ToolSetSchemaType } from '@/toolset';
import {
  ResourceAlreadyExistError,
  ResourceNotExistError,
} from '@/utils/exception';
import { logger } from '@/utils/log';

describe('test toolset', () => {
  it('test lifecycle', async () => {
    const toolsetName = `e2e-toolset-${Date.now()}`;
    logger.info('Testing toolset lifecycle for:', toolsetName);

    const client = new ToolSetClient();

    // 创建 ToolSet
    const toolset = await ToolSet.create({
      input: {
        name: toolsetName,
        description: '原始描述 / Original description',
        spec: {
          schema: {
            type: ToolSetSchemaType.OPENAPI,
            detail: 'https://petstore3.swagger.io/api/v3/openapi.json',
          },
          authConfig: {
            type: 'None',
          },
        },
      },
    });

    expect(toolset.name).toEqual(toolsetName);
    expect(toolset.description).toEqual('原始描述 / Original description');
    expect(toolset.uid).toBeTruthy();

    // 等待就绪
    await toolset.waitUntilReady({
      beforeCheck: (t) => logger.info(`Current status: ${t.status?.status}`),
    });

    expect(toolset.isReady).toBe(true);

    // 获取 ToolSet
    const toolset2 = await client.get({ name: toolsetName });
    expect(toolset2.name).toEqual(toolsetName);
    expect(toolset2.uid).toEqual(toolset.uid);

    // 更新描述
    const newDescription = `更新后的描述 / Updated description - ${Date.now()}`;
    await toolset.update({
      input: {
        description: newDescription,
      }
    });

    await toolset.waitUntilReady();
    expect(toolset.isReady).toBe(true);
    expect(toolset.description).toEqual(newDescription);

    // 列举
    const toolsets = await ToolSet.listAll();
    expect(toolsets.length).toBeGreaterThan(0);
    const matched = toolsets.filter((t) => t.name === toolsetName);
    expect(matched.length).toBe(1);

    // 测试重复创建
    expect(async () => {
      await client.createToolSet({
        input: {
          name: toolsetName,
          description: '重复创建',
          spec: {
            schema: {
              type: ToolSetSchemaType.OPENAPI,
              detail: 'https://petstore3.swagger.io/api/v3/openapi.json',
            },
          },
        },
      });
    }).toThrow(ResourceAlreadyExistError);

    // 删除
    await toolset.delete();

    // 验证删除
    expect(async () => {
      await client.get({ name: toolsetName });
    }).toThrow(ResourceNotExistError);
  }, 600000); // 10 minutes timeout
});
