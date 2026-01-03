/**
 * Common data models for AgentRun SDK
 *
 * 此模块定义通用的数据模型。
 * This module defines common data models.
 */

import { logger } from './log';

/**
 * Resource status enum
 */
export type Status =
  | 'CREATING'
  | 'CREATE_FAILED'
  | 'READY'
  | 'UPDATING'
  | 'UPDATE_FAILED'
  | 'DELETING'
  | 'DELETE_FAILED';

export const Status = {
  CREATING: 'CREATING' as Status,
  CREATE_FAILED: 'CREATE_FAILED' as Status,
  READY: 'READY' as Status,
  UPDATING: 'UPDATING' as Status,
  UPDATE_FAILED: 'UPDATE_FAILED' as Status,
  DELETING: 'DELETING' as Status,
  DELETE_FAILED: 'DELETE_FAILED' as Status,
};

export function isFinalStatus(status?: Status) {
  return [
    undefined,
    null,
    '',
    ...([
      'READY',
      'CREATE_FAILED',
      'UPDATE_FAILED',
      'DELETE_FAILED',
    ] as Status[]),
  ].includes(status);
}

/**
 * 从 SDK 内部对象创建资源对象 / Create resource object from SDK inner object
 * 
 * 此函数记录对象转换过程，类似于 Python 版本的 from_inner_object
 * This function logs object conversion process, similar to Python's from_inner_object
 * 
 * @param obj - SDK 返回的对象 / Object returned from SDK
 * @param extra - 额外的属性 (可选) / Extra properties (optional)
 * @returns 转换后的对象 / Converted object
 */
export function fromInnerObject<T>(obj: any, extra?: Record<string, any>): T {
  logger.debug(
    'before parse object obj=%s, extra=%s', 
    JSON.stringify(obj), 
    extra ? JSON.stringify(extra) : 'null'
  );
  
  if (extra) {
    return { ...obj, ...extra } as T;
  }
  
  return obj as T;
}

/**
 * Network mode enum
 */
export type NetworkMode = 'PUBLIC' | 'PRIVATE' | 'PUBLIC_AND_PRIVATE';

export const NetworkMode = {
  PUBLIC: 'PUBLIC' as NetworkMode,
  PRIVATE: 'PRIVATE' as NetworkMode,
  PUBLIC_AND_PRIVATE: 'PUBLIC_AND_PRIVATE' as NetworkMode,
};

/**
 * Pageable input for list operations
 */
export interface PageableInput {
  pageNumber?: number;
  pageSize?: number;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  networkMode?: NetworkMode;
  vpcId?: string;
  vSwitchIds?: string[];
  securityGroupId?: string;
}

/**
 * Helper to convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Helper to convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function toSnakeCaseKeys<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = toSnakeCaseKeys(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? toSnakeCaseKeys(item as Record<string, unknown>)
          : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function toCamelCaseKeys<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = toCamelCaseKeys(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? toCamelCaseKeys(item as Record<string, unknown>)
          : item
      );
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

/**
 * Remove undefined values from object
 */
export function removeUndefined<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
