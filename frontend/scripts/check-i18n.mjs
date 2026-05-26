#!/usr/bin/env node
/**
 * i18n key consistency check.
 *
 * Walks all messages/*.json files and verifies that every locale has the same
 * set of keys (recursively). Prints any missing or extra keys and exits 1 if
 * there is drift.
 *
 * Usage:
 *   node scripts/check-i18n.mjs
 *
 * Wired up via package.json scripts as `pnpm --filter frontend check-i18n`
 * and run in CI alongside lint / typecheck.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const messagesDir = join(__dirname, '..', 'messages')

const files = readdirSync(messagesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()

if (files.length < 2) {
  console.log(`Only one locale (${files[0] ?? 'none'}); skipping comparison.`)
  process.exit(0)
}

/**
 * Recursively flatten a nested object into dot-notated keys.
 * @param {Record<string, unknown>} obj
 * @param {string} prefix
 * @param {Set<string>} acc
 */
function flatten(obj, prefix, acc) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, acc)
    } else {
      acc.add(path)
    }
  }
}

const locales = new Map()
for (const file of files) {
  const locale = file.replace(/\.json$/, '')
  const content = JSON.parse(readFileSync(join(messagesDir, file), 'utf8'))
  const keys = new Set()
  flatten(content, '', keys)
  locales.set(locale, keys)
}

// Use the first locale as the reference set.
const [refLocale, refKeys] = locales.entries().next().value
let drift = false

for (const [locale, keys] of locales) {
  if (locale === refLocale) continue

  const missing = [...refKeys].filter((k) => !keys.has(k)).sort()
  const extra = [...keys].filter((k) => !refKeys.has(k)).sort()

  if (missing.length || extra.length) {
    drift = true
    console.error(`\n❌ ${locale}.json drift vs ${refLocale}.json`)
    if (missing.length) {
      console.error(`  Missing ${missing.length} key(s):`)
      missing.forEach((k) => console.error(`    - ${k}`))
    }
    if (extra.length) {
      console.error(`  Extra ${extra.length} key(s):`)
      extra.forEach((k) => console.error(`    + ${k}`))
    }
  }
}

if (drift) {
  console.error(`\nFix the drift above so every locale has identical keys.\n`)
  process.exit(1)
}

console.log(`✅ All ${locales.size} locales share identical keys (${refKeys.size} keys total).`)
