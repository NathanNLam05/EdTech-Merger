/**
 * Background ingestion scripts.
 *
 * Each fetch function uses the standard fetch() API. Because host_permissions
 * are declared in the manifest, the browser automatically attaches the user's
 * active session cookies to these requests, bypassing CORS restrictions.
 */

import type { UnifiedPost } from "~types/schema"

// ---------------------------------------------------------------------------
// Piazza
// ---------------------------------------------------------------------------

/**
 * Fetches posts from Piazza using its internal JSON API.
 * Requires the user to be logged in to Piazza in the browser.
 *
 * Piazza's internal API endpoint: POST /logic/api
 * We call `network.get_my_feed` to retrieve the user's feed of posts.
 */
export async function fetchPiazzaPosts(): Promise<UnifiedPost[]> {
  // First, discover enrolled networks (courses)
  const profileResp = await fetch("https://piazza.com/logic/api", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "user.status",
      params: {}
    })
  })

  if (!profileResp.ok) {
    throw new Error(`Piazza user.status failed: ${profileResp.status}`)
  }

  const profileData = await profileResp.json()
  const networks: Array<{ id: string; name: string }> =
    profileData?.result?.networks ?? []

  const posts: UnifiedPost[] = []

  for (const network of networks.slice(0, 5)) {
    // Limit to first 5 courses to avoid flooding
    const feedResp = await fetch("https://piazza.com/logic/api", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "network.get_my_feed",
        params: {
          nid: network.id,
          limit: 20,
          offset: 0
        }
      })
    })

    if (!feedResp.ok) continue

    const feedData = await feedResp.json()
    const feed: Array<Record<string, unknown>> = feedData?.result?.feed ?? []

    for (const item of feed) {
      const id = String(item.id ?? item.nr ?? "")
      const nid = String(item.nid ?? network.id)
      posts.push({
        id: `piazza-${id}`,
        platform: "Piazza",
        courseId: nid,
        title: String(item.subject ?? item.title ?? "(No title)"),
        bodyHtml: String(
          (item.history as Array<Record<string, unknown>>)?.[0]?.content ??
            item.content ??
            ""
        ),
        authorName: String(
          (item.history as Array<Record<string, unknown>>)?.[0]?.uid ??
            item.uid ??
            "Anonymous"
        ),
        createdAt: String(item.created ?? new Date(0).toISOString()),
        url: `https://piazza.com/class/${nid}#${id}`
      })
    }
  }

  return posts
}

// ---------------------------------------------------------------------------
// Ed Discussion (edstem.org)
// ---------------------------------------------------------------------------

/**
 * Fetches posts from Ed Discussion using its REST API.
 * Requires the user to be logged in to edstem.org.
 *
 * API base: https://edstem.org/api
 */
export async function fetchEdPosts(): Promise<UnifiedPost[]> {
  // Get list of enrolled courses
  const coursesResp = await fetch("https://edstem.org/api/user", {
    credentials: "include",
    headers: { Accept: "application/json" }
  })

  if (!coursesResp.ok) {
    throw new Error(`Ed Discussion /api/user failed: ${coursesResp.status}`)
  }

  const coursesData = await coursesResp.json()
  const courses: Array<{ id: number; course: { name: string } }> =
    coursesData?.courses ?? []

  const posts: UnifiedPost[] = []

  for (const enrollment of courses.slice(0, 5)) {
    const courseId = String(enrollment.id)
    const threadsResp = await fetch(
      `https://edstem.org/api/courses/${courseId}/threads?limit=20&offset=0`,
      {
        credentials: "include",
        headers: { Accept: "application/json" }
      }
    )

    if (!threadsResp.ok) continue

    const threadsData = await threadsResp.json()
    const threads: Array<Record<string, unknown>> = threadsData?.threads ?? []

    for (const thread of threads) {
      const threadId = String(thread.id ?? "")
      posts.push({
        id: `ed-${threadId}`,
        platform: "Ed",
        courseId,
        title: String(thread.title ?? "(No title)"),
        bodyHtml: String(thread.document ?? thread.content ?? ""),
        authorName: String(
          (thread.user as Record<string, unknown>)?.name ?? "Anonymous"
        ),
        createdAt: String(thread.created_at ?? new Date(0).toISOString()),
        url: `https://edstem.org/courses/${courseId}/discussion/${threadId}`
      })
    }
  }

  return posts
}

// ---------------------------------------------------------------------------
// Campuswire
// ---------------------------------------------------------------------------

/**
 * Fetches posts from Campuswire using its internal REST API.
 * Requires the user to be logged in to Campuswire.
 *
 * API base: https://api.campuswire.com/v1
 */
export async function fetchCampuswirePosts(): Promise<UnifiedPost[]> {
  // Get groups (courses) the user belongs to
  const groupsResp = await fetch("https://api.campuswire.com/v1/groups", {
    credentials: "include",
    headers: { Accept: "application/json" }
  })

  if (!groupsResp.ok) {
    throw new Error(
      `Campuswire /v1/groups failed: ${groupsResp.status}`
    )
  }

  const groupsData = await groupsResp.json()
  const groups: Array<{ id: string; name: string }> = Array.isArray(groupsData)
    ? groupsData
    : groupsData?.groups ?? []

  const posts: UnifiedPost[] = []

  for (const group of groups.slice(0, 5)) {
    const feedResp = await fetch(
      `https://api.campuswire.com/v1/group/${group.id}/posts?limit=20`,
      {
        credentials: "include",
        headers: { Accept: "application/json" }
      }
    )

    if (!feedResp.ok) continue

    const feedData = await feedResp.json()
    const items: Array<Record<string, unknown>> = Array.isArray(feedData)
      ? feedData
      : feedData?.posts ?? []

    for (const item of items) {
      const postId = String(item.id ?? item._id ?? "")
      posts.push({
        id: `campuswire-${postId}`,
        platform: "Campuswire",
        courseId: group.id,
        title: String(item.title ?? "(No title)"),
        bodyHtml: String(item.body ?? item.content ?? ""),
        authorName: String(
          (item.author as Record<string, unknown>)?.name ??
            (item.user as Record<string, unknown>)?.name ??
            "Anonymous"
        ),
        createdAt: String(
          item.createdAt ?? item.created_at ?? new Date(0).toISOString()
        ),
        url: `https://campuswire.com/c/${group.id}/feed/${postId}`
      })
    }
  }

  return posts
}
