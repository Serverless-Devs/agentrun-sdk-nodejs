/**
 * ToolSet Model Tests
 *
 * 测试 ToolSet 数据模型。
 * Tests for ToolSet data models.
 */

import { ToolSchema, ToolInfo, ToolSetSchemaType } from '../../../src/toolset/model';

describe('ToolSchema', () => {
  describe('constructor', () => {
    it('should create empty schema', () => {
      const schema = new ToolSchema();
      expect(schema.type).toBeUndefined();
    });

    it('should create schema with data', () => {
      const schema = new ToolSchema({
        type: 'object',
        description: 'Test schema',
        properties: {
          name: new ToolSchema({ type: 'string' }),
        },
        required: ['name'],
      });

      expect(schema.type).toBe('object');
      expect(schema.description).toBe('Test schema');
      expect(schema.properties?.name.type).toBe('string');
      expect(schema.required).toEqual(['name']);
    });

    it('should support all JSON Schema fields', () => {
      const schema = new ToolSchema({
        type: 'string',
        title: 'Email Address',
        description: 'User email',
        pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
        minLength: 5,
        maxLength: 100,
        format: 'email',
        default: 'user@example.com',
      });

      expect(schema.type).toBe('string');
      expect(schema.title).toBe('Email Address');
      expect(schema.pattern).toBeDefined();
      expect(schema.minLength).toBe(5);
      expect(schema.maxLength).toBe(100);
      expect(schema.format).toBe('email');
      expect(schema.default).toBe('user@example.com');
    });
  });

  describe('fromAnyOpenAPISchema', () => {
    it('should handle null/undefined input', () => {
      expect(ToolSchema.fromAnyOpenAPISchema(null).type).toBe('string');
      expect(ToolSchema.fromAnyOpenAPISchema(undefined).type).toBe('string');
    });

    it('should handle non-object input', () => {
      expect(ToolSchema.fromAnyOpenAPISchema('string').type).toBe('string');
      expect(ToolSchema.fromAnyOpenAPISchema(123).type).toBe('string');
    });

    it('should parse simple object schema', () => {
      const input = {
        type: 'object',
        description: 'A simple object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
        required: ['name'],
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(input);

      expect(schema.type).toBe('object');
      expect(schema.description).toBe('A simple object');
      expect(schema.properties?.name.type).toBe('string');
      expect(schema.properties?.age.type).toBe('integer');
      expect(schema.required).toEqual(['name']);
    });

    it('should parse array schema', () => {
      const input = {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 10,
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(input);

      expect(schema.type).toBe('array');
      expect(schema.items?.type).toBe('string');
      expect(schema.minItems).toBe(1);
      expect(schema.maxItems).toBe(10);
    });

    it('should parse nested object schema', () => {
      const input = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  city: { type: 'string' },
                  zip: { type: 'string' },
                },
              },
            },
          },
        },
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(input);

      expect(schema.properties?.user.type).toBe('object');
      expect(schema.properties?.user.properties?.name.type).toBe('string');
      expect(schema.properties?.user.properties?.address.properties?.city.type).toBe('string');
    });

    it('should parse number constraints', () => {
      const input = {
        type: 'number',
        minimum: 0,
        maximum: 100,
        exclusiveMinimum: 0,
        exclusiveMaximum: 100,
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(input);

      expect(schema.type).toBe('number');
      expect(schema.minimum).toBe(0);
      expect(schema.maximum).toBe(100);
      expect(schema.exclusiveMinimum).toBe(0);
      expect(schema.exclusiveMaximum).toBe(100);
    });

    it('should parse enum values', () => {
      const input = {
        type: 'string',
        enum: ['red', 'green', 'blue'],
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(input);

      expect(schema.type).toBe('string');
      expect(schema.enum).toEqual(['red', 'green', 'blue']);
    });

    it('should parse anyOf', () => {
      const input = {
        anyOf: [
          { type: 'string' },
          { type: 'number' },
        ],
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(input);

      expect(schema.anyOf).toHaveLength(2);
      expect(schema.anyOf?.[0].type).toBe('string');
      expect(schema.anyOf?.[1].type).toBe('number');
    });

    it('should parse oneOf', () => {
      const input = {
        oneOf: [
          { type: 'string', format: 'email' },
          { type: 'string', format: 'uri' },
        ],
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(input);

      expect(schema.oneOf).toHaveLength(2);
      expect(schema.oneOf?.[0].format).toBe('email');
      expect(schema.oneOf?.[1].format).toBe('uri');
    });

    it('should parse allOf', () => {
      const input = {
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: 'number' } } },
        ],
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(input);

      expect(schema.allOf).toHaveLength(2);
      expect(schema.allOf?.[0].properties?.a.type).toBe('string');
      expect(schema.allOf?.[1].properties?.b.type).toBe('number');
    });

    it('should parse additionalProperties', () => {
      const input = {
        type: 'object',
        additionalProperties: false,
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(input);

      expect(schema.additionalProperties).toBe(false);
    });
  });

  describe('toJSONSchema', () => {
    it('should convert empty schema', () => {
      const schema = new ToolSchema();
      expect(schema.toJSONSchema()).toEqual({});
    });

    it('should convert simple schema', () => {
      const schema = new ToolSchema({
        type: 'string',
        description: 'A string',
      });

      expect(schema.toJSONSchema()).toEqual({
        type: 'string',
        description: 'A string',
      });
    });

    it('should convert object schema with properties', () => {
      const schema = new ToolSchema({
        type: 'object',
        properties: {
          name: new ToolSchema({ type: 'string' }),
          age: new ToolSchema({ type: 'integer' }),
        },
        required: ['name'],
      });

      const result = schema.toJSONSchema();

      expect(result.type).toBe('object');
      expect(result.properties).toEqual({
        name: { type: 'string' },
        age: { type: 'integer' },
      });
      expect(result.required).toEqual(['name']);
    });

    it('should convert array schema', () => {
      const schema = new ToolSchema({
        type: 'array',
        items: new ToolSchema({ type: 'string' }),
        minItems: 1,
      });

      const result = schema.toJSONSchema();

      expect(result.type).toBe('array');
      expect(result.items).toEqual({ type: 'string' });
      expect(result.minItems).toBe(1);
    });

    it('should convert all string constraints', () => {
      const schema = new ToolSchema({
        type: 'string',
        pattern: '^\\d+$',
        minLength: 1,
        maxLength: 10,
        format: 'date',
        enum: ['2024-01-01', '2024-01-02'],
      });

      const result = schema.toJSONSchema();

      expect(result.pattern).toBe('^\\d+$');
      expect(result.minLength).toBe(1);
      expect(result.maxLength).toBe(10);
      expect(result.format).toBe('date');
      expect(result.enum).toEqual(['2024-01-01', '2024-01-02']);
    });

    it('should convert all number constraints', () => {
      const schema = new ToolSchema({
        type: 'number',
        minimum: 0,
        maximum: 100,
        exclusiveMinimum: 0,
        exclusiveMaximum: 100,
      });

      const result = schema.toJSONSchema();

      expect(result.minimum).toBe(0);
      expect(result.maximum).toBe(100);
      expect(result.exclusiveMinimum).toBe(0);
      expect(result.exclusiveMaximum).toBe(100);
    });

    it('should convert union types (anyOf)', () => {
      const schema = new ToolSchema({
        anyOf: [
          new ToolSchema({ type: 'string' }),
          new ToolSchema({ type: 'number' }),
        ],
      });

      const result = schema.toJSONSchema();

      expect(result.anyOf).toEqual([
        { type: 'string' },
        { type: 'number' },
      ]);
    });

    it('should convert oneOf types', () => {
      const schema = new ToolSchema({
        oneOf: [
          new ToolSchema({ type: 'string' }),
          new ToolSchema({ type: 'boolean' }),
        ],
      });

      const result = schema.toJSONSchema();

      expect(result.oneOf).toEqual([
        { type: 'string' },
        { type: 'boolean' },
      ]);
    });

    it('should convert allOf types', () => {
      const schema = new ToolSchema({
        allOf: [
          new ToolSchema({ type: 'object', properties: { a: new ToolSchema({ type: 'string' }) } }),
          new ToolSchema({ type: 'object', properties: { b: new ToolSchema({ type: 'number' }) } }),
        ],
      });

      const result = schema.toJSONSchema();

      expect(result.allOf).toHaveLength(2);
      const allOf = result.allOf as Array<{ properties?: Record<string, unknown> }>;
      expect(allOf[0].properties?.a).toEqual({ type: 'string' });
      expect(allOf[1].properties?.b).toEqual({ type: 'number' });
    });

    it('should convert array schema with items', () => {
      const schema = new ToolSchema({
        type: 'array',
        items: new ToolSchema({ type: 'integer' }),
        minItems: 0,
        maxItems: 10,
      });

      const result = schema.toJSONSchema();

      expect(result.type).toBe('array');
      expect(result.items).toEqual({ type: 'integer' });
      expect(result.minItems).toBe(0);
      expect(result.maxItems).toBe(10);
    });

    it('should include default value', () => {
      const schema = new ToolSchema({
        type: 'string',
        default: 'hello',
      });

      const result = schema.toJSONSchema();

      expect(result.default).toBe('hello');
    });

    it('should include title', () => {
      const schema = new ToolSchema({
        type: 'string',
        title: 'Username',
      });

      const result = schema.toJSONSchema();

      expect(result.title).toBe('Username');
    });
  });

  describe('roundtrip', () => {
    it('should preserve schema through parse and convert', () => {
      const original = {
        type: 'object',
        title: 'User',
        description: 'A user object',
        properties: {
          name: { type: 'string', minLength: 1 },
          age: { type: 'integer', minimum: 0 },
          tags: { 
            type: 'array', 
            items: { type: 'string' },
            minItems: 0,
          },
        },
        required: ['name'],
        additionalProperties: false,
      };

      const schema = ToolSchema.fromAnyOpenAPISchema(original);
      const result = schema.toJSONSchema();

      expect(result.type).toBe(original.type);
      expect(result.title).toBe(original.title);
      expect(result.description).toBe(original.description);
      expect(result.required).toEqual(original.required);
      expect(result.additionalProperties).toBe(original.additionalProperties);
    });
  });
});

