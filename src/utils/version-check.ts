// Version check utility to ensure warning is only shown once globally
declare const __VERSION__: string;
export const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0-dev';
import { logger } from './log';

if (
  !process.env.DISABLE_BREAKING_CHANGES_WARNING &&
  !(globalThis as any)._AGENTRUN_VERSION_WARNING_SHOWN
) {
  (globalThis as any)._AGENTRUN_VERSION_WARNING_SHOWN = true;
  logger.warn(
    `当前您正在使用 AgentRun Python SDK 版本 ${VERSION}。早期版本通常包含许多新功能，这些功能\x1b[1;33m 可能引入不兼容的变更 \x1b[0m。为避免潜在问题，我们强烈建议\x1b[1;32m 将依赖锁定为此版本 \x1b[0m。
You are currently using AgentRun Python SDK version ${VERSION}. Early versions often include many new features, which\x1b[1;33m may introduce breaking changes\x1b[0m. To avoid potential issues, we strongly recommend \x1b[1;32mpinning the dependency to this version\x1b[0m.
\x1b[2;3m  pip install 'agentrun-sdk==${VERSION}' \x1b[0m

增加\x1b[2;3m DISABLE_BREAKING_CHANGES_WARNING=1 \x1b[0m到您的环境变量以关闭此警告。
Add\x1b[2;3m DISABLE_BREAKING_CHANGES_WARNING=1 \x1b[0mto your environment variables to disable this warning.
     
Releases:\x1b[2;3m https://github.com/Serverless-Devs/agentrun-sdk-python/releases\x1b[0m`
  );
}
