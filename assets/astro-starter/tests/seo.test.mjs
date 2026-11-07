import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, serializeJsonLd, escapeXml } from '../src/lib/seo.mjs';
test('canonical uses the configured site and strips query and fragment', () => {
  assert.equal(canonicalUrl('/products/item/?utm_source=test#details', 'https://example.com'), 'https://example.com/products/item/');
  assert.throws(() => canonicalUrl('//other.test/item', 'https://example.com'));
  assert.throws(() => canonicalUrl('/item', 'https://example.com/subpath/'));
});
test('structured data cannot terminate its script element', () => {
  const input = { text: '</script><script>alert(1)</script>', label: '出口 & trade' };
  const output = serializeJsonLd(input);
  assert.equal(output.includes('<'), false);
  assert.deepEqual(JSON.parse(output), input);
});
test('XML special characters are escaped', () => {
  assert.equal(escapeXml('a&b<"\'>'), 'a&amp;b&lt;&quot;&apos;&gt;');
});
