# Maven Version Resolver MCP Server

A TypeScript-based Model Context Protocol (MCP) server that provides Maven2 module version resolution capabilities with caching and logging.

## Features

- Latest stable version resolution from Maven Central
- Pre-release filtering (excludes preview, RC, alpha, beta, snapshot, milestone versions)
- 5-minute in-memory cache with automatic cleanup
- Request/response logging
- Error handling and input validation



## Installation from Source

```bash
npm install
npm run build
```

## Usage

### Starting the Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

## Setup

Add to your mcp json
```json
{
  "mcp": {
    "mcpServers": {
      "maven-resolver": {
        "command": "npx",
        "args": ["maven-artifacts-mcp"],
        "env": {
          "CACHE_TTL_MINUTES": "5",
          "MAVEN_API_TIMEOUT": "10000"
        }
      }
    }
  }
}
```

## MCP Tool: `latest_version`

Retrieves the latest version information for a Maven artifact.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string | Yes | Maven group ID (e.g., "org.springframework") |
| `artifactId` | string | Yes | Maven artifact ID (e.g., "spring-core") |

### Example Usage

```json
{
  "tool": "latest_version",
  "arguments": {
    "groupId": "org.springframework",
    "artifactId": "spring-core"
  }
}
```

Response includes latest version, last updated timestamp, repository, cache status, and excluded pre-release versions.

## Version Filtering

Automatically filters out pre-release versions:

- Preview versions (e.g., `6.1.0-preview`)
- Release candidates (e.g., `6.1.0-RC1`)
- Alpha/Beta versions (e.g., `6.1.0-alpha`)
- Snapshots (e.g., `6.1.0-SNAPSHOT`)
- Milestones (e.g., `7.0.0-M1`)

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAVEN_API_TIMEOUT` | 10000 | API request timeout in milliseconds |
| `CACHE_TTL_MINUTES` | 5 | Cache TTL in minutes |
| `LOG_LEVEL` | info | Logging verbosity level |


### Npm Tasks

- `npm run build` - Compile TypeScript
- `npm start` - Start the server
- `npm run dev` - Build and start in development mode
- `npm test` - Run test suite
- `npm run test:coverage` - Run tests with coverage



## License

Apache 2.0 License 