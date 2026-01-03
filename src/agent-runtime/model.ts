/**
 * Agent Runtime Data Models
 *
 * 此模块定义 Agent Runtime 相关的所有数据模型、枚举和输入输出对象。
 * This module defines all data models, enums, and input/output objects related to Agent Runtime.
 */

import * as fs from "fs";
import * as path from "path";
import * as crc64Lib from "crc64-ecma182.js";

import { Status } from "../utils/model";
import type { NetworkConfig, PageableInput } from "../utils/model";

/**
 * Agent Runtime artifact type
 */
export type AgentRuntimeArtifact = "Code" | "Container";

export const AgentRuntimeArtifact = {
  CODE: "Code" as AgentRuntimeArtifact,
  CONTAINER: "Container" as AgentRuntimeArtifact,
};

/**
 * Agent Runtime language
 */
export type AgentRuntimeLanguage =
  | "python3.10"
  | "python3.12"
  | "nodejs18"
  | "nodejs20"
  | "java8"
  | "java11";

export const AgentRuntimeLanguage = {
  PYTHON310: "python3.10" as AgentRuntimeLanguage,
  PYTHON312: "python3.12" as AgentRuntimeLanguage,
  NODEJS18: "nodejs18" as AgentRuntimeLanguage,
  NODEJS20: "nodejs20" as AgentRuntimeLanguage,
  JAVA8: "java8" as AgentRuntimeLanguage,
  JAVA11: "java11" as AgentRuntimeLanguage,
};

/**
 * Agent Runtime protocol type
 */
export type AgentRuntimeProtocolType = "HTTP" | "MCP";

export const AgentRuntimeProtocolType = {
  HTTP: "HTTP" as AgentRuntimeProtocolType,
  MCP: "MCP" as AgentRuntimeProtocolType,
};

/**
 * Agent Runtime code configuration
 */
export interface AgentRuntimeCode {
  /** CRC-64 checksum of the code package */
  checksum?: string;
  /** Command to run in the runtime (e.g., ["python"]) */
  command?: string[];
  /** Programming language runtime */
  language?: AgentRuntimeLanguage;
  /** OSS bucket name */
  ossBucketName?: string;
  /** OSS object name */
  ossObjectName?: string;
  /** Base64 encoded ZIP file */
  zipFile?: string;
}

/**
 * Create AgentRuntimeCode from a ZIP file
 */
export async function codeFromZipFile(
  language: AgentRuntimeLanguage,
  command: string[],
  zipFilePath: string,
): Promise<AgentRuntimeCode> {
  const data = await fs.promises.readFile(zipFilePath);

  // Calculate CRC-64 checksum (same as Python's crcmod with CRC-64-ECMA182)
  const checksum = crc64Lib.crc64(data);

  return {
    language,
    command,
    zipFile: data.toString("base64"),
    checksum: checksum,
  };
}

/**
 * Create AgentRuntimeCode from OSS
 */
export function codeFromOss(
  language: AgentRuntimeLanguage,
  command: string[],
  bucket: string,
  object: string,
): AgentRuntimeCode {
  return {
    language,
    command,
    ossBucketName: bucket,
    ossObjectName: object,
  };
}

/**
 * Create AgentRuntimeCode from a file or directory
 */
export async function codeFromFile(
  language: AgentRuntimeLanguage,
  command: string[],
  filePath: string,
): Promise<AgentRuntimeCode> {
  const archiver = await import("archiver").catch(() => null);

  if (!archiver) {
    throw new Error(
      "archiver package is required for codeFromFile. Install it with: npm install archiver",
    );
  }

  const stats = await fs.promises.stat(filePath);
  const zipFilePath = path.join(path.dirname(filePath), `${Date.now()}.zip`);

  // Create ZIP archive
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver.default("zip", { zlib: { level: 9 } });

  await new Promise<void>((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    if (stats.isDirectory()) {
      archive.directory(filePath, false);
    } else {
      archive.file(filePath, { name: path.basename(filePath) });
    }

    archive.finalize();
  });

  const code = await codeFromZipFile(language, command, zipFilePath);

  // Clean up temp file
  await fs.promises.unlink(zipFilePath);

  return code;
}

