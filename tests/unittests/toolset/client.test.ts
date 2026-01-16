import { ToolSetClient } from '../../../src/toolset/client';
import { Config } from '../../../src/utils/config';
import { ToolSet } from '../../../src/toolset/toolset';

const getToolset = jest.fn();
const listToolsets = jest.fn();

jest.mock('../../../src/toolset/api', () => ({
  ToolControlAPI: jest.fn().mockImplementation(() => ({
    getToolset: (...args: any[]) => getToolset(...args),
    listToolsets: (...args: any[]) => listToolsets(...args),
  })),
}));

describe('ToolSetClient', () => {
  beforeEach(() => {
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

    const withConfigsSpy = jest
      .spyOn(Config, 'withConfigs')
      .mockReturnValue(mergedConfig);

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
});