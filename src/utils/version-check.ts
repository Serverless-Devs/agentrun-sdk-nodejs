// Version check utility to ensure warning is only shown once globally
declare const __VERSION__: string;
export const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0-dev";
import { logger } from "./log";

if (!process.env.DISABLE_BREAKING_CHANGES_WARNING && !(globalThis as any)._AGENTRUN_VERSION_WARNING_SHOWN) {
  (globalThis as any)._AGENTRUN_VERSION_WARNING_SHOWN = true;
  logger.warn(`当前您正在使用 AgentRun Node.js SDK 版本 ${VERSION}。早期版本通常包含许多新功能，这些功能 可能引入不兼容的变更 。为避免潜在问题，我们强烈建议 将依赖锁定为此版本 。\nYou are currently using AgentRun Node.js SDK version ${VERSION}. Early versions often include many new features, which may introduce breaking changes. To avoid potential issues, we strongly recommend pinning the dependency to this version.\n  npm install "@agentrun/sdk@${VERSION}"\n  bun add "@agentrun/sdk@${VERSION}"\n\n增加 DISABLE_BREAKING_CHANGES_WARNING=1 到您的环境变量以关闭此警告。\nAdd DISABLE_BREAKING_CHANGES_WARNING=1 to your environment variables to disable this warning.\n\nReleases: https://github.com/Serverless-Devs/agentrun-sdk-nodejs/releases`);
}
