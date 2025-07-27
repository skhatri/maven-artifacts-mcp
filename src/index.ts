#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { mavenResolver } from './tools/maven-resolver.js';
import { logger } from './logging/logger.js';
import { cacheManager } from './cache/cache-manager.js';
import { LatestVersionRequest } from './types/maven.js';

class MavenMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'maven-version-resolver',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private validateLatestVersionArgs(args: Record<string, unknown> | undefined): LatestVersionRequest {
    if (!args || typeof args !== 'object') {
      throw new McpError(ErrorCode.InvalidParams, 'Arguments are required');
    }

    const { groupId, artifactId } = args;

    if (typeof groupId !== 'string' || !groupId.trim()) {
      throw new McpError(ErrorCode.InvalidParams, 'groupId must be a non-empty string');
    }

    if (typeof artifactId !== 'string' || !artifactId.trim()) {
      throw new McpError(ErrorCode.InvalidParams, 'artifactId must be a non-empty string');
    }

    return { groupId: groupId.trim(), artifactId: artifactId.trim() };
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'latest_version',
            description: 'Get the latest version of a Maven artifact from Maven Central repository',
            inputSchema: {
              type: 'object',
              properties: {
                groupId: {
                  type: 'string',
                  description: 'Maven group ID (e.g., "org.springframework")',
                },
                artifactId: {
                  type: 'string',
                  description: 'Maven artifact ID (e.g., "spring-core")',
                },
              },
              required: ['groupId', 'artifactId'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'latest_version') {
          const typedArgs = this.validateLatestVersionArgs(args);
          return await this.handleLatestVersionTool(typedArgs);
        } else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
        }
      } catch (error) {
        logger.logError(name, `Tool execution failed: ${error}`);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async handleLatestVersionTool(args: LatestVersionRequest) {
    const { groupId, artifactId } = args;

    if (!groupId || !artifactId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Both groupId and artifactId are required'
      );
    }

    logger.logRequest('latest_version', { groupId, artifactId });

    try {
      const result = await mavenResolver.getLatestVersion({ groupId, artifactId });
      
      logger.logResponse('latest_version', result);
      
      let responseText = `Latest version information for ${groupId}:${artifactId}:\n\n` +
                         `📦 Latest Version: ${result.latestVersion}\n` +
                         `📅 Last Updated: ${result.lastUpdated}\n` +
                         `🏪 Repository: ${result.repository}\n` +
                         `💾 From Cache: ${result.cached ? 'Yes' : 'No'}`;

      if (result.excludedVersions && result.excludedVersions.length > 0) {
        responseText += `\n🚫 Excluded Pre-releases: ${result.excludedVersions.slice(0, 3).join(', ')}`;
        if (result.excludedVersions.length > 3) {
          responseText += ` (and ${result.excludedVersions.length - 3} more)`;
        }
        if (result.totalVersions) {
          responseText += `\n📊 Total Versions Found: ${result.totalVersions}`;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
        isError: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.logError('latest_version', errorMessage, { groupId, artifactId });
      
      throw new McpError(ErrorCode.InternalError, errorMessage);
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      logger.logError('server', `MCP Server error: ${error}`);
    };

    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  private cleanup(): void {
    logger.logInfo('Shutting down Maven MCP server...');
    cacheManager.destroy();
    logger.logInfo('Server shutdown complete');
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    
    logger.logInfo('Starting Maven MCP server...');
    logger.logInfo(`Cache TTL: ${cacheManager['ttlMinutes']} minutes`);
    
    await this.server.connect(transport);
    logger.logInfo('Maven MCP server is running and ready to accept requests');
  }
}

const server = new MavenMcpServer();
server.run().catch((error) => {
  logger.logError('startup', `Failed to start server: ${error}`);
  process.exit(1);
}); 