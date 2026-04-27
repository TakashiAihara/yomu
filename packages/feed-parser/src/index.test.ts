import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchFeed } from "./index.js"
import { ATOM_SINGLE_ENTRY } from "./__fixtures__/atom.js"
import { RSS2_SINGLE_ITEM } from "./__fixtures__/rss2.js"
import { JSONFEED_SINGLE_ITEM } from "./__fixtures__/jsonfeed.js"
import { RDF_SINGLE_ITEM } from "./__fixtures__/rdf.js"
import { mockFetch } from "./test-utils.js"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("fetchFeed", () => {
  describe("フォーマット判定（content-type）", () => {
    it("application/atom+xml → Atom パーサーへ", async () => {
      mockFetch(ATOM_SINGLE_ENTRY, { contentType: "application/atom+xml" })
      const feed = await fetchFeed("https://example.com/feed.atom")
      expect(feed.title).toBe("Test Feed")
    })

    it("application/rss+xml → RSS 2.0 パーサーへ", async () => {
      mockFetch(RSS2_SINGLE_ITEM, { contentType: "application/rss+xml" })
      const feed = await fetchFeed("https://example.com/feed.rss")
      expect(feed.title).toBe("Test RSS Feed")
    })

    it("application/feed+json → JSON Feed パーサーへ", async () => {
      mockFetch(JSONFEED_SINGLE_ITEM, { contentType: "application/feed+json" })
      const feed = await fetchFeed("https://example.com/feed.json")
      expect(feed.title).toBe("Test JSON Feed")
    })

    it("application/rdf+xml → RDF パーサーへ", async () => {
      mockFetch(RDF_SINGLE_ITEM, { contentType: "application/rdf+xml" })
      const feed = await fetchFeed("https://example.com/feed.rdf")
      expect(feed.title).toBe("Test RDF Feed")
    })
  })

  describe("フォーマット判定（コンテンツスニッフィング）", () => {
    it("<feed> タグで Atom と判定する", async () => {
      mockFetch(ATOM_SINGLE_ENTRY, { contentType: "text/xml" })
      const feed = await fetchFeed("https://example.com/feed")
      expect(feed.title).toBe("Test Feed")
    })

    it("<rss> タグで RSS 2.0 と判定する", async () => {
      mockFetch(RSS2_SINGLE_ITEM, { contentType: "text/xml" })
      const feed = await fetchFeed("https://example.com/feed")
      expect(feed.title).toBe("Test RSS Feed")
    })

    it("{ で始まる JSON で JSON Feed と判定する", async () => {
      mockFetch(JSONFEED_SINGLE_ITEM, { contentType: "text/plain" })
      const feed = await fetchFeed("https://example.com/feed")
      expect(feed.title).toBe("Test JSON Feed")
    })

    it("<rdf:RDF> タグで RDF と判定する", async () => {
      mockFetch(RDF_SINGLE_ITEM, { contentType: "text/xml" })
      const feed = await fetchFeed("https://example.com/feed")
      expect(feed.title).toBe("Test RDF Feed")
    })
  })

  describe("エラーケース", () => {
    it("User-Agent ヘッダを付けてリクエストする", async () => {
      mockFetch(ATOM_SINGLE_ENTRY)
      await fetchFeed("https://example.com/feed.atom")
      const call = vi.mocked(fetch).mock.calls[0]
      expect((call[1] as RequestInit).headers).toMatchObject({
        "User-Agent": expect.stringContaining("Yomu"),
      })
    })

    it("HTTP エラーなら例外を投げる", async () => {
      mockFetch("Not Found", { status: 404, contentType: "text/plain" })
      await expect(fetchFeed("https://example.com/feed.atom")).rejects.toThrow("HTTP 404")
    })

    it("未対応フォーマットなら例外を投げる", async () => {
      mockFetch("<html><body/></html>", { contentType: "text/html" })
      await expect(fetchFeed("https://example.com/")).rejects.toThrow(
        "Unsupported feed format",
      )
    })
  })
})
