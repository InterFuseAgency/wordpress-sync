import { describe, expect, test, vi } from 'vitest';
import { WordPressRestProvider } from '../../src/providers/rest-provider.js';

function makeClient() {
  return {
    get: vi.fn(),
    post: vi.fn()
  };
}

describe('WordPressRestProvider', () => {
  test('updateById sends Elementor payload under meta._elementor_data', async () => {
    const client = makeClient();
    client.post.mockResolvedValue({ data: { id: 10 } });

    const provider = new WordPressRestProvider(
      { baseUrl: 'https://example.com', user: 'u', password: 'p' },
      client as never
    );

    await provider.updateById('page', 10, { elementor_data: '[{"id":"1"}]' });

    expect(client.post).toHaveBeenCalledWith('/wp-json/wp/v2/pages/10', {
      meta: { _elementor_data: '[{"id":"1"}]' }
    });
  });
});
