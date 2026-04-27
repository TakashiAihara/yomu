import { router, authedProcedure } from "../trpc.js"

export const feedRouter = router({
  list: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  counters: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  get: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  discover: authedProcedure.query(() => {
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
  refresh: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  refreshAll: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  icon: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  markAllAsRead: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  entries: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
})
