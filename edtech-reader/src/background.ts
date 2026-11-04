/**
 * Background Service Worker entry point.
 *
 * Plasmo automatically registers this file as the extension's service worker.
 * The Plasmo Messaging API message handlers in src/background/messages/ are
 * automatically picked up — no manual wiring is needed here.
 *
 * This file is kept minimal; actual logic lives in:
 *   - src/lib/fetchers.ts     (platform API calls)
 *   - src/background/messages/getPosts.ts (messaging handler)
 */

export {}
