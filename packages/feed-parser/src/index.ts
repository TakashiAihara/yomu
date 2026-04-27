import { parseAtom } from "./parsers/atom.js"
import { parseRss2 } from "./parsers/rss2.js"
import { parseJsonFeed } from "./parsers/jsonfeed.js"
import { parseRdf } from "./parsers/rdf.js"
import type { Feed } from "./types.js"

export type { Feed, Entry } from "./types.js"

type Format = "atom" | "rss2" | "jsonfeed" | "rdf"

function detectFormat(contentType: string, body: string): Format {
  if (contentType.includes("application/feed+json") || contentType.includes("application/json")) {
    return "jsonfeed"
  }
  if (contentType.includes("application/rdf+xml")) return "rdf"
  if (contentType.includes("application/rss+xml")) return "rss2"
  if (contentType.includes("application/atom+xml")) return "atom"

  const sniff = body.trimStart()
  if (sniff.startsWith("{")) return "jsonfeed"
  if (sniff.includes("<rdf:RDF")) return "rdf"
  if (sniff.includes("<rss")) return "rss2"
  if (sniff.includes("<feed")) return "atom"

  throw new Error(`Unsupported feed format (content-type: ${contentType})`)
}

export async function fetchFeed(url: string): Promise<Feed> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Yomu/0.1 feed-parser" },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)

  const body = await res.text()
  const contentType = res.headers.get("content-type") ?? ""
  const format = detectFormat(contentType, body)

  switch (format) {
    case "atom":
      return parseAtom(body, url)
    case "rss2":
      return parseRss2(body, url)
    case "jsonfeed":
      return parseJsonFeed(body, url)
    case "rdf":
      return parseRdf(body, url)
  }
}
