/**
 * Resource 模块测试
 *
 * 测试 resource.ts 的各种功能。
 */

import { Config } from '../../../src/utils/config';
import { ResourceNotExistError } from '../../../src/utils/exception';
import { PageableInput, Status } from '../../../src/utils/model';
import {
  listAllResourcesFunction,
  ResourceBase,
  updateObjectProperties,
} from '../../../src/utils/resource';

// describe('Resource Utils', () => {
//   describe('updateObjectProperties', () => {
//     it('should copy data properties from source to target', () => {
//       const target: any = { a: 1 };
//       const source = { b: 2, c: 'test' };

//       updateObjectProperties(target, source);

//       expect(target.a).toBe(1);
//       expect(target.b).toBe(2);
//       expect(target.c).toBe('test');
//     });

//     it('should skip function properties', () => {
//       const target: any = {};
//       const source = {
//         data: 'value',
//         method: () => 'function',
//       };

//       updateObjectProperties(target, source);

//       expect(target.data).toBe('value');
//       expect(target.method).toBeUndefined();
//     });

//     it('should skip private properties (starting with _)', () => {
//       const target: any = {};
//       const source = {
//         publicProp: 'public',
//         _privateProp: 'private',
//       };

//       updateObjectProperties(target, source);

//       expect(target.publicProp).toBe('public');
//       expect(target._privateProp).toBeUndefined();
//     });

//     it('should overwrite existing properties', () => {
//       const target: any = { a: 1, b: 2 };
//       const source = { b: 3, c: 4 };

//       updateObjectProperties(target, source);

//       expect(target.a).toBe(1);
//       expect(target.b).toBe(3);
//       expect(target.c).toBe(4);
//     });

//     it('should handle null and undefined values', () => {
//       const target: any = { a: 1 };
//       const source = { b: null, c: undefined };

//       updateObjectProperties(target, source);

//       expect(target.a).toBe(1);
//       expect(target.b).toBeNull();
//       expect(target.c).toBeUndefined();
//     });

//     it('should handle nested objects', () => {
//       const target: any = {};
//       const source = { nested: { a: 1, b: 2 } };

//       updateObjectProperties(target, source);

//       expect(target.nested).toEqual({ a: 1, b: 2 });
//     });

//     it('should handle arrays', () => {
//       const target: any = {};
//       const source = { arr: [1, 2, 3] };

//       updateObjectProperties(target, source);

//       expect(target.arr).toEqual([1, 2, 3]);
//     });
//   });

//   describe('ResourceBase', () => {
//     // Create a concrete implementation of ResourceBase for testing
//     class TestResource extends ResourceBase {
//       name?: string;
//       value?: number;
//       declare status?: Status; // Use declare to override base property
//       private refreshCount = 0;
//       private deleteCount = 0;

//       constructor(data?: Partial<TestResource>, config?: Config) {
//         super();
//         if (data) {
//           updateObjectProperties(this, data);
//         }
//         this._config = config;
//       }

//       get = async (params?: { config?: Config }): Promise<TestResource> => {
//         this.refreshCount++;
//         // Simulate API response - change status on subsequent calls
//         if (this.refreshCount > 1 && this.status === Status.CREATING) {
//           this.status = Status.READY;
//         }
//         return this;
//       };

//       delete = async (params?: { config?: Config }): Promise<TestResource> => {
//         this.deleteCount++;
//         this.status = Status.DELETING;
//         return this;
//       };

//       static list = async (params: {
//         input?: { pageNumber?: number; pageSize?: number };
//         config?: Config;
//       }): Promise<TestResource[]> => {
//         const page = params.input?.pageNumber ?? 1;
//         const size = params.input?.pageSize ?? 50;

//         // Simulate pagination - return 50 items for page 1, fewer for page 2
//         if (page === 1) {
//           return Array.from(
//             { length: size },
//             (_, i) => new TestResource({ name: `resource-${i}`, value: i })
//           );
//         } else if (page === 2) {
//           return Array.from(
//             { length: 10 },
//             (_, i) =>
//               new TestResource({
//                 name: `resource-${size + i}`,
//                 value: size + i,
//               })
//           );
//         }
//         return [];
//       };

