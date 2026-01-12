/**
 * Log 模块测试
 *
 * 测试 log.ts 的各种功能。
 */

import { logger, LogLevel } from '../../../src/utils/log';

describe('Logger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Spy on console methods
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    // Reset logger level
    logger.setLevel('info');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('setLevel', () => {
    it('should set debug level and log debug messages', () => {
      logger.setLevel('debug');
      logger.debug('debug message');
      
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should set info level and not log debug messages', () => {
      logger.setLevel('info');
      logger.debug('debug message');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should set warn level and not log info messages', () => {
      logger.setLevel('warn');
      logger.info('info message');
      
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should set error level and not log warn messages', () => {
      logger.setLevel('error');
      logger.warn('warn message');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log debug messages when level is debug', () => {
      logger.setLevel('debug');
      logger.debug('test debug message');
      
      expect(consoleDebugSpy).toHaveBeenCalled();
      const logOutput = consoleDebugSpy.mock.calls[0][0];
      expect(logOutput).toContain('test debug message');
    });

    it('should not log debug messages when level is info', () => {
      logger.setLevel('info');
      logger.debug('test debug message');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should pass additional arguments', () => {
      logger.setLevel('debug');
      logger.debug('message with args', { key: 'value' }, 123);
      
      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleDebugSpy.mock.calls[0]).toHaveLength(3);
      expect(consoleDebugSpy.mock.calls[0][1]).toEqual({ key: 'value' });
      expect(consoleDebugSpy.mock.calls[0][2]).toBe(123);
    });
  });

  describe('info', () => {
    it('should log info messages when level is info', () => {
      logger.setLevel('info');
      logger.info('test info message');
      
      expect(consoleInfoSpy).toHaveBeenCalled();
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('test info message');
    });

    it('should log info messages when level is debug', () => {
      logger.setLevel('debug');
      logger.info('test info message');
      
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should not log info messages when level is warn', () => {
      logger.setLevel('warn');
      logger.info('test info message');
      
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warn messages when level is warn', () => {
      logger.setLevel('warn');
      logger.warn('test warn message');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const logOutput = consoleWarnSpy.mock.calls[0][0];
      expect(logOutput).toContain('test warn message');
      expect(logOutput).toContain('WARNING');
    });

    it('should log warn messages when level is info', () => {
      logger.setLevel('info');
      logger.warn('test warn message');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should not log warn messages when level is error', () => {
      logger.setLevel('error');
      logger.warn('test warn message');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages when level is error', () => {
      logger.setLevel('error');
      logger.error('test error message');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain('test error message');
      expect(logOutput).toContain('ERROR');
    });

    it('should always log error messages', () => {
      logger.setLevel('error');
      logger.error('test error message');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('message formatting', () => {
    it('should include timestamp in log output', () => {
      logger.setLevel('info');
      logger.info('test message');
      
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      // Check for timestamp format: YYYY-MM-DD HH:mm:ss,SSS
      expect(logOutput).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}/);
    });

    it('should include logger prefix in log output', () => {
      logger.setLevel('info');
      logger.info('test message');
      
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('agentrun-logger');
    });

    it('should include level name in log output', () => {
      logger.setLevel('info');
      logger.info('test message');
      
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('INFO');
    });
  });

  describe('log levels hierarchy', () => {
    it('should respect log level hierarchy', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
      
      levels.forEach((currentLevel, index) => {
        logger.setLevel(currentLevel);
        
        // Clear mocks
        consoleDebugSpy.mockClear();
        consoleInfoSpy.mockClear();
        consoleWarnSpy.mockClear();
        consoleErrorSpy.mockClear();
        
        // Try logging at each level
        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error');
        
        // Debug should only log when level is debug
        if (index === 0) {
          expect(consoleDebugSpy).toHaveBeenCalled();
        } else {
          expect(consoleDebugSpy).not.toHaveBeenCalled();
        }
        
        // Info should log when level is debug or info
        if (index <= 1) {
          expect(consoleInfoSpy).toHaveBeenCalled();
        } else {
          expect(consoleInfoSpy).not.toHaveBeenCalled();
        }
        
        // Warn should log when level is debug, info, or warn
        if (index <= 2) {
          expect(consoleWarnSpy).toHaveBeenCalled();
        } else {
          expect(consoleWarnSpy).not.toHaveBeenCalled();
        }
        
        // Error should always log
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });
  });

  describe('internal methods', () => {
    // Access private methods for testing via prototype
    const LoggerClass = (logger as any).constructor;
    let testLogger: any;

    beforeEach(() => {
      testLogger = new LoggerClass('test');
    });

    describe('getColor', () => {
      it('should return cyan for debug', () => {
        const color = testLogger.getColor('debug');
        expect(color).toContain('\x1b['); // ANSI escape code
      });

      it('should return blue for info', () => {
        const color = testLogger.getColor('info');
        expect(color).toContain('\x1b[');
      });

      it('should return yellow for warn', () => {
        const color = testLogger.getColor('warn');
        expect(color).toContain('\x1b[');
      });

      it('should return red for error', () => {
        const color = testLogger.getColor('error');
        expect(color).toContain('\x1b[');
      });

      it('should return reset for unknown level', () => {
        const color = testLogger.getColor('unknown' as any);
        expect(color).toContain('\x1b[0m');
      });
    });

    describe('formatTimestamp', () => {
      it('should format current date by default', () => {
        const timestamp = testLogger.formatTimestamp();
        // Should match YYYY-MM-DD HH:mm:ss,SSS format
        expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}/);
      });

      it('should format specific date', () => {
        const date = new Date('2024-03-15T10:30:45.123Z');
        const timestamp = testLogger.formatTimestamp(date);
        expect(timestamp).toContain('2024-03-15');
        expect(timestamp).toContain(',123');
      });
    });

    describe('parseFrame', () => {
      it('should parse standard stack frame', () => {
        const frame = 'at Object.<anonymous> (/path/to/file.ts:10:5)';
        const result = testLogger.parseFrame(frame);
        expect(result).toEqual({
          functionName: 'Object.<anonymous>',
          filepath: '/path/to/file.ts',
          line: 10,
        });
      });

      it('should parse frame without function name', () => {
        const frame = '/path/to/file.js:20:10';
        const result = testLogger.parseFrame(frame);
        expect(result).not.toBeNull();
        if (result) {
          expect(result.filepath).toBe('/path/to/file.js');
          expect(result.line).toBe(20);
        }
      });

      it('should return null for invalid frame', () => {
        const result = testLogger.parseFrame('invalid frame string');
        expect(result).toBeNull();
      });

      it('should parse frame with complex function name', () => {
        const frame = 'at MyClass.myMethod (/app/src/class.ts:100:20)';
        const result = testLogger.parseFrame(frame);
        expect(result).toEqual({
          functionName: 'MyClass.myMethod',
          filepath: '/app/src/class.ts',
          line: 100,
        });
      });
    });

    describe('shouldLog', () => {
      it('should allow debug when level is debug', () => {
        testLogger.setLevel('debug');
        expect(testLogger.shouldLog('debug')).toBe(true);
        expect(testLogger.shouldLog('info')).toBe(true);
        expect(testLogger.shouldLog('warn')).toBe(true);
        expect(testLogger.shouldLog('error')).toBe(true);
      });

      it('should not allow debug when level is info', () => {
        testLogger.setLevel('info');
        expect(testLogger.shouldLog('debug')).toBe(false);
        expect(testLogger.shouldLog('info')).toBe(true);
      });

      it('should not allow info when level is warn', () => {
        testLogger.setLevel('warn');
        expect(testLogger.shouldLog('debug')).toBe(false);
        expect(testLogger.shouldLog('info')).toBe(false);
        expect(testLogger.shouldLog('warn')).toBe(true);
      });

      it('should only allow error when level is error', () => {
        testLogger.setLevel('error');
        expect(testLogger.shouldLog('debug')).toBe(false);
        expect(testLogger.shouldLog('info')).toBe(false);
        expect(testLogger.shouldLog('warn')).toBe(false);
        expect(testLogger.shouldLog('error')).toBe(true);
      });
    });

    describe('formatMessage', () => {
      it('should format message with all components', () => {
        const message = testLogger.formatMessage('info', 'Test message', '/path/to/file.ts', 42);
        expect(message).toContain('INFO');
        expect(message).toContain('Test message');
        expect(message).toContain('/path/to/file.ts');
        expect(message).toContain('42');
      });

      it('should handle missing filepath', () => {
        const message = testLogger.formatMessage('warn', 'Warning message', undefined, undefined);
        expect(message).toContain('WARNING');
        expect(message).toContain('Warning message');
      });
    });

    describe('getCallerByOffset', () => {
      it('should return caller information', () => {
        // This method reads the call stack, so we need to call it from a known location
        const caller = testLogger.getCallerByOffset();
        // Should return some filepath and line, or empty object
        expect(caller).toBeDefined();
        if (caller.filepath) {
          expect(caller.filepath).toContain('.ts');
          expect(typeof caller.line).toBe('number');
        }
      });
    });
  });
});

