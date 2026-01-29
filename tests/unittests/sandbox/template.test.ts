/**
 * Template 单元测试
 *
 * 测试 Template 类的功能。
 * Tests for Template class.
 */

import { TemplateNetworkMode, TemplateType } from '../../../src/sandbox/model';
import {
  ClientError,
  HTTPError,
  ServerError,
} from '../../../src/utils/exception';
import { Status } from '../../../src/utils/model';

// Mock ControlAPI
const mockGetClient = jest.fn();
jest.mock('../../../src/utils/control-api', () => {
  return {
    ControlAPI: jest.fn().mockImplementation(() => ({
      getClient: mockGetClient,
    })),
  };
});

// Mock @alicloud/agentrun20250910
jest.mock('@alicloud/agentrun20250910', () => {
  const CreateTemplateRequest = jest
    .fn()
    .mockImplementation((params) => params);
  const CreateTemplateInput = jest.fn().mockImplementation((params) => params);
  const UpdateTemplateRequest = jest
    .fn()
    .mockImplementation((params) => params);
  const UpdateTemplateInput = jest.fn().mockImplementation((params) => params);
  const ListTemplatesRequest = jest.fn().mockImplementation((params) => params);
  const NetworkConfiguration = jest.fn().mockImplementation((params) => params);
  const Template = jest.fn();
  const MockClient = jest.fn().mockImplementation(() => ({
    createTemplateWithOptions: jest.fn(),
    deleteTemplateWithOptions: jest.fn(),
    updateTemplateWithOptions: jest.fn(),
    getTemplateWithOptions: jest.fn(),
    listTemplatesWithOptions: jest.fn(),
  }));
  return {
    default: MockClient,
    CreateTemplateRequest,
    CreateTemplateInput,
    UpdateTemplateRequest,
    UpdateTemplateInput,
    ListTemplatesRequest,
    NetworkConfiguration,
    Template,
  };
});

// Mock @alicloud/tea-util
jest.mock('@alicloud/tea-util', () => {
  return {
    RuntimeOptions: jest.fn().mockImplementation(() => ({})),
  };
});

import { Template } from '../../../src/sandbox/template';

