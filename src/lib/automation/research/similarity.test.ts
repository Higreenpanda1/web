import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { closest, isCovered, normaliseArabic, similarity, tokens } from './similarity.ts'

describe('tokens', () => {
  it('folds Arabic letter variants and strips the article', () => {
    assert.deepEqual(Array.from(tokens('الاستيراد من الصين إلى السعودية')), [
      'استيراد',
      'صين',
      'سعوديه',
    ])
    assert.equal(normaliseArabic('إلى الإمارات'), 'الي الامارات')
  })
  it('drops stop words and years in English', () => {
    assert.deepEqual(Array.from(tokens('How to import from China to the UAE in 2026')), [
      'import',
      'china',
      'uae',
    ])
  })
})

describe('similarity', () => {
  it('treats reworded titles about the same subject as the same', () => {
    const a = 'تكلفة الاستيراد من الصين إلى السعودية: حساب كامل بالأرقام'
    const b = 'كم تكلفة الاستيراد من الصين للسعودية 2026'
    assert.ok(similarity(a, b) >= 0.55, String(similarity(a, b)))
    assert.ok(isCovered(b, [a]))
  })
  it('keeps genuinely different subjects apart', () => {
    const a = 'How to verify a Chinese supplier before you pay'
    const b = 'Canton Fair invitation letter and visa'
    assert.ok(similarity(a, b) < 0.2)
    assert.ok(!isCovered(b, [a]))
  })
  it('reports the closest match', () => {
    const best = closest('SABER certificate for imports from China', [
      'Canton Fair 2026 dates',
      'SABER certification: the complete guide for China imports',
    ])
    assert.match(best!.text, /SABER/)
  })
})
