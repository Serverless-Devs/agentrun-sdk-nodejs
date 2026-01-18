/**
 * Credential 模块测试
 *
 * 测试 Credential 类和 CredentialConfig 类。
 */

import { CredentialConfig, CredentialListOutput } from '../../../src/credential/model';
import { Credential } from '../../../src/credential/credential';
import { CredentialClient } from '../../../src/credential/client';
import { Config } from '../../../src/utils/config';
import { HTTPError, ResourceNotExistError } from '../../../src/utils/exception';

// Mock the CredentialClient module
jest.mock('../../../src/credential/client', () => {
  return {
    CredentialClient: jest.fn().mockImplementation(() => ({
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    })),
  };
});

const MockCredentialClient = CredentialClient as jest.MockedClass<typeof CredentialClient>;

describe('Credential Module', () => {
  describe('CredentialConfig', () => {
    describe('constructor', () => {
      it('should create empty config', () => {
        const config = new CredentialConfig();
        expect(config).toBeInstanceOf(CredentialConfig);
      });

      it('should copy data properties', () => {
        const config = new CredentialConfig({
          credentialAuthType: 'api_key',
          credentialSourceType: 'internal',
          credentialPublicConfig: { headerKey: 'Authorization' },
          credentialSecret: 'test-secret',
        });

        // Use type assertion to access properties that are set dynamically
        const configAny = config as any;
        expect(configAny.credentialAuthType).toBe('api_key');
        expect(configAny.credentialSourceType).toBe('internal');
        expect(configAny.credentialPublicConfig).toEqual({ headerKey: 'Authorization' });
        expect(configAny.credentialSecret).toBe('test-secret');
      });
    });

    describe('inboundApiKey', () => {
      it('should create API key credential config with default header', () => {
        const config = CredentialConfig.inboundApiKey({ apiKey: 'my-api-key' });
        const configAny = config as any;

        expect(configAny.credentialSourceType).toBe('internal');
        expect(configAny.credentialAuthType).toBe('api_key');
        expect(configAny.credentialPublicConfig).toEqual({ headerKey: 'Authorization' });
        expect(configAny.credentialSecret).toBe('my-api-key');
      });

      it('should create API key credential config with custom header', () => {
        const config = CredentialConfig.inboundApiKey({
          apiKey: 'my-api-key',
          headerKey: 'X-API-Key',
        });
        const configAny = config as any;

        expect(configAny.credentialPublicConfig).toEqual({ headerKey: 'X-API-Key' });
      });
    });

    describe('inboundStaticJwt', () => {
      it('should create static JWT credential config', () => {
        const jwks = '{"keys":[{"kty":"RSA"}]}';
        const config = CredentialConfig.inboundStaticJwt({ jwks });
        const configAny = config as any;

        expect(configAny.credentialSourceType).toBe('internal');
        expect(configAny.credentialAuthType).toBe('jwt');
        expect(configAny.credentialPublicConfig).toEqual({
          authType: 'static_jwks',
          jwks,
        });
        expect(configAny.credentialSecret).toBe('');
      });
    });

    describe('inboundRemoteJwt', () => {
      it('should create remote JWT credential config with defaults', () => {
        const config = CredentialConfig.inboundRemoteJwt('https://example.com/.well-known/jwks.json');
        const configAny = config as any;

        expect(configAny.credentialSourceType).toBe('internal');
        expect(configAny.credentialAuthType).toBe('jwt');
        expect(configAny.credentialPublicConfig?.uri).toBe('https://example.com/.well-known/jwks.json');
        expect(configAny.credentialPublicConfig?.timeout).toBe(3000);
        expect(configAny.credentialPublicConfig?.ttl).toBe(30000);
      });

      it('should create remote JWT credential config with custom values', () => {
        const config = CredentialConfig.inboundRemoteJwt(
          'https://example.com/.well-known/jwks.json',
          5000,
          60000,
          { issuer: 'test-issuer' }
        );
        const configAny = config as any;

        expect(configAny.credentialPublicConfig?.timeout).toBe(5000);
        expect(configAny.credentialPublicConfig?.ttl).toBe(60000);
        expect(configAny.credentialPublicConfig?.issuer).toBe('test-issuer');
      });
    });

    describe('inboundBasic', () => {
      it('should create basic auth credential config', () => {
        const users = [
          { username: 'user1', password: 'pass1' },
          { username: 'user2', password: 'pass2' },
        ];
        const config = CredentialConfig.inboundBasic({ users });
        const configAny = config as any;

        expect(configAny.credentialSourceType).toBe('internal');
        expect(configAny.credentialAuthType).toBe('basic');
        expect(configAny.credentialPublicConfig).toEqual({ users });
        expect(configAny.credentialSecret).toBe('');
      });
    });

    describe('outboundLLMApiKey', () => {
      it('should create outbound LLM API key credential config', () => {
        const config = CredentialConfig.outboundLLMApiKey({
          apiKey: 'llm-api-key',
          provider: 'openai',
        });
        const configAny = config as any;

        expect(configAny.credentialSourceType).toBe('external_llm');
        expect(configAny.credentialAuthType).toBe('api_key');
        expect(configAny.credentialPublicConfig).toEqual({ provider: 'openai' });
        expect(configAny.credentialSecret).toBe('llm-api-key');
      });
    });

    describe('outboundLLMAKSK', () => {
      it('should create outbound LLM AK/SK credential config', () => {
        const config = CredentialConfig.outboundLLMAKSK(
          'dashscope',
          'access-key-id',
          'access-key-secret',
          'account-id'
        );
        const configAny = config as any;

        expect(configAny.credentialSourceType).toBe('external_tool');
        expect(configAny.credentialAuthType).toBe('aksk');
        expect(configAny.credentialPublicConfig).toEqual({
          provider: 'dashscope',
          authConfig: {
            accessKey: 'access-key-id',
            accountId: 'account-id',
          },
        });
        expect(configAny.credentialSecret).toBe('access-key-secret');
      });
    });

    describe('outboundToolAKSKCustom', () => {
      it('should create outbound tool custom AK/SK credential config', () => {
        const authConfig = { accessKey: 'ak', secretKey: 'sk', region: 'cn-hangzhou' };
        const config = CredentialConfig.outboundToolAKSKCustom({ authConfig });
        const configAny = config as any;

        expect(configAny.credentialSourceType).toBe('external_tool');
        expect(configAny.credentialAuthType).toBe('aksk');
        expect(configAny.credentialPublicConfig).toEqual({
          provider: 'custom',
          authConfig,
        });
        expect(configAny.credentialSecret).toBe('');
      });
    });

    describe('outboundToolCustomHeader', () => {
      it('should create outbound tool custom header credential config', () => {
        const headers = { 'X-Custom-Auth': 'token123', 'X-API-Version': 'v1' };
        const config = CredentialConfig.outboundToolCustomHeader({ headers });
        const configAny = config as any;

        expect(configAny.credentialSourceType).toBe('external_tool');
        expect(configAny.credentialAuthType).toBe('custom_header');
        expect(configAny.credentialPublicConfig).toEqual({ authConfig: headers });
        expect(configAny.credentialSecret).toBe('');
      });
    });
  });

  describe('CredentialListOutput', () => {
    it('should create from data', () => {
      const data = {
        credentialId: 'cred-123',
        credentialName: 'my-credential',
        credentialAuthType: 'api_key',
        credentialSourceType: 'internal',
        enabled: true,
        relatedResourceCount: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      const output = new CredentialListOutput(data);

      expect(output.credentialId).toBe('cred-123');
      expect(output.credentialName).toBe('my-credential');
      expect(output.credentialAuthType).toBe('api_key');
      expect(output.credentialSourceType).toBe('internal');
      expect(output.enabled).toBe(true);
      expect(output.relatedResourceCount).toBe(5);
    });

    it('should handle empty data', () => {
      const output = new CredentialListOutput();

      expect(output.credentialId).toBeUndefined();
      expect(output.credentialName).toBeUndefined();
    });

    it('should convert to Credential using toCredential', async () => {
      const mockCredential = {
        credentialName: 'my-credential',
        credentialId: 'cred-123',
      };
      const mockGet = jest.fn().mockResolvedValue(mockCredential);
      // Mock the CredentialClient constructor to return a mock instance with get
      const { CredentialClient } = require('../../../src/credential/client');
      (CredentialClient as jest.Mock).mockImplementation(() => ({
        get: mockGet,
      }));

      const output = new CredentialListOutput({
        credentialName: 'my-credential',
      });

      const result = await output.toCredential();

      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-credential',
        })
      );
      expect(result).toEqual(mockCredential);
    });

    it('should convert to Credential with empty credentialName', async () => {
      const mockCredential = {
        credentialName: '',
        credentialId: 'cred-123',
      };
      const mockGet = jest.fn().mockResolvedValue(mockCredential);
      const { CredentialClient } = require('../../../src/credential/client');
      (CredentialClient as jest.Mock).mockImplementation(() => ({
        get: mockGet,
      }));

      const output = new CredentialListOutput({
        // No credentialName
      });

      await output.toCredential();

      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '', // Should use empty string when credentialName is undefined
        })
      );
    });
  });

  describe('Credential class', () => {
    let mockClientInstance: any;

    beforeEach(() => {
      jest.clearAllMocks();
      // Create a fresh mock instance for each test
      mockClientInstance = {
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
      };
      MockCredentialClient.mockImplementation(() => mockClientInstance);
    });

    describe('constructor', () => {
      it('should create credential with data', () => {
        const credential = new Credential({
          credentialName: 'test-cred',
          credentialId: 'cred-123',
          description: 'Test credential',
        });

        expect(credential.credentialName).toBe('test-cred');
        expect(credential.credentialId).toBe('cred-123');
        expect(credential.description).toBe('Test credential');
      });

      it('should create credential without data', () => {
        const credential = new Credential();
        expect(credential.credentialName).toBeUndefined();
      });
    });

    describe('static create', () => {
      it('should create credential via client', async () => {
        const mockCredential = new Credential({
          credentialName: 'new-cred',
          credentialId: 'cred-new',
        });

        mockClientInstance.create.mockResolvedValue(mockCredential);

        const result = await Credential.create({
          input: {
            credentialName: 'new-cred',
            credentialConfig: CredentialConfig.inboundApiKey({ apiKey: 'test' }),
          },
        });

        expect(mockClientInstance.create).toHaveBeenCalled();
        expect(result.credentialName).toBe('new-cred');
      });

      it('should handle backwards compatible call signature', async () => {
        const mockCredential = new Credential({
          credentialName: 'new-cred',
        });

        mockClientInstance.create.mockResolvedValue(mockCredential);

        // Old signature: Credential.create(input)
        const result = await Credential.create({
          credentialName: 'new-cred',
          credentialConfig: CredentialConfig.inboundApiKey({ apiKey: 'test' }),
        });

        expect(mockClientInstance.create).toHaveBeenCalled();
      });

      it('should handle HTTP error', async () => {
        const httpError = new HTTPError(409, 'Already exists');
        mockClientInstance.create.mockRejectedValue(httpError);

        await expect(
          Credential.create({
            input: { credentialName: 'existing-cred' },
          })
        ).rejects.toThrow();
      });

      it('should re-throw non-HTTP errors', async () => {
        const genericError = new Error('Network failure');
        mockClientInstance.create.mockRejectedValue(genericError);

        await expect(
          Credential.create({
            input: { credentialName: 'new-cred' },
          })
        ).rejects.toThrow('Network failure');
      });

      it('should handle HTTP error with undefined credentialName', async () => {
        const httpError = new HTTPError(409, 'Already exists');
        mockClientInstance.create.mockRejectedValue(httpError);

        await expect(
          Credential.create({
            input: { credentialName: undefined as any },
          })
        ).rejects.toThrow();
      });
    });

    describe('static get', () => {
      it('should get credential by name', async () => {
        const mockCredential = new Credential({
          credentialName: 'my-cred',
          credentialId: 'cred-123',
        });

        mockClientInstance.get.mockResolvedValue(mockCredential);

        const result = await Credential.get({ name: 'my-cred' });

        expect(mockClientInstance.get).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'my-cred' })
        );
        expect(result.credentialName).toBe('my-cred');
      });

      it('should handle string parameter for backwards compatibility', async () => {
        const mockCredential = new Credential({
          credentialName: 'my-cred',
        });

        mockClientInstance.get.mockResolvedValue(mockCredential);

        const result = await Credential.get('my-cred');

        expect(mockClientInstance.get).toHaveBeenCalled();
      });

      it('should handle HTTP error', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockClientInstance.get.mockRejectedValue(httpError);

        await expect(Credential.get({ name: 'missing-cred' })).rejects.toThrow();
      });

      it('should re-throw non-HTTP errors', async () => {
        const genericError = new Error('Network error');
        mockClientInstance.get.mockRejectedValue(genericError);

        await expect(Credential.get({ name: 'cred' })).rejects.toThrow('Network error');
      });
    });

    describe('static delete', () => {
      it('should delete credential by name', async () => {
        const mockCredential = new Credential({
          credentialName: 'deleted-cred',
        });

        mockClientInstance.delete.mockResolvedValue(mockCredential);

        const result = await Credential.delete({ name: 'deleted-cred' });

        expect(mockClientInstance.delete).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'deleted-cred' })
        );
      });

      it('should handle string parameter', async () => {
        const mockCredential = new Credential({
          credentialName: 'deleted-cred',
        });

        mockClientInstance.delete.mockResolvedValue(mockCredential);

        await Credential.delete('deleted-cred');

        expect(mockClientInstance.delete).toHaveBeenCalled();
      });

      it('should handle HTTP error', async () => {
        const httpError = new HTTPError(404, 'Not found');
        mockClientInstance.delete.mockRejectedValue(httpError);

        await expect(Credential.delete({ name: 'missing-cred' })).rejects.toThrow();
      });

      it('should re-throw non-HTTP errors', async () => {
        const genericError = new Error('Network failure');
        mockClientInstance.delete.mockRejectedValue(genericError);

        await expect(Credential.delete({ name: 'cred' })).rejects.toThrow('Network failure');
      });
    });

    describe('static update', () => {
      it('should update credential', async () => {
        const mockCredential = new Credential({
          credentialName: 'updated-cred',
          description: 'Updated description',
        });

        mockClientInstance.update.mockResolvedValue(mockCredential);

        const result = await Credential.update({
          name: 'updated-cred',
          input: { description: 'Updated description' },
        });

        expect(mockClientInstance.update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'updated-cred',
            input: { description: 'Updated description' },
          })
        );
      });

      it('should handle HTTP error', async () => {
        const httpError = new HTTPError(400, 'Bad request');
        mockClientInstance.update.mockRejectedValue(httpError);

        await expect(
          Credential.update({ name: 'cred', input: {} })
        ).rejects.toThrow();
      });

      it('should re-throw non-HTTP errors', async () => {
        const genericError = new Error('Update failed');
        mockClientInstance.update.mockRejectedValue(genericError);

        await expect(
          Credential.update({ name: 'cred', input: {} })
        ).rejects.toThrow('Update failed');
      });
    });

    describe('static list', () => {
      it('should list credentials', async () => {
        const mockList = [
          new CredentialListOutput({ credentialName: 'cred1' }),
          new CredentialListOutput({ credentialName: 'cred2' }),
        ];

        mockClientInstance.list.mockResolvedValue(mockList);

        const result = await Credential.list();

        expect(mockClientInstance.list).toHaveBeenCalled();
        expect(result).toHaveLength(2);
      });

      it('should list credentials with filter', async () => {
        const mockList = [
          new CredentialListOutput({ credentialName: 'api-cred' }),
        ];

        mockClientInstance.list.mockResolvedValue(mockList);

        await Credential.list({
          input: { credentialAuthType: 'api_key' },
        });

        expect(mockClientInstance.list).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({ credentialAuthType: 'api_key' }),
          })
        );
      });

      it('should handle HTTP error', async () => {
        const httpError = new HTTPError(500, 'Internal error');
        mockClientInstance.list.mockRejectedValue(httpError);

        await expect(Credential.list()).rejects.toThrow();
      });

      it('should re-throw non-HTTP errors', async () => {
        const genericError = new Error('List failed');
        mockClientInstance.list.mockRejectedValue(genericError);

        await expect(Credential.list()).rejects.toThrow('List failed');
      });
    });

    describe('static listAll', () => {
      it('should list all credentials with pagination', async () => {
        // listAll stops when returned items < pageSize (50)
        // So a single call with less than 50 items will stop pagination
        mockClientInstance.list.mockResolvedValueOnce([
          new CredentialListOutput({ credentialId: 'cred1' }),
          new CredentialListOutput({ credentialId: 'cred2' }),
        ]);

        const result = await Credential.listAll();

        expect(mockClientInstance.list).toHaveBeenCalledTimes(1);
        expect(result).toHaveLength(2);
      });

      it('should deduplicate results by credentialId', async () => {
        // Single page with duplicate names
        mockClientInstance.list.mockResolvedValueOnce([
          new CredentialListOutput({ credentialId: 'cred1' }),
          new CredentialListOutput({ credentialId: 'cred1' }), // Duplicate
          new CredentialListOutput({ credentialId: 'cred2' }),
        ]);

        const result = await Credential.listAll();

        expect(result).toHaveLength(2);
        expect(result.map((c) => c.credentialId)).toEqual(['cred1', 'cred2']);
      });

      it('should support input and config options', async () => {
        mockClientInstance.list.mockResolvedValue([]);

        await Credential.listAll({
          input: { credentialAuthType: 'api_key' },
          config: { region: 'cn-shanghai' } as any,
        });

        expect(mockClientInstance.list).toHaveBeenCalled();
      });

      it('should handle undefined credentialId in deduplication', async () => {
        // Items with undefined credentialId
        mockClientInstance.list.mockResolvedValueOnce([
          new CredentialListOutput({ credentialId: undefined as any }),
          new CredentialListOutput({ credentialId: '' }),
          new CredentialListOutput({ credentialId: 'cred1' }),
        ]);

        const result = await Credential.listAll();

        // undefined and '' both map to '' for deduplication, so they should be deduplicated
        expect(result).toHaveLength(1); // '' (from undefined) deduplicated with '', plus 'cred1'
      });
    });

    describe('instance methods', () => {
      describe('delete', () => {
        it('should delete this credential', async () => {
          const mockResult = new Credential({ credentialName: 'my-cred' });
          mockClientInstance.delete.mockResolvedValue(mockResult);

          const credential = new Credential({
            credentialName: 'my-cred',
            credentialId: 'cred-123',
          });

          const result = await credential.delete();

          expect(mockClientInstance.delete).toHaveBeenCalled();
          expect(result).toBe(credential);
        });

        it('should throw error if credentialName is not set', async () => {
          const credential = new Credential();

          await expect(credential.delete()).rejects.toThrow(
            'credentialName is required to delete a Credential'
          );
        });
      });

      describe('update', () => {
        it('should update this credential', async () => {
          const mockResult = new Credential({
            credentialName: 'my-cred',
            description: 'New description',
          });
          mockClientInstance.update.mockResolvedValue(mockResult);

          const credential = new Credential({
            credentialName: 'my-cred',
            description: 'Old description',
          });

          const result = await credential.update({
            input: { description: 'New description' },
          });

          expect(mockClientInstance.update).toHaveBeenCalled();
          expect(result.description).toBe('New description');
        });

        it('should handle backwards compatible call signature', async () => {
          const mockResult = new Credential({
            credentialName: 'my-cred',
            description: 'New description',
          });
          mockClientInstance.update.mockResolvedValue(mockResult);

          const credential = new Credential({ credentialName: 'my-cred' });

          // Old signature: credential.update(updateInput)
          await credential.update({ description: 'New description' });

          expect(mockClientInstance.update).toHaveBeenCalled();
        });

        it('should throw error if credentialName is not set', async () => {
          const credential = new Credential();

          await expect(
            credential.update({ input: { description: 'test' } })
          ).rejects.toThrow('credentialName is required to update a Credential');
        });
      });

      describe('get (refresh)', () => {
        it('should refresh credential data', async () => {
          const mockResult = new Credential({
            credentialName: 'my-cred',
            enabled: true,
          });
          mockClientInstance.get.mockResolvedValue(mockResult);

          const credential = new Credential({
            credentialName: 'my-cred',
            enabled: false,
          });

          const result = await credential.get();

          expect(mockClientInstance.get).toHaveBeenCalled();
          expect(result.enabled).toBe(true);
        });

        it('should throw error if credentialName is not set', async () => {
          const credential = new Credential();

          await expect(credential.get()).rejects.toThrow(
            'credentialName is required to refresh a Credential'
          );
        });
      });
    });
  });
});