//       getRefreshCount(): number {
//         return this.refreshCount;
//       }

//       getDeleteCount(): number {
//         return this.deleteCount;
//       }
//     }

//     describe('updateSelf', () => {
//       it('should update instance properties using updateObjectProperties', () => {
//         const resource = new TestResource({ name: 'original', value: 1 });
//         const source = { name: 'updated', value: 2, status: Status.READY };

//         resource.updateSelf(source);

//         expect(resource.name).toBe('updated');
//         expect(resource.value).toBe(2);
//         expect(resource.status).toBe(Status.READY);
//       });
//     });

//     describe('setConfig', () => {
//       it('should set config and return this for chaining', () => {
//         const resource = new TestResource({ name: 'test' });
//         const config = new Config({ accessKeyId: 'test-key' });

//         const result = resource.setConfig(config);

//         expect(result).toBe(resource);
//         // Verify config is set (we can't directly access _config, but can verify through behavior)
//       });
//     });

//     describe('refresh', () => {
//       it('should call get method', async () => {
//         const resource = new TestResource({ name: 'test' });

//         await resource.refresh();

//         expect(resource.getRefreshCount()).toBe(1);
//       });
//     });

//     describe('waitUntil', () => {
//       it('should return when condition is met', async () => {
//         const resource = new TestResource({
//           name: 'test',
//           status: Status.CREATING,
//         });
//         let checkCount = 0;

//         const result = await resource.waitUntil({
//           checkFinishedCallback: async (r) => {
//             checkCount++;
//             return checkCount >= 2;
//           },
//           intervalSeconds: 0.1,
//           timeoutSeconds: 5,
//         });

//         expect(result).toBe(resource);
//         expect(checkCount).toBe(2);
//       });

//       it('should throw timeout error when condition is never met', async () => {
//         const resource = new TestResource({ name: 'test' });

//         await expect(
//           resource.waitUntil({
//             checkFinishedCallback: async () => false,
//             intervalSeconds: 0.1,
//             timeoutSeconds: 0.2,
//           })
//         ).rejects.toThrow(
//           'Timeout waiting for resource to reach desired state'
//         );
//       });

//       it('should use default interval and timeout when not provided', async () => {
//         const resource = new TestResource({
//           name: 'test',
//           status: Status.READY,
//         });

//         // Use a mock callback that returns true immediately to avoid waiting
//         const result = await resource.waitUntil({
//           checkFinishedCallback: async () => true,
//           // Not providing intervalSeconds or timeoutSeconds to test default values
//         });

//         expect(result).toBe(resource);
//       });
//     });

//     describe('waitUntilReadyOrFailed', () => {
//       it('should wait until status is final', async () => {
//         const resource = new TestResource({
//           name: 'test',
//           status: Status.CREATING,
//         });
//         const callbacks: Status[] = [];

//         const result = await resource.waitUntilReadyOrFailed({
//           callback: async (r) => {
//             callbacks.push((r as TestResource).status as Status);
//           },
//           intervalSeconds: 0.1,
//           timeoutSeconds: 5,
//         });

//         expect(result.status).toBe(Status.READY);
//         expect(callbacks).toContain(Status.READY);
//       });

//       it('should return immediately for READY status', async () => {
//         const resource = new TestResource({
//           name: 'test',
//           status: Status.READY,
//         });
//         let callbackCalled = false;

//         await resource.waitUntilReadyOrFailed({
//           callback: async () => {
//             callbackCalled = true;
//           },
//           intervalSeconds: 0.1,
//           timeoutSeconds: 1,
//         });

//         expect(callbackCalled).toBe(true);
//       });

//       it('should use default interval and timeout when not provided', async () => {
//         // Create a resource that is already in final status to avoid long wait
//         const resource = new TestResource({
//           name: 'test',
//           status: Status.READY,
//         });

//         const result = await resource.waitUntilReadyOrFailed({
//           callback: async () => {},
//           // Not providing intervalSeconds or timeoutSeconds to test default values
//         });

