import { ModelService } from '../../../src/model/model-service';
import { Status } from '../../../src/utils/model';

describe('ModelService.waitUntilReady', () => {
  test('throws on failed status', async () => {
    const service = new ModelService();
    service.status = Status.CREATING;
    service.refresh = jest.fn().mockImplementation(async () => {
      service.status = Status.CREATE_FAILED;
    });

    await expect(
      service.waitUntilReady({ timeoutSeconds: 0.05, intervalSeconds: 0 })
    ).rejects.toThrow('Model service failed with status: CREATE_FAILED');
  });

  test('times out when never ready', async () => {
    const service = new ModelService();
    service.status = Status.CREATING;
    service.refresh = jest.fn().mockResolvedValue(undefined);

    await expect(
      service.waitUntilReady({ timeoutSeconds: 0, intervalSeconds: 0 })
    ).rejects.toThrow('Timeout waiting for model service to be ready');
  });

  test('resolves when status becomes READY and calls beforeCheck', async () => {
    const service = new ModelService();
    const beforeCheck = jest.fn();
    service.status = Status.CREATING;
    service.refresh = jest
      .fn()
      .mockImplementationOnce(async () => {
        service.status = Status.CREATING;
      })
      .mockImplementationOnce(async () => {
        service.status = Status.READY;
      });

    const result = await service.waitUntilReady({
      timeoutSeconds: 0.1,
      intervalSeconds: 0,
      beforeCheck,
    });

    expect(beforeCheck).toHaveBeenCalledTimes(2);
    expect(result).toBe(service);
  });
});