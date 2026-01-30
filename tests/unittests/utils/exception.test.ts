/**
 * Exception Tests
 */

import {
  AgentRunError,
  HTTPError,
  ClientError,
  ServerError,
  ResourceNotExistError,
  ResourceAlreadyExistError,
} from '../../../src/utils/exception';

describe('Exceptions', () => {
  describe('AgentRunError', () => {
    it('should create error with message', () => {
      const error = new AgentRunError('test error');

      expect(error.message).toBe('test error');
      expect(error.name).toBe('AgentRunError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('HTTPError', () => {
    it('should create HTTP error with status code', () => {
      const error = new HTTPError(404, 'Not found', { requestId: 'req-123' });

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.requestId).toBe('req-123');
      expect(error.name).toBe('HTTPError');
    });

    it('should convert to ResourceNotExistError for 404', () => {
      const error = new HTTPError(404, 'Not found');

      const resourceError = error.toResourceError('Agent', 'agent-123');

      expect(resourceError).toBeInstanceOf(ResourceNotExistError);
      expect(resourceError.message).toContain('Agent');
      expect(resourceError.message).toContain('agent-123');
    });

    it('should convert to ResourceAlreadyExistError for 409', () => {
      const error = new HTTPError(409, 'Conflict');

      const resourceError = error.toResourceError('Agent', 'agent-123');

      expect(resourceError).toBeInstanceOf(ResourceAlreadyExistError);
      expect(resourceError.message).toContain('Agent');
      expect(resourceError.message).toContain('agent-123');
    });

    it('should return self for other status codes', () => {
      const error = new HTTPError(500, 'Server error');

      const result = error.toResourceError('Agent', 'agent-123');

      expect(result).toBe(error);
    });

    it('should convert to ResourceAlreadyExistError for 400 with "already exists" message', () => {
      const error = new HTTPError(400, 'Resource already exists');

      const resourceError = error.toResourceError('Agent', 'agent-123');

      expect(resourceError).toBeInstanceOf(ResourceAlreadyExistError);
      expect(resourceError.message).toContain('Agent');
      expect(resourceError.message).toContain('agent-123');
    });

    it('should convert to ResourceAlreadyExistError for 500 with "already exists" message', () => {
      const error = new HTTPError(500, 'Resource already exists in the system');

      const resourceError = error.toResourceError('Agent', 'agent-123');

      expect(resourceError).toBeInstanceOf(ResourceAlreadyExistError);
      expect(resourceError.message).toContain('Agent');
      expect(resourceError.message).toContain('agent-123');
    });
  });

  describe('ClientError', () => {
    it('should create client error', () => {
      const error = new ClientError(400, 'Bad request');

      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ClientError');
      expect(error instanceof HTTPError).toBe(true);
    });
  });

  describe('ServerError', () => {
    it('should create server error', () => {
      const error = new ServerError(500, 'Internal error');

      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('ServerError');
      expect(error instanceof HTTPError).toBe(true);
    });
  });

  describe('ResourceNotExistError', () => {
    it('should create error with resource type and id', () => {
      const error = new ResourceNotExistError('Agent', 'agent-123');

      expect(error.resourceType).toBe('Agent');
      expect(error.resourceId).toBe('agent-123');
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('Agent');
      expect(error.message).toContain('agent-123');
      expect(error.message).toContain('does not exist');
    });

    it('should create error without resource id', () => {
      const error = new ResourceNotExistError('Agent');

      expect(error.resourceType).toBe('Agent');
      expect(error.resourceId).toBeUndefined();
      expect(error.message).toContain('Agent');
      expect(error.message).toContain('does not exist');
    });
  });

  describe('ResourceAlreadyExistError', () => {
    it('should create error with resource type and id', () => {
      const error = new ResourceAlreadyExistError('Agent', 'agent-123');

      expect(error.resourceType).toBe('Agent');
      expect(error.resourceId).toBe('agent-123');
      expect(error.statusCode).toBe(409);
      expect(error.message).toContain('Agent');
      expect(error.message).toContain('agent-123');
      expect(error.message).toContain('already exists');
    });

    it('should create error without resourceId', () => {
      const error = new ResourceAlreadyExistError('Agent');

      expect(error.resourceType).toBe('Agent');
      expect(error.resourceId).toBeUndefined();
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Agent already exists');
      expect(error.name).toBe('ResourceAlreadyExistError');
    });
  });
});
