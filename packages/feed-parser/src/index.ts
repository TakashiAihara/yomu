import { parseAtom } from "./parsers/atom.js"
import type { Feed } from "./types.js"

export type { Feed, Entry } from "./types.js"

export async function fetchFeed(url: string): Promise<Feed> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Yomu/0.1 feed-parser" },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)

  const text = await res.text()
  const contentType = res.headers.get("content-type") ?? ""

  if (contentType.includes("atom") || text.trimStart().includes("<feed")) {
    return parseAtom(text, url)
  }

  throw new Error(`Unsupported feed format (content-type: ${contentType})`)
}
