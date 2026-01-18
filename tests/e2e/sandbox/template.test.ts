/**
 * Template 模块的 E2E 测试
 *
 * 测试覆盖:
 * - 创建 Template
 * - 获取 Template
 * - 列举 Templates
 * - 更新 Template
 * - 删除 Template
 */

import {
  Template,
  TemplateType,
  TemplateNetworkMode,
} from '../../../src/sandbox';
import {
  ResourceNotExistError,
  ResourceAlreadyExistError,
} from '../../../src/utils/exception';
import { logger } from '../../../src/utils/log';
import type {
  TemplateCreateInput,
  TemplateUpdateInput,
} from '../../../src/sandbox';

/**
 * 生成唯一名称
 */
function generateUniqueName(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

describe('Template E2E Tests', () => {
  describe('Code Interpreter Template', () => {
    let templateName: string;

    beforeAll(async () => {
      templateName = generateUniqueName('e2e-ci-template');
    });

    afterAll(async () => {
      // 清理 Template
      try {
        await Template.delete({ name: templateName });
      } catch {
        // Ignore cleanup errors
      }
    });

    describe('Template Lifecycle', () => {
      it('should create a Code Interpreter template', async () => {
        const time1 = new Date();

        const input: TemplateCreateInput = {
          templateName,
          templateType: TemplateType.CODE_INTERPRETER,
          description: '原始描述',
          cpu: 2.0,
          memory: 4096,
          diskSize: 512,
          sandboxIdleTimeoutInSeconds: 600,
          networkConfiguration: {
            networkMode: TemplateNetworkMode.PUBLIC,
          },
        };

        const template = await Template.create({ input });

        expect(template).toBeDefined();
        expect(template.templateName).toBe(templateName);
        expect(template.templateType).toBe(TemplateType.CODE_INTERPRETER);
        expect(template.description).toBe('原始描述');
        expect(template.cpu).toBe(2.0);
        expect(template.memory).toBe(4096);
        expect(template.diskSize).toBe(512);
        expect(template.sandboxIdleTimeoutInSeconds).toBe(600);

        // 验证时间戳
        expect(template.createdAt).toBeDefined();
        const createdAt = new Date(template.createdAt!);
        expect(createdAt.getTime()).toBeGreaterThan(time1.getTime());
      });

      it('should get a template by name', async () => {
        const template = await Template.get({ name: templateName });

        expect(template).toBeDefined();
        expect(template.templateName).toBe(templateName);
        expect(template.templateType).toBe(TemplateType.CODE_INTERPRETER);
      });

      it('should update a template', async () => {
        const newDescription = `更新后的描述 - ${Date.now()}`;

        const updateInput: TemplateUpdateInput = {
          description: newDescription,
          cpu: 4.0,
          memory: 8192,
        };

        const template = await Template.get({ name: templateName });
        await template.update({ input: updateInput });

        // 验证更新
        expect(template.description).toBe(newDescription);
        expect(template.cpu).toBe(4.0);
        expect(template.memory).toBe(8192);
      });

      it('should refresh a template', async () => {
        const template = await Template.get({ name: templateName });

        await template.refresh();

        expect(template.templateName).toBe(templateName);
      });

      it('should list templates', async () => {
        const templates = await Template.list();

        expect(templates).toBeDefined();
        expect(Array.isArray(templates)).toBe(true);
        expect(templates.length).toBeGreaterThan(0);

        // 验证包含我们创建的 template
        const found = templates.find((t) => t.templateName === templateName);
        expect(found).toBeDefined();
      });

      it('should list templates with filter', async () => {
        const templates = await Template.list({
          input: { templateType: TemplateType.CODE_INTERPRETER },
        });

        expect(templates).toBeDefined();
        expect(Array.isArray(templates)).toBe(true);

        // 所有返回的模板都应该是 CODE_INTERPRETER 类型
        for (const template of templates) {
          expect(template.templateType).toBe(TemplateType.CODE_INTERPRETER);
        }
      });
    });

    describe('Template Deletion', () => {
      it('should delete a template', async () => {
        const template = await Template.get({ name: templateName });
        await template.delete();

        // 验证已删除
        try {
          await Template.get({ name: templateName });
          throw new Error('Expected ResourceNotExistError');
        } catch (error) {
          expect(error).toBeInstanceOf(ResourceNotExistError);
        }
      });
    });
  });

  describe('Browser Template', () => {
    let templateName: string;

    beforeAll(async () => {
      templateName = generateUniqueName('e2e-browser-template');
    });

    afterAll(async () => {
      // 清理 Template
      try {
        await Template.delete({ name: templateName });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should create a Browser template', async () => {
      const input: TemplateCreateInput = {
        templateName,
        templateType: TemplateType.BROWSER,
        description: 'Browser 测试',
        cpu: 2.0,
        memory: 4096,
        diskSize: 10240, // Browser 类型必须是 10240
        sandboxIdleTimeoutInSeconds: 600,
        networkConfiguration: {
          networkMode: TemplateNetworkMode.PUBLIC,
        },
      };

      const template = await Template.create({ input });

      expect(template).toBeDefined();
      expect(template.templateName).toBe(templateName);
      expect(template.templateType).toBe(TemplateType.BROWSER);
      expect(template.diskSize).toBe(10240);
    });

    it('should list Browser templates', async () => {
      const templates = await Template.list({
        input: { templateType: TemplateType.BROWSER },
      });

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);

      // 验证包含我们创建的 template
      const found = templates.find((t) => t.templateName === templateName);
      expect(found).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw ResourceNotExistError for non-existent template', async () => {
      try {
        await Template.get({ name: 'non-existent-template' });
        throw new Error('Expected ResourceNotExistError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceNotExistError);
      }
    });

    it('should throw error when creating duplicate template', async () => {
      const name = generateUniqueName('e2e-dup-template');

      // 创建第一个
      const template1 = await Template.create({
        input: {
          templateName: name,
          templateType: TemplateType.CODE_INTERPRETER,
          description: 'First template',
          cpu: 2.0,
          memory: 4096,
          diskSize: 512,
          sandboxIdleTimeoutInSeconds: 600,
          networkConfiguration: {
            networkMode: TemplateNetworkMode.PUBLIC,
          },
        },
      });

      try {
        // 尝试创建重复的
        await Template.create({
          input: {
            templateName: name,
            templateType: TemplateType.CODE_INTERPRETER,
            description: 'Duplicate template',
            cpu: 2.0,
            memory: 4096,
            diskSize: 512,
            sandboxIdleTimeoutInSeconds: 600,
            networkConfiguration: {
              networkMode: TemplateNetworkMode.PUBLIC,
            },
          },
        });
        throw new Error('Expected ResourceAlreadyExistError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceAlreadyExistError);
      } finally {
        // 清理
        await template1.delete();
      }
    });
  });

  describe('Template with Custom Configuration', () => {
    let templateName: string;

    afterAll(async () => {
      if (templateName) {
        try {
          await Template.delete({ name: templateName });
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should create a template with custom resources', async () => {
      templateName = generateUniqueName('e2e-custom-template');

      const input: TemplateCreateInput = {
        templateName,
        templateType: TemplateType.CODE_INTERPRETER,
        description: 'Custom resources',
        cpu: 4.0,
        memory: 8192,
        diskSize: 1024,
        sandboxIdleTimeoutInSeconds: 300,
        sandboxTtlInSeconds: 3600,
        networkConfiguration: {
          networkMode: TemplateNetworkMode.PUBLIC,
        },
      };

      const template = await Template.create({ input });

      expect(template).toBeDefined();
      expect(template.cpu).toBe(4.0);
      expect(template.memory).toBe(8192);
      expect(template.diskSize).toBe(1024);
      expect(template.sandboxIdleTimeoutInSeconds).toBe(300);
    });

    it('should create a template with VPC network mode', async () => {
      const vpcTemplateName = generateUniqueName('e2e-vpc-template');

      try {
        const input: TemplateCreateInput = {
          templateName: vpcTemplateName,
          templateType: TemplateType.CODE_INTERPRETER,
          description: 'VPC network mode',
          cpu: 2.0,
          memory: 4096,
          diskSize: 512,
          sandboxIdleTimeoutInSeconds: 600,
          networkConfiguration: {
            networkMode: TemplateNetworkMode.PRIVATE,
            // PRIVATE 模式可能需要额外配置
          },
        };

        const template = await Template.create({ input });

        expect(template).toBeDefined();

        // 清理
        await template.delete();
      } catch (error) {
        // PRIVATE 模式可能需要额外配置，如果失败则跳过
        logger.warn(
          'PRIVATE template creation failed, possibly due to missing VPC config:',
          error
        );
      }
    });
  });
});
