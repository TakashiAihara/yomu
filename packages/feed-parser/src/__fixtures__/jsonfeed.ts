export const FEED_URL = "https://example.com/feed.json"

export const buildItem = (overrides: Record<string, unknown> = {}) => ({
  id: "https://example.com/posts/1",
  url: "https://example.com/posts/1",
  title: "Test Item",
  content_html: "<p>Test content</p>",
  date_published: "2024-01-15T10:00:00Z",
  date_modified: "2024-01-16T12:00:00Z",
  authors: [{ name: "Alice" }],
  tags: [],
  ...overrides,
})

export const buildFeed = (
  items: ReturnType<typeof buildItem>[],
  overrides: Record<string, unknown> = {},
) =>
  JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: "Test JSON Feed",
    home_page_url: "https://example.com",
    feed_url: FEED_URL,
    description: "A test JSON feed",
    items,
    ...overrides,
  })

export const JSONFEED_SINGLE_ITEM = buildFeed([
  buildItem({
    title: "Mock JSON Item",
    content_html: "<p>Hello from JSON Feed</p>",
    date_published: "2024-03-01T00:00:00Z",
    authors: [{ name: "Bob" }],
    tags: ["TypeScript", "Bun"],
  }),
])
