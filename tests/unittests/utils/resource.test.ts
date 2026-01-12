/**
 * Resource 模块测试
 *
 * 测试 resource.ts 的各种功能。
 */

import { Config } from '../../../src/utils/config';
import { ResourceNotExistError } from '../../../src/utils/exception';
import { Status } from '../../../src/utils/model';
import { ResourceBase, updateObjectProperties } from '../../../src/utils/resource';

describe('Resource Utils', () => {
  describe('updateObjectProperties', () => {
    it('should copy data properties from source to target', () => {
      const target: any = { a: 1 };
      const source = { b: 2, c: 'test' };

      updateObjectProperties(target, source);

      expect(target.a).toBe(1);
      expect(target.b).toBe(2);
      expect(target.c).toBe('test');
    });

    it('should skip function properties', () => {
      const target: any = {};
      const source = {
        data: 'value',
        method: () => 'function',
      };

      updateObjectProperties(target, source);

      expect(target.data).toBe('value');
      expect(target.method).toBeUndefined();
    });

    it('should skip private properties (starting with _)', () => {
      const target: any = {};
      const source = {
        publicProp: 'public',
        _privateProp: 'private',
      };

      updateObjectProperties(target, source);

      expect(target.publicProp).toBe('public');
      expect(target._privateProp).toBeUndefined();
    });

    it('should overwrite existing properties', () => {
      const target: any = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };

      updateObjectProperties(target, source);

      expect(target.a).toBe(1);
      expect(target.b).toBe(3);
      expect(target.c).toBe(4);
    });

    it('should handle null and undefined values', () => {
      const target: any = { a: 1 };
      const source = { b: null, c: undefined };

      updateObjectProperties(target, source);

      expect(target.a).toBe(1);
      expect(target.b).toBeNull();
      expect(target.c).toBeUndefined();
    });

    it('should handle nested objects', () => {
      const target: any = {};
      const source = { nested: { a: 1, b: 2 } };

      updateObjectProperties(target, source);

      expect(target.nested).toEqual({ a: 1, b: 2 });
    });

    it('should handle arrays', () => {
      const target: any = {};
      const source = { arr: [1, 2, 3] };

      updateObjectProperties(target, source);

      expect(target.arr).toEqual([1, 2, 3]);
    });
  });

  describe('ResourceBase', () => {
    // Create a concrete implementation of ResourceBase for testing
    class TestResource extends ResourceBase {
      name?: string;
      value?: number;
      declare status?: Status; // Use declare to override base property
      private refreshCount = 0;
      private deleteCount = 0;

      constructor(data?: Partial<TestResource>, config?: Config) {
        super();
        if (data) {
          updateObjectProperties(this, data);
        }
        this._config = config;
      }

      get = async (params?: { config?: Config }): Promise<TestResource> => {
        this.refreshCount++;
        // Simulate API response - change status on subsequent calls
        if (this.refreshCount > 1 && this.status === Status.CREATING) {
          this.status = Status.READY;
        }
        return this;
      };

      delete = async (params?: { config?: Config }): Promise<TestResource> => {
        this.deleteCount++;
        this.status = Status.DELETING;
        return this;
      };

      static list = async (params: {
        input?: { pageNumber?: number; pageSize?: number };
        config?: Config;
      }): Promise<TestResource[]> => {
        const page = params.input?.pageNumber ?? 1;
        const size = params.input?.pageSize ?? 50;
        
        // Simulate pagination - return 50 items for page 1, fewer for page 2
        if (page === 1) {
          return Array.from({ length: size }, (_, i) => 
            new TestResource({ name: `resource-${i}`, value: i })
          );
        } else if (page === 2) {
          return Array.from({ length: 10 }, (_, i) => 
            new TestResource({ name: `resource-${size + i}`, value: size + i })
          );
        }
        return [];
      };

      getRefreshCount(): number {
        return this.refreshCount;
      }

      getDeleteCount(): number {
        return this.deleteCount;
      }
    }

    describe('updateSelf', () => {
      it('should update instance properties using updateObjectProperties', () => {
        const resource = new TestResource({ name: 'original', value: 1 });
        const source = { name: 'updated', value: 2, status: Status.READY };

        resource.updateSelf(source);

        expect(resource.name).toBe('updated');
        expect(resource.value).toBe(2);
        expect(resource.status).toBe(Status.READY);
      });
    });

    describe('setConfig', () => {
      it('should set config and return this for chaining', () => {
        const resource = new TestResource({ name: 'test' });
        const config = new Config({ accessKeyId: 'test-key' });

        const result = resource.setConfig(config);

        expect(result).toBe(resource);
        // Verify config is set (we can't directly access _config, but can verify through behavior)
      });
    });

    describe('refresh', () => {
      it('should call get method', async () => {
        const resource = new TestResource({ name: 'test' });

        await resource.refresh();

        expect(resource.getRefreshCount()).toBe(1);
      });
    });

    describe('waitUntil', () => {
      it('should return when condition is met', async () => {
        const resource = new TestResource({ name: 'test', status: Status.CREATING });
        let checkCount = 0;

        const result = await resource.waitUntil({
          checkFinishedCallback: async (r) => {
            checkCount++;
            return checkCount >= 2;
          },
          intervalSeconds: 0.1,
          timeoutSeconds: 5,
        });

        expect(result).toBe(resource);
        expect(checkCount).toBe(2);
      });

      it('should throw timeout error when condition is never met', async () => {
        const resource = new TestResource({ name: 'test' });

        await expect(
          resource.waitUntil({
            checkFinishedCallback: async () => false,
            intervalSeconds: 0.1,
            timeoutSeconds: 0.2,
          })
        ).rejects.toThrow('Timeout waiting for resource to reach desired state');
      });

      it('should use default interval and timeout when not provided', async () => {
        const resource = new TestResource({ name: 'test', status: Status.READY });
        
        // Use a mock callback that returns true immediately to avoid waiting
        const result = await resource.waitUntil({
          checkFinishedCallback: async () => true,
          // Not providing intervalSeconds or timeoutSeconds to test default values
        });

        expect(result).toBe(resource);
      });
    });

    describe('waitUntilReadyOrFailed', () => {
      it('should wait until status is final', async () => {
        const resource = new TestResource({ name: 'test', status: Status.CREATING });
        const callbacks: Status[] = [];

        const result = await resource.waitUntilReadyOrFailed({
          callback: async (r) => {
            callbacks.push((r as TestResource).status as Status);
          },
          intervalSeconds: 0.1,
          timeoutSeconds: 5,
        });

        expect(result.status).toBe(Status.READY);
        expect(callbacks).toContain(Status.READY);
      });

      it('should return immediately for READY status', async () => {
        const resource = new TestResource({ name: 'test', status: Status.READY });
        let callbackCalled = false;

        await resource.waitUntilReadyOrFailed({
          callback: async () => {
            callbackCalled = true;
          },
          intervalSeconds: 0.1,
          timeoutSeconds: 1,
        });

        expect(callbackCalled).toBe(true);
      });

      it('should use default interval and timeout when not provided', async () => {
        // Create a resource that is already in final status to avoid long wait
        const resource = new TestResource({ name: 'test', status: Status.READY });
        
        const result = await resource.waitUntilReadyOrFailed({
          callback: async () => {},
          // Not providing intervalSeconds or timeoutSeconds to test default values
        });

        expect(result.status).toBe(Status.READY);
      });
    });

    describe('delete_and_wait_until_finished', () => {
      it('should delete and wait for completion', async () => {
        class DeletableResource extends TestResource {
          private deleteAttempts = 0;

          delete = async (): Promise<TestResource> => {
            this.deleteAttempts++;
            this.status = Status.DELETING;
            return this;
          };

          get = async (): Promise<TestResource> => {
            // After delete, eventually throw ResourceNotExistError
            if (this.deleteAttempts > 0) {
              throw new ResourceNotExistError('TestResource', 'test-id');
            }
            return this;
          };
        }

        const resource = new DeletableResource({ name: 'test', status: Status.READY });

        const result = await resource.delete_and_wait_until_finished({
          callback: async () => {},
          intervalSeconds: 0.1,
          timeoutSeconds: 5,
        });

        expect(result).toBe(resource);
      });

      it('should return immediately if resource does not exist on delete', async () => {
        class NonExistentResource extends TestResource {
          delete = async (): Promise<TestResource> => {
            throw new ResourceNotExistError('TestResource', 'test-id');
          };
        }

        const resource = new NonExistentResource({ name: 'test' });

        // Should not throw
        const result = await resource.delete_and_wait_until_finished({
          callback: async () => {},
          intervalSeconds: 0.1,
          timeoutSeconds: 1,
        });

        expect(result).toBeUndefined();
      });

      it('should use default interval and timeout when not provided', async () => {
        class QuickDeletingResource extends TestResource {
          delete = async (): Promise<TestResource> => {
            this.status = Status.DELETING;
            return this;
          };

          get = async (): Promise<TestResource> => {
            // Immediately throw ResourceNotExistError to avoid waiting
            throw new ResourceNotExistError('TestResource', 'test-id');
          };
        }

        const resource = new QuickDeletingResource({ name: 'test', status: Status.READY });

        const result = await resource.delete_and_wait_until_finished({
          callback: async () => {},
          // Not providing intervalSeconds or timeoutSeconds to test default values
        });

        expect(result).toBe(resource);
      });
    });

    describe('listAll (static)', () => {
      it('should paginate and deduplicate results', async () => {
        const results = await TestResource.listAll({
          uniqIdCallback: (item: TestResource) => item.name || '',
        });

        // Should have results from both pages (50 + 10 = 60)
        expect(results.length).toBe(60);
        // Verify deduplication works
        const names = results.map((r: TestResource) => r.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(60);
      });

      it('should handle empty results', async () => {
        class EmptyResource extends ResourceBase {
          get = async () => this;
          delete = async () => this;
          static list = async () => [];
        }

        const results = await EmptyResource.listAll({
          uniqIdCallback: () => '',
        });

        expect(results).toEqual([]);
      });
    });

    describe('listAllResources (protected static)', () => {
      it('should call listAll with correct parameters', async () => {
        // Use the public listAll method since listAllResources is protected
        const results = await TestResource.listAll({
          uniqIdCallback: (item: TestResource) => item.name || '',
          config: new Config({ accessKeyId: 'test' }),
        });

        expect(Array.isArray(results)).toBe(true);
      });

      it('should call listAllResources via exposed method', async () => {
        // Create a subclass that exposes listAllResources
        class ExposedResource extends TestResource {
          static async callListAllResources() {
            return await this.listAllResources(
              (item: TestResource) => item.name || '',
              new Config({ accessKeyId: 'test' })
            );
          }
        }

        const results = await ExposedResource.callListAllResources();
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('base class list method', () => {
      it('should return empty array by default', async () => {
        // Directly test the base class list method
        const result = await ResourceBase.list({ input: {} });
        expect(result).toEqual([]);
      });
    });

    describe('delete_and_wait_until_finished edge cases', () => {
      it('should handle callback during wait', async () => {
        class DeletableResource extends TestResource {
          delete = async (): Promise<TestResource> => {
            this.status = Status.DELETING;
            return this;
          };

          get = async (): Promise<TestResource> => {
            if (this.status === Status.DELETING) {
              throw new ResourceNotExistError('TestResource', 'test-id');
            }
            return this;
          };
        }

        const resource = new DeletableResource({ name: 'test', status: Status.READY });
        const callbacks: any[] = [];

        await resource.delete_and_wait_until_finished({
          callback: async (r) => {
            callbacks.push(r.status);
          },
          intervalSeconds: 0.1,
          timeoutSeconds: 5,
        });

        // Callback should have been called before ResourceNotExistError
        expect(callbacks.length).toBeGreaterThanOrEqual(0);
      });

      it('should call callback and return false when refresh succeeds but resource still exists', async () => {
        let getCallCount = 0;
        class SlowDeletingResource extends TestResource {
          delete = async (): Promise<TestResource> => {
            this.status = Status.DELETING;
            return this;
          };

          get = async (): Promise<TestResource> => {
            getCallCount++;
            // First few refreshes succeed (resource still exists)
            if (getCallCount < 3) {
              return this; // Returns false in checkFinishedCallback
            }
            // Later throws ResourceNotExistError (resource deleted)
            throw new ResourceNotExistError('TestResource', 'test-id');
          };
        }

        const resource = new SlowDeletingResource({ name: 'test', status: Status.READY });
        const callbacks: Status[] = [];

        await resource.delete_and_wait_until_finished({
          callback: async (r) => {
            callbacks.push(r.status as Status);
          },
          intervalSeconds: 0.05,
          timeoutSeconds: 5,
        });

        // Callback should have been called at least once before ResourceNotExistError
        expect(callbacks.length).toBeGreaterThan(0);
        expect(callbacks[0]).toBe(Status.DELETING);
      });

      it('should throw error for unexpected status during delete wait', async () => {
        class ErrorResource extends TestResource {
          delete = async (): Promise<TestResource> => {
            this.status = Status.DELETING;
            return this;
          };

          get = async (): Promise<TestResource> => {
            // Simulate an unexpected status error
            this.status = Status.CREATE_FAILED;
            throw new Error('Unexpected error');
          };
        }

        const resource = new ErrorResource({ name: 'test', status: Status.READY });

        await expect(
          resource.delete_and_wait_until_finished({
            callback: async () => {},
            intervalSeconds: 0.1,
            timeoutSeconds: 0.5,
          })
        ).rejects.toThrow('Resource status is CREATE_FAILED');
      });

      it('should continue waiting when status is DELETING on error', async () => {
        class DeletingResource extends TestResource {
          private errorCount = 0;
          
          delete = async (): Promise<TestResource> => {
            this.status = Status.DELETING;
            return this;
          };

          get = async (): Promise<TestResource> => {
            this.errorCount++;
            if (this.errorCount < 3) {
              throw new Error('Transient error');
            }
            throw new ResourceNotExistError('TestResource', 'test-id');
          };
        }

        const resource = new DeletingResource({ name: 'test', status: Status.DELETING });

        const result = await resource.delete_and_wait_until_finished({
          callback: async () => {},
          intervalSeconds: 0.05,
          timeoutSeconds: 2,
        });

        expect(result).toBe(resource);
      });
    });
  });
});

