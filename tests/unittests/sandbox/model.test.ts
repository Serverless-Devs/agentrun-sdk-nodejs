/**
 * Sandbox Model 单元测试
 *
 * 测试 Sandbox 模块的数据模型。
 * Tests for Sandbox module data models.
 */

import {
  TemplateType,
  SandboxState,
  TemplateNetworkMode,
  TemplateOSSPermission,
  CodeLanguage,
} from '../../../src/sandbox/model';

import type {
  TemplateContainerConfiguration,
  TemplateCreateInput,
} from '../../../src/sandbox/model';

describe('Sandbox Model', () => {
  describe('TemplateType enum', () => {
    it('should have CODE_INTERPRETER value', () => {
      expect(TemplateType.CODE_INTERPRETER).toBe('CodeInterpreter');
    });

    it('should have BROWSER value', () => {
      expect(TemplateType.BROWSER).toBe('Browser');
    });

    it('should have AIO value', () => {
      expect(TemplateType.AIO).toBe('AllInOne');
    });

    it('should have CUSTOM value', () => {
      expect(TemplateType.CUSTOM).toBe('CustomImage');
    });

    it('should have exactly 4 values', () => {
      const values = Object.values(TemplateType);
      expect(values).toHaveLength(4);
      expect(values).toContain('CodeInterpreter');
      expect(values).toContain('Browser');
      expect(values).toContain('AllInOne');
      expect(values).toContain('CustomImage');
    });
  });

  describe('SandboxState enum', () => {
    it('should have CREATING value', () => {
      expect(SandboxState.CREATING).toBe('Creating');
    });

    it('should have RUNNING value', () => {
      expect(SandboxState.RUNNING).toBe('Running');
    });

    it('should have READY value', () => {
      expect(SandboxState.READY).toBe('READY');
    });

    it('should have STOPPED value', () => {
      expect(SandboxState.STOPPED).toBe('Stopped');
    });

    it('should have FAILED value', () => {
      expect(SandboxState.FAILED).toBe('Failed');
    });

    it('should have DELETING value', () => {
      expect(SandboxState.DELETING).toBe('Deleting');
    });
  });

  describe('TemplateNetworkMode enum', () => {
    it('should have PUBLIC value', () => {
      expect(TemplateNetworkMode.PUBLIC).toBe('PUBLIC');
    });

    it('should have PRIVATE value', () => {
      expect(TemplateNetworkMode.PRIVATE).toBe('PRIVATE');
    });

    it('should have PUBLIC_AND_PRIVATE value', () => {
      expect(TemplateNetworkMode.PUBLIC_AND_PRIVATE).toBe('PUBLIC_AND_PRIVATE');
    });
  });

  describe('TemplateOSSPermission enum', () => {
    it('should have READ_WRITE value', () => {
      expect(TemplateOSSPermission.READ_WRITE).toBe('READ_WRITE');
    });

    it('should have READ_ONLY value', () => {
      expect(TemplateOSSPermission.READ_ONLY).toBe('READ_ONLY');
    });
  });

  describe('CodeLanguage enum', () => {
    it('should have PYTHON value', () => {
      expect(CodeLanguage.PYTHON).toBe('python');
    });
  });

  describe('TemplateContainerConfiguration interface', () => {
    it('should allow image and command fields', () => {
      const config: TemplateContainerConfiguration = {
        image: 'registry.example.com/my-image:latest',
        command: ['python', '-m', 'http.server', '8080'],
      };

      expect(config.image).toBe('registry.example.com/my-image:latest');
      expect(config.command).toEqual(['python', '-m', 'http.server', '8080']);
    });

    it('should allow new acrInstanceId field', () => {
      const config: TemplateContainerConfiguration = {
        image: 'registry.example.com/my-image:latest',
        acrInstanceId: 'cri-abc123',
      };

      expect(config.acrInstanceId).toBe('cri-abc123');
    });

    it('should allow new imageRegistryType field', () => {
      const config: TemplateContainerConfiguration = {
        image: 'registry.example.com/my-image:latest',
        imageRegistryType: 'ACR',
      };

      expect(config.imageRegistryType).toBe('ACR');
    });

    it('should allow new port field', () => {
      const config: TemplateContainerConfiguration = {
        image: 'registry.example.com/my-image:latest',
        port: 8080,
      };

      expect(config.port).toBe(8080);
    });

    it('should allow all new fields together', () => {
      const config: TemplateContainerConfiguration = {
        image: 'registry.example.com/my-image:latest',
        command: ['node', 'app.js'],
        acrInstanceId: 'cri-abc123',
        imageRegistryType: 'ACR_ENTERPRISE',
        port: 3000,
      };

      expect(config.image).toBe('registry.example.com/my-image:latest');
      expect(config.command).toEqual(['node', 'app.js']);
      expect(config.acrInstanceId).toBe('cri-abc123');
      expect(config.imageRegistryType).toBe('ACR_ENTERPRISE');
      expect(config.port).toBe(3000);
    });

    it('should allow empty config', () => {
      const config: TemplateContainerConfiguration = {};

      expect(config.image).toBeUndefined();
      expect(config.command).toBeUndefined();
      expect(config.acrInstanceId).toBeUndefined();
      expect(config.imageRegistryType).toBeUndefined();
      expect(config.port).toBeUndefined();
    });
  });

  describe('TemplateCreateInput interface', () => {
    it('should allow CUSTOM templateType', () => {
      const input: TemplateCreateInput = {
        templateName: 'my-custom-template',
        templateType: TemplateType.CUSTOM,
        containerConfiguration: {
          image: 'registry.example.com/my-image:latest',
          command: ['python', 'app.py'],
          port: 8080,
        },
      };

      expect(input.templateType).toBe(TemplateType.CUSTOM);
      expect(input.containerConfiguration?.port).toBe(8080);
    });

    it('should allow all template types', () => {
      const types = [
        TemplateType.CODE_INTERPRETER,
        TemplateType.BROWSER,
        TemplateType.AIO,
        TemplateType.CUSTOM,
      ];

      types.forEach(templateType => {
        const input: TemplateCreateInput = {
          templateName: `template-${templateType}`,
          templateType,
        };
        expect(input.templateType).toBe(templateType);
      });
    });
  });
});
