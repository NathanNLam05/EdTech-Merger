/**
 * Unified data schema for EdTech Reader Extension.
 * Normalizes posts from Piazza, Ed Discussion, and Campuswire
 * into a single consistent interface.
 */

export interface UnifiedPost {
  /** Unique identifier (platform-prefixed to avoid collisions) */
  id: string

  /** Source platform */
  platform: "Piazza" | "Ed" | "Campuswire"

  /** Course or class identifier on the platform */
  courseId: string

  /** Post title or subject */
  title: string

  /** Body content (may contain HTML) */
  bodyHtml: string

  /** Display name of the post author */
  authorName: string

  /** ISO 8601 creation timestamp */
  createdAt: string

  /** Deep link to the original post on the platform */
  url: string
}

export interface GetPostsRequest {
  // Reserved for future filtering options (e.g. courseId filters)
}

export interface GetPostsResponse {
  posts: UnifiedPost[]
  errors: string[]
}
