export function slugify(input: string): string {
  const normalized = input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'untitled';
}
