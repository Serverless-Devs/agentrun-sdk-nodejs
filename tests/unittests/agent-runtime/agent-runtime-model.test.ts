/**
 * Agent Runtime Model 单元测试
 *
 * 测试 agent-runtime/model.ts 中的函数和类型。
 * Tests for agent-runtime/model.ts functions and types.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  AgentRuntimeLanguage,
  AgentRuntimeArtifact,
  AgentRuntimeProtocolType,
  codeFromZipFile,
  codeFromOss,
  codeFromFile,
} from '../../../src/agent-runtime/model';

describe('Agent Runtime Model', () => {
  describe('AgentRuntimeArtifact', () => {
    it('should have CODE value', () => {
      expect(AgentRuntimeArtifact.CODE).toBe('Code');
    });

    it('should have CONTAINER value', () => {
      expect(AgentRuntimeArtifact.CONTAINER).toBe('Container');
    });
  });

  describe('AgentRuntimeLanguage', () => {
    it('should have PYTHON310 value', () => {
      expect(AgentRuntimeLanguage.PYTHON310).toBe('python3.10');
    });

    it('should have PYTHON312 value', () => {
      expect(AgentRuntimeLanguage.PYTHON312).toBe('python3.12');
    });

    it('should have NODEJS18 value', () => {
      expect(AgentRuntimeLanguage.NODEJS18).toBe('nodejs18');
    });

    it('should have NODEJS20 value', () => {
      expect(AgentRuntimeLanguage.NODEJS20).toBe('nodejs20');
    });

    it('should have JAVA8 value', () => {
      expect(AgentRuntimeLanguage.JAVA8).toBe('java8');
    });

    it('should have JAVA11 value', () => {
      expect(AgentRuntimeLanguage.JAVA11).toBe('java11');
    });
  });

  describe('AgentRuntimeProtocolType', () => {
    it('should have HTTP value', () => {
      expect(AgentRuntimeProtocolType.HTTP).toBe('HTTP');
    });

    it('should have MCP value', () => {
      expect(AgentRuntimeProtocolType.MCP).toBe('MCP');
    });
  });

  describe('codeFromOss', () => {
    it('should create code configuration from OSS', () => {
      const code = codeFromOss(
        AgentRuntimeLanguage.PYTHON310,
        ['python', 'main.py'],
        'my-bucket',
        'code/agent.zip',
      );

      expect(code.language).toBe('python3.10');
      expect(code.command).toEqual(['python', 'main.py']);
      expect(code.ossBucketName).toBe('my-bucket');
      expect(code.ossObjectName).toBe('code/agent.zip');
      expect(code.zipFile).toBeUndefined();
    });
  });

  describe('codeFromZipFile', () => {
    let tempDir: string;
    let zipFilePath: string;

    beforeAll(async () => {
      // Create a temporary directory and zip file for testing
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-zip-'));
      zipFilePath = path.join(tempDir, 'test.zip');

      // Create a simple zip file (just some bytes for testing)
      const archiverModule = await import('archiver');
      const archiverCreate = (archiverModule as any).default || archiverModule;
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiverCreate('zip', { zlib: { level: 9 } });

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.append('print("Hello, World!")', { name: 'main.py' });
        archive.finalize();
      });
    });

    afterAll(() => {
      // Clean up temporary files
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    });

    it('should create code configuration from zip file', async () => {
      const code = await codeFromZipFile(
        AgentRuntimeLanguage.PYTHON310,
        ['python', 'main.py'],
        zipFilePath,
      );

      expect(code.language).toBe('python3.10');
      expect(code.command).toEqual(['python', 'main.py']);
      expect(code.zipFile).toBeDefined();
      expect(typeof code.zipFile).toBe('string');
      // Should be base64 encoded
      expect(() => Buffer.from(code.zipFile!, 'base64')).not.toThrow();
      expect(code.checksum).toBeDefined();
    });
  });

  describe('codeFromFile', () => {
    let tempDir: string;
    let testFilePath: string;
    let testDirPath: string;

    beforeAll(async () => {
      // Create a temporary directory and test files
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-code-'));
      testFilePath = path.join(tempDir, 'main.py');
      testDirPath = path.join(tempDir, 'project');

      // Create a single file
      fs.writeFileSync(testFilePath, 'print("Hello from file!")');

      // Create a directory with files
      fs.mkdirSync(testDirPath);
      fs.writeFileSync(path.join(testDirPath, 'app.py'), 'print("Hello from app!")');
      fs.writeFileSync(path.join(testDirPath, 'utils.py'), 'def helper(): pass');
    });

    afterAll(() => {
      // Clean up temporary files
      const cleanup = (dir: string) => {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              cleanup(filePath);
            } else {
              fs.unlinkSync(filePath);
            }
          }
          fs.rmdirSync(dir);
        }
      };
      cleanup(tempDir);
    });

    it('should create code configuration from a single file', async () => {
      const code = await codeFromFile(
        AgentRuntimeLanguage.PYTHON310,
        ['python', 'main.py'],
        testFilePath,
      );

      expect(code.language).toBe('python3.10');
      expect(code.command).toEqual(['python', 'main.py']);
      expect(code.zipFile).toBeDefined();
      expect(code.checksum).toBeDefined();
    });

    it('should create code configuration from a directory', async () => {
      const code = await codeFromFile(
        AgentRuntimeLanguage.PYTHON310,
        ['python', 'app.py'],
        testDirPath,
      );

      expect(code.language).toBe('python3.10');
      expect(code.command).toEqual(['python', 'app.py']);
      expect(code.zipFile).toBeDefined();
      expect(code.checksum).toBeDefined();
    });
  });
});