/**
 * Agent Runtime container configuration
 */
export interface AgentRuntimeContainer {
  /** Command to run in the runtime */
  command?: string[];
  /** Container image address */
  image?: string;
}

/**
 * Agent Runtime health check configuration
 */
export interface AgentRuntimeHealthCheckConfig {
  /** Failure threshold before marking unhealthy */
  failureThreshold?: number;
  /** HTTP GET URL for health check */
  httpGetUrl?: string;
  /** Initial delay before first health check (seconds) */
  initialDelaySeconds?: number;
  /** Health check interval (seconds) */
  periodSeconds?: number;
  /** Success threshold before marking healthy */
  successThreshold?: number;
  /** Health check timeout (seconds) */
  timeoutSeconds?: number;
}

/**
 * Agent Runtime log configuration
 */
export interface AgentRuntimeLogConfig {
  /** SLS project name */
  project: string;
  /** SLS logstore name */
  logstore: string;
}

/**
 * Agent Runtime protocol configuration
 */
export interface AgentRuntimeProtocolConfig {
  /** Protocol type */
  type?: AgentRuntimeProtocolType;
}

/**
 * Endpoint routing weight configuration
 */
export interface AgentRuntimeEndpointRoutingWeight {
  /** Version identifier */
  version?: string;
  /** Weight value */
  weight?: number;
}

/**
 * Endpoint routing configuration
 */
export interface AgentRuntimeEndpointRoutingConfig {
  /** Version weights list */
  versionWeights?: AgentRuntimeEndpointRoutingWeight[];
}

/**
 * Agent Runtime create input
 */
export interface AgentRuntimeCreateInput {
  /** Agent Runtime name */
  agentRuntimeName?: string;
  /** Artifact type (Code or Container) */
  artifactType?: AgentRuntimeArtifact;
  /** Code configuration */
  codeConfiguration?: AgentRuntimeCode;
  /** Container configuration */
  containerConfiguration?: AgentRuntimeContainer;
  /** CPU cores */
  cpu?: number;
  /** Credential name */
  credentialName?: string;
  /** Description */
  description?: string;
  /** Environment variables */
  environmentVariables?: Record<string, string>;
  /** Execution role ARN */
  executionRoleArn?: string;
  /** Health check configuration */
  healthCheckConfiguration?: AgentRuntimeHealthCheckConfig;
  /** Log configuration */
  logConfiguration?: AgentRuntimeLogConfig;
  /** Memory in MB */
  memory?: number;
  /** Network configuration */
  networkConfiguration?: NetworkConfig;
  /** Port number */
  port?: number;
  /** Protocol configuration */
  protocolConfiguration?: AgentRuntimeProtocolConfig;
  /** Session concurrency limit per instance */
  sessionConcurrencyLimitPerInstance?: number;
  /** Session idle timeout in seconds */
  sessionIdleTimeoutSeconds?: number;
  /** Tags */
  tags?: string[];
}

/**
 * Agent Runtime update input
 */
export interface AgentRuntimeUpdateInput {
  /** Agent Runtime name */
  agentRuntimeName?: string;
  /** Artifact type (Code or Container) */
  artifactType?: AgentRuntimeArtifact;
  /** Code configuration */
  codeConfiguration?: AgentRuntimeCode;
  /** Container configuration */
  containerConfiguration?: AgentRuntimeContainer;
  /** CPU cores */
  cpu?: number;
  /** Credential name */
  credentialName?: string;
  /** Description */
  description?: string;
  /** Environment variables */
  environmentVariables?: Record<string, string>;
  /** Execution role ARN */
  executionRoleArn?: string;
  /** Health check configuration */
  healthCheckConfiguration?: AgentRuntimeHealthCheckConfig;
  /** Log configuration */
  logConfiguration?: AgentRuntimeLogConfig;
  /** Memory in MB */
  memory?: number;
  /** Network configuration */
  networkConfiguration?: NetworkConfig;
  /** Port number */
  port?: number;
  /** Protocol configuration */
  protocolConfiguration?: AgentRuntimeProtocolConfig;
  /** Session concurrency limit per instance */
  sessionConcurrencyLimitPerInstance?: number;
  /** Session idle timeout in seconds */
  sessionIdleTimeoutSeconds?: number;
  /** Tags */
  tags?: string[];
}

