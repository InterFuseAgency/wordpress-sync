import axios, { type AxiosInstance } from 'axios';
import type { SyncProvider, SyncTargetKind, UpdatePayload, WpObject } from '../types.js';

export interface WordPressRestConfig {
  baseUrl: string;
  user?: string;
  password?: string;
  nonce?: string;
  cookie?: string;
  authMode?: 'session' | 'basic' | 'auto';
}

function endpointForKind(kind: SyncTargetKind): string {
  return kind === 'component' ? 'elementor_library' : 'pages';
}

export interface SessionAuthState {
  cookie: string;
  nonce: string;
}

type SessionAuthResolver = (
  baseUrl: string,
  user: string,
  password: string
) => Promise<SessionAuthState>;

export class WordPressRestProvider implements SyncProvider {
  private readonly client: AxiosInstance;
  private readonly cleanBaseUrl: string;
  private readonly sessionAuthResolver: SessionAuthResolver;
  private sessionAuth: SessionAuthState | null = null;
  private sessionAuthPromise: Promise<SessionAuthState> | null = null;

  constructor(
    private readonly config: WordPressRestConfig,
    client?: AxiosInstance,
    sessionAuthResolver: SessionAuthResolver = defaultSessionAuthResolver
  ) {
    if (!config.baseUrl) {
      throw new Error('WordPress REST provider requires baseUrl');
    }
    this.cleanBaseUrl = config.baseUrl.replace(/\/+$/, '');
    this.sessionAuthResolver = sessionAuthResolver;
    if (config.cookie && config.nonce) {
      this.sessionAuth = {
        cookie: config.cookie,
        nonce: config.nonce
      };
    }

    if (client) {
      this.client = client;
      return;
    }

    this.client = axios.create({
      baseURL: this.cleanBaseUrl
    });
  }

  async list(kind: SyncTargetKind): Promise<WpObject[]> {
    const endpoint = endpointForKind(kind);
    const out: WpObject[] = [];
    let page = 1;
    while (true) {
      const response = await this.requestWithAuth((headers) =>
        this.client.get(`/wp-json/wp/v2/${endpoint}`, {
          params: {
            context: 'edit',
            per_page: 100,
            page
          },
          headers
        })
      );
      const items = Array.isArray(response.data) ? (response.data as WpObject[]) : [];
      out.push(...items);

      const totalPages = Number(response.headers?.['x-wp-totalpages'] ?? 1);
      if (!Number.isFinite(totalPages) || page >= totalPages || items.length === 0) {
        break;
      }
      page += 1;
    }

    return out;
  }

  async getById(kind: SyncTargetKind, id: number): Promise<WpObject> {
    const endpoint = endpointForKind(kind);
    const response = await this.requestWithAuth((headers) =>
      this.client.get(`/wp-json/wp/v2/${endpoint}/${id}`, {
        params: { context: 'edit' },
        headers
      })
    );
    return response.data as WpObject;
  }

  async getBySlug(kind: SyncTargetKind, slug: string): Promise<WpObject | null> {
    const endpoint = endpointForKind(kind);
    const response = await this.requestWithAuth((headers) =>
      this.client.get(`/wp-json/wp/v2/${endpoint}`, {
        params: {
          slug,
          context: 'edit'
        },
        headers
      })
    );

    const data = Array.isArray(response.data) ? response.data : [];
    return (data[0] as WpObject | undefined) ?? null;
  }

  async updateById(kind: SyncTargetKind, id: number, payload: UpdatePayload): Promise<WpObject> {
    const endpoint = endpointForKind(kind);
    const body: Record<string, unknown> = {};

    if (payload.elementor_data !== undefined) {
      JSON.parse(payload.elementor_data);
      body.meta = {
        _elementor_data: payload.elementor_data
      };
    }

    if (payload.title !== undefined) body.title = payload.title;
    if (payload.status !== undefined) body.status = payload.status;
    if (payload.content !== undefined) body.content = payload.content;
    if (payload.slug !== undefined) body.slug = payload.slug;

    const response = await this.requestWithAuth((headers) =>
      this.client.post(`/wp-json/wp/v2/${endpoint}/${id}`, body, {
        headers
      })
    );
    return response.data as WpObject;
  }

  private async requestWithAuth<T>(
    request: (headers: Record<string, string>) => Promise<T>
  ): Promise<T> {
    const headers = await this.resolveAuthHeaders();
    try {
      return await request(headers);
    } catch (error) {
      if (!this.shouldRefreshSession(error)) {
        throw error;
      }
      await this.refreshSessionAuth();
      const headers = await this.resolveAuthHeaders();
      return request(headers);
    }
  }

  private authMode(): 'session' | 'basic' | 'auto' | 'none' {
    if (this.config.authMode) return this.config.authMode;
    if (this.config.user && this.config.password) return 'session';
    return 'none';
  }

  private async resolveAuthHeaders(): Promise<Record<string, string>> {
    if (this.sessionAuth) {
      return {
        Cookie: this.sessionAuth.cookie,
        'X-WP-Nonce': this.sessionAuth.nonce
      };
    }

    if (this.authMode() === 'basic' && this.config.user && this.config.password) {
      const token = Buffer.from(
        `${this.config.user}:${this.config.password}`,
        'utf8'
      ).toString('base64');
      return {
        Authorization: `Basic ${token}`
      };
    }

    if (
      (this.authMode() === 'session' || this.authMode() === 'auto') &&
      this.config.user &&
      this.config.password
    ) {
      try {
        await this.ensureSessionAuth();
      } catch (error) {
        if (this.authMode() !== 'auto') throw error;
        const token = Buffer.from(
          `${this.config.user}:${this.config.password}`,
          'utf8'
        ).toString('base64');
        return {
          Authorization: `Basic ${token}`
        };
      }

      const session = this.sessionAuth as SessionAuthState | null;
      if (session) {
        return {
          Cookie: session.cookie,
          'X-WP-Nonce': session.nonce
        };
      }
    }

    return {};
  }

