import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, type StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface McpClientConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export class McpToolClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(private readonly config: McpClientConfig) {}

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const client = await this.connect();
    const result = await client.callTool({
      name,
      arguments: args
    });

    if ('toolResult' in result) {
      return JSON.stringify(result.toolResult);
    }

    const textEntry = result.content.find(
      (entry) => entry.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    if (!textEntry) {
      throw new Error(`Tool '${name}' returned no text content`);
    }

    return textEntry.text;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  private async connect(): Promise<Client> {
    if (this.client) return this.client;

    const params: StdioServerParameters = {
      command: this.config.command,
      args: this.config.args,
      env: this.config.env,
      cwd: this.config.cwd
    };

    this.transport = new StdioClientTransport(params);
    this.client = new Client({
      name: 'wordpress-sync-client',
      version: '1.0.0'
    });

    await this.client.connect(this.transport);
    return this.client;
  }
}
