import { Credential, CredentialClient, CredentialConfig } from '@/credential';
import { ResourceAlreadyExistError, ResourceNotExistError } from '@/utils/exception';
import { logger } from '@/utils/log';

describe('test credential', () => {
  it('test lifecycle', async () => {
    const credentialName = `e2e-cred-${Date.now()}`;
    logger.info('Testing credential lifecycle for:', credentialName);

    const client = new CredentialClient();

    const time1 = new Date();

    // 创建 credential
    const cred = await Credential.create({
      input: {
        credentialName,
        description: '原始描述',
        credentialConfig: CredentialConfig.inboundApiKey({ apiKey: 'sk-test-e2e-123456' }),
      },
    });

    const cred2 = await client.get({ name: credentialName });

    // 检查返回的内容是否符合预期
    let preCreatedAt = new Date();

    const assertCred = (cred: Credential) => {
      expect(cred.status).toBeUndefined();
      expect(cred.credentialAuthType).toEqual('api_key');
      expect(cred.credentialSourceType).toEqual('internal');
      expect(cred.credentialPublicConfig).toBeDefined();
      expect(cred.credentialPublicConfig?.['headerKey']).toEqual('Authorization');
      expect(cred.credentialPublicConfig?.['users']).toEqual([]);
      expect(cred.credentialSecret).toEqual('sk-test-e2e-123456');
      expect(typeof cred.credentialId).toEqual('string');
      expect(cred.credentialId).not.toEqual('');
      expect(cred.createdAt).toBeDefined();
      const createdAt = new Date(cred.createdAt!);
      expect(createdAt.getTime()).toBeGreaterThan(time1.getTime());
      expect(cred.updatedAt).toBeDefined();
      const updatedAt = new Date(cred.updatedAt!);
      expect(updatedAt.getTime()).toEqual(createdAt.getTime());
      expect(cred.credentialName).toEqual(credentialName);
      expect(cred.description).toEqual('原始描述');
      expect(cred.enabled).toBe(true);

      preCreatedAt = createdAt;
    };

    assertCred(cred);
    assertCred(cred2);
    expect(cred).not.toBe(cred2);
    const cred3 = cred;

    // 更新 credential
    const newDescription = `更新后的描述 - ${Date.now()}`;
    await cred.update({
      description: newDescription,
      enabled: false,
      credentialConfig: CredentialConfig.inboundApiKey({ apiKey: 'sk-test-654321' }),
    });

    // 检查返回的内容是否符合预期
    const assertCred2 = (cred: Credential) => {
      expect(cred.status).toBeUndefined();
      expect(cred.credentialAuthType).toEqual('api_key');
      expect(cred.credentialSourceType).toEqual('internal');
      expect(cred.credentialPublicConfig).toBeDefined();
      expect(cred.credentialPublicConfig?.['headerKey']).toEqual('Authorization');
      expect(cred.credentialPublicConfig?.['users']).toEqual([]);
      expect(cred.credentialSecret).toEqual('sk-test-654321');
      expect(typeof cred.credentialId).toEqual('string');
      expect(cred.credentialId).not.toEqual('');
      expect(cred.createdAt).toBeDefined();
      const createdAt = new Date(cred.createdAt!);
      expect(preCreatedAt.getTime()).toEqual(createdAt.getTime());
      expect(createdAt.getTime()).toBeGreaterThan(time1.getTime());
      expect(cred.updatedAt).toBeDefined();
      const updatedAt = new Date(cred.updatedAt!);
      expect(updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
      expect(cred.credentialName).toEqual(credentialName);
      expect(cred.description).toEqual(newDescription);
      expect(cred.enabled).toBe(false);
    };

    assertCred2(cred);
    assertCred2(cred3);
    assertCred(cred2);
    expect(cred3).toBe(cred);

    // 获取 credential
    await cred2.get();
    assertCred2(cred2);

    // 列举 credentials
    const credentials = await Credential.listAll();
    expect(credentials.length).toBeGreaterThan(0);
    let matchedCred = 0;
    for (const c of credentials) {
      if (c.credentialName === credentialName) {
        matchedCred++;
        // 从列表输出转换为完整 Credential 对象
        const fullCred = await c.toCredential();
        assertCred2(fullCred);
      }
    }
    expect(matchedCred).toBe(1);

    // 尝试重复创建
    await expect(
      client.create({
        input: {
          credentialName,
          description: '重复的凭证',
          credentialConfig: CredentialConfig.inboundApiKey({ apiKey: 'sk-test-duplicate' }),
        },
      })
    ).rejects.toThrow(ResourceAlreadyExistError);

    // 删除
    await cred.delete();

    // 尝试重复删除
    await expect(cred.delete()).rejects.toThrow(ResourceNotExistError);

    // 验证删除
    await expect(client.get({ name: credentialName })).rejects.toThrow(ResourceNotExistError);
  });
});
