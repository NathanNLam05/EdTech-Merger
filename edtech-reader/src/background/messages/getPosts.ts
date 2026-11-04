/**
 * Plasmo Messaging API handler: getPosts
 *
 * This message endpoint is called by the popup UI to request aggregated posts
 * from all three platforms. It runs in the Service Worker context, so it can
 * make cross-origin authenticated requests using the user's session cookies.
 */

import type { PlasmoMessaging } from "@plasmohq/messaging"
import {
  fetchCampuswirePosts,
  fetchEdPosts,
  fetchPiazzaPosts
} from "~lib/fetchers"
import type { GetPostsRequest, GetPostsResponse, UnifiedPost } from "~types/schema"

const handler: PlasmoMessaging.MessageHandler<
  GetPostsRequest,
  GetPostsResponse
> = async (_req, res) => {
  const errors: string[] = []
  const results: UnifiedPost[] = []

  // Run all three fetchers concurrently, capturing individual errors so a
  // failure on one platform doesn't block the others.
  const [piazzaResult, edResult, campuswireResult] = await Promise.allSettled([
    fetchPiazzaPosts(),
    fetchEdPosts(),
    fetchCampuswirePosts()
  ])

  if (piazzaResult.status === "fulfilled") {
    results.push(...piazzaResult.value)
  } else {
    console.error("Piazza fetch failed:", piazzaResult.reason)
    errors.push(`Piazza: ${String(piazzaResult.reason)}`)
  }

  if (edResult.status === "fulfilled") {
    results.push(...edResult.value)
  } else {
    console.error("Ed Discussion fetch failed:", edResult.reason)
    errors.push(`Ed Discussion: ${String(edResult.reason)}`)
  }

  if (campuswireResult.status === "fulfilled") {
    results.push(...campuswireResult.value)
  } else {
    console.error("Campuswire fetch failed:", campuswireResult.reason)
    errors.push(`Campuswire: ${String(campuswireResult.reason)}`)
  }

  // Sort all posts by date descending (newest first)
  results.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  res.send({ posts: results, errors })
}

export default handler
