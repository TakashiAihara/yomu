import { describe, it, expect } from "bun:test"
import { parseJsonFeed } from "./jsonfeed.js"
import { FEED_URL, buildItem, buildFeed } from "../__fixtures__/jsonfeed.js"

describe("parseJsonFeed", () => {
  describe("フィードレベル", () => {
    it("title・siteUrl・description を取得する", () => {
      const feed = parseJsonFeed(buildFeed([]), FEED_URL)
      expect(feed.title).toBe("Test JSON Feed")
      expect(feed.siteUrl).toBe("https://example.com")
      expect(feed.description).toBe("A test JSON feed")
    })

    it("version が jsonfeed.org を含まなければ例外を投げる", () => {
      const json = JSON.stringify({ version: "1.0", title: "x", items: [] })
      expect(() => parseJsonFeed(json, FEED_URL)).toThrow("Not a valid JSON feed")
    })

    it("JSON でなければ例外を投げる", () => {
      expect(() => parseJsonFeed("<xml/>", FEED_URL)).toThrow("Not a valid JSON feed")
    })
  })

  describe("エントリ基本フィールド", () => {
    it("id・title・url・publishedAt・updatedAt・author・tags を取得する", () => {
      const feed = parseJsonFeed(buildFeed([buildItem()]), FEED_URL)
      const e = feed.entries[0]
      expect(e.id).toBe("https://example.com/posts/1")
      expect(e.title).toBe("Test Item")
      expect(e.url).toBe("https://example.com/posts/1")
      expect(e.publishedAt).toEqual(new Date("2024-01-15T10:00:00Z"))
      expect(e.updatedAt).toEqual(new Date("2024-01-16T12:00:00Z"))
      expect(e.author).toBe("Alice")
    })

    it("url がなければ例外を投げる", () => {
      const item = buildItem({ url: undefined })
      expect(() => parseJsonFeed(buildFeed([item]), FEED_URL)).toThrow("Item missing url:")
    })

    it("date_published がなければ例外を投げる", () => {
      const item = buildItem({ date_published: undefined })
      expect(() => parseJsonFeed(buildFeed([item]), FEED_URL)).toThrow("Item missing date_published:")
    })
  })

  describe("content / contentType", () => {
    it("content_html があれば contentType は html", () => {
      const feed = parseJsonFeed(buildFeed([buildItem()]), FEED_URL)
      expect(feed.entries[0].contentType).toBe("html")
      expect(feed.entries[0].content).toBe("<p>Test content</p>")
    })

    it("content_text のみなら contentType は text", () => {
      const item = buildItem({ content_html: undefined, content_text: "plain text" })
      const feed = parseJsonFeed(buildFeed([item]), FEED_URL)
      expect(feed.entries[0].contentType).toBe("text")
      expect(feed.entries[0].content).toBe("plain text")
    })
  })

  describe("authors", () => {
    it("authors 配列から最初の name を使う", () => {
      const item = buildItem({ authors: [{ name: "Carol" }, { name: "Dave" }] })
      const feed = parseJsonFeed(buildFeed([item]), FEED_URL)
      expect(feed.entries[0].author).toBe("Carol")
    })

    it("author (singular) にフォールバックする", () => {
      const item = buildItem({ authors: undefined, author: { name: "Eve" } })
      const feed = parseJsonFeed(buildFeed([item]), FEED_URL)
      expect(feed.entries[0].author).toBe("Eve")
    })
  })

  describe("tags", () => {
    it("tags 配列をそのまま返す", () => {
      const item = buildItem({ tags: ["TypeScript", "Bun"] })
      const feed = parseJsonFeed(buildFeed([item]), FEED_URL)
      expect(feed.entries[0].tags).toEqual(["TypeScript", "Bun"])
    })

    it("tags がなければ空配列", () => {
      const item = buildItem({ tags: undefined })
      const feed = parseJsonFeed(buildFeed([item]), FEED_URL)
      expect(feed.entries[0].tags).toEqual([])
    })
  })
})
