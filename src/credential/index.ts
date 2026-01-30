/**
 * Credential module exports
 */

import '@/utils/version-check';

export { CredentialClient } from './client';
export { Credential } from './credential';
export { CredentialControlAPI } from './api/control';

export { CredentialConfig } from './model';
export type {
  CredentialBasicAuth,
  RelatedResource,
  CredentialCreateInput,
  CredentialUpdateInput,
  CredentialListInput,
  CredentialListOutput,
} from './model';