//         expect(result.status).toBe(Status.READY);
//       });
//     });

//     describe('delete_and_wait_until_finished', () => {
//       it('should delete and wait for completion', async () => {
//         class DeletableResource extends TestResource {
//           private deleteAttempts = 0;

//           delete = async (): Promise<TestResource> => {
//             this.deleteAttempts++;
//             this.status = Status.DELETING;
//             return this;
//           };

//           get = async (): Promise<TestResource> => {
//             // After delete, eventually throw ResourceNotExistError
//             if (this.deleteAttempts > 0) {
//               throw new ResourceNotExistError('TestResource', 'test-id');
//             }
//             return this;
//           };
//         }

//         const resource = new DeletableResource({
//           name: 'test',
//           status: Status.READY,
//         });

//         const result = await resource.delete_and_wait_until_finished({
//           callback: async () => {},
//           intervalSeconds: 0.1,
//           timeoutSeconds: 5,
//         });

//         expect(result).toBe(resource);
//       });

//       it('should return immediately if resource does not exist on delete', async () => {
//         class NonExistentResource extends TestResource {
//           delete = async (): Promise<TestResource> => {
//             throw new ResourceNotExistError('TestResource', 'test-id');
//           };
//         }

//         const resource = new NonExistentResource({ name: 'test' });

//         // Should not throw
//         const result = await resource.delete_and_wait_until_finished({
//           callback: async () => {},
//           intervalSeconds: 0.1,
//           timeoutSeconds: 1,
//         });

//         expect(result).toBeUndefined();
//       });

//       it('should use default interval and timeout when not provided', async () => {
//         class QuickDeletingResource extends TestResource {
//           delete = async (): Promise<TestResource> => {
//             this.status = Status.DELETING;
//             return this;
//           };

//           get = async (): Promise<TestResource> => {
//             // Immediately throw ResourceNotExistError to avoid waiting
//             throw new ResourceNotExistError('TestResource', 'test-id');
//           };
//         }

//         const resource = new QuickDeletingResource({
//           name: 'test',
//           status: Status.READY,
//         });

//         const result = await resource.delete_and_wait_until_finished({
//           callback: async () => {},
//           // Not providing intervalSeconds or timeoutSeconds to test default values
//         });

//         expect(result).toBe(resource);
//       });
//     });

//     describe('listAll (static)', () => {
//       it('should paginate and deduplicate results', async () => {
//         const results = await TestResource.listAll({
//           uniqIdCallback: (item: TestResource) => item.name || '',
//         });

//         // Should have results from both pages (50 + 10 = 60)
//         expect(results.length).toBe(60);
//         // Verify deduplication works
//         const names = results.map((r: TestResource) => r.name);
//         const uniqueNames = new Set(names);
//         expect(uniqueNames.size).toBe(60);
//       });

//       it('should handle empty results', async () => {
//         class EmptyResource extends ResourceBase {
//           get = async () => this;
//           delete = async () => this;
//           static list = async () => [];
//         }

//         const results = await EmptyResource.listAll({
//           uniqIdCallback: () => '',
//         });

//         expect(results).toEqual([]);
//       });
//     });

//     describe('listAllResources (protected static)', () => {
//       it('should call listAll with correct parameters', async () => {
//         // Use the public listAll method since listAllResources is protected
//         const results = await TestResource.listAll({
//           uniqIdCallback: (item: TestResource) => item.name || '',
//           config: new Config({ accessKeyId: 'test' }),
//         });

//         expect(Array.isArray(results)).toBe(true);
//       });

//       it('should call listAllResources via exposed method', async () => {
//         // Create a subclass that exposes listAllResources
//         class ExposedResource extends TestResource {
//           static async callListAllResources() {
//             return await this.listAllResources(
//               (item: TestResource) => item.name || '',
//               new Config({ accessKeyId: 'test' })
//             );
//           }
//         }

//         const results = await ExposedResource.callListAllResources();
//         expect(Array.isArray(results)).toBe(true);
//       });
//     });