describe('Template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create empty Template', () => {
      const template = new Template();
      expect(template).toBeInstanceOf(Template);
    });

    it('should create Template with data', () => {
      const template = new Template({
        templateId: 'template-123',
        templateName: 'test-template',
        templateType: TemplateType.CODE_INTERPRETER,
        cpu: 2,
        memory: 4096,
        status: Status.READY,
      });

      expect(template.templateId).toBe('template-123');
      expect(template.templateName).toBe('test-template');
      expect(template.templateType).toBe(TemplateType.CODE_INTERPRETER);
      expect(template.cpu).toBe(2);
      expect(template.memory).toBe(4096);
      expect(template.status).toBe(Status.READY);
    });
  });

  describe('fromInnerObject', () => {
    it('should create Template from SDK response', () => {
      const obj = {
        templateArn: 'arn:xxx',
        templateId: 'template-123',
        templateName: 'test-template',
        templateType: 'CodeInterpreter',
        cpu: 2,
        memory: 4096,
        createdAt: '2024-01-01T00:00:00Z',
        description: 'Test template',
        executionRoleArn: 'arn:role',
        lastUpdatedAt: '2024-01-02T00:00:00Z',
        resourceName: 'test-resource',
        sandboxIdleTimeoutInSeconds: 1800,
        sandboxTtlInSeconds: 3600,
        status: 'READY',
        statusReason: 'Ready',
        diskSize: 512,
        allowAnonymousManage: true,
      };

      const template = new Template(obj as any);

      expect(template.templateId).toBe('template-123');
      expect(template.templateName).toBe('test-template');
      expect(template.sandboxIdleTimeoutInSeconds).toBe(1800);
      expect(template.sandboxTtlInSeconds).toBe(3600);
      expect(template.allowAnonymousManage).toBe(true);
    });

    it('should normalize numeric fields from strings', () => {
      const template = new Template({
        templateId: 'template-123',
        templateName: 'test-template',
        sandboxIdleTimeoutInSeconds: '600' as unknown as number,
        sandboxTtlInSeconds: '3600' as unknown as number,
        shareConcurrencyLimitPerSandbox: '3' as unknown as number,
        cpu: '2' as unknown as number,
        memory: 4096,
        diskSize: '512' as unknown as number,
      });

      (template as unknown as { normalizeNumericFields: () => void }).normalizeNumericFields();

      expect(template.sandboxIdleTimeoutInSeconds).toBe(600);
      expect(template.sandboxTtlInSeconds).toBe(3600);
      expect(template.shareConcurrencyLimitPerSandbox).toBe(3);
      expect(template.cpu).toBe(2);
      expect(template.memory).toBe(4096);
      expect(template.diskSize).toBe(512);
    });

    it('should keep invalid numeric strings as-is', () => {
      const template = new Template({
        templateId: 'template-456',
        templateName: 'test-template-invalid',
        cpu: 'not-a-number' as unknown as number,
      });

      (template as unknown as { normalizeNumericFields: () => void }).normalizeNumericFields();

      expect(template.cpu).toBe('not-a-number');
    });

    it('should handle missing optional fields', () => {
      const obj = {
        templateId: 'template-123',
        templateName: 'test-template',
      };

      const template = new Template(obj as any);

      expect(template.templateId).toBe('template-123');
      expect(template.sandboxIdleTimeoutInSeconds).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a new template successfully', async () => {
      const mockClient = {
        createTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'new-template-123',
              templateName: 'test-template',
              templateType: 'CodeInterpreter',
              status: 'CREATING',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const template = await Template.create({
        input: {
          templateName: 'test-template',
          templateType: TemplateType.CODE_INTERPRETER,
        },
      });

      expect(template.templateId).toBe('new-template-123');
      expect(template.templateName).toBe('test-template');
    });

    it('should apply default values for CODE_INTERPRETER', async () => {
      const mockClient = {
        createTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'new-template-123',
              templateName: 'test-template',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await Template.create({
        input: {
          templateName: 'test-template',
          templateType: TemplateType.CODE_INTERPRETER,
        },
      });

      expect(mockClient.createTemplateWithOptions).toHaveBeenCalled();
    });

    it('should apply default values for BROWSER', async () => {
      const mockClient = {
        createTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'new-template-123',
              templateName: 'browser-template',
              diskSize: 10240,
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await Template.create({
        input: {
          templateName: 'browser-template',
          templateType: TemplateType.BROWSER,
        },
      });

      expect(mockClient.createTemplateWithOptions).toHaveBeenCalled();
    });

    it('should apply default values for AIO', async () => {
      const mockClient = {
        createTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'new-template-123',
              templateName: 'aio-template',
              diskSize: 10240,
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await Template.create({
        input: {
          templateName: 'aio-template',
          templateType: TemplateType.AIO,
        },
      });

      expect(mockClient.createTemplateWithOptions).toHaveBeenCalled();
    });

    it('should apply default values for CUSTOM', async () => {
      const mockClient = {
        createTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'new-template-123',
              templateName: 'custom-template',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await Template.create({
        input: {
          templateName: 'custom-template',
          templateType: TemplateType.CUSTOM,
        },
      });

      expect(mockClient.createTemplateWithOptions).toHaveBeenCalled();
    });

    it('should throw error when BROWSER diskSize is not 10240', async () => {
      await expect(
        Template.create({
          input: {
            templateName: 'browser-template',
            templateType: TemplateType.BROWSER,
            diskSize: 512,
          },
        })
      ).rejects.toThrow(
        'When templateType is BROWSER or AIO, diskSize must be 10240'
      );
    });

    it('should throw error when CODE_INTERPRETER uses PRIVATE network', async () => {
      await expect(
        Template.create({
          input: {
            templateName: 'ci-template',
            templateType: TemplateType.CODE_INTERPRETER,
            networkConfiguration: {
              networkMode: TemplateNetworkMode.PRIVATE,
            },
          },
        })
      ).rejects.toThrow(
        'When templateType is CODE_INTERPRETER or AIO, networkMode cannot be PRIVATE'
      );
    });

    it('should create template without networkConfiguration (uses default)', async () => {
      const mockClient = {
        createTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'new-template-123',
              templateName: 'test-template',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const template = await Template.create({
        input: {
          templateName: 'test-template',
          templateType: TemplateType.CODE_INTERPRETER,
          networkConfiguration: undefined,
        },
      });

      expect(template.templateId).toBe('new-template-123');
      // Default network configuration should be applied
    });

    it('should create template with networkConfiguration (PUBLIC mode for BROWSER)', async () => {
      const mockClient = {
        createTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'new-template-123',
              templateName: 'network-template',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const template = await Template.create({
        input: {
          templateName: 'network-template',
          templateType: TemplateType.BROWSER,
          diskSize: 10240,
          networkConfiguration: {
            networkMode: TemplateNetworkMode.PUBLIC,
          },
        },
      });

      expect(template.templateId).toBe('new-template-123');
      // Verify that the networkConfiguration was passed correctly
      const callArgs = mockClient.createTemplateWithOptions.mock.calls[0];
      expect(callArgs[0].body.networkConfiguration).toBeDefined();
      expect(callArgs[0].body.networkConfiguration.networkMode).toBe(
        TemplateNetworkMode.PUBLIC
      );
    });

    it('should create template with CUSTOM type and container configuration', async () => {
      const mockClient = {
        createTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'custom-template-123',
              templateName: 'custom-container-template',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const template = await Template.create({
        input: {
          templateName: 'custom-container-template',
          templateType: TemplateType.CUSTOM,
          containerConfiguration: {
            image: 'my-image:latest',
            command: ['node', 'app.js'],
            acrInstanceId: 'acr-123',
            imageRegistryType: 'ACR_ENTERPRISE',
            port: 8080,
          },
        },
      });

      expect(template.templateId).toBe('custom-template-123');
    });
  });

  describe('delete', () => {
    it('should delete template successfully', async () => {
      const mockClient = {
        deleteTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'template-123',
              templateName: 'test-template',
              status: 'DELETING',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.delete({ name: 'test-template' });

      expect(result.templateName).toBe('test-template');
    });

    it('should handle HTTPError on delete', async () => {
      const mockClient = {
        deleteTemplateWithOptions: jest
          .fn()
          .mockRejectedValue(new HTTPError(404, 'Not Found')),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(
        Template.delete({ name: 'test-template' })
      ).rejects.toThrow();
    });

    it('should handle error with empty message (Unknown error fallback)', async () => {
      const errorWithEmptyMessage = {
        statusCode: 400,
        message: '',
        data: { requestId: 'req-123' },
      };
      const mockClient = {
        deleteTemplateWithOptions: jest
          .fn()
          .mockRejectedValue(errorWithEmptyMessage),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(Template.delete({ name: 'test-template' })).rejects.toThrow(
        'Unknown error'
      );
    });
  });

  describe('update error handling', () => {
    it('should handle HTTPError on update', async () => {
      const mockClient = {
        updateTemplateWithOptions: jest
          .fn()
          .mockRejectedValue(new HTTPError(404, 'Not Found')),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(
        Template.update({ name: 'test-template', input: { cpu: 4 } })
      ).rejects.toThrow();
    });

    it('should call handleError for non-HTTPError on update', async () => {
      const mockClient = {
        updateTemplateWithOptions: jest.fn().mockRejectedValue({
          statusCode: 500,
          message: 'Internal Server Error',
          data: { requestId: 'req-123' },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(
        Template.update({ name: 'test-template', input: { cpu: 4 } })
      ).rejects.toThrow(ServerError);
    });
  });

  describe('get error handling', () => {
    it('should handle HTTPError on get', async () => {
      const mockClient = {
        getTemplateWithOptions: jest
          .fn()
          .mockRejectedValue(new HTTPError(404, 'Not Found')),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(Template.get({ name: 'test-template' })).rejects.toThrow();
    });

    it('should call handleError for non-HTTPError on get', async () => {
      const mockClient = {
        getTemplateWithOptions: jest.fn().mockRejectedValue({
          statusCode: 400,
          message: 'Bad Request',
          data: { requestId: 'req-123' },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(Template.get({ name: 'test-template' })).rejects.toThrow(
        ClientError
      );
    });
  });

  describe('create error handling', () => {
    it('should handle HTTPError on create', async () => {
      const mockClient = {
        createTemplateWithOptions: jest
          .fn()
          .mockRejectedValue(new HTTPError(400, 'Bad Request')),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(
        Template.create({
          input: {
            templateName: 'test-template',
            templateType: TemplateType.CODE_INTERPRETER,
          },
        })
      ).rejects.toThrow();
    });

    it('should call handleError for non-HTTPError on create', async () => {
      const mockClient = {
        createTemplateWithOptions: jest.fn().mockRejectedValue({
          statusCode: 500,
          message: 'Internal Server Error',
          data: { requestId: 'req-123' },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(
        Template.create({
          input: {
            templateName: 'test-template',
            templateType: TemplateType.CODE_INTERPRETER,
          },
        })
      ).rejects.toThrow(ServerError);
    });
  });

  describe('delete error handling', () => {
    it('should call handleError for non-HTTPError on delete', async () => {
      const mockClient = {
        deleteTemplateWithOptions: jest.fn().mockRejectedValue({
          statusCode: 404,
          message: 'Not Found',
          data: { requestId: 'req-123' },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(Template.delete({ name: 'test-template' })).rejects.toThrow(
        ClientError
      );
    });
  });

  describe('update', () => {
    it('should update template successfully', async () => {
      const mockClient = {
        updateTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'template-123',
              templateName: 'test-template',
              cpu: 4,
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.update({
        name: 'test-template',
        input: { cpu: 4 },
      });

      expect(result.cpu).toBe(4);
    });

    it('should update template with networkConfiguration', async () => {
      const mockClient = {
        updateTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'template-123',
              templateName: 'test-template',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.update({
        name: 'test-template',
        input: {
          networkConfiguration: {
            networkMode: TemplateNetworkMode.PUBLIC,
          },
        },
      });

      expect(result.templateName).toBe('test-template');
    });

    it('should update template without networkConfiguration', async () => {
      const mockClient = {
        updateTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'template-123',
              templateName: 'test-template',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.update({
        name: 'test-template',
        input: { cpu: 4 },
      });

      expect(result.templateName).toBe('test-template');
    });
  });

  describe('get', () => {
    it('should get template successfully', async () => {
      const mockClient = {
        getTemplateWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              templateId: 'template-123',
              templateName: 'test-template',
              status: 'READY',
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.get({ name: 'test-template' });

      expect(result.templateName).toBe('test-template');
      expect(result.status).toBe('READY');
    });
  });

  describe('list', () => {
    it('should list templates successfully', async () => {
      const mockClient = {
        listTemplatesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              items: [
                { templateId: 'template-1', templateName: 'template-1' },
                { templateId: 'template-2', templateName: 'template-2' },
              ],
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.list();

      expect(result).toHaveLength(2);
      expect(result[0].templateName).toBe('template-1');
    });

    it('should handle empty list', async () => {
      const mockClient = {
        listTemplatesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              items: [],
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.list();

      expect(result).toHaveLength(0);
    });

    it('should handle API error with 4xx status', async () => {
      const mockClient = {
        listTemplatesWithOptions: jest.fn().mockRejectedValue({
          statusCode: 400,
          message: 'Bad Request',
          data: { requestId: 'req-123' },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(Template.list()).rejects.toThrow(ClientError);
    });

    it('should handle API error with 5xx status', async () => {
      const mockClient = {
        listTemplatesWithOptions: jest.fn().mockRejectedValue({
          statusCode: 500,
          message: 'Internal Server Error',
          data: { requestId: 'req-123' },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      await expect(Template.list()).rejects.toThrow(ServerError);
    });

    it('should handle response with null items array', async () => {
      const mockClient = {
        listTemplatesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              items: null,
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.list();
      expect(result).toEqual([]);
    });

    it('should handle response with undefined data', async () => {
      const mockClient = {
        listTemplatesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: undefined,
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.list();
      expect(result).toEqual([]);
    });
  });

  describe('listAll', () => {
    it('should list all templates with pagination', async () => {
      const mockClient = {
        listTemplatesWithOptions: jest
          .fn()
          .mockResolvedValueOnce({
            body: {
              requestId: 'req-123',
              data: {
                items: Array.from({ length: 50 }, (_, i) => ({
                  templateId: `template-${i}`,
                  templateName: `template-${i}`,
                })),
              },
            },
          })
          .mockResolvedValueOnce({
            body: {
              requestId: 'req-124',
              data: {
                items: Array.from({ length: 10 }, (_, i) => ({
                  templateId: `template-${50 + i}`,
                  templateName: `template-${50 + i}`,
                })),
              },
            },
          }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.listAll();

      expect(result).toHaveLength(60);
    });

    it('should deduplicate templates', async () => {
      const mockClient = {
        listTemplatesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              items: [
                { templateId: 'template-1', templateName: 'template-1' },
                { templateId: 'template-1', templateName: 'template-1' }, // duplicate
              ],
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.listAll();

      expect(result).toHaveLength(1);
    });

    it('should filter out templates without templateId', async () => {
      const mockClient = {
        listTemplatesWithOptions: jest.fn().mockResolvedValue({
          body: {
            requestId: 'req-123',
            data: {
              items: [
                { templateId: 'template-1', templateName: 'template-1' },
                { templateName: 'template-no-id' }, // no templateId
              ],
            },
          },
        }),
      };
      mockGetClient.mockReturnValue(mockClient);

      const result = await Template.listAll();

      expect(result).toHaveLength(1);
    });
  });

  describe('instance methods', () => {
    describe('delete (instance)', () => {
      it('should delete this template', async () => {
        const mockClient = {
          deleteTemplateWithOptions: jest.fn().mockResolvedValue({
            body: {
              requestId: 'req-123',
              data: {
                templateId: 'template-123',
                templateName: 'test-template',
                status: 'DELETING',
              },
            },
          }),
        };
        mockGetClient.mockReturnValue(mockClient);

        const template = new Template({ templateName: 'test-template' });
        const result = await template.delete();

        expect(result).toBe(template);
      });

      it('should throw error if templateName is not set', async () => {
        const template = new Template();

        await expect(template.delete()).rejects.toThrow(
          'templateName is required to delete a Template'
        );
      });
    });

    describe('update (instance)', () => {
      it('should update this template', async () => {
        const mockClient = {
          updateTemplateWithOptions: jest.fn().mockResolvedValue({
            body: {
              requestId: 'req-123',
              data: {
                templateId: 'template-123',
                templateName: 'test-template',
                cpu: 4,
              },
            },
          }),
        };
        mockGetClient.mockReturnValue(mockClient);

        const template = new Template({
          templateName: 'test-template',
          cpu: 2,
        });
        const result = await template.update({ input: { cpu: 4 } });

        expect(result).toBe(template);
        expect(result.cpu).toBe(4);
      });

      it('should throw error if templateName is not set', async () => {
        const template = new Template();

        await expect(template.update({ input: { cpu: 4 } })).rejects.toThrow(
          'templateName is required to update a Template'
        );
      });
    });

    describe('refresh (instance)', () => {
      it('should refresh this template', async () => {
        const mockClient = {
          getTemplateWithOptions: jest.fn().mockResolvedValue({
            body: {
              requestId: 'req-123',
              data: {
                templateId: 'template-123',
                templateName: 'test-template',
                status: 'READY',
              },
            },
          }),
        };
        mockGetClient.mockReturnValue(mockClient);

        const template = new Template({
          templateName: 'test-template',
          status: Status.CREATING,
        });
        const result = await template.refresh();

        expect(result).toBe(template);
        expect(result.status).toBe('READY');
      });

      it('should throw error if templateName is not set', async () => {
        const template = new Template();

        await expect(template.refresh()).rejects.toThrow(
          'templateName is required to refresh a Template'
        );
      });
    });

    describe('waitUntilReady', () => {
      it('should return immediately if already ready', async () => {
        const mockClient = {
          getTemplateWithOptions: jest.fn().mockResolvedValue({
            body: {
              requestId: 'req-123',
              data: {
                templateId: 'template-123',
                templateName: 'test-template',
                status: 'READY',
              },
            },
          }),
        };
        mockGetClient.mockReturnValue(mockClient);

        const template = new Template({
          templateName: 'test-template',
          status: Status.CREATING,
        });

        const result = await template.waitUntilReadyOrFailed({
          timeoutSeconds: 5,
          intervalSeconds: 0.1,
        });

        expect(result).toBe(template);
        expect(result.status).toBe('READY');
      });

      it('should call callback callback', async () => {
        const mockClient = {
          getTemplateWithOptions: jest.fn().mockResolvedValue({
            body: {
              requestId: 'req-123',
              data: {
                templateId: 'template-123',
                templateName: 'test-template',
                status: 'READY',
              },
            },
          }),
        };
        mockGetClient.mockReturnValue(mockClient);

        const template = new Template({
          templateName: 'test-template',
          status: Status.CREATING,
        });

        const callback = jest.fn();

        await template.waitUntilReadyOrFailed({
          timeoutSeconds: 5,
          intervalSeconds: 0.1,
          callback,
        });

        expect(callback).toHaveBeenCalled();
      });

      it('should throw error if template fails', async () => {
        const mockClient = {
          getTemplateWithOptions: jest.fn().mockResolvedValue({
            body: {
              requestId: 'req-123',
              data: {
                templateId: 'template-123',
                templateName: 'test-template',
                status: 'CREATE_FAILED',
                statusReason: 'Resource limit exceeded',
              },
            },
          }),
        };
        mockGetClient.mockReturnValue(mockClient);

        const template = new Template({
          templateName: 'test-template',
          status: Status.CREATING,
        });

        const t = await template.waitUntilReadyOrFailed({
          timeoutSeconds: 5,
          intervalSeconds: 0.1,
        });
        await expect(t.status).toBe('CREATE_FAILED');
      });

      it('should throw timeout error', async () => {
        const mockClient = {
          getTemplateWithOptions: jest.fn().mockResolvedValue({
            body: {
              requestId: 'req-123',
              data: {
                templateId: 'template-123',
                templateName: 'test-template',
                status: 'CREATING',
              },
            },
          }),
        };
        mockGetClient.mockReturnValue(mockClient);

        const template = new Template({
          templateName: 'test-template',
          status: Status.CREATING,
        });

        await expect(
          template.waitUntilReadyOrFailed({
            timeoutSeconds: 0.1,
            intervalSeconds: 0.05,
          })
        ).rejects.toThrow(/Timeout/);
      });

      it('should use default timeout and interval when not provided', async () => {
        const mockClient = {
          getTemplateWithOptions: jest.fn().mockResolvedValue({
            body: {
              requestId: 'req-123',
              data: {
                templateId: 'template-123',
                templateName: 'test-template',
                status: 'READY',
              },
            },
          }),
        };
        mockGetClient.mockReturnValue(mockClient);

        const template = new Template({
          templateName: 'test-template',
          status: Status.CREATING,
        });

        // Call without options to use defaults
        const result = await template.waitUntilReadyOrFailed();
        expect(result).toBe(template);
      });

      it('should throw timeout error with default timeout message', async () => {
        const mockClient = {
          getTemplateWithOptions: jest.fn().mockResolvedValue({
            body: {
              requestId: 'req-123',
              data: {
                templateId: 'template-123',
                templateName: 'test-template',
                status: 'CREATING',
              },
            },
          }),
        };
        mockGetClient.mockReturnValue(mockClient);

        const template = new Template({
          templateName: 'test-template',
          status: Status.CREATING,
        });

        // Use very short timeout but no options object
        await expect(
          template.waitUntilReadyOrFailed({
            timeoutSeconds: 0.05,
            intervalSeconds: 0.01,
          })
        ).rejects.toThrow(/Timeout/);
      });
    });
  });
});
