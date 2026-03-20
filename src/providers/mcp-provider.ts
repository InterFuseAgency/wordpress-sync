import type { SyncProvider, SyncTargetKind, UpdatePayload, WpObject } from '../types.js';

export interface McpToolInvoker {
  callTool(name: string, args: Record<string, unknown>): Promise<string>;
}

export interface ElementorMcpProviderConfig {
  callTool: McpToolInvoker['callTool'];
  fallback?: SyncProvider;
}

export class ElementorMcpProvider implements SyncProvider {
  constructor(private readonly config: ElementorMcpProviderConfig) {}

  async list(kind: SyncTargetKind): Promise<WpObject[]> {
    if (this.config.fallback) {
      return this.config.fallback.list(kind);
    }
    throw new Error(`MCP provider list('${kind}') requires fallback REST provider`);
  }

  async getById(kind: SyncTargetKind, id: number): Promise<WpObject> {
    if (kind === 'component') {
      if (this.config.fallback) return this.config.fallback.getById(kind, id);
      throw new Error('Component operations require REST fallback in MCP mode');
    }

    const output = await this.config.callTool('get_page', { pageId: id });
    return parseWpObjectText(output);
  }

  async getBySlug(kind: SyncTargetKind, slug: string): Promise<WpObject | null> {
    if (kind === 'component') {
      if (this.config.fallback) return this.config.fallback.getBySlug(kind, slug);
      throw new Error('Component operations require REST fallback in MCP mode');
    }

    const idText = await this.config.callTool('get_page_id_by_slug', { slug });
    const id = Number.parseInt(idText, 10);
    if (!Number.isFinite(id)) {
      return null;
    }
    return this.getById('page', id);
  }

  async updateById(kind: SyncTargetKind, id: number, payload: UpdatePayload): Promise<WpObject> {
    if (kind === 'component') {
      if (this.config.fallback) return this.config.fallback.updateById(kind, id, payload);
      throw new Error('Component operations require REST fallback in MCP mode');
    }

    await this.config.callTool('update_page', {
      pageId: id,
      title: payload.title,
      status: payload.status,
      content: payload.content,
      elementor_data: payload.elementor_data
    });

    return this.getById(kind, id).catch(() => ({
      id,
      type: 'page',
      meta: { _elementor_data: payload.elementor_data }
    }));
  }
}

function parseWpObjectText(text: string): WpObject {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('MCP tool returned invalid JSON object');
  }
  return parsed as WpObject;
}
