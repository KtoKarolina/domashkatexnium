import test from 'node:test'
import assert from 'node:assert/strict'

test('backend: smoke (юнит-тесты сервера — подключаемые через node --test)', () => {
  assert.equal(1 + 1, 2)
})
