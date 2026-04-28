import { describe, it, expect } from 'vitest'

describe('Звёздный оракул (smoke)', () => {
  it('vitest и конфиг подключены', () => {
    expect(import.meta.env.MODE === 'test' || import.meta.env.MODE === 'development').toBe(true)
  })
})
