/**
 * SandboxControlAPI readTimeout behaviour tests.
 *
 * Verifies that createSandbox uses 30000ms by default but honors a
 * user-provided readTimeout from Config.
 */

const mockRuntimeOptions = jest.fn().mockImplementation(opts => ({ ...opts }));

const mockCreateSandboxWithOptions = jest.fn().mockResolvedValue({
  body: { data: { sandboxId: 'sb-1' }, requestId: 'req-1' },
});

jest.mock('@alicloud/tea-util', () => ({
  RuntimeOptions: mockRuntimeOptions,
}));

jest.mock('@alicloud/agentrun20250910', () => {
  const CreateSandboxRequest = jest.fn().mockImplementation(params => params);
  const MockClient = jest.fn().mockImplementation(() => ({
    createSandboxWithOptions: mockCreateSandboxWithOptions,
  }));
  return {
    default: MockClient,
    CreateSandboxRequest,
  };
});

import { Config } from '../../../src/utils/config';
import { SandboxControlAPI } from '../../../src/sandbox/api/control';

describe('SandboxControlAPI.createSandbox readTimeout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses 30000ms default when caller has not set readTimeout', async () => {
    const api = new SandboxControlAPI(new Config({ accountId: 'acc' }));
    await api.createSandbox({ input: {} as any });

    expect(mockRuntimeOptions).toHaveBeenCalledWith(
      expect.objectContaining({ readTimeout: 30000 })
    );
  });

  it('honors readTimeout from instance config', async () => {
    const api = new SandboxControlAPI(new Config({ accountId: 'acc', readTimeout: 60000 }));
    await api.createSandbox({ input: {} as any });

    expect(mockRuntimeOptions).toHaveBeenCalledWith(
      expect.objectContaining({ readTimeout: 60000 })
    );
  });

  it('honors readTimeout from method-level config override', async () => {
    const api = new SandboxControlAPI(new Config({ accountId: 'acc' }));
    await api.createSandbox({
      input: {} as any,
      config: new Config({ accountId: 'acc', readTimeout: 90000 }),
    });

    expect(mockRuntimeOptions).toHaveBeenCalledWith(
      expect.objectContaining({ readTimeout: 90000 })
    );
  });

  it('method-level config wins over instance config', async () => {
    const api = new SandboxControlAPI(new Config({ accountId: 'acc', readTimeout: 60000 }));
    await api.createSandbox({
      input: {} as any,
      config: new Config({ accountId: 'acc', readTimeout: 90000 }),
    });

    expect(mockRuntimeOptions).toHaveBeenCalledWith(
      expect.objectContaining({ readTimeout: 90000 })
    );
  });
});
