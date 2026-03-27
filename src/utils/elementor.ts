import { sha256 } from './hash.js';
import type { WpObject } from '../types.js';
import {
  decodePercentEncoded,
  decodePercentEncodedUrl,
  encodeSlugForWordPress
} from './slug.js';

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
  if (hasElementorData(obj)) {
    const elementor = getElementorDataFromWpObject(obj);
    return sha256(canonicalElementorString(elementor));
  }

  const content = getRawContentForUpdate(obj as { content?: unknown });
  return sha256(
    canonicalElementorString({
      content
    })
  );
}

export function buildUpdatePayloadFromWpObject(obj: WpObject): {
  title?: string;
  status?: string;
  content?: string;
  slug?: string;
  elementor_data?: string;
} {
  const title = typeof obj.title === 'string' ? obj.title : obj.title?.rendered;
  const hasElementor = hasElementorData(obj);
  const content =
    hasElementor
      ? undefined
      : typeof obj.content === 'object' && obj.content
        ? obj.content.raw
        : undefined;

  const elementorData = hasElementor
    ? canonicalElementorString(getElementorDataFromWpObject(obj))
    : undefined;
  const slug = typeof obj.slug === 'string' ? encodeSlugForWordPress(obj.slug) : undefined;

  return {
    title,
    status: obj.status,
    content,
    slug,
    elementor_data: elementorData
  };
}

export function normalizeWpObjectElementorData(obj: WpObject): WpObject {
  if (!hasElementorData(obj)) {
    return obj;
  }

  return {
    ...obj,
    meta: {
      ...obj.meta,
      _elementor_data: getElementorDataFromWpObject(obj)
    }
  };
}

export function prepareWpObjectForLocalEdit(obj: WpObject): WpObject {
  const decoded = decodeWpObjectTextFields(obj);
  const normalized = normalizeWpObjectElementorData(decoded);
  if (!hasElementorData(normalized)) {
    return normalized;
  }

  const { content: _content, excerpt: _excerpt, ...rest } = normalized;
  return rest;
}

function decodeWpObjectTextFields(obj: WpObject): WpObject {
  const out: WpObject = {
    ...obj
  };

  if (typeof out.slug === 'string') {
    out.slug = decodePercentEncoded(out.slug);
  }
  if (typeof out.generated_slug === 'string') {
    out.generated_slug = decodePercentEncoded(out.generated_slug);
  }
  if (typeof out.link === 'string') {
    out.link = decodePercentEncodedUrl(out.link);
  }
  if (typeof out.permalink_template === 'string') {
    out.permalink_template = decodePercentEncodedUrl(out.permalink_template);
  }

  return out;
}

function hasElementorData(obj: { meta?: { _elementor_data?: unknown } }): boolean {
  const raw = obj.meta?._elementor_data;
  if (raw === undefined || raw === null) {
    return false;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return false;
    }
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  return true;
}

function getRawContentForUpdate(obj: { content?: unknown }): string | undefined {
  if (typeof obj.content === 'object' && obj.content && 'raw' in obj.content) {
    const raw = (obj.content as { raw?: unknown }).raw;
    return typeof raw === 'string' ? raw : undefined;
  }
  return undefined;
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
