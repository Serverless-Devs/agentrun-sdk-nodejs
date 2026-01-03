/**
 * AgentRun Data API Client
 *
 * 用于与 AgentRun Data API 交互的 HTTP 客户端。
 * HTTP client for interacting with the AgentRun Data API.
 */

import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import * as nodePath from "path";
import { URL } from "url";

import { Config } from "./config";
import { ClientError } from "./exception";
import { logger } from "./log";

/**
 * Resource type enumeration
 */
export enum ResourceType {
  Runtime = "runtime",
  LiteLLM = "litellm",
  Tool = "tool",
  Template = "template",
  Sandbox = "sandbox",
}

/**
 * Data API response interface
 */
export interface DataAPIResponse {
  [key: string]: unknown;
}

/**
 * File download result
 */
export interface FileDownloadResult {
  savedPath: string;
  size: number;
}

/**
 * AgentRun Data API Client
 *
 * This client provides methods for making HTTP requests to the AgentRun Data API
 * with automatic URL construction, JSON handling, and error management.
 */
export class DataAPI {
  private resourceName: string;
  private resourceType: ResourceType;
  private accessToken: string | null = null;
  private config: Config;
  private namespace: string;

  /**
   * Initialize the Data API Client.
   *
   * @param resourceName - Resource name for access token
   * @param resourceType - Resource type for access token
   * @param config - Configuration options
   * @param namespace - API namespace (default: "agents")
   */
  constructor(
    resourceName: string,
    resourceType: ResourceType,
    config?: Config,
    namespace: string = "agents",
  ) {
    this.resourceName = resourceName;
    this.resourceType = resourceType;
    this.config = Config.withConfigs(config);
    this.namespace = namespace;

    // Check for provided access token
    const token = this.config.token;
    if (token) {
      logger.debug(`Using provided access token from config`);
      this.accessToken = token;
    }
  }

  /**
   * Get the base URL for API requests.
   */
  private getBaseUrl(): string {
    return this.config.dataEndpoint;
  }

