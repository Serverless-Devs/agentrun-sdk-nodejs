/**
 * Sandbox Data Models
 *
 * 此模块定义 Sandbox 相关的所有数据模型。
 * This module defines all data models related to Sandbox.
 */

import { Status, PageableInput } from "../utils/model";

/**
 * Template type enum
 */
export enum TemplateType {
  CODE_INTERPRETER = "CodeInterpreter",
  BROWSER = "Browser",
  AIO = "AllInOne",
  /**
   * 自定义镜像 / Custom Image
   */
  CUSTOM = "CustomImage",
}

/**
 * Sandbox state enum
 */
export enum SandboxState {
  CREATING = "Creating",
  RUNNING = "Running",
  READY = "READY",  // API返回的就绪状态，等同于Running
  STOPPED = "Stopped",
  FAILED = "Failed",
  DELETING = "Deleting",
}

/**
 * Template network mode enum
 */
export enum TemplateNetworkMode {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  PUBLIC_AND_PRIVATE = "PUBLIC_AND_PRIVATE",
}

/**
 * OSS permission enum
 */
export enum TemplateOSSPermission {
  READ_WRITE = "READ_WRITE",
  READ_ONLY = "READ_ONLY",
}

/**
 * Code language enum
 */
export enum CodeLanguage {
  PYTHON = "python",
  JAVASCRIPT = "javascript",
}

// ==================== NAS 配置相关 ====================

/**
 * NAS mount configuration
 * NAS 挂载配置 / NAS Mount Configuration
 *
 * 定义 NAS 文件系统的挂载配置。
 * Defines the mount configuration for NAS file system.
 */
export interface NASMountConfig {
  /**
   * 是否启用 TLS 加密 / Whether to enable TLS encryption
   */
  enableTLS?: boolean;
  /**
   * 挂载目录 / Mount Directory
   * @example "/home/test"
   */
  mountDir?: string;
  /**
   * NAS 服务器地址 / NAS Server Address
   * @example "***-uni85.cn-hangzhou.nas.com:/"
   */
  serverAddr?: string;
}

/**
 * NAS configuration
 * NAS 配置 / NAS Configuration
 *
 * 定义 NAS 文件系统的配置。
 * Defines the configuration for NAS file system.
 */
export interface NASConfig {
  /**
   * 组 ID / Group ID
   * @example 100
   */
  groupId?: number;
  /**
   * 挂载点列表 / Mount Points List
   */
  mountPoints?: NASMountConfig[];
  /**
   * 用户 ID / User ID
   * @example 100
   */
  userId?: number;
}

// ==================== OSS 挂载配置相关 ====================

/**
 * OSS mount point
 * OSS 挂载点 / OSS Mount Point
 *
 * 定义 OSS 存储的挂载点配置。
 * Defines the mount point configuration for OSS storage.
 */
export interface OSSMountPoint {
  /**
   * OSS 存储桶名称 / OSS Bucket Name
   * @example "my-bucket"
   */
  bucketName?: string;
  /**
   * OSS 存储桶路径 / OSS Bucket Path
   * @example "/my-dir"
   */
  bucketPath?: string;
  /**
   * OSS 端点 / OSS Endpoint
   * @example "http://oss-cn-shanghai.aliyuncs.com"
   */
  endpoint?: string;
  /**
   * 挂载目录 / Mount Directory
   * @example "/mnt/dir"
   */
  mountDir?: string;
  /**
   * 是否只读 / Read Only
   */
  readOnly?: boolean;
}

/**
 * OSS mount configuration
 * OSS 挂载配置 / OSS Mount Configuration
 *
 * 定义 OSS 存储的挂载配置。
 * Defines the mount configuration for OSS storage.
 */
export interface OSSMountConfig {
  /**
   * 挂载点列表 / Mount Points List
   */
  mountPoints?: OSSMountPoint[];
}

// ==================== PolarFS 配置相关 ====================

/**
 * PolarFS mount configuration
 * PolarFS 挂载配置 / PolarFS Mount Configuration
 *
 * 定义 PolarFS 文件系统的挂载配置。
 * Defines the mount configuration for PolarFS file system.
 */
export interface PolarFsMountConfig {
  /**
   * 实例 ID / Instance ID
   */
  instanceId?: string;
  /**
   * 挂载目录 / Mount Directory
   */
  mountDir?: string;
  /**
   * 远程目录 / Remote Directory
   */
  remoteDir?: string;
}

