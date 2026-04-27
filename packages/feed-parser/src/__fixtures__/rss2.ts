export const FEED_URL = "https://example.com/feed.rss"

export const buildItem = (overrides = "") => `
  <item>
    <title>Test Item</title>
    <link>https://example.com/posts/1</link>
    <guid isPermaLink="true">https://example.com/posts/1</guid>
    <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
    <author>alice@example.com (Alice)</author>
    <description>&lt;p&gt;Test content&lt;/p&gt;</description>
    ${overrides}
  </item>
`

export const buildFeed = (items: string, overrides = "") => `
  <?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <channel>
      <title>Test RSS Feed</title>
      <link>https://example.com</link>
      <description>A test RSS feed</description>
      ${overrides}
      ${items}
    </channel>
  </rss>
`

export const RSS2_SINGLE_ITEM = buildFeed(`
  <item>
    <title>Mock RSS Item</title>
    <link>https://example.com/posts/1</link>
    <guid>https://example.com/posts/1</guid>
    <pubDate>Fri, 01 Mar 2024 00:00:00 GMT</pubDate>
    <author>bob@example.com (Bob)</author>
    <description>&lt;p&gt;Hello from RSS&lt;/p&gt;</description>
    <category>TypeScript</category>
    <category>Bun</category>
  </item>
`)
