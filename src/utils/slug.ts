const PERCENT_ENCODED_SEGMENT_PATTERN = /%[0-9a-f]{2}/i;

function safeDecode(input: string, decoder: (value: string) => string): string {
  if (!PERCENT_ENCODED_SEGMENT_PATTERN.test(input)) {
    return input;
  }
  try {
    return decoder(input);
  } catch {
    return input;
  }
}

export function decodePercentEncoded(input: string): string {
  return safeDecode(input, decodeURIComponent);
}

export function decodePercentEncodedUrl(input: string): string {
  return safeDecode(input, decodeURI);
}

export function encodeSlugForWordPress(input: string): string {
  return encodeURIComponent(decodePercentEncoded(input));
}

export function slugify(input: string): string {
  const decoded = decodePercentEncoded(input).trim();
  const normalized = decoded.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'untitled';
}
