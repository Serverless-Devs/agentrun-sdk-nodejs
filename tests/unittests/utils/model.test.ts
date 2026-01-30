/**
 * Model 工具模块测试
 *
 * 测试 model.ts 的各种功能。
 */

import {
  isFinalStatus,
  NetworkMode,
  removeUndefined,
  Status,
  toCamelCase,
  toCamelCaseKeys,
  toSnakeCase,
  toSnakeCaseKeys,
} from '../../../src/utils/model';

describe('Utils Model', () => {
  describe('Status enum', () => {
    it('should have correct status values', () => {
      expect(Status.CREATING).toBe('CREATING');
      expect(Status.CREATE_FAILED).toBe('CREATE_FAILED');
      expect(Status.READY).toBe('READY');
      expect(Status.UPDATING).toBe('UPDATING');
      expect(Status.UPDATE_FAILED).toBe('UPDATE_FAILED');
      expect(Status.DELETING).toBe('DELETING');
      expect(Status.DELETE_FAILED).toBe('DELETE_FAILED');
    });
  });

  describe('isFinalStatus', () => {
    it('should return true for READY status', () => {
      expect(isFinalStatus(Status.READY)).toBe(true);
    });

    it('should return true for CREATE_FAILED status', () => {
      expect(isFinalStatus(Status.CREATE_FAILED)).toBe(true);
    });

    it('should return true for UPDATE_FAILED status', () => {
      expect(isFinalStatus(Status.UPDATE_FAILED)).toBe(true);
    });

    it('should return true for DELETE_FAILED status', () => {
      expect(isFinalStatus(Status.DELETE_FAILED)).toBe(true);
    });

    it('should return true for undefined status', () => {
      expect(isFinalStatus(undefined)).toBe(true);
    });

    it('should return false for CREATING status', () => {
      expect(isFinalStatus(Status.CREATING)).toBe(false);
    });

    it('should return false for UPDATING status', () => {
      expect(isFinalStatus(Status.UPDATING)).toBe(false);
    });

    it('should return false for DELETING status', () => {
      expect(isFinalStatus(Status.DELETING)).toBe(false);
    });
  });

  describe('NetworkMode enum', () => {
    it('should have correct network mode values', () => {
      expect(NetworkMode.PUBLIC).toBe('PUBLIC');
      expect(NetworkMode.PRIVATE).toBe('PRIVATE');
      expect(NetworkMode.PUBLIC_AND_PRIVATE).toBe('PUBLIC_AND_PRIVATE');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('camelCase')).toBe('camel_case');
      expect(toSnakeCase('myVariableName')).toBe('my_variable_name');
    });

    it('should handle string without uppercase letters', () => {
      expect(toSnakeCase('lowercase')).toBe('lowercase');
    });

    it('should handle single uppercase letter', () => {
      expect(toSnakeCase('testA')).toBe('test_a');
    });

    it('should handle consecutive uppercase letters', () => {
      expect(toSnakeCase('testABC')).toBe('test_a_b_c');
    });

    it('should handle empty string', () => {
      expect(toSnakeCase('')).toBe('');
    });
  });

  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('snake_case')).toBe('snakeCase');
      expect(toCamelCase('my_variable_name')).toBe('myVariableName');
    });

    it('should handle string without underscores', () => {
      expect(toCamelCase('lowercase')).toBe('lowercase');
    });

    it('should handle multiple underscores', () => {
      expect(toCamelCase('a_b_c_d')).toBe('aBCD');
    });

    it('should handle empty string', () => {
      expect(toCamelCase('')).toBe('');
    });
  });

  describe('toSnakeCaseKeys', () => {
    it('should convert object keys from camelCase to snake_case', () => {
      const obj = { firstName: 'John', lastName: 'Doe' };
      const result = toSnakeCaseKeys(obj);

      expect(result).toEqual({ first_name: 'John', last_name: 'Doe' });
    });

    it('should handle nested objects', () => {
      const obj = {
        userName: 'test',
        userProfile: {
          fullName: 'Test User',
          emailAddress: 'test@example.com',
        },
      };
      const result = toSnakeCaseKeys(obj);

      expect(result).toEqual({
        user_name: 'test',
        user_profile: {
          full_name: 'Test User',
          email_address: 'test@example.com',
        },
      });
    });

    it('should handle arrays of objects', () => {
      const obj = {
        userList: [{ firstName: 'John' }, { firstName: 'Jane' }],
      };
      const result = toSnakeCaseKeys(obj);

      expect(result).toEqual({
        user_list: [{ first_name: 'John' }, { first_name: 'Jane' }],
      });
    });

    it('should handle arrays of primitives', () => {
      const obj = { tagNames: ['tag1', 'tag2'] };
      const result = toSnakeCaseKeys(obj);

      expect(result).toEqual({ tag_names: ['tag1', 'tag2'] });
    });

    it('should handle null values', () => {
      const obj = { nullValue: null, validValue: 'test' };
      const result = toSnakeCaseKeys(obj);

      expect(result).toEqual({ null_value: null, valid_value: 'test' });
    });
  });

  describe('toCamelCaseKeys', () => {
    it('should convert object keys from snake_case to camelCase', () => {
      const obj = { first_name: 'John', last_name: 'Doe' };
      const result = toCamelCaseKeys(obj);

      expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
    });

    it('should handle nested objects', () => {
      const obj = {
        user_name: 'test',
        user_profile: {
          full_name: 'Test User',
          email_address: 'test@example.com',
        },
      };
      const result = toCamelCaseKeys(obj);

      expect(result).toEqual({
        userName: 'test',
        userProfile: {
          fullName: 'Test User',
          emailAddress: 'test@example.com',
        },
      });
    });

    it('should handle arrays of objects', () => {
      const obj = {
        user_list: [{ first_name: 'John' }, { first_name: 'Jane' }],
      };
      const result = toCamelCaseKeys(obj);

      expect(result).toEqual({
        userList: [{ firstName: 'John' }, { firstName: 'Jane' }],
      });
    });

    it('should handle arrays of primitives', () => {
      const obj = { tag_names: ['tag1', 'tag2'] };
      const result = toCamelCaseKeys(obj);

      expect(result).toEqual({ tagNames: ['tag1', 'tag2'] });
    });

    it('should handle null values', () => {
      const obj = { null_value: null, valid_value: 'test' };
      const result = toCamelCaseKeys(obj);

      expect(result).toEqual({ nullValue: null, validValue: 'test' });
    });
  });

  describe('removeUndefined', () => {
    it('should remove undefined values from object', () => {
      const obj = { a: 1, b: undefined, c: 'test' };
      const result = removeUndefined(obj);

      expect(result).toEqual({ a: 1, c: 'test' });
      expect('b' in result).toBe(false);
    });

    it('should keep null values', () => {
      const obj = { a: 1, b: null, c: 'test' };
      const result = removeUndefined(obj);

      expect(result).toEqual({ a: 1, b: null, c: 'test' });
    });

    it('should handle object with no undefined values', () => {
      const obj = { a: 1, b: 'test', c: true };
      const result = removeUndefined(obj);

      expect(result).toEqual({ a: 1, b: 'test', c: true });
    });

    it('should handle object with all undefined values', () => {
      const obj = { a: undefined, b: undefined };
      const result = removeUndefined(obj);

      expect(result).toEqual({});
    });

    it('should handle empty object', () => {
      const obj = {};
      const result = removeUndefined(obj);

      expect(result).toEqual({});
    });
  });
});
