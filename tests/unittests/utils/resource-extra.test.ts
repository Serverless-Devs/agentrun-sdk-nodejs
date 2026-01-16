import { ResourceBase, listAllResourcesFunction } from '../../../src/utils/resource';
import { ResourceNotExistError } from '../../../src/utils/exception';
import { Status } from '../../../src/utils/model';

class DummyResource extends ResourceBase {
  delete = jest.fn();
  get = jest.fn();
}

describe('ResourceBase deleteAndWaitUntilFinished extra branches', () => {
  test('returns immediately when delete throws ResourceNotExistError', async () => {
    const resource = new DummyResource();
    (resource.delete as jest.Mock).mockRejectedValue(
      new ResourceNotExistError('type', 'id')
    );
    resource.waitUntil = jest.fn();

    await expect(resource.deleteAndWaitUntilFinished()).resolves.toBeUndefined();
    expect(resource.waitUntil).not.toHaveBeenCalled();
  });

  test('treats refresh ResourceNotExistError as completion', async () => {
    const resource = new DummyResource();
    resource.status = Status.CREATING;
    resource.refresh = jest
      .fn()
      .mockRejectedValue(new ResourceNotExistError('type', 'id'));

    const waitUntil = jest.fn(async ({ checkFinishedCallback }) => {
      const finished = await checkFinishedCallback(resource);
      expect(finished).toBe(true);
      return resource;
    });

    resource.waitUntil = waitUntil as any;

    await resource.deleteAndWaitUntilFinished({ callback: jest.fn() });
    expect(waitUntil).toHaveBeenCalled();
  });

  test('continues when status is deleting', async () => {
    const resource = new DummyResource();
    resource.status = Status.DELETING;
    resource.refresh = jest.fn().mockResolvedValue(undefined);

    const waitUntil = jest.fn(async ({ checkFinishedCallback }) => {
      const finished = await checkFinishedCallback(resource);
      expect(finished).toBe(false);
      return resource;
    });

    resource.waitUntil = waitUntil as any;

    await resource.deleteAndWaitUntilFinished();
    expect(waitUntil).toHaveBeenCalled();
  });
});

describe('listAllResourcesFunction deduplication with empty ids', () => {
  test('skips items without uniq id and deduplicates', async () => {
    const list = jest
      .fn()
      .mockResolvedValueOnce([
        { uniqIdCallback: () => '', value: 1 },
        { uniqIdCallback: () => 'a', value: 2 },
      ])
      .mockResolvedValueOnce([{ uniqIdCallback: () => 'a', value: 3 }]);

    const listAll = listAllResourcesFunction(list as any);
    const results = await listAll();

    expect(list).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(2);
  });
});