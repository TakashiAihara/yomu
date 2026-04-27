import { XMLParser } from "fast-xml-parser"
import type { Feed, Entry } from "../types.js"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "entry" || name === "category" || name === "link",
})

function resolveLink(links: unknown): string | undefined {
  if (!Array.isArray(links)) return undefined
  const alternate = links.find(
    (l: { "@_rel"?: string; "@_href"?: string }) =>
      !l["@_rel"] || l["@_rel"] === "alternate",
  )
  return alternate?.["@_href"]
}

type ContentType = "text" | "html" | "xhtml"

function resolveText(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "#text" in value) {
    return String((value as { "#text": unknown })["#text"])
  }
  return undefined
}

function resolveContentType(value: unknown): ContentType {
  const t = typeof value === "object" && value !== null
    ? (value as { "@_type"?: string })["@_type"]
    : undefined
  if (t === "text" || t === "html" || t === "xhtml") return t
  return "html"
}

function resolveDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const d = new Date(String(value))
  return isNaN(d.getTime()) ? undefined : d
}

function resolveCategories(categories: unknown): string[] {
  if (!Array.isArray(categories)) return []
  return categories
    .map((c: { "@_term"?: string }) => c["@_term"])
    .filter((t): t is string => typeof t === "string")
}

export function parseAtom(xml: string, feedUrl: string): Feed {
  const raw = parser.parse(xml)
  const feed = raw?.feed
  if (!feed) throw new Error("Not a valid Atom feed")

  const entries: Entry[] = (feed.entry ?? []).map((e: Record<string, unknown>) => {
    const url = resolveLink(e.link)
    if (!url) throw new Error(`Entry missing link: ${JSON.stringify(e.id)}`)
    const publishedAt = resolveDate(e.published ?? e.updated)
    if (!publishedAt) throw new Error(`Entry missing date: ${url}`)

    return {
      id: String(e.id ?? url),
      title: resolveText(e.title) ?? "(no title)",
      url,
      publishedAt,
      updatedAt: resolveDate(e.updated),
      content: resolveText(e.content),
      contentType: resolveContentType(e.content),
      summary: resolveText(e.summary),
      author: resolveText((e.author as Record<string, unknown> | undefined)?.name),
      tags: resolveCategories(e.category),
    }
  })

  return {
    title: resolveText(feed.title) ?? "(no title)",
    feedUrl,
    siteUrl: resolveLink(feed.link),
    description: resolveText(feed.subtitle),
    entries,
  }
}
