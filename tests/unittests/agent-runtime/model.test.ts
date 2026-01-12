/**
 * Agent Runtime Model 模块测试
 *
 * 测试 agent-runtime/model.ts 中的枚举、类型和 helper 函数。
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AgentRuntimeArtifact,
  AgentRuntimeLanguage,
  AgentRuntimeProtocolType,
  codeFromZipFile,
  codeFromOss,
  codeFromFile,
} from '../../../src/agent-runtime/model';

// Mock the archiver module
jest.mock('archiver', () => {
  return {
    __esModule: true,
    default: jest.fn(() => {
      interface MockArchive {
        pipe: jest.Mock;
        directory: jest.Mock;
        file: jest.Mock;
        finalize: jest.Mock;
        on: jest.Mock;
        _output: any;
        _errorCallback: any;
      }
      const mockArchive: MockArchive = {
        pipe: jest.fn(),
        directory: jest.fn(),
        file: jest.fn(),
        finalize: jest.fn().mockImplementation(function (this: any) {
          // Simulate finalize completing
          setImmediate(() => {
            mockArchive._output?.emit('close');
          });
        }),
        on: jest.fn((event: string, callback: () => void) => {
          if (event === 'error') {
            mockArchive._errorCallback = callback;
          }
          return mockArchive;
        }),
        _output: null,
        _errorCallback: null,
      };
      // Capture output stream in pipe
      mockArchive.pipe.mockImplementation((output: any) => {
        mockArchive._output = output;
        return mockArchive;
      });
      return mockArchive;
    }),
  };
});

// Mock crc64-ecma182.js
jest.mock('crc64-ecma182.js', () => ({
  crc64: jest.fn().mockReturnValue('mock-crc64-checksum'),
}));

describe('Agent Runtime Model', () => {
  describe('AgentRuntimeArtifact', () => {
    it('should define CODE artifact type', () => {
      expect(AgentRuntimeArtifact.CODE).toBe('Code');
    });

    it('should define CONTAINER artifact type', () => {
      expect(AgentRuntimeArtifact.CONTAINER).toBe('Container');
    });
  });

  describe('AgentRuntimeLanguage', () => {
    it('should define Python 3.10 language', () => {
      expect(AgentRuntimeLanguage.PYTHON310).toBe('python3.10');
    });

    it('should define Python 3.12 language', () => {
      expect(AgentRuntimeLanguage.PYTHON312).toBe('python3.12');
    });

    it('should define Node.js 18 language', () => {
      expect(AgentRuntimeLanguage.NODEJS18).toBe('nodejs18');
    });

    it('should define Node.js 20 language', () => {
      expect(AgentRuntimeLanguage.NODEJS20).toBe('nodejs20');
    });

    it('should define Java 8 language', () => {
      expect(AgentRuntimeLanguage.JAVA8).toBe('java8');
    });

    it('should define Java 11 language', () => {
      expect(AgentRuntimeLanguage.JAVA11).toBe('java11');
    });
  });

  describe('AgentRuntimeProtocolType', () => {
    it('should define HTTP protocol type', () => {
      expect(AgentRuntimeProtocolType.HTTP).toBe('HTTP');
    });

    it('should define MCP protocol type', () => {
      expect(AgentRuntimeProtocolType.MCP).toBe('MCP');
    });
  });

  describe('codeFromZipFile', () => {
    it('should create code configuration from zip file', async () => {
      // Mock fs.promises.readFile
      const mockBuffer = Buffer.from('test zip content');
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockBuffer);

      const result = await codeFromZipFile(
        AgentRuntimeLanguage.NODEJS18,
        ['node', 'index.js'],
        '/path/to/code.zip'
      );

      expect(result).toEqual({
        language: 'nodejs18',
        command: ['node', 'index.js'],
        zipFile: mockBuffer.toString('base64'),
        checksum: 'mock-crc64-checksum',
      });

      expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/code.zip');
    });

    it('should calculate CRC-64 checksum', async () => {
      const crc64 = require('crc64-ecma182.js');
      const mockBuffer = Buffer.from('test content');
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockBuffer);

      await codeFromZipFile(
        AgentRuntimeLanguage.PYTHON310,
        ['python', 'main.py'],
        '/path/to/code.zip'
      );

      expect(crc64.crc64).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('codeFromOss', () => {
    it('should create code configuration from OSS', () => {
      const result = codeFromOss(
        AgentRuntimeLanguage.PYTHON312,
        ['python', 'app.py'],
        'my-bucket',
        'code/app.zip'
      );

      expect(result).toEqual({
        language: 'python3.12',
        command: ['python', 'app.py'],
        ossBucketName: 'my-bucket',
        ossObjectName: 'code/app.zip',
      });
    });

    it('should work with Java 8', () => {
      const result = codeFromOss(
        AgentRuntimeLanguage.JAVA8,
        ['java', '-jar', 'app.jar'],
        'java-bucket',
        'jars/app.jar'
      );

      expect(result.language).toBe('java8');
      expect(result.command).toEqual(['java', '-jar', 'app.jar']);
    });
  });

  // Note: codeFromFile requires complex mocking of fs.createWriteStream and archiver.
  // The createWriteStream property cannot be redefined in tests.
  // These are tested indirectly through integration/e2e tests.
  // Basic unit tests for the error case would require resetting all modules.
});