/**
 * PolarFS configuration
 * PolarFS 配置 / PolarFS Configuration
 *
 * 定义 PolarFS 文件系统的配置。
 * Defines the configuration for PolarFS file system.
 */
export interface PolarFsConfig {
  /**
   * 组 ID / Group ID
   */
  groupId?: number;
  /**
   * 挂载点列表 / Mount Points List
   */
  mountPoints?: PolarFsMountConfig[];
  /**
   * 用户 ID / User ID
   */
  userId?: number;
}

// ==================== 模板配置相关 ====================

/**
 * Template network configuration
 */
export interface TemplateNetworkConfiguration {
  networkMode?: TemplateNetworkMode;
  securityGroupId?: string;
  vpcId?: string;
  vswitchIds?: string[];
}

/**
 * Template OSS configuration
 */
export interface TemplateOssConfiguration {
  bucketName: string;
  mountPoint: string;
  permission?: TemplateOSSPermission;
  prefix: string;
  region: string;
}

/**
 * Template log configuration
 */
export interface TemplateLogConfiguration {
  project?: string;
  logstore?: string;
}

/**
 * Template credential configuration
 */
export interface TemplateCredentialConfiguration {
  credentialName?: string;
}

/**
 * Template ARMS configuration
 */
export interface TemplateArmsConfiguration {
  armsLicenseKey?: string;
  enableArms: boolean;
}

/**
 * Template container configuration
 */
export interface TemplateContainerConfiguration {
  image?: string;
  command?: string[];
  /**
   * ACR 实例 ID / ACR Instance ID
   */
  acrInstanceId?: string;
  /**
   * 镜像注册表类型 / Image Registry Type
   */
  imageRegistryType?: string;
  /**
   * 端口 / Port
   */
  port?: number;
}

/**
 * Template MCP options
 */
export interface TemplateMcpOptions {
  enabledTools?: string[];
  transport?: string;
}

/**
 * Template MCP state
 */
export interface TemplateMcpState {
  accessEndpoint?: string;
  status?: string;
  statusReason?: string;
}

/**
 * Template create input
 * 模板创建输入 / Template Create Input
 */
export interface TemplateCreateInput {
  templateName?: string;
  templateType: TemplateType;
  cpu?: number;
  memory?: number;
  executionRoleArn?: string;
  sandboxIdleTimeoutInSeconds?: number;
  sandboxTtlInSeconds?: number;
  shareConcurrencyLimitPerSandbox?: number;
  templateConfiguration?: Record<string, unknown>;
  description?: string;
  environmentVariables?: Record<string, string>;
  networkConfiguration?: TemplateNetworkConfiguration;
  ossConfiguration?: TemplateOssConfiguration[];
  logConfiguration?: TemplateLogConfiguration;
  credentialConfiguration?: TemplateCredentialConfiguration;
  armsConfiguration?: TemplateArmsConfiguration;
  containerConfiguration?: TemplateContainerConfiguration;
  diskSize?: number;
  /**
   * 是否允许匿名管理 / Whether to allow anonymous management
   */
  allowAnonymousManage?: boolean;
}

/**
 * Template update input
 */
export interface TemplateUpdateInput {
  cpu?: number;
  memory?: number;
  executionRoleArn?: string;
  sandboxIdleTimeoutInSeconds?: number;
  sandboxTtlInSeconds?: number;
  shareConcurrencyLimitPerSandbox?: number;
  description?: string;
  environmentVariables?: Record<string, string>;
  networkConfiguration?: TemplateNetworkConfiguration;
  ossConfiguration?: TemplateOssConfiguration[];
  logConfiguration?: TemplateLogConfiguration;
  credentialConfiguration?: TemplateCredentialConfiguration;
  armsConfiguration?: TemplateArmsConfiguration;
  containerConfiguration?: TemplateContainerConfiguration;
  diskSize?: number;
}

/**
 * Template list input
 */
export interface TemplateListInput extends PageableInput {
  templateType?: TemplateType;
}

/**
 * Sandbox create input
 * 沙箱创建输入 / Sandbox Create Input
 */
