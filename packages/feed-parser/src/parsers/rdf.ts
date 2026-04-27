import { XMLParser } from "fast-xml-parser"
import type { Feed, Entry } from "../types.js"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "item",
})

function resolveText(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "#text" in value) {
    return String((value as { "#text": unknown })["#text"])
  }
  return undefined
}

function resolveDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const d = new Date(String(value))
  return isNaN(d.getTime()) ? undefined : d
}

export function parseRdf(xml: string, feedUrl: string): Feed {
  const raw = parser.parse(xml)
  const root = raw?.["rdf:RDF"]
  if (!root) throw new Error("Not a valid RDF feed")

  const channel = root.channel
  const items: Record<string, unknown>[] = Array.isArray(root.item)
    ? root.item
    : root.item
      ? [root.item]
      : []

  const entries: Entry[] = items.map((item) => {
    const url = resolveText(item.link) ?? (item["@_rdf:about"] as string | undefined)
    if (!url) throw new Error(`Item missing link: ${JSON.stringify(item.title)}`)
    const publishedAt = resolveDate(item["dc:date"])
    if (!publishedAt) throw new Error(`Item missing dc:date: ${url}`)

    return {
      id: (item["@_rdf:about"] as string | undefined) ?? url,
      title: resolveText(item.title) ?? "(no title)",
      url,
      publishedAt,
      updatedAt: undefined,
      content: resolveText(item.description) ?? resolveText(item["content:encoded"]),
      contentType: "html",
      summary: undefined,
      author: resolveText(item["dc:creator"]),
      tags: [],
    }
  })

  return {
    title: resolveText(channel?.title) ?? "(no title)",
    feedUrl,
    siteUrl: resolveText(channel?.link),
    description: resolveText(channel?.description),
    entries,
  }
}
