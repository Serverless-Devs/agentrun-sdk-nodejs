import { ModelService } from '../../../src/model/model-service';
import { Status } from '../../../src/utils/model';

describe('ModelService.waitUntilReady', () => {
  test('throws on failed status', async () => {
    const service = new ModelService();
    service.status = Status.CREATING;
    service.refresh = jest.fn().mockImplementation(async () => {
      service.status = Status.CREATE_FAILED;
    });

    const s = await service.waitUntilReadyOrFailed({
      timeoutSeconds: 0.05,
      intervalSeconds: 0,
    });

    await expect(s.status).toBe(Status.CREATE_FAILED);
  });

  test('times out when never ready', async () => {
    const service = new ModelService();
    service.status = Status.CREATING;
    service.refresh = jest.fn().mockResolvedValue(undefined);

    await expect(
      service.waitUntilReadyOrFailed({ timeoutSeconds: 0, intervalSeconds: 0 })
    ).rejects.toThrow(/Timeout/);
  });

  test('resolves when status becomes READY and calls callback', async () => {
    const service = new ModelService();
    const callback = jest.fn();
    service.status = Status.CREATING;
    service.refresh = jest
      .fn()
      .mockImplementationOnce(async () => {
        service.status = Status.CREATING;
      })
      .mockImplementationOnce(async () => {
        service.status = Status.READY;
      });

    const result = await service.waitUntilReadyOrFailed({
      timeoutSeconds: 0.1,
      intervalSeconds: 0,
      callback,
    });

    expect(callback).toHaveBeenCalledTimes(2);
    expect(result).toBe(service);
  });
});
