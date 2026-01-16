/**
 * Credential Resource
 *
 * 此模块定义 Credential 资源类。
 * This module defines the Credential resource class.
 */

import { Config } from '../utils/config';
import { HTTPError } from '../utils/exception';
import {
  listAllResourcesFunction,
  updateObjectProperties,
} from '../utils/resource';

import { ResourceBase } from '../utils/resource';
import { CredentialClient } from './client';
import {
  CredentialAuthType,
  CredentialCreateInput,
  CredentialInterface,
  CredentialListInput,
  CredentialListOutput,
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

  constructor(data?: CredentialInterface, config?: Config) {
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
    const input: CredentialCreateInput = hasInputProp
      ? paramsOrInput.input
      : paramsOrInput;
    const config: Config | undefined = hasInputProp
      ? paramsOrInput.config
      : undefined;
    const client = Credential.getClient();
    try {
      return await client.create({ input, config });
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential', input.credentialName || '');
      }
      throw error;
    }
  };

  /**
   * Delete a Credential by name
   */
  static delete = async (paramsOrName: any) => {
    // Accept either (name: string) or ({ name, config })
    const isString = typeof paramsOrName === 'string';
    const name: string = isString ? paramsOrName : paramsOrName.name;
    const config: Config | undefined = isString
      ? undefined
      : paramsOrName.config;
    const client = Credential.getClient();
    try {
      return await client.delete({ name, config });
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential', name);
      }
      throw error;
    }
  };

  /**
   * Update a Credential by name
   */
  static update = async (paramsOrName: any) => {
    // Accept either (name, input) wrapped as object or ({ name, input, config })
    const name: string = paramsOrName.name;
    const input: CredentialUpdateInput = paramsOrName.input;
    const config: Config | undefined = paramsOrName.config;
    const client = Credential.getClient();
    try {
      return await client.update({ name, input, config });
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential', name);
      }
      throw error;
    }
  };

  /**
   * Get a Credential by name
   */
  static get = async (paramsOrName: any) => {
    // Accept either name string or { name, config }
    const isString = typeof paramsOrName === 'string';
    const name: string = isString ? paramsOrName : paramsOrName.name;
    const config: Config | undefined = isString
      ? undefined
      : paramsOrName.config;
    const client = Credential.getClient();
    try {
      return await client.get({ name, config });
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential', name);
      }
      throw error;
    }
  };

  /**
   * List all Credentials (with pagination)
   */
  static list = async (paramsOrUndefined?: any) => {
    const input = paramsOrUndefined?.input ?? paramsOrUndefined;
    const config: Config | undefined = paramsOrUndefined?.config;
    const client = Credential.getClient();
    try {
      return await client.list({ input, config });
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential', 'list');
      }
      throw error;
    }
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