  private shouldRefreshSession(error: unknown): boolean {
    if (this.authMode() === 'basic') {
      return false;
    }
    if (!this.config.user || !this.config.password) {
      return false;
    }
    if (!error || typeof error !== 'object') {
      return false;
    }

    const response = (error as { response?: { status?: number; data?: { code?: string } } }).response;
    if (!response || response.status !== 401) {
      return false;
    }

    const code = response.data?.code ?? '';
    return (
      code === 'rest_forbidden_context' ||
      code === 'rest_forbidden' ||
      code === 'rest_cannot_edit' ||
      code === 'rest_cookie_invalid_nonce'
    );
  }

  private async ensureSessionAuth(): Promise<void> {
    if (this.sessionAuth) {
      return;
    }
    if (this.sessionAuthPromise) {
      this.sessionAuth = await this.sessionAuthPromise;
      return;
    }
    if (!this.config.user || !this.config.password) {
      throw new Error('Session auth fallback requires user/password');
    }

    this.sessionAuthPromise = this.sessionAuthResolver(
      this.cleanBaseUrl,
      this.config.user,
      this.config.password
    );
    try {
      this.sessionAuth = await this.sessionAuthPromise;
    } finally {
      this.sessionAuthPromise = null;
    }
  }

  private async refreshSessionAuth(): Promise<void> {
    this.sessionAuth = null;
    this.sessionAuthPromise = null;
    await this.ensureSessionAuth();
  }
}

function extractSetCookies(headers: Headers): string[] {
  const withSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof withSetCookie.getSetCookie === 'function') {
    return withSetCookie.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function upsertCookiesFromHeaders(
  store: Map<string, string>,
  headers: Headers
): void {
  for (const setCookie of extractSetCookies(headers)) {
    const pair = setCookie.split(';', 1)[0];
    const equals = pair.indexOf('=');
    if (equals <= 0) continue;
    const name = pair.slice(0, equals).trim();
    const value = pair.slice(equals + 1).trim();
    if (!name) continue;
    store.set(name, value);
  }
}

function toCookieHeader(store: Map<string, string>): string {
  return Array.from(store.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function extractRestNonce(adminHtml: string): string {
  const settingsMatch = adminHtml.match(/wpApiSettings\s*=\s*(\{.*?\});/s);
  if (settingsMatch) {
    try {
      const parsed = JSON.parse(settingsMatch[1]) as { nonce?: unknown };
      if (typeof parsed.nonce === 'string' && parsed.nonce) {
        return parsed.nonce;
      }
    } catch {
      // no-op: fallback regex below
    }
  }

  const nonceMatch = adminHtml.match(/"nonce":"([a-zA-Z0-9]+)"/);
  if (nonceMatch) {
    return nonceMatch[1];
  }

  throw new Error('Unable to extract WordPress REST nonce from wp-admin HTML');
}

async function defaultSessionAuthResolver(
  baseUrl: string,
  user: string,
  password: string
): Promise<SessionAuthState> {
  const cookieStore = new Map<string, string>();
  const loginUrl = `${baseUrl}/wp-login.php`;
  const adminUrl = `${baseUrl}/wp-admin/`;

  const loginPageResponse = await fetch(loginUrl, {
    method: 'GET',
    redirect: 'manual'
  });
  upsertCookiesFromHeaders(cookieStore, loginPageResponse.headers);

  const loginPayload = new URLSearchParams({
    log: user,
    pwd: password,
    'wp-submit': 'Log In',
    redirect_to: adminUrl,
    testcookie: '1'
  });

  const loginPostResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: toCookieHeader(cookieStore)
    },
    body: loginPayload.toString(),
    redirect: 'manual'
  });
  upsertCookiesFromHeaders(cookieStore, loginPostResponse.headers);

  const hasLoggedInCookie = Array.from(cookieStore.keys()).some((name) =>
    name.startsWith('wordpress_logged_in_')
  );
  if (!hasLoggedInCookie) {
    const loginHtml = await loginPostResponse.text();
    if (/login_error|incorrect_password|invalid_username/i.test(loginHtml)) {
      throw new Error('WordPress login failed: invalid username/password');
    }
    throw new Error('WordPress login failed: logged-in cookie was not issued');
  }

  const location = loginPostResponse.headers.get('location') || adminUrl;
  const target = location.startsWith('http') ? location : `${baseUrl}${location}`;

  const adminResponse = await fetch(target, {
    method: 'GET',
    headers: {
      Cookie: toCookieHeader(cookieStore)
    },
    redirect: 'follow'
  });
  upsertCookiesFromHeaders(cookieStore, adminResponse.headers);

  const html = await adminResponse.text();
  if (!html.includes('wp-admin-bar-my-account')) {
    throw new Error('WordPress login failed: wp-admin session is not authenticated');
  }
  const nonce = extractRestNonce(html);
  const cookie = toCookieHeader(cookieStore);
  if (!cookie) {
    throw new Error('WordPress session auth failed: empty cookie jar');
  }

  return { cookie, nonce };
}
