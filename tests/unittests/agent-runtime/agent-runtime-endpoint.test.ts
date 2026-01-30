import { AgentRuntimeEndpoint } from '../../../src/agent-runtime/endpoint';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const baseMessages: ChatCompletionMessageParam[] = [{ role: 'user', content: 'hello' }];

describe('AgentRuntimeEndpoint', () => {
  it('should throw when deleting without ids', async () => {
    const endpoint = new AgentRuntimeEndpoint();

    await expect(endpoint.delete()).rejects.toThrow(
      'agentRuntimeId and agentRuntimeEndpointId are required to delete an endpoint'
    );
  });

  it('should throw when updating without ids', async () => {
    const endpoint = new AgentRuntimeEndpoint();

    await expect(endpoint.update({ input: { description: 'test' } })).rejects.toThrow(
      'agentRuntimeId and agentRuntimeEndpointId are required to update an endpoint'
    );
  });

  it('should throw when refreshing without ids', async () => {
    const endpoint = new AgentRuntimeEndpoint();

    await expect(endpoint.refresh()).rejects.toThrow(
      'agentRuntimeId and agentRuntimeEndpointId are required to refresh an endpoint'
    );
  });

  it('should throw when runtime name cannot be determined', async () => {
    const endpoint = new AgentRuntimeEndpoint();

    await expect(endpoint.invokeOpenai({ messages: baseMessages })).rejects.toThrow(
      'Unable to determine agent runtime name for this endpoint'
    );
  });
});