  /**
   * Construct full URL with the given path and query parameters.
   *
   * @param path - API path (may include query string)
   * @param query - Query parameters to add/merge
   * @returns Complete URL string with query parameters
   */
  withPath(path: string, query?: Record<string, unknown>): string {
    // Remove leading slash if present
    path = path.replace(/^\//, "");

    const parts = [this.getBaseUrl(), this.namespace, path]
      .filter(Boolean)
      .map((part) => part.replace(/^\/|\/$/g, ""));

    const baseUrl = parts.join("/");

    if (!query || Object.keys(query).length === 0) {
      return baseUrl;
    }

    const urlObj = new URL(baseUrl);
    const existingParams = urlObj.searchParams;

    for (const key in query) {
      if (Object.prototype.hasOwnProperty.call(query, key)) {
        const value = query[key];
        if (Array.isArray(value)) {
          value.forEach((v) => existingParams.append(key, String(v)));
        } else if (value !== undefined && value !== null) {
          existingParams.set(key, String(value));
        }
      }
    }

    urlObj.search = existingParams.toString();
    return urlObj.toString();
  }

  /**
   * Authenticate and prepare headers for the request.
   *
   * @param url - Request URL
   * @param headers - Request headers
   * @param query - Query parameters
   * @param config - Optional config override
   * @returns Tuple of [url, headers, query]
   */
  private async auth(
    url: string,
    headers: Record<string, string>,
    query?: Record<string, unknown>,
    config?: Config,
  ): Promise<
    [string, Record<string, string>, Record<string, unknown> | undefined]
  > {
    const cfg = Config.withConfigs(this.config, config);

    // Fetch access token if not already available
    if (
      this.accessToken === null &&
      this.resourceName &&
      this.resourceType &&
      !cfg.token
    ) {
      try {
        // Dynamically import to avoid circular dependencies
        const { ControlAPI } = await import("./control-api");
        const $AgentRun = await import("@alicloud/agentrun20250910");

        const cli = new ControlAPI(this.config).getClient();

        const input =
          this.resourceType === ResourceType.Sandbox
            ? new $AgentRun.GetAccessTokenRequest({
                resourceId: this.resourceName,
                resourceType: this.resourceType,
              })
            : new $AgentRun.GetAccessTokenRequest({
                resourceName: this.resourceName,
                resourceType: this.resourceType,
              });

        const resp = await cli.getAccessToken(input);
        this.accessToken = resp.body?.data?.accessToken || null;

        logger.debug(
          `Fetched access token for resource ${this.resourceName} of type ${this.resourceType}`,
        );
      } catch (e) {
        logger.warn(
          `Failed to get access token for ${this.resourceType}(${this.resourceName}): ${e}`,
        );
      }
    }

    // Merge headers with authentication
    const authHeaders = {
      "Agentrun-Access-Token": cfg.token || this.accessToken || "",
      ...cfg.headers,
      ...headers,
    };

    return [url, authHeaders, query];
  }

  /**
   * Prepare the HTTP request.
   */
  private async prepareRequest(
    method: string,
    url: string,
    data?: Record<string, unknown> | string | Buffer,
    headers?: Record<string, string>,
    query?: Record<string, unknown>,
    config?: Config,
  ): Promise<{
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string | Buffer;
  }> {
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "AgentRunDataClient/1.0",
    };

    const cfg = Config.withConfigs(this.config, config);
    Object.assign(reqHeaders, cfg.headers);
    if (headers) {
      Object.assign(reqHeaders, headers);
    }

    // Apply authentication
    const [authUrl, authHeaders, authQuery] = await this.auth(
      url,
      reqHeaders,
      query,
      cfg,
    );

    // Add query parameters to URL
    let finalUrl = authUrl;
    if (authQuery && Object.keys(authQuery).length > 0) {
      const urlObj = new URL(authUrl);
      for (const key in authQuery) {
        if (Object.prototype.hasOwnProperty.call(authQuery, key)) {
          const value = authQuery[key];
          if (value !== undefined && value !== null) {
            urlObj.searchParams.set(key, String(value));
          }
        }
      }
      finalUrl = urlObj.toString();
    }

    // Prepare request body
    let body: string | Buffer | undefined;
    if (data !== undefined) {
      if (Buffer.isBuffer(data)) {
        body = data;
      } else if (typeof data === "object") {
        body = JSON.stringify(data);
      } else {
        body = data;
      }
    }

    logger.debug(
      `${method} ${finalUrl} headers=${JSON.stringify(authHeaders)}`,
    );

    return { method, url: finalUrl, headers: authHeaders, body };
  }

