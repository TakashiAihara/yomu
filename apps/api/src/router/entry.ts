import { z } from "zod"
import { router, authedProcedure } from "../trpc.js"

export const entryListInput = z.object({
  status: z.enum(["unread", "read"]).optional(),
  starred: z.boolean().optional(),
  feedId: z.number().optional(),
  categoryId: z.number().optional(),
  search: z.string().optional(),
  order: z.enum(["publishedAt", "id"]).default("publishedAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().min(1).max(100).default(30),
  offset: z.number().default(0),
  before: z.date().optional(),
  after: z.date().optional(),
})

export const entryRouter = router({
  list: authedProcedure.input(entryListInput).query(() => {
    throw new Error("not implemented")
  }),
  get: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  updateStatus: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  toggleBookmark: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  fetchContent: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  flushHistory: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
})