export interface SandboxCreateInput {
  /**
   * 模板名称 / Template Name
   */
  templateName: string;
  /**
   * 沙箱空闲超时时间（秒） / Sandbox Idle Timeout (seconds)
   */
  sandboxIdleTimeoutSeconds?: number;
  /**
   * 沙箱 ID（可选，用户可指定） / Sandbox ID (optional, user can specify)
   */
  sandboxId?: string;
  /**
   * NAS 配置 / NAS Configuration
   */
  nasConfig?: NASConfig;
  /**
   * OSS 挂载配置 / OSS Mount Configuration
   */
  ossMountConfig?: OSSMountConfig;
  /**
   * PolarFS 配置 / PolarFS Configuration
   */
  polarFsConfig?: PolarFsConfig;
}

/**
 * Sandbox list input
 */
export interface SandboxListInput {
  maxResults?: number;
  nextToken?: string;
  status?: string;
  templateName?: string;
  templateType?: TemplateType;
}

/**
 * Template data
 * 模板数据 / Template Data
 */
export interface TemplateData {
  /**
   * 模板 ARN / Template ARN
   */
  templateArn?: string;
  /**
   * 模板 ID / Template ID
   */
  templateId?: string;
  /**
   * 模板名称 / Template Name
   */
  templateName?: string;
  /**
   * 模板类型 / Template Type
   */
  templateType?: TemplateType;
  /**
   * CPU 核数 / CPU Cores
   */
  cpu?: number;
  /**
   * 内存大小（MB） / Memory Size (MB)
   */
  memory?: number;
  /**
   * 创建时间 / Creation Time
   */
  createdAt?: string;
  /**
   * 描述 / Description
   */
  description?: string;
  /**
   * 执行角色 ARN / Execution Role ARN
   */
  executionRoleArn?: string;
  /**
   * 最后更新时间 / Last Updated Time
   */
  lastUpdatedAt?: string;
  /**
   * 资源名称 / Resource Name
   */
  resourceName?: string;
  /**
   * 沙箱空闲超时时间（秒） / Sandbox Idle Timeout (seconds)
   */
  sandboxIdleTimeoutInSeconds?: number;
  /**
   * 沙箱存活时间（秒） / Sandbox TTL (seconds)
   */
  sandboxTtlInSeconds?: number;
  /**
   * 每个沙箱的最大并发会话数 / Max Concurrency Limit Per Sandbox
   */
  shareConcurrencyLimitPerSandbox?: number;
  /**
   * 状态 / Status
   */
  status?: Status;
  /**
   * 状态原因 / Status Reason
   */
  statusReason?: string;
  /**
   * 磁盘大小（GB） / Disk Size (GB)
   */
  diskSize?: number;
  /**
   * 是否允许匿名管理 / Whether to allow anonymous management
   */
  allowAnonymousManage?: boolean;
}

/**
 * Sandbox data
 * 沙箱数据 / Sandbox Data
 */
export interface SandboxData {
  /**
   * 沙箱 ID / Sandbox ID
   */
  sandboxId?: string;
  /**
   * 沙箱名称 / Sandbox Name
   */
  sandboxName?: string;
  /**
   * 模板 ID / Template ID
   */
  templateId?: string;
  /**
   * 模板名称 / Template Name
   */
  templateName?: string;
  /**
   * 沙箱状态 / Sandbox State
   */
  state?: SandboxState;
  /**
   * 状态原因 / State Reason
   */
  stateReason?: string;
  /**
   * 沙箱创建时间 / Sandbox Creation Time
   */
  createdAt?: string;
  /**
   * 最后更新时间 / Last Updated Time
   */
  lastUpdatedAt?: string;
  /**
   * 沙箱空闲超时时间（秒） / Sandbox Idle Timeout (seconds)
   */
  sandboxIdleTimeoutSeconds?: number;
  /**
   * 沙箱结束时间 / Sandbox End Time
   */
  endedAt?: string;
  /**
   * 元数据 / Metadata
   */
  metadata?: Record<string, any>;
  /**
   * 沙箱全局唯一资源名称 / Sandbox ARN
   */
  sandboxArn?: string;
  /**
   * 沙箱空闲 TTL（秒） / Sandbox Idle TTL (seconds)
   */
  sandboxIdleTTLInSeconds?: number;
}

/**
 * Code execution result
 */
export interface ExecuteCodeResult {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: string;
}

/**
 * File info
 */
export interface FileInfo {
  name: string;
  path: string;
  size?: number;
  isDirectory?: boolean;
  modifiedAt?: string;
}

export { Status };
