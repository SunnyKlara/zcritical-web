import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names — handles conditional + de-duplication.
 *
 * Why: Tailwind's `class="bg-red-500 bg-blue-500"` doesn't merge intelligently.
 * `cn()` resolves conflicts so `cn("p-2", "p-4")` produces `"p-4"`.
 *
 * Use everywhere instead of template-string concatenation.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Deferred promise — useful for testing or coordinating async flows.
 */
export function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/**
 * Format cents (integer) as currency string.
 * 29900 -> "$299.00"
 */
export function formatCents(cents: number, currency = 'USD'): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  })
  return formatter.format(cents / 100)
}
