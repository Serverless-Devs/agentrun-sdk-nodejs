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
}

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
 */
export interface SandboxCreateInput {
  templateName: string;
  sandboxIdleTimeoutSeconds?: number;
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
 */
export interface TemplateData {
  templateArn?: string;
  templateId?: string;
  templateName?: string;
  templateType?: TemplateType;
  cpu?: number;
  memory?: number;
  createdAt?: string;
  description?: string;
  executionRoleArn?: string;
  lastUpdatedAt?: string;
  resourceName?: string;
  sandboxIdleTimeoutInSeconds?: number;
  sandboxTtlInSeconds?: number;
  shareConcurrencyLimitPerSandbox?: number;
  status?: Status;
  statusReason?: string;
  diskSize?: number;
}

/**
 * Sandbox data
 */
export interface SandboxData {
  sandboxId?: string;
  sandboxName?: string;
  templateId?: string;
  templateName?: string;
  state?: SandboxState;
  stateReason?: string;
  createdAt?: string;
  lastUpdatedAt?: string;
  sandboxIdleTimeoutSeconds?: number;
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
