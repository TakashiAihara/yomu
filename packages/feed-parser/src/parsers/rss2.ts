import { XMLParser } from "fast-xml-parser"
import type { Feed, Entry } from "../types.js"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "item" || name === "category",
})

function resolveDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const d = new Date(String(value))
  return isNaN(d.getTime()) ? undefined : d
}

function resolveText(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "#text" in value) {
    return String((value as { "#text": unknown })["#text"])
  }
  return undefined
}

// <author> in RSS 2.0 is typically "email (Name)" or just "Name"
function resolveAuthor(value: unknown): string | undefined {
  const raw = resolveText(value)
  if (!raw) return undefined
  const match = raw.match(/\((.+?)\)/)
  return match ? match[1] : raw
}

function resolveCategories(categories: unknown): string[] {
  if (!Array.isArray(categories)) return []
  return categories
    .map((c) => (typeof c === "string" ? c : resolveText(c)))
    .filter((t): t is string => typeof t === "string")
}

export function parseRss2(xml: string, feedUrl: string): Feed {
  const raw = parser.parse(xml)
  const channel = raw?.rss?.channel
  if (!channel) throw new Error("Not a valid RSS 2.0 feed")

  const entries: Entry[] = (channel.item ?? []).map((item: Record<string, unknown>) => {
    const url = resolveText(item.link)
    if (!url) throw new Error(`Item missing link: ${JSON.stringify(item.guid)}`)

    const publishedAt = resolveDate(item.pubDate ?? item["dc:date"])
    if (!publishedAt) throw new Error(`Item missing date: ${url}`)

    // prefer content:encoded over description
    const encoded = resolveText(item["content:encoded"])
    const description = resolveText(item.description)
    const content = encoded ?? description

    return {
      id: resolveText(item.guid) ?? url,
      title: resolveText(item.title) ?? "(no title)",
      url,
      publishedAt,
      updatedAt: undefined,
      content,
      contentType: "html",
      summary: encoded ? description : undefined,
      author: resolveAuthor(item.author ?? item["dc:creator"]),
      tags: resolveCategories(item.category),
    }
  })

  return {
    title: resolveText(channel.title) ?? "(no title)",
    feedUrl,
    siteUrl: resolveText(channel.link),
    description: resolveText(channel.description),
    entries,
  }
}
