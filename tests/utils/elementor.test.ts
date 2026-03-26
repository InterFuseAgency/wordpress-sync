import { describe, expect, test } from 'vitest';
import {
  buildUpdatePayloadFromWpObject,
  canonicalElementorString,
  elementorHashFromWpObject,
  getElementorDataFromWpObject
} from '../../src/utils/elementor.js';

describe('elementor utils', () => {
  test('canonicalElementorString is stable for equivalent JSON', () => {
    const a = '[ {"id":"1", "elType":"section"} ]';
    const b = JSON.stringify([{ elType: 'section', id: '1' }], null, 2);

    expect(canonicalElementorString(a)).toBe(canonicalElementorString(b));
  });

  test('getElementorDataFromWpObject extracts string and object formats', () => {
    const asString = { meta: { _elementor_data: '[{"id":"1"}]' } };
    const asObject = { meta: { _elementor_data: [{ id: '1' }] } };

    expect(getElementorDataFromWpObject(asString)).toEqual([{ id: '1' }]);
    expect(getElementorDataFromWpObject(asObject)).toEqual([{ id: '1' }]);
  });

  test('elementorHashFromWpObject changes when elementor content changes', () => {
    const first = { meta: { _elementor_data: [{ id: '1' }] } };
    const second = { meta: { _elementor_data: [{ id: '2' }] } };

    expect(elementorHashFromWpObject(first)).not.toBe(elementorHashFromWpObject(second));
  });

  test('buildUpdatePayloadFromWpObject ignores content.rendered', () => {
    const payload = buildUpdatePayloadFromWpObject({
      id: 10,
      content: { rendered: '<p>Only rendered</p>' },
      meta: { _elementor_data: [{ id: '1' }] }
    });

    expect(payload.content).toBeUndefined();
  });

  test('buildUpdatePayloadFromWpObject ignores string content', () => {
    const payload = buildUpdatePayloadFromWpObject({
      id: 10,
      content: '<p>Rendered-like string</p>',
      meta: { _elementor_data: [{ id: '1' }] }
    });

    expect(payload.content).toBeUndefined();
  });

  test('buildUpdatePayloadFromWpObject ignores content for elementor builder pages', () => {
    const payload = buildUpdatePayloadFromWpObject({
      id: 10,
      content: { raw: '<p>Should not be pushed</p>' },
      meta: {
        _elementor_edit_mode: 'builder',
        _elementor_data: [{ id: '1' }]
      }
    });

    expect(payload.content).toBeUndefined();
  });

  test('buildUpdatePayloadFromWpObject keeps raw content for non-elementor pages', () => {
    const payload = buildUpdatePayloadFromWpObject({
      id: 11,
      content: { raw: '<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->' },
      meta: {}
    });

    expect(payload.content).toBe('<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->');
  });

  test('buildUpdatePayloadFromWpObject percent-encodes unicode slug for push', () => {
    const payload = buildUpdatePayloadFromWpObject({
      id: 12,
      slug: 'головна',
      meta: { _elementor_data: [{ id: '1' }] }
    });

    expect(payload.slug).toBe(encodeURIComponent('головна'));
  });
});
