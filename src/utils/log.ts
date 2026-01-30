/**
 * Logging utilities for AgentRun SDK
 *
 * 此模块提供日志功能。
 * This module provides logging utilities.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
// concise ANSI color codes we need
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

class Logger {
  private level: LogLevel = 'info';
  // match Python logger name
  private prefix = 'agentrun-logger';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return COLORS.cyan;
      case 'info':
        return COLORS.blue;
      case 'warn':
        return COLORS.yellow;
      case 'error':
        return COLORS.red;
      default:
        return COLORS.reset;
    }
  }

  // format timestamp like Python: YYYY-MM-DD HH:mm:ss,SSS
  private formatTimestamp(d = new Date()): string {
    const pad = (n: number, sz = 2) => n.toString().padStart(sz, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hour = pad(d.getHours());
    const minute = pad(d.getMinutes());
    const second = pad(d.getSeconds());
    const ms = pad(d.getMilliseconds(), 3);
    return `${year}-${month}-${day} ${hour}:${minute}:${second},${ms}`;
  }

  // attempt to infer caller file and line by parsing Error.stack
  // helper: parse a single stack frame into {filepath, line, functionName}
  private parseFrame(frame: string) {
    const m = frame.match(/^(?:at\s+)?(?:(.+?)\s+\()?(.*?):(\d+):(\d+)\)?$/);
    if (!m) return null;
    return {
      functionName: m[1] ? m[1].trim() : undefined,
      filepath: m[2],
      line: parseInt(m[3], 10),
    };
  }

  // get caller by fixed stack offset (used in public log methods)
  private getCallerByOffset(): { filepath?: string; line?: number } {
    const err = new Error();
    const stack = err.stack;
    if (!stack) return {};
    const lines = stack.split('\n').map((l) => l.trim());
    // try the requested offset, if absent try next few frames

    for (let i = 3; i < lines.length; i++) {
      let parsed = this.parseFrame(lines[i]);
      // fallback: try extract /path:line:col substring
      if (!parsed) {
        const m = lines[i].match(/(\/[^:\s]+:\d+:\d+)/);
        if (m) {
          const parts = m[1].split(':');
          parts.pop(); // col
          const ln = Number(parts.pop());
          const fp = parts.join(':');
          parsed = { filepath: fp, line: ln, functionName: undefined } as any;
        }
      }
      if (!parsed) continue;
      const fp = parsed.filepath;
      if (
        fp.includes('node_modules') ||
        fp.includes('internal') ||
        fp.includes('<anonymous>') ||
        fp.includes('native')
      )
        continue;
      // skip logger internal frames
      return { filepath: parsed.filepath, line: parsed.line };
    }
    // fallback: scan all frames and return first project frame
    const cwd = process.cwd();
    for (let i = 0; i < lines.length; i++) {
      let parsed = this.parseFrame(lines[i]);
      if (!parsed) {
        const m = lines[i].match(/(\/[^:\s]+:\d+:\d+)/);
        if (m) {
          const parts = m[1].split(':');
          parts.pop(); // col
          const ln = Number(parts.pop());
          const fp = parts.join(':');
          parsed = { filepath: fp, line: ln, functionName: undefined } as any;
        }
      }
      if (!parsed) continue;
      const fp = parsed.filepath;
      if (
        fp.includes('node_modules') ||
        fp.includes('internal') ||
        fp.includes('<anonymous>') ||
        fp.includes('native')
      )
        continue;
      if (fp.includes('/src/utils/log.ts')) continue;
      if (fp.startsWith(cwd))
        return { filepath: parsed.filepath, line: parsed.line };
    }
    // final fallback: first non-node_modules parsed frame
    for (let i = 0; i < lines.length; i++) {
      let parsed = this.parseFrame(lines[i]);
      if (!parsed) {
        const m = lines[i].match(/(\/[^:\s]+:\d+:\d+)/);
        if (m) {
          const parts = m[1].split(':');
          parts.pop(); // col
          const ln = Number(parts.pop());
          const fp = parts.join(':');
          parsed = { filepath: fp, line: ln, functionName: undefined } as any;
        }
      }
      if (!parsed) continue;
      const fp = parsed.filepath;
      if (
        fp.includes('node_modules') ||
        fp.includes('internal') ||
        fp.includes('<anonymous>') ||
        fp.includes('native')
      )
        continue;
      if (fp.includes('/src/utils/log.ts')) continue;
      return { filepath: parsed.filepath, line: parsed.line };
    }
    return {};
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    filepath?: string,
    line?: number
  ): string {
    const timestamp = this.formatTimestamp();
    const color = this.getColor(level);
    const reset = COLORS.reset;

    // filepath/line should be provided by caller via getCallerByOffset;
    // if missing, leave blank

    const levelName = level === 'warn' ? 'WARNING' : level.toUpperCase();
    const levelStr = `${COLORS.bright}${color}${levelName}${reset}`;
    const nameStr = `${color}[${this.prefix}]${reset}`;
    const tsStr = `${color} ${timestamp}${reset}`;
    const pathInfo =
      filepath && line !== undefined
        ? ` ${COLORS.dim}${COLORS.italic}${filepath}:${line}${reset}`
        : '';
    const msg = level === 'debug' ? `${COLORS.dim}${message}${reset}` : message;

    return `\n${levelStr} ${nameStr}${tsStr}${pathInfo}\n${msg}\n`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      const caller = this.getCallerByOffset();
      console.debug(
        this.formatMessage('debug', message, caller.filepath, caller.line),
        ...args
      );
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      const caller = this.getCallerByOffset();
      console.info(
        this.formatMessage('info', message, caller.filepath, caller.line),
        ...args
      );
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      const caller = this.getCallerByOffset();
      console.warn(
        this.formatMessage('warn', message, caller.filepath, caller.line),
        ...args
      );
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      const caller = this.getCallerByOffset();
      console.error(
        this.formatMessage('error', message, caller.filepath, caller.line),
        ...args
      );
    }
  }
}

export const logger = new Logger();
if (
  ![undefined, null, "", "False", "FALSE", "false", "0"].includes(
    process.env["AGENTRUN_SDK_DEBUG"],
  )
) {
  logger.setLevel("debug");

  if (!(globalThis as any)._AGENTRUN_DEBUG_LOGGED) {
    logger.warn(
      "启用 AgentRun SDK 调试日志， 移除 AGENTRUN_SDK_DEBUG 环境变量以关闭",
    );
    (globalThis as any)._AGENTRUN_DEBUG_LOGGED = true;
  }
} else {
  logger.setLevel("info");
}