describe('ToolInfo', () => {
  describe('constructor', () => {
    it('should create empty ToolInfo', () => {
      const info = new ToolInfo();
      expect(info.name).toBeUndefined();
      expect(info.description).toBeUndefined();
      expect(info.parameters).toBeUndefined();
    });

    it('should create ToolInfo with data', () => {
      const info = new ToolInfo({
        name: 'get_weather',
        description: 'Get weather information',
        parameters: new ToolSchema({
          type: 'object',
          properties: {
            location: new ToolSchema({ type: 'string' }),
          },
        }),
      });

      expect(info.name).toBe('get_weather');
      expect(info.description).toBe('Get weather information');
      expect(info.parameters?.type).toBe('object');
    });
  });

  describe('fromMCPTool', () => {
    it('should throw error for null/undefined input', () => {
      expect(() => ToolInfo.fromMCPTool(null)).toThrow('MCP tool is required');
      expect(() => ToolInfo.fromMCPTool(undefined)).toThrow('MCP tool is required');
    });

    it('should throw error for non-object input', () => {
      expect(() => ToolInfo.fromMCPTool('string')).toThrow('Unsupported MCP tool format');
      expect(() => ToolInfo.fromMCPTool(123)).toThrow('Unsupported MCP tool format');
    });

    it('should throw error for object without name', () => {
      expect(() => ToolInfo.fromMCPTool({ description: 'test' })).toThrow('Unsupported MCP tool format');
    });

    it('should parse simple MCP tool', () => {
      const mcpTool = {
        name: 'get_weather',
        description: 'Get weather for a location',
      };

      const info = ToolInfo.fromMCPTool(mcpTool);

      expect(info.name).toBe('get_weather');
      expect(info.description).toBe('Get weather for a location');
      expect(info.parameters?.type).toBe('object');
    });

    it('should parse MCP tool with inputSchema', () => {
      const mcpTool = {
        name: 'search',
        description: 'Search for items',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
          required: ['query'],
        },
      };

      const info = ToolInfo.fromMCPTool(mcpTool);

      expect(info.name).toBe('search');
      expect(info.parameters?.type).toBe('object');
      expect(info.parameters?.properties?.query.type).toBe('string');
      expect(info.parameters?.properties?.limit.type).toBe('integer');
      expect(info.parameters?.required).toEqual(['query']);
    });

    it('should parse MCP tool with input_schema (snake_case)', () => {
      const mcpTool = {
        name: 'create_item',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      };

      const info = ToolInfo.fromMCPTool(mcpTool);

      expect(info.name).toBe('create_item');
      expect(info.parameters?.type).toBe('object');
      expect(info.parameters?.properties?.name.type).toBe('string');
    });

    it('should throw error for MCP tool with empty name', () => {
      const mcpTool = {
        name: '',
        description: 'Test',
      };

      expect(() => ToolInfo.fromMCPTool(mcpTool)).toThrow('MCP tool must have a name');
    });
  });
});

describe('ToolSetSchemaType', () => {
  it('should have correct enum values', () => {
    expect(ToolSetSchemaType.OPENAPI).toBe('OpenAPI');
    expect(ToolSetSchemaType.MCP).toBe('MCP');
  });
});


