import { ToolSetClient } from '../../../src/toolset/client';
import { Config } from '../../../src/utils/config';
import { HTTPError, ResourceNotExistError } from '../../../src/utils/exception';
import { ToolSet } from '../../../src/toolset/toolset';

const createToolset = jest.fn();
const deleteToolset = jest.fn();
const updateToolset = jest.fn();
const getToolset = jest.fn();
const listToolsets = jest.fn();

jest.mock('../../../src/toolset/api', () => ({
  ToolControlAPI: jest.fn().mockImplementation(() => ({
    createToolset: (...args: any[]) => createToolset(...args),
    deleteToolset: (...args: any[]) => deleteToolset(...args),
    updateToolset: (...args: any[]) => updateToolset(...args),
    getToolset: (...args: any[]) => getToolset(...args),
    listToolsets: (...args: any[]) => listToolsets(...args),
  })),
}));

describe('ToolSetClient', () => {
  beforeEach(() => {
    createToolset.mockReset();
    deleteToolset.mockReset();
    updateToolset.mockReset();
    getToolset.mockReset();
    listToolsets.mockReset();
  });

  test('get merges config and wraps response', async () => {
    const baseConfig = new Config({ accountId: '1', regionId: 'cn-hz' });
    const overrideConfig = new Config({ accountId: '2', regionId: 'cn-sh' });
    const mergedConfig = new Config({
      accountId: 'merged',
      regionId: 'cn-beijing',
    });

    const withConfigsSpy = jest.spyOn(Config, 'withConfigs').mockReturnValue(mergedConfig);

    getToolset.mockResolvedValue({ name: 'tool' });

    const client = new ToolSetClient(baseConfig);
    const result = await client.get({ name: 'tool', config: overrideConfig });

    expect(withConfigsSpy).toHaveBeenCalledWith(baseConfig, overrideConfig);
    expect(getToolset).toHaveBeenCalledWith({ name: 'tool', config: mergedConfig });
    expect(result).toBeInstanceOf(ToolSet);
  });

  test('list maps results to ToolSet and handles empty data', async () => {
    const client = new ToolSetClient();

    listToolsets.mockResolvedValueOnce({ data: [{ name: 't1' }, { name: 't2' }] });
    const results = await client.list();
    expect(results).toHaveLength(2);
    expect(results[0]).toBeInstanceOf(ToolSet);

    listToolsets.mockResolvedValueOnce({ data: undefined });
    const empty = await client.list();
    expect(empty).toEqual([]);
  });

  describe('error handling', () => {
    test('create should convert HTTPError to ResourceError', async () => {
      const client = new ToolSetClient();
      const httpError = new HTTPError(404, 'Not found');

      createToolset.mockRejectedValue(httpError);

      await expect(client.create({ input: { name: 'test-toolset' } })).rejects.toThrow(
        ResourceNotExistError
      );
    });

    test('create should rethrow non-HTTPError', async () => {
      const client = new ToolSetClient();
      const genericError = new Error('Network error');

      createToolset.mockRejectedValue(genericError);

      await expect(client.create({ input: { name: 'test-toolset' } })).rejects.toThrow(
        'Network error'
      );
    });

    test('delete should convert HTTPError to ResourceError', async () => {
      const client = new ToolSetClient();
      const httpError = new HTTPError(404, 'Not found');

      deleteToolset.mockRejectedValue(httpError);

      await expect(client.delete({ name: 'test-toolset' })).rejects.toThrow(ResourceNotExistError);
    });

    test('delete should rethrow non-HTTPError', async () => {
      const client = new ToolSetClient();
      const genericError = new Error('Network error');

      deleteToolset.mockRejectedValue(genericError);

      await expect(client.delete({ name: 'test-toolset' })).rejects.toThrow('Network error');
    });

    test('update should convert HTTPError to ResourceError', async () => {
      const client = new ToolSetClient();
      const httpError = new HTTPError(404, 'Not found');

      updateToolset.mockRejectedValue(httpError);

      await expect(
        client.update({ name: 'test-toolset', input: { description: 'updated' } })
      ).rejects.toThrow(ResourceNotExistError);
    });

    test('update should rethrow non-HTTPError', async () => {
      const client = new ToolSetClient();
      const genericError = new Error('Network error');

      updateToolset.mockRejectedValue(genericError);

      await expect(
        client.update({ name: 'test-toolset', input: { description: 'updated' } })
      ).rejects.toThrow('Network error');
    });

    test('get should convert HTTPError to ResourceError', async () => {
      const client = new ToolSetClient();
      const httpError = new HTTPError(404, 'Not found');

      getToolset.mockRejectedValue(httpError);

      await expect(client.get({ name: 'test-toolset' })).rejects.toThrow(ResourceNotExistError);
    });

    test('get should rethrow non-HTTPError', async () => {
      const client = new ToolSetClient();
      const genericError = new Error('Network error');

      getToolset.mockRejectedValue(genericError);

      await expect(client.get({ name: 'test-toolset' })).rejects.toThrow('Network error');
    });
  });
});
