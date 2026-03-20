import { describe, expect, test } from 'vitest';
import { canonicalElementorString, elementorHashFromWpObject, getElementorDataFromWpObject } from '../../src/utils/elementor.js';

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
});
