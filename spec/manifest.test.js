import { describe, expect, it } from 'vitest'
import manifest from '../src/manifest.json'

describe('manifest', () => {
  it('uses Zendesk Marketplace casing for the terms URL field', () => {
    expect(manifest).toHaveProperty('termsConditionsURL')
    expect(manifest).not.toHaveProperty('termsConditionsUrl')
  })
})
