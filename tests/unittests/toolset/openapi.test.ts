/**
 * OpenAPI $ref 解析与请求构建单元测试
 *
 * 测试内容：
 * 1. $ref 解析是否正确展开内部引用
 * 2. 工具解析是否正确
 * 3. 参数解析是否正确
 */

import { OpenAPI, ApiSet } from '../../../src/toolset/openapi';

describe('OpenAPI $ref Resolution', () => {
  it('should resolve simple $ref', () => {
    const schema = {
      openapi: '3.0.0',
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'integer' },
            },
          },
        },
      },
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User',
                  },
                },
              },
            },
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });

    // Verify $ref has been resolved
    const resolvedSchema = (openapi.schema as any).paths['/users'].post.requestBody.content[
      'application/json'
    ].schema;

    expect(resolvedSchema.$ref).toBeUndefined();
    expect(resolvedSchema.type).toBe('object');
    expect(resolvedSchema.properties.name).toBeDefined();
    expect(resolvedSchema.properties.age).toBeDefined();
  });

  it('should resolve nested $ref', () => {
    const schema = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Address: {
            type: 'object',
            properties: { city: { type: 'string' } },
          },
          Person: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: { $ref: '#/components/schemas/Address' },
            },
          },
        },
      },
      paths: {
        '/person': {
          get: {
            operationId: 'getPerson',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Person',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });

    const resolved = (openapi.schema as any).paths['/person'].get.responses['200'].content[
      'application/json'
    ].schema;

    // Person has been resolved
    expect(resolved.type).toBe('object');
    expect(resolved.properties.address).toBeDefined();

    // Address has also been resolved
    const address = resolved.properties.address;
    expect(address.$ref).toBeUndefined();
    expect(address.type).toBe('object');
    expect(address.properties.city).toBeDefined();
  });

  it('should resolve $ref with sibling properties', () => {
    const schema = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Base: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
        },
      },
      paths: {
        '/items': {
          get: {
            operationId: 'getItems',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Base',
                      description: 'Custom description',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });

    const resolved = (openapi.schema as any).paths['/items'].get.responses['200'].content[
      'application/json'
    ].schema;

    // $ref resolved and sibling property preserved
    expect(resolved.$ref).toBeUndefined();
    expect(resolved.type).toBe('object');
    expect(resolved.description).toBe('Custom description');
  });

  it('should resolve $ref in array items', () => {
    const schema = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Item: {
            type: 'object',
            properties: { name: { type: 'string' } },
          },
        },
      },
      paths: {
        '/items': {
          get: {
            operationId: 'listItems',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Item',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });

    const resolved = (openapi.schema as any).paths['/items'].get.responses['200'].content[
      'application/json'
    ].schema;

    expect(resolved.type).toBe('array');
    expect(resolved.items.$ref).toBeUndefined();
    expect(resolved.items.type).toBe('object');
  });

  it('should resolve $ref in parameters', () => {
    const schema = {
      openapi: '3.0.0',
      components: {
        parameters: {
          PageSize: {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', default: 10 },
          },
        },
      },
      paths: {
        '/items': {
          get: {
            operationId: 'listItems',
            parameters: [{ $ref: '#/components/parameters/PageSize' }],
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });

    const params = (openapi.schema as any).paths['/items'].get.parameters;

    expect(params).toHaveLength(1);
    expect(params[0].$ref).toBeUndefined();
    expect(params[0].name).toBe('pageSize');
    expect(params[0].in).toBe('query');
  });
});

describe('OpenAPI Tool Parsing', () => {
  it('should parse tools from paths', () => {
    const schema = {
      openapi: '3.0.0',
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            summary: 'List all users',
            parameters: [
              {
                name: 'page',
                in: 'query',
                schema: { type: 'integer' },
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer' },
              },
            ],
          },
          post: {
            operationId: 'createUser',
            summary: 'Create a user',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        '/users/{userId}': {
          get: {
            operationId: 'getUser',
            summary: 'Get a user',
            parameters: [
              {
                name: 'userId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema) });

    expect(openapi.tools).toHaveLength(3);

    const listUsers = openapi.getTool('listUsers');
    expect(listUsers).toBeDefined();
    expect(listUsers!.name).toBe('listUsers');
    expect(listUsers!.description).toBe('List all users');
    expect(listUsers!.method).toBe('get');
    expect(listUsers!.path).toBe('/users');
    expect(listUsers!.parameters?.properties?.page).toBeDefined();
    expect(listUsers!.parameters?.properties?.limit).toBeDefined();

    const createUser = openapi.getTool('createUser');
    expect(createUser).toBeDefined();
    expect(createUser!.name).toBe('createUser');
    expect(createUser!.method).toBe('post');
    expect(createUser!.parameters?.properties?.body).toBeDefined();
    expect(createUser!.parameters?.required).toContain('body');

    const getUser = openapi.getTool('getUser');
    expect(getUser).toBeDefined();
    expect(getUser!.method).toBe('get');
    expect(getUser!.path).toBe('/users/{userId}');
    expect(getUser!.parameters?.properties?.userId).toBeDefined();
    expect(getUser!.parameters?.required).toContain('userId');
  });

  it('should handle empty paths', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {},
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });
    expect(openapi.tools).toHaveLength(0);
  });

  it('should skip operations without operationId', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        '/test': {
          get: {
            summary: 'No operationId',
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });
    expect(openapi.tools).toHaveLength(0);
  });

  it('should extract base URL from servers', () => {
    const schema = {
      openapi: '3.0.0',
      servers: [{ url: 'https://api.example.com/v1' }],
      paths: {},
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema) });
    expect((openapi as any)._baseUrl).toBe('https://api.example.com/v1');
  });

  it('should use provided base URL over schema servers', () => {
    const schema = {
      openapi: '3.0.0',
      servers: [{ url: 'https://api.example.com/v1' }],
      paths: {},
    };

    const openapi = new OpenAPI({
      schema: JSON.stringify(schema),
      baseUrl: 'https://custom.api.com',
    });
    expect((openapi as any)._baseUrl).toBe('https://custom.api.com');
  });
});