  /**
   * Make an HTTP request.
   */
  private async makeRequest(
    method: string,
    path: string,
    data?: Record<string, unknown> | string | Buffer,
    query?: Record<string, unknown>,
    headers?: Record<string, string>,
    config?: Config,
  ): Promise<DataAPIResponse> {
    const fullUrl = this.withPath(path, query);
    const {
      method: reqMethod,
      url: reqUrl,
      headers: reqHeaders,
      body: reqBody,
    } = await this.prepareRequest(
      method,
      fullUrl,
      data,
      headers,
      undefined,
      config,
    );

    const client = reqUrl.startsWith("https") ? https : http;
    const urlObj = new URL(reqUrl);

    const options: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (reqUrl.startsWith("https") ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: reqMethod,
      headers: reqHeaders,
      timeout: this.config.timeout,
    };

    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          logger.debug(`Response: ${responseData}`);

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(responseData ? JSON.parse(responseData) : {});
            } catch (e) {
              const errorMsg = `Failed to parse JSON response: ${e}`;
              logger.error(errorMsg);
              reject(new ClientError(res.statusCode || 0, errorMsg));
            }
          } else {
            const errorMsg =
              responseData || res.statusMessage || "Unknown error";
            reject(new ClientError(res.statusCode || 0, errorMsg));
          }
        });
      });

      req.on("error", (e) => {
        reject(new ClientError(0, `Request error: ${e.message}`));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new ClientError(0, "Request timeout"));
      });

      if (reqBody) {
        req.write(reqBody);
      }
      req.end();
    });
  }

  /**
   * Make a GET request.
   *
   * @param path - API path
   * @param query - Query parameters
   * @param headers - Additional headers
   * @param config - Optional config override
   */
  async get(
    path: string,
    query?: Record<string, unknown>,
    headers?: Record<string, string>,
    config?: Config,
  ): Promise<DataAPIResponse> {
    return this.makeRequest("GET", path, undefined, query, headers, config);
  }

  /**
   * Make a POST request.
   *
   * @param path - API path
   * @param data - Request body
   * @param query - Query parameters
   * @param headers - Additional headers
   * @param config - Optional config override
   */
  async post(
    path: string,
    data?: Record<string, unknown> | string | Buffer,
    query?: Record<string, unknown>,
    headers?: Record<string, string>,
    config?: Config,
  ): Promise<DataAPIResponse> {
    return this.makeRequest("POST", path, data, query, headers, config);
  }

  /**
   * Make a PUT request.
   *
   * @param path - API path
   * @param data - Request body
   * @param query - Query parameters
   * @param headers - Additional headers
   * @param config - Optional config override
   */
  async put(
    path: string,
    data?: Record<string, unknown> | string | Buffer,
    query?: Record<string, unknown>,
    headers?: Record<string, string>,
    config?: Config,
  ): Promise<DataAPIResponse> {
    return this.makeRequest("PUT", path, data, query, headers, config);
  }

  /**
   * Make a PATCH request.
   *
   * @param path - API path
   * @param data - Request body
   * @param query - Query parameters
   * @param headers - Additional headers
   * @param config - Optional config override
   */
  async patch(
    path: string,
    data?: Record<string, unknown> | string | Buffer,
    query?: Record<string, unknown>,
    headers?: Record<string, string>,
    config?: Config,
  ): Promise<DataAPIResponse> {
    return this.makeRequest("PATCH", path, data, query, headers, config);
  }

  /**
   * Make a DELETE request.
   *
   * @param path - API path
   * @param query - Query parameters
   * @param headers - Additional headers
   * @param config - Optional config override
   */
  async delete(
    path: string,
    query?: Record<string, unknown>,
    headers?: Record<string, string>,
    config?: Config,
  ): Promise<DataAPIResponse> {
    return this.makeRequest("DELETE", path, undefined, query, headers, config);
  }

  /**
   * Upload a file using multipart/form-data.
   *
   * @param path - API path
   * @param localFilePath - Local file path to upload
   * @param targetFilePath - Target file path on the server
   * @param formData - Additional form data fields
   * @param query - Query parameters
   * @param headers - Additional headers
   * @param config - Optional config override
   */
  async postFile(
    path: string,
    localFilePath: string,
    targetFilePath: string,
    formData?: Record<string, string>,
    query?: Record<string, unknown>,
    headers?: Record<string, string>,
    config?: Config,
  ): Promise<DataAPIResponse> {
    const fullUrl = this.withPath(path, query);
    const { url: reqUrl, headers: reqHeaders } = await this.prepareRequest(
      "POST",
      fullUrl,
      undefined,
      headers,
      undefined,
      config,
    );

    const client = reqUrl.startsWith("https") ? https : http;
    const urlObj = new URL(reqUrl);

    return new Promise((resolve, reject) => {
      const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
      const contentHeaders = {
        ...reqHeaders,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      };

      const options: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (reqUrl.startsWith("https") ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: contentHeaders,
        timeout: this.config.timeout,
      };

      const req = client.request(options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(responseData ? JSON.parse(responseData) : {});
            } catch (e) {
              logger.error(`Failed to parse JSON response: ${e}`);
              reject(
                new ClientError(
                  res.statusCode || 0,
                  `Failed to parse JSON: ${e}`,
                ),
              );
            }
          } else {
            reject(
              new ClientError(
                res.statusCode || 0,
                responseData || "Unknown error",
              ),
            );
          }
        });
      });

      req.on("error", (e) => {
        reject(new ClientError(0, `Request error: ${e.message}`));
      });

      // Helper to write form fields
      const appendField = (name: string, value: string) => {
        req.write(`--${boundary}\r\n`);
        req.write(`Content-Disposition: form-data; name="${name}"\r\n`);
        req.write("\r\n");
        req.write(`${value}\r\n`);
      };

      // Write form data fields
      if (formData) {
        for (const key in formData) {
          if (Object.prototype.hasOwnProperty.call(formData, key)) {
            appendField(key, formData[key]);
          }
        }
      }

      // Add target path field
      appendField("path", targetFilePath);

      // Write file
      const filename = nodePath.basename(localFilePath);
      req.write(`--${boundary}\r\n`);
      req.write(
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`,
      );
      req.write("Content-Type: application/octet-stream\r\n");
      req.write("\r\n");

      const fileStream = fs.createReadStream(localFilePath);
      fileStream.pipe(req, { end: false });

      fileStream.on("end", () => {
        req.write(`\r\n--${boundary}--\r\n`);
        req.end();
      });

      fileStream.on("error", (e) => {
        reject(new ClientError(0, `File stream error: ${e.message}`));
      });
    });
  }

  /**
   * Download a file and save it to local path.
   *
   * @param path - API path
   * @param savePath - Local file path to save the downloaded file
   * @param query - Query parameters
   * @param headers - Additional headers
   * @param config - Optional config override
   */
  async getFile(
    path: string,
    savePath: string,
    query?: Record<string, unknown>,
    headers?: Record<string, string>,
    config?: Config,
  ): Promise<FileDownloadResult> {
    const fullUrl = this.withPath(path, query);
    const { url: reqUrl, headers: reqHeaders } = await this.prepareRequest(
      "GET",
      fullUrl,
      undefined,
      headers,
      undefined,
      config,
    );

    const client = reqUrl.startsWith("https") ? https : http;
    const urlObj = new URL(reqUrl);

    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (reqUrl.startsWith("https") ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: reqHeaders,
        timeout: this.config.timeout,
      };

      const req = client.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          const fileStream = fs.createWriteStream(savePath);
          let downloadedSize = 0;

          res.on("data", (chunk) => {
            fileStream.write(chunk);
            downloadedSize += chunk.length;
          });

          res.on("end", () => {
            fileStream.end();
            resolve({ savedPath: savePath, size: downloadedSize });
          });

          res.on("error", (e) => {
            fileStream.end();
            reject(new ClientError(0, `Response error: ${e.message}`));
          });
        } else {
          let errorData = "";
          res.on("data", (chunk) => (errorData += chunk));
          res.on("end", () => {
            reject(
              new ClientError(
                res.statusCode || 0,
                errorData || "Download failed",
              ),
            );
          });
        }
      });

      req.on("error", (e) => {
        reject(new ClientError(0, `Request error: ${e.message}`));
      });

      req.end();
    });
  }

  /**
   * Download a video file and save it to local path.
   *
   * @param path - API path
   * @param savePath - Local file path to save the downloaded video
   * @param query - Query parameters
   * @param headers - Additional headers
   * @param config - Optional config override
   */
  async getVideo(
    path: string,
    savePath: string,
    query?: Record<string, unknown>,
    headers?: Record<string, string>,
    config?: Config,
  ): Promise<FileDownloadResult> {
    // Video download is the same as file download
    return this.getFile(path, savePath, query, headers, config);
  }
}
