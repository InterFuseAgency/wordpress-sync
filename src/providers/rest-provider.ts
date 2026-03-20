import axios, { type AxiosInstance } from 'axios';
import type { SyncProvider, SyncTargetKind, UpdatePayload, WpObject } from '../types.js';

export interface WordPressRestConfig {
  baseUrl: string;
  user?: string;
  password?: string;
}

function endpointForKind(kind: SyncTargetKind): string {
  return kind === 'component' ? 'elementor_library' : 'pages';
}

export class WordPressRestProvider implements SyncProvider {
  private readonly client: AxiosInstance;

  constructor(private readonly config: WordPressRestConfig, client?: AxiosInstance) {
    if (!config.baseUrl) {
      throw new Error('WordPress REST provider requires baseUrl');
    }

    if (client) {
      this.client = client;
      return;
    }

    const cleanBaseUrl = config.baseUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (config.user && config.password) {
      const token = Buffer.from(`${config.user}:${config.password}`, 'utf8').toString('base64');
      headers.Authorization = `Basic ${token}`;
    }

    this.client = axios.create({
      baseURL: cleanBaseUrl,
      headers
    });
  }

  async list(kind: SyncTargetKind): Promise<WpObject[]> {
    const endpoint = endpointForKind(kind);
    const out: WpObject[] = [];
    let page = 1;
    while (true) {
      const response = await this.client.get(`/wp-json/wp/v2/${endpoint}`, {
        params: {
          context: 'edit',
          per_page: 100,
          page
        }
      });
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
    const response = await this.client.get(`/wp-json/wp/v2/${endpoint}/${id}`, {
      params: { context: 'edit' }
    });
    return response.data as WpObject;
  }

  async getBySlug(kind: SyncTargetKind, slug: string): Promise<WpObject | null> {
    const endpoint = endpointForKind(kind);
    const response = await this.client.get(`/wp-json/wp/v2/${endpoint}`, {
      params: {
        slug,
        context: 'edit'
      }
    });

    const data = Array.isArray(response.data) ? response.data : [];
    return (data[0] as WpObject | undefined) ?? null;
  }

  async updateById(kind: SyncTargetKind, id: number, payload: UpdatePayload): Promise<WpObject> {
    JSON.parse(payload.elementor_data);

    const endpoint = endpointForKind(kind);
    const body: Record<string, unknown> = {
      meta: {
        _elementor_data: payload.elementor_data
      }
    };

    if (payload.title !== undefined) body.title = payload.title;
    if (payload.status !== undefined) body.status = payload.status;
    if (payload.content !== undefined) body.content = payload.content;

    const response = await this.client.post(`/wp-json/wp/v2/${endpoint}/${id}`, body);
    return response.data as WpObject;
  }
}
