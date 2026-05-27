#!/usr/bin/env node
/**
 * One-shot script to create all 4 git worktrees for parallel development.
 *
 * Usage:
 *   node scripts/setup-worktrees.mjs
 *
 * What it does:
 *   1. Creates 4 sibling directories: critical-fe / -be / -sec / -content
 *   2. Each worktree starts on its own long-lived base branch
 *   3. Prints next-step instructions
 *
 * Safe to run multiple times — skips worktrees that already exist.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname, basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const WORKSPACE_ROOT = resolve(REPO_ROOT, '..')

const STREAMS = [
  { dir: 'critical-fe', branch: 'feat/fe-base', label: 'W2 Frontend' },
  { dir: 'critical-be', branch: 'feat/be-base', label: 'W3 Backend' },
  { dir: 'critical-sec', branch: 'feat/sec-base', label: 'W4 Security' },
  { dir: 'critical-content', branch: 'feat/content-base', label: 'W5 Content' },
]

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe', ...opts })
}

function printBox(title, lines) {
  const width = Math.max(title.length, ...lines.map((l) => l.length)) + 4
  const top = '┌' + '─'.repeat(width) + '┐'
  const bot = '└' + '─'.repeat(width) + '┘'
  console.log('\n' + top)
  console.log('│ ' + title.padEnd(width - 2) + ' │')
  console.log('├' + '─'.repeat(width) + '┤')
  for (const line of lines) {
    console.log('│ ' + line.padEnd(width - 2) + ' │')
  }
  console.log(bot)
}

console.log('🌳 Critical multi-worktree setup\n')
console.log(`Repo root:      ${REPO_ROOT}`)
console.log(`Workspace root: ${WORKSPACE_ROOT}\n`)

// Verify clean working tree
const status = run('git status --porcelain').trim()
if (status) {
  console.error('❌ Working tree is not clean. Commit or stash changes first.\n')
  console.error(status)
  process.exit(1)
}

// Verify on master
const branch = run('git rev-parse --abbrev-ref HEAD').trim()
if (branch !== 'master' && branch !== 'main') {
  console.error(`❌ You are on branch "${branch}". Switch to master/main first.`)
  process.exit(1)
}

console.log(`✅ On branch ${branch}, working tree clean\n`)

// Create worktrees
let createdCount = 0
let skippedCount = 0

for (const stream of STREAMS) {
  const targetDir = join(WORKSPACE_ROOT, stream.dir)

  if (existsSync(targetDir)) {
    console.log(`⏭️  ${stream.label.padEnd(20)} ${stream.dir} (exists, skip)`)
    skippedCount++
    continue
  }

  // Check if branch already exists
  let branchExists = false
  try {
    run(`git rev-parse --verify ${stream.branch}`)
    branchExists = true
  } catch {
    branchExists = false
  }

  try {
    if (branchExists) {
      // Branch exists, just check it out as worktree
      run(`git worktree add "${targetDir}" ${stream.branch}`)
    } else {
      // Create new branch from current HEAD
      run(`git worktree add "${targetDir}" -b ${stream.branch}`)
    }
    console.log(`✅ ${stream.label.padEnd(20)} → ${stream.dir} [${stream.branch}]`)
    createdCount++
  } catch (err) {
    console.error(`❌ Failed to create ${stream.dir}:`)
    console.error(err.stdout?.toString() || err.message)
    process.exit(1)
  }
}

// Summary
printBox('Summary', [
  `Created: ${createdCount}`,
  `Skipped: ${skippedCount}`,
  `Total worktrees: ${createdCount + skippedCount}`,
])

// Verify
console.log('\n📋 All worktrees:')
console.log(run('git worktree list'))

// Next steps
printBox('Next Steps', [
  '',
  '1. Install dependencies in each worktree (one-time):',
  '',
  ...STREAMS.map(
    (s) => `   cd ../${s.dir} && pnpm install`,
  ),
  '',
  '2. Open each worktree in a separate Kiro window:',
  '',
  ...STREAMS.map((s) => `   File → Open Folder → ${s.dir}/`),
  '',
  '3. Paste the role prompt for each window:',
  '',
  '   See docs/PARALLEL-DEV-GUIDE.md §4',
  '',
  '4. Daily routine (per worktree):',
  '',
  '   git fetch origin && git rebase origin/main',
  '   # ... do your work ...',
  '   git push origin <branch>',
  '',
  '5. Coordination (in main worktree):',
  '',
  '   git fetch --all --prune',
  '   git log --all --oneline --graph -30',
  '',
])

console.log('🚀 Ready to parallelize!\n')
