import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerRepoTools } from "./src/tools/repo.tools.js";
import { registerReadmeTools } from "./src/tools/readme.tools.js";

const server = new McpServer({ name: "github-mcp-server", version: "2.0.0" });

registerRepoTools(server);
registerReadmeTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("GitHub MCP Server Running... Pro Version 🔥");