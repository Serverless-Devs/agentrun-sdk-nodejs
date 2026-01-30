/**
 * Sandbox module exports
 */

import '@/utils/version-check';

export { SandboxClient } from './client';
export { Sandbox } from './sandbox';
export { Template } from './template';
export { CodeInterpreterSandbox } from './code-interpreter-sandbox';
export { BrowserSandbox } from './browser-sandbox';
export { AioSandbox } from './aio-sandbox';
export { CustomSandbox } from './custom-sandbox';

// Data API exports
export { SandboxDataAPI } from './api/sandbox-data';
export { CodeInterpreterDataAPI } from './api/code-interpreter-data';
export { BrowserDataAPI } from './api/browser-data';
export { AioDataAPI } from './api/aio-data';

export {
  TemplateType,
  SandboxState,
  TemplateNetworkMode,
  TemplateOSSPermission,
  CodeLanguage,
} from './model';

export type {
  TemplateNetworkConfiguration,
  TemplateOssConfiguration,
  TemplateLogConfiguration,
  TemplateCredentialConfiguration,
  TemplateArmsConfiguration,
  TemplateContainerConfiguration,
  TemplateMcpOptions,
  TemplateMcpState,
  TemplateCreateInput,
  TemplateUpdateInput,
  TemplateListInput,
  SandboxCreateInput,
  SandboxListInput,
  TemplateData,
  SandboxData,
  ExecuteCodeResult,
  FileInfo,
  // New types / 新增类型
  NASConfig,
  NASMountConfig,
  OSSMountConfig,
  OSSMountPoint,
  PolarFsConfig,
  PolarFsMountConfig,
} from './model';
