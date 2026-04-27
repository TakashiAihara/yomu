import { describe, it, expect } from "bun:test"
import { parseAtom } from "./atom.js"
import { FEED_URL, buildEntry, buildFeed } from "../__fixtures__/atom.js"

describe("parseAtom", () => {
  describe("フィードレベル", () => {
    it("title・siteUrl・description を取得する", () => {
      const feed = parseAtom(buildFeed(""), FEED_URL)
      expect(feed.title).toBe("Test Feed")
      expect(feed.siteUrl).toBe("https://example.com")
      expect(feed.description).toBe("A test feed")
      expect(feed.feedUrl).toBe(FEED_URL)
    })

    it("subtitle がなければ description は undefined", () => {
      const xml = buildFeed("").replace("<subtitle>A test feed</subtitle>", "")
      const feed = parseAtom(xml, FEED_URL)
      expect(feed.description).toBeUndefined()
    })

    it("<feed> 要素がなければ例外を投げる", () => {
      expect(() => parseAtom("<rss><channel/></rss>", FEED_URL)).toThrow("Not a valid Atom feed")
    })
  })

  describe("エントリ基本フィールド", () => {
    it("id・title・url・publishedAt・updatedAt・author を取得する", () => {
      const feed = parseAtom(buildFeed(buildEntry()), FEED_URL)
      const e = feed.entries[0]
      expect(e.id).toBe("https://example.com/posts/1")
      expect(e.title).toBe("Test Post")
      expect(e.url).toBe("https://example.com/posts/1")
      expect(e.publishedAt).toEqual(new Date("2024-01-15T10:00:00Z"))
      expect(e.updatedAt).toEqual(new Date("2024-01-16T12:00:00Z"))
      expect(e.author).toBe("Alice")
    })

    it("published がなければ updated を publishedAt に使う", () => {
      const entry = buildEntry().replace("<published>2024-01-15T10:00:00Z</published>", "")
      const feed = parseAtom(buildFeed(entry), FEED_URL)
      expect(feed.entries[0].publishedAt).toEqual(new Date("2024-01-16T12:00:00Z"))
    })

    it("author がなければ undefined", () => {
      const entry = buildEntry().replace("<author><name>Alice</name></author>", "")
      const feed = parseAtom(buildFeed(entry), FEED_URL)
      expect(feed.entries[0].author).toBeUndefined()
    })

    it("link がなければ例外を投げる", () => {
      const entry = buildEntry().replace(
        `<link rel="alternate" href="https://example.com/posts/1"/>`,
        "",
      )
      expect(() => parseAtom(buildFeed(entry), FEED_URL)).toThrow("Entry missing link:")
    })

    it("date が存在しなければ例外を投げる", () => {
      const entry = buildEntry()
        .replace("<published>2024-01-15T10:00:00Z</published>", "")
        .replace("<updated>2024-01-16T12:00:00Z</updated>", "")
      expect(() => parseAtom(buildFeed(entry), FEED_URL)).toThrow("Entry missing date:")
    })
  })

  describe("contentType", () => {
    it('type="text" を正しく取得する', () => {
      const entry = buildEntry(`<content type="text">plain text content</content>`)
      const feed = parseAtom(buildFeed(entry), FEED_URL)
      expect(feed.entries[0].contentType).toBe("text")
      expect(feed.entries[0].content).toBe("plain text content")
    })

    it('type="html" を正しく取得する', () => {
      const entry = buildEntry(`<content type="html">&lt;p&gt;html content&lt;/p&gt;</content>`)
      const feed = parseAtom(buildFeed(entry), FEED_URL)
      expect(feed.entries[0].contentType).toBe("html")
    })

    it('type="xhtml" を正しく取得する', () => {
      const entry = buildEntry(`<content type="xhtml">xhtml</content>`)
      const feed = parseAtom(buildFeed(entry), FEED_URL)
      expect(feed.entries[0].contentType).toBe("xhtml")
    })

    it("type 属性がなければ html をデフォルトとする", () => {
      const entry = buildEntry(`<content>no type attr</content>`)
      const feed = parseAtom(buildFeed(entry), FEED_URL)
      expect(feed.entries[0].contentType).toBe("html")
    })

    it("content がなければ undefined かつ contentType は html デフォルト", () => {
      const feed = parseAtom(buildFeed(buildEntry()), FEED_URL)
      expect(feed.entries[0].content).toBeUndefined()
      expect(feed.entries[0].contentType).toBe("html")
    })
  })

  describe("tags（category）", () => {
    it("category が複数あればすべて tags に入る", () => {
      const entry = buildEntry(`
        <category term="TypeScript"/>
        <category term="Bun"/>
      `)
      const feed = parseAtom(buildFeed(entry), FEED_URL)
      expect(feed.entries[0].tags).toEqual(["TypeScript", "Bun"])
    })

    it("category がなければ空配列", () => {
      const feed = parseAtom(buildFeed(buildEntry()), FEED_URL)
      expect(feed.entries[0].tags).toEqual([])
    })
  })

  describe("複数エントリ", () => {
    it("エントリが複数あればすべて返す", () => {
      const entries = [1, 2, 3]
        .map(
          (n) => `
          <entry>
            <id>https://example.com/posts/${n}</id>
            <title>Post ${n}</title>
            <link rel="alternate" href="https://example.com/posts/${n}"/>
            <published>2024-01-${String(n).padStart(2, "0")}T00:00:00Z</published>
          </entry>
        `,
        )
        .join("")
      const feed = parseAtom(buildFeed(entries), FEED_URL)
      expect(feed.entries).toHaveLength(3)
      expect(feed.entries[2].title).toBe("Post 3")
    })
  })
})
