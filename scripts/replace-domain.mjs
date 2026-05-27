#!/usr/bin/env node
/**
 * One-shot domain replacement: zcritical.co -> zcritical.co
 * Run from repo root: node scripts/replace-domain.mjs
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const EXTS = ['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.svg', '.txt']
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
])

const ROOT = process.cwd()
let count = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue
      walk(full)
    } else if (EXTS.some((e) => full.endsWith(e))) {
      const content = readFileSync(full, 'utf8')
      if (content.includes('zcritical.co')) {
        const updated = content.replace(/critical\.bike/g, 'zcritical.co')
        writeFileSync(full, updated)
        count++
        console.log(`  updated: ${full.replace(ROOT + '\\', '').replace(/\\/g, '/')}`)
      }
    }
  }
}

walk(ROOT)
console.log(`\nTotal files updated: ${count}`)
