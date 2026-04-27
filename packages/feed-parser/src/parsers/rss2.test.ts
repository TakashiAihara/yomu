import { describe, it, expect } from "vitest"
import { parseRss2 } from "./rss2.js"
import { FEED_URL, buildItem, buildFeed } from "../__fixtures__/rss2.js"

describe("parseRss2", () => {
  describe("フィードレベル", () => {
    it("title・siteUrl・description を取得する", () => {
      const feed = parseRss2(buildFeed(""), FEED_URL)
      expect(feed.title).toBe("Test RSS Feed")
      expect(feed.siteUrl).toBe("https://example.com")
      expect(feed.description).toBe("A test RSS feed")
    })

    it("<channel> がなければ例外を投げる", () => {
      expect(() => parseRss2("<rss version='2.0'/>", FEED_URL)).toThrow(
        "Not a valid RSS 2.0 feed",
      )
    })
  })

  describe("エントリ基本フィールド", () => {
    it("title・url・publishedAt・author・tags を取得する", () => {
      const feed = parseRss2(buildFeed(buildItem()), FEED_URL)
      const e = feed.entries[0]
      expect(e.title).toBe("Test Item")
      expect(e.url).toBe("https://example.com/posts/1")
      expect(e.publishedAt).toEqual(new Date("Mon, 15 Jan 2024 10:00:00 GMT"))
      expect(e.author).toBe("Alice")
      expect(e.contentType).toBe("html")
    })

    it("author が email (Name) 形式なら Name だけ返す", () => {
      const feed = parseRss2(buildFeed(buildItem()), FEED_URL)
      expect(feed.entries[0].author).toBe("Alice")
    })

    it("dc:creator を author として使う", () => {
      const item = buildItem("<dc:creator>Bob</dc:creator>").replace(
        "<author>alice@example.com (Alice)</author>",
        "",
      )
      const feed = parseRss2(buildFeed(item), FEED_URL)
      expect(feed.entries[0].author).toBe("Bob")
    })

    it("link がなければ例外を投げる", () => {
      const item = buildItem().replace(
        "<link>https://example.com/posts/1</link>",
        "",
      )
      expect(() => parseRss2(buildFeed(item), FEED_URL)).toThrow()
    })

    it("date がなければ例外を投げる", () => {
      const item = buildItem()
        .replace("<pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>", "")
      expect(() => parseRss2(buildFeed(item), FEED_URL)).toThrow()
    })
  })

  describe("content", () => {
    it("content:encoded があれば description より優先する", () => {
      const item = buildItem(`<content:encoded>&lt;p&gt;full content&lt;/p&gt;</content:encoded>`)
      const feed = parseRss2(buildFeed(item), FEED_URL)
      expect(feed.entries[0].content).toBe("<p>full content</p>")
      expect(feed.entries[0].summary).toBe("<p>Test content</p>")
    })

    it("content:encoded がなければ description を content にする", () => {
      const feed = parseRss2(buildFeed(buildItem()), FEED_URL)
      expect(feed.entries[0].content).toBe("<p>Test content</p>")
      expect(feed.entries[0].summary).toBeUndefined()
    })
  })

  describe("tags（category）", () => {
    it("category が複数あればすべて tags に入る", () => {
      const item = buildItem(`
        <category>TypeScript</category>
        <category>Bun</category>
      `)
      const feed = parseRss2(buildFeed(item), FEED_URL)
      expect(feed.entries[0].tags).toEqual(["TypeScript", "Bun"])
    })

    it("category がなければ空配列", () => {
      const feed = parseRss2(buildFeed(buildItem()), FEED_URL)
      expect(feed.entries[0].tags).toEqual([])
    })
  })
})
