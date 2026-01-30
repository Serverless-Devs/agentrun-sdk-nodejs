/**
 * Helper 模块测试
 *
 * 测试 helper.ts 的各种功能。
 */

import { sleep } from '../../../src/utils/helper';

describe('Helper Utils', () => {
  describe('sleep', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      // Allow some tolerance (should be at least 90ms)
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    it('should resolve immediately for 0 ms', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;

      // Should complete very quickly (less than 50ms)
      expect(elapsed).toBeLessThan(50);
    });

    it('should return a Promise', () => {
      const result = sleep(10);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve to undefined', async () => {
      const result = await sleep(10);
      expect(result).toBeUndefined();
    });
  });
});
