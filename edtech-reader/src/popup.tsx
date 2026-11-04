/**
 * EdTech Unified Reader — Popup UI
 *
 * Sends a message to the background service worker to fetch aggregated posts
 * from Piazza, Ed Discussion, and Campuswire, then renders them as cards
 * with platform badges, filtering controls, and click-to-open links.
 */

import { sendToBackground } from "@plasmohq/messaging"
import { useEffect, useState } from "react"
import "./style.css"

import type { GetPostsRequest, GetPostsResponse, UnifiedPost } from "~types/schema"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = "Piazza" | "Ed" | "Campuswire"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_COLORS: Record<Platform, string> = {
  Piazza: "bg-blue-600 text-white",
  Ed: "bg-green-600 text-white",
  Campuswire: "bg-purple-600 text-white"
}

const ALL_PLATFORMS: Platform[] = ["Piazza", "Ed", "Campuswire"]

// ---------------------------------------------------------------------------
// Helper: strip HTML tags for a plain-text snippet
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function snippet(html: string, maxChars = 140): string {
  const plain = stripHtml(html)
  return plain.length > maxChars ? plain.slice(0, maxChars) + "…" : plain
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tracking-wide ${PLATFORM_COLORS[platform]}`}>
      {platform}
    </span>
  )
}

function PostCard({ post }: { post: UnifiedPost }) {
  const handleClick = () => {
    chrome.tabs.create({ url: post.url })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") handleClick()
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="flex cursor-pointer flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-indigo-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <PlatformBadge platform={post.platform} />
        <time
          dateTime={post.createdAt}
          className="whitespace-nowrap text-xs text-gray-400"
          title={new Date(post.createdAt).toLocaleString()}>
          {new Date(post.createdAt).toLocaleDateString()}
        </time>
      </div>

      {/* Title */}
      <h2 className="line-clamp-2 text-sm font-semibold text-gray-800 leading-snug">
        {post.title}
      </h2>

      {/* Body snippet */}
      {post.bodyHtml && (
        <p className="line-clamp-2 text-xs text-gray-500">
          {snippet(post.bodyHtml)}
        </p>
      )}

      {/* Author */}
      <span className="mt-0.5 text-xs text-gray-400 italic">
        by {post.authorName}
      </span>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Filter controls
// ---------------------------------------------------------------------------

function FilterBar({
  activePlatforms,
  onToggle
}: {
  activePlatforms: Set<Platform>
  onToggle: (p: Platform) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_PLATFORMS.map((p) => {
        const active = activePlatforms.has(p)
        return (
          <button
            key={p}
            onClick={() => onToggle(p)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? `${PLATFORM_COLORS[p]} border-transparent`
                : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"
            }`}>
            {p}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main popup component
// ---------------------------------------------------------------------------

function IndexPopup() {
  const [posts, setPosts] = useState<UnifiedPost[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [activePlatforms, setActivePlatforms] = useState<Set<Platform>>(
    new Set(ALL_PLATFORMS)
  )

  // Fetch posts on mount
  useEffect(() => {
    setLoading(true)
    // Plasmo generates MessagesMetadata at build time; name is valid at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sendToBackground as any)({ name: "getPosts", body: {} })
      .then((response: GetPostsResponse) => {
        setPosts(response.posts ?? [])
        setErrors(response.errors ?? [])
      })
      .catch((err: unknown) => {
        setErrors([`Failed to contact background script: ${String(err)}`])
      })
      .finally(() => setLoading(false))
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    setErrors([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sendToBackground as any)({ name: "getPosts", body: {} })
      .then((response: GetPostsResponse) => {
        setPosts(response.posts ?? [])
        setErrors(response.errors ?? [])
      })
      .catch((err: unknown) => {
        setErrors([`Failed to contact background script: ${String(err)}`])
      })
      .finally(() => setLoading(false))
  }

  const togglePlatform = (platform: Platform) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(platform)) {
        // Always keep at least one active
        if (next.size > 1) next.delete(platform)
      } else {
        next.add(platform)
      }
      return next
    })
  }

  const visiblePosts = posts.filter((p) => activePlatforms.has(p.platform))

  return (
    <div className="flex h-[600px] w-[400px] flex-col bg-gray-50 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-gray-800">EdTech Reader</h1>
          <p className="text-xs text-gray-400">Unified Course Discussion Feed</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh posts"
          className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-40">
          {/* Refresh icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      </header>

      {/* Filter bar */}
      <div className="border-b border-gray-100 bg-white px-4 py-2">
        <FilterBar activePlatforms={activePlatforms} onToggle={togglePlatform} />
      </div>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto px-3 py-3">
        {/* Error notices */}
        {errors.length > 0 && (
          <div className="mb-3 space-y-1">
            {errors.map((err, i) => (
              <div
                key={i}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                ⚠ {err}
              </div>
            ))}
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <svg
              className="h-8 w-8 animate-spin text-indigo-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <p className="text-sm">Fetching posts…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && visiblePosts.length === 0 && errors.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-400">
            <span className="text-4xl">📚</span>
            <p className="text-sm font-medium">No posts found</p>
            <p className="text-xs">
              Make sure you're logged in to Piazza, Ed, and Campuswire in this
              browser.
            </p>
          </div>
        )}

        {/* Post cards */}
        {!loading && visiblePosts.length > 0 && (
          <div className="space-y-2">
            {visiblePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-4 py-2 text-center text-xs text-gray-300">
        {!loading && `${visiblePosts.length} post${visiblePosts.length !== 1 ? "s" : ""} · `}
        EdTech Reader
      </footer>
    </div>
  )
}

export default IndexPopup
