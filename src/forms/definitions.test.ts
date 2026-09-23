import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { allFields, FORMS } from './definitions.ts'

/**
 * Two guarantees, checked on every run:
 *
 * 1. The two message catalogues have exactly the same keys. next-intl only
 *    complains at runtime, on the page, in the language that is missing the
 *    key — which for this site means an Arabic visitor sees "apply.fields.x".
 * 2. Every label, hint and option the form definitions refer to exists in
 *    both catalogues. A question cannot be added to a form and shipped with
 *    its label missing in one language.
 */

const url = (locale: string) => new URL(`../messages/${locale}.json`, import.meta.url)
const en = JSON.parse(readFileSync(url('en'), 'utf8')) as Record<string, unknown>
const ar = JSON.parse(readFileSync(url('ar'), 'utf8')) as Record<string, unknown>

function flatten(value: unknown, prefix = ''): Set<string> {
  const keys = new Set<string>()
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      for (const key of flatten(v, prefix ? `${prefix}.${k}` : k)) keys.add(key)
    }
  } else if (prefix) {
    keys.add(prefix)
  }
  return keys
}

const enKeys = flatten(en)
const arKeys = flatten(ar)

test('the Arabic and English catalogues have identical keys', () => {
  const onlyEn = [...enKeys].filter((k) => !arKeys.has(k))
  const onlyAr = [...arKeys].filter((k) => !enKeys.has(k))
  assert.deepEqual({ onlyEn, onlyAr }, { onlyEn: [], onlyAr: [] })
})

const has = (key: string) => enKeys.has(key) && arKeys.has(key)

for (const def of Object.values(FORMS)) {
  test(`form "${def.type}" is fully labelled in both languages`, () => {
    const missing: string[] = []
    for (const prefix of ['title', 'lead', 'cta']) {
      if (!has(`apply.types.${def.type}.${prefix}`))
        missing.push(`apply.types.${def.type}.${prefix}`)
    }
    for (const step of def.steps) {
      if (!has(`apply.steps.${step.key}`)) missing.push(`apply.steps.${step.key}`)
    }
    for (const field of allFields(def)) {
      if (!has(`apply.fields.${field.name}`)) missing.push(`apply.fields.${field.name}`)
      if (field.hint && !has(`apply.fields.${field.name}Hint`)) {
        missing.push(`apply.fields.${field.name}Hint`)
      }
      for (const option of field.options ?? []) {
        const own = `apply.options.${field.name}.${option}`
        const common = `apply.options.common.${option}`
        if (!has(own) && !has(common)) missing.push(own)
      }
      if ((field.kind === 'select' || field.kind === 'checkboxes') && !field.options?.length) {
        missing.push(`${field.name}: ${field.kind} without options`)
      }
    }
    assert.deepEqual(missing, [])
  })

  test(`form "${def.type}" field names are unique and showIf targets exist`, () => {
    const names = allFields(def).map((f) => f.name)
    assert.equal(new Set(names).size, names.length, `duplicate field in ${def.type}`)
    for (const field of allFields(def)) {
      if (field.showIf) {
        assert.ok(names.includes(field.showIf.field), `${field.name} depends on unknown field`)
      }
    }
  })
}

test('every form starts with the shared contact step', () => {
  for (const def of Object.values(FORMS)) {
    assert.equal(def.steps[0]?.key, 'contact')
    assert.deepEqual(
      def.steps[0]?.fields.map((f) => f.name),
      ['name', 'country', 'whatsapp', 'email'],
    )
  }
})
