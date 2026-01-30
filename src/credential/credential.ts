/**
 * Credential Resource
 *
 * 此模块定义 Credential 资源类。
 * This module defines the Credential resource class.
 */

import { Config } from '../utils/config';
import { listAllResourcesFunction, updateObjectProperties } from '../utils/resource';

import { ResourceBase } from '../utils/resource';
import { CredentialClient } from './client';
import {
  CredentialAuthType,
  CredentialCreateInput,
  CredentialInterface,
  CredentialSourceType,
  CredentialUpdateInput,
  RelatedResource,
} from './model';

export class Credential extends ResourceBase implements CredentialInterface {
  credentialName?: string;
  /** 描述 */
  description?: string;
  /** 是否启用 */
  enabled?: boolean;
  credentialId?: string;
  createdAt?: string;
  updatedAt?: string;
  relatedResources?: RelatedResource[];
  /** 凭证认证类型 */
  credentialAuthType?: CredentialAuthType;
  /** 凭证来源类型 */
  credentialSourceType?: CredentialSourceType;
  /** 凭证公共配置 */
  credentialPublicConfig?: Record<string, any>;
  /** 凭证密钥 */
  credentialSecret?: string;

  protected _config?: Config;

  constructor(data?: any, config?: Config) {
    super();

    if (data) updateObjectProperties(this, data);
    this._config = config;
  }

  private static getClient = () => {
    return new CredentialClient();
  };

  /**
   * Create a new Credential
   */
  static create = async (paramsOrInput: any) => {
    // Backwards compatibility: allow calling Credential.create(input)
    const hasInputProp = paramsOrInput && paramsOrInput.input !== undefined;
    const input: CredentialCreateInput = hasInputProp ? paramsOrInput.input : paramsOrInput;
    const config: Config | undefined = hasInputProp ? paramsOrInput.config : undefined;
    return await Credential.getClient().create({ input, config });
  };

  /**
   * Delete a Credential by name
   */
  static delete = async (paramsOrName: any) => {
    // Accept either (name: string) or ({ name, config })
    const isString = typeof paramsOrName === 'string';
    const name: string = isString ? paramsOrName : paramsOrName.name;
    const config: Config | undefined = isString ? undefined : paramsOrName.config;
    return await Credential.getClient().delete({ name, config });
  };

  /**
   * Update a Credential by name
   */
  static update = async (paramsOrName: any) => {
    // Accept either (name, input) wrapped as object or ({ name, input, config })
    const name: string = paramsOrName.name;
    const input: CredentialUpdateInput = paramsOrName.input;
    const config: Config | undefined = paramsOrName.config;
    return await Credential.getClient().update({ name, input, config });
  };

  /**
   * Get a Credential by name
   */
  static get = async (paramsOrName: any) => {
    // Accept either name string or { name, config }
    const isString = typeof paramsOrName === 'string';
    const name: string = isString ? paramsOrName : paramsOrName.name;
    const config: Config | undefined = isString ? undefined : paramsOrName.config;
    return await Credential.getClient().get({ name, config });
  };

  /**
   * List all Credentials (with pagination)
   */
  static list = async (paramsOrUndefined?: any) => {
    const input = paramsOrUndefined?.input ?? paramsOrUndefined;
    const config: Config | undefined = paramsOrUndefined?.config;
    return await Credential.getClient().list({ input, config });
  };

  static listAll = listAllResourcesFunction(this.list);

  /**
   * Delete this credential
   */
  delete = async (params?: any) => {
    const config: Config | undefined = params?.config;
    if (!this.credentialName) {
      throw new Error('credentialName is required to delete a Credential');
    }

    const result = await Credential.delete({
      name: this.credentialName,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Update this credential
   */
  update = async (params: any) => {
    // Allow calling update(updateInput) for backward compatibility
    const hasInputProp = params && params.input !== undefined;
    const input: CredentialUpdateInput = hasInputProp ? params.input : params;
    const config: Config | undefined = hasInputProp ? params.config : undefined;

    if (!this.credentialName) {
      throw new Error('credentialName is required to update a Credential');
    }

    const result = await Credential.update({
      name: this.credentialName,
      input,
      config: config ?? this._config,
    });

    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Refresh this credential's data
   */
  get = async (params?: any): Promise<Credential> => {
    const config: Config | undefined = params?.config;
    if (!this.credentialName) {
      throw new Error('credentialName is required to refresh a Credential');
    }

    const result = await Credential.get({
      name: this.credentialName,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };
}
