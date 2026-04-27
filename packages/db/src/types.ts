export type User = {
  id: number
  username: string
  isAdmin: boolean
  theme: string
  language: string
  timezone: string
  entriesPerPage: number
  entryOrder: string
  entryDirection: "asc" | "desc"
  showReadingTime: boolean
  markReadOnView: boolean
  blockFilterEntryRules: string
  keepFilterEntryRules: string
  googleId: string | null
  lastLoginAt: Date | null
  createdAt: Date
}

export type Category = {
  id: number
  userId: number
  title: string
  hideGlobally: boolean
}

export type Feed = {
  id: number
  userId: number
  categoryId: number | null
  feedUrl: string
  siteUrl: string
  title: string
  description: string
  checkedAt: Date | null
  nextCheckAt: Date | null
  etagHeader: string
  lastModifiedHeader: string
  parsingErrorMsg: string
  parsingErrorCount: number
  scraperRules: string
  rewriteRules: string
  blockFilterEntryRules: string
  keepFilterEntryRules: string
  userAgent: string
  username: string
  password: string
  disabled: boolean
  crawler: boolean
  ignoreEntryUpdates: boolean
}

export type EntryStatus = "unread" | "read"

export type Entry = {
  id: number
  userId: number
  feedId: number
  status: EntryStatus
  hash: string
  title: string
  url: string
  commentsUrl: string
  publishedAt: Date
  createdAt: Date
  changedAt: Date
  content: string
  author: string
  shareCode: string
  starred: boolean
  readingTime: number
  tags: string[]
}

export type Enclosure = {
  id: number
  userId: number
  entryId: number
  url: string
  mimeType: string
  size: number
  mediaProgression: number
}

export type ApiKey = {
  id: number
  userId: number
  token: string
  description: string
  lastUsedAt: Date | null
  createdAt: Date
}

export type Session = {
  id: string
  userId: number
  data: Record<string, unknown>
  expiresAt: Date
  createdAt: Date
}
