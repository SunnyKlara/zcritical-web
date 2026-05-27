/**
 * Mongoose plugin: transparent at-rest encryption of selected fields.
 *
 * Goals:
 *   1. Calling code keeps reading `lead.email` etc. — no visible API change.
 *   2. Stored documents are unreadable in DB dumps / backups / Atlas console.
 *   3. Equality lookups stay possible via paired blind-index columns
 *      (e.g. `email` ⇄ `emailHash`).
 *
 * Format:
 *   - Plaintext on save → `encryptString` → `v1:iv:tag:ct` ciphertext
 *   - Ciphertext on init → `decryptString` → plaintext
 *
 * Migration safety:
 *   - `looksEncrypted()` test on init means rows written before this plugin
 *     was installed remain readable until a migration script encrypts them.
 *   - On save, already-encrypted strings are never re-encrypted (idempotent).
 *
 * Scope:
 *   - Top-level fields: pass field path like `'email'`.
 *   - Nested fields: pass dotted path like `'shippingAddress.fullName'`.
 *
 * Limitations:
 *   - Encrypted fields cannot be queried by value directly. Use a blind index
 *     sidecar column for equality lookups.
 *   - Range / partial / regex queries are impossible by design.
 */
import type { Schema } from 'mongoose'
import { decryptString, encryptString, looksEncrypted } from '../lib/crypto'
import { logger } from '../config/logger'

/** Symbol to attach pre-save originals to the doc so post-save can restore. */
const ENCRYPTED_RESTORE_KEY = Symbol.for('critical:encrypted-fields:originals')

export interface EncryptedFieldsOptions {
  /** Top-level or dotted field paths to encrypt. */
  fields: string[]
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  // Prefer Mongoose's `get(path)` when available — this resolves nested paths
  // through getter chains correctly.
  const get = (obj as { get?: (p: string) => unknown }).get
  if (typeof get === 'function') {
    return get.call(obj, path)
  }
  const segs = path.split('.')
  let cur: unknown = obj
  for (const s of segs) {
    if (cur && typeof cur === 'object' && s in cur) {
      cur = (cur as Record<string, unknown>)[s]
    } else {
      return undefined
    }
  }
  return cur
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  // Prefer Mongoose's `set(path, value)` so internal change tracking + nested
  // schema paths work correctly. Fall back to a manual walk for plain objects
  // (used by `decryptLean` against `.lean()` results).
  const set = (obj as { set?: (p: string, v: unknown) => unknown }).set
  if (typeof set === 'function') {
    set.call(obj, path, value)
    return
  }
  const segs = path.split('.')
  let cur: Record<string, unknown> = obj
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i]!
    const next = cur[s]
    if (!next || typeof next !== 'object') return
    cur = next as Record<string, unknown>
  }
  cur[segs[segs.length - 1]!] = value
}

export function encryptedFieldsPlugin(schema: Schema, options: EncryptedFieldsOptions): void {
  const fields = options.fields

  // ── Pre-save: encrypt plaintext values, remembering originals ──────────────
  schema.pre('save', function preSaveEncrypt(this: Record<string, unknown>, next) {
    try {
      const originals: Record<string, string> = {}
      for (const path of fields) {
        const v = getPath(this, path)
        if (typeof v === 'string' && v.length > 0 && !looksEncrypted(v)) {
          originals[path] = v
          setPath(this, path, encryptString(v))
        }
      }
      // Stash originals on the doc so post('save') can restore them.
      ;(this as Record<string | symbol, unknown>)[ENCRYPTED_RESTORE_KEY] = originals
      next()
    } catch (err) {
      next(err as Error)
    }
  })

  // ── Post-save: restore plaintext for the in-memory document ────────────────
  // This keeps `await order.save(); sendMail(order.email)` working even though
  // the on-disk row is encrypted.
  schema.post('save', function postSaveRestore(this: Record<string, unknown>) {
    const originals = (this as Record<string | symbol, unknown>)[ENCRYPTED_RESTORE_KEY] as
      | Record<string, string>
      | undefined
    if (!originals) return
    for (const [path, plain] of Object.entries(originals)) {
      setPath(this, path, plain)
    }
    delete (this as Record<string | symbol, unknown>)[ENCRYPTED_RESTORE_KEY]
  })

  // ── Pre-update hooks: encrypt values supplied via $set ────────────────────
  function maybeEncryptUpdate(this: { getUpdate(): unknown; setUpdate(u: unknown): void }) {
    const update = this.getUpdate() as Record<string, unknown> | null
    if (!update) return
    const set = (update.$set ?? update) as Record<string, unknown>
    for (const path of fields) {
      const v = getPath(set, path)
      if (typeof v === 'string' && v.length > 0 && !looksEncrypted(v)) {
        setPath(set, path, encryptString(v))
      }
    }
    this.setUpdate(update)
  }

  schema.pre('findOneAndUpdate', function (next) {
    maybeEncryptUpdate.call(this)
    next()
  })
  schema.pre('updateOne', function (next) {
    maybeEncryptUpdate.call(this)
    next()
  })
  schema.pre('updateMany', function (next) {
    maybeEncryptUpdate.call(this)
    next()
  })

  // ── Post-init: decrypt when documents are hydrated from the DB ────────────
  schema.post('init', function postInitDecrypt(this: Record<string, unknown>) {
    for (const path of fields) {
      const v = getPath(this, path)
      if (looksEncrypted(v)) {
        try {
          setPath(this, path, decryptString(v))
        } catch (err) {
          // Don't crash hydration on a single bad ciphertext — log + leave field as-is.
          logger.error(
            {
              err,
              path,
              model: (this as { constructor?: { modelName?: string } }).constructor?.modelName,
            },
            'Failed to decrypt field — record may be tampered or use an old key',
          )
        }
      }
    }
  })
}

/**
 * Helper: walk an array of `lean()` results and decrypt the listed fields
 * in-place. Use this when you need cipher transparency for `.lean()` reads
 * (which bypass `post('init')` since Mongoose doesn't hydrate them).
 */
export function decryptLean<T extends Record<string, unknown>>(fields: string[], docs: T[]): T[] {
  for (const doc of docs) {
    for (const path of fields) {
      const v = getPath(doc, path)
      if (looksEncrypted(v)) {
        try {
          setPath(doc, path, decryptString(v))
        } catch {
          // leave as-is
        }
      }
    }
  }
  return docs
}

/** Single-doc variant. */
export function decryptLeanOne<T extends Record<string, unknown>>(
  fields: string[],
  doc: T | null,
): T | null {
  if (!doc) return null
  return decryptLean(fields, [doc])[0]!
}
