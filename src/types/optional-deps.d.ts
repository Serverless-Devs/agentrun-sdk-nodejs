/**
 * Type declarations for optional dependencies
 *
 * These modules are optional peer dependencies.
 * TypeScript will not error if they are not installed.
 */

declare module 'playwright' {
  export interface Browser {
    contexts(): BrowserContext[];
    close(): Promise<void>;
  }

  export interface BrowserContext {
    pages(): Page[];
    newPage(): Promise<Page>;
  }

  export interface Page {
    goto(url: string, options?: { timeout?: number }): Promise<unknown>;
    goBack(options?: { timeout?: number }): Promise<unknown>;
    title(): Promise<string>;
    content(): Promise<string>;
    screenshot(options?: {
      fullPage?: boolean;
      type?: 'png' | 'jpeg';
    }): Promise<Buffer>;
    click(selector: string, options?: { timeout?: number }): Promise<void>;
    fill(selector: string, value: string): Promise<void>;
    type(selector: string, text: string): Promise<void>;
    hover(selector: string): Promise<void>;
    evaluate<T>(fn: () => T): Promise<T>;
    waitForTimeout(timeout: number): Promise<void>;
    url(): string;
  }

  export const chromium: {
    connectOverCDP(url: string): Promise<Browser>;
  };
}

declare module '@mastra/core/tools' {
  export type ToolExecutionContext<TSuspend = unknown, TResume = unknown> = {
    suspend?: TSuspend;
    resume?: TResume;
  };

  export type ToolAction<
    TSchemaIn = unknown,
    TSchemaOut = unknown,
    TSuspend = unknown,
    TResume = unknown,
    TContext = ToolExecutionContext<TSuspend, TResume>,
    TId extends string = string,
  > = {
    id: TId;
    description?: string;
    inputSchema?: unknown;
    execute?: (input: TSchemaIn, context?: TContext) => Promise<TSchemaOut>;
  };

  export function createTool<T extends ToolAction>(params: T): Promise<T>;
}

declare module '@mastra/core/agent' {
  export type ToolsInput = Record<string, unknown>;
}
