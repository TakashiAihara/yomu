import { router } from "../trpc.js"
import { userRouter } from "./user.js"
import { categoryRouter } from "./category.js"
import { feedRouter } from "./feed.js"
import { entryRouter } from "./entry.js"
import { enclosureRouter } from "./enclosure.js"
import { apiKeyRouter } from "./apiKey.js"
import { opmlRouter } from "./opml.js"

export const appRouter = router({
  user: userRouter,
  category: categoryRouter,
  feed: feedRouter,
  entry: entryRouter,
  enclosure: enclosureRouter,
  apiKey: apiKeyRouter,
  opml: opmlRouter,
})

export type AppRouter = typeof appRouter