/**
 * Agent Runtime list input
 */
export interface AgentRuntimeListInput extends PageableInput {
  /** Filter by name */
  agentRuntimeName?: string;
  /** Filter by tags (comma separated) */
  tags?: string;
  /** Search mode */
  searchMode?: string;
}

/**
 * Agent Runtime endpoint create input
 */
export interface AgentRuntimeEndpointCreateInput {
  /** Endpoint name */
  agentRuntimeEndpointName?: string;
  /** Description */
  description?: string;
  /** Routing configuration */
  routingConfiguration?: AgentRuntimeEndpointRoutingConfig;
  /** Tags */
  tags?: string[];
  /** Target version */
  targetVersion?: string;
}

/**
 * Agent Runtime endpoint update input
 */
export interface AgentRuntimeEndpointUpdateInput {
  /** Endpoint name */
  agentRuntimeEndpointName?: string;
  /** Description */
  description?: string;
  /** Routing configuration */
  routingConfiguration?: AgentRuntimeEndpointRoutingConfig;
  /** Tags */
  tags?: string[];
  /** Target version */
  targetVersion?: string;
}

/**
 * Agent Runtime endpoint list input
 */
export interface AgentRuntimeEndpointListInput extends PageableInput {
  /** Filter by endpoint name */
  endpointName?: string;
  /** Search mode */
  searchMode?: string;
}

/**
 * Agent Runtime version
 */
export interface AgentRuntimeVersion {
  /** Agent Runtime ARN */
  agentRuntimeArn?: string;
  /** Agent Runtime ID */
  agentRuntimeId?: string;
  /** Agent Runtime name */
  agentRuntimeName?: string;
  /** Version number */
  agentRuntimeVersion?: string;
  /** Version description */
  description?: string;
  /** Last update timestamp */
  lastUpdatedAt?: string;
}

/**
 * Agent Runtime version list input
 */
export interface AgentRuntimeVersionListInput extends PageableInput {}

/**
 * Agent Runtime data (internal representation from API)
 */
export interface AgentRuntimeData {
  agentRuntimeArn?: string;
  agentRuntimeId?: string;
  agentRuntimeName?: string;
  agentRuntimeVersion?: string;
  artifactType?: string;
  codeConfiguration?: AgentRuntimeCode;
  containerConfiguration?: AgentRuntimeContainer;
  cpu?: number;
  createdAt?: string;
  credentialName?: string;
  description?: string;
  environmentVariables?: Record<string, string>;
  executionRoleArn?: string;
  healthCheckConfiguration?: AgentRuntimeHealthCheckConfig;
  lastUpdatedAt?: string;
  logConfiguration?: AgentRuntimeLogConfig;
  memory?: number;
  networkConfiguration?: NetworkConfig;
  port?: number;
  protocolConfiguration?: AgentRuntimeProtocolConfig;
  resourceName?: string;
  sessionConcurrencyLimitPerInstance?: number;
  sessionIdleTimeoutSeconds?: number;
  status?: Status;
  statusReason?: string;
  tags?: string[];
}

/**
 * Agent Runtime endpoint data (internal representation from API)
 */
export interface AgentRuntimeEndpointData {
  agentRuntimeEndpointArn?: string;
  agentRuntimeEndpointId?: string;
  agentRuntimeEndpointName?: string;
  agentRuntimeId?: string;
  description?: string;
  endpointPublicUrl?: string;
  resourceName?: string;
  routingConfiguration?: AgentRuntimeEndpointRoutingConfig;
  status?: Status;
  statusReason?: string;
  tags?: string[];
  targetVersion?: string;
}

export { Status, NetworkConfig };