describe('OpenAPI Parameter Parsing', () => {
  it('should parse query parameters', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        '/search': {
          get: {
            operationId: 'search',
            parameters: [
              {
                name: 'q',
                in: 'query',
                required: true,
                schema: { type: 'string' },
                description: 'Search query',
              },
              {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', default: 1 },
              },
            ],
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });
    const tool = openapi.getTool('search');

    expect(tool).toBeDefined();
    expect(tool!.parameters?.properties?.q).toBeDefined();
    expect(tool!.parameters?.properties?.q?.type).toBe('string');
    expect(tool!.parameters?.properties?.q?.description).toBe('Search query');
    expect(tool!.parameters?.required).toContain('q');
    expect(tool!.parameters?.required).not.toContain('page');
  });

  it('should parse path parameters', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        '/items/{itemId}': {
          get: {
            operationId: 'getItem',
            parameters: [
              {
                name: 'itemId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });
    const tool = openapi.getTool('getItem');

    expect(tool).toBeDefined();
    expect(tool!.parameters?.properties?.itemId).toBeDefined();
    expect(tool!.parameters?.required).toContain('itemId');
  });

  it('should parse header parameters', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        '/protected': {
          get: {
            operationId: 'getProtected',
            parameters: [
              {
                name: 'X-API-Key',
                in: 'header',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });
    const tool = openapi.getTool('getProtected');

    expect(tool).toBeDefined();
    expect(tool!.parameters?.properties?.['X-API-Key']).toBeDefined();
  });

  it('should parse request body', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      price: { type: 'number' },
                    },
                    required: ['name'],
                  },
                },
              },
            },
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });
    const tool = openapi.getTool('createItem');

    expect(tool).toBeDefined();
    expect(tool!.parameters?.properties?.body).toBeDefined();
    expect(tool!.parameters?.properties?.body?.type).toBe('object');
    expect(tool!.parameters?.properties?.body?.properties?.name).toBeDefined();
    expect(tool!.parameters?.required).toContain('body');
  });
});

describe('ApiSet', () => {
  it('should create ApiSet with tools', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            summary: 'List users',
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });
    const apiSet = new ApiSet(openapi.tools, openapi);

    expect(apiSet.tools).toHaveLength(1);
    expect(apiSet.getTool('listUsers')).toBeDefined();
  });

  it('should throw error for non-existent tool', async () => {
    const schema = {
      openapi: '3.0.0',
      paths: {},
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });
    const apiSet = new ApiSet([], openapi);

    await expect(apiSet.invoke('nonExistent', {})).rejects.toThrow("Tool 'nonExistent' not found.");
  });
});

describe('OpenAPI Invoke', () => {
  it('should throw error for non-existent tool', async () => {
    const schema = {
      openapi: '3.0.0',
      paths: {},
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });

    await expect(openapi.invokeToolAsync('nonExistent', {})).rejects.toThrow(
      "Tool 'nonExistent' not found."
    );
  });

  it('should throw error for sync invocation', () => {
    const schema = {
      openapi: '3.0.0',
      paths: {
        '/test': {
          get: {
            operationId: 'test',
          },
        },
      },
    };

    const openapi = new OpenAPI({ schema: JSON.stringify(schema), baseUrl: 'http://test' });

    expect(() => openapi.invokeToolSync('test', {})).toThrow(
      'Synchronous invocation is not supported in Node.js.'
    );
  });
});
