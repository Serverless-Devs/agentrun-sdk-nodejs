/**
 * Jest 测试 setup 文件
 *
 * 此文件在所有测试运行前被预加载
 */

// 加载环境变量
import 'dotenv/config';

// 设置默认测试超时
jest.setTimeout(30000);

// 全局测试工具函数
export function generateUniqueName(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

// 检查是否启用 E2E 测试
// 已移除 RUN_E2E_TESTS 环境开关，E2E 测试默认运行
