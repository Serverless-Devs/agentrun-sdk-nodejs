/**
 * Credential Data Models
 *
 * 此模块定义 Credential 相关的所有数据模型。
 * This module defines all data models related to Credential.
 */

import { PageableInput } from '../utils/model';
import { updateObjectProperties } from '../utils/resource';
import { Config } from '../utils/config';

/** 凭证认证类型 / Credential Authentication Types */
export type CredentialAuthType =
  | 'jwt'
  | 'api_key'
  | 'basic'
  | 'aksk'
  | 'custom_header';

/** 凭证来源类型 / Credential Source Types */
export type CredentialSourceType =
  | 'external_llm'
  | 'external_tool'
  | 'internal';

/**
 * Credential basic authentication configuration
 */
export interface CredentialBasicAuth {
  /** Username */
  username?: string;
  /** Password */
  password?: string;
}

/**
 * Related resource for credential
 */
export interface RelatedResource {
  /** 资源 IDj*/
  resourceId?: string;
  /** 资源名称j*/
  resourceName?: string;
  /** 资源类型j*/
  resourceType?: string;
}

export interface CredentialConfigInterface {
  /** 凭证认证类型 */
  credentialAuthType?: CredentialAuthType;
  /** 凭证来源类型 */
  credentialSourceType?: CredentialSourceType;
  /** 凭证公共配置 */
  credentialPublicConfig?: Record<string, any>;
  /** 凭证密钥 */
  credentialSecret?: string;
}

/**
 * 凭证配置 / Credential configuration
 */
export class CredentialConfig implements CredentialConfigInterface {
  constructor(data?: CredentialConfigInterface) {
    if (data) updateObjectProperties(this, data);
  }

  /** 配置访问 AgentRun 的 api key 凭证 */
  static inboundApiKey(params: { apiKey: string; headerKey?: string }) {
    const { apiKey, headerKey = 'Authorization' } = params;
    return new CredentialConfig({
      credentialSourceType: 'internal',
      credentialAuthType: 'api_key',
      credentialPublicConfig: { headerKey },
      credentialSecret: apiKey,
    });
  }

  /** 配置访问 AgentRun 的静态 JWKS 凭证 */
  static inboundStaticJwt(params: { jwks: string }) {
    const { jwks } = params;
    return new CredentialConfig({
      credentialSourceType: 'internal',
      credentialAuthType: 'jwt',
      credentialPublicConfig: { authType: 'static_jwks', jwks },
      credentialSecret: '',
    });
  }

  /** 配置访问 AgentRun 的远程 JWT 凭证 */
  static inboundRemoteJwt(
    uri: string,
    timeout: number = 3000,
    ttl: number = 30000,
    publicConfig?: Record<string, any>
  ) {
    return new CredentialConfig({
      credentialSourceType: 'internal',
      credentialAuthType: 'jwt',
      credentialPublicConfig: { uri, timeout, ttl, ...publicConfig },
      credentialSecret: '',
    });
  }

  /** 配置访问 AgentRun 的 Basic 凭证 */
  static inboundBasic(params: { users: CredentialBasicAuth[] }) {
    const { users } = params;
    return new CredentialConfig({
      credentialSourceType: 'internal',
      credentialAuthType: 'basic',
      credentialPublicConfig: { users },
      credentialSecret: '',
    });
  }

  /** 配置访问第三方工具的 api key 凭证 */
  static outboundLLMApiKey(params: { apiKey: string; provider: string }) {
    const { apiKey, provider } = params;
    return new CredentialConfig({
      credentialSourceType: 'external_llm',
      credentialAuthType: 'api_key',
      credentialPublicConfig: { provider },
      credentialSecret: apiKey,
    });
  }

  /** 配置访问第三方工具的 ak/sk 凭证 */
  static outboundLLMAKSK(
    provider: string,
    accessKeyId: string,
    accessKeySecret: string,
    accountId: string
  ) {
    return new CredentialConfig({
      credentialSourceType: 'external_tool',
      credentialAuthType: 'aksk',
      credentialPublicConfig: {
        provider,
        authConfig: { accessKey: accessKeyId, accountId: accountId },
      },
      credentialSecret: accessKeySecret,
    });
  }

  /** 配置访问第三方工具的自定义凭证 */
  static outboundToolAKSKCustom(params: {
    authConfig: Record<string, string>;
  }) {
    const { authConfig } = params;
    return new CredentialConfig({
      credentialSourceType: 'external_tool',
      credentialAuthType: 'aksk',
      credentialPublicConfig: { provider: 'custom', authConfig },
      credentialSecret: '',
    });
  }

  /** 配置访问第三方工具的自定义 Header 凭证 */
  static outboundToolCustomHeader(params: { headers: Record<string, string> }) {
    const { headers } = params;
    return new CredentialConfig({
      credentialSourceType: 'external_tool',
      credentialAuthType: 'custom_header',
      credentialPublicConfig: { authConfig: headers },
      credentialSecret: '',
    });
  }
}

/** 凭证公共配置 */
export interface CredentialMutableProps {
  /** 描述 */
  description?: string;
  /** 是否启用 */
  enabled?: boolean;
}

export interface CredentialImmutableProps {
  credentialName?: string;
}

export interface CredentialSystemProps {
  credentialId?: string;
  createdAt?: string;
  updatedAt?: string;
  relatedResources?: RelatedResource[];
}

export interface CredentialCreateInput
  extends CredentialMutableProps,
    CredentialImmutableProps {
  credentialConfig?: CredentialConfig;
}

/**
 * Credential update input
 */
export interface CredentialUpdateInput extends CredentialMutableProps {
  credentialConfig?: CredentialConfig;
}

/**
 * Credential list input
 */
export interface CredentialListInput extends PageableInput {
  credentialAuthType?: CredentialAuthType;
  credentialName?: string;
  credentialSourceType?: CredentialSourceType;
  provider?: string;
}

export class CredentialListOutput {
  createdAt?: string;
  credentialAuthType?: CredentialAuthType;
  credentialId?: string;
  credentialName?: string;
  credentialSourceType?: CredentialSourceType;
  enabled?: boolean;
  relatedResourceCount?: number;
  updatedAt?: string;

  constructor(data?: any) {
    if (data) updateObjectProperties(this, data);
  }

  uniqIdCallback = () => this.credentialId;

  toCredential = async (params?: { config?: Config }) => {
    const { CredentialClient } = await import('./client');
    return await new CredentialClient(params?.config).get({
      name: this.credentialName || '',
      config: params?.config,
    });
  };
}

/**
 * Credential resource class
 */

export interface CredentialInterface
  extends CredentialMutableProps,
    CredentialImmutableProps,
    CredentialSystemProps,
    CredentialConfigInterface {}