//     describe('base class list method', () => {
//       it('should return empty array by default', async () => {
//         // Directly test the base class list method
//         const result = await ResourceBase.list({ input: {} });
//         expect(result).toEqual([]);
//       });
//     });

//     describe('delete_and_wait_until_finished edge cases', () => {
//       it('should handle callback during wait', async () => {
//         class DeletableResource extends TestResource {
//           delete = async (): Promise<TestResource> => {
//             this.status = Status.DELETING;
//             return this;
//           };

//           get = async (): Promise<TestResource> => {
//             if (this.status === Status.DELETING) {
//               throw new ResourceNotExistError('TestResource', 'test-id');
//             }
//             return this;
//           };
//         }

//         const resource = new DeletableResource({
//           name: 'test',
//           status: Status.READY,
//         });
//         const callbacks: any[] = [];

//         await resource.delete_and_wait_until_finished({
//           callback: async (r) => {
//             callbacks.push(r.status);
//           },
//           intervalSeconds: 0.1,
//           timeoutSeconds: 5,
//         });

//         // Callback should have been called before ResourceNotExistError
//         expect(callbacks.length).toBeGreaterThanOrEqual(0);
//       });

//       it('should call callback and return false when refresh succeeds but resource still exists', async () => {
//         let getCallCount = 0;
//         class SlowDeletingResource extends TestResource {
//           delete = async (): Promise<TestResource> => {
//             this.status = Status.DELETING;
//             return this;
//           };

//           get = async (): Promise<TestResource> => {
//             getCallCount++;
//             // First few refreshes succeed (resource still exists)
//             if (getCallCount < 3) {
//               return this; // Returns false in checkFinishedCallback
//             }
//             // Later throws ResourceNotExistError (resource deleted)
//             throw new ResourceNotExistError('TestResource', 'test-id');
//           };
//         }

//         const resource = new SlowDeletingResource({
//           name: 'test',
//           status: Status.READY,
//         });
//         const callbacks: Status[] = [];

//         await resource.delete_and_wait_until_finished({
//           callback: async (r) => {
//             callbacks.push(r.status as Status);
//           },
//           intervalSeconds: 0.05,
//           timeoutSeconds: 5,
//         });

//         // Callback should have been called at least once before ResourceNotExistError
//         expect(callbacks.length).toBeGreaterThan(0);
//         expect(callbacks[0]).toBe(Status.DELETING);
//       });

//       it('should throw error for unexpected status during delete wait', async () => {
//         class ErrorResource extends TestResource {
//           delete = async (): Promise<TestResource> => {
//             this.status = Status.DELETING;
//             return this;
//           };

//           get = async (): Promise<TestResource> => {
//             // Simulate an unexpected status error
//             this.status = Status.CREATE_FAILED;
//             throw new Error('Unexpected error');
//           };
//         }

//         const resource = new ErrorResource({
//           name: 'test',
//           status: Status.READY,
//         });

//         await expect(
//           resource.delete_and_wait_until_finished({
//             callback: async () => {},
//             intervalSeconds: 0.1,
//             timeoutSeconds: 0.5,
//           })
//         ).rejects.toThrow('Resource status is CREATE_FAILED');
//       });

//       it('should continue waiting when status is DELETING on error', async () => {
//         class DeletingResource extends TestResource {
//           private errorCount = 0;

//           delete = async (): Promise<TestResource> => {
//             this.status = Status.DELETING;
//             return this;
//           };

//           get = async (): Promise<TestResource> => {
//             this.errorCount++;
//             if (this.errorCount < 3) {
//               throw new Error('Transient error');
//             }
//             throw new ResourceNotExistError('TestResource', 'test-id');
//           };
//         }

//         const resource = new DeletingResource({
//           name: 'test',
//           status: Status.DELETING,
//         });

//         const result = await resource.delete_and_wait_until_finished({
//           callback: async () => {},
//           intervalSeconds: 0.05,
//           timeoutSeconds: 2,
//         });

//         expect(result).toBe(resource);
//       });
//     });
//   });
// });

