/**
 * Configuration Management Module
 *
 * 此模块提供 AgentRun SDK 的全局配置管理功能。
 * This module provides global configuration management for AgentRun SDK.
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Get environment variable with fallback keys
 */
function getEnvWithDefault(defaultValue: string, ...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }
  return defaultValue;
}

/**
 * Configuration options for AgentRun SDK
 */
export interface ConfigOptions {
  /**
   * Access Key ID for authentication.
   * Read from AGENTRUN_ACCESS_KEY_ID or ALIBABA_CLOUD_ACCESS_KEY_ID if not provided.
   */
  accessKeyId?: string;

  /**
   * Access Key Secret for authentication.
   * Read from AGENTRUN_ACCESS_KEY_SECRET or ALIBABA_CLOUD_ACCESS_KEY_SECRET if not provided.
   */
  accessKeySecret?: string;

  /**
   * Security token for STS authentication.
   * Read from AGENTRUN_SECURITY_TOKEN or ALIBABA_CLOUD_SECURITY_TOKEN if not provided.
   */
  securityToken?: string;

  /**
   * Account ID.
   * Read from AGENTRUN_ACCOUNT_ID or FC_ACCOUNT_ID if not provided.
   */
  accountId?: string;

  /**
   * Custom token for data API calls.
   */
  token?: string;

  /**
   * Region ID. Defaults to cn-hangzhou.
   * Read from AGENTRUN_REGION or FC_REGION if not provided.
   */
  regionId?: string;

  /**
   * Request timeout in milliseconds. Defaults to 600000 (10 minutes).
   */
  timeout?: number;

  /**
   * Read timeout in milliseconds. Defaults to 100000000.
   */
  readTimeout?: number;

  /**
   * Custom control API endpoint.
   * Read from AGENTRUN_CONTROL_ENDPOINT if not provided.
   */
  controlEndpoint?: string;

  /**
   * Custom data API endpoint.
   * Read from AGENTRUN_DATA_ENDPOINT if not provided.
   */
  dataEndpoint?: string;

  /**
   * Custom DevS API endpoint.
   * Read from DEVS_ENDPOINT if not provided.
   */
  devsEndpoint?: string;

  /**
   * Custom request headers.
   */
  headers?: Record<string, string>;
}

/**
 * AgentRun SDK Global Configuration Class
 *
 * 用于管理账号凭证和客户端配置。
 * Used for managing account credentials and client configuration.
 *
 * @example
 * ```typescript
 * // Create config from parameters
 * const config = new Config({
 *   accountId: 'your-account-id',
 *   accessKeyId: 'your-key-id',
 *   accessKeySecret: 'your-secret',
 * });
 *
 * // Or read from environment variables
 * const config = new Config();
 * ```
 */
export class Config {
  private _accessKeyId: string;
  private _accessKeySecret: string;
  private _securityToken: string;
  private _accountId: string;
  private _token?: string;
  private _regionId: string;
  private _timeout: number;
  private _readTimeout: number;
  private _controlEndpoint: string;
  private _dataEndpoint: string;
  private _devsEndpoint: string;
  private _headers: Record<string, string>;

  constructor(options: ConfigOptions = {}) {
    this._accessKeyId =
      options.accessKeyId ??
      getEnvWithDefault('', 'AGENTRUN_ACCESS_KEY_ID', 'ALIBABA_CLOUD_ACCESS_KEY_ID');

    this._accessKeySecret =
      options.accessKeySecret ??
      getEnvWithDefault('', 'AGENTRUN_ACCESS_KEY_SECRET', 'ALIBABA_CLOUD_ACCESS_KEY_SECRET');

    this._securityToken =
      options.securityToken ??
      getEnvWithDefault('', 'AGENTRUN_SECURITY_TOKEN', 'ALIBABA_CLOUD_SECURITY_TOKEN');

    this._accountId =
      options.accountId ?? getEnvWithDefault('', 'AGENTRUN_ACCOUNT_ID', 'FC_ACCOUNT_ID');

    this._token = options.token;

    this._regionId =
      options.regionId ?? getEnvWithDefault('cn-hangzhou', 'AGENTRUN_REGION', 'FC_REGION');

    this._timeout = options.timeout ?? 600000;
    this._readTimeout = options.readTimeout ?? 100000000;

    this._controlEndpoint =
      options.controlEndpoint ?? getEnvWithDefault('', 'AGENTRUN_CONTROL_ENDPOINT');

    this._dataEndpoint = options.dataEndpoint ?? getEnvWithDefault('', 'AGENTRUN_DATA_ENDPOINT');

    this._devsEndpoint = options.devsEndpoint ?? getEnvWithDefault('', 'DEVS_ENDPOINT');

    this._headers = options.headers ?? {};
  }

  /**
   * Create a new Config by merging multiple configs.
   * Later configs take precedence.
   */
  static withConfigs(...configs: (Config | undefined)[]): Config {
    return new Config().update(...configs);
  }

  /**
   * Update this config with values from other configs.
   * Non-undefined values from later configs take precedence.
   */
  update(...configs: (Config | undefined)[]): Config {
    for (const config of configs) {
      if (!config) continue;

      if (config._accessKeyId) this._accessKeyId = config._accessKeyId;
      if (config._accessKeySecret) this._accessKeySecret = config._accessKeySecret;
      if (config._securityToken) this._securityToken = config._securityToken;
      if (config._accountId) this._accountId = config._accountId;
      if (config._token) this._token = config._token;
      if (config._regionId) this._regionId = config._regionId;
      if (config._timeout) this._timeout = config._timeout;
      if (config._readTimeout) this._readTimeout = config._readTimeout;
      if (config._controlEndpoint) this._controlEndpoint = config._controlEndpoint;
      if (config._dataEndpoint) this._dataEndpoint = config._dataEndpoint;
      if (config._devsEndpoint) this._devsEndpoint = config._devsEndpoint;
      if (config._headers && Object.keys(config._headers).length > 0) {
        this._headers = { ...this._headers, ...config._headers };
      }
    }
    return this;
  }

  get accessKeyId(): string {
    return this._accessKeyId;
  }

  get accessKeySecret(): string {
    return this._accessKeySecret;
  }

  get securityToken(): string {
    return this._securityToken;
  }

  get accountId(): string {
    if (!this._accountId) {
      throw new Error(
        'Account ID is not set. Please add AGENTRUN_ACCOUNT_ID environment variable or set it in code.'
      );
    }
    return this._accountId;
  }

  get token(): string | undefined {
    return this._token;
  }

  get regionId(): string {
    return this._regionId || 'cn-hangzhou';
  }

  get timeout(): number {
    return this._timeout || 600000;
  }

  get readTimeout(): number {
    return this._readTimeout || 100000000;
  }

  get controlEndpoint(): string {
    if (this._controlEndpoint) {
      return this._controlEndpoint;
    }
    return `https://agentrun.${this.regionId}.aliyuncs.com`;
  }

  get dataEndpoint(): string {
    if (this._dataEndpoint) {
      return this._dataEndpoint;
    }
    return `https://${this.accountId}.agentrun-data.${this.regionId}.aliyuncs.com`;
  }

  get devsEndpoint(): string {
    if (this._devsEndpoint) {
      return this._devsEndpoint;
    }
    return `https://devs.${this.regionId}.aliyuncs.com`;
  }

  get headers(): Record<string, string> {
    return this._headers;
  }
}
