import assert from 'node:assert/strict'
import { test } from 'node:test'

import { OTHER_COUNTRIES, PRIORITY_COUNTRIES, searchCountries } from './countries.ts'

const codes = (query: string) => searchCountries(query).map((country) => country.code)

test('finds a country by its Arabic name, with or without the article', () => {
  assert.equal(codes('اليمن')[0], 'YE')
  assert.equal(codes('يمن')[0], 'YE')
  assert.equal(codes('سعوديه')[0], 'SA')
  assert.equal(codes('امارات')[0], 'AE')
})

test('finds a country by its English name or a common alias, in any case', () => {
  assert.equal(codes('yemen')[0], 'YE')
  assert.equal(codes('Saudi')[0], 'SA')
  assert.equal(codes('uae')[0], 'AE')
  assert.equal(codes('turkey')[0], 'TR')
  assert.equal(codes('Turkiye')[0], 'TR')
})

test('puts names that start with the query first', () => {
  assert.equal(codes('ع')[0], 'OM')
})

test('returns nothing for text that names no country', () => {
  assert.deepEqual(codes('xyz'), [])
})

test('an empty query lists every country', () => {
  assert.equal(codes('').length, PRIORITY_COUNTRIES.length + OTHER_COUNTRIES.length)
})
