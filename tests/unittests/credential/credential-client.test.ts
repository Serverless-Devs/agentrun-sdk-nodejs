import { CredentialClient } from '../../../src/credential/client';
import { Config } from '../../../src/utils/config';
import {
  HTTPError,
  ResourceNotExistError,
} from '../../../src/utils/exception';
import { CredentialControlAPI } from '../../../src/credential/api/control';

jest.mock('@alicloud/agentrun20250910', () => ({
  CreateCredentialInput: jest.fn().mockImplementation((input) => input),
  UpdateCredentialInput: jest.fn().mockImplementation((input) => input),
  ListCredentialsRequest: jest.fn().mockImplementation((input) => input),
}));

jest.mock('../../../src/credential/api/control', () => ({
  CredentialControlAPI: jest.fn().mockImplementation(() => ({
    createCredential: jest.fn(),
    deleteCredential: jest.fn(),
    updateCredential: jest.fn(),
    getCredential: jest.fn(),
    listCredentials: jest.fn(),
  })),
}));

describe('CredentialClient', () => {
  const MockControlAPI = CredentialControlAPI as jest.MockedClass<
    typeof CredentialControlAPI
  >;

  beforeEach(() => {
    MockControlAPI.mockClear();
  });

  it('should normalize credentialConfig and add users for create', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.createCredential.mockResolvedValue({
      credentialName: 'cred-name',
    });

    const input = {
      credentialName: 'cred-name',
      credentialConfig: {
        authType: 'api_key',
        sourceType: 'internal',
        publicConfig: { headerKey: 'Authorization' },
        secret: 'secret',
      },
    };

    await client.create({ input });

    expect(controlApi.createCredential).toHaveBeenCalledWith({
      input: expect.objectContaining({
        credentialName: 'cred-name',
        credentialAuthType: 'api_key',
        credentialSourceType: 'internal',
        credentialPublicConfig: {
          headerKey: 'Authorization',
          users: [],
        },
        credentialSecret: 'secret',
      }),
      config: expect.any(Config),
    });
  });

  it('should convert basic auth with username into users array', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.createCredential.mockResolvedValue({
      credentialName: 'basic-cred',
    });

    const input = {
      credentialName: 'basic-cred',
      credentialConfig: {
        authType: 'basic',
        publicConfig: { username: 'user1' },
        secret: 'pass1',
      },
    };

    await client.create({ input });

    expect(controlApi.createCredential).toHaveBeenCalledWith({
      input: expect.objectContaining({
        credentialAuthType: 'basic',
        credentialPublicConfig: {
          users: [
            {
              username: 'user1',
              password: 'pass1',
            },
          ],
        },
        credentialSecret: '',
      }),
      config: expect.any(Config),
    });
  });

  it('should default basic auth password to empty when secret missing', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.createCredential.mockResolvedValue({
      credentialName: 'basic-empty-secret',
    });

    const input = {
      credentialName: 'basic-empty-secret',
      credentialConfig: {
        authType: 'basic',
        publicConfig: { username: 'user-empty' },
      },
    };

    await client.create({ input });

    expect(controlApi.createCredential).toHaveBeenCalledWith({
      input: expect.objectContaining({
        credentialAuthType: 'basic',
        credentialPublicConfig: {
          users: [
            {
              username: 'user-empty',
              password: '',
            },
          ],
        },
        credentialSecret: '',
      }),
      config: expect.any(Config),
    });
  });

  it('should keep basic auth without publicConfig for create', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.createCredential.mockResolvedValue({
      credentialName: 'basic-no-public',
    });

    const input = {
      credentialName: 'basic-no-public',
      credentialConfig: {
        authType: 'basic',
      },
    };

    await client.create({ input });

    expect(controlApi.createCredential).toHaveBeenCalledWith({
      input: expect.objectContaining({
        credentialAuthType: 'basic',
        credentialPublicConfig: undefined,
      }),
      config: expect.any(Config),
    });
  });

  it('should normalize credentialConfig for update', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.updateCredential.mockResolvedValue({
      credentialName: 'cred-name',
    });

    await client.update({
      name: 'cred-name',
      input: {
        credentialConfig: {
          credentialAuthType: 'basic',
          credentialPublicConfig: { username: 'user2' },
          credentialSecret: 'pass2',
        },
      },
    });

    expect(controlApi.updateCredential).toHaveBeenCalledWith({
      credentialName: 'cred-name',
      input: expect.objectContaining({
        credentialAuthType: 'basic',
        credentialPublicConfig: {
          users: [
            {
              username: 'user2',
              password: 'pass2',
            },
          ],
        },
        credentialSecret: '',
      }),
      config: expect.any(Config),
    });
  });

  it('should normalize update using authType and empty secret for basic', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.updateCredential.mockResolvedValue({
      credentialName: 'basic-update',
    });

    await client.update({
      name: 'basic-update',
      input: {
        credentialConfig: {
          authType: 'basic',
          publicConfig: { username: 'user-basic' },
        },
      },
    });

    expect(controlApi.updateCredential).toHaveBeenCalledWith({
      credentialName: 'basic-update',
      input: expect.objectContaining({
        credentialAuthType: 'basic',
        credentialPublicConfig: {
          users: [
            {
              username: 'user-basic',
              password: '',
            },
          ],
        },
        credentialSecret: '',
      }),
      config: expect.any(Config),
    });
  });

  it('should keep basic update without publicConfig', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.updateCredential.mockResolvedValue({
      credentialName: 'basic-update-no-public',
    });

    await client.update({
      name: 'basic-update-no-public',
      input: {
        credentialConfig: {
          authType: 'basic',
        },
      },
    });

    expect(controlApi.updateCredential).toHaveBeenCalledWith({
      credentialName: 'basic-update-no-public',
      input: expect.objectContaining({
        credentialAuthType: 'basic',
        credentialPublicConfig: undefined,
      }),
      config: expect.any(Config),
    });
  });

  it('should return empty list when no items', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.listCredentials.mockResolvedValue({ items: undefined });

    const result = await client.list();
    expect(result).toEqual([]);
  });

  it('should map list items to CredentialListOutput', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.listCredentials.mockResolvedValue({
      items: [
        {
          credentialName: 'cred-1',
        },
      ],
    });

    const result = await client.list();
    expect(result[0].credentialName).toBe('cred-1');
  });

  it('should wrap HTTPError for create', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.createCredential.mockRejectedValue(
      new HTTPError(404, 'not found')
    );

    await expect(
      client.create({
        input: {
          credentialName: 'missing',
          credentialConfig: {
            authType: 'api_key',
            sourceType: 'internal',
            publicConfig: { headerKey: 'Authorization', users: [] },
            secret: 'secret',
          },
        },
      })
    ).rejects.toBeInstanceOf(ResourceNotExistError);
  });

  it('should rethrow non-HTTPError for create', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.createCredential.mockRejectedValue(new Error('boom'));

    await expect(
      client.create({
        input: {
          credentialName: 'cred-name',
          credentialConfig: {
            authType: 'api_key',
            sourceType: 'internal',
            publicConfig: { headerKey: 'Authorization', users: [] },
            secret: 'secret',
          },
        },
      })
    ).rejects.toThrow('boom');
  });

  it('should delete and get credentials with provided names', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.deleteCredential.mockResolvedValue({
      credentialName: 'cred-name',
    });
    controlApi.getCredential.mockResolvedValue({
      credentialName: 'cred-name',
    });

    const deleted = await client.delete({ name: 'cred-name' });
    const fetched = await client.get({ name: 'cred-name' });

    expect(deleted.credentialName).toBe('cred-name');
    expect(fetched.credentialName).toBe('cred-name');
    expect(controlApi.deleteCredential).toHaveBeenCalledWith({
      credentialName: 'cred-name',
      config: expect.any(Config),
    });
    expect(controlApi.getCredential).toHaveBeenCalledWith({
      credentialName: 'cred-name',
      config: expect.any(Config),
    });
  });

  it('should rethrow non-HTTPError for delete', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.deleteCredential.mockRejectedValue(new Error('boom'));

    await expect(client.delete({ name: 'cred-name' })).rejects.toThrow('boom');
  });

  it('should wrap HTTPError for delete', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.deleteCredential.mockRejectedValue(
      new HTTPError(404, 'not found')
    );

    await expect(client.delete({ name: 'missing' })).rejects.toBeInstanceOf(
      ResourceNotExistError
    );
  });

  it('should rethrow non-HTTPError for update', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.updateCredential.mockRejectedValue(new Error('boom'));

    await expect(
      client.update({
        name: 'cred-name',
        input: {
          credentialConfig: {
            credentialAuthType: 'api_key',
          },
        },
      })
    ).rejects.toThrow('boom');
  });

  it('should wrap HTTPError for update', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.updateCredential.mockRejectedValue(
      new HTTPError(404, 'not found')
    );

    await expect(
      client.update({
        name: 'missing',
        input: {
          credentialConfig: {
            credentialAuthType: 'api_key',
          },
        },
      })
    ).rejects.toBeInstanceOf(ResourceNotExistError);
  });

  it('should rethrow non-HTTPError for get', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.getCredential.mockRejectedValue(new Error('boom'));

    await expect(client.get({ name: 'cred-name' })).rejects.toThrow('boom');
  });

  it('should wrap HTTPError for get', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.getCredential.mockRejectedValue(
      new HTTPError(404, 'not found')
    );

    await expect(client.get({ name: 'missing' })).rejects.toBeInstanceOf(
      ResourceNotExistError
    );
  });

  it('should rethrow non-HTTPError for list', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.listCredentials.mockRejectedValue(new Error('boom'));

    await expect(client.list()).rejects.toThrow('boom');
  });

  it('should wrap HTTPError for list', async () => {
    const client = new CredentialClient(new Config());
    const controlApi = MockControlAPI.mock.results[0].value as any;

    controlApi.listCredentials.mockRejectedValue(
      new HTTPError(404, 'not found')
    );

    await expect(client.list()).rejects.toBeInstanceOf(ResourceNotExistError);
  });
});
