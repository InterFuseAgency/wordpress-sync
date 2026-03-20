import { describe, expect, test, vi } from 'vitest';
import { ElementorMcpProvider } from '../../src/providers/mcp-provider.js';

const samplePage = {
  id: 10,
  type: 'page',
  slug: 'main-page',
  meta: { _elementor_data: '[{"id":"1"}]' }
};

describe('ElementorMcpProvider', () => {
  test('getById calls get_page MCP tool', async () => {
    const callTool = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name !== 'get_page') throw new Error('unexpected tool');
      expect(args).toEqual({ pageId: 10 });
      return JSON.stringify(samplePage);
    });

    const provider = new ElementorMcpProvider({ callTool });
    const page = await provider.getById('page', 10);

    expect(page.id).toBe(10);
  });

  test('updateById calls update_page MCP tool', async () => {
    const callTool = vi.fn(async () => 'true');
    const provider = new ElementorMcpProvider({ callTool });

    await provider.updateById('page', 10, { elementor_data: '[{"id":"2"}]' });

    expect(callTool).toHaveBeenCalledWith('update_page', {
      pageId: 10,
      elementor_data: '[{"id":"2"}]'
    });
  });
});
