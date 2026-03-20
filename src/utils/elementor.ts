import { sha256 } from './hash.js';
import type { WpObject } from '../types.js';

export function getElementorDataFromWpObject(obj: WpObject | { meta?: { _elementor_data?: unknown } }): unknown {
  const raw = obj.meta?._elementor_data;
  if (raw === undefined || raw === null) {
    throw new Error('Missing meta._elementor_data in WP object');
  }

  if (typeof raw === 'string') {
    return JSON.parse(raw);
  }

  return raw;
}

export function canonicalElementorString(value: unknown): string {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return JSON.stringify(sortJsonDeep(parsed), null, 0);
}

export function elementorHashFromWpObject(
  obj: WpObject | { meta?: { _elementor_data?: unknown } }
): string {
  const elementor = getElementorDataFromWpObject(obj);
  return sha256(canonicalElementorString(elementor));
}

export function buildUpdatePayloadFromWpObject(obj: WpObject): {
  title?: string;
  status?: string;
  content?: string;
  elementor_data: string;
} {
  const title = typeof obj.title === 'string' ? obj.title : obj.title?.rendered;
  const content =
    typeof obj.content === 'string'
      ? obj.content
      : obj.content?.raw ?? obj.content?.rendered;

  return {
    title,
    status: obj.status,
    content,
    elementor_data: canonicalElementorString(getElementorDataFromWpObject(obj))
  };
}

function sortJsonDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonDeep(item));
  }
  if (value && typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b)
    );
    const out: Record<string, unknown> = {};
    for (const [key, nested] of sortedEntries) {
      out[key] = sortJsonDeep(nested);
    }
    return out;
  }
  return value;
}
