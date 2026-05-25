/**
 * Next.js / Node.js standard instrumentation entry point.
 *
 * This file follows the convention of running BEFORE the rest of the
 * application code so observability (Sentry, OpenTelemetry, etc.) can
 * patch the runtime before any business module loads.
 *
 * For our backend (pure Express, not Next.js), `index.ts` already imports
 * `initSentry()` first, so this file is informational / future-ready.
 *
 * If we later split the backend into multiple entry points, each can import
 * this file as the very first line.
 */
import { initSentry } from './lib/sentry'

initSentry()
