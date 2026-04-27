export const FEED_URL = "https://example.com/feed.atom"

export const buildEntry = (overrides = "") => `
  <entry>
    <id>https://example.com/posts/1</id>
    <title>Test Post</title>
    <link rel="alternate" href="https://example.com/posts/1"/>
    <published>2024-01-15T10:00:00Z</published>
    <updated>2024-01-16T12:00:00Z</updated>
    <author><name>Alice</name></author>
    ${overrides}
  </entry>
`

export const buildFeed = (entries: string, overrides = "") => `
  <?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <title>Test Feed</title>
    <link rel="alternate" href="https://example.com"/>
    <subtitle>A test feed</subtitle>
    ${overrides}
    ${entries}
  </feed>
`

export const ATOM_SINGLE_ENTRY = buildFeed(`
  <entry>
    <id>https://example.com/posts/1</id>
    <title>Mock Post</title>
    <link rel="alternate" href="https://example.com/posts/1"/>
    <published>2024-03-01T00:00:00Z</published>
    <author><name>Bob</name></author>
    <content type="html">&lt;p&gt;Hello&lt;/p&gt;</content>
  </entry>
`)
