import { describe, expect, test, vi } from 'vitest';
import { WordPressRestProvider } from '../../src/providers/rest-provider.js';

function makeClient() {
  return {
    get: vi.fn(),
    post: vi.fn()
  };
}

describe('WordPressRestProvider', () => {
  test('uses session auth (cookie + nonce) by default when user/password provided', async () => {
    const client = makeClient();
    client.post.mockResolvedValue({ data: { id: 10 } });
    const sessionResolver = vi.fn(async () => ({
      nonce: 'nonce-session',
      cookie: 'wordpress_logged_in=session-cookie'
    }));

    const provider = new WordPressRestProvider(
      { baseUrl: 'https://example.com', user: 'u', password: 'p' },
      client as never,
      sessionResolver
    );

    await provider.updateById('page', 10, { elementor_data: '[{"id":"1"}]' });

    expect(sessionResolver).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledWith(
      '/wp-json/wp/v2/pages/10',
      {
        meta: { _elementor_data: '[{"id":"1"}]' }
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-WP-Nonce': 'nonce-session',
          Cookie: 'wordpress_logged_in=session-cookie'
        })
      })
    );
  });

  test('uses explicit nonce+cookie auth headers when provided', async () => {
    const client = makeClient();
    client.post.mockResolvedValue({ data: { id: 10 } });

    const provider = new WordPressRestProvider(
      {
        baseUrl: 'https://example.com',
        nonce: 'nonce-123',
        cookie: 'wordpress_logged_in=test'
      },
      client as never
    );

    await provider.updateById('page', 10, { elementor_data: '[{"id":"1"}]' });

    expect(client.post).toHaveBeenCalledWith(
      '/wp-json/wp/v2/pages/10',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-WP-Nonce': 'nonce-123',
          Cookie: 'wordpress_logged_in=test'
        })
      })
    );
  });

  test('supports explicit basic auth mode', async () => {
    const client = makeClient();
    client.post.mockResolvedValue({ data: { id: 10 } });

    const provider = new WordPressRestProvider(
      {
        baseUrl: 'https://example.com',
        user: 'admin',
        password: 'pass',
        authMode: 'basic'
      },
      client as never
    );

    await provider.updateById('page', 10, { elementor_data: '[{"id":"1"}]' });

    expect(client.post).toHaveBeenCalledWith(
      '/wp-json/wp/v2/pages/10',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.any(String)
        })
      })
    );
  });

  test('refreshes session and retries when nonce/cookie become invalid', async () => {
    const client = makeClient();
    client.get
      .mockRejectedValueOnce({
        response: {
          status: 401,
          data: { code: 'rest_cookie_invalid_nonce' }
        }
      })
      .mockResolvedValueOnce({ data: { id: 10 } });

    const sessionResolver = vi
      .fn()
      .mockResolvedValueOnce({
        nonce: 'nonce-old',
        cookie: 'wordpress_logged_in=old'
      })
      .mockResolvedValueOnce({
        nonce: 'nonce-new',
        cookie: 'wordpress_logged_in=new'
      });

    const provider = new WordPressRestProvider(
      { baseUrl: 'https://example.com', user: 'admin', password: 'pass' },
      client as never,
      sessionResolver
    );

    const result = await provider.getById('page', 10);
    expect(result.id).toBe(10);
    expect(sessionResolver).toHaveBeenCalledTimes(2);
    expect(client.get).toHaveBeenCalledTimes(2);
    expect(client.get.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-WP-Nonce': 'nonce-new',
          Cookie: 'wordpress_logged_in=new'
        })
      })
    );
  });
});
