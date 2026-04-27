import { describe, it, expect } from "vitest"
import { parseRdf } from "./rdf.js"
import { FEED_URL, buildItem, buildFeed } from "../__fixtures__/rdf.js"

describe("parseRdf", () => {
  describe("フィードレベル", () => {
    it("title・siteUrl・description を取得する", () => {
      const feed = parseRdf(buildFeed(""), FEED_URL)
      expect(feed.title).toBe("Test RDF Feed")
      expect(feed.siteUrl).toBe("https://example.com")
      expect(feed.description).toBe("A test RDF feed")
    })

    it("<rdf:RDF> がなければ例外を投げる", () => {
      expect(() => parseRdf("<rss><channel/></rss>", FEED_URL)).toThrow("Not a valid RDF feed")
    })
  })

  describe("エントリ基本フィールド", () => {
    it("id・title・url・publishedAt・author を取得する", () => {
      const feed = parseRdf(buildFeed(buildItem()), FEED_URL)
      const e = feed.entries[0]
      expect(e.id).toBe("https://example.com/posts/1")
      expect(e.title).toBe("Test Item")
      expect(e.url).toBe("https://example.com/posts/1")
      expect(e.publishedAt).toEqual(new Date("2024-01-15T10:00:00Z"))
      expect(e.author).toBe("Alice")
      expect(e.contentType).toBe("html")
    })

    it("dc:date がなければ例外を投げる", () => {
      const item = buildItem().replace("<dc:date>2024-01-15T10:00:00Z</dc:date>", "")
      expect(() => parseRdf(buildFeed(item), FEED_URL)).toThrow()
    })

    it("tags は常に空配列", () => {
      const feed = parseRdf(buildFeed(buildItem()), FEED_URL)
      expect(feed.entries[0].tags).toEqual([])
    })
  })
})
