import { z } from "zod"

export const EntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  publishedAt: z.date(),
  updatedAt: z.date().optional(),
  content: z.string().optional(),
  contentType: z.enum(["text", "html", "xhtml"]).default("html"),
  summary: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

export const FeedSchema = z.object({
  title: z.string(),
  feedUrl: z.string().url(),
  siteUrl: z.string().url().optional(),
  description: z.string().optional(),
  entries: z.array(EntrySchema),
})

export type Entry = z.infer<typeof EntrySchema>
export type Feed = z.infer<typeof FeedSchema>