describe('BaseResource', () => {
  class NewClass extends ResourceBase {
    id: string;
    getCount: number = 0;
    deleteCount: number = 0;
    declare status?: Status;

    constructor(id: string) {
      super();
      this.id = id;
    }

    async get() {
      this.getCount++;

      if (this.status === Status.DELETING && this.getCount >= 57)
        throw new ResourceNotExistError('BaseClass', this.id);

      return this;
    }

    async delete() {
      this.status = Status.DELETING;
      return this;
    }

    getStatus() {
      return this.status;
    }

    uniqIdCallback() {
      return this.id;
    }

    async customMethod() {
      return 'mock-custom-method';
    }

    static async list(params?: { input?: PageableInput; config?: Config }) {
      const { pageNumber = 1, pageSize = 10 } = params?.input || {};
      const start = (pageNumber - 1) * pageSize;

      const result = [];
      for (let i = start; i < start + pageSize && i < 57; i++) {
        result.push(new NewClass(`list-${i}`));
      }

      return result;
    }

    static listAll = listAllResourcesFunction(this.list);
  }

  // const NewClass = bindResourceBase(BaseClass);

  test('refresh', async () => {
    // const base = new BaseClass('mock-id');
    // for (let i = 0; i < 57; i++) await base.get();
    // expect(base.getCount).toBe(57);

    const newInstance = new NewClass('mock-id');
    for (let i = 0; i < 57; i++) await newInstance.refresh();
    expect(newInstance.getCount).toBe(57);
  });

  test('updateSelf', async () => {
    const newInstance = new NewClass('mock-id');
    newInstance.updateSelf({ id: 'abc' });
    console.log(newInstance);
    expect(newInstance.id).toBe('abc');
  });

  test('listAll', async () => {
    // expect(await BaseClass.list()).toHaveLength(10);
    // expect(await BaseClass.list({ input: { pageSize: 5 } })).toHaveLength(5);

    expect(await NewClass.list()).toHaveLength(10);
    expect(await NewClass.list({ input: { pageSize: 5 } })).toHaveLength(5);
    expect(await NewClass.listAll()).toHaveLength(57);
  });

  test('waitUntilReadyOrFailed', async () => {
    const newInstance = new NewClass('mock-id');
    newInstance.status = Status.CREATING;

    setTimeout(() => {
      newInstance.status = Status.READY;
    }, 2000);

    await newInstance.waitUntilReadyOrFailed({
      intervalSeconds: 1,
      timeoutSeconds: 5,
    });

    await newInstance.waitUntilReadyOrFailed({
      intervalSeconds: 1,
      timeoutSeconds: 5,
    });

    await newInstance.waitUntilReadyOrFailed();
  });

  test('waitUntilReadyOrFailed with only beforeCheck (no callback)', async () => {
    // Test the branch where callback is undefined but beforeCheck is defined
    const newInstance = new NewClass('mock-id');
    newInstance.status = Status.READY;

    const beforeCheck = jest.fn();

    await newInstance.waitUntilReadyOrFailed({
      callback: beforeCheck,
      intervalSeconds: 0.1,
      timeoutSeconds: 5,
    });

    expect(beforeCheck).toHaveBeenCalled();
  });

  test('waitUntilReadyOrFailed with no callbacks at all', async () => {
    // Test the branch where both callback and beforeCheck are undefined
    const newInstance = new NewClass('mock-id');
    newInstance.status = Status.READY;

    await newInstance.waitUntilReadyOrFailed({
      intervalSeconds: 0.1,
      timeoutSeconds: 5,
    });

    // Just verify it completes without error
    expect(newInstance.status).toBe(Status.READY);
  });

  test('waitUntil with default intervalSeconds and timeoutSeconds', async () => {
    // Test the default values for intervalSeconds and timeoutSeconds
    const newInstance = new NewClass('mock-id');
    newInstance.status = Status.READY;

    // Call waitUntil without intervalSeconds and timeoutSeconds to test defaults
    const result = await newInstance.waitUntil({
      checkFinishedCallback: async () => true, // Immediately return true
      // Not providing intervalSeconds or timeoutSeconds
    });

    expect(result).toBe(newInstance);
  });

  test('waitUntilReadyOrFailed timeout', async () => {
    const newInstance = new NewClass('mock-id');
    newInstance.status = Status.CREATING;

    await expect(
      newInstance.deleteAndWaitUntilFinished({
        intervalSeconds: 0.01,
        timeoutSeconds: 0.5,
      })
    ).rejects.toThrow(/Timeout/);

    const ins = await newInstance.deleteAndWaitUntilFinished({
      intervalSeconds: 0.01,
      timeoutSeconds: 1,
    });

    await expect(ins?.status).toBe(Status.DELETING);
  });

  test('deleteAndWaitUntilFinished', async () => {
    const newInstance = new NewClass('mock-id');
    newInstance.status = Status.READY;

    let count = 0;
    await expect(
      newInstance.deleteAndWaitUntilFinished({
        intervalSeconds: 1,
        timeoutSeconds: 2,
        callback: () => {
          count++;
        },
      })
    ).rejects.toThrow('Timeout waiting for resource to reach desired state');

    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('deleteAndWaitUntilFinished exception', async () => {
    const newInstance = new NewClass('mock-id');
    newInstance.status = Status.READY;

    let count = 0;
    jest.spyOn(newInstance, 'get').mockImplementation(async () => {
      count++;
      throw new Error('mock-error');
    });

    await expect(
      newInstance.deleteAndWaitUntilFinished({
        intervalSeconds: 1,
        timeoutSeconds: 2,
      })
    ).rejects.toThrow(/Timeout/);

    expect(count).toBeGreaterThan(1);
  });

  test('deleteAndWaitUntilFinished exception and unexpected status', async () => {
    const newInstance = new NewClass('mock-id');
    newInstance.status = Status.READY;

    let count = 0;
    jest.spyOn(newInstance, 'get').mockImplementation(async () => {
      count++;
      newInstance.status = Status.READY;
      throw new Error('mock-error');
    });

    await expect(
      newInstance.deleteAndWaitUntilFinished({
        intervalSeconds: 1,
        timeoutSeconds: 2,
      })
    ).rejects.toThrow('Resource status is READY');

    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('customMethod', async () => {
    const newInstance = new NewClass('mock-id');
    expect(await newInstance.customMethod()).toBe('mock-custom-method');
  });

  test('setConfig should set config and return this for chaining', () => {
    const newInstance = new NewClass('mock-id');
    const config = new Config({
      accessKeyId: 'test-key',
      accessKeySecret: 'test-secret',
      accountId: 'test-account',
    });

    const result = newInstance.setConfig(config);

    expect(result).toBe(newInstance);
    // Verify config is set by checking the internal _config
    expect((newInstance as any)._config).toBe(config);
  });

  test('deleteAndWaitUntilFinished should return immediately if resource does not exist on delete', async () => {
    class NonExistentResource extends NewClass {
      async delete(): Promise<this> {
        throw new ResourceNotExistError('NonExistentResource', this.id);
      }
    }

    const resource = new NonExistentResource('test-id');
    const result = await resource.deleteAndWaitUntilFinished({
      callback: async () => {},
      intervalSeconds: 0.1,
      timeoutSeconds: 1,
    });

    // Should return undefined when resource doesn't exist
    expect(result).toBeUndefined();
  });

  test('deleteAndWaitUntilFinished should handle callback and return false when resource still exists', async () => {
    let getCallCount = 0;
    class SlowDeletingResource extends NewClass {
      async delete(): Promise<this> {
        this.status = Status.DELETING;
        return this;
      }

      async get(): Promise<this> {
        getCallCount++;
        // First few refreshes succeed (resource still exists)
        if (getCallCount < 3) {
          return this; // Returns false in checkFinishedCallback
        }
        // Later throws ResourceNotExistError (resource deleted)
        throw new ResourceNotExistError('SlowDeletingResource', this.id);
      }
    }

    const resource = new SlowDeletingResource('test-id');
    resource.status = Status.READY;
    const callbacks: Status[] = [];

    await resource.deleteAndWaitUntilFinished({
      callback: async r => {
        callbacks.push(r.status as Status);
      },
      intervalSeconds: 0.05,
      timeoutSeconds: 5,
    });

    // Callback should have been called at least once before ResourceNotExistError
    expect(callbacks.length).toBeGreaterThan(0);
    expect(callbacks[0]).toBe(Status.DELETING);
  });

  test('deleteAndWaitUntilFinished should throw error for unexpected status during delete wait', async () => {
    class ErrorResource extends NewClass {
      async delete(): Promise<this> {
        this.status = Status.DELETING;
        return this;
      }

      async get(): Promise<this> {
        // Simulate an unexpected status error (not ResourceNotExistError, not DELETING)
        this.status = Status.CREATE_FAILED;
        throw new Error('Unexpected error');
      }
    }

    const resource = new ErrorResource('test-id');
    resource.status = Status.READY;

    await expect(
      resource.deleteAndWaitUntilFinished({
        callback: async () => {},
        intervalSeconds: 0.1,
        timeoutSeconds: 0.5,
      })
    ).rejects.toThrow('Resource status is CREATE_FAILED');
  });

  test('deleteAndWaitUntilFinished should continue waiting when status is DELETING on error', async () => {
    let errorCount = 0;
    class DeletingResource extends NewClass {
      async delete(): Promise<this> {
        this.status = Status.DELETING;
        return this;
      }

      async get(): Promise<this> {
        errorCount++;
        if (errorCount < 3) {
          // Throw error but status is still DELETING, should continue
          throw new Error('Transient error');
        }
        // Eventually throw ResourceNotExistError
        throw new ResourceNotExistError('DeletingResource', this.id);
      }
    }

    const resource = new DeletingResource('test-id');
    resource.status = Status.DELETING;

    const result = await resource.deleteAndWaitUntilFinished({
      callback: async () => {},
      intervalSeconds: 0.05,
      timeoutSeconds: 2,
    });

    expect(result).toBe(resource);
  });
});

describe('custom list params', () => {
  class NewClass extends ResourceBase {
    id: string;
    getCount: number = 0;
    deleteCount: number = 0;
    declare status?: Status;

    constructor(id: string) {
      super();
      this.id = id;
    }

    async get() {
      this.getCount++;

      if (this.deleteCount >= 57) throw new ResourceNotExistError('BaseClass', this.id);

      return this;
    }

    async delete() {
      this.deleteCount++;
      return this;
    }

    getStatus() {
      return this.status;
    }

    uniqIdCallback() {
      return this.id;
    }

    static async list(params?: { input?: { skipOdd?: boolean } & PageableInput; config?: Config }) {
      const { skipOdd = false, pageNumber = 1, pageSize = 10 } = params?.input || {};

      const result = [];
      for (let i = 0; i < 57; i++) {
        if (skipOdd && i % 2 == 1) continue;
        result.push(new NewClass(`list-${i}`));
      }

      return result.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    }

    static listAll = listAllResourcesFunction(this.list);
  }

  // const NewClass = bindResourceBase(BaseClass);

  test('listAll', async () => {
    // expect(await BaseClass.list()).toHaveLength(10);
    // expect(await BaseClass.list({ input: { pageSize: 5 } })).toHaveLength(5);

    expect(await NewClass.list()).toHaveLength(10);
    expect(await NewClass.list({ input: { pageSize: 5 } })).toHaveLength(5);
    expect(await NewClass.listAll()).toHaveLength(57);
  });

  test('skip odd', async () => {
    // expect(await BaseClass.list()).toHaveLength(10);
    // expect(
    //   await BaseClass.list({ input: { pageSize: 5, skipOdd: true } })
    // ).toHaveLength(5);

    expect(await NewClass.list()).toHaveLength(10);
    expect(await NewClass.list({ input: { pageSize: 5, skipOdd: true } })).toHaveLength(5);
    expect(await NewClass.listAll({ skipOdd: true })).toHaveLength(29);
  });
});
