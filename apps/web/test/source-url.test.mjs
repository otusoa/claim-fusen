import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceUrl } from '../src/utils/source-url.ts'

test('HTTP and HTTPS sources can be linked', () => {
  assert.equal(sourceUrl('https://example.com/paper?page=3#quote'), 'https://example.com/paper?page=3#quote')
  assert.equal(sourceUrl('http://example.com/'), 'http://example.com/')
  assert.equal(sourceUrl(' HTTPS://example.com/paper '), 'https://example.com/paper')
})

test('executable and non-web schemes never become source links', () => {
  for (const value of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///C:/example.txt',
    'mailto:example@example.com',
    'ftp://example.com/paper',
  ]) {
    assert.equal(sourceUrl(value), null, value)
  }
})

test('missing, malformed and relative sources stay unlinked', () => {
  for (const value of [null, '', ' ', 'not a URL', '/paper', '//example.com/paper', 'https://']) {
    assert.equal(sourceUrl(value), null, String(value))
  }
})
