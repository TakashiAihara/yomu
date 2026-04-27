export const FEED_URL = "https://example.com/feed.rdf"

export const buildItem = (overrides = "") => `
  <item rdf:about="https://example.com/posts/1">
    <title>Test Item</title>
    <link>https://example.com/posts/1</link>
    <description>Test content</description>
    <dc:date>2024-01-15T10:00:00Z</dc:date>
    <dc:creator>Alice</dc:creator>
    ${overrides}
  </item>
`

export const buildFeed = (items: string, overrides = "") => `
  <?xml version="1.0" encoding="UTF-8"?>
  <rdf:RDF
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns="http://purl.org/rss/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/">
    <channel rdf:about="${FEED_URL}">
      <title>Test RDF Feed</title>
      <link>https://example.com</link>
      <description>A test RDF feed</description>
      ${overrides}
    </channel>
    ${items}
  </rdf:RDF>
`

export const RDF_SINGLE_ITEM = buildFeed(`
  <item rdf:about="https://example.com/posts/1">
    <title>Mock RDF Item</title>
    <link>https://example.com/posts/1</link>
    <description>Hello from RDF</description>
    <dc:date>2024-03-01T00:00:00Z</dc:date>
    <dc:creator>Bob</dc:creator>
  </item>
`)
