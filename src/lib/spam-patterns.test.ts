import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isInjectedSpamPath } from './spam-patterns.ts'

test('catches the injected gambling paths that are still indexed', () => {
  const spam = [
    '/slot-gacor',
    '/situs-judi-bola-terpercaya',
    '/en/slot88-maxwin',
    '/togel/hongkong',
    '/daftar/sbobet',
    '/link-alternatif',
    '/rtp-live-slot',
    '/bandarqq',
    '/wp-admin/',
    '/wp-login.php',
    '/wp-content/uploads/shell.php',
    '/xmlrpc.php',
    '/.env',
    '/.git/config',
    '/backup/dump.sql',
    '/index.php',
    '/anything.aspx',
  ]
  for (const path of spam) {
    assert.equal(isInjectedSpamPath(path), true, `${path} should be 410 Gone`)
  }
})

test('never matches a real page on this site', () => {
  const legitimate = [
    '/',
    '/en',
    '/services',
    '/services/product-sourcing',
    '/services/full-import-management',
    '/services/company-formation',
    '/services/quality-inspection',
    '/services/shipping-and-freight',
    '/services/ecommerce-launch',
    '/services/business-consulting',
    '/services/manufacturing',
    '/services/trade-fair-support',
    '/en/services/product-sourcing',
    '/about',
    '/en/about',
    '/blog',
    '/blog/opening-an-online-store-through-a-chinese-company',
    '/blog/how-to-inspect-a-factory-in-china',
    '/contact',
    '/privacy',
    '/terms',
    '/sitemap.xml',
    '/robots.txt',
    '/favicon.ico',
    '/hgp-studio',
  ]
  for (const path of legitimate) {
    assert.equal(isInjectedSpamPath(path), false, `${path} must not be treated as spam`)
  }
})

test('does not mistake ordinary Arabic-transliterated slugs for spam', () => {
  // These contain substrings from the pattern vocabulary but are real words.
  const safe = [
    '/blog/slotting-fees-explained',
    '/blog/total-landed-cost',
    '/blog/casino-royale-packaging-case-study',
  ]
  for (const path of safe) {
    assert.equal(isInjectedSpamPath(path), false, `${path} must not be treated as spam`)
  }
})
