import { router, authedProcedure } from "../trpc.js"

export const apiKeyRouter = router({
  list: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  create: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  remove: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
})
