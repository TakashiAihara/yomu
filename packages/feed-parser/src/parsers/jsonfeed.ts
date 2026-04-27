import type { Feed, Entry } from "../types.js"

type JsonFeedItem = {
  id?: string
  url?: string
  title?: string
  content_html?: string
  content_text?: string
  summary?: string
  date_published?: string
  date_modified?: string
  author?: { name?: string }
  authors?: { name?: string }[]
  tags?: string[]
}

type JsonFeedDoc = {
  version?: string
  title?: string
  home_page_url?: string
  feed_url?: string
  description?: string
  items?: JsonFeedItem[]
}

function resolveDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

function resolveAuthor(item: JsonFeedItem): string | undefined {
  if (item.authors?.length) return item.authors[0].name
  return item.author?.name
}

export function parseJsonFeed(json: string, feedUrl: string): Feed {
  let doc: JsonFeedDoc
  try {
    doc = JSON.parse(json)
  } catch {
    throw new Error("Not a valid JSON feed")
  }
  if (!doc.version?.includes("jsonfeed.org")) throw new Error("Not a valid JSON feed")

  const entries: Entry[] = (doc.items ?? []).map((item) => {
    const url = item.url
    if (!url) throw new Error(`Item missing url: ${JSON.stringify(item.id)}`)
    const publishedAt = resolveDate(item.date_published)
    if (!publishedAt) throw new Error(`Item missing date_published: ${url}`)

    const hasHtml = Boolean(item.content_html)

    return {
      id: item.id ?? url,
      title: item.title ?? "(no title)",
      url,
      publishedAt,
      updatedAt: resolveDate(item.date_modified),
      content: item.content_html ?? item.content_text,
      contentType: hasHtml ? "html" : "text",
      summary: item.summary,
      author: resolveAuthor(item),
      tags: item.tags ?? [],
    }
  })

  return {
    title: doc.title ?? "(no title)",
    feedUrl: doc.feed_url ?? feedUrl,
    siteUrl: doc.home_page_url,
    description: doc.description,
    entries,
  }
}
