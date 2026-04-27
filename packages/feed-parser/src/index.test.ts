import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchFeed } from "./index.js"

const ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Mock Feed</title>
  <link rel="alternate" href="https://example.com"/>
  <entry>
    <id>https://example.com/posts/1</id>
    <title>Mock Post</title>
    <link rel="alternate" href="https://example.com/posts/1"/>
    <published>2024-03-01T00:00:00Z</published>
    <author><name>Bob</name></author>
    <content type="html">&lt;p&gt;Hello&lt;/p&gt;</content>
  </entry>
</feed>`

function mockFetch(body: string, options: { status?: number; contentType?: string } = {}) {
  const { status = 200, contentType = "application/atom+xml" } = options
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (key: string) => (key === "content-type" ? contentType : null) },
      text: () => Promise.resolve(body),
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("fetchFeed", () => {
  it("Atom フィードを取得してパースする", async () => {
    mockFetch(ATOM_XML)
    const feed = await fetchFeed("https://example.com/feed.atom")
    expect(feed.title).toBe("Mock Feed")
    expect(feed.entries).toHaveLength(1)
    expect(feed.entries[0].title).toBe("Mock Post")
    expect(feed.entries[0].author).toBe("Bob")
    expect(feed.entries[0].contentType).toBe("html")
  })

  it("content-type が atom でなくても <feed> タグで Atom と判定する", async () => {
    mockFetch(ATOM_XML, { contentType: "text/xml" })
    const feed = await fetchFeed("https://example.com/feed")
    expect(feed.title).toBe("Mock Feed")
  })

  it("User-Agent ヘッダを付けてリクエストする", async () => {
    mockFetch(ATOM_XML)
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
