import { router, authedProcedure } from "../trpc.js"

export const categoryRouter = router({
  list: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  create: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  update: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  remove: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  feeds: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  entries: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  refresh: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  markAllAsRead: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
})
