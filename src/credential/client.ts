/**
 * Credential Client
 *
 * 此模块提供 Credential 的客户端 API。
 * This module provides the client API for Credential.
 */

import { HTTPError } from '../utils';
import { Config } from '../utils/config';

import * as $AgentRun from '@alicloud/agentrun20250910';
import { CredentialControlAPI } from './api/control';
import { Credential } from './credential';
import {
  CredentialCreateInput,
  CredentialListInput,
  CredentialListOutput,
  CredentialUpdateInput,
} from './model';

/**
 * Credential Client
 *
 * 提供 Credential 的创建、删除、更新、查询功能。
 * Provides create, delete, update, query functions for Credential.
 */
export class CredentialClient {
  private config?: Config;
  private controlApi: CredentialControlAPI;

  constructor(config?: Config) {
    this.config = config;
    this.controlApi = new CredentialControlAPI(config);
  }

  /**
   * Create a Credential
   */
  create = async (params: {
    input: CredentialCreateInput;
    config?: Config;
  }): Promise<Credential> => {
    try {
      const { input, config } = params;
      const cfg = Config.withConfigs(this.config, config);

      // Normalize credentialConfig to SDK expected field names.
      const credCfg = input.credentialConfig as any | undefined;
      const normalized = {
        ...input,
        credentialAuthType: credCfg?.credentialAuthType ?? credCfg?.authType,
        credentialSourceType: credCfg?.credentialSourceType ?? credCfg?.sourceType,
        credentialPublicConfig: credCfg?.credentialPublicConfig ?? credCfg?.publicConfig,
        credentialSecret: credCfg?.credentialSecret ?? credCfg?.secret,
      };

      // Ensure users field is always present in credentialPublicConfig
      if (normalized.credentialPublicConfig) {
        const publicConfig = normalized.credentialPublicConfig as any;
        if (!('users' in publicConfig)) {
          publicConfig.users = [];
        }
      }

      // Special-case: tests may provide a simplified Basic auth shape
      if (normalized.credentialAuthType === 'basic') {
        const pub = normalized.credentialPublicConfig ?? {};
        // If tests provided `username` and `secret`, convert to users array
        if (pub.username) {
          normalized.credentialPublicConfig = {
            users: [
              {
                username: pub.username,
                password: normalized.credentialSecret ?? '',
              },
            ],
          };
          // server validation expects no credentialSecret for basic
          normalized.credentialSecret = '';
        }
      }
      const result = await this.controlApi.createCredential({
        input: new $AgentRun.CreateCredentialInput(normalized),
        config: cfg,
      });

      return new Credential(result);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential', params?.input?.credentialName);
      }

      throw error;
    }
  };

  /**
   * Delete a Credential
   */
  delete = async (params: { name: string; config?: Config }): Promise<Credential> => {
    try {
      const { name, config } = params;
      const cfg = Config.withConfigs(this.config, config);
      const result = await this.controlApi.deleteCredential({
        credentialName: name,
        config: cfg,
      });

      return new Credential(result);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential', params?.name);
      }

      throw error;
    }
  };

  /**
   * Update a Credential
   */
  update = async (params: {
    name: string;
    input: CredentialUpdateInput;
    config?: Config;
  }): Promise<Credential> => {
    try {
      const { name, input, config } = params;
      const cfg = Config.withConfigs(this.config, config);
      const credCfg = input.credentialConfig as any | undefined;
      const normalized: any = { ...input };
      if (credCfg) {
        normalized.credentialAuthType = credCfg?.credentialAuthType ?? credCfg?.authType;
        normalized.credentialSourceType = credCfg?.credentialSourceType ?? credCfg?.sourceType;
        normalized.credentialPublicConfig =
          credCfg?.credentialPublicConfig ?? credCfg?.publicConfig;
        normalized.credentialSecret = credCfg?.credentialSecret ?? credCfg?.secret;

        // Ensure users field is always present in credentialPublicConfig
        if (normalized.credentialPublicConfig) {
          const publicConfig = normalized.credentialPublicConfig as any;
          if (!('users' in publicConfig)) {
            publicConfig.users = [];
          }
        }

        if (normalized.credentialAuthType === 'basic') {
          const pub = normalized.credentialPublicConfig ?? {};
          if (pub.username) {
            normalized.credentialPublicConfig = {
              users: [
                {
                  username: pub.username,
                  password: normalized.credentialSecret ?? '',
                },
              ],
            };
            normalized.credentialSecret = '';
          }
        }
      }
      const result = await this.controlApi.updateCredential({
        credentialName: name,
        input: new $AgentRun.UpdateCredentialInput(normalized),
        config: cfg,
      });

      return new Credential(result as any);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential', params?.name);
      }

      throw error;
    }
  };

  /**
   * Get a Credential
   */
  get = async (params: { name: string; config?: Config }): Promise<Credential> => {
    try {
      const { name, config } = params;
      const cfg = Config.withConfigs(this.config, config);

      const result = await this.controlApi.getCredential({
        credentialName: name,
        config: cfg,
      });
      return new Credential(result as any);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential', params?.name);
      }

      throw error;
    }
  };

  /**
   * List Credentials
   */
  list = async (params?: {
    input?: CredentialListInput;
    config?: Config;
  }): Promise<CredentialListOutput[]> => {
    try {
      const { input, config } = params ?? {};
      const cfg = Config.withConfigs(this.config, config);
      const results = await this.controlApi.listCredentials({
        input: new $AgentRun.ListCredentialsRequest({ ...input }),
        config: cfg,
      });

      return results.items?.map(item => new CredentialListOutput(item as any)) ?? [];
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Credential');
      }

      throw error;
    }
  };
}
