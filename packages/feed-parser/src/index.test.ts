import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchFeed } from "./index.js"
import { ATOM_SINGLE_ENTRY } from "./__fixtures__/atom.js"
import { mockFetch } from "./test-utils.js"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("fetchFeed", () => {
  it("Atom フィードを取得してパースする", async () => {
    mockFetch(ATOM_SINGLE_ENTRY)
    const feed = await fetchFeed("https://example.com/feed.atom")
    expect(feed.title).toBe("Test Feed")
    expect(feed.entries).toHaveLength(1)
    expect(feed.entries[0].title).toBe("Mock Post")
    expect(feed.entries[0].author).toBe("Bob")
    expect(feed.entries[0].contentType).toBe("html")
  })

  it("content-type が atom でなくても <feed> タグで Atom と判定する", async () => {
    mockFetch(ATOM_SINGLE_ENTRY, { contentType: "text/xml" })
    const feed = await fetchFeed("https://example.com/feed")
    expect(feed.title).toBe("Test Feed")
  })

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
    mockFetch("<rss><channel/></rss>", { contentType: "application/rss+xml" })
    await expect(fetchFeed("https://example.com/feed.rss")).rejects.toThrow(
      "Unsupported feed format",
    )
  })
})
